import { X, Search, TrendingUp, Clock, MapPin, Calendar } from 'lucide-react';
import { useState, useEffect } from 'react';
import { UserAvatar } from './UserAvatar';
import { searchProfiles, Profile, getTrending } from '../utils/supabase/api';
import { formatPrice } from '../utils/currencies';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { extractCityName, normalizePlaceName, searchNominatim } from '../utils/nominatim';

interface PremiumSearchModalProps {
  onClose: () => void;
  events: any[];
  onEventSelect: (event: any) => void;
  onPersonSelect?: (person: any) => void;
  onVenueSelect?: (venue: { name: string; lat?: string; lon?: string }) => void;
}

type VenueResult = { id: string; name: string; subtitle?: string; lat?: string; lon?: string };

export function PremiumSearchModal({ onClose, events, onEventSelect, onPersonSelect, onVenueSelect }: PremiumSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCategory, setSearchCategory] = useState<'all' | 'events' | 'venues' | 'people'>('all');
  const [isSearchingPeople, setIsSearchingPeople] = useState(false);
  const [isSearchingVenues, setIsSearchingVenues] = useState(false);
  const [peopleResults, setPeopleResults] = useState<Profile[]>([]);
  const [venueResults, setVenueResults] = useState<VenueResult[]>([]);
  const [trendingData, setTrendingData] = useState<{events: any[], people: any[]}>({ events: [], people: [] });
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    // Load recent searches
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        console.error('Error parsing recent searches', e);
      }
    }

    // Load trending data
    const loadTrending = async () => {
      try {
        const data = await getTrending();
        setTrendingData(data);
      } catch (error) {
        console.error('Error loading trending data:', error);
      }
    };
    loadTrending();
  }, []);

  const addToRecent = (query: string) => {
    if (!query.trim()) return;
    const newRecent = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5);
    setRecentSearches(newRecent);
    localStorage.setItem('recentSearches', JSON.stringify(newRecent));
  };

  useEffect(() => {
    const searchPeople = async () => {
      if (searchQuery.trim().length < 2) {
        setPeopleResults([]);
        return;
      }

      if (searchCategory !== 'all' && searchCategory !== 'people') {
        return;
      }
      
      setIsSearchingPeople(true);
      try {
        const results = await searchProfiles(searchQuery);
        setPeopleResults(results || []);
      } catch (error) {
        console.error('Error searching profiles:', error);
      } finally {
        setIsSearchingPeople(false);
      }
    };

    const timeoutId = setTimeout(searchPeople, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, searchCategory]);

  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setVenueResults([]);
      return;
    }

    if (searchCategory !== 'all' && searchCategory !== 'venues') {
      return;
    }

    const controller = new AbortController();
    setIsSearchingVenues(true);

    const timeoutId = setTimeout(async () => {
      try {
        const results = await searchNominatim(q, { limit: 10, signal: controller.signal });
        const seen = new Set<string>();
        const next: VenueResult[] = [];

        for (const r of results) {
          const city = extractCityName(r);
          if (!city) continue;
          const key = normalizePlaceName(city);
          if (seen.has(key)) continue;
          seen.add(key);
          next.push({
            id: String(r.place_id),
            name: city,
            subtitle: r.display_name,
            lat: r.lat,
            lon: r.lon,
          });
          if (next.length >= 6) break;
        }

        setVenueResults(next);
      } catch (e: any) {
        if (e?.name !== 'AbortError') {
          setVenueResults([]);
        }
      } finally {
        setIsSearchingVenues(false);
      }
    }, 250);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [searchQuery, searchCategory]);

  // Filter events based on search query
  const normalizedQuery = searchQuery.toLowerCase();
  const filteredEvents = events
    .filter((event) => {
      const title = String(event.title || '').toLowerCase();
      const category = String((event as any).category || '').toLowerCase();
      const location = String((event as any).location || '').toLowerCase();
      const subcategory = String((event as any).subcategory || '').toLowerCase();
      return (
        title.includes(normalizedQuery) ||
        category.includes(normalizedQuery) ||
        location.includes(normalizedQuery) ||
        subcategory.includes(normalizedQuery)
      );
    })
    .slice(0, 5);

  const filteredPeople = peopleResults;
  const filteredVenues = venueResults;
  const isSearching = isSearchingPeople || isSearchingVenues;
  const showEmptyState =
    (searchCategory === 'all' && filteredPeople.length === 0 && filteredEvents.length === 0 && filteredVenues.length === 0) ||
    (searchCategory === 'people' && filteredPeople.length === 0) ||
    (searchCategory === 'events' && filteredEvents.length === 0) ||
    (searchCategory === 'venues' && filteredVenues.length === 0);

  const categories = [
    { id: 'all', name: 'All', icon: '🔍' },
    { id: 'events', name: 'Events', icon: '🎉' },
    { id: 'venues', name: 'Venues', icon: '📍' },
    { id: 'people', name: 'People', icon: '👥' },
  ];

  return (
    <div 
      className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md"
      onClick={onClose}
    >
      <div 
        className="bg-white h-full overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Search Bar */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-4 py-4 transition-all">
          <div className="flex items-center gap-3">
            <button 
              onClick={onClose}
              className="p-2.5 hover:bg-gray-100 rounded-full transition-colors text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex-1 relative group">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#8A2BE2] transition-colors" />
              <input
                type="text"
                placeholder="Search events, venues, people..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                className="w-full pl-11 pr-4 py-3 bg-gray-100/50 hover:bg-gray-100 focus:bg-white border border-transparent focus:border-[#8A2BE2]/20 rounded-2xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-[#8A2BE2]/5 transition-all text-sm font-medium"
              />
            </div>
            {isSearching && (
              <div className="w-5 h-5 border-2 border-gray-300 border-t-[#8A2BE2] rounded-full animate-spin" aria-hidden />
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex gap-2 mt-4 overflow-x-auto scrollbar-hide pb-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSearchCategory(cat.id as any)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-medium transition-all border ${
                  searchCategory === cat.id
                    ? 'bg-[#8A2BE2] text-white border-[#8A2BE2] shadow-lg shadow-purple-200'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                }`}
              >
                <span className="mr-1.5">{cat.icon}</span>
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6 max-w-4xl mx-auto">
          {searchQuery === '' ? (
            <div className="py-4">
              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-gray-900 font-semibold flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-500" />
                      Recent
                    </h3>
                    <button 
                      onClick={() => {
                        setRecentSearches([]);
                        localStorage.removeItem('recentSearches');
                      }}
                      className="text-xs text-purple-600 font-medium"
                    >
                      Clear all
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recentSearches.map((term, i) => (
                      <button
                        key={i}
                        onClick={() => setSearchQuery(term)}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-full text-sm text-gray-700 transition-colors"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Trending */}
              {(trendingData.events.length > 0 || trendingData.people.length > 0) && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-1.5 bg-purple-100 rounded-lg">
                      <TrendingUp className="w-4 h-4 text-[#8A2BE2]" />
                    </div>
                    <h3 className="text-gray-900 font-bold text-lg">Trending Now</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Trending Events */}
                    {trendingData.events.map((event, index) => (
                      <button
                        key={`trend-evt-${event.id}`}
                        onClick={() => {
                          onEventSelect(event);
                          addToRecent(event.title);
                          onClose();
                        }}
                        className="group flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-2xl hover:border-purple-200 hover:shadow-lg hover:shadow-purple-500/5 transition-all text-left relative overflow-hidden"
                      >
                        <div className="absolute top-0 left-0 w-1 h-full bg-[#8A2BE2] opacity-0 group-hover:opacity-100 transition-opacity" />
                        
                        <div className="w-12 h-12 rounded-xl bg-purple-50 flex flex-col items-center justify-center text-[#8A2BE2] flex-shrink-0 border border-purple-100 group-hover:scale-105 transition-transform">
                          <span className="text-xs font-bold leading-none mb-0.5">#{index + 1}</span>
                          <TrendingUp className="w-3 h-3 opacity-50" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-gray-900 truncate group-hover:text-[#8A2BE2] transition-colors">{event.title}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs font-medium px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                              {event.category}
                            </span>
                            <span className="text-xs text-gray-400">
                              {event.views > 1000 ? (event.views/1000).toFixed(1) + 'k' : event.views} views
                            </span>
                          </div>
                        </div>
                      </button>
                    ))}

                    {/* Trending People */}
                    {trendingData.people.map((person, index) => (
                      <button
                        key={`trend-ppl-${person.id}`}
                        onClick={() => {
                          onPersonSelect && onPersonSelect(person);
                          addToRecent(person.full_name || person.username || '');
                          onClose();
                        }}
                        className="group flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-2xl hover:border-purple-200 hover:shadow-lg hover:shadow-purple-500/5 transition-all text-left"
                      >
                        <div className="relative w-12 h-12 flex-shrink-0">
                           <div className="w-full h-full rounded-full overflow-hidden border-2 border-white shadow-sm group-hover:scale-105 transition-transform">
                            <UserAvatar
                              src={person.avatar_url}
                              name={person.full_name || person.username || 'User'}
                              className="w-full h-full"
                            />
                           </div>
                           <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-sm">
                             <div className="w-3.5 h-3.5 bg-[#8A2BE2] rounded-full flex items-center justify-center text-[8px] font-bold text-white">
                               {index + 1}
                             </div>
                           </div>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-gray-900 truncate group-hover:text-[#8A2BE2] transition-colors">{person.full_name || person.username}</div>
                          <div className="text-xs text-gray-500 font-medium">{person.is_organizer ? 'Organizer' : 'Verified User'}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {recentSearches.length === 0 && trendingData.events.length === 0 && trendingData.people.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mb-6">
                    <Search className="w-10 h-10 text-purple-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Search Eventz</h3>
                  <p className="text-gray-500 max-w-xs">
                    Find events, organizers, and people in your community.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Search Results - People */}
              {filteredPeople.length > 0 && (searchCategory === 'all' || searchCategory === 'people') && (
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-gray-900">People</h3>
                    <p className="text-gray-500 text-sm">{filteredPeople.length} found</p>
                  </div>
                  <div className="space-y-3">
                    {filteredPeople.map((person) => (
                      <button
                        key={person.id}
                        onClick={() => {
                          onPersonSelect && onPersonSelect(person);
                          onClose();
                        }}
                        className="w-full flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all"
                      >
                        <div className="w-14 h-14 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                          <UserAvatar
                            src={person.avatar_url}
                            name={person.full_name || person.username || 'User'}
                            className="w-full h-full"
                          />
                        </div>
                        <div className="flex-1 text-left">
                          <div className="flex items-center gap-2">
                            <p className="text-gray-900">{person.full_name || person.username}</p>
                            {person.verified && (
                              <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                              </svg>
                            )}
                          </div>
                          <p className="text-gray-500 text-sm">
                            {person.is_organizer ? (person.organizer_type || 'Organizer') : 'User'} 
                            {person.location && ` • ${person.location}`}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {filteredVenues.length > 0 && (searchCategory === 'all' || searchCategory === 'venues') && (
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-gray-900">Venues</h3>
                    <p className="text-gray-500 text-sm">{filteredVenues.length} found</p>
                  </div>
                  <div className="space-y-3">
                    {filteredVenues.map((venue) => (
                      <button
                        key={venue.id}
                        onClick={() => {
                          onVenueSelect && onVenueSelect({ name: venue.name, lat: venue.lat, lon: venue.lon });
                          addToRecent(venue.name);
                          onClose();
                        }}
                        className="w-full flex items-start gap-4 p-4 bg-white rounded-xl border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all text-left"
                      >
                        <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-[#8A2BE2] flex-shrink-0 border border-purple-100">
                          <MapPin className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-gray-900 font-medium truncate">{venue.name}</div>
                          {venue.subtitle && <div className="text-xs text-gray-500 mt-0.5 truncate">{venue.subtitle}</div>}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Search Results - Events */}
              {filteredEvents.length > 0 && (searchCategory === 'all' || searchCategory === 'events') && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-gray-900">Events</h3>
                    <p className="text-gray-500 text-sm">{filteredEvents.length} found</p>
                  </div>
                  <div className="space-y-3">
                    {filteredEvents.map((event) => (
                      <button
                        key={event.id}
                        onClick={() => {
                          onEventSelect(event);
                          addToRecent(event.title);
                          onClose();
                        }}
                        className="w-full flex items-start gap-4 p-4 bg-white rounded-xl border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all text-left"
                      >
                        <ImageWithFallback
                          src={(event as any).image_url ?? (event as any).image}
                          alt={event.title}
                          className="w-20 h-20 rounded-lg object-cover"
                          fallbackSrc="/icons/icon-192x192.png"
                        />
                        <div className="flex-1">
                          <h4 className="text-gray-900 mb-1">{event.title}</h4>
                          <div className="flex items-center gap-3 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {event.date.split(',')[0]}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              {event.location}
                            </span>
                          </div>
                          <div className="mt-2 flex items-center gap-2">
                            <span className="px-2 py-1 bg-purple-100 text-purple-600 rounded-md text-xs">
                              {event.category}
                            </span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {showEmptyState && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-gray-900 mb-2">No results found</h3>
                  <p className="text-gray-500 text-sm">Try searching for something else</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
