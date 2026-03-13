import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { EventCard } from './EventCard';
import { Settings, Calendar, Bookmark, Play, Ticket as TicketIcon, Camera, Image as ImageIcon, Heart, Plus, Trash2, BarChart3, User, LayoutGrid, Radio, Menu, Wallet, GalleryHorizontal, LogOut, ChevronLeft, Star, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { SettingsModal } from './SettingsModal';
import { TicketViewer } from './TicketViewer';
import { EventDetailModal } from './EventDetailModal';
import { UserAvatar } from './UserAvatar';
import { supabase } from '../utils/supabase/client';
import { getProfile, getUserTickets, getSavedEvents, getFollowersCount, getFollowingCount, getPosts, subscribeToSavedEvents, Profile as UserProfile, Ticket, ApiPost, getFollowers, getFollowing, deletePost, getOrganizerStats, getOrganizerEvents, toggleFollow, getFollowedUserIds } from '../utils/supabase/api';
import { WalletModal } from './WalletModal';
import { LiveSetupModal } from './LiveSetupModal';
import type { Event as AppEvent } from '../utils/supabase/api';
import { UserListModal } from './UserListModal';
import { UserProfileModal } from './UserProfileModal';
import { TicketListModal } from './TicketListModal';
import { ProfessionalDashboardModal } from './ProfessionalDashboardModal';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "./ui/sheet";
import { Conversation, Post as UiPost } from '../types';
import { formatTimeAgo } from '../utils/format';

import { EventListModal } from './EventListModal';

type TicketViewerTicket = {
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
};

interface ProfileProps {
  onLogout?: () => Promise<void>;
  onCreateEvent?: () => void;
  onEditEvent?: (event: any) => void;
  onStartOrganizerSetup?: () => void;
  onStartConversation?: (user: { name: string; username?: string; avatar: string; verified: boolean; isOrganizer?: boolean; id?: string }) => Promise<Conversation | null | undefined> | Conversation | null;
  userId?: string; // Optional: View another user's profile
  onBack?: () => void; // Optional: Back button handler
  onViewPost?: (post: any) => void;
}

export function Profile({ onLogout, onCreateEvent, onEditEvent, onStartOrganizerSetup, userId: userIdProp, onBack, onViewPost }: ProfileProps) {
  const { userId: userIdParam } = useParams<{ userId: string }>();
  const userId = userIdProp || userIdParam;
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'tickets' | 'events' | 'media' | 'saved' | 'my_events' | 'hosted' | 'upcoming'>('media');
  const [savedEvents, setSavedEvents] = useState<(AppEvent & { isSaved: boolean; hasReminder: boolean })[]>([]);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsInitialView, setSettingsInitialView] = useState<'main' | 'profile'>('main');
  const [showTicketViewer, setShowTicketViewer] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<TicketViewerTicket | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<AppEvent | null>(null);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showLiveSetupModal, setShowLiveSetupModal] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Ticket List Modal State
  const [showTicketListModal, setShowTicketListModal] = useState(false);
  const [selectedEventTickets, setSelectedEventTickets] = useState<Ticket[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Data states
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [organizerStats, setOrganizerStats] = useState<any>(null);
  const [publishedEvents, setPublishedEvents] = useState<any[]>([]);
  const [showProfessionalDashboard, setShowProfessionalDashboard] = useState(false);
  
  const [attendedEvents, setAttendedEvents] = useState<AppEvent[]>([]);
  const [ticketEvents, setTicketEvents] = useState<Ticket[]>([]);
  const [userPosts, setUserPosts] = useState<ApiPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [followStats, setFollowStats] = useState({ followers: 0, following: 0 });
  const [isFollowing, setIsFollowing] = useState(false);
  
  // Event List Modal State
  const [showEventListModal, setShowEventListModal] = useState(false);

  const handleShowEventsList = () => {
    setShowEventListModal(true);
  };
  
  // Follower/Following Modal State
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [followList, setFollowList] = useState<any[]>([]);
  const [isLoadingFollowList, setIsLoadingFollowList] = useState(false);

  // User Profile Modal State
  const [showUserProfileModal, setShowUserProfileModal] = useState(false);
  const [selectedUserForModal, setSelectedUserForModal] = useState<any>(null);
  
  const isOwnProfile = !userId || (currentUser && userId === currentUser.id);

  const handleLogout = async () => {
    try {
      if (onLogout) {
        await onLogout();
      } else {
        await supabase.auth.signOut();
      }
    } catch (e) {
      console.error('Logout failed', e);
    }
  };

  const handleShowFollowers = async () => {
    const targetUserId = userId || currentUser?.id;
    if (!targetUserId) return;
    
    setShowFollowersModal(true);
    setIsLoadingFollowList(true);
    try {
      const followers = await getFollowers(targetUserId);
      setFollowList(followers);
    } catch (err) {
      console.error('Error fetching followers:', err);
      toast.error('Failed to load followers');
    } finally {
      setIsLoadingFollowList(false);
    }
  };

  const handleShowFollowing = async () => {
    const targetUserId = userId || currentUser?.id;
    if (!targetUserId) return;
    
    setShowFollowingModal(true);
    setIsLoadingFollowList(true);
    try {
      const following = await getFollowing(targetUserId);
      setFollowList(following);
    } catch (err) {
      console.error('Error fetching following:', err);
      toast.error('Failed to load following');
    } finally {
      setIsLoadingFollowList(false);
    }
  };
  
  const savedEventsSubscriptionRef = useRef<any>(null);

  // Unified Profile Logic
  const isOrganizer = userProfile?.is_organizer || false;
  const profileImage = userProfile?.avatar_url;
  const displayName = userProfile?.full_name || 'User';
  const organizerCategory = userProfile?.organizer_type;

  const loadData = async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUser(user);

      const targetUserId = userId || user?.id;
      
      if (targetUserId) {
        const profile = await getProfile(targetUserId);
        if (profile) {
          setUserProfile(profile);
          
          if (profile.is_organizer) {
            try {
              const stats = await getOrganizerStats(targetUserId);
              setOrganizerStats(stats);

              const events = await getOrganizerEvents(targetUserId);
              if (events) {
                const mapEvent = (e: any) => ({
                  ...e,
                  coverImage: e.image_url || e.coverImage,
                  price: e.price_range || e.price
                });
                setPublishedEvents(events.map(mapEvent));
              }
            } catch (err) {
              console.error('Error loading organizer stats:', err);
            }
          }
        }

        try {
          const followers = await getFollowersCount(targetUserId);
          const following = await getFollowingCount(targetUserId);
          setFollowStats({ followers, following });

          // Check if current user is following this profile
          if (user && targetUserId !== user.id) {
            const followedIds = await getFollowedUserIds(user.id);
            setIsFollowing(followedIds.includes(targetUserId));
          }
        } catch (err) {
          console.error('Error loading follow stats:', err);
        }
        
        if (isOwnProfile) {
           const saved = await getSavedEvents(targetUserId);
           if (saved) {
             setSavedEvents(saved as unknown as (AppEvent & { isSaved: boolean; hasReminder: boolean })[]);
           }
        }

        if (isOwnProfile) {
            const tickets = await getUserTickets(targetUserId);
            if (tickets) {
              setTicketEvents(tickets);
              const attended = tickets
                .filter(t => {
                  if (!t.event?.date) return false;
                  const eventDate = new Date(t.event.date);
                  return !isNaN(eventDate.getTime()) && eventDate < new Date();
                })
                .map(t => t.event!)
                .filter(e => !!e);
              
              const uniqueAttended = Array.from(new Map(attended.map(item => [item.id, item])).values());
              setAttendedEvents(uniqueAttended);
            }
        }

        const posts = await getPosts({ authorId: targetUserId });
        if (posts) {
           setUserPosts(posts);
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const handleProfileUpdated = async () => {
      loadData();
    };
    window.addEventListener('profileUpdated', handleProfileUpdated as EventListener);
    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdated as EventListener);
    };
  }, [userId, isOwnProfile]);

  useEffect(() => {
    loadData();

    // Setup subscription if we have a user
    let subscription: any = null;
    
    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (isOwnProfile && user) {
        subscription = subscribeToSavedEvents(user.id, () => {
          loadData();
        });
        savedEventsSubscriptionRef.current = subscription;
      }
    };
    
    setupSubscription();

    return () => {
      if (subscription) subscription.unsubscribe?.();
      savedEventsSubscriptionRef.current = null;
    };
  }, [userId, isOwnProfile]);

  const handleDeletePost = async (postId: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    
    if (!window.confirm("Are you sure you want to delete this post?")) return;

    try {
      setUserPosts(prev => prev.filter(p => p.id !== postId));
      await deletePost(postId);
      toast.success('Post deleted');
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Failed to delete post');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const posts = await getPosts({ authorId: user.id });
        if (posts) setUserPosts(posts);
      }
    }
  };

  const handleOpenPost = (post: ApiPost) => {
    let postUser;
    
    if (isOwnProfile) {
        const currentProfileIsOrganizer = userProfile?.is_organizer || false;
        postUser = {
            id: currentUser?.id,
            name: displayName,
            username: userProfile?.username || '@user',
            avatar: profileImage || '',
            verified: userProfile?.verified || false,
            isOrganizer: currentProfileIsOrganizer,
            isOrganizerPage: currentProfileIsOrganizer
        };
    } else {
        const isOrganizerPage = !!post.posted_as_organizer;
        const postDisplayName = post.user?.full_name || post.user?.username || 'Unknown User';
        const postAvatarUrl = post.user?.avatar_url;

        postUser = {
            id: post.user?.id || 'unknown',
            name: postDisplayName || displayName,
            username: post.user?.username || userProfile?.username || '@unknown',
            avatar: postAvatarUrl || profileImage || '',
            verified: post.user?.verified || false,
            isOrganizer: post.user?.is_organizer || false,
            isOrganizerPage: isOrganizerPage
        };
    }

    const uiPost: UiPost = {
      id: post.id,
      user_id: post.user_id,
      user: postUser,
      event: post.event ? {
        id: post.event.id,
        name: post.event.title,
        date: post.event.date,
        time: post.event.time,
        location: post.event.location,
        image: post.event.image_url,
        price: post.event.price_range,
      } : undefined,
      content: {
        text: post.content,
        images: post.image_urls,
        image: post.image_urls?.[0],
        hashtags: post.hashtags,
      },
      timestamp: formatTimeAgo(post.created_at),
      likes: post.likes_count || 0,
      comments: [],
      comments_count: post.comments_count || 0,
      shares: 0,
      views: post.views || 0,
      isLiked: post.is_liked || false,
      isSaved: post.is_saved || false,
      isHighlight: !!post.video_url,
      highlights: post.video_url ? [{
        id: post.id,
        thumbnail: (post.image_urls?.find(url => !url.match(/\.(mp4|webm|ogg|mov)$/i))) || 'https://images.unsplash.com/photo-1516280440614-6697288d5d38?w=300&h=500&fit=crop',
        duration: post.duration || '',
        title: post.content || 'Video Highlight',
        videoUrl: post.video_url,
        views: post.views || 0,
      }] : undefined,
      video_url: post.video_url
    };
    
    if (onViewPost) {
      onViewPost(uiPost);
    }
  };

  const filteredUserPosts = userPosts;

  const groupedTickets = ticketEvents.reduce((acc, ticket) => {
    const eventId = ticket.event_id;
    if (!acc[eventId]) {
      acc[eventId] = [];
    }
    acc[eventId].push(ticket);
    return acc;
  }, {} as Record<number, Ticket[]>);

  const uniqueTicketGroups = Object.values(groupedTickets);

  return (
    <div className="bg-white min-h-screen pb-16 pt-6 px-6">
      {/* Header Section */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          {!isOwnProfile && onBack && (
            <button onClick={onBack} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
              <ChevronLeft className="w-6 h-6 text-gray-900" />
            </button>
          )}
          <div className="w-20 h-20 rounded-full overflow-hidden bg-white ring-1 ring-gray-200">
            {isLoading ? (
              <div className="w-full h-full bg-gray-200 animate-pulse" />
            ) : (
              <UserAvatar 
                src={profileImage}
                name={displayName} 
                className="w-full h-full text-2xl" 
                size="3xl"
              />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
             {isLoading ? (
               <div className="space-y-2">
                 <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
                 <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
               </div>
             ) : (
               <>
                 <h1 className="text-xl font-semibold text-gray-900 leading-tight">
                   {displayName || 'User'}
                 </h1>
                 <p className="text-gray-500 font-medium text-xs flex items-center gap-1">
                   @{userProfile?.username || 'user'}
                 </p>
               </>
             )}
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex flex-col gap-6 items-center">
          {isOwnProfile && (
            <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
              <SheetTrigger asChild>
                <button className="p-2 text-gray-900 hover:bg-gray-100 rounded-full transition-colors">
                  <Menu className="w-8 h-8" />
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[340px] p-0 bg-white border-l border-gray-100 h-[75vh] bottom-auto overflow-hidden">
                <SheetTitle className="sr-only">Menu</SheetTitle>
                <SheetDescription className="sr-only">
                  Navigation menu for wallet, dashboard, settings, and logout.
                </SheetDescription>
                <div className="flex flex-col h-full">
                  <div className="p-6 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden ring-1 ring-gray-100">
                        {profileImage ? (
                          <img src={profileImage} alt={displayName} className="w-full h-full object-cover" />
                        ) : (
                          <UserAvatar name={displayName} className="w-full h-full text-sm" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-sm leading-tight">{displayName}</h3>
                        <p className="text-gray-500 text-xs">@{userProfile?.username || 'user'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto py-2">
                    <button
                      onClick={() => { setShowWalletModal(true); setIsSidebarOpen(false); }}
                      className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors group"
                    >
                      <div className="flex items-center gap-3 text-gray-700 group-hover:text-gray-900">
                        <Wallet className="w-5 h-5 stroke-[1.5]" />
                        <span className="font-medium text-[15px]">Wallet</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                    </button>

                    <button
                      onClick={() => { setSettingsInitialView('profile'); setShowSettingsModal(true); setIsSidebarOpen(false); }}
                      className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors group"
                    >
                      <div className="flex items-center gap-3 text-gray-700 group-hover:text-gray-900">
                        <User className="w-5 h-5 stroke-[1.5]" />
                        <span className="font-medium text-[15px]">Edit Profile</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                    </button>

                    {isOrganizer && (
                      <button
                        onClick={() => { setShowProfessionalDashboard(true); setIsSidebarOpen(false); }}
                        className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors group"
                      >
                        <div className="flex items-center gap-3 text-gray-700 group-hover:text-gray-900">
                          <BarChart3 className="w-5 h-5 stroke-[1.5]" />
                          <span className="font-medium text-[15px]">Professional Dashboard</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                      </button>
                    )}

                    <button
                      onClick={() => { setSettingsInitialView('main'); setShowSettingsModal(true); setIsSidebarOpen(false); }}
                      className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors group"
                    >
                      <div className="flex items-center gap-3 text-gray-700 group-hover:text-gray-900">
                        <Settings className="w-5 h-5 stroke-[1.5]" />
                        <span className="font-medium text-[15px]">Settings</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                    </button>

                    <div className="my-2 border-t border-gray-50" />

                    <button
                      onClick={() => {
                        setIsSidebarOpen(false);
                        onLogout?.().then(() => toast.success("Logged out"));
                      }}
                      className="w-full flex items-center gap-3 px-6 py-4 text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="w-5 h-5 stroke-[1.5]" />
                      <span className="font-medium text-[15px]">Log out</span>
                    </button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          )}

          {isOwnProfile && isOrganizer && (
            <button
              onClick={() => setShowLiveSetupModal(true)}
              className="p-1.5 text-red-600 hover:bg-red-50 rounded-full transition-colors border border-red-200 bg-white shadow-sm"
              title="Go Live"
            >
              <Radio className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Bio Section */}
      <div className="mb-6">
        {isLoading ? (
          <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
        ) : (
          <div className="flex flex-col gap-2">
             {isOrganizer && (
               <div className="text-sm font-medium text-gray-500">
                 {organizerCategory || 'Event Organizer'}
               </div>
             )}
             
            <div className="flex items-start justify-between">
              <p className={`${(isOrganizer && userProfile?.bio) ? 'text-gray-800 font-medium' : 'text-gray-600'} leading-relaxed text-[15px]`}>
                {userProfile?.bio ? userProfile.bio : (
                  isOwnProfile ? (
                    <span className="text-gray-400 italic">No bio yet. Add your bio in Settings.</span>
                  ) : null
                )}
              </p>
              {!userProfile?.bio && isOwnProfile && (
                <button 
                  onClick={() => { setSettingsInitialView('profile'); setShowSettingsModal(true); }}
                  className="ml-4 px-3 py-1.5 text-xs rounded-full bg-purple-50 text-purple-700 font-semibold hover:bg-purple-100 transition-colors"
                >
                  Set Bio
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Stats Row */}
      <div className="flex items-center justify-between px-6 mb-6">
        {isLoading ? (
          <div className="flex w-full justify-between">
            <div className="flex-1 px-2">
              <div className="h-6 w-12 bg-gray-200 rounded mx-auto mb-1 animate-pulse" />
              <div className="h-3 w-16 bg-gray-100 rounded mx-auto animate-pulse" />
            </div>
            <div className="flex-1 px-2">
              <div className="h-6 w-12 bg-gray-200 rounded mx-auto mb-1 animate-pulse" />
              <div className="h-3 w-16 bg-gray-100 rounded mx-auto animate-pulse" />
            </div>
            <div className="flex-1 px-2">
              <div className="h-6 w-12 bg-gray-200 rounded mx-auto mb-1 animate-pulse" />
              <div className="h-3 w-16 bg-gray-100 rounded mx-auto animate-pulse" />
            </div>
          </div>
        ) : (
          <>
            <div 
              className="text-center flex-1 cursor-pointer active:scale-95 transition-transform"
              onClick={handleShowEventsList}
            >
              <div className="text-lg font-bold text-gray-900 leading-none mb-1">
                  {isOrganizer ? (organizerStats ? organizerStats.totalEvents : 0) : attendedEvents.length}
              </div>
              <div className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">
                  {isOrganizer ? 'Hosted' : 'Attended'}
              </div>
            </div>
            <div 
              className="text-center flex-1 cursor-pointer active:scale-95 transition-transform border-l border-gray-100"
              onClick={handleShowFollowers}
            >
              <div className="text-lg font-bold text-gray-900 leading-none mb-1">
                  {followStats.followers}
              </div>
              <div className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">
                  Followers
              </div>
            </div>
            <div 
              className="text-center flex-1 cursor-pointer active:scale-95 transition-transform border-l border-gray-100"
              onClick={handleShowFollowing}
            >
              <div className="text-lg font-bold text-gray-900 leading-none mb-1">
                  {followStats.following}
              </div>
              <div className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">
                  Following
              </div>
            </div>
          </>
        )}
      </div>

      {/* Action Buttons */}
      {isOwnProfile ? (
        isOrganizer ? (
          <div className="flex gap-3 mb-6 px-1">
            <button 
              onClick={onCreateEvent}
              className="flex-1 py-2.5 bg-[#8A2BE2] text-white rounded-xl font-medium text-xs flex items-center justify-center gap-2 hover:bg-[#7a26c9] transition-all active:scale-95 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Create Event
            </button>
            <button 
              onClick={() => setShowProfessionalDashboard(true)}
              className="flex-1 py-2.5 bg-white text-gray-700 border border-gray-200 rounded-xl font-medium text-xs flex items-center justify-center gap-2 hover:bg-gray-50 transition-all active:scale-95"
            >
              <BarChart3 className="w-4 h-4" />
              Dashboard
            </button>
          </div>
        ) : (
          !isLoading && (
            <div 
                onClick={onStartOrganizerSetup}
                className="mb-8 bg-gray-50 rounded-2xl p-3 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors border border-gray-100"
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[#8A2BE2]">
                        <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                    </div>
                    <div>
                        <h3 className="text-gray-900 font-bold text-sm">
                            Become a Creator
                        </h3>
                        <p className="text-gray-500 text-xs">
                            Create events and go live
                        </p>
                    </div>
                </div>
                <div className="text-gray-400">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </div>
            </div>
          )
        )
      ) : (
        <div className="flex gap-2 mb-6">
          <button 
            className={`flex-1 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 ${
               isFollowing 
               ? 'bg-gray-100 text-gray-900 hover:bg-gray-200' 
               : 'bg-purple-600 text-white hover:bg-purple-700 shadow-sm'
            }`}
            onClick={async () => {
               if (!currentUser) {
                 toast.error('Please sign in to follow');
                 return;
               }
               
               const targetUserId = userId || currentUser.id;
               if (targetUserId === currentUser.id) return;
               
               try {
                 const newFollowingState = await toggleFollow(currentUser.id, targetUserId);
                 setIsFollowing(newFollowingState);
                 toast.success(newFollowingState ? 'Followed' : 'Unfollowed');
                 
                 // Refresh follow stats for the profile being viewed
                  const followers = await getFollowersCount(targetUserId);
                  setFollowStats(prev => ({ ...prev, followers }));
                } catch (error) {
                 console.error('Error toggling follow:', error);
                 toast.error('Failed to update follow status');
               }
            }}
          >
            {isFollowing ? 'Following' : 'Follow'}
          </button>
          <button 
            className="flex-1 py-2 bg-gray-50 text-gray-900 border border-gray-100 rounded-lg font-bold text-xs flex items-center justify-center gap-2 hover:bg-gray-100 transition-all active:scale-95"
            onClick={() => {
              if (!currentUser) {
                toast.error('Please sign in to message');
                return;
              }
              const targetUserId = userId || currentUser.id;
              if (targetUserId === currentUser.id) return;

              navigate('/feed', {
                state: {
                  openMessages: true,
                  userToMessage: {
                    id: targetUserId,
                    name: userProfile?.full_name || userProfile?.username || 'User',
                    username: userProfile?.username || '',
                    avatar: userProfile?.avatar_url || '',
                    verified: !!userProfile?.verified,
                    isOrganizer: !!userProfile?.is_organizer,
                  }
                }
              });
            }}
          >
            Message
          </button>
        </div>
      )}

      {/* Tabs - Unified */}
      <div className="bg-gray-100 p-1.5 rounded-2xl flex mb-6 overflow-x-auto scrollbar-hide">
        <button
          onClick={() => setActiveTab('media')}
          className={`flex-1 min-w-[80px] py-2.5 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
            activeTab === 'media'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          Posts
        </button>
        
        {isOwnProfile && !isOrganizer && (
          <button
            onClick={() => setActiveTab('tickets')}
            className={`flex-1 min-w-[80px] py-2.5 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === 'tickets'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <TicketIcon className="w-3.5 h-3.5" />
            Tickets
          </button>
        )}

        {isOrganizer && (
          <>
            <button
              onClick={() => setActiveTab('upcoming')}
              className={`flex-1 min-w-[80px] py-2.5 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
                activeTab === 'upcoming'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              Upcoming
            </button>
          </>
        )}

        {isOwnProfile && (
          <button
            onClick={() => setActiveTab('saved')}
            className={`flex-1 min-w-[80px] py-2.5 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === 'saved'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            Saved
          </button>
        )}
      </div>

      {/* Content Area */}
      <div>
        {isLoading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-1">
              {[...Array(9)].map((_, i) => (
                <div key={i} className="aspect-square bg-gray-200 rounded animate-pulse" />
              ))}
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'media' && (
              <div className="space-y-4">
                {filteredUserPosts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                      <ImageIcon className="w-8 h-8 text-gray-300" />
                    </div>
                    <p className="text-gray-900 font-medium mb-1">No posts yet</p>
                    {isOwnProfile && <p className="text-gray-500 text-sm max-w-xs mx-auto">Share event photos and videos</p>}
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-1 animate-in fade-in zoom-in duration-300">
                    {filteredUserPosts.map((post) => {
                      const firstImage = post.image_urls?.[0];
                      const isMediaVideo = (url?: string) => !!url && (/\.(mp4|webm|ogg|mov)$/i.test(url) || url.toLowerCase().includes('video') || url.toLowerCase().includes('highlight'));
                      const videoSrc = post.video_url || (isMediaVideo(firstImage) ? firstImage : undefined);
                      const isVideo = !!videoSrc;
                      const videoThumbnail = isVideo ? (post.video_url && firstImage && !isMediaVideo(firstImage) ? firstImage : post.image_urls?.find((u: string) => !!u && !isMediaVideo(u))) : undefined;
                      const isCarousel = (post.image_urls?.length || 0) > 1;
                      return (
                        <div
                          key={post.id}
                          onClick={() => handleOpenPost(post)}
                          className="relative aspect-square cursor-pointer group bg-gray-100 overflow-hidden"
                        >
                          {isVideo ? (
                            <>
                              <video
                                src={`${videoSrc!}${videoSrc!.includes('#') ? '' : '#t=0.1'}`}
                                poster={post.video_url && firstImage && !isMediaVideo(firstImage) ? firstImage : undefined}
                                className={`w-full h-full object-cover ${
                                  videoThumbnail ? 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-active:opacity-100 group-active:pointer-events-auto transition-opacity' : ''
                                }`}
                                muted
                                playsInline
                                loop
                                preload="metadata"
                                onMouseOver={(e) => e.currentTarget.play()}
                                onMouseOut={(e) => {
                                  e.currentTarget.pause();
                                  e.currentTarget.currentTime = 0;
                                }}
                              />
                              {videoThumbnail && (
                                <img
                                  src={videoThumbnail}
                                  alt=""
                                  className="absolute inset-0 w-full h-full object-cover pointer-events-none opacity-100 group-hover:opacity-0 group-active:opacity-0 transition-opacity"
                                />
                              )}
                            </>
                          ) : (
                            <ImageWithFallback
                              src={firstImage}
                              alt={`Post ${post.id}`}
                              className="w-full h-full object-cover"
                            />
                          )}
                          {isVideo && (
                            <div className="absolute top-2 right-2 p-0.5 bg-black/50 rounded text-white">
                              <Play className="w-2.5 h-2.5" />
                            </div>
                          )}
                          {!isVideo && isCarousel && (
                            <div className="absolute top-2 right-2 p-0.5 bg-black/50 rounded text-white">
                              <GalleryHorizontal className="w-3 h-3" />
                            </div>
                          )}
                          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity flex items-center justify-center">
                            <div className="absolute inset-0 bg-black/30" />
                            {isOwnProfile && (
                              <button 
                                onClick={(e) => handleDeletePost(post.id, e)}
                                className="absolute top-2 left-2 p-1.5 bg-black/40 hover:bg-red-500/80 rounded-full text-white transition-colors z-10"
                                title="Delete post"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <div className="relative z-10 flex items-center gap-1 text-white text-sm">
                              <Heart className="w-4 h-4 fill-white" />
                              <span>{post.likes_count || 0}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            {activeTab === 'saved' && (
              <>
                {savedEvents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 px-6">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                      <Bookmark className="w-8 h-8 text-gray-300" />
                    </div>
                    <h3 className="text-gray-900 mb-2">No Saved Events Yet</h3>
                    <p className="text-gray-600 text-center text-sm max-w-xs leading-relaxed">
                      Discover amazing events and tap the bookmark icon to save them here
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {savedEvents.map((event) => (
                      <EventCard
                        key={event.id}
                        event={event}
                        onClick={(e) => setSelectedEvent(e)}
                        className="border border-gray-100 hover:shadow-md transition-all"
                      />
                    ))}
                  </div>
                )}
              </>
            )}
            {activeTab === 'upcoming' && (
              <div className="space-y-4">
                {publishedEvents.filter(e => new Date(e.date) >= new Date()).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                      <Calendar className="w-8 h-8 text-gray-300" />
                    </div>
                    <p className="text-gray-900 font-medium mb-1">No upcoming events</p>
                    <p className="text-gray-500 text-sm max-w-xs mx-auto">Create an event to see it here</p>
                    <button 
                      onClick={onCreateEvent}
                      className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-full text-sm font-medium hover:bg-purple-700 transition-colors"
                    >
                      Create Event
                    </button>
                  </div>
                ) : (
                  publishedEvents
                    .filter(e => new Date(e.date) >= new Date())
                    .map((event) => (
                      <EventCard
                        key={event.id}
                        event={event}
                        onClick={(e) => setSelectedEvent(e)}
                        className="border border-gray-100 hover:shadow-md transition-all"
                      />
                    ))
                )}
              </div>
            )}
            {activeTab === 'tickets' && (
              <div>
                {uniqueTicketGroups.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                      <TicketIcon className="w-8 h-8 text-gray-300" />
                    </div>
                    <p className="text-gray-900 font-medium mb-1">No tickets yet</p>
                    <p className="text-gray-500 text-sm max-w-xs mx-auto mb-4">You haven't purchased any tickets yet. Explore events to get started!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-1">
                    {uniqueTicketGroups.map((tickets) => {
                      const ticket = tickets[0];
                      return (
                        <div
                          key={ticket.event_id}
                          onClick={() => {
                            setSelectedEventTickets(tickets);
                            setShowTicketListModal(true);
                          }}
                          className="relative aspect-square cursor-pointer group"
                        >
                          <ImageWithFallback
                            src={ticket.event?.image_url}
                            alt={`Event ${ticket.event?.title}`}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-black/80 rounded text-white text-[10px]">
                            {tickets.length} Ticket{tickets.length > 1 ? 's' : ''}
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-black/80 to-transparent">
                            <p className="text-white text-[10px] line-clamp-1 font-medium">{ticket.event?.title}</p>
                          </div>
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <div className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center">
                              <TicketIcon className="w-5 h-5 text-purple-600 fill-purple-600 ml-0.5" />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Floating Action Button - Share Post */}
      {isOwnProfile && (
        <button
          onClick={() => navigate('/compose/post')}
          className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] right-6 w-12 h-12 rounded-full bg-[#8A2BE2] shadow-xl hover:shadow-purple-500/40 hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center z-40 group"
          title="Share a post"
        >
          <Camera className="w-6 h-6 text-white group-hover:rotate-12 transition-transform" />
        </button>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <SettingsModal
          onClose={() => setShowSettingsModal(false)}
          initialView={settingsInitialView}
        />
      )}

      {/* Wallet Modal */}
      {showWalletModal && (
        <WalletModal
          isOpen={showWalletModal}
          onClose={() => setShowWalletModal(false)}
        />
      )}

      {/* Live Setup Modal */}
      {showLiveSetupModal && (
        <LiveSetupModal
          isOpen={showLiveSetupModal}
          onClose={() => setShowLiveSetupModal(false)}
        />
      )}

      {/* Ticket List Modal */}
      {showTicketListModal && (
        <TicketListModal
          isOpen={showTicketListModal}
          eventName={selectedEventTickets[0]?.event?.title || 'My Tickets'}
          onClose={() => setShowTicketListModal(false)}
          tickets={selectedEventTickets}
          onSelectTicket={(ticket) => {
            const mapped: TicketViewerTicket = {
              id: ticket.id,
              name: ticket.event?.title || 'Event',
              date: ticket.event?.date || '',
              time: ticket.event?.time || '',
              location: ticket.event?.location || '',
              image: ticket.event?.image_url || '',
              category: (ticket.event as any)?.category || '',
              ticketType: ticket.ticket_type || '',
              price: ticket.price || '',
              qrCode: ticket.qr_code || ticket.barcode || ticket.ticket_number || String(ticket.id),
            };
            setSelectedTicket(mapped);
            setShowTicketViewer(true);
          }}
        />
      )}

      {/* Ticket Viewer */}
      {showTicketViewer && selectedTicket && (
        <TicketViewer
          ticket={selectedTicket}
          onClose={() => setShowTicketViewer(false)}
        />
      )}

      {/* Event Detail Modal */}
      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onPurchaseTicket={() => {
             toast.info("Please go to Events page to purchase tickets");
          }}
          onPurchaseNormalTicket={() => {
             toast.info("Please go to Events page to purchase tickets");
          }}
        />
      )}

      {/* Event List Modal */}
      {showEventListModal && (
        <EventListModal
          title={isOrganizer ? "Hosted Events" : "Attended Events"}
          events={isOrganizer ? (publishedEvents as any) : attendedEvents}
          onClose={() => setShowEventListModal(false)}
          onEventClick={(event) => {
            setSelectedEvent(event);
            setShowEventListModal(false);
          }}
        />
      )}

      {/* Follower/Following Modals */}
      {showFollowersModal && (
        <UserListModal
          isOpen={showFollowersModal}
          onClose={() => setShowFollowersModal(false)}
          title="Followers"
          users={followList}
          loading={isLoadingFollowList}
          onUserSelect={(user) => {
            setSelectedUserForModal(user);
            setShowUserProfileModal(true);
          }}
        />
      )}

      {showFollowingModal && (
        <UserListModal
          isOpen={showFollowingModal}
          onClose={() => setShowFollowingModal(false)}
          title="Following"
          users={followList}
          loading={isLoadingFollowList}
          onUserSelect={(user) => {
            setSelectedUserForModal(user);
            setShowUserProfileModal(true);
          }}
        />
      )}

      {/* User Profile Modal */}
      {showUserProfileModal && selectedUserForModal && (
        <UserProfileModal
          user={{
            id: selectedUserForModal.id,
            name: selectedUserForModal.full_name || selectedUserForModal.username || 'User',
            type: selectedUserForModal.is_organizer ? 'Organizer' : 'Attendee',
            avatar: selectedUserForModal.avatar_url || '',
            verified: !!selectedUserForModal.verified,
            isOrganizer: !!selectedUserForModal.is_organizer,
            username: selectedUserForModal.username || '',
          } as any}
          onClose={() => setShowUserProfileModal(false)}
          onMessage={() => {
            if (!currentUser) {
              toast.error('Please sign in to message');
              return;
            }
            navigate('/feed', {
              state: {
                openMessages: true,
                userToMessage: {
                  id: selectedUserForModal.id,
                  name: selectedUserForModal.full_name || selectedUserForModal.username || 'User',
                  username: selectedUserForModal.username || '',
                  avatar: selectedUserForModal.avatar_url || '',
                  verified: !!selectedUserForModal.verified,
                  isOrganizer: !!selectedUserForModal.is_organizer,
                }
              }
            });
            setShowUserProfileModal(false);
          }}
        />
      )}
      
      {/* Professional Dashboard Modal */}
      {showProfessionalDashboard && (
        <ProfessionalDashboardModal
          onClose={() => setShowProfessionalDashboard(false)}
          organizerProfile={userProfile}
          onCreateEvent={onCreateEvent || (() => {})}
          onEditEvent={onEditEvent}
        />
      )}

    </div>
  );
}
