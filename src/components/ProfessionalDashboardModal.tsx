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
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../utils/supabase/client';
import { getOrganizerStats, getOrganizerEvents, updateEventStreamingStatus } from '../utils/supabase/api';
import { OrganizerSettingsModal } from './OrganizerSettingsModal';
import { CreatePostModal } from './CreatePostModal';
import { StreamManager } from './StreamManager';
import { TicketScannerModal } from './TicketScannerModal';

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-gray-50 w-full max-w-4xl max-h-[90vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl">
        
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-[#8A2BE2]" />
              Professional Dashboard
            </h2>
            <p className="text-sm text-gray-500">Analytics and tools for {organizerProfile.organizerName}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6">
          
          {/* Quick Actions Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <button
              onClick={() => setShowSettings(true)}
              className="flex flex-col items-center justify-center gap-3 bg-white p-4 rounded-2xl border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all group"
            >
              <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Settings className="w-6 h-6 text-purple-600" />
              </div>
              <span className="font-semibold text-gray-700 text-sm">Settings</span>
            </button>

            <button
              onClick={() => {
                onClose(); // Close dashboard to show create modal
                onCreateEvent();
              }}
              className="flex flex-col items-center justify-center gap-3 bg-white p-4 rounded-2xl border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all group"
            >
              <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <PlusCircle className="w-6 h-6 text-purple-600" />
              </div>
              <span className="font-semibold text-gray-700 text-sm">Create Event</span>
            </button>

            <button
              onClick={() => {
                if (publishedEvents.length === 0) {
                  toast.error('No events to scan for');
                  return;
                }
                setShowScanner(true);
              }}
              className="flex flex-col items-center justify-center gap-3 bg-white p-4 rounded-2xl border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all group"
            >
              <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <QrCode className="w-6 h-6 text-purple-600" />
              </div>
              <span className="font-semibold text-gray-700 text-sm">Scan Tickets</span>
            </button>

            <button
              onClick={handleGoLive}
              className="flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-red-500 to-pink-600 p-4 rounded-2xl shadow-lg hover:shadow-red-500/30 transition-all group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform" />
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform">
                <Radio className="w-6 h-6 text-white" />
              </div>
              <span className="font-semibold text-white text-sm">Go Live</span>
            </button>
          </div>

          {/* Performance Overview */}
          <div className="mb-8">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-gray-500" />
              Performance
            </h3>
            
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Revenue */}
              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <DollarSign className="w-4 h-4 text-green-600" />
                  </div>
                  <span className="text-sm text-gray-500 font-medium">Revenue</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">TSh {formatNumber(stats.revenue)}</p>
              </div>

              {/* Tickets */}
              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Ticket className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="text-sm text-gray-500 font-medium">Tickets Sold</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{formatNumber(stats.ticketsSold)}</p>
              </div>

              {/* Views */}
              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <Eye className="w-4 h-4 text-purple-600" />
                  </div>
                  <span className="text-sm text-gray-500 font-medium">Total Views</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{formatNumber(stats.totalViews)}</p>
              </div>

              {/* Followers */}
              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center">
                    <Users className="w-4 h-4 text-pink-600" />
                  </div>
                  <span className="text-sm text-gray-500 font-medium">Followers</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{formatNumber(stats.followers)}</p>
              </div>

              {/* Events */}
              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-orange-600" />
                  </div>
                  <span className="text-sm text-gray-500 font-medium">Events Hosted</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{stats.totalEvents}</p>
              </div>
            </div>
          </div>

          {/* Account Status */}
          <div className="bg-purple-50 rounded-2xl p-5 border border-purple-100 flex items-start gap-4">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Star className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h4 className="font-bold text-gray-900 mb-1">Account Status: Active</h4>
              <p className="text-sm text-gray-600 mb-3">
                Your profile is visible to the public. Complete your profile to reach more people.
              </p>
              <button 
                onClick={() => setShowSettings(true)}
                className="text-purple-700 text-sm font-semibold flex items-center gap-1 hover:gap-2 transition-all"
              >
                Edit Profile <ArrowRight className="w-4 h-4" />
              </button>
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
