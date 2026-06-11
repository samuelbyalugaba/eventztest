import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { MapPin, Search, X } from 'lucide-react';
import { UserAvatar } from './UserAvatar';
import { searchProfiles, Profile, getTrending } from '../utils/supabase/api';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { extractCityName, normalizePlaceName, searchNominatim } from '../utils/nominatim';
import {
  clearRecentEvents,
  LEGACY_RECENT_SEARCHES_KEY,
  readLegacyRecentSearches,
  readRecentEventIds,
  rememberRecentEvent,
} from '../utils/recentEvents';

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
  const [recentEventIds, setRecentEventIds] = useState<string[]>([]);

  useEffect(() => {
    setRecentSearches(readLegacyRecentSearches());
    setRecentEventIds(readRecentEventIds());

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
    localStorage.setItem(LEGACY_RECENT_SEARCHES_KEY, JSON.stringify(next));
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
      .slice(0, 6);
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
    for (const recentId of recentEventIds) {
      const match = events.find((event) => hasEventImage(event) && String(event.id) === recentId);
      if (match) return match;
    }

    for (const recent of recentSearches) {
      const match = events.find((event) => hasEventImage(event) && String(event.title || '').toLowerCase().includes(recent.toLowerCase()));
      if (match) return match;
    }
    return trendingEvents[0] || events.find(hasEventImage);
  }, [events, recentEventIds, recentSearches, trendingEvents]);

  const hasQuery = searchQuery.trim().length > 0;
  const isSearching = isSearchingPeople || isSearchingVenues;
  const showEmptyState = hasQuery && !isSearching && (
    (searchCategory === 'all' && filteredEvents.length === 0 && peopleResults.length === 0 && venueResults.length === 0) ||
    (searchCategory === 'events' && filteredEvents.length === 0) ||
    (searchCategory === 'people' && peopleResults.length === 0) ||
    (searchCategory === 'venues' && venueResults.length === 0)
  );

  const selectEvent = (event: any) => {
    const next = rememberRecentEvent(event);
    setRecentEventIds(next.eventIds);
    setRecentSearches(next.searches);
    onEventSelect(event);
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
        <div className="shrink-0 border-b border-gray-100 bg-white pt-[calc(0.75rem+var(--eventz-safe-area-top))]">
          <div className="flex items-center gap-2 px-3 pb-2">
            <button
              type="button"
              onClick={onClose}
              aria-label="Close search"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-800 transition-colors hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3.5 top-1/2 h-[17px] w-[17px] -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                aria-label="Search events, venues, people"
                placeholder="Search events, venues, people..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                autoFocus
                className="h-10 w-full rounded-full border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm font-medium text-gray-950 shadow-none outline-none transition-colors placeholder:text-gray-500 focus:border-gray-200 focus:bg-gray-50 focus:shadow-none focus:outline-none focus:ring-0 focus-visible:border-gray-200 focus-visible:outline-none focus-visible:ring-0"
                style={{ WebkitTapHighlightColor: 'transparent', outline: 'none', boxShadow: 'none' }}
              />
            </div>
          </div>

          <div className="grid h-11 grid-cols-4">
            {categories.map((category) => {
              const active = searchCategory === category.id;
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setSearchCategory(category.id)}
                  className={`relative flex items-center justify-center text-sm font-semibold transition-colors ${
                    active ? 'text-gray-950' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                  }`}
                >
                  {category.name}
                  {active && <span className="absolute bottom-0 h-1 w-10 rounded-full bg-purple-600" />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pb-[calc(4.5rem+var(--eventz-safe-area-bottom))]">
          {!hasQuery ? (
            <div>
              <SectionHeader
                title="Recent"
                action={recentEventIds.length > 0 || recentSearches.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setRecentSearches([]);
                      setRecentEventIds([]);
                      clearRecentEvents();
                    }}
                    className="text-sm font-semibold text-purple-700"
                  >
                    Clear
                  </button>
                ) : null}
              />

              {recentEvent ? (
                <EventSearchRow event={recentEvent} onClick={() => selectEvent(recentEvent)} />
              ) : (
                <SearchRowSkeleton />
              )}

              <SectionHeader title="Trending" />
              {trendingEvents.length > 0 ? (
                trendingEvents.map((event, index) => (
                  <EventSearchRow
                    key={`trend-event-${event.id || event.title}-${index}`}
                    event={event}
                    rank={index + 1}
                    onClick={() => selectEvent(event)}
                  />
                ))
              ) : (
                Array.from({ length: isLoadingTrending ? 5 : 3 }).map((_, index) => (
                  <SearchRowSkeleton key={`trend-skeleton-${index}`} rank={index + 1} />
                ))
              )}

              <button
                type="button"
                onClick={() => {
                  onClose();
                  window.dispatchEvent(new Event('eventsUpdated'));
                }}
                className="flex w-full items-center justify-center border-t border-gray-100 px-4 py-4 text-sm font-semibold text-purple-700 transition-colors hover:bg-gray-50"
              >
                Explore more events
              </button>
            </div>
          ) : (
            <div>
              {(searchCategory === 'all' || searchCategory === 'events') && filteredEvents.length > 0 && (
                <ResultSection title="Events" count={filteredEvents.length}>
                  {filteredEvents.map((event) => (
                    <EventSearchRow key={event.id} event={event} onClick={() => selectEvent(event)} />
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
                      className="flex w-full items-center gap-3 border-b border-gray-100 px-4 py-3 text-left transition-colors hover:bg-gray-50"
                    >
                      <UserAvatar
                        src={person.avatar_url}
                        name={person.full_name || person.username || 'User'}
                        className="h-11 w-11"
                        verified={person.verified}
                      />
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-semibold text-gray-950">{person.full_name || person.username}</h3>
                        <p className="truncate text-xs text-gray-500">
                          {person.is_organizer ? person.organizer_type || 'Organizer' : 'User'}
                          {person.location ? ` - ${person.location}` : ''}
                        </p>
                      </div>
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
                      className="flex w-full items-center gap-3 border-b border-gray-100 px-4 py-3 text-left transition-colors hover:bg-gray-50"
                    >
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600">
                        <MapPin className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-semibold text-gray-950">{venue.name}</h3>
                        {venue.subtitle && <p className="truncate text-xs text-gray-500">{venue.subtitle}</p>}
                      </div>
                    </button>
                  ))}
                </ResultSection>
              )}

              {isSearching && <SearchRowSkeleton />}

              {showEmptyState && (
                <div className="px-8 py-12 text-center">
                  <h3 className="text-base font-semibold text-gray-950">No results found</h3>
                  <p className="mt-1 text-sm text-gray-500">Try another event, venue, or person.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-gray-100 px-4 pb-2 pt-4">
      <h2 className="text-lg font-bold text-gray-950">{title}</h2>
      {action}
    </div>
  );
}

function ResultSection({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  return (
    <section>
      <div className="flex items-center justify-between border-b border-gray-100 px-4 pb-2 pt-4">
        <h2 className="text-lg font-bold text-gray-950">{title}</h2>
        <span className="text-xs font-medium text-gray-500">{count} found</span>
      </div>
      {children}
    </section>
  );
}

function EventSearchRow({ event, rank, onClick }: { event: any; rank?: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 border-b border-gray-100 px-4 py-3 text-left transition-colors hover:bg-gray-50"
    >
      {rank && <span className="w-5 shrink-0 text-center text-sm font-semibold text-gray-500">{rank}</span>}
      <ImageWithFallback
        src={getEventImage(event)}
        alt={event.title || 'Event'}
        className="h-14 w-16 shrink-0 rounded-lg object-cover"
        displayWidth={128}
        displayHeight={112}
      />
      <div className="min-w-0 flex-1">
        <h3 className="line-clamp-2 text-sm font-semibold leading-tight text-gray-950">{event.title || 'Untitled event'}</h3>
        <p className="mt-1 truncate text-xs text-gray-500">
          {event.category || 'Event'} - {formatViews(getViews(event))}
        </p>
      </div>
    </button>
  );
}

function SearchRowSkeleton({ rank }: { rank?: number }) {
  return (
    <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3">
      {rank && <span className="w-5 shrink-0 text-center text-sm font-semibold text-gray-300">{rank}</span>}
      <div className="h-14 w-16 shrink-0 animate-pulse rounded-lg bg-gray-100" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-3.5 w-3/4 animate-pulse rounded bg-gray-100" />
        <div className="h-3 w-32 animate-pulse rounded bg-gray-100" />
      </div>
    </div>
  );
}
