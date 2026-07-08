import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { searchProfiles, Profile, getTrending } from '../utils/supabase/api';
import { extractCityName, normalizePlaceName, searchNominatim } from '../utils/nominatim';
import { queryClient } from '../queryClient';
import { queryKeys } from '../queryKeys';
import {
  clearRecentEvents,
  LEGACY_RECENT_SEARCHES_KEY,
  readLegacyRecentSearches,
  readRecentEventIds,
  rememberRecentEvent,
} from '../utils/recentEvents';
import { SearchHeader } from './premium-search/SearchHeader';
import { SearchHome } from './premium-search/SearchHome';
import { SearchResults } from './premium-search/SearchResults';
import { hasEventImage, getViews } from './premium-search/SearchRow';

interface PremiumSearchModalProps {
  onClose: () => void;
  events: any[];
  onEventSelect: (event: any) => void;
  onPersonSelect?: (person: any) => void;
  onVenueSelect?: (venue: { name: string; lat?: string; lon?: string }) => void;
}

type SearchCategory = 'all' | 'events' | 'venues' | 'people';
type VenueResult = { id: string; name: string; subtitle?: string; lat?: string; lon?: string };

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
      } catch (error) {
        console.warn('Failed to load trending data:', error);
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
      } catch (error) {
        console.warn('Failed to search profiles:', error);
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
          next.push({ id: String(result.place_id), name: city, subtitle: result.display_name, lat: result.lat, lon: result.lon });
          if (next.length >= 6) break;
        }
        setVenueResults(next);
      } catch (error: any) {
        if (error?.name !== 'AbortError') setVenueResults([]);
      } finally {
        setIsSearchingVenues(false);
      }
    }, 250);
    return () => { window.clearTimeout(timeoutId); controller.abort(); };
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
  };

  const selectVenue = (venue: VenueResult) => {
    addToRecent(venue.name);
    onVenueSelect?.({ name: venue.name, lat: venue.lat, lon: venue.lon });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-white">
      <div className="mx-auto flex h-full max-w-3xl flex-col bg-white">
        <SearchHeader
          searchQuery={searchQuery}
          searchCategory={searchCategory}
          onSearchQueryChange={setSearchQuery}
          onSearchCategoryChange={setSearchCategory}
          onClose={onClose}
        />

        <div className="flex-1 overflow-y-auto pb-[calc(4.5rem+var(--eventz-safe-area-bottom))]">
          {!hasQuery ? (
            <SearchHome
              recentEvent={recentEvent}
              onSelectEvent={selectEvent}
              trendingEvents={trendingEvents}
              isLoadingTrending={isLoadingTrending}
              recentEventIds={recentEventIds}
              recentSearches={recentSearches}
              onClearRecent={() => {
                setRecentSearches([]);
                setRecentEventIds([]);
                clearRecentEvents();
              }}
              onClose={onClose}
            />
          ) : (
            <SearchResults
              searchCategory={searchCategory}
              filteredEvents={filteredEvents}
              onSelectEvent={selectEvent}
              peopleResults={peopleResults}
              onSelectPerson={selectPerson}
              venueResults={venueResults}
              onSelectVenue={selectVenue}
              isSearching={isSearching}
              showEmptyState={showEmptyState}
            />
          )}
        </div>
      </div>
    </div>
  );
}
