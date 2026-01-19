import { useState, useEffect } from 'react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Settings, MapPin, Calendar, Video, Edit2, Bookmark, X, Sparkles, Play, Heart, Ticket, Bell, BellOff, Camera, Image as ImageIcon, Upload, Plus, Smile } from 'lucide-react';
import { toast } from 'sonner';
import { SettingsModal } from './SettingsModal';
import { MediaViewer } from './MediaViewer';
import { TicketViewer } from './TicketViewer';
import { SetAlertModal } from './SetAlertModal';

interface Event {
  id: number;
  name: string;
  date: string;
  image: string;
  location?: string;
  category?: string;
}

interface TicketEvent {
  id: number;
  name: string;
  date: string;
  time: string;
  location: string;
  image: string;
  category: string;
  ticketType: string;
  price: string;
  qrCode: string;
}

interface VideoClip {
  id: number;
  thumbnail: string;
  duration: string;
  views: number;
  likes?: number;
  videoUrl: string;
}

interface Photo {
  id: number;
  url: string;
  likes: number;
  eventName?: string;
}

const attendedEvents: ProfileEvent[] = [
  {
    id: 1,
    name: 'Summer Music Festival',
    date: 'Jun 14, 2025',
    location: 'Dar es Salaam',
    category: 'Music',
    image: 'https://images.unsplash.com/photo-1756978303719-57095d8bd250?w=400&h=300&fit=crop',
  },
  {
    id: 2,
    name: 'Jazz Night at Hyatt',
    date: 'Jun 15, 2025',
    location: 'Zanzibar',
    category: 'Music',
    image: 'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=400&h=300&fit=crop',
  },
  {
    id: 3,
    name: 'Rooftop Party Experience',
    date: 'Jun 16, 2025',
    location: 'Arusha',
    category: 'Party',
    image: 'https://images.unsplash.com/photo-1692275964898-922a80aaf398?w=400&h=300&fit=crop',
  },
  {
    id: 4,
    name: 'Afrobeat Concert',
    date: 'Jun 20, 2025',
    location: 'Dar es Salaam',
    category: 'Music',
    image: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400&h=300&fit=crop',
  },
  {
    id: 5,
    name: 'Tropical Beach Party',
    date: 'May 28, 2025',
    location: 'Zanzibar',
    category: 'Party',
    image: 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=400&h=300&fit=crop',
  },
  {
    id: 6,
    name: 'Electronic Dance Night',
    date: 'May 15, 2025',
    location: 'Dar es Salaam',
    category: 'Music',
    image: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=400&h=300&fit=crop',
  },
  {
    id: 7,
    name: 'Amapiano Live',
    date: 'May 5, 2025',
    location: 'Arusha',
    category: 'Music',
    image: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=400&h=300&fit=crop',
  },
  {
    id: 8,
    name: 'Sunset Rooftop Vibes',
    date: 'Apr 22, 2025',
    location: 'Dar es Salaam',
    category: 'Party',
    image: 'https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=400&h=300&fit=crop',
  },
  {
    id: 9,
    name: 'Bongo Flava Festival',
    date: 'Apr 10, 2025',
    location: 'Dar es Salaam',
    category: 'Music',
    image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=300&fit=crop',
  },
  {
    id: 10,
    name: 'Nyama Choma Night',
    date: 'Mar 28, 2025',
    location: 'Arusha',
    category: 'Food',
    image: 'https://images.unsplash.com/photo-1675674683873-1232862e3c64?w=400&h=300&fit=crop',
  },
  {
    id: 11,
    name: 'Island Rhythm Bash',
    date: 'Mar 15, 2025',
    location: 'Zanzibar',
    category: 'Music',
    image: 'https://images.unsplash.com/photo-1607313029691-fa108ddf807d?w=400&h=300&fit=crop',
  },
  {
    id: 12,
    name: 'Vintage Space Festival',
    date: 'Mar 5, 2025',
    location: 'Dar es Salaam',
    category: 'Music',
    image: 'https://images.unsplash.com/photo-1605286232233-e448650f5914?w=400&h=300&fit=crop',
  },
  {
    id: 13,
    name: 'Coastal Chillout',
    date: 'Feb 20, 2025',
    location: 'Zanzibar',
    category: 'Party',
    image: 'https://images.unsplash.com/photo-1704830657561-a6a663931172?w=400&h=300&fit=crop',
  },
  {
    id: 14,
    name: 'Afro House Live',
    date: 'Feb 10, 2025',
    location: 'Dar es Salaam',
    category: 'Music',
    image: 'https://images.unsplash.com/photo-1751998689590-f7ae39d9d218?w=400&h=300&fit=crop',
  },
  {
    id: 15,
    name: 'New Year Celebration',
    date: 'Jan 1, 2025',
    location: 'Dar es Salaam',
    category: 'Party',
    image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&h=300&fit=crop',
  },
];

