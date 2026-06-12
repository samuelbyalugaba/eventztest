import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Filter, Video, Smartphone, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { normalizePlaceName } from '../utils/nominatim';
import { locations, liveCategories, type LocationOption } from '../utils/locations';
import { LiveStreamCard, StreamSectionHeader } from './live/LiveStreamCard';
import { UpcomingStreamCard } from './live/UpcomingStreamCard';
import { LiveFilterModals } from './live/LiveFilterModals';
import { useLiveFeedData, type LiveStream } from '../hooks/useLiveFeedData';
import { useLocationPrefs } from '../hooks/useLocationPrefs';
import { LiveFeedContentSkeleton } from './skeletons/PageSkeletons';

const FEATURED_CATEGORIES = new Set([
  'entertainment',
  'sports & fitness',
  'business & tech',
  'religion',
]);

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

  const hasActiveFilters = selectedCategory !== 'all' || selectedLocation !== 'all';
  const activeFiltersCount = (selectedCategory !== 'all' ? 1 : 0) + (selectedLocation !== 'all' ? 1 : 0);

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
                onClick={() => setShowFilters(true)}
                className="icon-circle-button relative rounded-full border border-gray-100 bg-white shadow-sm transition-all hover:bg-gray-50 group"
                aria-label="Filter live streams"
              >
                <Filter className="h-4 w-4 shrink-0 text-gray-600 transition-colors group-hover:text-[#8A2BE2]" />
                {hasActiveFilters && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#8A2BE2] text-[10px] text-white shadow-md">
                    {activeFiltersCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-5 py-6 space-y-8">
        {isLoading ? (
          <LiveFeedContentSkeleton />
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
        onCategorySelect={setSelectedCategory}
        onLocationSelect={handleLocationSelect}
        onLocationSearchChange={setLocationSearch}
        onCloseFilters={() => setShowFilters(false)}
        onCloseLocation={() => setShowLocationFilter(false)}
      />


    </div>
  );
}
