import { useEffect, useMemo, useState, useSyncExternalStore, memo } from 'react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Search, Loader2 } from 'lucide-react';
import { getEvents } from '../utils/supabase/api';
import { eventsStore } from '../store/eventStore';
import { toast } from 'sonner';

const CATEGORIES = ['All', 'Entertainment', 'Education', 'Culture', 'Religion', 'Business & Tech', 'Sports & Fitness'] as const;

const WEEKEND_GRADIENTS = [
  'from-purple-500 to-pink-500',
  'from-blue-500 to-cyan-500',
  'from-purple-500 to-pink-500',
] as const;

const CATEGORY_BADGE_COLORS: Record<string, string> = {
  cultural: 'bg-purple-100 text-purple-700',
  startup: 'bg-cyan-100 text-cyan-700',
  religious: 'bg-pink-100 text-pink-700',
  'house party': 'bg-indigo-100 text-indigo-700',
};

const getCategoryBadgeColor = (category: string) =>
  CATEGORY_BADGE_COLORS[(category || '').toLowerCase()] ?? 'bg-gray-100 text-gray-700';

// ---------- Subscribe to shared event store (avoids duplicate fetches across pages)
function useEvents() {
  return useSyncExternalStore(
    eventsStore.subscribe,
    eventsStore.getEvents,
    eventsStore.getEvents,
  );
}

// ---------- Memoized card components (prevent re-renders on category change)
const TrendingCard = memo(function TrendingCard({ event }: { event: any }) {
  return (
    <div className="bg-white rounded-xl p-4 border border-gray-200 hover:shadow-lg transition-all cursor-pointer group">
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-purple-100 group-hover:ring-purple-300 transition-all">
          <ImageWithFallback src={event.image} alt={event.title} className="w-full h-full object-cover" width={120} height={120} quality={75} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-gray-900 mb-1 group-hover:text-purple-600 transition-colors">{event.title}</h3>
          <span className={`inline-block px-2 py-1 rounded text-xs mb-2 ${getCategoryBadgeColor(event.category)}`}>
            {event.categoryLabel}
          </span>
          <p className="text-gray-600 text-sm">{event.time} · {event.location}</p>
        </div>
      </div>
    </div>
  );
});

const WeekendCard = memo(function WeekendCard({ event }: { event: any }) {
  return (
    <div className="relative h-48 rounded-xl overflow-hidden cursor-pointer group">
      <ImageWithFallback
        src={event.image}
        alt={event.title}
        className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
        width={500}
        height={300}
        quality={75}
        resize="cover"
      />
      <div className={`absolute inset-0 bg-gradient-to-br ${event.gradient} opacity-70 group-hover:opacity-60 transition-opacity`} />
      <div className="absolute inset-0 p-6 flex flex-col justify-end">
        <h3 className="text-white mb-1">{event.title}</h3>
        <p className="text-white/90 text-sm">{event.category}</p>
      </div>
      <div className="absolute inset-0 border-2 border-white/20 rounded-xl group-hover:border-white/40 transition-colors" />
    </div>
  );
});

const RecommendedCard = memo(function RecommendedCard({ event }: { event: any }) {
  return (
    <div className="bg-white rounded-xl p-4 border border-gray-200 hover:shadow-lg transition-all cursor-pointer">
      <div className="w-full h-32 rounded-lg overflow-hidden mb-3">
        <ImageWithFallback src={event.image} alt={event.title} className="w-full h-full object-cover" width={400} height={200} quality={75} resize="cover" />
      </div>
      <h3 className="text-gray-900 mb-1 line-clamp-1">{event.title}</h3>
      <p className="text-gray-600 text-sm">{event.time}</p>
    </div>
  );
});

export function ExploreMap() {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const events = useEvents();
  const [isLoading, setIsLoading] = useState(events.length === 0);

  // Single fetch; reuses shared cache; refreshes when stale
  useEffect(() => {
    let cancelled = false;
    const needsFetch = eventsStore.shouldFetch();
    if (!needsFetch) {
      setIsLoading(false);
      return;
    }
    setIsLoading(events.length === 0);
    getEvents()
      .then((fresh) => {
        if (cancelled) return;
        if (fresh) eventsStore.setEvents(fresh);
      })
      .catch(() => {
        if (!cancelled) toast.error('Failed to load events');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  // Single-pass derivation: filter once, then slice into the three sections
  const { trending, weekend, recommended } = useMemo(() => {
    const filtered = selectedCategory === 'All'
      ? events
      : events.filter((e: any) => String(e.category || '').toLowerCase() === selectedCategory.toLowerCase());

    const trending = filtered.slice(0, 4).map((e: any) => ({
      id: e.id,
      title: e.title,
      category: String(e.category || ''),
      categoryLabel: String(e.category || '').toUpperCase(),
      image: e.image_url,
      time: `${new Date(e.date).toLocaleDateString(undefined, { weekday: 'short' })} · ${e.time}`,
      location: e.location,
    }));

    const weekend = filtered.slice(4, 7).map((e: any, index: number) => ({
      id: e.id,
      title: e.title,
      category: String(e.category || ''),
      image: e.image_url,
      gradient: WEEKEND_GRADIENTS[index % WEEKEND_GRADIENTS.length],
    }));

    const recommended = filtered.slice(7, 9).map((e: any) => ({
      id: e.id,
      title: e.title,
      category: String(e.category || ''),
      image: e.image_url,
      time: `${new Date(e.date).toLocaleDateString(undefined, { weekday: 'long' })} · ${e.time}`,
    }));

    return { trending, weekend, recommended };
  }, [events, selectedCategory]);

  if (isLoading && events.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-gray-900 mb-1">EVENTZ</h1>
            <p className="text-gray-700">Hello George</p>
          </div>
          <button className="p-3 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 transition-colors">
            <Search className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Trending Now */}
        <div className="mb-8">
          <h2 className="text-gray-900 mb-4">Trending Now</h2>
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
            {CATEGORIES.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-lg whitespace-nowrap transition-all ${
                  selectedCategory === category
                    ? 'bg-purple-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {trending.map((event) => <TrendingCard key={event.id} event={event} />)}
          </div>
        </div>

        {/* This Weekend */}
        <div className="mb-8">
          <h2 className="text-gray-900 mb-4">This Weekend</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {weekend.map((event) => <WeekendCard key={event.id} event={event} />)}
          </div>
        </div>

        {/* Recommended */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-gray-900">Recommended For You</h2>
            <button className="text-purple-600 hover:text-purple-700">See All</button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {recommended.map((event) => <RecommendedCard key={event.id} event={event} />)}
          </div>
        </div>
      </div>
    </div>
  );
}