const ticketEvents: TicketEvent[] = [
  {
    id: 1,
    name: 'Summer Music Festival',
    date: 'Jun 14, 2025',
    time: '7:00 PM',
    location: 'Dar es Salaam',
    category: 'Music',
    image: 'https://images.unsplash.com/photo-1756978303719-57095d8bd250?w=400&h=300&fit=crop',
    ticketType: 'General Admission',
    price: 'TZS 15,000',
    qrCode: 'https://images.unsplash.com/photo-1561264819-1ccc1c6e0ae9?w=400&h=400&fit=crop',
  },
  {
    id: 2,
    name: 'Jazz Night at Hyatt',
    date: 'Jun 15, 2025',
    time: '8:00 PM',
    location: 'Zanzibar',
    category: 'Music',
    image: 'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=400&h=300&fit=crop',
    ticketType: 'VIP',
    price: 'TZS 30,000',
    qrCode: 'https://images.unsplash.com/photo-1692275964898-922a80aaf398?w=400&h=400&fit=crop',
  },
  {
    id: 3,
    name: 'Rooftop Party Experience',
    date: 'Jun 16, 2025',
    time: '9:00 PM',
    location: 'Arusha',
    category: 'Party',
    image: 'https://images.unsplash.com/photo-1692275964898-922a80aaf398?w=400&h=300&fit=crop',
    ticketType: 'General Admission',
    price: 'TZS 10,000',
    qrCode: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=400&fit=crop',
  },
  {
    id: 4,
    name: 'Afrobeat Concert',
    date: 'Jun 20, 2025',
    time: '10:00 PM',
    location: 'Dar es Salaam',
    category: 'Music',
    image: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400&h=300&fit=crop',
    ticketType: 'VIP',
    price: 'TZS 25,000',
    qrCode: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400&h=400&fit=crop',
  },
  {
    id: 5,
    name: 'Club Night',
    date: 'Jun 21, 2025',
    time: '11:00 PM',
    location: 'Dar es Salaam',
    category: 'Music',
    image: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=400&h=300&fit=crop',
    ticketType: 'General Admission',
    price: 'TZS 12,000',
    qrCode: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=400&h=400&fit=crop',
  },
  {
    id: 6,
    name: 'Electronic Festival',
    date: 'Jun 22, 2025',
    time: '12:00 AM',
    location: 'Arusha',
    category: 'Music',
    image: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=400&h=300&fit=crop',
    ticketType: 'VIP',
    price: 'TZS 40,000',
    qrCode: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=400&h=400&fit=crop',
  },
  {
    id: 7,
    name: 'Indie Concert',
    date: 'Jun 23, 2025',
    time: '1:00 AM',
    location: 'Zanzibar',
    category: 'Music',
    image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=300&fit=crop',
    ticketType: 'General Admission',
    price: 'TZS 18,000',
    qrCode: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=400&fit=crop',
  },
  {
    id: 8,
    name: 'Outdoor Festival',
    date: 'Jun 24, 2025',
    time: '2:00 AM',
    location: 'Dar es Salaam',
    category: 'Music',
    image: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=400&h=300&fit=crop',
    ticketType: 'VIP',
    price: 'TZS 35,000',
    qrCode: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=400&h=400&fit=crop',
  },
  {
    id: 9,
    name: 'Beach Party',
    date: 'Jun 25, 2025',
    time: '3:00 AM',
    location: 'Zanzibar',
    category: 'Party',
    image: 'https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=400&h=300&fit=crop',
    ticketType: 'General Admission',
    price: 'TZS 16,000',
    qrCode: 'https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=400&h=400&fit=crop',
  },
];

