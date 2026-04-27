import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate, Link } from 'react-router-dom';
import { EventDetails } from './components/EventDetails';
import { useProfileStore } from './store/profileStore';
import { LiveFeed } from './components/LiveFeed';
import { Feed } from './components/Feed';
import { Profile } from './components/Profile';
import { AuthScreen } from './components/AuthScreen';
import { Calendar, Radio, User, Rss } from 'lucide-react';

// Lazy-loaded route components (not needed on initial load)
const CreateEventWrapper = lazy(() => import('./components/CreateEventWrapper').then(m => ({ default: m.CreateEventWrapper })));
const PostDetailWrapper = lazy(() => import('./components/PostDetailWrapper').then(m => ({ default: m.PostDetailWrapper })));
const ProfileModalWrapper = lazy(() => import('./components/ProfileModalWrapper').then(m => ({ default: m.ProfileModalWrapper })));
const EventDetailWrapper = lazy(() => import('./components/EventDetailWrapper').then(m => ({ default: m.EventDetailWrapper })));
const CreatePostPage = lazy(() => import('./components/CreatePostPage'));

const RouteFallback = () => (
  <div className="flex items-center justify-center min-h-[40vh]">
    <div className="w-8 h-8 border-3 border-purple-300 border-t-purple-600 rounded-full animate-spin" />
  </div>
);
import { Toaster, toast } from 'sonner';
import { supabase } from './utils/supabase/client';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { 
  getProfile, 
  getConversations, 
  getMessages, 
  sendMessage, 
  startConversation,
  markMessagesAsRead,
  subscribeToAllMessages,
  getLiveStreams,
  getMutualFollows,
  subscribeToOnlineUsers,
  deleteConversation
} from './utils/supabase/api';
import { Message, Conversation } from './types';
import { getPosts } from './utils/supabase/api';
import { formatTimeAgo } from './utils/format';

const FEED_CACHE_KEY = 'eventz-feed-cache-v1';
const FEED_CACHE_TTL_MS = 5 * 60 * 1000;
const isVideoAsset = (url?: string) => {
  if (!url) return false;
  const cleaned = url.split('#')[0].split('?')[0];
  return /\.(mp4|webm|ogg|mov)$/i.test(cleaned);
};

