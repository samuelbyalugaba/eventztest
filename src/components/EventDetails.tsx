import React, { useState, useEffect } from 'react';
import { EventGridSkeleton } from './skeletons/EventCardSkeleton';
import { useLocation, useNavigate } from 'react-router-dom';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Calendar, CalendarDays, ChevronDown, ChevronLeft, X, Filter, Search, Send, Star, CheckCircle2, MessageCircle, Music2, GraduationCap, BriefcaseBusiness, Palette, Landmark, Dumbbell, Shirt, LocateFixed, Check } from 'lucide-react';
import { EventCard } from './EventCard';
import { toast } from 'sonner';
import { Conversation } from '../types';
import { PremiumSearchModal } from './PremiumSearchModal';
import { MediaViewer } from './MediaViewer';

import { EventDetailModal } from './EventDetailModal';
import { VirtualTicketPurchaseModal } from './VirtualTicketPurchaseModal';
import { SimplifiedTicketModal } from './SimplifiedTicketModal';
import { supabase } from '../utils/supabase/client';
import { deleteEvent, getEvents, getSavedEvents, type Event as ApiEvent } from '../utils/supabase/api';
import { extractCityName, normalizePlaceName, searchNominatim } from '../utils/nominatim';
import { ConfirmDialog } from './ui/confirm-dialog';

import { eventsStore } from '../store/eventStore';
import { queryClient } from '../queryClient';
import { queryKeys } from '../queryKeys';

type LocationOption = {
  id: string;
  name: string;
  icon?: React.ReactNode;
};

type CountryOption = {
  code: string;
  name: string;
  cities: string[];
  timeZones?: string[];
};

type CategoryOption = {
  id: string;
  name: string;
  chipName?: string;
  icon?: React.ComponentType<{ className?: string }>;
  subcategories?: string[];
};

type TimeFilterId = 'all' | 'today' | 'tomorrow' | 'weekend' | 'month';

type TimeFilterOption = {
  id: TimeFilterId;
  name: string;
};

const categories: CategoryOption[] = [
  { id: 'all', name: 'All' },
  { id: 'entertainment', name: 'Entertainment', icon: Music2, subcategories: ['Concerts', 'Club Nights', 'Live Performances', 'Nightlife (Bars/Lounges)', 'Themed Parties'] },
  { id: 'business & tech', name: 'Business & Tech', icon: BriefcaseBusiness, subcategories: ['Startup Events', 'Networking', 'Conferences', 'Tech Talks'] },
  { id: 'sports & fitness', name: 'Sports & Fitness', chipName: 'Sports', icon: Dumbbell, subcategories: ['Fitness Classes', 'Competitions', 'Sports Events'] },
  { id: 'fashion', name: 'Fashion', icon: Shirt, subcategories: ['Runway Shows', 'Pop-Up Markets', 'Style and Beauty', 'Brand Launches', 'Fashion Weeks'] },
  { id: 'culture', name: 'Culture', icon: Palette, subcategories: ['Festivals', 'Arts', 'Theater', 'Food & Drink', 'Local Traditions', 'Fashion Events'] },
  { id: 'education', name: 'Education', icon: GraduationCap, subcategories: ['Workshops', 'Seminars', 'Webinars'] },
  { id: 'religion', name: 'Religion', icon: Landmark, subcategories: ['Worship Services', 'Religious Gatherings', 'Spiritual Events'] },
];

const timeFilters: TimeFilterOption[] = [
  { id: 'all', name: 'All Upcoming Events' },
  { id: 'today', name: 'Today' },
  { id: 'tomorrow', name: 'Tomorrow' },
  { id: 'weekend', name: 'This Weekend' },
  { id: 'month', name: 'This Month' },
];