const videoClips: VideoClip[] = [
  {
    id: 1,
    thumbnail: 'https://images.unsplash.com/photo-1561264819-1ccc1c6e0ae9?w=400&h=400&fit=crop',
    duration: '0:45',
    views: 1234,
    likes: 89,
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  },
  {
    id: 2,
    thumbnail: 'https://images.unsplash.com/photo-1692275964898-922a80aaf398?w=400&h=400&fit=crop',
    duration: '1:20',
    views: 2567,
    likes: 156,
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
  },
  {
    id: 3,
    thumbnail: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=400&fit=crop',
    duration: '0:58',
    views: 890,
    likes: 67,
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  },
  {
    id: 4,
    thumbnail: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400&h=400&fit=crop',
    duration: '1:05',
    views: 3421,
    likes: 234,
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  },
  {
    id: 5,
    thumbnail: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=400&h=400&fit=crop',
    duration: '2:15',
    views: 5678,
    likes: 412,
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
  },
  {
    id: 6,
    thumbnail: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=400&fit=crop',
    duration: '1:45',
    views: 1890,
    likes: 145,
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
  },
];

const photos: Photo[] = [
  {
    id: 1,
    url: 'https://images.unsplash.com/photo-1756978303719-57095d8bd250?w=400&h=400&fit=crop',
    likes: 245,
    eventName: 'Summer Music Festival',
  },
  {
    id: 2,
    url: 'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=400&h=400&fit=crop',
    likes: 189,
    eventName: 'Jazz Night',
  },
  {
    id: 3,
    url: 'https://images.unsplash.com/photo-1692275964898-922a80aaf398?w=400&h=400&fit=crop',
    likes: 321,
    eventName: 'Rooftop Party',
  },
  {
    id: 4,
    url: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400&h=400&fit=crop',
    likes: 412,
    eventName: 'Afrobeat Concert',
  },
  {
    id: 5,
    url: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=400&h=400&fit=crop',
    likes: 267,
    eventName: 'Club Night',
  },
  {
    id: 6,
    url: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=400&h=400&fit=crop',
    likes: 534,
    eventName: 'Electronic Festival',
  },
  {
    id: 7,
    url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=400&fit=crop',
    likes: 198,
    eventName: 'Indie Concert',
  },
  {
    id: 8,
    url: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=400&h=400&fit=crop',
    likes: 389,
    eventName: 'Outdoor Festival',
  },
  {
    id: 9,
    url: 'https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=400&h=400&fit=crop',
    likes: 445,
    eventName: 'Beach Party',
  },
];

interface ProfileProps {
  conversations: any[];
  onStartConversation: (user: any) => any;
  onSendMessage: (conversationId: number, messageText: string) => void;
  onLogout: () => Promise<void>;
}

