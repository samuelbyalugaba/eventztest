import { useState, useEffect } from 'react';
import { Filter, MapPin, Video, Smartphone, Clock } from 'lucide-react';
import { LiveStreamViewerNew as LiveStreamViewer } from './livestream/LiveStreamViewerNew';
import { VirtualTicketPurchaseModal } from './VirtualTicketPurchaseModal';
import { EventDetailModal } from './EventDetailModal';
import { toast } from 'sonner';
import { getEventById, getLiveStreams, getUpcomingStreams, getProfile, hasActiveVirtualTicket, subscribeToEventStreaming, updateProfile, type Event as ApiEvent } from '../utils/supabase/api';
import { supabase } from '../utils/supabase/client';
import { Skeleton } from './ui/skeleton';
import { extractCityName, normalizePlaceName, searchNominatim } from '../utils/nominatim';
import { locations, liveCategories, type LocationOption } from '../utils/locations';
import { LiveStreamCard, StreamSectionHeader } from './live/LiveStreamCard';
import { UpcomingStreamCard } from './live/UpcomingStreamCard';
import { LiveFilterModals } from './live/LiveFilterModals';

function LiveFeedSkeleton() {
  return (
    <div className="max-w-4xl mx-auto px-5 py-6 space-y-8 animate-pulse">
      <div>
        <div className="flex items-center gap-2.5 mb-5 px-1">
          <Skeleton className="w-5 h-5 rounded-md" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        <div className="flex overflow-x-auto gap-3 pb-4 -mx-5 px-5 scrollbar-hide">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="flex-shrink-0 w-[75vw] sm:w-[320px] aspect-video rounded-2xl" />
          ))}
        </div>
      </div>
      <div>
        <div className="flex items-center gap-2.5 mb-5 px-1">
          <Skeleton className="w-5 h-5 rounded-md" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        <div className="flex overflow-x-auto gap-3 pb-4 -mx-5 px-5 scrollbar-hide">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="flex-shrink-0 w-[42vw] sm:w-[180px] aspect-[3/4] rounded-2xl" />
          ))}
        </div>
      </div>
      <div>
        <div className="flex items-center gap-2.5 mb-5 px-1">
          <Skeleton className="w-5 h-5 rounded-md" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 p-2.5 bg-white rounded-2xl border border-gray-50">
              <Skeleton className="w-16 h-16 rounded-xl flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-1/3" />
              </div>
              <Skeleton className="w-10 h-10 rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface LiveStream {
  id: number;
  title: string;
  category: string;
  thumbnail: string;
  isLive: boolean;
  viewers?: number;
  scheduledTime?: string;
  countdown?: number;
  host: string;
  organizer_id: string;
  quality: 'HD' | '4K' | 'SD';
  isPaid?: boolean;
  price?: number;
  location: string;
  country: string;
  countryFlag: string;
  playback_url?: string;
  host_avatar?: string;
}

let liveFeedCache: { liveStreams: LiveStream[]; upcomingStreams: LiveStream[]; ts: number } | null = null;
const LIVE_FEED_CACHE_TTL_MS = 60_000;

