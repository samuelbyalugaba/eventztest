import { Bookmark, ChevronRight, Clock, Compass, MapPin, Search, TrendingUp, X } from 'lucide-react';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { UserAvatar } from './UserAvatar';
import { searchProfiles, Profile, getTrending } from '../utils/supabase/api';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { extractCityName, normalizePlaceName, searchNominatim } from '../utils/nominatim';

interface PremiumSearchModalProps {
  onClose: () => void;
  events: any[];
  onEventSelect: (event: any) => void;
  onPersonSelect?: (person: any) => void;
  onVenueSelect?: (venue: { name: string; lat?: string; lon?: string }) => void;
}

type SearchCategory = 'all' | 'events' | 'venues' | 'people';
type VenueResult = { id: string; name: string; subtitle?: string; lat?: string; lon?: string };

const categories: { id: SearchCategory; name: string }[] = [
  { id: 'all', name: 'All' },
  { id: 'events', name: 'Events' },
  { id: 'venues', name: 'Venues' },
  { id: 'people', name: 'People' },
];

const getViews = (event: any) => Number(event?.views || event?.view_count || 0);
const getEventImage = (event: any) => event?.image_url || event?.cover_image || event?.coverImage || event?.image || event?.thumbnail_url || event?.thumbnail;
const hasEventImage = (event: any) => Boolean(getEventImage(event));
const formatViews = (views: number) => views >= 1000 ? `${(views / 1000).toFixed(1)}k views` : `${views || 0} views`;

