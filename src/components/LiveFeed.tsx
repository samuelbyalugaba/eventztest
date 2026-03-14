import { useState, useEffect } from 'react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Filter, MapPin, Search, X, Globe, Eye, Bell, Smartphone, Clock, Video } from 'lucide-react';
import { LiveStreamViewer } from './LiveStreamViewer';
import { VirtualTicketPurchaseModal } from './VirtualTicketPurchaseModal';
import { EventDetailModal } from './EventDetailModal';
import { toast } from 'sonner';
import { getEventById, getLiveStreams, getUpcomingStreams, getProfile, hasActiveVirtualTicket, subscribeToEventStreaming, updateProfile, type Event as ApiEvent } from '../utils/supabase/api';
import { supabase } from '../utils/supabase/client';
import { Skeleton } from './ui/skeleton';

function LiveFeedSkeleton() {
  return (
    <div className="max-w-4xl mx-auto px-5 py-6 space-y-8 animate-pulse">
      {/* Featured Live Events Skeleton */}
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

      {/* Creators Live Skeleton */}
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

      {/* Starting Soon Skeleton */}
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
  countdown?: number; // minutes until start
  host: string;
  organizer_id: string; // Add organizer_id
  quality: 'HD' | '4K' | 'SD';
  isPaid?: boolean;
  price?: number;
  location: string;
  country: string;
  countryFlag: string;
  playback_url?: string;
}

const categories = [
  { id: 'all', name: 'All' },
  { id: 'entertainment', name: 'Entertainment' },
  { id: 'education', name: 'Education' },
  { id: 'culture', name: 'Culture' },
  { id: 'religion', name: 'Religion' },
  { id: 'business & tech', name: 'Business' },
  { id: 'sports & fitness', name: 'Sports' },
];

const locations = [
  { id: 'all', name: 'All Cities', icon: Globe },
  { id: 'Dar es Salaam', name: 'Dar es Salaam', flag: '🇹🇿' },
  { id: 'Nairobi', name: 'Nairobi', flag: '🇰🇪' },
  { id: 'New York', name: 'New York', flag: '🇺🇸' },
  { id: 'London', name: 'London', flag: '🇬🇧' },
  { id: 'Toronto', name: 'Toronto', flag: '🇨🇦' },
  { id: 'Sydney', name: 'Sydney', flag: '🇦🇺' },
  { id: 'Berlin', name: 'Berlin', flag: '🇩🇪' },
  { id: 'Paris', name: 'Paris', flag: '🇫🇷' },
  { id: 'Rome', name: 'Rome', flag: '🇮🇹' },
  { id: 'Madrid', name: 'Madrid', flag: '🇪🇸' },
  { id: 'Amsterdam', name: 'Amsterdam', flag: '🇳🇱' },
  { id: 'Brussels', name: 'Brussels', flag: '🇧🇪' },
  { id: 'Zurich', name: 'Zurich', flag: '🇨🇭' },
  { id: 'Vienna', name: 'Vienna', flag: '🇦🇹' },
  { id: 'Stockholm', name: 'Stockholm', flag: '🇸🇪' },
  { id: 'Oslo', name: 'Oslo', flag: '🇳🇴' },
  { id: 'Copenhagen', name: 'Copenhagen', flag: '🇩🇰' },
  { id: 'Helsinki', name: 'Helsinki', flag: '🇫🇮' },
  { id: 'Warsaw', name: 'Warsaw', flag: '🇵🇱' },
  { id: 'Lisbon', name: 'Lisbon', flag: '🇵🇹' },
  { id: 'Athens', name: 'Athens', flag: '🇬🇷' },
  { id: 'Prague', name: 'Prague', flag: '🇨🇿' },
  { id: 'Dublin', name: 'Dublin', flag: '🇮🇪' },
  { id: 'Tokyo', name: 'Tokyo', flag: '🇯🇵' },
  { id: 'Seoul', name: 'Seoul', flag: '🇰🇷' },
  { id: 'Beijing', name: 'Beijing', flag: '🇨🇳' },
  { id: 'Mumbai', name: 'Mumbai', flag: '🇮🇳' },
  { id: 'Singapore', name: 'Singapore', flag: '🇸🇬' },
  { id: 'Bangkok', name: 'Bangkok', flag: '🇹🇭' },
  { id: 'Kuala Lumpur', name: 'Kuala Lumpur', flag: '🇲🇾' },
  { id: 'Jakarta', name: 'Jakarta', flag: '🇮🇩' },
  { id: 'Manila', name: 'Manila', flag: '🇵🇭' },
  { id: 'Hanoi', name: 'Hanoi', flag: '🇻🇳' },
  { id: 'Dubai', name: 'Dubai', flag: '🇦🇪' },
  { id: 'Riyadh', name: 'Riyadh', flag: '🇸🇦' },
  { id: 'Doha', name: 'Doha', flag: '🇶🇦' },
  { id: 'Jerusalem', name: 'Jerusalem', flag: '🇮🇱' },
  { id: 'Istanbul', name: 'Istanbul', flag: '🇹🇷' },
  { id: 'Rio de Janeiro', name: 'Rio de Janeiro', flag: '🇧🇷' },
  { id: 'Buenos Aires', name: 'Buenos Aires', flag: '🇦🇷' },
  { id: 'Mexico City', name: 'Mexico City', flag: '🇲🇽' },
  { id: 'Bogota', name: 'Bogota', flag: '🇨🇴' },
  { id: 'Santiago', name: 'Santiago', flag: '🇨🇱' },
  { id: 'Lima', name: 'Lima', flag: '🇵🇪' },
  { id: 'Cape Town', name: 'Cape Town', flag: '🇿🇦' },
  { id: 'Lagos', name: 'Lagos', flag: '🇳🇬' },
  { id: 'Cairo', name: 'Cairo', flag: '🇪🇬' },
  { id: 'Casablanca', name: 'Casablanca', flag: '🇲🇦' },
  { id: 'Accra', name: 'Accra', flag: '🇬🇭' },
  { id: 'Addis Ababa', name: 'Addis Ababa', flag: '🇪🇹' },
  { id: 'Kampala', name: 'Kampala', flag: '🇺🇬' },
  { id: 'Kigali', name: 'Kigali', flag: '🇷🇼' },
  { id: 'Lusaka', name: 'Lusaka', flag: '🇿🇲' },
  { id: 'Harare', name: 'Harare', flag: '🇿🇼' },
  { id: 'Gaborone', name: 'Gaborone', flag: '🇧🇼' },
  { id: 'Windhoek', name: 'Windhoek', flag: '🇳🇦' },
  { id: 'Maputo', name: 'Maputo', flag: '🇲🇿' },
  { id: 'Luanda', name: 'Luanda', flag: '🇦🇴' },
  { id: 'Dakar', name: 'Dakar', flag: '🇸🇳' },
  { id: 'Abidjan', name: 'Abidjan', flag: '🇨🇮' },
  { id: 'Yaounde', name: 'Yaounde', flag: '🇨🇲' },
  { id: 'Algiers', name: 'Algiers', flag: '🇩🇿' },
  { id: 'Tunis', name: 'Tunis', flag: '🇹🇳' },
  { id: 'Tripoli', name: 'Tripoli', flag: '🇱🇾' },
  { id: 'Khartoum', name: 'Khartoum', flag: '🇸🇩' },
  { id: 'Wellington', name: 'Wellington', flag: '🇳🇿' },
  { id: 'Moscow', name: 'Moscow', flag: '🇷🇺' },
  { id: 'Kyiv', name: 'Kyiv', flag: '🇺🇦' },
  { id: 'Budapest', name: 'Budapest', flag: '🇭🇺' },
  { id: 'Bucharest', name: 'Bucharest', flag: '🇷🇴' },
  { id: 'Sofia', name: 'Sofia', flag: '🇧🇬' },
  { id: 'Zagreb', name: 'Zagreb', flag: '🇭🇷' },
  { id: 'Belgrade', name: 'Belgrade', flag: '🇷🇸' },
  { id: 'Ljubljana', name: 'Ljubljana', flag: '🇸🇮' },
  { id: 'Bratislava', name: 'Bratislava', flag: '🇸🇰' },
  { id: 'Vilnius', name: 'Vilnius', flag: '🇱🇹' },
  { id: 'Riga', name: 'Riga', flag: '🇱🇻' },
  { id: 'Tallinn', name: 'Tallinn', flag: '🇪🇪' },
  { id: 'Reykjavik', name: 'Reykjavik', flag: '🇮🇸' },
  { id: 'Luxembourg', name: 'Luxembourg', flag: '🇱🇺' },
  { id: 'Valletta', name: 'Valletta', flag: '🇲🇹' },
  { id: 'Nicosia', name: 'Nicosia', flag: '🇨🇾' },
  { id: 'Islamabad', name: 'Islamabad', flag: '🇵🇰' },
  { id: 'Dhaka', name: 'Dhaka', flag: '🇧🇩' },
  { id: 'Colombo', name: 'Colombo', flag: '🇱🇰' },
  { id: 'Kathmandu', name: 'Kathmandu', flag: '🇳🇵' },
  { id: 'Naypyidaw', name: 'Naypyidaw', flag: '🇲🇲' },
  { id: 'Phnom Penh', name: 'Phnom Penh', flag: '🇰🇭' },
  { id: 'Vientiane', name: 'Vientiane', flag: '🇱🇦' },
  { id: 'Ulaanbaatar', name: 'Ulaanbaatar', flag: '🇲🇳' },
  { id: 'Nur-Sultan', name: 'Nur-Sultan', flag: '🇰🇿' },
  { id: 'Tashkent', name: 'Tashkent', flag: '🇺🇿' },
  { id: 'Hong Kong', name: 'Hong Kong', flag: '🇭🇰' },
  { id: 'Taipei', name: 'Taipei', flag: '🇹🇼' },
  { id: 'Macau', name: 'Macau', flag: '🇲🇴' },
  { id: 'Beirut', name: 'Beirut', flag: '🇱🇧' },
  { id: 'Amman', name: 'Amman', flag: '🇯🇴' },
  { id: 'Kuwait City', name: 'Kuwait City', flag: '🇰🇼' },
  { id: 'Manama', name: 'Manama', flag: '🇧🇭' },
  { id: 'Muscat', name: 'Muscat', flag: '🇴🇲' },
  { id: "Sana'a", name: "Sana'a", flag: '🇾🇪' },
  { id: 'Baghdad', name: 'Baghdad', flag: '🇮🇶' },
  { id: 'Tehran', name: 'Tehran', flag: '🇮🇷' },
  { id: 'Kabul', name: 'Kabul', flag: '🇦🇫' },
  { id: 'Baku', name: 'Baku', flag: '🇦🇿' },
  { id: 'Tbilisi', name: 'Tbilisi', flag: '🇬🇪' },
  { id: 'Yerevan', name: 'Yerevan', flag: '🇦🇲' },
  { id: 'San Jose', name: 'San Jose', flag: '🇨🇷' },
  { id: 'Panama City', name: 'Panama City', flag: '🇵🇦' },
  { id: 'Quito', name: 'Quito', flag: '🇪🇨' },
  { id: 'La Paz', name: 'La Paz', flag: '🇧🇴' },
  { id: 'Asuncion', name: 'Asuncion', flag: '🇵🇾' },
  { id: 'Montevideo', name: 'Montevideo', flag: '🇺🇾' },
  { id: 'Caracas', name: 'Caracas', flag: '🇻🇪' },
  { id: 'Havana', name: 'Havana', flag: '🇨🇺' },
  { id: 'Santo Domingo', name: 'Santo Domingo', flag: '🇩🇴' },
  { id: 'Kingston', name: 'Kingston', flag: '🇯🇲' },
  { id: 'Port of Spain', name: 'Port of Spain', flag: '🇹🇹' },
  { id: 'Bridgetown', name: 'Bridgetown', flag: '🇧🇧' },
  { id: 'Nassau', name: 'Nassau', flag: '🇧' },
  { id: 'Suva', name: 'Suva', flag: '🇫🇯' },
  { id: 'Port Moresby', name: 'Port Moresby', flag: '🇵🇬' },
  { id: 'Male', name: 'Male', flag: '🇲🇻' },
  { id: 'Victoria', name: 'Victoria', flag: '🇸🇨' },
  { id: 'Port Louis', name: 'Port Louis', flag: '🇲🇺' },
  { id: 'Antananarivo', name: 'Antananarivo', flag: '🇲🇬' },
  { id: 'Bandar Seri Begawan', name: 'Bandar Seri Begawan', flag: '🇧🇳' },
  { id: 'Skopje', name: 'Skopje', flag: '🇲🇰' },
  { id: 'Sarajevo', name: 'Sarajevo', flag: '🇧🇦' },
  { id: 'Tirana', name: 'Tirana', flag: '🇦🇱' },
  { id: 'Podgorica', name: 'Podgorica', flag: '🇲🇪' },
  { id: 'Pristina', name: 'Pristina', flag: '🇽🇰' },
  { id: 'Chisinau', name: 'Chisinau', flag: '🇲🇩' },
  { id: 'Minsk', name: 'Minsk', flag: '🇧🇾' },
  { id: 'Guatemala City', name: 'Guatemala City', flag: '🇬🇹' },
  { id: 'Tegucigalpa', name: 'Tegucigalpa', flag: '🇭🇳' },
  { id: 'San Salvador', name: 'San Salvador', flag: '🇸🇻' },
  { id: 'Managua', name: 'Managua', flag: '🇳🇮' },
  { id: 'Belmopan', name: 'Belmopan', flag: '🇧🇿' },
  { id: 'Port-au-Prince', name: 'Port-au-Prince', flag: '🇭🇹' },
  { id: 'Georgetown', name: 'Georgetown', flag: '🇬🇾' },
  { id: 'Paramaribo', name: 'Paramaribo', flag: '🇸🇷' },
  { id: 'Cayenne', name: 'Cayenne', flag: '🇬🇫' },
  { id: 'Porto-Novo', name: 'Porto-Novo', flag: '🇧🇯' },
  { id: 'Ouagadougou', name: 'Ouagadougou', flag: '🇧🇫' },
  { id: 'Praia', name: 'Praia', flag: '🇨🇻' },
  { id: "N'Djamena", name: "N'Djamena", flag: '🇹🇩' },
  { id: 'Moroni', name: 'Moroni', flag: '🇰🇲' },
  { id: 'Brazzaville', name: 'Brazzaville', flag: '🇨🇬' },
  { id: 'Kinshasa', name: 'Kinshasa', flag: '🇨🇩' },
  { id: 'Djibouti', name: 'Djibouti', flag: '🇩' },
  { id: 'Malabo', name: 'Malabo', flag: '🇬🇶' },
  { id: 'Asmara', name: 'Asmara', flag: '🇪🇷' },
  { id: 'Libreville', name: 'Libreville', flag: '🇬🇦' },
  { id: 'Banjul', name: 'Banjul', flag: '🇬🇲' },
  { id: 'Conakry', name: 'Conakry', flag: '🇬🇳' },
  { id: 'Bissau', name: 'Bissau', flag: '🇬🇼' },
  { id: 'Maseru', name: 'Maseru', flag: '🇱🇸' },
  { id: 'Monrovia', name: 'Monrovia', flag: '🇱🇷' },
  { id: 'Lilongwe', name: 'Lilongwe', flag: '🇲🇼' },
  { id: 'Bamako', name: 'Bamako', flag: '🇲🇱' },
  { id: 'Nouakchott', name: 'Nouakchott', flag: '🇲🇷' },
  { id: 'Niamey', name: 'Niamey', flag: '🇳🇪' },
  { id: 'Saint-Denis', name: 'Saint-Denis', flag: '🇷🇪' },
  { id: 'Sao Tome', name: 'Sao Tome', flag: '🇸🇹' },
  { id: 'Freetown', name: 'Freetown', flag: '🇸🇱' },
  { id: 'Mogadishu', name: 'Mogadishu', flag: '🇸🇴' },
  { id: 'Juba', name: 'Juba', flag: '🇸🇸' },
  { id: 'Mbabane', name: 'Mbabane', flag: '🇸🇿' },
  { id: 'Lome', name: 'Lome', flag: '🇹🇬' },
  { id: 'Bujumbura', name: 'Bujumbura', flag: '🇧🇮' },
  { id: 'Bangui', name: 'Bangui', flag: '🇨🇫' },
];

export function LiveFeed() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showLocationFilter, setShowLocationFilter] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');
  const [selectedStream, setSelectedStream] = useState<LiveStream | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<ApiEvent | null>(null);
  const [recentLocations, setRecentLocations] = useState<string[]>(['Dar es Salaam', 'Dubai', 'New York']);
  const [liveStreams, setLiveStreams] = useState<LiveStream[]>([]);
  const [upcomingStreams, setUpcomingStreams] = useState<LiveStream[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [eventToPurchase, setEventToPurchase] = useState<ApiEvent | null>(null);
  const [reminders, setReminders] = useState<Set<number>>(new Set());

  const handlePurchaseTicket = (event: ApiEvent) => {
    setEventToPurchase(event);
    setShowTicketModal(true);
    if (selectedEvent) {
      setSelectedEvent(null);
    }
  };

  const fetchStreams = async () => {
    setIsLoading(true);
    try {
      const live = await getLiveStreams();
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
        setLiveStreams(mappedLive as unknown as LiveStream[]);
      }
      
      const upcoming = await getUpcomingStreams();
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
        setUpcomingStreams(mappedUpcoming as unknown as LiveStream[]);
      }
    } catch (error) {
      console.error('Error fetching streams:', error);
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

    return () => {
      channels.forEach((c) => c.unsubscribe());
    };
  }, [liveStreams.map((s) => s.id).join(',')]);

  useEffect(() => {
    fetchStreams();

    const channel = supabase
      .channel('live-feed-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events',
        },
        () => {
           fetchStreams();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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
            const locations = JSON.parse(localStored);
            setRecentLocations(locations);
            
            const currentPreferences = profile?.preferences || {};
            await updateProfile(user.id, {
              preferences: {
                ...currentPreferences,
                recentLocations: locations
              }
            });
            
            localStorage.removeItem('eventz-recent-locations');
          }
        } else {
          const stored = localStorage.getItem('eventz-recent-locations');
          if (stored) {
            setRecentLocations(JSON.parse(stored));
          }
        }
      } catch (error) {
        console.error('Error loading preferences:', error);
      }
    };

    loadPreferences();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadPreferences();
    });

    return () => {
      subscription.unsubscribe();
    };
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
        
        await updateProfile(user.id, { 
          preferences: { 
            ...currentPreferences,
            recentLocations: updated 
          } 
        });
      } else {
        localStorage.setItem('eventz-recent-locations', JSON.stringify(updated));
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
    }
  };

  const filteredLiveStreams = liveStreams.filter(
    (stream: LiveStream) => 
      (selectedCategory === 'all' || stream.category === selectedCategory) &&
      (selectedLocation === 'all' || stream.location === selectedLocation)
  );

  const liveEvents = filteredLiveStreams.filter(stream => 
    ['entertainment', 'sports & fitness', 'business & tech', 'religion'].includes(stream.category.toLowerCase()) || stream.isPaid
  );

  const creatorsLive = filteredLiveStreams.filter(stream => 
    !(['entertainment', 'sports & fitness', 'business & tech', 'religion'].includes(stream.category.toLowerCase()) || stream.isPaid)
  );

  const filteredUpcomingStreams = upcomingStreams.filter(
    (stream: LiveStream) => 
      (selectedCategory === 'all' || stream.category === selectedCategory) &&
      (selectedLocation === 'all' || stream.location === selectedLocation)
  );

  const filteredLocations = locations.filter(location =>
    location.name.toLowerCase().includes(locationSearch.toLowerCase())
  );

  const displayedLocations = locationSearch.trim() === '' 
    ? locations.filter(c => c.id === 'all' || recentLocations.includes(c.id))
    : filteredLocations;

  // Reminder toggling logic can be reintroduced when reminder UI is active

  const handleStreamClick = async (stream: LiveStream) => {
    // Check if stream is live or upcoming
    if (stream.isLive) {
      try {
        const priceString = (stream as any)?.streaming?.virtualPrice || (stream as any)?.price_range || '0';
        const priceNumber = parseFloat(String(priceString).replace(/[^0-9.]/g, '')) || 0;
        const requiresVirtualAccess = priceNumber > 0;

        if (!requiresVirtualAccess) {
          setSelectedStream(stream);
          return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast.error('Please sign in to watch paid live streams');
          const fullEvent = await getEventById(stream.id);
          setSelectedEvent(fullEvent as unknown as ApiEvent);
          return;
        }

        const hasAccess = await hasActiveVirtualTicket(user.id, stream.id);
        if (hasAccess) {
          setSelectedStream(stream);
          return;
        }

        toast.error('Virtual Access required to watch this live stream');
        const fullEvent = await getEventById(stream.id);
        handlePurchaseTicket(fullEvent as unknown as ApiEvent);
      } catch {
        toast.error('Unable to open stream');
      }
    } else {
      // It's an upcoming event, open details
      setSelectedEvent(stream as unknown as ApiEvent);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen pb-20">
      {/* Minimal Header */}
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
              {/* Location Filter */}
              <button 
                onClick={() => setShowLocationFilter(true)}
                className="h-8 px-3 flex items-center gap-1.5 rounded-full bg-gray-50 hover:bg-gray-100 transition-all border border-gray-100"
              >
                {(() => {
                  const location = locations.find(c => c.id === selectedLocation);
                  if (location?.icon) {
                    const Icon = location.icon;
                    return <Icon className="w-3.5 h-3.5 text-gray-700" />;
                  }
                  return <span className="text-sm">{location?.flag || '🇹🇿'}</span>;
                })()}
                <span className="text-xs font-medium text-gray-700 hidden sm:block">
                  {locations.find(c => c.id === selectedLocation)?.name || 'Dar es Salaam'}
                </span>
              </button>

              {/* Category Filter */}
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
              <div className="flex items-center justify-between mb-5 px-1">
            <div className="flex items-center gap-2.5">
              <Video className="w-5 h-5 text-gray-900" />
              <div>
                <h2 className="text-gray-900 text-[15px] font-bold tracking-tight">Live Events</h2>
                <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider leading-none mt-0.5">Featured Broadcasts</p>
              </div>
            </div>
            <div className="h-[1px] flex-1 bg-gradient-to-r from-gray-100 to-transparent ml-6 hidden sm:block"></div>
          </div>
          
          {liveEvents.length > 0 ? (
            <div className="flex overflow-x-auto gap-3 pb-4 -mx-5 px-5 scrollbar-hide snap-x">
              {liveEvents.map((stream: LiveStream) => (
                <div
                  key={`featured-${stream.id}`}
                  onClick={() => handleStreamClick(stream)}
                  className="relative flex-shrink-0 w-[75vw] sm:w-[320px] snap-center group cursor-pointer overflow-hidden rounded-2xl shadow-sm hover:shadow-xl transition-all duration-500 border border-gray-100 ring-1 ring-black/5"
                  style={{ aspectRatio: '16/9' }}
                >
                  <ImageWithFallback
                    src={stream.thumbnail}
                    alt={stream.title}
                    className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700 ease-out"
                    width={400}
                    height={225}
                    quality={80}
                    resize="cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity"></div>
                  
                  <div className="absolute top-3 left-3">
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-red-600 shadow-lg shadow-red-600/20 backdrop-blur-sm border border-red-500/30">
                      <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
                      <span className="text-white text-[10px] font-black tracking-widest uppercase leading-none">Live</span>
                    </div>
                  </div>
                  
                  <div className="absolute top-3 right-3">
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-white text-[10px] font-semibold">
                      <Eye className="w-3 h-3 text-white/80" />
                      <span>{stream.viewers?.toLocaleString() || 0}</span>
                    </div>
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 p-4 transform translate-y-1 group-hover:translate-y-0 transition-transform duration-500">
                    <h3 className="text-white text-base font-bold mb-1.5 line-clamp-1 drop-shadow-sm">{stream.title}</h3>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-white/80 text-[11px] font-medium">
                        <MapPin className="w-3.5 h-3.5 text-white/60" />
                        <span className="line-clamp-1 max-w-[120px]">{stream.location || stream.host}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-10 bg-white rounded-xl border border-gray-100 border-dashed">
              <p className="text-gray-500 text-sm">No live events at the moment</p>
            </div>
        )}
      </div>

        <div>
          <div className="flex items-center justify-between mb-5 px-1">
            <div className="flex items-center gap-2.5">
              <Smartphone className="w-5 h-5 text-gray-900" />
              <div>
                <h2 className="text-gray-900 text-[15px] font-bold tracking-tight">Creators Live</h2>
                <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider leading-none mt-0.5">Stream Community</p>
              </div>
            </div>
            <div className="h-[1px] flex-1 bg-gradient-to-r from-gray-100 to-transparent ml-6 hidden sm:block"></div>
          </div>

          {creatorsLive.length > 0 ? (
            <div className="flex overflow-x-auto gap-3 pb-4 -mx-5 px-5 scrollbar-hide snap-x">
              {creatorsLive.map((stream: LiveStream) => (
                <div
                  key={`creator-${stream.id}`}
                  onClick={() => handleStreamClick(stream)}
                  className="relative flex-shrink-0 w-[42vw] sm:w-[180px] snap-center group cursor-pointer overflow-hidden rounded-2xl shadow-sm hover:shadow-lg transition-all duration-500 border border-gray-100 ring-1 ring-black/5"
                  style={{ aspectRatio: '3/4' }}
                >
                  <ImageWithFallback
                    src={stream.thumbnail}
                    alt={stream.title}
                    className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700 ease-out"
                    width={200}
                    height={266}
                    quality={80}
                    resize="cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent opacity-80 group-hover:opacity-100 transition-opacity"></div>
                  
                  <div className="absolute top-2.5 left-2.5">
                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-red-600 shadow-lg shadow-red-600/20 backdrop-blur-sm border border-red-500/20">
                      <div className="w-1 h-1 rounded-full bg-white animate-pulse"></div>
                      <span className="text-white text-[8px] font-black tracking-widest uppercase">Live</span>
                    </div>
                  </div>
                  
                  <div className="absolute top-2.5 right-2.5">
                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-white text-[8px] font-semibold">
                      <Eye className="w-2.5 h-2.5 text-white/80" />
                      <span>{stream.viewers?.toLocaleString() || 0}</span>
                    </div>
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 p-3 transform translate-y-0.5 group-hover:translate-y-0 transition-transform">
                    <h3 className="text-white text-[11px] font-bold mb-1 line-clamp-2 drop-shadow-sm group-hover:text-purple-200 transition-colors">{stream.title}</h3>
                    <div className="flex items-center gap-1.5 text-white/70 text-[9px] font-medium">
                      <div className="w-4 h-4 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-[8px] border border-white/10">
                        {stream.host.charAt(0)}
                      </div>
                      <span className="line-clamp-1">{stream.host}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 bg-white rounded-xl border border-gray-100 border-dashed">
              <p className="text-gray-500 text-sm">No creators live right now</p>
            </div>
          )}
        </div>

        <div className="pt-2">
          <div className="flex items-center justify-between mb-5 px-1">
            <div className="flex items-center gap-2.5">
              <Clock className="w-5 h-5 text-gray-900" />
              <div>
                <h2 className="text-gray-900 text-[15px] font-bold tracking-tight">Starting Soon</h2>
                <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider leading-none mt-0.5">Scheduled Streams</p>
              </div>
            </div>
            <div className="h-[1px] flex-1 bg-gradient-to-r from-gray-100 to-transparent ml-6 hidden sm:block"></div>
          </div>

          {filteredUpcomingStreams.length > 0 ? (
            <div className="space-y-2">
              {filteredUpcomingStreams.map((stream: LiveStream) => {
                const isReminderSet = reminders.has(stream.id);
                return (
                  <div
                    key={stream.id}
                    onClick={() => handleStreamClick(stream)}
                    className="group flex items-center gap-4 p-2.5 bg-white rounded-2xl border border-gray-50 hover:border-purple-100 hover:bg-purple-50/30 transition-all duration-300 cursor-pointer"
                  >
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 shadow-sm ring-1 ring-black/5">
                      <ImageWithFallback
                        src={stream.thumbnail}
                        alt={stream.title}
                        className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                        width={100}
                        height={100}
                        quality={70}
                        resize="cover"
                      />
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
                      <h3 className="text-gray-900 text-[13px] font-semibold mb-0.5 line-clamp-1 group-hover:text-purple-700 transition-colors">
                        {stream.title}
                      </h3>
                      
                      <div className="flex items-center gap-1.5 text-purple-600/90 text-[11px] font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400/30 flex items-center justify-center">
                          <span className="w-0.5 h-0.5 rounded-full bg-purple-500"></span>
                        </span>
                        <span>{stream.scheduledTime?.split(' at ')[1] || stream.scheduledTime}</span>
                      </div>

                      <div className="flex items-center gap-1 text-gray-400 text-[11px]">
                        <MapPin className="w-3 h-3 opacity-70" />
                        <span className="line-clamp-1 truncate max-w-[120px]">
                          {stream.location || stream.host}
                        </span>
                      </div>
                    </div>

                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        const newReminders = new Set(reminders);
                        if (newReminders.has(stream.id)) {
                          newReminders.delete(stream.id);
                          toast.success('Reminder removed');
                        } else {
                          newReminders.add(stream.id);
                          toast.success('Reminder set!', {
                            description: `We'll notify you when ${stream.title} starts.`,
                          });
                        }
                        setReminders(newReminders);
                      }}
                      className={`p-2 rounded-xl transition-all active:scale-95 ${
                        isReminderSet 
                          ? 'bg-purple-100 text-purple-600' 
                          : 'bg-gray-50 text-gray-400 hover:bg-purple-50 hover:text-purple-600'
                      }`}
                    >
                      <Bell className={`w-4.5 h-4.5 ${isReminderSet ? 'fill-current' : ''}`} />
                    </button>
                  </div>
                );
              })}
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

      {/* Minimal Filter Modal */}
      {showFilters && (
        <div 
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setShowFilters(false)}
        >
          <div 
            className="w-full max-w-4xl bg-white rounded-t-3xl shadow-2xl border-t border-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag indicator */}
            <div className="flex justify-center pt-3 pb-5">
              <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
            </div>

            <div className="px-5 pb-8">
              <h2 className="text-gray-900 text-lg mb-5">Filter by category</h2>
              
              <div className="space-y-2">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => {
                      setSelectedCategory(category.id);
                      setShowFilters(false);
                    }}
                    className={`w-full text-left px-5 py-3.5 rounded-xl transition-all ${
                      selectedCategory === category.id
                        ? 'bg-purple-600 text-white shadow-lg'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Location Filter Modal */}
      {showLocationFilter && (
        <div 
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setShowLocationFilter(false)}
        >
          <div 
            className="w-full max-w-4xl bg-white rounded-t-3xl shadow-2xl border-t border-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag indicator */}
            <div className="flex justify-center pt-3 pb-5">
              <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
            </div>

            <div className="px-5 pb-8">
              <div className="flex items-center gap-2 mb-5">
                <MapPin className="w-5 h-5 text-purple-600" />
                <h2 className="text-gray-900 text-lg">Filter by location</h2>
              </div>

              {/* Search Bar */}
              <div className="relative mb-4">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={locationSearch}
                  onChange={(e) => setLocationSearch(e.target.value)}
                  placeholder="Search location..."
                  className="w-full pl-12 pr-4 py-3 rounded-xl bg-gray-50 text-gray-900 placeholder-gray-500 outline-none focus:ring-2 focus:ring-purple-600 transition-all"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {displayedLocations.length > 0 ? (
                  displayedLocations.map((location) => (
                    <button
                      key={location.id}
                      onClick={() => handleLocationSelect(location.id)}
                      className={`w-full text-left px-5 py-3.5 rounded-xl transition-all flex items-center gap-3 ${
                        selectedLocation === location.id
                          ? 'bg-purple-600 text-white shadow-lg'
                          : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {/* @ts-ignore - icon property exists on some items */}
                      {location.icon ? (
                         // @ts-ignore
                        <location.icon className={`w-6 h-6 ${selectedLocation === location.id ? 'text-white' : 'text-gray-700'}`} />
                      ) : (
                         // @ts-ignore
                        <span className="text-2xl">{location.flag}</span>
                      )}
                      <span>{location.name}</span>
                    </button>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500 text-sm">No locations found</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Live Stream Viewer Modal */}
      {selectedStream && (
        <LiveStreamViewer
          stream={selectedStream}
          onClose={() => setSelectedStream(null)}
        />
      )}

      {/* Event Details Modal */}
      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onPurchaseTicket={handlePurchaseTicket}
          onPurchaseNormalTicket={() => {}}
        />
      )}

      {/* Virtual Ticket Purchase Modal */}
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
