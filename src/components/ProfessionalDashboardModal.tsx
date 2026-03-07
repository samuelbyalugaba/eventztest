import { useState, useEffect } from 'react';
import { 
  X, 
  BarChart3, 
  DollarSign, 
  Ticket, 
  Eye, 
  Users, 
  Settings, 
  PlusCircle, 
  QrCode, 
  Radio, 
  Star,
  ArrowRight,
  TrendingUp,
  Calendar,
  Clock,
  Briefcase
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../utils/supabase/client';
import { getOrganizerStats, getOrganizerEvents, updateEventStreamingStatus, getUserTickets } from '../utils/supabase/api';
import { OrganizerSettingsModal } from './OrganizerSettingsModal';
import { CreatePostModal } from './CreatePostModal';
import { StreamManager } from './StreamManager';
import { TicketScannerModal } from './TicketScannerModal';
import { UserAvatar } from './UserAvatar';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface ProfessionalDashboardModalProps {
  onClose: () => void;
  organizerProfile: any;
  onCreateEvent: () => void;
  onEditEvent?: (event: any) => void;
}

export function ProfessionalDashboardModal({ 
  onClose, 
  organizerProfile, 
  onCreateEvent, 
  onEditEvent 
}: ProfessionalDashboardModalProps) {
  const [stats, setStats] = useState({
    totalEvents: 0,
    followers: 0,
    totalViews: 0,
    revenue: 0,
    liveStreams: 0,
    ticketsSold: 0
  });
  const [userStats, setUserStats] = useState({
    eventsAttended: 0,
    ticketsPurchased: 0
  });
  const [publishedEvents, setPublishedEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal States
  const [showSettings, setShowSettings] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [selectedEventForStream, setSelectedEventForStream] = useState<any>(null);

  // Helper function to format numbers with k notation
  const formatNumber = (num: number): string => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Load stats
        try {
          const statsData = await getOrganizerStats(user.id);
          setStats(statsData);
        } catch (err) {
          console.error("Error loading organizer stats:", err);
        }

        // Load user specific stats (tickets purchased, events attended)
        try {
          const tickets = await getUserTickets(user.id);
          if (tickets) {
            const attended = tickets.filter(t => {
               if (!t.event?.date) return false;
               const eventDate = new Date(t.event.date);
               return !isNaN(eventDate.getTime()) && eventDate < new Date();
            }).length;
            
            setUserStats({
              eventsAttended: attended,
              ticketsPurchased: tickets.length
            });
          }
        } catch (err) {
          console.error("Error loading user tickets:", err);
        }

        // Load events (for Go Live and Scanner)
        try {
          const userEvents = await getOrganizerEvents(user.id);
          if (userEvents) {
            const published = userEvents.filter((e: any) => e.status === 'published' || !e.status);
            setPublishedEvents(published);
          }
        } catch (err) {
          console.error("Error loading organizer events:", err);
        }
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleGoLive = () => {
    if (publishedEvents.length === 0) {
      toast.error('No events to stream', {
        description: 'Please create and publish an event first.'
      });
      return;
    }

    // Try to find a "Live" event first, then today's, then most recent
    const liveEvent = publishedEvents.find(e => e.streaming?.isLive);
    if (liveEvent) {
      setSelectedEventForStream(liveEvent);
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const todaysEvent = publishedEvents.find(e => e.date === today);
    if (todaysEvent) {
      setSelectedEventForStream(todaysEvent);
      return;
    }

    setSelectedEventForStream(publishedEvents[0]);
  };

  const profileImage = organizerProfile?.cover_url || organizerProfile?.organizer_avatar_url;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-50 animate-in fade-in duration-200 overflow-y-auto">
      {/* Header */}
      <div className="bg-white px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="relative">
            <BarChart3 className="w-6 h-6 text-gray-900" />
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[10px] text-white font-bold border-2 border-white">
              2
            </div>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="rounded-full overflow-hidden w-10 h-10 border border-gray-200">
             {profileImage ? (
                <ImageWithFallback
                  src={profileImage}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <UserAvatar 
                  name={organizerProfile.organizerName} 
                  className="w-full h-full" 
                />
              )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-8 max-w-7xl mx-auto w-full">
        
        {/* Top Cards Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Events Attended */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-32">
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center">
                <Star className="w-5 h-5 text-gray-900" />
              </div>
              <span className="px-2 py-1 bg-gray-50 text-gray-600 text-[10px] font-bold rounded-lg">+0%</span>
            </div>
            <div>
              <p className="text-gray-500 font-medium text-xs mb-1">Events Attended</p>
              <h3 className="text-xl font-bold text-gray-900">{userStats.eventsAttended}</h3>
            </div>
          </div>

          {/* Events Hosted */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-32">
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center">
                <Calendar className="w-5 h-5 text-gray-900" />
              </div>
              <span className="px-2 py-1 bg-gray-50 text-gray-600 text-[10px] font-bold rounded-lg">+0%</span>
            </div>
            <div>
              <p className="text-gray-500 font-medium text-xs mb-1">Events Hosted</p>
              <h3 className="text-xl font-bold text-gray-900">{stats.totalEvents}</h3>
            </div>
          </div>

          {/* Tickets Purchased */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-32">
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center">
                <Ticket className="w-5 h-5 text-gray-900" />
              </div>
              <span className="px-2 py-1 bg-gray-50 text-gray-600 text-[10px] font-bold rounded-lg">+0%</span>
            </div>
            <div>
              <p className="text-gray-500 font-medium text-xs mb-1">Tickets Purchased</p>
              <h3 className="text-xl font-bold text-gray-900">{userStats.ticketsPurchased}</h3>
            </div>
          </div>

          {/* Tickets Sold */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-32">
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center">
                <Ticket className="w-5 h-5 text-gray-900" />
              </div>
              <span className="px-2 py-1 bg-gray-50 text-gray-600 text-[10px] font-bold rounded-lg">+0%</span>
            </div>
            <div>
              <p className="text-gray-500 font-medium text-xs mb-1">Tickets Sold</p>
              <h3 className="text-xl font-bold text-gray-900">{stats.ticketsSold}</h3>
            </div>
          </div>
        </div>

        {/* Analytics Section */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-4">Analytics</h2>
          <div className="grid grid-cols-2 gap-4">
            {/* Revenue */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-32">
              <div className="flex justify-between items-start">
                <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-gray-900" />
                </div>
                <span className="px-2 py-1 bg-gray-50 text-gray-600 text-[10px] font-bold rounded-lg">+0%</span>
              </div>
              <div>
                <p className="text-gray-500 font-medium text-xs mb-1">Revenue</p>
                <h3 className="text-xl font-bold text-gray-900">TSh {formatNumber(stats.revenue)}</h3>
              </div>
            </div>

            {/* Followers */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-32">
              <div className="flex justify-between items-start">
                <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center">
                  <Users className="w-5 h-5 text-gray-900" />
                </div>
              </div>
              <div>
                <p className="text-gray-500 font-medium text-xs mb-1">Followers</p>
                <h3 className="text-xl font-bold text-gray-900">{formatNumber(stats.followers)}</h3>
              </div>
            </div>

            {/* Total Views */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-32">
              <div className="flex justify-between items-start">
                <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center">
                  <Eye className="w-5 h-5 text-gray-900" />
                </div>
              </div>
              <div>
                <p className="text-gray-500 font-medium text-xs mb-1">Total Views</p>
                <h3 className="text-xl font-bold text-gray-900">{formatNumber(stats.totalViews)}</h3>
              </div>
            </div>

            {/* Tickets Sold (Repeated in Analytics per design) */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-32">
              <div className="flex justify-between items-start">
                <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center">
                  <Eye className="w-5 h-5 text-gray-900" />
                </div>
              </div>
              <div>
                <p className="text-gray-500 font-medium text-xs mb-1">Tickets Sold</p>
                <h3 className="text-xl font-bold text-gray-900">{formatNumber(stats.ticketsSold)}</h3>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Section */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-4">Performance</h2>
          <div className="grid grid-cols-2 gap-4">
            {/* Peak Views */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-32">
              <div className="flex justify-between items-start">
                <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center text-white">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <div>
                <p className="text-gray-500 font-medium text-xs mb-1">Peak Views</p>
                <h3 className="text-xl font-bold text-gray-900">0</h3>
                <p className="text-gray-400 text-[10px]">Concurrent: 0</p>
              </div>
            </div>

            {/* Stream Time */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-32">
              <div className="flex justify-between items-start">
                <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center text-white">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
              <div>
                <p className="text-gray-500 font-medium text-xs mb-1">Stream Time</p>
                <h3 className="text-xl font-bold text-gray-900">0h 0m</h3>
                <p className="text-gray-400 text-[10px]">Last 30 days</p>
              </div>
            </div>
          </div>
        </div>

        {/* Account Info Section */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-4">Account Info</h2>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-start gap-4">
            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center flex-shrink-0">
              <Star className="w-6 h-6 text-gray-900" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">Account Status: Active</h3>
              <p className="text-gray-500 text-sm">Your profile is visible to the public</p>
            </div>
          </div>
        </div>

      </div>

      {/* Modals */}
      {showSettings && (
        <OrganizerSettingsModal onClose={() => setShowSettings(false)} />
      )}

      {selectedEventForStream && (
        <StreamManager
          event={selectedEventForStream}
          onClose={() => setSelectedEventForStream(null)}
          onUpdateStatus={async (isLive) => {
            // Optimistic update local list
             const updatedEvents = publishedEvents.map(e => 
              e.id === selectedEventForStream.id 
                ? { ...e, streaming: { ...e.streaming, isLive } }
                : e
            );
            setPublishedEvents(updatedEvents);

            try {
              await updateEventStreamingStatus(selectedEventForStream.id, isLive);
              if (isLive) {
                toast.success('Event is now LIVE on the platform!');
              } else {
                toast.info('Event stream ended.');
              }
            } catch (error) {
              console.error('Failed to update streaming status:', error);
              toast.error('Failed to update stream status');
            }
          }}
        />
      )}

      {showScanner && (
        <TicketScannerModal
          eventId={publishedEvents[0]?.id || 0} 
          eventTitle={publishedEvents[0]?.title || 'Event'}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
}
