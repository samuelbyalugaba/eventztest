import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Filter, MapPin, Video, Smartphone, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from './ui/skeleton';
import { normalizePlaceName } from '../utils/nominatim';
import { locations, liveCategories, type LocationOption } from '../utils/locations';
import { LiveStreamCard, StreamSectionHeader } from './live/LiveStreamCard';
import { UpcomingStreamCard } from './live/UpcomingStreamCard';
import { LiveFilterModals } from './live/LiveFilterModals';
import { useLiveFeedData, type LiveStream } from '../hooks/useLiveFeedData';
import { useLocationPrefs } from '../hooks/useLocationPrefs';

const FEATURED_CATEGORIES = new Set([
  'entertainment',
  'sports & fitness',
  'business & tech',
  'religion',
]);

function LiveFeedSkeleton() {
  return (
    <div className="max-w-4xl mx-auto px-5 py-6 space-y-8 animate-pulse">
      {[1, 2, 3].map((section) => (
        <div key={section}>
          <div className="flex items-center gap-2.5 mb-5 px-1">
            <Skeleton className="w-5 h-5 rounded-md" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
          {section === 3 ? (
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
          ) : (
            <div className="flex overflow-x-auto gap-3 pb-4 -mx-5 px-5 scrollbar-hide">
              {(section === 1 ? [1, 2] : [1, 2, 3]).map((i) => (
                <Skeleton
                  key={i}
                  className={
                    section === 1
                      ? 'flex-shrink-0 w-[75vw] sm:w-[320px] aspect-video rounded-2xl'
                      : 'flex-shrink-0 w-[42vw] sm:w-[180px] aspect-[3/4] rounded-2xl'
                  }
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function LiveFeed() {
  const navigate = useNavigate();
  const { liveStreams, upcomingStreams, isLoading } = useLiveFeedData();

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showLocationFilter, setShowLocationFilter] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');
  const [reminders, setReminders] = useState<Set<number>>(new Set());

  const {
    recentLocationOptions,
    remoteLocationOptions,
    persistRecents,
    recentLocations,
  } = useLocationPrefs(locationSearch);

  const handleLocationSelect = async (locationId: string) => {
    setSelectedLocation(locationId);
    setShowLocationFilter(false);
    setLocationSearch('');
    if (locationId === 'all') return;
    const updated = [locationId, ...recentLocations.filter((c) => c !== locationId)].slice(0, 3);
    persistRecents(updated);
  };

  // ---------- Single-pass filtering + bucketing ----------
  const { liveEvents, creatorsLive, filteredUpcomingStreams } = useMemo(() => {
    const normalizedLoc = normalizePlaceName(selectedLocation);
    const matches = (s: LiveStream) =>
      (selectedCategory === 'all' || s.category === selectedCategory) &&
      (selectedLocation === 'all' || normalizePlaceName(s.location) === normalizedLoc);

    const liveEvents: LiveStream[] = [];
    const creatorsLive: LiveStream[] = [];
    for (const stream of liveStreams) {
      if (!matches(stream)) continue;
      const cat = String(stream.category || '').toLowerCase();
      if (FEATURED_CATEGORIES.has(cat) || stream.isPaid) liveEvents.push(stream);
      else creatorsLive.push(stream);
    }

    const filteredUpcomingStreams = upcomingStreams.filter(matches);
    return { liveEvents, creatorsLive, filteredUpcomingStreams };
  }, [liveStreams, upcomingStreams, selectedCategory, selectedLocation]);

  // ---------- Location list (memoized) ----------
  const displayedLocations: LocationOption[] = useMemo(() => {
    const mergeUniqueById = (items: LocationOption[]) => {
      const seen = new Set<string>();
      return items.filter((item) => {
        const key = normalizePlaceName(item.id);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    };

    if (locationSearch.trim() === '') {
      return [locations[0] as any, ...recentLocationOptions] as any;
    }
    const localMatches: LocationOption[] = locations
      .filter((location: any) => location.id !== 'all')
      .filter((location: any) =>
        location.name.toLowerCase().includes(locationSearch.toLowerCase()),
      ) as any;
    return [
      locations[0] as any,
      ...mergeUniqueById([...localMatches, ...remoteLocationOptions]),
    ] as any;
  }, [locationSearch, recentLocationOptions, remoteLocationOptions]);

  const handleStreamClick = (stream: any) => {
    navigate(`/live/${stream.id}`);
  };

  const handleToggleReminder = (streamId: number) => {
    setReminders((prev) => {
      const next = new Set(prev);
      if (next.has(streamId)) {
        next.delete(streamId);
        toast.success('Reminder removed');
      } else {
        next.add(streamId);
        const stream = upcomingStreams.find((s) => s.id === streamId);
        toast.success('Reminder set!', {
          description: `We'll notify you when ${stream?.title || 'the stream'} starts.`,
        });
      }
      return next;
    });
  };

  const selectedLocationView = useMemo(() => {
    return (
      locations.find((c) => c.id === selectedLocation) ||
      (selectedLocation === 'all'
        ? locations[0]
        : ({ id: selectedLocation, name: selectedLocation, icon: MapPin } as any))
    );
  }, [selectedLocation]);

  return (
    <div className="bg-gray-50 min-h-screen pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-gray-100 pt-[var(--eventz-safe-area-top)] shadow-sm">
        <div className="max-w-4xl mx-auto px-5 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="relative">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                <div className="absolute inset-0 w-2 h-2 rounded-full bg-red-500 animate-ping opacity-75"></div>
              </div>
              <h1 className="text-gray-900 text-lg font-bold tracking-tight">Live Now</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowLocationFilter(true)}
                className="h-8 px-3 flex items-center gap-1.5 rounded-full bg-gray-50 hover:bg-gray-100 transition-all border border-gray-100"
              >
                {selectedLocationView?.icon ? (
                  (() => {
                    const Icon = selectedLocationView.icon;
                    return <Icon className="w-3.5 h-3.5 text-gray-700" />;
                  })()
                ) : (
                  <MapPin className="w-3.5 h-3.5 text-gray-700" />
                )}
                <span className="text-xs font-medium text-gray-700 hidden sm:block">
                  {(selectedLocationView as any)?.name ||
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
            <div>
              <StreamSectionHeader
                icon={<Video className="w-5 h-5 text-gray-900" />}
                title="Live Events"
                subtitle="Featured Broadcasts"
              />
              {liveEvents.length > 0 ? (
                <div className="flex overflow-x-auto gap-3 pb-4 -mx-5 px-5 scrollbar-hide snap-x">
                  {liveEvents.map((stream) => (
                    <LiveStreamCard
                      key={`featured-${stream.id}`}
                      stream={stream}
                      variant="featured"
                      onClick={handleStreamClick}
                    />
                  ))}
                </div>
              ) : (
                <div className="py-10 bg-white rounded-xl border border-gray-100 border-dashed">
                  <p className="text-gray-500 text-sm text-center">No live events at the moment</p>
                </div>
              )}
            </div>

            <div>
              <StreamSectionHeader
                icon={<Smartphone className="w-5 h-5 text-gray-900" />}
                title="Creators Live"
                subtitle="Stream Community"
              />
              {creatorsLive.length > 0 ? (
                <div className="flex overflow-x-auto gap-3 pb-4 -mx-5 px-5 scrollbar-hide snap-x">
                  {creatorsLive.map((stream) => (
                    <LiveStreamCard
                      key={`creator-${stream.id}`}
                      stream={stream}
                      variant="creator"
                      onClick={handleStreamClick}
                    />
                  ))}
                </div>
              ) : (
                <div className="py-8 bg-white rounded-xl border border-gray-100 border-dashed">
                  <p className="text-gray-500 text-sm text-center">No creators live right now</p>
                </div>
              )}
            </div>

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

      <LiveFilterModals
        showFilters={showFilters}
        showLocationFilter={showLocationFilter}
        selectedCategory={selectedCategory}
        selectedLocation={selectedLocation}
        locationSearch={locationSearch}
        categories={liveCategories}
        displayedLocations={displayedLocations}
        onCategorySelect={(id) => {
          setSelectedCategory(id);
          setShowFilters(false);
        }}
        onLocationSelect={handleLocationSelect}
        onLocationSearchChange={setLocationSearch}
        onCloseFilters={() => setShowFilters(false)}
        onCloseLocation={() => setShowLocationFilter(false)}
      />


    </div>
  );
}
