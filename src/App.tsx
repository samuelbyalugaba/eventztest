import { useState, useEffect } from 'react';
import { EventDetails } from './components/EventDetails';
import { LiveFeed } from './components/LiveFeed';
import { Feed } from './components/Feed';
import { CreateEvent } from './components/CreateEvent';
import { BecomeOrganizer } from './components/BecomeOrganizer';
import { OrganizerProfileSetup } from './components/OrganizerProfileSetup';
import { OrganizerDashboard } from './components/OrganizerDashboard';
import { Notifications } from './components/Notifications';
import { Profile } from './components/Profile';
import { AuthScreen } from './components/AuthScreen';
import { Calendar, Radio, PlusCircle, Bell, User, Rss } from 'lucide-react';
import { Toaster } from 'sonner';
import { supabase } from './utils/supabase/client';

type Tab = 'event' | 'feed' | 'live' | 'create' | 'profile';
type OrganizerView = 'dashboard' | 'createEvent';

export interface PurchasedTicket {
  id: string;
  eventId: number;
  eventTitle: string;
  eventDate: string;
  eventLocation: string;
  ticketNumber: string;
  barcode: string;
  purchaseDate: string;
  customerName: string;
  customerEmail: string;
  price: string;
  ticketType?: 'Normal' | 'VIP' | 'VVIP';
}

// Global messaging interfaces
export interface Message {
  id: number;
  senderId: number;
  text: string;
  timestamp: string;
  read: boolean;
}

export interface Conversation {
  id: number;
  user: {
    name: string;
    username: string;
    avatar: string;
    verified: boolean;
    isOrganizer?: boolean;
  };
  lastMessage: {
    text: string;
    timestamp: string;
    isRead: boolean;
  };
  unreadCount: number;
  messages: Message[];
}

