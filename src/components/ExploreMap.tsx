import { useState, useEffect } from 'react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Search, Loader2 } from 'lucide-react';
import { getEvents } from '../utils/supabase/api';
import { toast } from 'sonner';

interface TrendingEvent {
  id: number;
  title: string;
  category: string;
  categoryLabel: string;
  image: string;
  time: string;
  location: string;
  hasJoinButton?: boolean;
}

interface WeekendEvent {
  id: number;
  title: string;
  category: string;
  image: string;
  gradient: string;
}

const categories = ['All', 'Entertainment', 'Education', 'Culture', 'Religion', 'Business & Tech', 'Sports & Fitness'];

export function ExploreMap() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [trendingEvents, setTrendingEvents] = useState<TrendingEvent[]>([]);
  const [weekendEvents, setWeekendEvents] = useState<WeekendEvent[]>([]);
  const [recommendedEvents, setRecommendedEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadEvents = async () => {
      setIsLoading(true);
      try {
        const events = await getEvents();
        if (events && events.length > 0) {
          // Filter by category if selected
          let filteredEvents = events;
          if (selectedCategory !== 'All') {
            filteredEvents = events.filter((e: any) => 
              e.category.toLowerCase() === selectedCategory.toLowerCase()
            );
          }

          // Map to Trending Format (take first 4)
          setTrendingEvents(filteredEvents.slice(0, 4).map((e: any) => ({
            id: e.id,
            title: e.title,
            category: e.category,
            categoryLabel: e.category.toUpperCase(),
            image: e.image_url || 'https://via.placeholder.com/200',
            time: `${new Date(e.date).toLocaleDateString(undefined, { weekday: 'short' })} · ${e.time}`,
            location: e.location,
            hasJoinButton: false
          })));

          // Map to Weekend Format (take next 3)
          setWeekendEvents(filteredEvents.slice(4, 7).map((e: any, index: number) => ({
            id: e.id,
            title: e.title,
            category: e.category,
            image: e.image_url || 'https://via.placeholder.com/800',
            gradient: index % 2 === 0 ? 'from-purple-500 to-pink-500' : 'from-blue-500 to-cyan-500'
          })));

          // Recommended (take next 2)
          setRecommendedEvents(filteredEvents.slice(7, 9).map((e: any) => ({
             id: e.id,
             title: e.title,
             category: e.category,
             image: e.image_url || 'https://via.placeholder.com/300',
             time: `${new Date(e.date).toLocaleDateString(undefined, { weekday: 'long' })} · ${e.time}`,
          })));
        } else {
            setTrendingEvents([]);
            setWeekendEvents([]);
            setRecommendedEvents([]);
        }
      } catch (error) {
        console.error('Error loading events:', error);
        toast.error('Failed to load events');
      } finally {
        setIsLoading(false);
      }
    };

    loadEvents();
  }, [selectedCategory]);

  const getCategoryBadgeColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'cultural':
        return 'bg-purple-100 text-purple-700';
      case 'startup':
        return 'bg-cyan-100 text-cyan-700';
      case 'religious':
        return 'bg-pink-100 text-pink-700';
      case 'house party':
        return 'bg-indigo-100 text-indigo-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  if (isLoading) {
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
            <p className="text-gray-700">Hello George 👋</p>
          </div>
          <button className="p-3 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 transition-colors">
            <Search className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Trending Now Section */}
        <div className="mb-8">
          <h2 className="text-gray-900 mb-4">Trending Now</h2>
          
          {/* Category Filters */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
            {categories.map((category) => (
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

          {/* Trending Events List */}
          <div className="space-y-4">
            {trendingEvents.map((event) => (
              <div
                key={event.id}
                className="bg-white rounded-xl p-4 border border-gray-200 hover:shadow-lg transition-all cursor-pointer group"
              >
                <div className="flex items-start gap-4">
                  {/* Event Image */}
                  <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-purple-100 group-hover:ring-purple-300 transition-all">
                    <ImageWithFallback
                      src={event.image}
                      alt={event.title}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Event Details */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-gray-900 mb-1 group-hover:text-purple-600 transition-colors">
                      {event.title}
                    </h3>
                    <span className={`inline-block px-2 py-1 rounded text-xs mb-2 ${getCategoryBadgeColor(event.category)}`}>
                      {event.categoryLabel}
                    </span>
                    <p className="text-gray-600 text-sm">
                      {event.time} · {event.location}
                    </p>
                  </div>

                  {/* Join Button (if applicable) */}
                  {event.hasJoinButton && (
                    <button className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex-shrink-0">
                      Join
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* This Weekend Section */}
        <div className="mb-8">
          <h2 className="text-gray-900 mb-4">This Weekend</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {weekendEvents.map((event) => (
              <div
                key={event.id}
                className="relative h-48 rounded-xl overflow-hidden cursor-pointer group"
              >
                {/* Background Image */}
                <ImageWithFallback
                  src={event.image}
                  alt={event.title}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
                
                {/* Gradient Overlay */}
                <div className={`absolute inset-0 bg-gradient-to-br ${event.gradient} opacity-70 group-hover:opacity-60 transition-opacity`}></div>
                
                {/* Content */}
                <div className="absolute inset-0 p-6 flex flex-col justify-end">
                  <h3 className="text-white mb-1">
                    {event.title}
                  </h3>
                  <p className="text-white/90 text-sm">{event.category}</p>
                </div>

                {/* Border Effect */}
                <div className="absolute inset-0 border-2 border-white/20 rounded-xl group-hover:border-white/40 transition-colors"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Recommended Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-gray-900">Recommended For You</h2>
            <button className="text-purple-600 hover:text-purple-700">See All</button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {recommendedEvents.map((event) => (
              <div 
                key={event.id}
                className="bg-white rounded-xl p-4 border border-gray-200 hover:shadow-lg transition-all cursor-pointer"
              >
                <div className="w-full h-32 rounded-lg overflow-hidden mb-3">
                   <ImageWithFallback
                      src={event.image}
                      alt={event.title}
                      className="w-full h-full object-cover"
                    />
                </div>
                <h3 className="text-gray-900 mb-1 line-clamp-1">{event.title}</h3>
                <p className="text-gray-600 text-sm">{event.time}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}