export function Profile({ conversations, onStartConversation, onSendMessage, onLogout }: ProfileProps) {
  const [activeTab, setActiveTab] = useState<'tickets' | 'events' | 'photos' | 'videos' | 'saved'>('events');
  const [savedEvents, setSavedEvents] = useState<ProfileEvent[]>([]);
  const [showSavedEventsModal, setShowSavedEventsModal] = useState(false);
  const [eventReminders, setEventReminders] = useState<Set<number>>(new Set());
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showOrganizerOnboarding, setShowOrganizerOnboarding] = useState(false);
  const [isOrganizer, setIsOrganizer] = useState(() => {
    return localStorage.getItem('eventz-is-organizer') === 'true';
  });
  const [showSharePostModal, setShowSharePostModal] = useState(false);
  const [postCaption, setPostCaption] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [postType, setPostType] = useState<'photo' | 'video' | null>(null);
  const [showMediaViewer, setShowMediaViewer] = useState(false);
  const [mediaViewerIndex, setMediaViewerIndex] = useState(0);
  const [mediaViewerType, setMediaViewerType] = useState<'photo' | 'video'>('photo');
  const [showTicketViewer, setShowTicketViewer] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<TicketEvent | null>(null);
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [showSetAlertModal, setShowSetAlertModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<ProfileEvent | null>(null);

  // Load saved events from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('eventz_saved_events');
    if (saved) {
      setSavedEvents(JSON.parse(saved));
    }
    
    // Load reminders from localStorage
    const reminders = localStorage.getItem('eventz_event_reminders');
    if (reminders) {
      setEventReminders(new Set(JSON.parse(reminders)));
    }
  }, []);

  // Listen for storage changes
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('eventz_saved_events');
      if (saved) {
        setSavedEvents(JSON.parse(saved));
      }
      
      const reminders = localStorage.getItem('eventz_event_reminders');
      if (reminders) {
        setEventReminders(new Set(JSON.parse(reminders)));
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('savedEventsUpdated', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('savedEventsUpdated', handleStorageChange);
    };
  }, []);

  // Toggle reminder for saved events
  const toggleReminder = (eventId: number, eventName: string) => {
    const newReminders = new Set(eventReminders);
    
    if (newReminders.has(eventId)) {
      // Remove reminder
      newReminders.delete(eventId);
      localStorage.setItem('eventz_event_reminders', JSON.stringify([...newReminders]));
      setEventReminders(newReminders);
      toast.success('Reminder removed', {
        description: `You won't be notified about ${eventName}`,
        duration: 2000,
      });
    } else {
      // Add reminder
      newReminders.add(eventId);
      localStorage.setItem('eventz_event_reminders', JSON.stringify([...newReminders]));
      setEventReminders(newReminders);
      toast.success('Reminder set! 🔔', {
        description: `We'll notify you before ${eventName}`,
        duration: 2000,
      });
    }
  };

  return (
    <div className="bg-white min-h-screen pb-20">
      {/* Compact Header */}
      <div className="relative">
        {/* Cover Photo */}
        <div className="relative w-full h-32 overflow-hidden">
          <img
            src="https://i.ibb.co/HDY1fq6m/G-Cover.jpg"
            alt="Cover"
            className="w-full h-full object-cover"
          />
          <button className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-md hover:bg-white transition-colors z-10" onClick={() => setShowSettingsModal(true)}>
            <Settings className="w-4 h-4 text-gray-700" />
          </button>
        </div>

        {/* Profile Info - Centered and Compact */}
        <div className="px-6 -mt-12">
          {/* Profile Picture */}
          <div className="flex justify-center mb-4">
            <div className="relative">
              <img
                src="https://i.ibb.co/3559hRDP/G-Profile.jpg"
                alt="Profile"
                className="w-24 h-24 rounded-full border-4 border-white shadow-lg object-cover"
              />
            </div>
          </div>

          {/* Name and Edit Button */}
          <div className="text-center mb-3">
            <div className="flex items-center justify-center gap-2 mb-1">
              <h1 className="text-gray-900">George Mukulasi</h1>
              <button className="p-1.5 hover:bg-gray-100 rounded-full transition-colors group" title="Edit Profile">
                <Edit2 className="w-4 h-4 text-gray-500 group-hover:text-purple-600 transition-colors" />
              </button>
            </div>
            <p className="text-gray-600 text-sm mb-2">@georgemukulasi</p>
            
            {/* Bio - Compact */}
            <p className="text-gray-700 text-sm max-w-md mx-auto leading-relaxed">
              Music enthusiast & event lover 🎵 Always chasing the next great experience
            </p>
          </div>

          {/* Stats - Compact and Modern */}
          <div className="flex justify-center gap-8 mb-5 py-3 border-y border-gray-100">
            <div className="text-center">
              <p className="text-gray-900">47</p>
              <p className="text-gray-500 text-xs">Events</p>
            </div>
            <div className="text-center">
              <p className="text-gray-900">2.4K</p>
              <p className="text-gray-500 text-xs">Followers</p>
            </div>
            <div className="text-center">
              <p className="text-gray-900">892</p>
              <p className="text-gray-500 text-xs">Following</p>
            </div>
          </div>

          {/* Modern Tab Navigation */}
          <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('events')}
              className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-lg transition-all ${
                activeTab === 'events'
                  ? 'bg-white text-purple-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Calendar className="w-6 h-6" />
              <span className="text-[11px]">Events</span>
            </button>
            <button
              onClick={() => setActiveTab('photos')}
              className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-lg transition-all ${
                activeTab === 'photos'
                  ? 'bg-white text-purple-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-[11px]">Photos</span>
            </button>
            <button
              onClick={() => setActiveTab('videos')}
              className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-lg transition-all ${
                activeTab === 'videos'
                  ? 'bg-white text-purple-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Video className="w-6 h-6" />
              <span className="text-[11px]">Videos</span>
            </button>
            <button
              onClick={() => setActiveTab('saved')}
              className={`relative flex-1 flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-lg transition-all ${
                activeTab === 'saved'
                  ? 'bg-white text-purple-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="relative">
                <Bookmark className={`w-6 h-6 ${activeTab === 'saved' ? 'fill-purple-600' : ''}`} />
                {savedEvents.length > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 w-4.5 h-4.5 bg-purple-600 text-white rounded-full flex items-center justify-center text-[10px] shadow-md font-medium">
                    {savedEvents.length}
                  </span>
                )}
              </div>
              <span className="text-[11px]">Saved</span>
            </button>
            <button
              onClick={() => setActiveTab('tickets')}
              className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-lg transition-all ${
                activeTab === 'tickets'
                  ? 'bg-white text-purple-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Ticket className="w-6 h-6" />
              <span className="text-[11px]">Tickets</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="px-6">
        {/* Attended Events - Vertical Cards */}
        {activeTab === 'events' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-gray-900">Attended Events</h3>
              <span className="text-gray-500 text-sm">{attendedEvents.length} events</span>
            </div>
            {attendedEvents.slice(0, showAllEvents ? attendedEvents.length : 6).map((event) => (
              <div key={event.id} className="flex gap-4 bg-white border border-gray-100 rounded-xl p-3 hover:shadow-md transition-all cursor-pointer group">
                <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                  <ImageWithFallback
                    src={event.image}
                    alt={event.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-gray-900 text-sm mb-1 line-clamp-1">{event.name}</h4>
                  <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                    <Calendar className="w-3 h-3" />
                    <span>{event.date}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500 text-xs">
                    <MapPin className="w-3 h-3" />
                    <span>{event.location}</span>
                  </div>
                </div>
                <div className="flex items-center">
                  <span className="px-2.5 py-1 bg-purple-50 text-purple-600 text-xs rounded-full">
                    {event.category}
                  </span>
                </div>
              </div>
            ))}
            
            {/* View All / Show Less Button */}
            {attendedEvents.length > 6 && (
              <div className="mt-4">
                <button
                  onClick={() => setShowAllEvents(!showAllEvents)}
                  className="w-full bg-gradient-to-r from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 text-purple-600 py-3 px-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 group border border-purple-200"
                >
                  <span className="font-medium">
                    {showAllEvents ? 'Show Less' : `View All ${attendedEvents.length} Events`}
                  </span>
                  <svg
                    className={`w-5 h-5 transition-transform duration-300 ${showAllEvents ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Photos Grid - Instagram Style */}
        {activeTab === 'photos' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-900">Photos</h3>
              <span className="text-gray-500 text-sm">{photos.length} photos</span>
            </div>
            <div className="grid grid-cols-3 gap-1">
              {photos.map((photo, index) => (
                <div
                  key={photo.id}
                  onClick={() => {
                    setMediaViewerIndex(index);
                    setMediaViewerType('photo');
                    setShowMediaViewer(true);
                  }}
                  className="relative aspect-square cursor-pointer group"
                >
                  <ImageWithFallback
                    src={photo.url}
                    alt={`Photo ${photo.id}`}
                    className="w-full h-full object-cover"
                  />
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="flex items-center gap-1 text-white text-sm">
                      <Heart className="w-4 h-4 fill-white" />
                      <span>{photo.likes}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Videos Grid - Instagram Style */}
        {activeTab === 'videos' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-900">Videos</h3>
              <span className="text-gray-500 text-sm">{videoClips.length} videos</span>
            </div>
            <div className="grid grid-cols-3 gap-1">
              {videoClips.map((video, index) => (
                <div
                  key={video.id}
                  onClick={() => {
                    setMediaViewerIndex(index);
                    setMediaViewerType('video');
                    setShowMediaViewer(true);
                  }}
                  className="relative aspect-square cursor-pointer group"
                >
                  <ImageWithFallback
                    src={video.thumbnail}
                    alt={`Video ${video.id}`}
                    className="w-full h-full object-cover"
                  />
                  {/* Duration Badge */}
                  <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 bg-black/80 rounded text-white text-[10px]">
                    {video.duration}
                  </div>
                  {/* Hover Stats */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="flex flex-col items-center gap-1 text-white text-xs">
                      <div className="flex items-center gap-1">
                        <Play className="w-3 h-3" />
                        <span>{video.views.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Saved Events - Compact Cards */}
        {activeTab === 'saved' && (
          <>
            {savedEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-6">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mb-4 relative">
                  <Bookmark className="w-10 h-10 text-purple-600" />
                  <Sparkles className="w-5 h-5 text-pink-500 absolute -top-1 -right-1 animate-pulse" />
                </div>
                <h3 className="text-gray-900 mb-2">No Saved Events Yet</h3>
                <p className="text-gray-600 text-center text-sm max-w-xs leading-relaxed">
                  Discover amazing events and tap the bookmark icon to save them here
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-gray-900">Saved Events</h3>
                  <span className="text-gray-500 text-sm">{savedEvents.length} saved</span>
                </div>
                {savedEvents.map((event) => (
                  <div key={event.id} className="flex gap-4 bg-white border border-gray-100 rounded-xl p-3 hover:shadow-md transition-all cursor-pointer group">
                    <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                      <ImageWithFallback
                        src={event.image}
                        alt={event.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                      {/* Saved Badge */}
                      <div className="absolute top-1 right-1 w-5 h-5 bg-purple-600 rounded-full flex items-center justify-center shadow-md">
                        <Bookmark className="w-2.5 h-2.5 text-white fill-white" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-gray-900 text-sm mb-1 line-clamp-2">{event.name}</h4>
                      <div className="flex items-center gap-2 text-gray-500 text-xs">
                        <Calendar className="w-3 h-3" />
                        <span>{event.date}</span>
                      </div>
                    </div>
                    {/* Reminder Bell Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEvent({
                          id: event.id,
                          name: event.name,
                          date: event.date,
                          image: event.image,
                          location: event.location || 'Location TBA',
                          category: event.category || 'Event',
                        });
                        setShowSetAlertModal(true);
                      }}
                      className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                        eventReminders.has(event.id)
                          ? 'bg-purple-600 text-white shadow-md'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                      title={eventReminders.has(event.id) ? 'Manage reminder' : 'Set reminder'}
                    >
                      <Bell className={`w-4 h-4 ${eventReminders.has(event.id) ? 'fill-white' : ''}`} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Tickets Grid - Instagram Style */}
        {activeTab === 'tickets' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-900">Tickets</h3>
              <span className="text-gray-500 text-sm">{ticketEvents.length} tickets</span>
            </div>
            <div className="grid grid-cols-3 gap-1">
              {ticketEvents.map((ticket) => (
                <div
                  key={ticket.id}
                  onClick={() => {
                    setSelectedTicket(ticket);
                    setShowTicketViewer(true);
                  }}
                  className="relative aspect-square cursor-pointer group"
                >
                  <ImageWithFallback
                    src={ticket.image}
                    alt={`Ticket ${ticket.id}`}
                    className="w-full h-full object-cover"
                  />
                  {/* Ticket Type Badge */}
                  <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-black/80 rounded text-white text-[10px]">
                    {ticket.ticketType}
                  </div>
                  {/* Price Badge */}
                  <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 bg-black/80 rounded text-white text-[10px]">
                    {ticket.price}
                  </div>
                  {/* QR Code Icon */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Ticket className="w-5 h-5 text-purple-600 fill-purple-600 ml-0.5" />
                    </div>
                  </div>
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Saved Events Modal - Keep existing modal for alternate access */}
      {showSavedEventsModal && (
        <div 
          className="fixed inset-0 z-50 flex items-end justify-center"
          onClick={() => setShowSavedEventsModal(false)}
        >
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300"
            style={{ animation: 'fadeIn 0.3s ease-out' }}
          ></div>
          
          {/* Modal Content */}
          <div 
            className="relative w-full max-w-7xl bg-white rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col overflow-hidden"
            style={{ animation: 'slideUp 0.4s cubic-bezier(0.32, 0.72, 0, 1)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative px-6 pt-6 pb-4 border-b border-gray-100 bg-gradient-to-br from-purple-50 via-white to-pink-50">
              {/* Drag Indicator */}
              <div className="flex justify-center mb-3">
                <div className="w-12 h-1.5 bg-gray-300 rounded-full"></div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <Bookmark className="w-6 h-6 text-white fill-white" />
                  </div>
                  <div>
                    <h2 className="text-gray-900">Saved Events</h2>
                    <p className="text-gray-600 text-sm">
                      {savedEvents.length} {savedEvents.length === 1 ? 'event' : 'events'} saved
                    </p>
                  </div>
                </div>
                
                <button 
                  onClick={() => setShowSavedEventsModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              {savedEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 px-6">
                  <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mb-6 relative">
                    <Bookmark className="w-12 h-12 text-purple-600" />
                    <Sparkles className="w-6 h-6 text-pink-500 absolute -top-1 -right-1 animate-pulse" />
                  </div>
                  <h3 className="text-gray-900 mb-3 text-center">Your Event Collection Awaits</h3>
                  <p className="text-gray-600 text-center max-w-md leading-relaxed">
                    Discover amazing events and tap the bookmark icon to save them here. Build your perfect event collection!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {savedEvents.map((event, index) => (
                    <div 
                      key={event.id} 
                      className="group cursor-pointer"
                      style={{ animation: `fadeInUp 0.5s ease-out ${index * 0.1}s both` }}
                    >
                      <div className="relative w-full h-56 rounded-2xl overflow-hidden mb-3 shadow-md hover:shadow-xl transition-all duration-300">
                        <ImageWithFallback
                          src={event.image}
                          alt={event.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                        
                        {/* Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
                        
                        {/* Saved Badge - Animated */}
                        <div className="absolute top-4 right-4 w-10 h-10 bg-white/95 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                          <Bookmark className="w-5 h-5 text-purple-600 fill-purple-600" />
                        </div>
                        
                        {/* Event Info */}
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                          <p className="text-white mb-1 line-clamp-2 leading-snug">{event.name}</p>
                          <div className="flex items-center gap-2 text-white/90 text-xs">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>{event.date}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <style dangerouslySetInnerHTML={{__html: `
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            
            @keyframes slideUp {
              from {
                transform: translateY(100%);
                opacity: 0;
              }
              to {
                transform: translateY(0);
                opacity: 1;
              }
            }
            
            @keyframes fadeInUp {
              from {
                opacity: 0;
                transform: translateY(20px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
          `}} />
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <SettingsModal
          onClose={() => setShowSettingsModal(false)}
          onLogout={onLogout}
        />
      )}

      {/* Floating Action Button - Share Post */}
      <button
        onClick={() => setShowSharePostModal(true)}
        className="fixed bottom-24 right-6 w-16 h-16 rounded-full bg-[#8A2BE2] shadow-2xl hover:shadow-purple-500/50 hover:scale-110 active:scale-95 transition-all duration-300 flex items-center justify-center z-40 group"
        title="Share a post"
      >
        <Camera className="w-7 h-7 text-white group-hover:rotate-12 transition-transform" />
      </button>

      {/* Share Post Modal */}
      {showSharePostModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => {
            setShowSharePostModal(false);
            setPostType(null);
            setSelectedFiles([]);
            setPostCaption('');
          }}
        >
          <div 
            className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative px-6 py-5 border-b border-gray-200 bg-purple-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-[#8A2BE2] rounded-2xl flex items-center justify-center shadow-lg">
                    <Camera className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-gray-900 text-xl">Share a Post</h2>
                    <p className="text-gray-600 text-sm">Share your event moments</p>
                  </div>
                </div>
                
                <button 
                  onClick={() => {
                    setShowSharePostModal(false);
                    setPostType(null);
                    setSelectedFiles([]);
                    setPostCaption('');
                  }}
                  className="p-2 hover:bg-white/80 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {!postType ? (
                /* Media Type Selection */
                <div className="space-y-4">
                  <p className="text-gray-700 text-center mb-6">What would you like to share?</p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {/* Photo Button */}
                    <button
                      onClick={() => {
                        setPostType('photo');
                        // Simulate file selection
                        setTimeout(() => {
                          setSelectedFiles(['https://images.unsplash.com/photo-1756978303719-57095d8bd250?w=800&h=600&fit=crop']);
                        }, 300);
                      }}
                      className="group relative overflow-hidden rounded-2xl p-8 bg-gradient-to-br from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 transition-all hover:shadow-lg hover:scale-105 active:scale-95"
                    >
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 bg-purple-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                          <ImageIcon className="w-8 h-8 text-white" />
                        </div>
                        <div className="text-center">
                          <h3 className="text-gray-900 mb-1">Photos</h3>
                          <p className="text-gray-600 text-sm">Share event photos</p>
                        </div>
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-600/0 to-purple-600/5 group-hover:from-purple-600/5 group-hover:to-purple-600/10 transition-all"></div>
                    </button>

                    {/* Video Button */}
                    <button
                      onClick={() => {
                        setPostType('video');
                        // Simulate file selection
                        setTimeout(() => {
                          setSelectedFiles(['https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=800&h=600&fit=crop']);
                        }, 300);
                      }}
                      className="group relative overflow-hidden rounded-2xl p-8 bg-gradient-to-br from-pink-50 to-pink-100 hover:from-pink-100 hover:to-pink-200 transition-all hover:shadow-lg hover:scale-105 active:scale-95"
                    >
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 bg-pink-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                          <Video className="w-8 h-8 text-white" />
                        </div>
                        <div className="text-center">
                          <h3 className="text-gray-900 mb-1">Videos</h3>
                          <p className="text-gray-600 text-sm">Share event clips</p>
                        </div>
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-br from-pink-600/0 to-pink-600/5 group-hover:from-pink-600/5 group-hover:to-pink-600/10 transition-all"></div>
                    </button>
                  </div>

                  <p className="text-gray-500 text-xs text-center mt-6">Upload from your event memories</p>
                </div>
              ) : (
                /* Post Creation Form */
                <div className="space-y-5">
                  {/* Preview Area */}
                  {selectedFiles.length > 0 && (
                    <div className="relative aspect-video rounded-2xl overflow-hidden bg-gray-100 shadow-lg">
                      <img 
                        src={selectedFiles[0]} 
                        alt="Preview" 
                        className="w-full h-full object-cover"
                      />
                      {postType === 'video' && (
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                          <div className="w-16 h-16 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-xl">
                            <Play className="w-8 h-8 text-purple-600 fill-purple-600 ml-1" />
                          </div>
                        </div>
                      )}
                      {/* Type Badge */}
                      <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-sm shadow-lg">
                        <div className="flex items-center gap-2">
                          {postType === 'photo' ? (
                            <ImageIcon className="w-4 h-4 text-purple-600" />
                          ) : (
                            <Video className="w-4 h-4 text-pink-600" />
                          )}
                          <span className="text-sm capitalize text-gray-900">{postType}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Caption Input */}
                  <div className="space-y-2">
                    <label className="text-gray-700 text-sm flex items-center gap-2">
                      <Smile className="w-4 h-4 text-purple-600" />
                      Add a caption
                    </label>
                    <textarea
                      value={postCaption}
                      onChange={(e) => setPostCaption(e.target.value)}
                      placeholder="Share your experience... #EVENTZ"
                      className="w-full px-4 py-3 rounded-xl bg-gray-50 text-gray-900 placeholder-gray-500 outline-none focus:ring-2 focus:ring-purple-600 transition-all resize-none"
                      rows={3}
                    />
                    <p className="text-gray-500 text-xs">{postCaption.length}/500 characters</p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => {
                        setPostType(null);
                        setSelectedFiles([]);
                        setPostCaption('');
                      }}
                      className="flex-1 px-6 py-3.5 rounded-xl border-2 border-gray-200 text-gray-700 hover:bg-gray-50 transition-all"
                    >
                      Back
                    </button>
                    <button
                      onClick={() => {
                        toast.success('Post shared successfully! 🎉', {
                          description: 'Your event moment has been shared with your followers',
                        });
                        setShowSharePostModal(false);
                        setPostType(null);
                        setSelectedFiles([]);
                        setPostCaption('');
                      }}
                      className="flex-1 bg-[#8A2BE2] text-white px-6 py-3.5 rounded-xl hover:shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      <Upload className="w-5 h-5" />
                      Share Post
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Media Viewer */}
      {showMediaViewer && (
        <MediaViewer
          media={mediaViewerType === 'photo' ? photos : videoClips}
          initialIndex={mediaViewerIndex}
          onClose={() => setShowMediaViewer(false)}
          type={mediaViewerType}
        />
      )}

      {/* Ticket Viewer */}
      {showTicketViewer && selectedTicket && (
        <TicketViewer
          ticket={selectedTicket}
          onClose={() => {
            setShowTicketViewer(false);
            setSelectedTicket(null);
          }}
        />
      )}

      {/* Set Alert Modal */}
      {showSetAlertModal && selectedEvent && (
        <SetAlertModal
          event={selectedEvent}
          onClose={() => {
            setShowSetAlertModal(false);
            setSelectedEvent(null);
          }}
        />
      )}
    </div>
  );
}
