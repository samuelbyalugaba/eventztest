import { X, Search, TrendingUp, Clock, MapPin, Calendar, Users, Music, Building2, User } from 'lucide-react';
import { useState, useEffect } from 'react';
import { UserAvatar } from './UserAvatar';
import { searchProfiles, Profile } from '../utils/supabase/api';

interface PremiumSearchModalProps {
  onClose: () => void;
  events: any[];
  onEventSelect: (event: any) => void;
  onPersonSelect?: (person: any) => void;
}

export function PremiumSearchModal({ onClose, events, onEventSelect, onPersonSelect }: PremiumSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCategory, setSearchCategory] = useState<'all' | 'events' | 'venues' | 'people'>('all');
  const [peopleResults, setPeopleResults] = useState<Profile[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Mock recent searches - can be replaced with local storage later
  const recentSearches: string[] = [];

  // Mock trending searches - removed or fetch from API if available
  const trendingSearches: any[] = [];

  // Mock venue suggestions - removed
  const venues: any[] = [];

  useEffect(() => {
    const searchPeople = async () => {
      if (searchQuery.trim().length < 2) {
        setPeopleResults([]);
        return;
      }
      
      setIsSearching(true);
      try {
        const results = await searchProfiles(searchQuery);
        setPeopleResults(results || []);
      } catch (error) {
        console.error('Error searching profiles:', error);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(searchPeople, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Filter events based on search query
  const filteredEvents = events.filter(event => 
    event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.subcategory.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 5);

  const filteredPeople = peopleResults;

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
        <div className="sticky top-0 z-10 bg-[#8A2BE2] px-6 py-6 shadow-lg">
          <div className="flex items-center gap-4">
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6 text-white" />
            </button>
            
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search events, venues, clubs, bars, people..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                className="w-full pl-12 pr-4 py-3.5 bg-white rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white/50"
              />
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex gap-2 mt-4 overflow-x-auto scrollbar-hide">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSearchCategory(cat.id as any)}
                className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm transition-all ${
                  searchCategory === cat.id
                    ? 'bg-white text-purple-600 shadow-md'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                <span className="mr-2">{cat.icon}</span>
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6 max-w-4xl mx-auto">
          {searchQuery === '' ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mb-6">
                <Search className="w-10 h-10 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Search Eventz</h3>
              <p className="text-gray-500 max-w-xs">
                Find events, organizers, and people in your community.
              </p>
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

              {/* Search Results - Events */}
              {filteredEvents.length > 0 && (searchCategory === 'all' || searchCategory === 'events') ? (
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
                          onClose();
                        }}
                        className="w-full flex items-start gap-4 p-4 bg-white rounded-xl border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all text-left"
                      >
                        <img 
                          src={event.image} 
                          alt={event.title}
                          className="w-20 h-20 rounded-lg object-cover"
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
                            <span className="text-purple-600 text-sm">{event.price}</span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {filteredPeople.length === 0 && (
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}