export function PremiumSearchModal({ onClose, events, onEventSelect, onPersonSelect, onVenueSelect }: PremiumSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCategory, setSearchCategory] = useState<SearchCategory>('all');
  const [isSearchingPeople, setIsSearchingPeople] = useState(false);
  const [isSearchingVenues, setIsSearchingVenues] = useState(false);
  const [isLoadingTrending, setIsLoadingTrending] = useState(true);
  const [peopleResults, setPeopleResults] = useState<Profile[]>([]);
  const [venueResults, setVenueResults] = useState<VenueResult[]>([]);
  const [trendingData, setTrendingData] = useState<{ events: any[]; people: any[] }>({ events: [], people: [] });
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('recentSearches');
      if (saved) {
        const parsed = JSON.parse(saved);
        setRecentSearches(Array.isArray(parsed) ? parsed : []);
      }
    } catch {
      setRecentSearches([]);
    }

    const loadTrending = async () => {
      try {
        const data = await getTrending();
        setTrendingData(data);
      } catch {
        setTrendingData({ events: [], people: [] });
      } finally {
        setIsLoadingTrending(false);
      }
    };

    void loadTrending();
  }, []);

  const addToRecent = (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    const next = [trimmed, ...recentSearches.filter((item) => item.toLowerCase() !== trimmed.toLowerCase())].slice(0, 5);
    setRecentSearches(next);
    localStorage.setItem('recentSearches', JSON.stringify(next));
  };

  useEffect(() => {
    const searchPeople = async () => {
      if (searchQuery.trim().length < 2 || (searchCategory !== 'all' && searchCategory !== 'people')) {
        setPeopleResults([]);
        return;
      }

      setIsSearchingPeople(true);
      try {
        const results = await searchProfiles(searchQuery);
        setPeopleResults(results || []);
      } catch {
        setPeopleResults([]);
      } finally {
        setIsSearchingPeople(false);
      }
    };

    const timeoutId = window.setTimeout(searchPeople, 300);
    return () => window.clearTimeout(timeoutId);
  }, [searchQuery, searchCategory]);

  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2 || (searchCategory !== 'all' && searchCategory !== 'venues')) {
      setVenueResults([]);
      setIsSearchingVenues(false);
      return;
    }

    const controller = new AbortController();
    setIsSearchingVenues(true);

    const timeoutId = window.setTimeout(async () => {
      try {
        const results = await searchNominatim(q, { limit: 10, signal: controller.signal });
        const seen = new Set<string>();
        const next: VenueResult[] = [];

        for (const result of results) {
          const city = extractCityName(result);
          if (!city) continue;
          const key = normalizePlaceName(city);
          if (seen.has(key)) continue;
          seen.add(key);
          next.push({
            id: String(result.place_id),
            name: city,
            subtitle: result.display_name,
            lat: result.lat,
            lon: result.lon,
          });
          if (next.length >= 6) break;
        }

        setVenueResults(next);
      } catch (error: any) {
        if (error?.name !== 'AbortError') setVenueResults([]);
      } finally {
        setIsSearchingVenues(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [searchQuery, searchCategory]);

  const trendingEvents = useMemo(() => {
    const byId = new Map(events.map((event) => [String(event.id), event]));
    const apiEvents = trendingData.events.map((event) => {
      const localEvent = byId.get(String(event.id));
      return localEvent ? { ...event, ...localEvent } : event;
    });
    const localEvents = [...events].filter(hasEventImage).sort((a, b) => getViews(b) - getViews(a));
    const seen = new Set<string>();

    return [...localEvents, ...apiEvents]
      .filter((event) => {
        const key = String(event?.id || event?.title || '');
        if (!key || seen.has(key) || !hasEventImage(event)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 5);
  }, [events, trendingData.events]);

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredEvents = useMemo(() => {
    if (!normalizedQuery) return [];
    return events
      .filter((event) => {
        const title = String(event.title || '').toLowerCase();
        const category = String(event.category || '').toLowerCase();
        const location = String(event.location || '').toLowerCase();
        const subcategory = String(event.subcategory || '').toLowerCase();
        return title.includes(normalizedQuery) || category.includes(normalizedQuery) || location.includes(normalizedQuery) || subcategory.includes(normalizedQuery);
      })
      .slice(0, 8);
  }, [events, normalizedQuery]);

  const recentEvent = useMemo(() => {
    for (const recent of recentSearches) {
      const match = events.find((event) => hasEventImage(event) && String(event.title || '').toLowerCase().includes(recent.toLowerCase()));
      if (match) return match;
    }
    return trendingEvents[0] || events.find(hasEventImage);
  }, [events, recentSearches, trendingEvents]);

  const hasQuery = searchQuery.trim().length > 0;
  const isSearching = isSearchingPeople || isSearchingVenues;
  const showEmptyState = hasQuery && (
    (searchCategory === 'all' && filteredEvents.length === 0 && peopleResults.length === 0 && venueResults.length === 0) ||
    (searchCategory === 'events' && filteredEvents.length === 0) ||
    (searchCategory === 'people' && peopleResults.length === 0) ||
    (searchCategory === 'venues' && venueResults.length === 0)
  );

  const selectEvent = (event: any) => {
    addToRecent(event.title || '');
    onEventSelect(event);
    onClose();
  };

  const selectPerson = (person: any) => {
    addToRecent(person.full_name || person.username || '');
    onPersonSelect?.(person);
    onClose();
  };

  const selectVenue = (venue: VenueResult) => {
    addToRecent(venue.name);
    onVenueSelect?.({ name: venue.name, lat: venue.lat, lon: venue.lon });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-white">
      <div className="mx-auto flex h-full max-w-3xl flex-col bg-white">
        <div className="shrink-0 px-4 pb-2 pt-[calc(1rem+var(--eventz-safe-area-top))]">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              aria-label="Close search"
              className="-ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-700 transition-colors hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                aria-label="Search events, venues, people"
                placeholder="Search events, venues, people..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                autoFocus
                className="h-12 w-full rounded-[18px] border border-gray-200 bg-white pl-10 pr-4 text-[14px] font-medium text-gray-900 shadow-[0_5px_18px_rgba(15,23,42,0.05)] outline-none transition-all placeholder:text-gray-400 focus:border-purple-200 focus:ring-[3px] focus:ring-purple-100"
              />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-4 gap-2.5">
            {categories.map((category) => {
              const active = searchCategory === category.id;
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setSearchCategory(category.id)}
                  className={`h-10 min-w-0 rounded-2xl border px-1 text-[13px] font-bold transition-all ${
                    active
                      ? 'border-purple-100 bg-purple-100 text-purple-700 shadow-[0_8px_24px_rgba(138,43,226,0.12)]'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-purple-100 hover:text-purple-700'
                  }`}
                >
                  {category.name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-[calc(5.75rem+var(--eventz-safe-area-bottom))] pt-3">
          {!hasQuery ? (
            <div className="space-y-6">
              <section>
                <div className="mb-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Clock className="h-[18px] w-[18px] text-gray-500" />
                    <h2 className="text-[19px] font-bold text-gray-950">Recent</h2>
                  </div>
                  {recentSearches.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setRecentSearches([]);
                        localStorage.removeItem('recentSearches');
                      }}
                      className="text-xs font-bold text-purple-700"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                {recentEvent ? (
                  <button
                    type="button"
                    onClick={() => selectEvent(recentEvent)}
                    className="flex w-full items-center gap-3 rounded-2xl border border-gray-100 bg-white p-2.5 text-left shadow-[0_5px_18px_rgba(15,23,42,0.045)] transition-all hover:border-purple-100"
                  >
                    <ImageWithFallback
                      src={getEventImage(recentEvent)}
                      alt={recentEvent.title || 'Recent event'}
                      className="h-16 w-24 shrink-0 rounded-xl object-cover"
                      displayWidth={160}
                      displayHeight={112}
                    />
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-[14px] font-bold text-gray-950">{recentEvent.title || 'Recent event'}</h3>
                      <div className="mt-1.5 flex items-center gap-3">
                        <span className="rounded-md bg-purple-50 px-2 py-0.5 text-xs font-semibold text-purple-700">
                          {recentEvent.category || 'Event'}
                        </span>
                        <span className="text-xs font-medium text-gray-400">{formatViews(getViews(recentEvent))}</span>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 shrink-0 text-gray-500" />
                  </button>
                ) : (
                  <SearchResultSkeleton compact />
                )}
              </section>

              <section>
                <div className="mb-2.5 flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
                    <TrendingUp className="h-[18px] w-[18px]" />
                  </span>
                  <h2 className="text-[19px] font-bold text-gray-950">Trending Now</h2>
                  {isSearching && <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-200 border-t-purple-600" />}
                </div>

                <div className="space-y-2.5">
                  {trendingEvents.length > 0 ? trendingEvents.map((event, index) => (
                    <button
                      key={`trend-event-${event.id || event.title}-${index}`}
                      type="button"
                      onClick={() => selectEvent(event)}
                      className="flex w-full items-center gap-3 rounded-2xl border border-gray-100 bg-white p-2.5 text-left shadow-[0_5px_18px_rgba(15,23,42,0.04)] transition-all hover:border-purple-100"
                    >
                      <div className="relative h-16 w-24 shrink-0">
                        <ImageWithFallback
                          src={getEventImage(event)}
                          alt={event.title || 'Trending event'}
                          className="h-full w-full rounded-xl object-cover"
                          displayWidth={160}
                          displayHeight={112}
                        />
                        <span className="absolute left-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full border border-purple-200 bg-white text-sm font-bold text-purple-700 shadow-sm">
                          {index + 1}
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="line-clamp-2 text-[14px] font-bold leading-tight text-gray-950">{event.title || 'Untitled event'}</h3>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2.5">
                          <span className="rounded-md bg-purple-50 px-2 py-0.5 text-xs font-semibold text-purple-700">
                            {event.category || 'Event'}
                          </span>
                          <span className="text-xs font-medium text-gray-400">{formatViews(getViews(event))}</span>
                        </div>
                      </div>

                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-100 text-gray-600">
                        <Bookmark className="h-5 w-5" />
                      </span>
                    </button>
                  )) : (
                    <>
                      {Array.from({ length: isLoadingTrending ? 5 : 3 }).map((_, index) => (
                        <SearchResultSkeleton key={`trend-skeleton-${index}`} rank={index + 1} />
                      ))}
                    </>
                  )}
                </div>
              </section>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  window.dispatchEvent(new Event('eventsUpdated'));
                }}
                className="flex h-12 w-full items-center justify-center gap-2.5 rounded-2xl bg-purple-50 text-sm font-bold text-purple-700 transition-colors hover:bg-purple-100"
              >
                <Compass className="h-[18px] w-[18px]" />
                Explore more events
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {(searchCategory === 'all' || searchCategory === 'events') && filteredEvents.length > 0 && (
                <ResultSection title="Events" count={filteredEvents.length}>
                  {filteredEvents.map((event) => (
                    <EventResultRow key={event.id} event={event} onClick={() => selectEvent(event)} />
                  ))}
                </ResultSection>
              )}

              {(searchCategory === 'all' || searchCategory === 'people') && peopleResults.length > 0 && (
                <ResultSection title="People" count={peopleResults.length}>
                  {peopleResults.map((person) => (
                    <button
                      key={person.id}
                      type="button"
                      onClick={() => selectPerson(person)}
                      className="flex w-full items-center gap-3 rounded-2xl border border-gray-100 bg-white p-2.5 text-left shadow-sm transition-all hover:border-purple-100"
                    >
                      <UserAvatar
                        src={person.avatar_url}
                        name={person.full_name || person.username || 'User'}
                        className="h-11 w-11"
                        verified={person.verified}
                      />
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-bold text-gray-950">{person.full_name || person.username}</h3>
                        <p className="truncate text-xs font-medium text-gray-500">
                          {person.is_organizer ? person.organizer_type || 'Organizer' : 'User'}
                          {person.location ? ` - ${person.location}` : ''}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </button>
                  ))}
                </ResultSection>
              )}

              {(searchCategory === 'all' || searchCategory === 'venues') && venueResults.length > 0 && (
                <ResultSection title="Venues" count={venueResults.length}>
                  {venueResults.map((venue) => (
                    <button
                      key={venue.id}
                      type="button"
                      onClick={() => selectVenue(venue)}
                      className="flex w-full items-center gap-3 rounded-2xl border border-gray-100 bg-white p-2.5 text-left shadow-sm transition-all hover:border-purple-100"
                    >
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-700">
                        <MapPin className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-bold text-gray-950">{venue.name}</h3>
                        {venue.subtitle && <p className="truncate text-xs font-medium text-gray-500">{venue.subtitle}</p>}
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </button>
                  ))}
                </ResultSection>
              )}

              {showEmptyState && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                    <Search className="h-7 w-7" />
                  </span>
                  <h3 className="text-base font-bold text-gray-950">No results found</h3>
                  <p className="mt-1 text-xs font-medium text-gray-500">Try another event, venue, or person.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultSection({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  return (
    <section>
      <div className="mb-2.5 flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-950">{title}</h2>
        <span className="text-xs font-semibold text-gray-400">{count} found</span>
      </div>
      <div className="space-y-2.5">{children}</div>
    </section>
  );
}

function SearchResultSkeleton({ compact = false, rank }: { compact?: boolean; rank?: number }) {
  return (
    <div className={`flex w-full items-center gap-3 rounded-2xl border border-gray-100 bg-white p-2.5 shadow-[0_5px_18px_rgba(15,23,42,0.04)] ${compact ? '' : 'min-h-[84px]'}`}>
      <div className={`${compact ? 'h-16 w-24' : 'h-16 w-24'} relative shrink-0 overflow-hidden rounded-xl bg-gray-100`}>
        <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100" />
        {rank && (
          <span className="absolute left-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full border border-purple-100 bg-white text-sm font-bold text-purple-500">
            {rank}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-2.5">
        <div className="h-3.5 w-3/4 animate-pulse rounded bg-gray-100" />
        <div className="flex items-center gap-2.5">
          <div className="h-6 w-20 animate-pulse rounded-md bg-purple-50" />
          <div className="h-3.5 w-14 animate-pulse rounded bg-gray-100" />
        </div>
      </div>
      {!compact && <div className="h-9 w-9 shrink-0 animate-pulse rounded-xl border border-gray-100 bg-gray-50" />}
    </div>
  );
}

function EventResultRow({ event, onClick }: { event: any; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl border border-gray-100 bg-white p-2.5 text-left shadow-sm transition-all hover:border-purple-100"
    >
      <ImageWithFallback
        src={getEventImage(event)}
        alt={event.title || 'Event'}
        className="h-16 w-24 shrink-0 rounded-xl object-cover"
        displayWidth={160}
        displayHeight={112}
      />
      <div className="min-w-0 flex-1">
        <h3 className="line-clamp-2 text-sm font-bold leading-tight text-gray-950">{event.title || 'Untitled event'}</h3>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-purple-50 px-2 py-0.5 text-xs font-semibold text-purple-700">
            {event.category || 'Event'}
          </span>
          <span className="text-xs font-medium text-gray-400">{formatViews(getViews(event))}</span>
        </div>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />
    </button>
  );
}