export function LiveFeed({ isPaused }: { isPaused?: boolean }) {
  const hasFreshCache = !!(liveFeedCache && Date.now() - liveFeedCache.ts < LIVE_FEED_CACHE_TTL_MS);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showLocationFilter, setShowLocationFilter] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');
  const [remoteLocationOptions, setRemoteLocationOptions] = useState<LocationOption[]>([]);
  const [_isSearchingLocations, setIsSearchingLocations] = useState(false);
  const [selectedStream, setSelectedStream] = useState<LiveStream | null>(null);

  useEffect(() => {
    if (isPaused && selectedStream) {
      setSelectedStream(null);
    }
  }, [isPaused, selectedStream]);

  const [selectedEvent, setSelectedEvent] = useState<ApiEvent | null>(null);
  const [recentLocations, setRecentLocations] = useState<string[]>(['Dar es Salaam', 'Dubai', 'New York']);
  const [liveStreams, setLiveStreams] = useState<LiveStream[]>(hasFreshCache ? liveFeedCache!.liveStreams : []);
  const [upcomingStreams, setUpcomingStreams] = useState<LiveStream[]>(hasFreshCache ? liveFeedCache!.upcomingStreams : []);
  const [isLoading, setIsLoading] = useState(!hasFreshCache);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [eventToPurchase, setEventToPurchase] = useState<ApiEvent | null>(null);
  const [reminders, setReminders] = useState<Set<number>>(new Set());

  const handlePurchaseTicket = (event: ApiEvent) => {
    setEventToPurchase(event);
    setShowTicketModal(true);
    if (selectedEvent) setSelectedEvent(null);
  };

  const fetchStreams = async ({ showLoading }: { showLoading?: boolean } = {}) => {
    const shouldShowLoading = showLoading ?? liveStreams.length === 0;
    if (shouldShowLoading) setIsLoading(true);
    try {
      const live = await getLiveStreams();
      let nextLive: LiveStream[] = liveStreams;
      if (live) {
        const mappedLive = live.map((e: any) => {
          const profile = e.organizer;
          return {
            ...e,
            thumbnail: e.image_url,
            host: profile?.full_name || 'Event Organizer',
            host_avatar: profile?.avatar_url,
            organizer_id: e.organizer_id,
            viewers: e.streaming?.liveViewers || 0,
            isLive: true,
            playback_url: e.streaming?.playback_url,
            location: profile?.location?.split(',')[0]?.trim() || 'Dar es Salaam'
          };
        });
        nextLive = mappedLive as unknown as LiveStream[];
        setLiveStreams(nextLive);
      }
      
      const upcoming = await getUpcomingStreams();
      let nextUpcoming: LiveStream[] = upcomingStreams;
      if (upcoming) {
        const mappedUpcoming = upcoming
          .filter((e: any) => e.description !== 'Instant live stream')
          .map((e: any) => {
            const profile = e.organizer;
            return {
              ...e,
              thumbnail: e.image_url,
              scheduledTime: `${e.date} at ${e.time}`,
              host: profile?.full_name || 'Event Organizer',
              host_avatar: profile?.avatar_url,
              organizer_id: e.organizer_id,
              location: profile?.location?.split(',')[0]?.trim() || 'Dar es Salaam',
              countdown: Math.max(0, Math.floor((new Date(`${e.date}T${e.time}`).getTime() - new Date().getTime()) / (1000 * 60)))
            };
        });
        nextUpcoming = mappedUpcoming as unknown as LiveStream[];
        setUpcomingStreams(nextUpcoming);
      }

      liveFeedCache = { liveStreams: nextLive, upcomingStreams: nextUpcoming, ts: Date.now() };
    } catch {
      // Error fetching streams
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (liveStreams.length === 0) return;
    const channels = liveStreams.map((s) =>
      subscribeToEventStreaming(s.id, (streaming) => {
        const next = streaming?.liveViewers ?? 0;
        setLiveStreams((prev) =>
          prev.map((p) => (p.id === s.id ? { ...p, viewers: next } : p))
        );
      })
    );
    return () => { channels.forEach((c) => c.unsubscribe()); };
  }, [liveStreams.map((s) => s.id).join(',')]);

  useEffect(() => {
    fetchStreams({ showLoading: !hasFreshCache });
    const channel = supabase
      .channel('live-feed-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => { fetchStreams(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Location search with Nominatim
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
          next.push({ id: city, name: city, icon: MapPin });
          if (next.length >= 12) break;
        }
        setRemoteLocationOptions(next);
      } catch (e: any) {
        if (e?.name !== 'AbortError') setRemoteLocationOptions([]);
      } finally {
        setIsSearchingLocations(false);
      }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [locationSearch]);

  // Load preferences
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const profile = await getProfile(user.id);
          const localStored = localStorage.getItem('eventz-recent-locations');
          if (profile?.preferences?.recentLocations) {
            setRecentLocations(profile.preferences.recentLocations);
            if (localStored) localStorage.removeItem('eventz-recent-locations');
          } else if (localStored) {
            const locs = JSON.parse(localStored);
            setRecentLocations(locs);
            const currentPreferences = profile?.preferences || {};
            await updateProfile(user.id, { preferences: { ...currentPreferences, recentLocations: locs } });
            localStorage.removeItem('eventz-recent-locations');
          }
        } else {
          const stored = localStorage.getItem('eventz-recent-locations');
          if (stored) setRecentLocations(JSON.parse(stored));
        }
      } catch {
        // Error loading preferences
      }
    };
    loadPreferences();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => { loadPreferences(); });
    return () => { subscription.unsubscribe(); };
  }, []);

  const handleLocationSelect = async (locationId: string) => {
    setSelectedLocation(locationId);
    setShowLocationFilter(false);
    setLocationSearch('');
    if (locationId === 'all') return;
    const updated = [locationId, ...recentLocations.filter(c => c !== locationId)].slice(0, 3);
    setRecentLocations(updated);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const profile = await getProfile(user.id);
        const currentPreferences = profile?.preferences || {};
        await updateProfile(user.id, { preferences: { ...currentPreferences, recentLocations: updated } });
      } else {
        localStorage.setItem('eventz-recent-locations', JSON.stringify(updated));
      }
    } catch {
      // Error saving preferences
    }
  };

  // Filtering
  const filteredLiveStreams = liveStreams.filter(
    (stream) => 
      (selectedCategory === 'all' || stream.category === selectedCategory) &&
      (selectedLocation === 'all' || normalizePlaceName(stream.location) === normalizePlaceName(selectedLocation))
  );

  const liveEvents = filteredLiveStreams.filter((stream) =>
    ['entertainment', 'sports & fitness', 'business & tech', 'religion'].includes(
      String(stream.category || '').toLowerCase()
    ) || stream.isPaid
  );

  const creatorsLive = filteredLiveStreams.filter((stream) =>
    !(['entertainment', 'sports & fitness', 'business & tech', 'religion'].includes(
      String(stream.category || '').toLowerCase()
    ) || stream.isPaid)
  );

  const filteredUpcomingStreams = upcomingStreams.filter(
    (stream) => 
      (selectedCategory === 'all' || stream.category === selectedCategory) &&
      (selectedLocation === 'all' || normalizePlaceName(stream.location) === normalizePlaceName(selectedLocation))
  );

  const recentLocationOptions: LocationOption[] = recentLocations
    .filter((id) => id !== 'all')
    .map((id) => (locations.find((l) => l.id === id) as any) || ({ id, name: id, icon: MapPin } as LocationOption));

  const localMatches: LocationOption[] = locations
    .filter((location: any) => location.id !== 'all')
    .filter((location: any) => location.name.toLowerCase().includes(locationSearch.toLowerCase())) as any;

  const mergeUniqueById = (items: LocationOption[]) => {
    const seen = new Set<string>();
    return items.filter((item) => {
      const key = normalizePlaceName(item.id);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const displayedLocations: LocationOption[] =
    locationSearch.trim() === ''
      ? ([locations[0] as any, ...recentLocationOptions] as any)
      : ([locations[0] as any, ...mergeUniqueById([...localMatches, ...remoteLocationOptions])] as any);

  const handleStreamClick = async (stream: any) => {
    if (stream.isLive) {
      try {
        // Only the virtual access price gates a live stream — never fall back to the
        // in-person ticket price (price_range), or free streams attached to paid events
        // would be incorrectly gated.
        const priceString = stream?.streaming?.virtualPrice ?? '';
        const priceNumber = parseFloat(String(priceString).replace(/[^0-9.]/g, '')) || 0;
        if (priceNumber <= 0) { setSelectedStream(stream); return; }
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast.error('Please sign in to watch paid live streams');
          const fullEvent = await getEventById(stream.id);
          setSelectedEvent(fullEvent as unknown as ApiEvent);
          return;
        }
        const hasAccess = await hasActiveVirtualTicket(user.id, stream.id);
        if (hasAccess) { setSelectedStream(stream); return; }
        toast.error('Virtual Access required to watch this live stream');
        const fullEvent = await getEventById(stream.id);
        handlePurchaseTicket(fullEvent as unknown as ApiEvent);
      } catch {
        toast.error('Unable to open stream');
      }
    } else {
      setSelectedEvent(stream as unknown as ApiEvent);
    }
  };

  const handleToggleReminder = (streamId: number) => {
    const newReminders = new Set(reminders);
    if (newReminders.has(streamId)) {
      newReminders.delete(streamId);
      toast.success('Reminder removed');
    } else {
      newReminders.add(streamId);
      const stream = upcomingStreams.find(s => s.id === streamId);
      toast.success('Reminder set!', { description: `We'll notify you when ${stream?.title || 'the stream'} starts.` });
    }
    setReminders(newReminders);
  };

  return (
    <div className="bg-gray-50 min-h-screen pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-gray-100 shadow-sm">
        <div className="max-w-4xl mx-auto px-5 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="relative">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                <div className="absolute inset-0 w-2 h-2 rounded-full bg-red-500 animate-ping opacity-75"></div>
              </div>
              <h1 className="text-gray-900 text-base font-bold tracking-tight">Live Now</h1>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowLocationFilter(true)}
                className="h-8 px-3 flex items-center gap-1.5 rounded-full bg-gray-50 hover:bg-gray-100 transition-all border border-gray-100"
              >
                {(() => {
                  const location =
                    locations.find((c) => c.id === selectedLocation) ||
                    (selectedLocation === 'all' ? locations[0] : { id: selectedLocation, name: selectedLocation, icon: MapPin } as any);
                  if (location?.icon) {
                    const Icon = location.icon;
                    return <Icon className="w-3.5 h-3.5 text-gray-700" />;
                  }
                  return <span className="text-sm">{location?.flag || '🇹🇿'}</span>;
                })()}
                <span className="text-xs font-medium text-gray-700 hidden sm:block">
                  {(locations.find((c) => c.id === selectedLocation) as any)?.name ||
                    (selectedLocation === 'all' ? 'All Cities' : selectedLocation)}
                </span>
              </button>
              <button 
                onClick={() => setShowFilters(true)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 hover:bg-gray-100 transition-all border border-gray-100"
              >
                <Filter className="w-3.5 h-3.5 text-gray-700" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-5 py-6 space-y-8">
        {isLoading ? (
          <LiveFeedSkeleton />
        ) : (
          <>
            {/* Live Events */}
            <div>
              <StreamSectionHeader
                icon={<Video className="w-5 h-5 text-gray-900" />}
                title="Live Events"
                subtitle="Featured Broadcasts"
              />
              {liveEvents.length > 0 ? (
                <div className="flex overflow-x-auto gap-3 pb-4 -mx-5 px-5 scrollbar-hide snap-x">
                  {liveEvents.map((stream) => (
                    <LiveStreamCard key={`featured-${stream.id}`} stream={stream} variant="featured" onClick={handleStreamClick} />
                  ))}
                </div>
              ) : (
                <div className="py-10 bg-white rounded-xl border border-gray-100 border-dashed">
                  <p className="text-gray-500 text-sm text-center">No live events at the moment</p>
                </div>
              )}
            </div>

            {/* Creators Live */}
            <div>
              <StreamSectionHeader
                icon={<Smartphone className="w-5 h-5 text-gray-900" />}
                title="Creators Live"
                subtitle="Stream Community"
              />
              {creatorsLive.length > 0 ? (
                <div className="flex overflow-x-auto gap-3 pb-4 -mx-5 px-5 scrollbar-hide snap-x">
                  {creatorsLive.map((stream) => (
                    <LiveStreamCard key={`creator-${stream.id}`} stream={stream} variant="creator" onClick={handleStreamClick} />
                  ))}
                </div>
              ) : (
                <div className="py-8 bg-white rounded-xl border border-gray-100 border-dashed">
                  <p className="text-gray-500 text-sm text-center">No creators live right now</p>
                </div>
              )}
            </div>

            {/* Starting Soon */}
            <div className="pt-2">
              <StreamSectionHeader
                icon={<Clock className="w-5 h-5 text-gray-900" />}
                title="Starting Soon"
                subtitle="Scheduled Streams"
              />
              {filteredUpcomingStreams.length > 0 ? (
                <div className="space-y-2">
                  {filteredUpcomingStreams.map((stream) => (
                    <UpcomingStreamCard
                      key={stream.id}
                      stream={stream}
                      isReminderSet={reminders.has(stream.id)}
                      onToggleReminder={handleToggleReminder}
                      onClick={handleStreamClick}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-white rounded-xl border border-gray-100 border-dashed">
                  <p className="text-gray-500 text-sm">No upcoming streams scheduled</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Filter Modals */}
      <LiveFilterModals
        showFilters={showFilters}
        showLocationFilter={showLocationFilter}
        selectedCategory={selectedCategory}
        selectedLocation={selectedLocation}
        locationSearch={locationSearch}
        categories={liveCategories}
        displayedLocations={displayedLocations}
        onCategorySelect={(id) => { setSelectedCategory(id); setShowFilters(false); }}
        onLocationSelect={handleLocationSelect}
        onLocationSearchChange={setLocationSearch}
        onCloseFilters={() => setShowFilters(false)}
        onCloseLocation={() => setShowLocationFilter(false)}
      />

      {/* Modals */}
      {selectedStream && (
        <LiveStreamViewer stream={selectedStream} onClose={() => setSelectedStream(null)} />
      )}
      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onPurchaseTicket={handlePurchaseTicket}
          onPurchaseNormalTicket={() => {}}
        />
      )}
      {showTicketModal && eventToPurchase && (
        <VirtualTicketPurchaseModal
          isOpen={showTicketModal}
          onClose={() => setShowTicketModal(false)}
          event={eventToPurchase}
        />
      )}
    </div>
  );
}
