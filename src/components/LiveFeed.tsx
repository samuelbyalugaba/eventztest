import { useState, useEffect } from 'react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Filter, Play, MapPin, Search, Lock, Unlock, X, CheckCircle2, Globe } from 'lucide-react';
import { LiveStreamViewer } from './LiveStreamViewer';
import { VirtualTicketPurchaseModal } from './VirtualTicketPurchaseModal';
import { EventDetailModal } from './EventDetailModal';
import { toast } from 'sonner';
import { getLiveStreams, getUpcomingStreams, getProfile, updateProfile, type Event as ApiEvent } from '../utils/supabase/api';
import { supabase } from '../utils/supabase/client';

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

const countries = [
  { id: 'all', name: 'All Countries', icon: Globe },
  { id: 'Tanzania', name: 'Tanzania', flag: '🇹🇿' },
  { id: 'Kenya', name: 'Kenya', flag: '🇰🇪' },
  { id: 'United States', name: 'United States', flag: '🇺🇸' },
  { id: 'United Kingdom', name: 'United Kingdom', flag: '🇬🇧' },
  { id: 'Canada', name: 'Canada', flag: '🇨🇦' },
  { id: 'Australia', name: 'Australia', flag: '🇦🇺' },
  { id: 'Germany', name: 'Germany', flag: '🇩🇪' },
  { id: 'France', name: 'France', flag: '🇫🇷' },
  { id: 'Italy', name: 'Italy', flag: '🇮🇹' },
  { id: 'Spain', name: 'Spain', flag: '🇪🇸' },
  { id: 'Netherlands', name: 'Netherlands', flag: '🇳🇱' },
  { id: 'Belgium', name: 'Belgium', flag: '🇧🇪' },
  { id: 'Switzerland', name: 'Switzerland', flag: '🇨🇭' },
  { id: 'Austria', name: 'Austria', flag: '🇦🇹' },
  { id: 'Sweden', name: 'Sweden', flag: '🇸🇪' },
  { id: 'Norway', name: 'Norway', flag: '🇳🇴' },
  { id: 'Denmark', name: 'Denmark', flag: '🇩🇰' },
  { id: 'Finland', name: 'Finland', flag: '🇫🇮' },
  { id: 'Poland', name: 'Poland', flag: '🇵🇱' },
  { id: 'Portugal', name: 'Portugal', flag: '🇵🇹' },
  { id: 'Greece', name: 'Greece', flag: '🇬🇷' },
  { id: 'Czech Republic', name: 'Czech Republic', flag: '🇨🇿' },
  { id: 'Ireland', name: 'Ireland', flag: '🇮🇪' },
  { id: 'Japan', name: 'Japan', flag: '🇯🇵' },
  { id: 'South Korea', name: 'South Korea', flag: '🇰🇷' },
  { id: 'China', name: 'China', flag: '🇨🇳' },
  { id: 'India', name: 'India', flag: '🇮🇳' },
  { id: 'Singapore', name: 'Singapore', flag: '🇸🇬' },
  { id: 'Thailand', name: 'Thailand', flag: '🇹🇭' },
  { id: 'Malaysia', name: 'Malaysia', flag: '🇲🇾' },
  { id: 'Indonesia', name: 'Indonesia', flag: '🇮🇩' },
  { id: 'Philippines', name: 'Philippines', flag: '🇵🇭' },
  { id: 'Vietnam', name: 'Vietnam', flag: '🇻🇳' },
  { id: 'United Arab Emirates', name: 'United Arab Emirates', flag: '🇦🇪' },
  { id: 'Saudi Arabia', name: 'Saudi Arabia', flag: '🇸🇦' },
  { id: 'Qatar', name: 'Qatar', flag: '🇶🇦' },
  { id: 'Israel', name: 'Israel', flag: '🇮🇱' },
  { id: 'Turkey', name: 'Turkey', flag: '🇹🇷' },
  { id: 'Brazil', name: 'Brazil', flag: '🇧🇷' },
  { id: 'Argentina', name: 'Argentina', flag: '🇦🇷' },
  { id: 'Mexico', name: 'Mexico', flag: '🇲🇽' },
  { id: 'Colombia', name: 'Colombia', flag: '🇨🇴' },
  { id: 'Chile', name: 'Chile', flag: '🇨🇱' },
  { id: 'Peru', name: 'Peru', flag: '🇵🇪' },
  { id: 'South Africa', name: 'South Africa', flag: '🇿🇦' },
  { id: 'Nigeria', name: 'Nigeria', flag: '🇳🇬' },
  { id: 'Egypt', name: 'Egypt', flag: '🇪🇬' },
  { id: 'Morocco', name: 'Morocco', flag: '🇲🇦' },
  { id: 'Ghana', name: 'Ghana', flag: '🇬🇭' },
  { id: 'Ethiopia', name: 'Ethiopia', flag: '🇪🇹' },
  { id: 'Uganda', name: 'Uganda', flag: '🇺🇬' },
  { id: 'Rwanda', name: 'Rwanda', flag: '🇷🇼' },
  { id: 'Zambia', name: 'Zambia', flag: '🇿🇲' },
  { id: 'Zimbabwe', name: 'Zimbabwe', flag: '🇿🇼' },
  { id: 'Botswana', name: 'Botswana', flag: '🇧🇼' },
  { id: 'Namibia', name: 'Namibia', flag: '🇳🇦' },
  { id: 'Mozambique', name: 'Mozambique', flag: '🇲🇿' },
  { id: 'Angola', name: 'Angola', flag: '🇦🇴' },
  { id: 'Senegal', name: 'Senegal', flag: '🇸🇳' },
  { id: 'Ivory Coast', name: 'Ivory Coast', flag: '🇨🇮' },
  { id: 'Cameroon', name: 'Cameroon', flag: '🇨🇲' },
  { id: 'Algeria', name: 'Algeria', flag: '🇩🇿' },
  { id: 'Tunisia', name: 'Tunisia', flag: '🇹🇳' },
  { id: 'Libya', name: 'Libya', flag: '🇱🇾' },
  { id: 'Sudan', name: 'Sudan', flag: '🇸🇩' },
  { id: 'New Zealand', name: 'New Zealand', flag: '🇳🇿' },
  { id: 'Russia', name: 'Russia', flag: '🇷🇺' },
  { id: 'Ukraine', name: 'Ukraine', flag: '🇺🇦' },
  { id: 'Hungary', name: 'Hungary', flag: '🇭🇺' },
  { id: 'Romania', name: 'Romania', flag: '🇷🇴' },
  { id: 'Bulgaria', name: 'Bulgaria', flag: '🇧🇬' },
  { id: 'Croatia', name: 'Croatia', flag: '🇭🇷' },
  { id: 'Serbia', name: 'Serbia', flag: '🇷🇸' },
  { id: 'Slovenia', name: 'Slovenia', flag: '🇸🇮' },
  { id: 'Slovakia', name: 'Slovakia', flag: '🇸🇰' },
  { id: 'Lithuania', name: 'Lithuania', flag: '🇱🇹' },
  { id: 'Latvia', name: 'Latvia', flag: '🇱🇻' },
  { id: 'Estonia', name: 'Estonia', flag: '🇪🇪' },
  { id: 'Iceland', name: 'Iceland', flag: '🇮🇸' },
  { id: 'Luxembourg', name: 'Luxembourg', flag: '🇱🇺' },
  { id: 'Malta', name: 'Malta', flag: '🇲🇹' },
  { id: 'Cyprus', name: 'Cyprus', flag: '🇨🇾' },
  { id: 'Pakistan', name: 'Pakistan', flag: '🇵🇰' },
  { id: 'Bangladesh', name: 'Bangladesh', flag: '🇧🇩' },
  { id: 'Sri Lanka', name: 'Sri Lanka', flag: '🇱🇰' },
  { id: 'Nepal', name: 'Nepal', flag: '🇳🇵' },
  { id: 'Myanmar', name: 'Myanmar', flag: '🇲🇲' },
  { id: 'Cambodia', name: 'Cambodia', flag: '🇰🇭' },
  { id: 'Laos', name: 'Laos', flag: '🇱🇦' },
  { id: 'Mongolia', name: 'Mongolia', flag: '🇲🇳' },
  { id: 'Kazakhstan', name: 'Kazakhstan', flag: '🇰🇿' },
  { id: 'Uzbekistan', name: 'Uzbekistan', flag: '🇺🇿' },
  { id: 'Hong Kong', name: 'Hong Kong', flag: '🇭🇰' },
  { id: 'Taiwan', name: 'Taiwan', flag: '🇹🇼' },
  { id: 'Macau', name: 'Macau', flag: '🇲🇴' },
  { id: 'Lebanon', name: 'Lebanon', flag: '🇱🇧' },
  { id: 'Jordan', name: 'Jordan', flag: '🇯🇴' },
  { id: 'Kuwait', name: 'Kuwait', flag: '🇰🇼' },
  { id: 'Bahrain', name: 'Bahrain', flag: '🇧🇭' },
  { id: 'Oman', name: 'Oman', flag: '🇴🇲' },
  { id: 'Yemen', name: 'Yemen', flag: '🇾🇪' },
  { id: 'Iraq', name: 'Iraq', flag: '🇮🇶' },
  { id: 'Iran', name: 'Iran', flag: '🇮🇷' },
  { id: 'Afghanistan', name: 'Afghanistan', flag: '🇦🇫' },
  { id: 'Azerbaijan', name: 'Azerbaijan', flag: '🇦🇿' },
  { id: 'Georgia', name: 'Georgia', flag: '🇬🇪' },
  { id: 'Armenia', name: 'Armenia', flag: '🇦🇲' },
  { id: 'Costa Rica', name: 'Costa Rica', flag: '🇨🇷' },
  { id: 'Panama', name: 'Panama', flag: '🇵🇦' },
  { id: 'Ecuador', name: 'Ecuador', flag: '🇪🇨' },
  { id: 'Bolivia', name: 'Bolivia', flag: '🇧🇴' },
  { id: 'Paraguay', name: 'Paraguay', flag: '🇵🇾' },
  { id: 'Uruguay', name: 'Uruguay', flag: '🇺🇾' },
  { id: 'Venezuela', name: 'Venezuela', flag: '🇻🇪' },
  { id: 'Cuba', name: 'Cuba', flag: '🇨🇺' },
  { id: 'Dominican Republic', name: 'Dominican Republic', flag: '🇩🇴' },
  { id: 'Jamaica', name: 'Jamaica', flag: '🇯🇲' },
  { id: 'Trinidad and Tobago', name: 'Trinidad and Tobago', flag: '🇹🇹' },
  { id: 'Barbados', name: 'Barbados', flag: '🇧🇧' },
  { id: 'Bahamas', name: 'Bahamas', flag: '🇧' },
  { id: 'Fiji', name: 'Fiji', flag: '🇫🇯' },
  { id: 'Papua New Guinea', name: 'Papua New Guinea', flag: '🇵🇬' },
  { id: 'Maldives', name: 'Maldives', flag: '🇲🇻' },
  { id: 'Seychelles', name: 'Seychelles', flag: '🇸🇨' },
  { id: 'Mauritius', name: 'Mauritius', flag: '🇲🇺' },
  { id: 'Madagascar', name: 'Madagascar', flag: '🇲🇬' },
  { id: 'Brunei', name: 'Brunei', flag: '🇧🇳' },
  { id: 'North Macedonia', name: 'North Macedonia', flag: '🇲🇰' },
  { id: 'Bosnia and Herzegovina', name: 'Bosnia and Herzegovina', flag: '🇧🇦' },
  { id: 'Albania', name: 'Albania', flag: '🇦🇱' },
  { id: 'Montenegro', name: 'Montenegro', flag: '🇲🇪' },
  { id: 'Kosovo', name: 'Kosovo', flag: '🇽🇰' },
  { id: 'Moldova', name: 'Moldova', flag: '🇲🇩' },
  { id: 'Belarus', name: 'Belarus', flag: '🇧🇾' },
  { id: 'Guatemala', name: 'Guatemala', flag: '🇬🇹' },
  { id: 'Honduras', name: 'Honduras', flag: '🇭🇳' },
  { id: 'El Salvador', name: 'El Salvador', flag: '🇸🇻' },
  { id: 'Nicaragua', name: 'Nicaragua', flag: '🇳🇮' },
  { id: 'Belize', name: 'Belize', flag: '🇧🇿' },
  { id: 'Haiti', name: 'Haiti', flag: '🇭🇹' },
  { id: 'Guyana', name: 'Guyana', flag: '🇬🇾' },
  { id: 'Suriname', name: 'Suriname', flag: '🇸🇷' },
  { id: 'French Guiana', name: 'French Guiana', flag: '🇬🇫' },
  { id: 'Benin', name: 'Benin', flag: '🇧🇯' },
  { id: 'Burkina Faso', name: 'Burkina Faso', flag: '🇧🇫' },
  { id: 'Cape Verde', name: 'Cape Verde', flag: '🇨🇻' },
  { id: 'Chad', name: 'Chad', flag: '🇹🇩' },
  { id: 'Comoros', name: 'Comoros', flag: '🇰🇲' },
  { id: 'Congo', name: 'Congo', flag: '🇨🇬' },
  { id: 'DR Congo', name: 'DR Congo', flag: '🇨🇩' },
  { id: 'Djibouti', name: 'Djibouti', flag: '🇩' },
  { id: 'Equatorial Guinea', name: 'Equatorial Guinea', flag: '🇬🇶' },
  { id: 'Eritrea', name: 'Eritrea', flag: '🇪🇷' },
  { id: 'Gabon', name: 'Gabon', flag: '🇬🇦' },
  { id: 'Gambia', name: 'Gambia', flag: '🇬🇲' },
  { id: 'Guinea', name: 'Guinea', flag: '🇬🇳' },
  { id: 'Guinea-Bissau', name: 'Guinea-Bissau', flag: '🇬🇼' },
  { id: 'Lesotho', name: 'Lesotho', flag: '🇱🇸' },
  { id: 'Liberia', name: 'Liberia', flag: '🇱🇷' },
  { id: 'Malawi', name: 'Malawi', flag: '🇲🇼' },
  { id: 'Mali', name: 'Mali', flag: '🇲🇱' },
  { id: 'Mauritania', name: 'Mauritania', flag: '🇲🇷' },
  { id: 'Niger', name: 'Niger', flag: '🇳🇪' },
  { id: 'Reunion', name: 'Reunion', flag: '🇷🇪' },
  { id: 'Sao Tome and Principe', name: 'Sao Tome and Principe', flag: '🇸🇹' },
  { id: 'Sierra Leone', name: 'Sierra Leone', flag: '🇸🇱' },
  { id: 'Somalia', name: 'Somalia', flag: '🇸🇴' },
  { id: 'South Sudan', name: 'South Sudan', flag: '🇸🇸' },
  { id: 'Eswatini', name: 'Eswatini', flag: '🇸🇿' },
  { id: 'Togo', name: 'Togo', flag: '🇹🇬' },
  { id: 'Burundi', name: 'Burundi', flag: '🇧🇮' },
  { id: 'Central African Republic', name: 'Central African Republic', flag: '🇨🇫' },
];

