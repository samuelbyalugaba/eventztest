import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { MapPin, Calendar, ChevronLeft, X, Filter, Tv, Search, Send, Star, CheckCircle2, Smartphone, MessageCircle, Ticket, Music, Trophy, Globe } from 'lucide-react';
import { EventCard } from './EventCard';
import { toast } from 'sonner';
import { Conversation } from '../types';
import { PremiumSearchModal } from './PremiumSearchModal';
import { UserProfileModal } from './UserProfileModal';
import { MediaViewer } from './MediaViewer';

import { EventDetailModal } from './EventDetailModal';
import { VirtualTicketPurchaseModal } from './VirtualTicketPurchaseModal';
import { SimplifiedTicketModal } from './SimplifiedTicketModal';
import { supabase } from '../utils/supabase/client';
import { deleteEvent, getEvents, getSavedEvents, type Event as ApiEvent } from '../utils/supabase/api';
import { extractCityName, normalizePlaceName, searchNominatim } from '../utils/nominatim';

import { eventsStore } from '../store/eventStore';

const locations = [
  { id: 'all', name: 'All Locations', icon: <Globe className="w-5 h-5" /> },
  { id: 'Atlanta', name: 'Atlanta, USA', flag: '🇺🇸' },
  { id: 'Dar es Salaam', name: 'Dar es Salaam, Tanzania', flag: '🇹🇿' },
  { id: 'Zanzibar', name: 'Zanzibar, Tanzania', flag: '🇹🇿' },
  { id: 'New York', name: 'New York, USA', flag: '🇺🇸' },
];

type LocationOption = {
  id: string;
  name: string;
  flag?: string;
  icon?: React.ReactNode;
};

interface EventDetailsProps {
  conversations: Conversation[];
  onStartConversation: (user: { name: string; username?: string; avatar: string; verified: boolean; isOrganizer?: boolean; id?: string }) => Promise<Conversation | null | undefined> | Conversation | null;
  onSendMessage: (conversationId: number, messageText: string) => void;
}