const COUNTRY_OPTIONS: CountryOption[] = [
  { code: 'TZ', name: 'Tanzania', cities: ['Dar es Salaam', 'Zanzibar', 'Arusha', 'Mwanza', 'Dodoma', 'Moshi', 'Tanga'], timeZones: ['Africa/Dar_es_Salaam'] },
  { code: 'KE', name: 'Kenya', cities: ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Malindi'], timeZones: ['Africa/Nairobi'] },
  { code: 'UG', name: 'Uganda', cities: ['Kampala', 'Entebbe', 'Gulu', 'Jinja', 'Mbarara'], timeZones: ['Africa/Kampala'] },
  { code: 'RW', name: 'Rwanda', cities: ['Kigali', 'Butare', 'Gisenyi', 'Musanze'], timeZones: ['Africa/Kigali'] },
  { code: 'ET', name: 'Ethiopia', cities: ['Addis Ababa', 'Dire Dawa', 'Bahir Dar', 'Hawassa'], timeZones: ['Africa/Addis_Ababa'] },
  { code: 'NG', name: 'Nigeria', cities: ['Lagos', 'Abuja', 'Port Harcourt', 'Ibadan', 'Kano'], timeZones: ['Africa/Lagos'] },
  { code: 'ZA', name: 'South Africa', cities: ['Johannesburg', 'Cape Town', 'Durban', 'Pretoria', 'Stellenbosch'], timeZones: ['Africa/Johannesburg'] },
  { code: 'GB', name: 'United Kingdom', cities: ['London', 'Manchester', 'Birmingham', 'Edinburgh', 'Leeds'], timeZones: ['Europe/London'] },
  { code: 'US', name: 'United States', cities: ['New York', 'Los Angeles', 'Atlanta', 'Chicago', 'Houston', 'Miami'], timeZones: ['America/New_York', 'America/Los_Angeles', 'America/Chicago', 'America/Denver'] },
  { code: 'AE', name: 'UAE', cities: ['Dubai', 'Abu Dhabi', 'Sharjah'], timeZones: ['Asia/Dubai'] },
];

const DEFAULT_COUNTRY_CODE = 'TZ';

const getCountryOption = (code: string) =>
  COUNTRY_OPTIONS.find((country) => country.code === code) || COUNTRY_OPTIONS[0];

const inferDeviceCountryCode = () => {
  if (typeof Intl !== 'undefined') {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const match = COUNTRY_OPTIONS.find((country) => country.timeZones?.includes(timeZone));
    if (match) return match.code;
  }

  if (typeof navigator !== 'undefined') {
    const locales = [navigator.language, ...(navigator.languages || [])].filter(Boolean);
    for (const locale of locales) {
      const region = locale.split('-').pop()?.toUpperCase();
      if (region && COUNTRY_OPTIONS.some((country) => country.code === region)) {
        return region;
      }
    }
  }

  return DEFAULT_COUNTRY_CODE;
};

const extractReverseCity = (address: Record<string, string | undefined> = {}) =>
  String(
    address.city ||
      address.town ||
      address.village ||
      address.municipality ||
      address.county ||
      address.state ||
      ''
  ).trim();

export const eventMatchesLocation = (event: ApiEvent, selectedLocation: string) => {
  if (selectedLocation === 'all') return true;

  const selected = normalizePlaceName(selectedLocation);
  const eventCity = normalizePlaceName(String((event as any)?.city || ''));
  const eventLocation = normalizePlaceName(String((event as any)?.location || ''));
  const eventLocationParts = eventLocation
    .split(',')
    .map((part) => normalizePlaceName(part))
    .filter(Boolean);

  return (
    eventCity === selected ||
    eventCity.includes(selected) ||
    eventLocationParts.some((part) => part === selected || part.includes(selected)) ||
    eventLocation.includes(selected)
  );
};

const startOfDay = (date: Date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const getEventDateTime = (event: ApiEvent) => {
  try {
    const dateStr = event.date;
    const timeStr = event.time ? String(event.time).replace(/\s+/g, '') : '00:00';
    return new Date(`${dateStr} ${timeStr}`);
  } catch (e) {
    return new Date(event.date);
  }
};

export const matchesTimeFilter = (eventDate: Date, filterId: TimeFilterId, now: Date) => {
  if (filterId === 'all') return true;

  const todayStart = startOfDay(now);
  let start = todayStart;
  let end = addDays(todayStart, 1);

  if (filterId === 'tomorrow') {
    start = addDays(todayStart, 1);
    end = addDays(todayStart, 2);
  } else if (filterId === 'weekend') {
    const day = now.getDay();
    const daysUntilSaturday = day === 0 ? -1 : 6 - day;
    start = addDays(todayStart, daysUntilSaturday);
    end = addDays(start, 2);
  } else if (filterId === 'month') {
    start = todayStart;
    end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  }

  return eventDate >= start && eventDate < end;
};

interface EventDetailsProps {
  conversations: Conversation[];
  onStartConversation: (user: { name: string; username?: string; avatar: string; verified: boolean; isOrganizer?: boolean; id?: string }) => Promise<Conversation | null | undefined> | Conversation | null;
  onSendMessage: (conversationId: number, messageText: string) => void;
}

export function EventDetails({ conversations: globalConversations, onStartConversation, onSendMessage }: EventDetailsProps) {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Initialize state directly from store
  const [events, setEvents] = useState<ApiEvent[]>(eventsStore.getEvents());
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(eventsStore.getEvents().length === 0);
  const [hasLoadedEvents, setHasLoadedEvents] = useState(eventsStore.getEvents().length > 0);

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
        setHasLoadedEvents(true);
        setIsFetching(false);
        return;
      }
      
      try {
        setIsFetching(true);
        if (force) {
          await queryClient.invalidateQueries({ queryKey: queryKeys.events.root });
        }
        const allEvents = await queryClient.fetchQuery({
          queryKey: queryKeys.events.publicList,
          staleTime: 15 * 60 * 1000,
          queryFn: () => getEvents(),
        });
        eventsStore.setEvents((allEvents as any[]).map(e => ({ ...e, isSaved: false })) as ApiEvent[]);
        setHasLoadedEvents(true);

        try {
          const { data: { user } } = await supabase.auth.getUser();
          setCurrentUserId(user?.id ?? null);

          if (!user) {
            return;
          }

          const savedEvents = await getSavedEvents(user.id);
          const savedIds = new Set((savedEvents as any[]).map(e => e.id));
          const eventsWithSaved = (allEvents as any[]).map(e => ({
            ...e,
            isSaved: savedIds.has(e.id)
          }));

          queryClient.setQueryData(queryKeys.events.list(user.id), eventsWithSaved);
          eventsStore.setEvents(eventsWithSaved as ApiEvent[]);
        } catch (_savedEventsError) {
          // Saved-event hydration is best-effort; keep the public events list visible.
        }
      } catch (error: any) {
        if (error.name === 'AbortError') {
          return;
        }
      } finally {
        setIsFetching(false);
      }
    };

    fetchEvents();
    
    const handleEventsUpdate = () => fetchEvents(true);
    const handleSavedUpdate = () => fetchEvents(true);
    const eventsChannel = supabase
      .channel('events-page-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, handleEventsUpdate)
      .subscribe();

    window.addEventListener('eventsUpdated', handleEventsUpdate);
    window.addEventListener('savedEventsUpdated', handleSavedUpdate);
    return () => {
      window.removeEventListener('eventsUpdated', handleEventsUpdate);
      window.removeEventListener('savedEventsUpdated', handleSavedUpdate);
      supabase.removeChannel(eventsChannel);
    };
  }, []);

  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const [selectedTimeFilter, setSelectedTimeFilter] = useState<TimeFilterId>('all');
  const [showWhenMenu, setShowWhenMenu] = useState(false);
  const handleEventClick = (event: ApiEvent) => {
    const backgroundBase = (location.state as any)?.backgroundLocation || location;
    navigate(`/event/${event.id}`, { state: { backgroundLocation: backgroundBase, closeTo: backgroundBase } });
  };

  const [showFilters, setShowFilters] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');
  const [remoteLocationOptions, setRemoteLocationOptions] = useState<LocationOption[]>([]);
  const [isSearchingLocations, setIsSearchingLocations] = useState(false);
  const [selectedCountryCode, setSelectedCountryCode] = useState(() => inferDeviceCountryCode());
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [detectStatus, setDetectStatus] = useState('Ready');
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [eventToPurchase, setEventToPurchase] = useState<ApiEvent | null>(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  

  const [showMediaViewer, setShowMediaViewer] = useState(false);
  const [mediaViewerIndex] = useState(0);
  const [mediaViewerType] = useState<'photo' | 'video'>('photo');
  
  // Messaging state
  const [showMessages, setShowMessages] = useState(false);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messageText, setMessageText] = useState('');
  const [eventPendingDelete, setEventPendingDelete] = useState<ApiEvent | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('search') === '1') {
      setShowSearchModal(true);
    }
  }, [location.search]);

  const closeSearchModal = () => {
    setShowSearchModal(false);

    const params = new URLSearchParams(location.search);
    if (params.get('search') !== '1') return;

    params.delete('search');
    const nextSearch = params.toString();
    navigate(
      {
        pathname: location.pathname,
        search: nextSearch ? `?${nextSearch}` : '',
      },
      { replace: true, state: location.state },
    );
  };

  // Sync activeConversation
  useEffect(() => {
    if (activeConversation) {
      const updatedConv = globalConversations.find(c => c.id === activeConversation.id);
      if (updatedConv && updatedConv !== activeConversation) {
        setActiveConversation(updatedConv);
      }
    }
  }, [globalConversations, activeConversation]);

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setSelectedSubcategory('');
  };

  const filteredEvents = React.useMemo(() => {
    return events.filter(event => {
      const locationMatch = eventMatchesLocation(event, selectedLocation);
      const categoryMatch =
        selectedCategory === 'all' ||
        String((event as any).category || '').toLowerCase() === selectedCategory.toLowerCase();
      const subcategoryMatch =
        selectedSubcategory === '' ||
        String((event as any).subcategory || '').toLowerCase() === selectedSubcategory.toLowerCase();
      return locationMatch && categoryMatch && subcategoryMatch;
    });
  }, [events, selectedLocation, selectedCategory, selectedSubcategory]);

  const upcomingEvents = React.useMemo(() => {
    const now = new Date();
    return filteredEvents
      .filter(e => {
        const eventDate = getEventDateTime(e);
        return eventDate >= now && matchesTimeFilter(eventDate, selectedTimeFilter, now);
      })
      .sort((a, b) => getEventDateTime(a).getTime() - getEventDateTime(b).getTime());
  }, [filteredEvents, selectedTimeFilter]);

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
          next.push({ id: city, name: city });
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

  const selectedCountry = getCountryOption(selectedCountryCode);
  const detectedCountryCode = inferDeviceCountryCode();
  const countryCityOptions: LocationOption[] = selectedCountry.cities.map((city) => ({ id: city, name: city }));
  const selectedLocationOption: LocationOption[] =
    selectedLocation !== 'all' &&
    !countryCityOptions.some((location) => normalizePlaceName(location.id) === normalizePlaceName(selectedLocation))
      ? [{ id: selectedLocation, name: selectedLocation }]
      : [];
  const localMatches: LocationOption[] = countryCityOptions.filter((location) =>
    String(location.name || '').toLowerCase().includes(locationSearch.toLowerCase())
  );

  const displayedLocations: LocationOption[] =
    locationSearch.trim() === ''
      ? mergeUniqueById([...selectedLocationOption, ...countryCityOptions])
      : mergeUniqueById([...selectedLocationOption, ...localMatches, ...remoteLocationOptions]);
  const selectedCityIsInCountry = countryCityOptions.some(
    (location) => normalizePlaceName(location.id) === normalizePlaceName(selectedLocation)
  );
  const hasSelectedCity = selectedLocation !== 'all';
  const locationBannerTitle = hasSelectedCity
    ? selectedCityIsInCountry
      ? `${selectedLocation}, ${selectedCountry.name}`
      : selectedLocation
    : selectedCountry.name;
  const locationBannerSub = hasSelectedCity
    ? detectStatus === 'Located'
      ? `Detected from current location in ${selectedCountry.name}`
      : selectedCityIsInCountry
        ? `Selected city in ${selectedCountry.name}`
        : 'Selected city'
    : selectedCountryCode === detectedCountryCode
      ? 'Based on your device'
      : 'Selected country';

  const handleCountryChange = (code: string) => {
    setSelectedCountryCode(code);
    setShowCountryPicker(false);
    setSelectedLocation('all');
    setLocationSearch('');
    setDetectStatus('Ready');
  };

  const handleLocationSelect = (locationId: string) => {
    setSelectedLocation(selectedLocation === locationId ? 'all' : locationId);
    setDetectStatus('Ready');
  };

  const clearFilters = () => {
    setSelectedLocation('all');
    setSelectedCategory('all');
    setSelectedSubcategory('');
    setSelectedTimeFilter('all');
    setLocationSearch('');
    setDetectStatus('Ready');
    setShowCountryPicker(false);
  };

  const handleUseCurrentLocation = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setDetectStatus('Unavailable');
      return;
    }

    setDetectStatus('Detecting...');
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const url = new URL('https://nominatim.openstreetmap.org/reverse');
          url.searchParams.set('format', 'json');
          url.searchParams.set('lat', String(coords.latitude));
          url.searchParams.set('lon', String(coords.longitude));
          url.searchParams.set('addressdetails', '1');

          const res = await fetch(url.toString());
          if (!res.ok) throw new Error('Location lookup failed');

          const data = await res.json();
          const address = data?.address || {};
          const countryCode = String(address.country_code || '').toUpperCase();
          const nextCountry = COUNTRY_OPTIONS.some((country) => country.code === countryCode)
            ? countryCode
            : selectedCountryCode;
          const city = extractReverseCity(address);

          setSelectedCountryCode(nextCountry);
          setLocationSearch('');
          if (city) {
            setSelectedLocation(city);
            setDetectStatus('Located');
          } else {
            setSelectedLocation('all');
            setDetectStatus('City unavailable');
          }
        } catch (error) {
          setDetectStatus('Lookup failed');
        }
      },
      (error) => {
        setDetectStatus(error.code === error.PERMISSION_DENIED ? 'Permission denied' : 'Unavailable');
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  };

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
    
    try {
      const conversation = await onStartConversation(user);
      if (conversation) {
        // Only close the profile modal AFTER we have the conversation ready
        setSelectedUser(null);
        setActiveConversation(conversation);
        setShowMessages(true);
      } else {
        toast.error('Could not start conversation');
      }
    } catch (error) {
      toast.error('Failed to start conversation');
    }
  };

  const handleDeleteEvent = async (event: ApiEvent) => {
    if (!currentUserId || currentUserId !== event.organizer_id) return;
    setEventPendingDelete(event);
  };

  const handleConfirmDeleteEvent = async () => {
    if (!eventPendingDelete || !currentUserId || currentUserId !== eventPendingDelete.organizer_id) return;
    const event = eventPendingDelete;
    setEventPendingDelete(null);
    try {
      await deleteEvent(event.id);
      const next = eventsStore.getEvents().filter(e => e.id !== event.id);
      eventsStore.setEvents(next);
      toast.success('Event deleted');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to delete event');
    }
  };

  const handleSendMessage = () => {
    if (!messageText.trim() || !activeConversation) return;
    onSendMessage(activeConversation.id, messageText);
    setMessageText('');
  };

  const hasActiveFilters = selectedLocation !== 'all' || selectedCategory !== 'all' || selectedSubcategory !== '' || selectedTimeFilter !== 'all';
  const activeFiltersCount = (selectedLocation !== 'all' ? 1 : 0) + (selectedCategory !== 'all' ? 1 : 0) + (selectedSubcategory !== '' ? 1 : 0) + (selectedTimeFilter !== 'all' ? 1 : 0);
  const selectedTimeFilterName = selectedTimeFilter === 'all'
    ? undefined
    : timeFilters.find(filter => filter.id === selectedTimeFilter)?.name;

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
      <div className="event-discovery-page pb-20">
        {/* 3. Search & Events List */}
        <div className="px-3 pb-6 pt-0">
          {/* Header */}
          <div className="sticky top-0 z-50 bg-gray-50/95 backdrop-blur-sm pt-[calc(0.75rem+var(--eventz-safe-area-top))] pb-3 -mx-3 px-3 transition-all rounded-b-[24px]">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex flex-col">
                <h1 className="text-[22px] font-bold leading-tight tracking-tight text-gray-900">EVENTZ</h1>
                <p className="text-[13px] font-medium leading-snug text-gray-600">Discover amazing events happening around you</p>
              </div>
              <button 
                onClick={() => setShowFilters(true)}
                className="icon-circle-button relative rounded-full border border-gray-100 bg-white shadow-sm transition-all hover:bg-gray-50 group"
              >
                <Filter className="h-4 w-4 shrink-0 text-gray-600 transition-colors group-hover:text-[#8A2BE2]" />
                {hasActiveFilters && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#8A2BE2] text-white text-[10px] rounded-full flex items-center justify-center shadow-md">
                    {activeFiltersCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="mt-2">
            <div className="-mx-3 overflow-x-auto px-3 pb-1 scrollbar-hide">
              <div className="flex w-max items-center gap-1.5">
                {categories.map((category) => {
                  const Icon = category.icon;
                  const isSelected = selectedCategory === category.id;

                  return (
                    <button
                      key={category.id}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => handleCategorySelect(category.id)}
                      className={`event-category-chip flex h-[1.65rem] flex-shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2.5 text-[11px] font-semibold transition-all ${
                        isSelected
                          ? 'border-gray-950 bg-gray-950 text-white shadow-sm'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-purple-200 hover:bg-purple-50'
                      }`}
                    >
                      {Icon && <Icon className="h-[0.8rem] w-[0.8rem]" />}
                      <span>{category.chipName || category.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

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
                        className={`event-subcategory-chip flex h-[1.65rem] flex-shrink-0 items-center rounded-full border px-2.5 text-[11px] font-semibold transition-all ${
                          selectedSubcategory === subcategory
                            ? 'border-purple-600 bg-purple-600 text-white shadow-sm'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-purple-300 hover:bg-purple-50'
                        }`}
                      >
                        {subcategory}
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* Events List */}
          <div className={hasActiveFilters ? "space-y-6 mt-4" : "space-y-6 mt-2"}>
            <div className="relative grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
              {showWhenMenu && (
                <button
                  type="button"
                  aria-label="Close when filter"
                  className="fixed inset-0 z-20 cursor-default"
                  onClick={() => setShowWhenMenu(false)}
                />
              )}
              <div className="min-w-0 pr-1">
                <h3 className="truncate text-[15px] font-bold leading-tight text-gray-900">Upcoming Events</h3>
                <p className="mt-1 h-4 whitespace-nowrap text-xs font-medium leading-4 text-gray-500 tabular-nums">
                  {upcomingEvents.length} {upcomingEvents.length === 1 ? 'event' : 'events'} found
                </p>
              </div>
              <div className="relative z-30 flex-shrink-0">
                <button
                  type="button"
                  aria-expanded={showWhenMenu}
                  onClick={() => setShowWhenMenu((open) => !open)}
                  className={`flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-semibold shadow-sm transition-all ${
                    selectedTimeFilter !== 'all'
                      ? 'border-purple-200 bg-purple-50 text-purple-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-purple-200 hover:bg-purple-50'
                  }`}
                >
                  <CalendarDays className="h-3.5 w-3.5" />
                  <span>{selectedTimeFilterName || 'When'}</span>
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showWhenMenu ? 'rotate-180' : ''}`} />
                </button>

                {showWhenMenu && (
                  <div className="absolute right-0 top-11 z-30 w-52 overflow-hidden rounded-2xl border border-gray-100 bg-white py-3 shadow-xl">
                    <div className="px-4 pb-2 text-[10px] font-bold uppercase text-gray-500">Filter by time</div>
                    <div className="space-y-1">
                      {timeFilters.map((filter) => {
                        const isSelected = selectedTimeFilter === filter.id;

                        return (
                          <button
                            key={filter.id}
                            type="button"
                            aria-pressed={isSelected}
                            onClick={() => {
                              setSelectedTimeFilter(filter.id);
                              setShowWhenMenu(false);
                            }}
                            className={`flex w-full items-center px-4 py-2.5 text-left text-sm font-semibold transition-colors ${
                              isSelected
                                ? 'bg-purple-50 text-purple-700'
                                : 'text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            {filter.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-3 lg:gap-4 xl:grid-cols-3 2xl:grid-cols-4">
              {upcomingEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onClick={handleEventClick}
                    currentUserId={currentUserId}
                    onEditEvent={(e) => navigate(`/edit-event/${e.id}`)}
                    onDeleteEvent={handleDeleteEvent}
                    className="event-card-compact"
                    compact
                  />
              ))}
            </div>

            {upcomingEvents.length === 0 && hasLoadedEvents && !isFetching && (
              <div className="flex flex-col items-center justify-center py-10 text-center bg-white rounded-2xl border border-dashed border-gray-200">
                <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                  <Calendar className="w-6 h-6 text-gray-400" />
                </div>
                <h3 className="text-gray-900 font-medium mb-1">No upcoming events</h3>
                <p className="text-gray-500 text-xs max-w-[200px]">Check back later or try adjusting your filters</p>
              </div>
            )}

            {events.length === 0 && (!hasLoadedEvents || isFetching) && (
              <EventGridSkeleton count={6} />
            )}
          </div>
        </div>
      </div>

      {/* Filter Panel Sheet */}
      {showFilters && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 pt-10 backdrop-blur-sm animate-in fade-in"
          onClick={() => setShowFilters(false)}
        >
          <div
            className="w-full max-w-none overflow-hidden rounded-t-[24px] bg-white shadow-[0_-16px_48px_rgba(0,0,0,0.18)] animate-in slide-in-from-bottom duration-300 sm:max-w-[504px]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 pb-4 pt-5">
              <h2 className="text-[17px] font-bold tracking-tight text-gray-950">Filter Events</h2>
              <button 
                onClick={() => setShowFilters(false)}
                type="button"
                aria-label="Close filters"
                className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-900"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mx-5 h-px bg-gray-100" />

            <div className="max-h-[72vh] overflow-y-auto px-5 py-5">
              <div className="mb-6">
                <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.09em] text-gray-400">Location</div>

                <div className="mb-3 rounded-xl border border-purple-100 bg-purple-50 px-3.5 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-purple-700 shadow-sm">
                        {selectedCountry.code}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-gray-950">{locationBannerTitle}</div>
                        <div className="text-[11px] font-medium text-purple-600">
                          {locationBannerSub}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowCountryPicker((open) => !open)}
                      className="shrink-0 text-[11px] font-bold text-purple-700 transition-colors hover:text-purple-900"
                    >
                      {showCountryPicker ? 'Done' : 'Change'}
                    </button>
                  </div>

                  {showCountryPicker && (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {COUNTRY_OPTIONS.map((country) => {
                        const active = selectedCountryCode === country.code;
                        return (
                          <button
                            key={country.code}
                            type="button"
                            onClick={() => handleCountryChange(country.code)}
                            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition-all ${
                              active
                                ? 'border-purple-500 bg-white text-purple-700'
                                : 'border-purple-100 bg-white/70 text-gray-700 hover:border-purple-200'
                            }`}
                          >
                            <span className="w-6 text-[11px] font-bold">{country.code}</span>
                            <span className="min-w-0 flex-1 truncate text-xs font-semibold">{country.name}</span>
                            {active && <Check className="h-3.5 w-3.5 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              <div className="relative mb-3">
                  <label htmlFor="event-location-search" className="sr-only">Search city</label>
                  <input
                    id="event-location-search"
                    type="text"
                    placeholder="Search city..."
                    value={locationSearch}
                    onChange={(e) => setLocationSearch(e.target.value)}
                    className="w-full rounded-[10px] border border-gray-200 bg-gray-100 px-3.5 py-2.5 pr-10 text-sm font-medium text-gray-950 placeholder:text-gray-400 transition-all focus:border-purple-600 focus:bg-white focus:outline-none"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Search className="h-4 w-4 text-gray-400" />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  className="mb-3 flex w-full items-center gap-2.5 rounded-[10px] border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-left transition-all hover:border-purple-200 hover:bg-purple-50"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-700">
                    <LocateFixed className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0 flex-1 text-sm font-semibold text-gray-700">Use my current location</span>
                  <span className="shrink-0 text-[11px] font-medium text-gray-400">{detectStatus}</span>
                </button>

                <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.07em] text-gray-400">
                  {locationSearch.trim() ? 'Matching cities' : `Popular cities in ${selectedCountry.name}`}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {displayedLocations.map((location) => (
                    <button
                      key={location.id}
                      type="button"
                      onClick={() => handleLocationSelect(location.id)}
                      className={`whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all ${
                        selectedLocation === location.id
                          ? 'border-purple-600 bg-purple-600 text-white shadow-sm'
                          : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-purple-200 hover:bg-purple-50 hover:text-purple-700'
                      }`}
                    >
                      {location.name}
                    </button>
                  ))}
                </div>
                {isSearchingLocations && (
                  <div className="mt-2 text-xs font-medium text-gray-500">Searching...</div>
                )}
                {!isSearchingLocations && displayedLocations.length === 0 && (
                  <div className="mt-2 rounded-lg border border-dashed border-gray-200 px-3 py-2 text-center text-xs font-medium text-gray-500">
                    No matching cities yet.
                  </div>
                )}
              </div>

              <div className="mx-0 mb-5 h-px bg-gray-100" />

              <div className="mb-1">
                <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.09em] text-gray-400">Category</div>
                <div className="flex flex-wrap gap-1.5">
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => handleCategorySelect(category.id)}
                      className={`whitespace-nowrap rounded-lg border px-3.5 py-2 text-xs font-semibold transition-all ${
                        selectedCategory === category.id
                          ? 'border-purple-600 bg-purple-600 text-white shadow-sm'
                          : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-purple-200 hover:bg-purple-50 hover:text-purple-700'
                      }`}
                    >
                      <span>{category.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2.5 px-5 pb-5 pt-3">
              <button 
                type="button"
                onClick={clearFilters}
                className="flex-1 rounded-xl border border-gray-200 bg-white py-3 text-sm font-bold text-gray-500 transition-colors hover:border-purple-200 hover:text-purple-700"
              >
                Clear all
              </button>
              <button 
                type="button"
                onClick={() => setShowFilters(false)}
                className="flex-[2] rounded-xl bg-purple-600 py-3 text-sm font-bold text-white shadow-[0_4px_14px_rgba(124,58,237,0.28)] transition-colors hover:bg-purple-700"
              >
                Show {upcomingEvents.length} {upcomingEvents.length === 1 ? 'event' : 'events'}
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
          onClose={closeSearchModal}
          events={events}
                    onEventSelect={(event: ApiEvent) => handleEventClick(event)}
          onPersonSelect={(person) => setSelectedUser(person)}
          onVenueSelect={(venue) => {
            setSelectedLocation(venue.name);
            setSelectedCategory('all');
            setSelectedSubcategory('');
            setDetectStatus('Ready');
          }}
        />
      )}

      {selectedUser && (
        (() => {
          navigate(`/profile/${selectedUser.id}`);
          setSelectedUser(null);
          return null;
        })()
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
                      aria-label={`Message ${activeConversation.user.name}`}
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
      <ConfirmDialog
        open={eventPendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setEventPendingDelete(null);
        }}
        title="Delete event?"
        description="This removes the event and cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={handleConfirmDeleteEvent}
      />
    </div>
  );
}