// Mock conversations data
const initialConversations: Conversation[] = [
  {
    id: 1,
    user: {
      name: 'Jazz Events TZ',
      username: '@jazzeventstz',
      avatar: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100&h=100&fit=crop',
      verified: true,
      isOrganizer: true,
    },
    lastMessage: {
      text: 'Thank you for attending! Hope you enjoyed the show 🎷',
      timestamp: '5m ago',
      isRead: false,
    },
    unreadCount: 2,
    messages: [
      { id: 1, senderId: 1, text: 'Hey! Thanks for getting tickets to Jazz Night!', timestamp: '2:30 PM', read: true },
      { id: 2, senderId: 0, text: 'Can\'t wait! What time does it start?', timestamp: '2:32 PM', read: true },
      { id: 3, senderId: 1, text: 'Doors open at 7 PM, show starts at 8 PM sharp!', timestamp: '2:35 PM', read: true },
      { id: 4, senderId: 1, text: 'Thank you for attending! Hope you enjoyed the show 🎷', timestamp: '10:45 PM', read: false },
    ],
  },
  {
    id: 2,
    user: {
      name: 'Sarah Mitchell',
      username: '@sarahmitchell',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
      verified: false,
    },
    lastMessage: {
      text: 'Are you going to the Amapiano Festival this weekend?',
      timestamp: '1h ago',
      isRead: true,
    },
    unreadCount: 0,
    messages: [
      { id: 1, senderId: 2, text: 'Hey! Saw you at the concert last night!', timestamp: 'Yesterday', read: true },
      { id: 2, senderId: 0, text: 'Yes! It was amazing! 🎶', timestamp: 'Yesterday', read: true },
      { id: 3, senderId: 2, text: 'Are you going to the Amapiano Festival this weekend?', timestamp: '1h ago', read: true },
    ],
  },
  {
    id: 3,
    user: {
      name: 'Dar Live Events',
      username: '@darliveevents',
      avatar: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=100&h=100&fit=crop',
      verified: true,
      isOrganizer: true,
    },
    lastMessage: {
      text: 'Your VIP tickets have been confirmed! 🎫',
      timestamp: '3h ago',
      isRead: true,
    },
    unreadCount: 0,
    messages: [
      { id: 1, senderId: 3, text: 'Hi! We noticed you\'re interested in VIP packages', timestamp: '5:20 PM', read: true },
      { id: 2, senderId: 0, text: 'Yes! What\'s included in the VIP package?', timestamp: '5:25 PM', read: true },
      { id: 3, senderId: 3, text: 'Front row seats, meet & greet, and exclusive merch!', timestamp: '5:27 PM', read: true },
      { id: 4, senderId: 3, text: 'Your VIP tickets have been confirmed! 🎫', timestamp: '6:15 PM', read: true },
    ],
  },
  {
    id: 4,
    user: {
      name: 'Marcus Rodriguez',
      username: '@marcusrodriguez',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
      verified: false,
    },
    lastMessage: {
      text: 'Let me know if you need a ride to the venue',
      timestamp: '1d ago',
      isRead: true,
    },
    unreadCount: 0,
    messages: [
      { id: 1, senderId: 4, text: 'Yo! Got my tickets for Friday!', timestamp: 'Mon', read: true },
      { id: 2, senderId: 0, text: 'Nice! Me too! 🔥', timestamp: 'Mon', read: true },
      { id: 3, senderId: 4, text: 'Let me know if you need a ride to the venue', timestamp: 'Tue', read: true },
    ],
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('event');
  const [isOrganizer, setIsOrganizer] = useState(() => {
    // Clear localStorage for testing - remove this line later
    localStorage.removeItem('eventz-is-organizer');
    localStorage.removeItem('eventz-organizer-profile');
    return localStorage.getItem('eventz-is-organizer') === 'true';
  });
  const [hasOrganizerProfile, setHasOrganizerProfile] = useState(() => {
    return localStorage.getItem('eventz-organizer-profile') !== null;
  });
  const [organizerView, setOrganizerView] = useState<OrganizerView>('dashboard');
  const [editingEvent, setEditingEvent] = useState<any>(null);
  
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Ticket management state
  const [purchasedTickets, setPurchasedTickets] = useState<PurchasedTicket[]>(() => {
    const saved = localStorage.getItem('eventz-purchased-tickets');
    return saved ? JSON.parse(saved) : [];
  });

  // Global messaging state
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session check error:', error);
          setIsAuthenticated(false);
        } else if (session?.access_token) {
          setAccessToken(session.access_token);
          setCurrentUser(session.user);
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch (err) {
        console.error('Session check failed:', err);
        setIsAuthenticated(false);
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkSession();
  }, []);

  const handleAuthSuccess = (token: string, user: any) => {
    setAccessToken(token);
    setCurrentUser(user);
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setAccessToken(null);
      setCurrentUser(null);
      setIsAuthenticated(false);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // Handler to start or continue a conversation
  const handleStartConversation = (user: { name: string; username?: string; avatar: string; verified: boolean; isOrganizer?: boolean }) => {
    // Check if conversation already exists (match by username first, then name - case insensitive)
    const existingConv = conversations.find((conv: Conversation) => {
      // If both have username, match by username (case-insensitive)
      if (conv.user.username && user.username) {
        return conv.user.username.toLowerCase().trim() === user.username.toLowerCase().trim();
      }
      // Otherwise match by name (case-insensitive, trimmed)
      return conv.user.name.toLowerCase().trim() === user.name.toLowerCase().trim();
    });
    
    if (existingConv) {
      // Return existing conversation
      return existingConv;
    } else {
      // Create new conversation
      const newConversation: Conversation = {
        id: Date.now(),
        user: {
          name: user.name,
          username: user.username || `@${user.name.toLowerCase().replace(/\s+/g, '')}`,
          avatar: user.avatar,
          verified: user.verified,
          isOrganizer: user.isOrganizer,
        },
        lastMessage: {
          text: 'Start a conversation...',
          timestamp: 'Now',
          isRead: true,
        },
        unreadCount: 0,
        messages: [],
      };
      
      setConversations([newConversation, ...conversations]);
      return newConversation;
    }
  };

  // Handler to send a message
  const handleSendMessage = (conversationId: number, messageText: string) => {
    if (!messageText.trim()) return;

    const newMessage: Message = {
      id: Date.now(),
      senderId: 0, // Current user
      text: messageText.trim(),
      timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      read: true,
    };

    setConversations(conversations.map((conv: Conversation) => {
      if (conv.id === conversationId) {
        return {
          ...conv,
          messages: [...conv.messages, newMessage],
          lastMessage: {
            text: newMessage.text,
            timestamp: 'Just now',
            isRead: true,
          },
        };
      }
      return conv;
    }));
  };

  const handleBecomeOrganizer = () => {
    setIsOrganizer(true);
  };

  const handleProfileComplete = () => {
    setHasOrganizerProfile(true);
    setOrganizerView('dashboard');
  };

  const handleCreateEvent = () => {
    setEditingEvent(null);
    setOrganizerView('createEvent');
  };

  const handleEditEvent = (event: any) => {
    setEditingEvent(event);
    setOrganizerView('createEvent');
  };

  const handleBackToDashboard = () => {
    setEditingEvent(null);
    setOrganizerView('dashboard');
  };

  const handleTicketPurchase = (ticket: PurchasedTicket) => {
    const updatedTickets = [...purchasedTickets, ticket];
    setPurchasedTickets(updatedTickets);
    localStorage.setItem('eventz-purchased-tickets', JSON.stringify(updatedTickets));
  };

  // Show loading screen while checking auth
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-[#8A2BE2]/30 border-t-[#8A2BE2] rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-600 font-medium">Loading EVENTZ...</p>
        </div>
      </div>
    );
  }

  // Show auth screen if not authenticated
  if (!isAuthenticated) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster 
        position="top-center" 
        richColors 
        closeButton
        toastOptions={{
          style: {
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
          },
        }}
      />
      {/* Main Content */}
      <div className="max-w-7xl mx-auto pb-20">
        {activeTab === 'event' && <EventDetails onTicketPurchase={handleTicketPurchase} purchasedTickets={purchasedTickets} conversations={conversations} onStartConversation={handleStartConversation} onSendMessage={handleSendMessage} />}
        {activeTab === 'feed' && <Feed conversations={conversations} onStartConversation={handleStartConversation} onSendMessage={handleSendMessage} />}
        {activeTab === 'live' && <LiveFeed />}
        {activeTab === 'create' && (
          !isOrganizer ? (
            <BecomeOrganizer onComplete={handleBecomeOrganizer} />
          ) : !hasOrganizerProfile ? (
            <OrganizerProfileSetup onComplete={handleProfileComplete} />
          ) : organizerView === 'dashboard' ? (
            <OrganizerDashboard onCreateEvent={handleCreateEvent} onEditEvent={handleEditEvent} />
          ) : (
            <CreateEvent onBack={handleBackToDashboard} event={editingEvent} />
          )
        )}
        {activeTab === 'profile' && (
          <Profile
            conversations={conversations}
            onStartConversation={handleStartConversation}
            onSendMessage={handleSendMessage}
            onLogout={handleLogout}
          />
        )}
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-around items-center h-16">
            <button
              onClick={() => setActiveTab('event')}
              className={`flex flex-col items-center gap-1 px-4 py-2 transition-colors ${
                activeTab === 'event' ? 'text-purple-600' : 'text-gray-500'
              }`}
            >
              <Calendar className="w-6 h-6" />
              <span className="text-xs">Events</span>
            </button>
            <button
              onClick={() => setActiveTab('feed')}
              className={`flex flex-col items-center gap-1 px-4 py-2 transition-colors ${
                activeTab === 'feed' ? 'text-purple-600' : 'text-gray-500'
              }`}
            >
              <Rss className="w-6 h-6" />
              <span className="text-xs">Feed</span>
            </button>
            <button
              onClick={() => setActiveTab('live')}
              className={`flex flex-col items-center gap-1 px-4 py-2 transition-colors relative ${
                activeTab === 'live' ? 'text-purple-600' : 'text-gray-500'
              }`}
            >
              <Radio className="w-6 h-6" />
              <span className="text-xs">Live</span>
              {/* Live indicator dot */}
              <span className="absolute top-1 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
            </button>
            <button
              onClick={() => setActiveTab('create')}
              className={`flex flex-col items-center gap-1 px-4 py-2 transition-colors ${
                activeTab === 'create' ? 'text-purple-600' : 'text-gray-500'
              }`}
            >
              <PlusCircle className="w-6 h-6" />
              <span className="text-xs">Create</span>
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex flex-col items-center gap-1 px-4 py-2 transition-colors ${
                activeTab === 'profile' ? 'text-purple-600' : 'text-gray-500'
              }`}
            >
              <User className="w-6 h-6" />
              <span className="text-xs">Profile</span>
            </button>
          </div>
        </div>
      </nav>
    </div>
  );
}