export function EventDetails({ conversations: globalConversations, onStartConversation, onSendMessage }: EventDetailsProps) {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'home' | 'list'>('home');
  
  // Initialize state directly from store
  const [events, setEvents] = useState<ApiEvent[]>(eventsStore.getEvents());
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  // We track loading for internal logic but NOT for blocking the UI with skeletons
  const [isFetching, setIsFetching] = useState(false);

  // Sync with store updates
  useEffect(() => {
    const unsubscribe = eventsStore.subscribe(() => {
      setEvents(eventsStore.getEvents());
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // Fetch data logic
  useEffect(() => {
    const fetchEvents = async (force = false) => {
      const currentEvents = eventsStore.getEvents();
      const hasData = currentEvents.length > 0;
      const shouldFetch = eventsStore.shouldFetch();

      // If we have data and it's fresh enough, and not forced, skip
      if (!force && hasData && !shouldFetch) {
        return;
      }
      
      try {
        setIsFetching(true);
        const [allEvents, savedEvents] = await Promise.all([
          getEvents(),
          (async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setCurrentUserId(user?.id ?? null);
            if (user) return getSavedEvents(user.id);
            return [];
          })()
        ]);
        
        // Map saved status
        const savedIds = new Set((savedEvents as any[]).map(e => e.id));
        const eventsWithSaved = (allEvents as any[]).map(e => ({
          ...e,
          isSaved: savedIds.has(e.id)
        }));
        
        eventsStore.setEvents(eventsWithSaved as ApiEvent[]);
      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.log('Fetch aborted');
          return;
        }
        console.error('Error fetching events:', error);
      } finally {
        setIsFetching(false);
      }
    };

    fetchEvents();
    
    const handleSavedUpdate = () => fetchEvents(true);
    window.addEventListener('savedEventsUpdated', handleSavedUpdate);
    return () => window.removeEventListener('savedEventsUpdated', handleSavedUpdate);
  }, []);

  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const handleEventClick = (event: ApiEvent) => {
    navigate(`/event/${event.id}`);
  };

  const [showFilters, setShowFilters] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');
  const [remoteLocationOptions, setRemoteLocationOptions] = useState<LocationOption[]>([]);
  const [isSearchingLocations, setIsSearchingLocations] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [eventToPurchase, setEventToPurchase] = useState<ApiEvent | null>(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  
  // Organizer stats hook
  const organizerStats = selectedUser?.is_organizer ? {
    followers: selectedUser.followers || 1200,
    totalEvents: selectedUser.totalEvents || 15,
    ticketsSold: selectedUser.ticketsSold || 3450,
    avgRating: selectedUser.avgRating || 4.8
  } : null;

  const [showMediaViewer, setShowMediaViewer] = useState(false);
  const [mediaViewerIndex] = useState(0);
  const [mediaViewerType] = useState<'photo' | 'video'>('photo');
  
  // Messaging state
  const [showMessages, setShowMessages] = useState(false);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messageText, setMessageText] = useState('');

  // Sync activeConversation
  useEffect(() => {
    if (activeConversation) {
      const updatedConv = globalConversations.find(c => c.id === activeConversation.id);
      if (updatedConv && updatedConv !== activeConversation) {
        setActiveConversation(updatedConv);
      }
    }
  }, [globalConversations, activeConversation]);

  const categories = [
    { id: 'all', name: 'All', icon: <Star className="w-6 h-6" /> },
    { id: 'entertainment', name: 'Entertainment', icon: <Music className="w-6 h-6" />, subcategories: ['Concerts', 'Club Nights', 'Live Performances', 'Nightlife (Bars/Lounges)', 'Themed Parties'] },
    { id: 'education', name: 'Education', icon: <Tv className="w-6 h-6" />, subcategories: ['Workshops', 'Seminars', 'Webinars'] },
    { id: 'culture', name: 'Culture', icon: <MapPin className="w-6 h-6" />, subcategories: ['Festivals', 'Arts', 'Theater', 'Food & Drink', 'Local Traditions', 'Fashion Events'] },
    { id: 'religion', name: 'Religion', icon: <Star className="w-6 h-6" />, subcategories: ['Worship Services', 'Religious Gatherings', 'Spiritual Events'] },
    { id: 'business & tech', name: 'Business & Tech', icon: <Smartphone className="w-6 h-6" />, subcategories: ['Startup Events', 'Networking', 'Conferences', 'Tech Talks'] },
    { id: 'sports & fitness', name: 'Sports & Fitness', icon: <Trophy className="w-6 h-6" />, subcategories: ['Fitness Classes', 'Competitions', 'Sports Events'] },
  ];

  const filteredEvents = React.useMemo(() => {
    return events.filter(event => {
      const eventCity = String((event as any)?.city || '').trim();
      const locationMatch =
        selectedLocation === 'all' ||
        (eventCity !== '' && normalizePlaceName(eventCity) === normalizePlaceName(selectedLocation));
      const categoryMatch =
        selectedCategory === 'all' ||
        String((event as any).category || '').toLowerCase() === selectedCategory.toLowerCase();
      const subcategoryMatch =
        selectedSubcategory === '' ||
        String((event as any).subcategory || '').toLowerCase() === selectedSubcategory.toLowerCase();
      return locationMatch && categoryMatch && subcategoryMatch;
    });
  }, [events, selectedLocation, selectedCategory, selectedSubcategory]);

  const { upcomingEvents, pastEvents } = React.useMemo(() => {
    const now = new Date();
    const getEventDateTime = (event: ApiEvent) => {
      try {
        const dateStr = event.date;
        const timeStr = event.time ? event.time.replace(' ', '') : '00:00';
        return new Date(`${dateStr} ${timeStr}`);
      } catch (e) {
        return new Date(event.date);
      }
    };

    const upcoming = filteredEvents
      .filter(e => getEventDateTime(e) >= now)
      .sort((a, b) => getEventDateTime(a).getTime() - getEventDateTime(b).getTime());

    const past = filteredEvents
      .filter(e => getEventDateTime(e) < now)
      .sort((a, b) => getEventDateTime(b).getTime() - getEventDateTime(a).getTime());
      
    return { upcomingEvents: upcoming, pastEvents: past };
  }, [filteredEvents]);

  useEffect(() => {
    const q = locationSearch.trim();
    if (q.length < 2) {
      setRemoteLocationOptions([]);
      setIsSearchingLocations(false);
      return;
    }

    const controller = new AbortController();
    setIsSearchingLocations(true);

    const timer = setTimeout(async () => {
      try {
        const results = await searchNominatim(q, { limit: 10, signal: controller.signal });
        const seen = new Set<string>();
        const next: LocationOption[] = [];

        for (const r of results) {
          const city = extractCityName(r);
          if (!city) continue;
          const key = normalizePlaceName(city);
          if (seen.has(key)) continue;
          seen.add(key);
          next.push({ id: city, name: city, icon: <MapPin className="w-5 h-5" /> });
          if (next.length >= 12) break;
        }

        setRemoteLocationOptions(next);
      } catch (e: any) {
        if (e?.name !== 'AbortError') {
          setRemoteLocationOptions([]);
        }
      } finally {
        setIsSearchingLocations(false);
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [locationSearch]);

  const mergeUniqueById = (items: LocationOption[]) => {
    const seen = new Set<string>();
    const out: LocationOption[] = [];
    for (const item of items) {
      const key = normalizePlaceName(item.id);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(item);
    }
    return out;
  };

  const localMatches: LocationOption[] = (locations as any).filter((location: any) => {
    if (location.id === 'all') return false;
    return String(location.name || '').toLowerCase().includes(locationSearch.toLowerCase());
  });

  const displayedLocations: LocationOption[] =
    locationSearch.trim() === ''
      ? (locations as any)
      : mergeUniqueById([locations[0] as any, ...localMatches, ...remoteLocationOptions]);

  const [selectedEvent, setSelectedEvent] = useState<ApiEvent | null>(null);

  // Photos & Videos Viewer Data
  const photosForViewer = [
    ...(selectedEvent?.event_highlights?.filter(h => h.mediaType === 'image').map((highlight, _index) => ({
      id: _index,
      url: highlight.image!,
      eventName: selectedEvent?.title || '',
    })) || []),
  ];

  const videosForViewer = [
    ...(selectedEvent?.event_highlights?.filter(h => h.mediaType === 'video').map((highlight, _index) => ({
      id: _index + 500,
      thumbnail: highlight.image || selectedEvent.image_url,
      videoUrl: highlight.video || '',
      eventName: selectedEvent?.title || '',
    })) || []),
  ];

  

  const handleStartConversationLocal = async (user: { name: string; username?: string; avatar: string; verified: boolean; isOrganizer?: boolean; id?: string }) => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
      toast.error('Please sign in to start a conversation');
      return;
    }
    
    const toastId = toast.loading('Opening chat...');
    try {
      const conversation = await onStartConversation(user);
      if (conversation) {
        // Only close the profile modal AFTER we have the conversation ready
        setSelectedUser(null);
        setActiveConversation(conversation);
        setShowMessages(true);
        toast.dismiss(toastId);
      } else {
        toast.error('Could not start conversation', { id: toastId });
      }
    } catch (error) {
      console.error('Error starting conversation:', error);
      toast.error('Failed to start conversation', { id: toastId });
    }
  };

  const handleDeleteEvent = async (event: ApiEvent) => {
    if (!currentUserId || currentUserId !== event.organizer_id) return;
    const confirmed = window.confirm('Delete this event? This action cannot be undone.');
    if (!confirmed) return;
    try {
      await deleteEvent(event.id);
      const next = eventsStore.getEvents().filter(e => e.id !== event.id);
      eventsStore.setEvents(next);
      toast.success('Event deleted');
    } catch (error: any) {
      console.error('Failed to delete event', error);
      toast.error(error?.message || 'Failed to delete event');
    }
  };

  const handleSendMessage = () => {
    if (!messageText.trim() || !activeConversation) return;
    onSendMessage(activeConversation.id, messageText);
    setMessageText('');
  };

  const hasActiveFilters = selectedLocation !== 'all' || selectedCategory !== 'all' || selectedSubcategory !== '';
  const activeFiltersCount = (selectedLocation !== 'all' ? 1 : 0) + (selectedCategory !== 'all' ? 1 : 0) + (selectedSubcategory !== '' ? 1 : 0);

  // Ticket Purchase Handlers
  const handlePurchaseTicket = (event: ApiEvent) => {
    setEventToPurchase(event);
    setShowTicketModal(true);
    if (selectedEvent) setSelectedEvent(null);
  };

  const handleNormalTicketPurchase = (event: ApiEvent) => {
    setEventToPurchase(event);
    setShowPurchaseModal(true);
    if (selectedEvent) setSelectedEvent(null);
  };

  const handleTierSelection = (event: ApiEvent) => {
    setEventToPurchase(event);
    setShowPurchaseModal(true);
    if (selectedEvent) setSelectedEvent(null);
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      {viewMode === 'home' ? (
        <div className="pb-24">
          {/* 3. Search & Events List */}
          <div className="px-4 pb-8 pt-6">
            {/* Search Bar & Filter */}
            <div className="flex items-center gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search events..." 
                  className="w-full pl-11 pr-4 py-3.5 bg-white border border-gray-100 rounded-2xl text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#8A2BE2] focus:ring-4 focus:ring-[#8A2BE2]/10 transition-all shadow-sm"
                  onClick={() => setShowSearchModal(true)}
                  readOnly
                />
              </div>
              <button 
                onClick={() => setShowFilters(true)}
                className="p-3.5 bg-white border border-gray-100 rounded-2xl hover:bg-gray-50 transition-all shadow-sm relative group"
              >
                <Filter className="w-5 h-5 text-gray-600 group-hover:text-[#8A2BE2] transition-colors" />
                {hasActiveFilters && (
                  <span className="absolute top-3 right-3 w-2 h-2 bg-[#8A2BE2] rounded-full"></span>
                )}
              </button>
            </div>

            {/* Events List */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-gray-900 font-bold text-lg">Upcoming Events</h3>
                <button 
                  onClick={() => setViewMode('list')}
                  className="text-[#8A2BE2] text-sm font-semibold hover:bg-purple-50 px-3 py-1 rounded-lg transition-colors"
                >
                  See All
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                {upcomingEvents.slice(0, 10).map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onClick={handleEventClick}
                    currentUserId={currentUserId}
                    onEditEvent={(e) => navigate(`/edit-event/${e.id}`)}
                    onDeleteEvent={handleDeleteEvent}
                  />
                ))}
              </div>

              {upcomingEvents.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center bg-white rounded-3xl border border-dashed border-gray-200">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                    <Calendar className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-gray-900 font-medium mb-1">No upcoming events</h3>
                  <p className="text-gray-500 text-sm max-w-[200px]">Check back later or try adjusting your filters</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-1 sticky top-0 z-50 bg-gray-50/95 backdrop-blur-sm pt-2 pb-2 -mx-4 px-4 transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setViewMode('home')}
                className="p-2 -ml-2 hover:bg-gray-200 rounded-full transition-colors"
              >
                <ChevronLeft className="w-6 h-6 text-gray-900" />
              </button>
              <h1 className="text-gray-900 text-2xl"><strong>Events</strong></h1>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setShowSearchModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white text-gray-900 rounded-xl border border-gray-200 hover:bg-gray-50 hover:shadow-lg hover:scale-105 transition-all"
              >
                <Search className="w-5 h-5" />
                <span className="text-sm">Search</span>
              </button>
              
              <button 
                onClick={() => setShowFilters(true)}
                className="relative w-11 h-11 bg-white rounded-full border border-gray-200 hover:bg-gray-50 hover:border-purple-300 transition-all shadow-sm flex items-center justify-center"
              >
                <Filter className="w-5 h-5 text-gray-700" />
                {hasActiveFilters && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-purple-600 text-white text-xs rounded-full flex items-center justify-center shadow-md">
                    {activeFiltersCount}
                  </span>
                )}
              </button>
            </div>
          </div>
          
          <p className="text-gray-600 text-sm">Discover amazing events happening around you</p>
        </div>

        {/* Filters */}
        {hasActiveFilters && (
          <div className="flex gap-2 mb-4 flex-wrap">
            {selectedLocation !== 'all' && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-sm">
                <span>{(locations.find(l => l.id === selectedLocation) as any)?.flag || '📍'}</span>
                <span>{String((locations.find(l => l.id === selectedLocation) as any)?.name || selectedLocation).split(',')[0]}</span>
                <button 
                  onClick={() => setSelectedLocation('all')}
                  className="ml-1 hover:bg-purple-200 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            {selectedSubcategory !== '' ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-sm">
                <span>🔍</span>
                <span>{selectedSubcategory}</span>
                <button 
                  onClick={() => setSelectedSubcategory('')}
                  className="ml-1 hover:bg-purple-200 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : selectedCategory !== 'all' && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-sm">
                <span>{categories.find(c => c.id === selectedCategory)?.icon}</span>
                <span>{categories.find(c => c.id === selectedCategory)?.name}</span>
                <button 
                  onClick={() => setSelectedCategory('all')}
                  className="ml-1 hover:bg-purple-200 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            <button 
              onClick={() => {
                setSelectedLocation('all');
                setSelectedCategory('all');
                setSelectedSubcategory('');
              }}
              className="px-3 py-1.5 text-purple-600 text-sm hover:bg-purple-50 rounded-lg transition-colors"
            >
              Clear all
            </button>
          </div>
        )}

        {selectedCategory !== 'all' && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-gray-900 text-sm">
                {categories.find(c => c.id === selectedCategory)?.name} Subcategories:
              </span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {categories
                .find(c => c.id === selectedCategory)?.subcategories?.map((subcategory) => (
                  <button
                    key={subcategory}
                    onClick={() => setSelectedSubcategory(selectedSubcategory === subcategory ? '' : subcategory)}
                    className={`flex-shrink-0 px-4 py-2 rounded-full text-sm transition-all ${ 
                      selectedSubcategory === subcategory
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'bg-white text-gray-700 border border-gray-200 hover:border-purple-300 hover:bg-purple-50'
                    }`}
                  >
                    {subcategory}
                  </button>
                ))}
            </div>
          </div>
        )}

        {/* Upcoming Events Grid - NO SKELETON */}
        {upcomingEvents.length > 0 ? (
          <div className="mb-8">
            <h3 className="text-gray-900 font-semibold mb-2 ml-1">Upcoming Events</h3>
            <div className="grid grid-cols-2 gap-3">
              {upcomingEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onClick={handleEventClick}
                  currentUserId={currentUserId}
                  onEditEvent={(e) => navigate(`/edit-event/${e.id}`)}
                  onDeleteEvent={handleDeleteEvent}
                />
              ))}
            </div>
          </div>
        ) : isFetching ? (
          <div className="text-center py-16">
             <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
             <p className="text-gray-500">Loading...</p>
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-gray-900 mb-2">No events found</h3>
            <p className="text-gray-600 text-sm">Try selecting different filters</p>
          </div>
        )}

        {!isFetching && upcomingEvents.length === 0 && pastEvents.length === 0 && filteredEvents.length > 0 && (
           <div className="grid grid-cols-2 gap-3 mb-8">
             {filteredEvents.map((event) => (
               <EventCard
                 key={event.id}
                 event={event}
                 onClick={handleEventClick}
                 currentUserId={currentUserId}
                 onEditEvent={(e) => navigate(`/edit-event/${e.id}`)}
                 onDeleteEvent={handleDeleteEvent}
               />
             ))}
           </div>
        )}
      </div>
      )}

      {/* Filter Panel Sheet */}
      {showFilters && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm animate-in fade-in" onClick={() => setShowFilters(false)}>
          <div className="w-full max-w-4xl bg-white rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h2 className="text-gray-900">Filter Events</h2>
              <button 
                onClick={() => setShowFilters(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="p-5 max-h-[70vh] overflow-y-auto">
              <div className="mb-6">
                <h3 className="text-gray-900 text-sm mb-3">Location</h3>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search locations..."
                    value={locationSearch}
                    onChange={(e) => setLocationSearch(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-600 focus:outline-none"
                  />
                  <div className="absolute top-3 right-3">
                    <Search className="w-5 h-5 text-gray-500" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {displayedLocations.map((location) => (
                    <button
                      key={location.id}
                      onClick={() => setSelectedLocation(location.id)}
                      className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm transition-all border ${
                        selectedLocation === location.id
                          ? 'bg-purple-600 text-white border-purple-600 shadow-md'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {/* @ts-ignore */}
                      <span className="text-base">{location.icon || location.flag}</span>
                      <span>{location.name}</span>
                    </button>
                  ))}
                </div>
                {isSearchingLocations && (
                  <div className="mt-2 text-xs text-gray-500">Searching…</div>
                )}
              </div>

              <div className="mb-6">
                <h3 className="text-gray-900 text-sm mb-3">Categories</h3>
                <div className="grid grid-cols-2 gap-2">
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm transition-all border ${
                        selectedCategory === category.id
                          ? 'bg-purple-600 text-white border-purple-600 shadow-md'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-base">{category.icon}</span>
                      <span>{category.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-gray-200 flex gap-3">
              <button 
                onClick={() => {
                  setSelectedLocation('all');
                  setSelectedCategory('all');
                  setSelectedSubcategory('');
                }}
                className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Clear All
              </button>
              <button 
                onClick={() => setShowFilters(false)}
                className="flex-1 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors"
              >
                Show {filteredEvents.length} Events
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showPurchaseModal && eventToPurchase && (
        <SimplifiedTicketModal
          event={{
            id: eventToPurchase.id,
            title: eventToPurchase.title,
            date: eventToPurchase.date,
            location: eventToPurchase.location,
            ticketTiers: eventToPurchase.ticket_tiers,
            price_range: eventToPurchase.price_range,
            image_url: eventToPurchase.image_url
          }}
          onClose={() => setShowPurchaseModal(false)}
          onSuccess={() => {
            window.dispatchEvent(new Event('savedEventsUpdated'));
          }}
        />
      )}

      {showSearchModal && (
        <PremiumSearchModal
          onClose={() => setShowSearchModal(false)}
          events={events}
                    onEventSelect={(event: ApiEvent) => handleEventClick(event)}
          onPersonSelect={(person) => setSelectedUser(person)}
        />
      )}

      {selectedUser && (
        <UserProfileModal
          user={{
            id: selectedUser.id,
            name: selectedUser.full_name || selectedUser.name,
            type: selectedUser.is_organizer ? 'Organizer' : (selectedUser.type || 'Attendee'),
            avatar: selectedUser.avatar_url || selectedUser.avatar || '',
            verified: !!selectedUser.verified,
            coverImage: selectedUser.cover_url || (selectedUser.full_name === 'Buki Jenard' ? 'https://i.ibb.co/F2wGf9R/B-Cover.jpg' : selectedUser.name === 'Luchy Ranks' ? 'https://i.ibb.co/k2Jg34Nv/L-cover.jpg' : 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200'),
            bio: selectedUser.bio,
            followers: organizerStats?.followers ?? selectedUser.followers ?? 0,
          }}
          onClose={() => setSelectedUser(null)}
          onFollow={() => {
            toast.success(`You are now following ${selectedUser.name}!`);
          }}
          onMessage={() => {
            handleStartConversationLocal(selectedUser);
          }}
        />
      )}

      {selectedEvent && (
        <EventDetailModal 
          event={selectedEvent} 
          onClose={() => setSelectedEvent(null)} 
          onPurchaseTicket={handlePurchaseTicket}
          onPurchaseNormalTicket={handleNormalTicketPurchase}
          onStartConversation={handleStartConversationLocal}
          onTierSelect={handleTierSelection}
        />
      )}

      {showTicketModal && eventToPurchase && (
        <VirtualTicketPurchaseModal
          isOpen={showTicketModal}
          onClose={() => setShowTicketModal(false)}
          event={eventToPurchase}
        />
      )}


      {showMediaViewer && (
        <MediaViewer
          media={mediaViewerType === 'photo' ? photosForViewer : videosForViewer}
          initialIndex={mediaViewerIndex}
          onClose={() => setShowMediaViewer(false)}
          type={mediaViewerType}
        />
      )}

      {showMessages && (
        <div className="fixed inset-0 bg-black/50 z-[70]" onClick={() => {
          if (!activeConversation) setShowMessages(false);
        }}>
          <div 
            className="absolute right-0 top-0 w-full max-w-md bg-white h-full shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {!activeConversation ? (
              <>
                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                  <h2 className="text-gray-900">Messages</h2>
                  <button
                    onClick={() => setShowMessages(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {globalConversations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                      <MessageCircle className="w-16 h-16 text-gray-300 mb-4" />
                      <h3 className="text-gray-900 mb-2">No messages yet</h3>
                      <p className="text-gray-500 text-sm">Start a conversation with organizers or other users!</p>
                    </div>
                  ) : (
                    globalConversations.map((conv) => (
                      <button
                        key={conv.id}
                        onClick={() => setActiveConversation(conv)}
                        className="w-full p-4 flex items-start gap-3 hover:bg-gray-50 transition-colors border-b border-gray-100"
                      >
                        <div className="relative">
                          <ImageWithFallback
                            src={conv.user.avatar}
                            alt={conv.user.name}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                          {conv.unreadCount > 0 && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#8A2BE2] rounded-full flex items-center justify-center">
                              <span className="text-white text-xs font-bold">{conv.unreadCount}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 text-left">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1">
                              <span className="text-gray-900 text-sm font-medium">{conv.user.name}</span>
                              {conv.user.verified && (
                                <CheckCircle2 className="w-4 h-4 text-white fill-[#8A2BE2]" />
                              )}
                            </div>
                            <span className="text-gray-400 text-xs">{conv.lastMessage.timestamp}</span>
                          </div>
                          <p className={`text-sm line-clamp-1 ${conv.lastMessage.isRead ? 'text-gray-500' : 'text-gray-900 font-medium'}`}>
                            {conv.lastMessage.text}
                          </p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="bg-[#8A2BE2] px-5 py-4">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setActiveConversation(null)}
                      className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5 text-white" />
                    </button>
                    
                    <div className="relative">
                      <ImageWithFallback
                        src={activeConversation.user.avatar}
                        alt={activeConversation.user.name}
                        className="w-10 h-10 rounded-full object-cover ring-2 ring-white/50"
                      />
                      {activeConversation.user.isOrganizer && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-[#8A2BE2] rounded-full flex items-center justify-center ring-2 ring-white">
                          <Star className="w-2 h-2 text-white fill-white" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-white font-bold truncate">
                          {activeConversation.user.name}
                        </h3>
                        {activeConversation.user.verified && (
                          <div className="flex-shrink-0 w-4 h-4 bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center">
                            <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <p className="text-white/80 text-xs">{activeConversation.user.username}</p>
                    </div>

                    <button
                      onClick={() => {
                        setActiveConversation(null);
                        setShowMessages(false);
                      }}
                      className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5 text-white" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto bg-gray-50 px-5 py-4">
                  {activeConversation.messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <MessageCircle className="w-12 h-12 text-gray-300 mb-3" />
                      <p className="text-gray-500 text-sm">Send a message to start the conversation</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {activeConversation.messages.map((msg) => {
                        const isMe = msg.senderId === 0;
                        return (
                          <div
                            key={msg.id}
                            className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                          >
                            <div className={`max-w-[75%] ${isMe ? 'order-2' : 'order-1'}`}>
                              <div
                                className={`rounded-2xl px-4 py-2.5 ${
                                  isMe
                                    ? 'bg-[#8A2BE2] text-white'
                                    : 'bg-white text-gray-900 shadow-sm'
                                }`}
                              >
                                <p className="text-sm leading-relaxed">{msg.text}</p>
                              </div>
                              <span className={`text-xs text-gray-400 mt-1 block ${
                                isMe ? 'text-right' : 'text-left'
                              }`}>
                                {msg.timestamp}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="bg-white border-t border-gray-200 px-5 py-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder="Type a message..."
                      className="flex-1 px-4 py-2.5 bg-gray-100 rounded-full text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#8A2BE2]"
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!messageText.trim()}
                      className="w-10 h-10 bg-[#8A2BE2] text-white rounded-full flex items-center justify-center hover:bg-[#7526c7] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