export function LiveFeed() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedCountry, setSelectedCountry] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showLocationFilter, setShowLocationFilter] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');
  const [selectedStream, setSelectedStream] = useState<LiveStream | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<ApiEvent | null>(null);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [streamToUnlock, setStreamToUnlock] = useState<LiveStream | null>(null);
  const [unlockedStreams, setUnlockedStreams] = useState<Set<number>>(new Set());
  const [recentCountries, setRecentCountries] = useState<string[]>(['Tanzania', 'United Arab Emirates', 'United States']);
  const [liveStreams, setLiveStreams] = useState<LiveStream[]>([]);
  const [upcomingStreams, setUpcomingStreams] = useState<LiveStream[]>([]);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [eventToPurchase, setEventToPurchase] = useState<ApiEvent | null>(null);

  const handlePurchaseTicket = (event: ApiEvent) => {
    setEventToPurchase(event);
    setShowTicketModal(true);
    if (selectedEvent) {
      setSelectedEvent(null);
    }
  };

  const fetchStreams = async () => {
    try {
      const live = await getLiveStreams();
      if (live) {
        const mappedLive = live.map((e: any) => ({
          ...e,
          thumbnail: e.image_url,
          host:
            e.organizer?.organizer_details?.organizer_name ||
            e.organizer?.full_name ||
            e.organizer?.username ||
            'Event Organizer',
          organizer_id: e.organizer_id, // Pass organizer_id
          viewers: e.streaming?.liveViewers || 0,
          isLive: true,
          playback_url: e.streaming?.playback_url,
          country: e.location?.split(',').pop()?.trim() || 'Tanzania' // Try to guess country
        }));
        setLiveStreams(mappedLive as unknown as LiveStream[]);
      }
      
      const upcoming = await getUpcomingStreams();
      if (upcoming) {
        const mappedUpcoming = upcoming.map((e: any) => ({
          ...e,
          thumbnail: e.image_url,
          scheduledTime: `${e.date} at ${e.time}`,
          host:
            e.organizer?.organizer_details?.organizer_name ||
            e.organizer?.full_name ||
            e.organizer?.username ||
            'Event Organizer',
          organizer_id: e.organizer_id,
          country: e.location?.split(',').pop()?.trim() || 'Tanzania', // Try to guess country
          countdown: Math.max(0, Math.floor((new Date(`${e.date}T${e.time}`).getTime() - new Date().getTime()) / (1000 * 60)))
        }));
        setUpcomingStreams(mappedUpcoming as unknown as LiveStream[]);
      }
    } catch (error) {
      console.error('Error fetching streams:', error);
    }
  };

  useEffect(() => {
    fetchStreams();

    // Subscribe to real-time updates for live streams
    const channel = supabase
      .channel('live-feed-updates')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT/UPDATE/DELETE) to ensure feed is always fresh
          schema: 'public',
          table: 'events',
        },
        () => {
           // Refetch on any event change to ensure we catch go-live status updates
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
          
          // Check for migration from localStorage
          const localStored = localStorage.getItem('eventz-recent-countries');
          
          if (profile?.preferences?.recentCountries) {
            setRecentCountries(profile.preferences.recentCountries);
            // If we have data in Supabase, we can clear local storage to keep it clean
            if (localStored) localStorage.removeItem('eventz-recent-countries');
          } else if (localStored) {
            // Migration: User has local data but no Supabase data
            const countries = JSON.parse(localStored);
            setRecentCountries(countries);
            
            // Save to Supabase
            const currentPreferences = profile?.preferences || {};
            await updateProfile(user.id, {
              preferences: {
                ...currentPreferences,
                recentCountries: countries
              }
            });
            
            // Clear local storage after successful migration
            localStorage.removeItem('eventz-recent-countries');
          }
        } else {
          const stored = localStorage.getItem('eventz-recent-countries');
          if (stored) {
            setRecentCountries(JSON.parse(stored));
          }
        }
      } catch (error) {
        console.error('Error loading preferences:', error);
      }
    };

    loadPreferences();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadPreferences();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Save recent country when user selects one
  const handleCountrySelect = async (countryId: string) => {
    setSelectedCountry(countryId);
    setShowLocationFilter(false);
    setLocationSearch('');

    // Don't add "all" to recent searches
    if (countryId === 'all') return;

    // Update recent countries (keep max 3, most recent first)
    const updated = [countryId, ...recentCountries.filter(c => c !== countryId)].slice(0, 3);
    setRecentCountries(updated);
    
    // Save to Supabase if logged in, otherwise localStorage
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // We need to fetch current preferences first to not overwrite other fields if any (though currently only recentCountries)
        // Or just update using jsonb_set logic if we had that exposed, but updateProfile does a merge at top level.
        // But `preferences` is a jsonb column. Supabase update merges top-level columns.
        // But for the jsonb value itself, it replaces it unless we handle it carefully.
        // Assuming we just have recentCountries for now, replacing `preferences` object is fine.
        // If we add more keys to preferences later, we should fetch first.
        // Fetch current preferences if needed in future
        // const currentPreferences = profile?.preferences || {};
        
        // Commented out to avoid PGRST204 error (missing preferences column)
        // await updateProfile(user.id, { 
        //   preferences: { 
        //     ...currentPreferences,
        //     recentCountries: updated 
        //   } 
        // });
      } else {
        localStorage.setItem('eventz-recent-countries', JSON.stringify(updated));
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
    }
  };

  const filteredLiveStreams = liveStreams.filter(
    (stream: LiveStream) => 
      (selectedCategory === 'all' || stream.category === selectedCategory) &&
      (selectedCountry === 'all' || stream.country === selectedCountry)
  );

  const filteredUpcomingStreams = upcomingStreams.filter(
    (stream: LiveStream) => 
      (selectedCategory === 'all' || stream.category === selectedCategory) &&
      (selectedCountry === 'all' || stream.country === selectedCountry)
  );

  // Filter countries based on search
  const filteredCountries = countries.filter(country =>
    country.name.toLowerCase().includes(locationSearch.toLowerCase())
  );

  // Show only 3 default countries when search is empty
  const displayedCountries = locationSearch.trim() === '' 
    ? countries.filter(c => c.id === 'all' || recentCountries.includes(c.id))
    : filteredCountries;

  // Reminder toggling logic can be reintroduced when reminder UI is active

  const formatCountdown = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  };

  const handleStreamClick = (stream: LiveStream) => {
    // Check if stream is live or upcoming
    if (stream.isLive) {
      // Check if stream is paid and not unlocked
      if (stream.isPaid && !unlockedStreams.has(stream.id)) {
        setStreamToUnlock(stream);
        setShowUnlockModal(true);
      } else {
        setSelectedStream(stream);
      }
    } else {
      // It's an upcoming event, open details
      setSelectedEvent(stream as unknown as ApiEvent);
    }
  };

  const handleUnlockStream = () => {
    if (streamToUnlock) {
      // Add to unlocked streams
      const newUnlockedStreams = new Set(unlockedStreams);
      newUnlockedStreams.add(streamToUnlock.id);
      setUnlockedStreams(newUnlockedStreams);
      
      // Show success toast
      toast.success('🎉 Stream unlocked successfully!', {
        description: `You can now watch ${streamToUnlock.title}`,
      });
      
      // Close unlock modal and open stream viewer
      setShowUnlockModal(false);
      setSelectedStream(streamToUnlock);
      setStreamToUnlock(null);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen pb-20">
      {/* Premium Header */}
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-gray-100 shadow-sm">
        <div className="max-w-4xl mx-auto px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></div>
              </div>
              <div>
                <h1 className="text-gray-900 text-xl font-bold leading-tight">Live Feed</h1>
                {filteredLiveStreams.length > 0 ? (
                  <p className="text-red-500 text-xs font-medium">{filteredLiveStreams.length} streaming now</p>
                ) : (
                  <p className="text-gray-500 text-xs">Watch events live</p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Location Filter */}
              <button 
                onClick={() => setShowLocationFilter(true)}
                className="h-10 px-4 flex items-center gap-2 rounded-full bg-gray-50 hover:bg-gray-100 transition-all border border-gray-100"
              >
                {(() => {
                  const country = countries.find(c => c.id === selectedCountry);
                  if (country?.icon) {
                    const Icon = country.icon;
                    return <Icon className="w-4 h-4 text-gray-700" />;
                  }
                  return <span className="text-lg">{country?.flag || '🇹🇿'}</span>;
                })()}
                <span className="text-sm font-medium text-gray-700 hidden sm:block">
                  {countries.find(c => c.id === selectedCountry)?.name || 'Tanzania'}
                </span>
              </button>

              {/* Category Filter */}
              <button 
                onClick={() => setShowFilters(true)}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 hover:bg-gray-100 transition-all border border-gray-100"
              >
                <Filter className="w-4 h-4 text-gray-700" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-5 py-6">
        {/* Live Now - Premium Cards */}
        {filteredLiveStreams.length > 0 && (
          <div className="space-y-5 mb-12">
            {filteredLiveStreams.map((stream: LiveStream) => (
              <div
                key={stream.id}
                onClick={() => handleStreamClick(stream)}
                className="relative group cursor-pointer overflow-hidden rounded-3xl shadow-lg hover:shadow-2xl transition-all"
                style={{ aspectRatio: '16/9' }}
              >
                {/* Image */}
                <ImageWithFallback
                  src={stream.thumbnail}
                  alt={stream.title}
                  className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
                />
                
                {/* Subtle gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                
                {/* Minimal Live Indicator - Top Left */}
                <div className="absolute top-4 left-4 flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500 shadow-lg">
                    <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
                    <span className="text-white text-xs tracking-wide">LIVE</span>
                  </div>
                </div>

                {/* Quality Badge - Only when relevant */}
                {stream.quality === '4K' && (
                  <div className="absolute top-4 right-4">
                    <div className="px-2 py-1 rounded-lg bg-purple-600 shadow-lg">
                      <span className="text-white text-xs">4K</span>
                    </div>
                  </div>
                )}

                {/* Bottom Info */}
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <div className="flex items-end justify-between">
                    {/* Left: Title & Viewers */}
                    <div className="flex-1 pr-4">
                      <h3 className="text-white text-lg mb-2 leading-tight line-clamp-2">{stream.title}</h3>
                      <div className="flex items-center gap-3">
                        <span className="text-white/90 text-sm">{stream.host}</span>
                        <span className="w-1 h-1 rounded-full bg-white/50"></span>
                        <span className="text-white/90 text-sm">{stream.viewers?.toLocaleString()} watching</span>
                      </div>
                    </div>

                    {/* Right: Minimal Play Button */}
                    <button className="w-14 h-14 rounded-full bg-white flex items-center justify-center hover:scale-105 transition-all shadow-xl">
                      <Play className="w-6 h-6 text-purple-600 fill-purple-600 ml-0.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Upcoming - Minimal Cards */}
        {filteredUpcomingStreams.length > 0 && (
          <div>
            {/* Hidden as requested */}
            {/* <div className="flex items-center gap-2 mb-5">
              <Clock className="w-5 h-5 text-purple-600" />
              <h2 className="text-gray-900 text-lg">Upcoming</h2>
            </div> */}

            <div className="space-y-3">
              {filteredUpcomingStreams.map((stream: LiveStream) => (
                <div
                  key={stream.id}
                  onClick={() => handleStreamClick(stream)}
                  className="relative overflow-hidden rounded-2xl bg-white hover:shadow-md transition-all cursor-pointer border border-gray-200"
                >
                  <div className="flex gap-4 p-4">
                    {/* Thumbnail */}
                    <div className="relative w-28 h-20 rounded-xl overflow-hidden flex-shrink-0 shadow-sm">
                      <ImageWithFallback
                        src={stream.thumbnail}
                        alt={stream.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/20"></div>
                      {/* Countdown badge */}
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-purple-600 shadow-sm">
                        <span className="text-white text-xs">{formatCountdown(stream.countdown!)}</span>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 flex flex-col justify-between min-w-0">
                      <div>
                        <h3 className="text-gray-900 text-sm mb-1 line-clamp-2 leading-snug">{stream.title}</h3>
                        <p className="text-gray-600 text-xs">{stream.scheduledTime}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {filteredLiveStreams.length === 0 && filteredUpcomingStreams.length === 0 && (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <div className="w-2 h-2 rounded-full bg-purple-600"></div>
            </div>
            <h3 className="text-gray-900 mb-2">No streams available</h3>
            <p className="text-gray-600 text-sm">Check back soon for live events</p>
          </div>
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
                {displayedCountries.length > 0 ? (
                  displayedCountries.map((country) => (
                    <button
                      key={country.id}
                      onClick={() => handleCountrySelect(country.id)}
                      className={`w-full text-left px-5 py-3.5 rounded-xl transition-all flex items-center gap-3 ${
                        selectedCountry === country.id
                          ? 'bg-purple-600 text-white shadow-lg'
                          : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {/* @ts-ignore - icon property exists on some items */}
                      {country.icon ? (
                         // @ts-ignore
                        <country.icon className={`w-6 h-6 ${selectedCountry === country.id ? 'text-white' : 'text-gray-700'}`} />
                      ) : (
                         // @ts-ignore
                        <span className="text-2xl">{country.flag}</span>
                      )}
                      <span>{country.name}</span>
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
          isUnlockedOverride={unlockedStreams.has(selectedStream.id)}
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

      {/* Unlock Stream Modal */}
      {showUnlockModal && streamToUnlock && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setShowUnlockModal(false)}
        >
          <div 
            className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative h-48 overflow-hidden">
              <ImageWithFallback
                src={streamToUnlock.thumbnail}
                alt={streamToUnlock.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
              
              {/* Lock Icon Overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-purple-600/90 backdrop-blur-sm flex items-center justify-center">
                  <Lock className="w-8 h-8 text-white" />
                </div>
              </div>

              {/* Close Button */}
              <button 
                onClick={() => setShowUnlockModal(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Live Badge */}
              <div className="absolute top-4 left-4">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500 shadow-lg">
                  <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
                  <span className="text-white text-xs tracking-wide">LIVE</span>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <h2 className="text-gray-900 text-2xl mb-2">Premium Live Stream</h2>
              <h3 className="text-gray-700 mb-1">{streamToUnlock.title}</h3>
              <p className="text-gray-600 text-sm mb-6">{streamToUnlock.host}</p>

              {/* Features */}
              <div className="mb-6 p-4 bg-gradient-to-br from-purple-50 to-cyan-50 rounded-xl border border-purple-200">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-gray-700 text-sm">HD {streamToUnlock.quality} streaming quality</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-gray-700 text-sm">Multi-camera angles & replays</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-gray-700 text-sm">Live chat & real-time reactions</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-gray-700 text-sm">24-hour replay access</span>
                  </div>
                </div>
              </div>

              {/* Price */}
              <div className="mb-6 flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <span className="text-gray-700">Stream Access</span>
                <span className="text-gray-900 text-2xl">TSh {streamToUnlock.price?.toLocaleString()}</span>
              </div>

              {/* CTA Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleUnlockStream}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-cyan-500 text-white py-4 rounded-xl hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <Unlock className="w-5 h-5" />
                  Unlock Stream
                </button>
                <button
                  onClick={() => setShowUnlockModal(false)}
                  className="px-6 py-4 rounded-xl border-2 border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