const slugifyUsername = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');
const buildUsernameCandidates = (seed: string) => {
  const base = slugifyUsername(seed) || 'user';
  const suffix = Date.now().toString(36).slice(-4);
  return [
    base,
    `${base}${suffix}`,
    `${base}${Math.floor(Math.random() * 9000) + 1000}`,
    `user${Date.now().toString().slice(-6)}`
  ];
};

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const prevTabPathRef = useRef<string | null>(null);
  const prevWasModalRef = useRef(false);
  const [isOrganizer, setIsOrganizer] = useState(false);
  
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [currentUser, setCurrentUser] = useState<SupabaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null); // Store full profile data

  // Global messaging state
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [hasLiveEvents, setHasLiveEvents] = useState(false);
  const [onlineFriends, setOnlineFriends] = useState<any[]>([]);

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          setIsAuthenticated(false);
          // If refresh token is invalid, ensure we clear local state
          if (error.message && (error.message.includes("Invalid Refresh Token") || error.message.includes("Refresh Token Not Found"))) {
             await supabase.auth.signOut();
          }
        } else if (session?.access_token) {
          setCurrentUser(session.user);
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch (err) {
        setIsAuthenticated(false);
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setCurrentUser(session.user);
        setIsAuthenticated(true);
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        setIsAuthenticated(false);
        setIsOrganizer(false);
      } else if (event === 'TOKEN_REFRESHED' && session) {
        setCurrentUser(session.user);
        setIsAuthenticated(true);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleAuthSuccess = (_token: string, user: any) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    // When someone signs up/signs in, it opens the /events page
    navigate('/events', { replace: true });
  };

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const prefetchFeed = async () => {
      try {
        const cachedRaw = localStorage.getItem(FEED_CACHE_KEY);
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw);
          if (cached.timestamp && Date.now() - cached.timestamp < FEED_CACHE_TTL_MS) {
            return;
          }
        }

        const fresh = await getPosts({ currentUserId: currentUser?.id, limit: 20, offset: 0 });
        const mapped = (fresh || []).map((p: any) => {
          const isOrganizerPage = !!p.posted_as_organizer;
          const displayName = p.user?.full_name || p.user?.username || 'Unknown User';
          const avatarUrl = p.user?.avatar_url;
          return {
            id: p.id,
            user_id: p.user_id,
            user: {
              id: p.user?.id || 'unknown',
              name: displayName || 'Unknown',
              username: p.user?.username || '@unknown',
              avatar: avatarUrl || '',
              verified: p.user?.verified || false,
              isOrganizer: p.user?.is_organizer || false,
              isOrganizerPage: isOrganizerPage
            },
            event: p.event ? {
              id: p.event.id,
              name: p.event.title,
              date: p.event.date,
              time: p.event.time,
              location: p.event.location,
              image: p.event.image_url,
              price: p.event.price_range,
            } : undefined,
            content: {
              text: p.content,
              images: p.image_urls,
              image: p.image_urls?.[0],
              hashtags: p.hashtags,
            },
            timestamp: formatTimeAgo(p.created_at),
            likes: p.likes_count || 0,
            comments: [],
            comments_count: p.comments_count || 0,
            shares: 0,
            views: p.views || 0,
            isLiked: p.is_liked || false,
            isSaved: p.is_saved || false,
            isHighlight: !!p.video_url,
            highlights: p.video_url ? [{
              id: p.id,
              thumbnail: (p.image_urls?.find((url: string) => !isVideoAsset(url))) || 'https://images.unsplash.com/photo-1516280440614-6697288d5d38?w=300&h=500&fit=crop',
              duration: p.duration || '',
              title: p.content || 'Video Highlight',
              videoUrl: p.video_url,
              views: p.views || 0,
            }] : undefined,
            mutualFriends: [],
          };
        });
        localStorage.setItem(FEED_CACHE_KEY, JSON.stringify({ posts: mapped, timestamp: Date.now() }));
      } catch (_e) {
        // Silent fail: prefetch is best-effort
      }
    };

    const schedulePrefetch = () => {
      if ('requestIdleCallback' in window) {
        const idleHandle = window.requestIdleCallback(() => {
          void prefetchFeed();
        }, { timeout: 5000 });
        return { type: 'idle' as const, handle: idleHandle };
      }

      const timeoutHandle = window.setTimeout(() => {
        void prefetchFeed();
      }, 3000);
      return { type: 'timeout' as const, handle: timeoutHandle as unknown as number };
    };

    const scheduled = schedulePrefetch();
    return () => {
      if (scheduled.type === 'timeout') {
        window.clearTimeout(scheduled.handle);
      } else {
        window.cancelIdleCallback(scheduled.handle);
      }
    };
  }, [isAuthenticated, currentUser?.id]);
  // Fetch user profile to determine organizer status
  useEffect(() => {
    const fetchProfile = async () => {
      if (isAuthenticated && currentUser) {
        try {
          const profile = await getProfile(currentUser.id);
          
          if (profile) {
            setUserProfile(profile);
            useProfileStore.getState().setProfile(profile);
            // Determine if user is an organizer
            const isOrg = profile.is_organizer || false;
            setIsOrganizer(isOrg);
          } else {
            const meta: any = currentUser.user_metadata || {};
            const nameCandidate =
              meta.full_name ||
              meta.name ||
              (typeof currentUser.email === 'string' ? currentUser.email.split('@')[0] : null) ||
              'User';
            const avatarCandidate = meta.avatar_url || meta.picture || null;

            const usernameCandidates = buildUsernameCandidates(String(nameCandidate));
            for (const username of usernameCandidates) {
              const { error } = await supabase
                .from('profiles')
                .upsert(
                  [
                    {
                      id: currentUser.id,
                      email: currentUser.email,
                      full_name: nameCandidate,
                      username,
                      avatar_url: avatarCandidate,
                    },
                  ],
                  { onConflict: 'id', ignoreDuplicates: true }
                );

              if (!error) {
                break;
              }
            }

            const created = await getProfile(currentUser.id);
            if (created) {
              setUserProfile(created);
              useProfileStore.getState().setProfile(created);
              setIsOrganizer(created.is_organizer || false);
            }
          }
        } catch (error) {
        }
      } else {
        setUserProfile(null);
        useProfileStore.getState().clear();
      }
    };

    fetchProfile();

    // Listen for manual profile updates from other components
    window.addEventListener('profileUpdated', fetchProfile);
    return () => window.removeEventListener('profileUpdated', fetchProfile);
  }, [isAuthenticated, currentUser]);

  // Fetch conversations when authenticated
  useEffect(() => {
    const fetchConversations = async () => {
      if (isAuthenticated && currentUser) {
        try {
          const apiConvs = await getConversations(currentUser.id);
          
          const formattedConvs: Conversation[] = apiConvs.map((c: any) => {
            const otherUser = c.participant1_id === currentUser.id ? c.participant2 : c.participant1;
            
            return {
              id: c.id,
              user: {
                id: otherUser?.id,
                name: otherUser?.full_name || 'Unknown User',
                username: otherUser?.username || '',
                avatar: otherUser?.avatar_url,
                verified: otherUser?.verified || false,
                isOrganizer: otherUser?.is_organizer || false,
              },
              lastMessage: {
                text: c.last_message?.content || '',
                timestamp: c.last_message ? new Date(c.last_message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
                isRead: c.last_message?.is_read || false,
              },
              unreadCount: c.unread_count || 0,
              messages: [] // Start with empty messages, fetch on demand
            };
          });
          
          setConversations(formattedConvs);
        } catch (error) {
        }
      } else {
        setConversations([]);
      }
    };

    fetchConversations();
  }, [isAuthenticated, currentUser]);

  // Check for live events
  useEffect(() => {
        if (!isAuthenticated) return;

    const checkLiveEvents = async () => {
      try {
        const streams = await getLiveStreams();
        setHasLiveEvents(streams.length > 0);
      } catch (error) {
      }
    };

    checkLiveEvents();
    
    // Poll every minute to update the indicator
    const interval = setInterval(checkLiveEvents, 60000);
    return () => clearInterval(interval);
  }, []);

  // Subscribe to real-time messages
  useEffect(() => {
    if (!isAuthenticated || !currentUser) return;

    const subscription = subscribeToAllMessages(async (newMessage: any) => {
      // Avoid processing our own messages if we're optimistically updating (optional, but good for consistency)
      // Actually, we might want to confirm the ID matches or replace the temp one. 
      // For now, let's just process everything and assume optimistic updates handle their own duplicates if any,
      // or we just rely on the server for incoming.
      // Optimistic updates in handleSendMessage usually don't have the real DB ID immediately unless we wait.
      // In handleSendMessage, we await sendMessage, so we have the real ID. 
      // So we might get a duplicate here if we are not careful.
      // Simple fix: Check if message with this ID already exists.

      setConversations(prevConversations => {
        const convIndex = prevConversations.findIndex(c => c.id === newMessage.conversation_id);
        
        if (convIndex >= 0) {
          const conv = prevConversations[convIndex];
          
          // Check if message already exists (deduplication)
          if (conv.messages.some(m => m.id === newMessage.id)) {
            return prevConversations;
          }

          // Update existing conversation
          const updatedConvs = [...prevConversations];
          
          const appMsg: Message = {
             id: newMessage.id,
             senderId: newMessage.sender_id === currentUser.id ? 0 : parseInt(newMessage.sender_id) || 1, 
             text: newMessage.content,
             timestamp: new Date(newMessage.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
             read: newMessage.sender_id === currentUser.id ? true : false
          };
          
          const updatedConv = {
            ...conv,
            messages: [...conv.messages, appMsg],
            lastMessage: {
              text: appMsg.text,
              timestamp: 'Just now',
              isRead: appMsg.read
            },
            unreadCount: newMessage.sender_id !== currentUser.id ? (conv.unreadCount || 0) + 1 : (conv.unreadCount || 0)
          };
          
          // Move to top
          updatedConvs.splice(convIndex, 1);
          updatedConvs.unshift(updatedConv);
          
          return updatedConvs;
        } else {
           // New conversation logic could go here (e.g. refetch all)
           return prevConversations; 
        }
      });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [isAuthenticated, currentUser]);

  // Online Friends & Presence
  useEffect(() => {
    if (!isAuthenticated || !currentUser) {
      setOnlineFriends([]);
      return;
    }

    let channel: any;

        const setupPresence = async () => {
      try {
        // 1. Get mutual friends
        const friends = await getMutualFollows(currentUser.id);
        
        // 2. Subscribe to presence
        channel = subscribeToOnlineUsers(currentUser.id, (onlineIds: any[]) => {
          // Filter friends who are online
          const online = friends.filter((friend: any) => onlineIds.includes(friend.id));
          
          // Map to the format expected by ChatList
          const formattedOnline = online.map((f: any) => ({
            id: f.id,
            name: f.full_name,
            username: f.username,
            avatar: f.avatar_url
          }));
          
          setOnlineFriends(formattedOnline);
        });
      } catch (error) {
      }
    };

    setupPresence();

    return () => {
      if (channel) channel.unsubscribe();
    };
  }, [isAuthenticated, currentUser]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setCurrentUser(null);
      setIsAuthenticated(false);
      navigate('/events');
    } catch (err) {
    }
  };

  // Handler to start or continue a conversation
  const handleStartConversation = async (user: { name: string; username?: string; avatar: string; verified: boolean; isOrganizer?: boolean; id?: string }) => {
    if (!currentUser) return;

    // Check if conversation already exists in state
    const existingConv = conversations.find((conv) => {
      if (user.id && conv.user.id === user.id) return true;
      if (conv.user.username && user.username) {
        return conv.user.username.toLowerCase().trim() === user.username.toLowerCase().trim();
      }
      return conv.user.name.toLowerCase().trim() === user.name.toLowerCase().trim();
    });
    
    if (existingConv) {
      return existingConv;
    }

    // If we have a user ID, try to create/get conversation via API
    if (user.id) {
      try {
        const apiConv = await startConversation(user.id);
        
        // Optimistically add to state or refetch
        const newConversation: Conversation = {
          id: apiConv.id,
          user: {
            id: user.id,
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
      } catch (error) {
      }
    }
    
    // Fallback for UI-only/mock users if needed (shouldn't happen with real data)
    return null; 
  };

  // Handler to send a message
  const handleSendMessage = async (conversationId: number, messageText: string) => {
    if (!messageText.trim() || !currentUser) return;

    const tempId = Date.now();
    const tempMessage: Message = {
      id: tempId,
      senderId: 0, // Current user
      text: messageText,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      read: true,
    };

    // Optimistic update
    setConversations(prev => prev.map((conv) => {
      if (conv.id === conversationId) {
        return {
          ...conv,
          messages: [...conv.messages, tempMessage],
          lastMessage: {
            text: tempMessage.text,
            timestamp: 'Just now',
            isRead: true,
          },
        };
      }
      return conv;
    }));

    try {
      const sentMsg = await sendMessage(conversationId, messageText);
      if (sentMsg) {
        const realMessage: Message = {
          id: sentMsg.id,
          senderId: 0, // Current user
          text: sentMsg.content,
          timestamp: new Date(sentMsg.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
          read: true,
        };

        // Replace temp message with real one
        setConversations(prev => prev.map((conv) => {
          if (conv.id === conversationId) {
            return {
              ...conv,
              messages: conv.messages.map(m => m.id === tempId ? realMessage : m),
              lastMessage: {
                text: realMessage.text,
                timestamp: 'Just now',
                isRead: true,
              },
            };
          }
          return conv;
        }));
      }
    } catch (error) {
      // Revert on error
      setConversations(prev => prev.map((conv) => {
        if (conv.id === conversationId) {
          return {
            ...conv,
            messages: conv.messages.filter(m => m.id !== tempId),
          };
        }
        return conv;
      }));
      toast.error('Failed to send message');
    }
  };

  const handleMarkAsRead = async (conversationId: number) => {
    if (!currentUser) return;

    try {
      // Optimistic update
      setConversations(conversations.map(conv => {
        if (conv.id === conversationId) {
          return {
            ...conv,
            unreadCount: 0,
            messages: conv.messages.map(m => ({ ...m, read: true })),
            lastMessage: {
              ...conv.lastMessage,
              isRead: true
            }
          };
        }
        return conv;
      }));

      await markMessagesAsRead(conversationId, currentUser.id);
    } catch (error) {
    }
  };

  const handleDeleteConversation = async (conversationId: number) => {
    try {
      // Optimistic update
      setConversations(prev => prev.filter(c => c.id !== conversationId));
      
      await deleteConversation(conversationId);
      toast.success('Conversation deleted');
    } catch (error) {
      toast.error('Failed to delete conversation');
      // Refresh to restore state if failed
      if (currentUser) {
        try {
          const apiConvs = await getConversations(currentUser.id);
          const formattedConvs: Conversation[] = await Promise.all(apiConvs.map(async (c: any) => {
            const otherUser = c.participant1_id === currentUser.id ? c.participant2 : c.participant1;
            const msgs = await getMessages(c.id);
            const formattedMsgs: Message[] = msgs.map((m: any) => ({
              id: m.id,
              senderId: m.sender_id === currentUser.id ? 0 : parseInt(m.sender_id) || 1,
              text: m.content,
              timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              read: m.is_read
            }));
            return {
              id: c.id,
              user: {
                id: otherUser?.id,
                name: otherUser?.full_name || 'Unknown User',
                username: otherUser?.username || '',
                avatar: otherUser?.avatar_url,
                verified: otherUser?.verified || false,
                isOrganizer: otherUser?.is_organizer || false,
              },
              lastMessage: {
                text: c.last_message?.content || '',
                timestamp: c.last_message ? new Date(c.last_message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
                isRead: c.last_message?.is_read || false,
              },
              unreadCount: c.unread_count || 0,
              messages: formattedMsgs
            };
          }));
          setConversations(formattedConvs);
        } catch (e) {
        }
      }
    }
  };

  const handleCreateEvent = () => {
    navigate('/create');
  };

  const handleStartOrganizerSetup = () => {
    setIsOrganizer(false);
    navigate('/create');
  };

  const handleEditEvent = (event: any) => {
    navigate(`/edit-event/${event.id}`);
  };

  const handleViewPost = (item: any) => {
    const backgroundBase = (location.state as any)?.backgroundLocation || location;
    if (item.isProfile) {
      if (item.id && item.id !== 'unknown') {
        navigate(`/profile/${item.id}`, { state: { backgroundLocation: backgroundBase } });
      } else {
        // Fallback: if we can't find the user ID, maybe it's the current user? 
        // Or just don't navigate to a broken URL.
        navigate('/profile', { state: { backgroundLocation: backgroundBase } });
      }
    } else {
      // Use location state to implement modal routing
      navigate(`/post/${item.id}`, { 
        state: { 
          backgroundLocation: backgroundBase,
          post: item, 
          startTime: item.startTime, 
          isMuted: item.isMuted 
        } 
      });
    }
  };

  const isPostModal = location.pathname.startsWith('/post/') && location.state?.backgroundLocation;
  const isEventModal = location.pathname.startsWith('/event/') && location.state?.backgroundLocation;
  const shouldHideBottomNav = location.pathname.startsWith('/create') || 
                               location.pathname.startsWith('/edit-event') || 
                               (location.pathname.startsWith('/post') && !isPostModal) || 
                               (location.pathname.startsWith('/event/') && !isEventModal);

  const backgroundLocation = location.state?.backgroundLocation;
  
  // Determine which tab is active for keep-alive rendering
  const effectiveLocation = backgroundLocation || location;
  const effectivePath = effectiveLocation.pathname;
  const isEventsTab = effectivePath === '/events' || effectivePath === '/';
  const isFeedTab = effectivePath === '/feed';
  const isLiveTab = effectivePath === '/live';
  const isOwnProfileTab = effectivePath === '/profile';

  useEffect(() => {
    const isModal =
      !!(location.state as any)?.backgroundLocation &&
      (location.pathname.startsWith('/post/') ||
        location.pathname.startsWith('/profile') ||
        location.pathname.startsWith('/event/'));

    const isTabPath = (p: string) => p === '/events' || p === '/live' || p === '/profile';

    const prevPath = prevTabPathRef.current;
    if (prevPath && !prevWasModalRef.current && isTabPath(prevPath)) {
      sessionStorage.setItem(`eventz_tab_scroll_${prevPath}`, String(window.scrollY));
    }

    if (!isModal && isTabPath(location.pathname)) {
      const saved = sessionStorage.getItem(`eventz_tab_scroll_${location.pathname}`);
      if (saved !== null) {
        const y = Number(saved) || 0;
        requestAnimationFrame(() => window.scrollTo(0, y));
      }
    }

    prevTabPathRef.current = location.pathname;
    prevWasModalRef.current = isModal;
  }, [location.key, location.pathname, (location.state as any)?.backgroundLocation]);

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

  // Force sign-in globally
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Toaster 
          position="top-center" 
          richColors={false}
          closeButton
          toastOptions={{
            className: "font-sans",
            style: {
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(0, 0, 0, 0.05)',
              borderRadius: '16px',
              color: '#1a1a1a',
              boxShadow: '0 10px 40px -10px rgba(0,0,0,0.1)',
              padding: '16px',
              fontSize: '14px',
              fontWeight: 500,
            },
          }}
        />
        <AuthScreen onAuthSuccess={handleAuthSuccess} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster 
        position="top-center" 
        richColors={false}
        closeButton
        toastOptions={{
          className: "font-sans",
          style: {
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(0, 0, 0, 0.05)',
            borderRadius: '16px',
            color: '#1a1a1a',
            boxShadow: '0 10px 40px -10px rgba(0,0,0,0.1)',
            padding: '16px',
            fontSize: '14px',
            fontWeight: 500,
          },
          classNames: {
            toast: "group toast group-[.toaster]:bg-white group-[.toaster]:text-neutral-900 group-[.toaster]:border-neutral-200 group-[.toaster]:shadow-lg",
            description: "group-[.toast]:text-neutral-500",
            actionButton: "group-[.toast]:bg-neutral-900 group-[.toast]:text-neutral-50",
            cancelButton: "group-[.toast]:bg-neutral-100 group-[.toast]:text-neutral-500",
            error: "group-[.toaster]:border-l-4 group-[.toaster]:border-l-red-500",
            success: "group-[.toaster]:border-l-4 group-[.toaster]:border-l-black",
            warning: "group-[.toaster]:border-l-4 group-[.toaster]:border-l-amber-500",
            info: "group-[.toaster]:border-l-4 group-[.toaster]:border-l-blue-500",
          }
        }}
      />
      {/* Main Content */}
      <div className={`max-w-7xl mx-auto ${shouldHideBottomNav ? 'pb-20' : 'pb-[calc(5rem+env(safe-area-inset-bottom))]'}`}>
        {/* Always-mounted tab views for instant switching (keep-alive) */}
        <div style={{ display: isEventsTab ? 'block' : 'none' }}>
          <EventDetails 
            conversations={conversations} 
            onStartConversation={handleStartConversation} 
            onSendMessage={handleSendMessage} 
          />
        </div>
        <div style={{ display: isFeedTab ? 'block' : 'none' }}>
          <Feed 
            conversations={conversations} 
            onStartConversation={handleStartConversation} 
            onSendMessage={handleSendMessage} 
            onMarkAsRead={handleMarkAsRead} 
            onlineUsers={onlineFriends} 
            onDeleteConversation={handleDeleteConversation} 
            currentUser={currentUser}
            isOrganizer={isOrganizer}
            onCreateEvent={handleCreateEvent}
            onViewPost={handleViewPost}
            isPaused={!isFeedTab || !!backgroundLocation}
          />
        </div>
        <div style={{ display: isLiveTab ? 'block' : 'none' }}>
          <LiveFeed isPaused={!isLiveTab || !!backgroundLocation} />
        </div>
        <div style={{ display: isOwnProfileTab ? 'block' : 'none' }}>
          <Profile 
            onLogout={handleLogout} 
            onCreateEvent={handleCreateEvent}
            onEditEvent={handleEditEvent}
            onStartOrganizerSetup={handleStartOrganizerSetup}
            onViewPost={handleViewPost}
            isPaused={!isOwnProfileTab || !!backgroundLocation}
          />
        </div>

        {/* Non-tab routes */}
        <Routes location={backgroundLocation || location}>
          <Route path="/" element={<Navigate to="/events" replace />} />
          <Route path="/events" element={null} />
          <Route path="/feed" element={null} />
          <Route path="/live" element={null} />
          <Route path="/profile" element={null} />
          <Route path="/profile/:userId" element={
            <Profile 
              onLogout={handleLogout} 
              onCreateEvent={handleCreateEvent}
              onEditEvent={handleEditEvent}
              onStartOrganizerSetup={handleStartOrganizerSetup}
              onViewPost={handleViewPost}
              isPaused={!!backgroundLocation}
            />
          } />
          <Route path="/create" element={
            <Suspense fallback={<RouteFallback />}>
              <CreateEventWrapper 
                currentUser={currentUser} 
                isAuthenticated={isAuthenticated} 
                onAuthSuccess={handleAuthSuccess}
              />
            </Suspense>
          } />
          <Route path="/edit-event/:id" element={
            <Suspense fallback={<RouteFallback />}>
              <CreateEventWrapper 
                currentUser={currentUser} 
                isAuthenticated={isAuthenticated} 
                onAuthSuccess={handleAuthSuccess}
              />
            </Suspense>
          } />
          <Route path="/post/:id" element={
            <Suspense fallback={<RouteFallback />}>
              <PostDetailWrapper 
                currentUser={currentUser}
                userProfile={userProfile}
              />
            </Suspense>
          } />
          <Route path="/event/:id" element={
            <Suspense fallback={<RouteFallback />}><EventDetailWrapper onStartConversation={handleStartConversation} /></Suspense>
          } />
          <Route path="/live/:id" element={
            <Suspense fallback={<RouteFallback />}><EventDetailWrapper onStartConversation={handleStartConversation} /></Suspense>
          } />
          <Route path="/compose/post" element={
            <Suspense fallback={<RouteFallback />}><CreatePostPage /></Suspense>
          } />
        </Routes>
      </div>

      {/* Modal Route Overlay */}
      {backgroundLocation && (
        <Routes>
          <Route 
            path="/post/:id" 
            element={
              <Suspense fallback={<RouteFallback />}>
                <PostDetailWrapper 
                  currentUser={currentUser}
                  userProfile={userProfile}
                />
              </Suspense>
            } 
          />
          <Route
            path="/event/:id"
            element={<Suspense fallback={<RouteFallback />}><EventDetailWrapper onStartConversation={handleStartConversation} /></Suspense>}
          />
          <Route
            path="/profile"
            element={
              <Suspense fallback={<RouteFallback />}>
                <ProfileModalWrapper
                  onLogout={handleLogout}
                  onCreateEvent={handleCreateEvent}
                  onEditEvent={handleEditEvent}
                  onStartOrganizerSetup={handleStartOrganizerSetup}
                  onViewPost={handleViewPost}
                />
              </Suspense>
            }
          />
          <Route
            path="/profile/:userId"
            element={
              <Suspense fallback={<RouteFallback />}>
                <ProfileModalWrapper
                  onLogout={handleLogout}
                  onCreateEvent={handleCreateEvent}
                  onEditEvent={handleEditEvent}
                  onStartOrganizerSetup={handleStartOrganizerSetup}
                  onViewPost={handleViewPost}
                />
              </Suspense>
            }
          />
        </Routes>
      )}

      {/* Bottom Navigation */}
      {!shouldHideBottomNav && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40 pb-[env(safe-area-inset-bottom)]">
          <div className="max-w-7xl mx-auto px-2 sm:px-4">
            <div className="flex justify-around items-center h-16">
              <Link
                to="/events"
                className={`flex flex-col items-center gap-1 px-2 sm:px-4 py-2 transition-colors ${
                  location.pathname === '/events' || location.pathname === '/' ? 'text-purple-600' : 'text-gray-500'
                }`}
              >
                <Calendar className="w-6 h-6" />
                <span className="text-xs">Events</span>
              </Link>
              <Link
                to="/live"
                className={`flex flex-col items-center gap-1 px-2 sm:px-4 py-2 transition-colors relative ${
                  location.pathname === '/live' ? 'text-purple-600' : 'text-gray-500'
                }`}
              >
                <Radio className="w-6 h-6" />
                <span className="text-xs">Live</span>
                {hasLiveEvents && (
                  <span className="absolute top-1 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                )}
              </Link>
              <Link
                to="/feed"
                className={`flex flex-col items-center gap-1 px-2 sm:px-4 py-2 transition-colors ${
                  location.pathname === '/feed' ? 'text-purple-600' : 'text-gray-500'
                }`}
              >
                <Rss className="w-6 h-6" />
                <span className="text-xs">Feed</span>
              </Link>

              <Link
                to="/profile"
                className={`flex flex-col items-center gap-1 px-2 sm:px-4 py-2 transition-colors ${
                  location.pathname === '/profile' ? 'text-purple-600' : 'text-gray-500'
                }`}
              >
                <User className="w-6 h-6" />
                <span className="text-xs">Profile</span>
              </Link>
            </div>
          </div>
        </nav>
      )}
    </div>
  );
}
