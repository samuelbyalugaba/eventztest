import { useState, useEffect, useRef } from 'react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { EventCard } from './EventCard';
import { Settings, Calendar, Video, Bookmark, X, Sparkles, Play, Ticket as TicketIcon, Camera, Image as ImageIcon, Smile, Loader2, Upload, Heart, Plus, Trash, BarChart3, User, Briefcase, LayoutGrid, Radio, Menu, Wallet, Layers, LogOut, ChevronLeft, PenTool, Star } from 'lucide-react';
import { toast } from 'sonner';
import { SettingsModal } from './SettingsModal';
import { TicketViewer } from './TicketViewer';
import { EventDetailModal } from './EventDetailModal';
import { UserAvatar } from './UserAvatar';
import { supabase } from '../utils/supabase/client';
import { getProfile, getUserTickets, getSavedEvents, getFollowersCount, getFollowingCount, createPost, uploadImage, getPosts, subscribeToSavedEvents, Profile as UserProfile, Ticket, Post as ApiPost, getFollowers, getFollowing, deletePost, getOrganizerProfile, getOrganizerStats, getOrganizerEvents, toggleLikePost, toggleSavePost } from '../utils/supabase/api';
import { WalletModal } from './WalletModal';
import { LiveSetupModal } from './LiveSetupModal';
import type { Event as AppEvent } from '../utils/supabase/api';
import { UserListModal } from './UserListModal';
import { UserProfileModal } from './UserProfileModal';
import { TicketListModal } from './TicketListModal';
import { ProfessionalDashboardModal } from './ProfessionalDashboardModal';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { PostCard } from './PostCard';
import { Post as UiPost } from '../types';
import { formatTimeAgo } from '../utils/format';
import { handleShare } from '../utils/share';

import { EventListModal } from './EventListModal';

interface ProfileProps {
  onLogout?: () => Promise<void>;
  onCreateEvent?: () => void;
  onEditEvent?: (event: any) => void;
  onStartOrganizerSetup?: () => void;
  userId?: string; // Optional: View another user's profile
  onBack?: () => void; // Optional: Back button handler
  onViewPost?: (post: any) => void;
}

export function Profile({ onLogout, onCreateEvent, onEditEvent, onStartOrganizerSetup, userId, onBack, onViewPost }: ProfileProps) {
  const [activeTab, setActiveTab] = useState<'tickets' | 'events' | 'media' | 'saved' | 'my_events' | 'hosted' | 'upcoming'>('media');
  const [savedEvents, setSavedEvents] = useState<(AppEvent & { isSaved: boolean; hasReminder: boolean })[]>([]);
  const [showSavedEventsModal, setShowSavedEventsModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsInitialView, setSettingsInitialView] = useState<'main' | 'profile'>('main');
  // const [showOrganizerOnboarding, setShowOrganizerOnboarding] = useState(false);
  const [showSharePostModal, setShowSharePostModal] = useState(false);
  const [postCaption, setPostCaption] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [postType, setPostType] = useState<'photo' | 'video' | null>(null);
  const [postAsOrganizer, setPostAsOrganizer] = useState(false);
  const [showTicketViewer, setShowTicketViewer] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<AppEvent | null>(null);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showLiveSetupModal, setShowLiveSetupModal] = useState(false);
  
  // Ticket List Modal State
  const [showTicketListModal, setShowTicketListModal] = useState(false);
  const [selectedEventTickets, setSelectedEventTickets] = useState<Ticket[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Data states
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [organizerProfile, setOrganizerProfile] = useState<any>(null);
  const [organizerStats, setOrganizerStats] = useState<any>(null);
  const [publishedEvents, setPublishedEvents] = useState<any[]>([]);
  const [showProfessionalDashboard, setShowProfessionalDashboard] = useState(false);
  
  const [attendedEvents, setAttendedEvents] = useState<AppEvent[]>([]);
  const [ticketEvents, setTicketEvents] = useState<Ticket[]>([]);
  const [userPosts, setUserPosts] = useState<ApiPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // Removed selectedDetailedPost as we use onViewPost for navigation
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
  
  // Upload states
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const savedEventsSubscriptionRef = useRef<any>(null);

  // Unified Profile Logic
  const isOrganizer = !!organizerProfile;
  const profileImage = isOrganizer 
    ? (organizerProfile?.cover_url || organizerProfile?.organizer_avatar_url || userProfile?.avatar_url) 
    : userProfile?.avatar_url;
  const displayName = isOrganizer 
    ? (organizerProfile?.organizerName || userProfile?.full_name) 
    : (userProfile?.full_name || 'User');
  const organizerCategory = organizerProfile?.organizer_type || organizerProfile?.organizerType;

  useEffect(() => {
    setPostAsOrganizer(isOrganizer);
  }, [isOrganizer]);

  useEffect(() => {
    const handleProfileUpdated = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        // Only refresh if viewing own profile
        if (isOwnProfile) {
            const profile = await getProfile(user.id);
            if (profile) {
              setUserProfile(profile);
            }
        }
      } catch (e) {
        console.error('Profile refresh failed', e);
      }
    };
    window.addEventListener('profileUpdated', handleProfileUpdated as EventListener);
    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdated as EventListener);
    };
  }, [isOwnProfile]);

  useEffect(() => {
    const fetchSavedEvents = async (uid: string) => {
      try {
        const saved = await getSavedEvents(uid);
        if (saved) {
           setSavedEvents(saved as unknown as (AppEvent & { isSaved: boolean; hasReminder: boolean })[]);
        }
      } catch (error) {
        console.error('Error fetching saved events:', error);
      }
    };

    const loadData = async () => {
      try {
        setIsLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) setCurrentUser(user);

        const targetUserId = userId || user?.id;
        
        if (targetUserId) {
          // 1. Profile
          const profile = await getProfile(targetUserId);
          if (profile) setUserProfile(profile);

          // 1b. Organizer Profile & Stats
          try {
            const orgProfile = await getOrganizerProfile(targetUserId);
            if (orgProfile) {
              setOrganizerProfile({
                organizerName: orgProfile.organizer_name || profile?.full_name || 'Organizer',
                ...orgProfile
              });
              
              // Load stats only if organizer
              const stats = await getOrganizerStats(targetUserId);
              setOrganizerStats(stats);

              // Load created events
              const events = await getOrganizerEvents(targetUserId);
              if (events) {
                 const mapEvent = (e: any) => ({
                   ...e,
                   coverImage: e.image_url || e.coverImage,
                   price: e.price_range || e.price
                });
                setPublishedEvents(events.map(mapEvent));
              }
            }
          } catch (err) {
            // It's okay if not an organizer
            // console.error('Error loading organizer data:', err);
          }

          // Load Follow Stats
          try {
            const followers = await getFollowersCount(targetUserId);
            const following = await getFollowingCount(targetUserId);
            setFollowStats({ followers, following });
          } catch (err) {
            console.error('Error loading follow stats:', err);
          }
          
          // 2. Saved Events (from DB) - Only for own profile usually, but fetch anyway
          if (isOwnProfile) {
             await fetchSavedEvents(targetUserId);
             savedEventsSubscriptionRef.current = subscribeToSavedEvents(targetUserId, () => {
                fetchSavedEvents(targetUserId);
             });
          }

          // 3. Tickets - Only meaningful for own profile privacy-wise, but logic allows fetching public info if API allows
          // Assuming getUserTickets is protected by RLS for own tickets only. 
          // If viewing other profile, tickets likely won't return or return empty unless public.
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

          // 4. Posts (for Photos & Videos)
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
    loadData();

    return () => {
      if (savedEventsSubscriptionRef.current) savedEventsSubscriptionRef.current.unsubscribe?.();
      savedEventsSubscriptionRef.current = null;
    };
  }, [userId, isOwnProfile]);

  // Clear state when modal opens
  useEffect(() => {
    if (showSharePostModal) {
      setSelectedFiles([]);
      setFilesToUpload([]);
      setPostCaption('');
      // Reset file input if it exists
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [showSharePostModal]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      
      // Validate file type based on postType
      const validFiles = files.filter(file => {
        if (postType === 'photo' && !file.type.startsWith('image/')) {
          toast.error(`Skipped ${file.name}: Not an image`);
          return false;
        }
        if (postType === 'video' && !file.type.startsWith('video/')) {
          toast.error(`Skipped ${file.name}: Not a video`);
          return false;
        }
        return true;
      });

      if (validFiles.length === 0) return;

      if (postType === 'video') {
        if (validFiles.length > 1) {
          toast.info("Only one video can be uploaded at a time.");
        }
        const file = validFiles[0];
        setFilesToUpload([file]);
        const url = URL.createObjectURL(file);
        setSelectedFiles([url]);
      } else {
        setFilesToUpload(prev => [...prev, ...validFiles]);
        const urls = validFiles.map(file => URL.createObjectURL(file));
        setSelectedFiles(prev => [...prev, ...urls]);
      }
    }
    // Reset input so the same file can be selected again if needed
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setFilesToUpload(prev => prev.filter((_, i) => i !== index));
    
    // If all files removed, go back to type selection
    if (selectedFiles.length === 1) {
      setPostType(null);
    }
  };

  const handleSharePost = async () => {
    if (filesToUpload.length === 0) {
      toast.error('Please select a file to upload');
      return;
    }

    try {
      setIsUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('You must be logged in to post');
        return;
      }

      // 1. Upload files
      const uploadedUrls: string[] = [];
      for (const file of filesToUpload) {
        // Use 'posts' bucket - api.ts handles fallback to 'events' if needed
        const publicUrl = await uploadImage(file, 'posts');
        if (publicUrl) uploadedUrls.push(publicUrl);
      }

      if (uploadedUrls.length === 0) {
        throw new Error('Failed to upload files');
      }

      // 2. Create post
      await createPost({
        content: postCaption,
        image_urls: postType === 'photo' ? uploadedUrls : [],
        video_url: postType === 'video' ? uploadedUrls[0] : undefined,
        hashtags: [],
        user_id: user.id,
        posted_as_organizer: postAsOrganizer
      });

      toast.success('Post shared successfully! 🎉', {
        description: 'Your event moment has been shared with your followers',
      });

      // Cleanup
      setShowSharePostModal(false);
      setPostType(null);
      setSelectedFiles([]);
      setFilesToUpload([]);
      setPostCaption('');
      
      // Refresh posts
      const updatedPosts = await getPosts({ authorId: user.id });
      if (updatedPosts) {
         setUserPosts(updatedPosts);
      }

    } catch (error) {
      console.error('Error sharing post:', error);
      toast.error('Failed to share post');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeletePost = async (postId: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    
    if (!window.confirm("Are you sure you want to delete this post?")) return;

    try {
      // Optimistic update
      setUserPosts(prev => prev.filter(p => p.id !== postId));

      await deletePost(postId);
      toast.success('Post deleted');
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Failed to delete post');
      
      // Revert/Reload
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const posts = await getPosts({ authorId: user.id });
        if (posts) setUserPosts(posts);
      }
    }
  };

  const handleLike = async (postId: number) => {
    // Optimistic update
    setUserPosts(prev => prev.map(p => {
        if (p.id === postId) {
            const newIsLiked = !p.is_liked;
            return { ...p, is_liked: newIsLiked, likes_count: newIsLiked ? (p.likes_count || 0) + 1 : (p.likes_count || 0) - 1 };
        }
        return p;
    }));

    if (currentUser) {
        try {
            await toggleLikePost(postId, currentUser.id);
        } catch (error) {
            console.error('Error liking post:', error);
            toast.error('Failed to update like');
        }
    }
  };

  const handleSave = async (postId: number) => {
     setUserPosts(prev => prev.map(p => {
        if (p.id === postId) {
            return { ...p, is_saved: !p.is_saved };
        }
        return p;
    }));

    if (currentUser) {
        try {
            await toggleSavePost(postId, currentUser.id);
        } catch (error) {
            console.error('Error saving post:', error);
        }
    }
  };

  const handleShareCard = async (post: UiPost) => {
      await handleShare({
        title: `Check out this post from ${post.user.name}`,
        text: post.content.text || 'Check out this amazing post on EVENTZ!',
        url: window.location.href,
      });
  };

  const handleOpenPost = (post: ApiPost) => {
    const isOrganizerPage = !!post.posted_as_organizer && !!post.organizer_profile;
    const displayName = isOrganizerPage ? (post.organizer_profile!.organizer_name || 'Unknown Organizer') : (post.user?.full_name || post.user?.username || 'Unknown User');
    const avatarUrl = isOrganizerPage ? post.organizer_profile!.organizer_avatar_url : post.user?.avatar_url;

    const uiPost: UiPost = {
      id: post.id,
      user: {
        id: isOrganizerPage ? (post.organizer_profile!.id || 'unknown') : (post.user?.id || 'unknown'),
        name: displayName || 'Unknown',
        username: post.user?.username || '@unknown',
        avatar: avatarUrl || '',
        verified: post.user?.verified || false,
        isOrganizer: post.user?.is_organizer || false,
        isOrganizerPage: isOrganizerPage
      },
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
    };
    
    if (onViewPost) {
      onViewPost(uiPost);
    }
  };

  // Derive media from posts
  // Show all posts for unified profile, maybe filter differently later if needed
  const filteredUserPosts = userPosts;

  // Group tickets by event
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
    <div className="bg-white min-h-screen pb-20 pt-6 px-6">
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
            ) : profileImage ? (
              <ImageWithFallback
                src={profileImage}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <UserAvatar 
                name={displayName} 
                className="w-full h-full text-2xl" 
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-2 text-gray-900 hover:bg-gray-100 rounded-full transition-colors">
                  <Menu className="w-8 h-8" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => setShowWalletModal(true)}>
                  <Wallet className="w-4 h-4 mr-2" />
                  Wallet
                </DropdownMenuItem>
                {isOrganizer && (
                  <DropdownMenuItem onClick={() => setShowProfessionalDashboard(true)}>
                      <BarChart3 className="w-4 h-4 mr-2" />
                      Dashboard
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem 
                  onClick={() => {
                    setSettingsInitialView('main');
                    setShowSettingsModal(true);
                  }}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => {
                    onLogout?.().then(() => toast.success("Logged out"));
                  }}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
              <p className={`${(isOrganizer && organizerProfile?.bio) ? 'text-gray-800 font-medium' : 'text-gray-600'} leading-relaxed text-[15px]`}>
                {(isOrganizer && organizerProfile?.bio) ? organizerProfile.bio : (
                  userProfile?.bio || (
                    !isOrganizer && <span className="text-gray-400 italic">No bio yet. Add your bio in Settings.</span>
                  )
                )}
              </p>
              {!userProfile?.bio && !isOrganizer && (
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
      <div className="flex items-center justify-between px-4 mb-8">
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
              className="text-center flex-1 border-r border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors py-1 rounded-lg"
              onClick={handleShowEventsList}
            >
              <div className="text-xl font-bold text-gray-900 mb-1">
                  {isOrganizer ? (organizerStats ? organizerStats.totalEvents : 0) : attendedEvents.length}
              </div>
              <div className="text-xs text-gray-500 uppercase tracking-wide font-semibold">
                  {isOrganizer ? 'Hosted' : 'Attended'}
              </div>
            </div>
            <div 
              className="text-center flex-1 border-r border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors py-1 rounded-lg"
              onClick={handleShowFollowers}
            >
              <div className="text-xl font-bold text-gray-900 mb-1">
                  {followStats.followers}
              </div>
              <div className="text-xs text-gray-500 uppercase tracking-wide font-semibold">
                  Followers
              </div>
            </div>
            <div 
              className="text-center flex-1 cursor-pointer hover:bg-gray-50 transition-colors py-1 rounded-lg"
              onClick={handleShowFollowing}
            >
              <div className="text-xl font-bold text-gray-900 mb-1">
                  {followStats.following}
              </div>
              <div className="text-xs text-gray-500 uppercase tracking-wide font-semibold">
                  Following
              </div>
            </div>
          </>
        )}
      </div>

      {/* Action Buttons */}
      {isOwnProfile ? (
        isOrganizer ? (
          <div className="flex gap-3 mb-8">
            <button 
              onClick={onCreateEvent}
              className="flex-1 py-3 bg-blue-50 text-blue-600 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-blue-100 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Events
            </button>
            <button 
              onClick={() => setShowProfessionalDashboard(true)}
              className="flex-1 py-3 bg-blue-50 text-blue-600 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-blue-100 transition-colors"
            >
              <BarChart3 className="w-4 h-4" />
              See Dashboard
            </button>
          </div>
        ) : (
          !isLoading && (
            <div 
                onClick={onStartOrganizerSetup}
                className="mb-8 bg-gray-50 rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors border border-gray-100"
            >
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center bg-[#8A2BE2]">
                        <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" />
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
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </div>
            </div>
          )
        )
      ) : (
        <div className="flex gap-3 mb-8">
          <button 
            className="flex-1 py-3 bg-purple-600 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-purple-700 transition-colors"
            onClick={() => {
               setIsFollowing(!isFollowing);
               toast.success(isFollowing ? 'Unfollowed' : 'Followed');
            }}
          >
            {isFollowing ? 'Following' : 'Follow'}
          </button>
          <button 
            className="flex-1 py-3 bg-gray-100 text-gray-900 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors"
            onClick={() => {
              // Handle message
              toast.info('Message feature coming soon');
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
                    <p className="text-gray-500 text-sm max-w-xs mx-auto">Share event photos and videos</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-1 animate-in fade-in zoom-in duration-300">
                    {filteredUserPosts.map((post) => {
                      const isVideo = !!post.video_url;
                      const firstImage = post.image_urls?.[0];
                      const isCarousel = (post.image_urls?.length || 0) > 1;
                      return (
                        <div
                          key={post.id}
                          onClick={() => handleOpenPost(post)}
                          className="relative aspect-square cursor-pointer group bg-gray-100 overflow-hidden"
                        >
                          {isVideo ? (
                            <video
                              src={post.video_url!}
                              className="w-full h-full object-cover"
                              muted
                              playsInline
                              loop
                              onMouseOver={(e) => e.currentTarget.play()}
                              onMouseOut={(e) => {
                                e.currentTarget.pause();
                                e.currentTarget.currentTime = 0;
                              }}
                            />
                          ) : (
                            <ImageWithFallback
                              src={firstImage}
                              alt={`Post ${post.id}`}
                              className="w-full h-full object-cover"
                            />
                          )}
                          {!isVideo && isCarousel && (
                            <div className="absolute top-2 right-2 p-1 bg-black/50 rounded text-white">
                              <Layers className="w-3 h-3" />
                            </div>
                          )}
                          {isVideo && (
                            <div className="absolute top-2 right-2 p-1 bg-black/50 rounded text-white">
                              <Play className="w-3 h-3" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button 
                              onClick={(e) => handleDeletePost(post.id, e)}
                              className="absolute top-2 right-2 p-1.5 bg-black/40 hover:bg-red-500/80 rounded-full text-white transition-colors z-10"
                              title="Delete post"
                            >
                              <Trash className="w-3.5 h-3.5" />
                            </button>
                            <div className="flex items-center gap-1 text-white text-sm">
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
                          src={event.image_url}
                          alt={event.title}
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
                          <p className="text-white mb-1 line-clamp-2 leading-snug">{event.title}</p>
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

      

      {/* Floating Action Button - Share Post */}
      <button
        onClick={() => setShowSharePostModal(true)}
        className="fixed bottom-24 right-6 w-12 h-12 rounded-full bg-[#8A2BE2] shadow-xl hover:shadow-purple-500/40 hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center z-40 group"
        title="Share a post"
      >
        <Camera className="w-6 h-6 text-white group-hover:rotate-12 transition-transform" />
      </button>

      {/* Share Post Modal */}
      {showSharePostModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => {
            if (!isUploading) {
              setShowSharePostModal(false);
              setPostType(null);
              setSelectedFiles([]);
              setFilesToUpload([]);
              setPostCaption('');
            }
          }}
        >
          <div 
            className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              multiple={postType === 'photo'}
              accept={postType === 'photo' ? 'image/*' : 'video/*'}
              onChange={handleFileSelect}
            />

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
                    if (!isUploading) {
                      setShowSharePostModal(false);
                      setPostType(null);
                      setSelectedFiles([]);
                      setFilesToUpload([]);
                      setPostCaption('');
                    }
                  }}
                  className="p-2 hover:bg-white/80 rounded-full transition-colors"
                  disabled={isUploading}
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
                        setTimeout(() => {
                          fileInputRef.current?.click();
                        }, 0);
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
                        setTimeout(() => {
                          fileInputRef.current?.click();
                        }, 0);
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
                </div>
              ) : (
                /* Post Creation Form */
                <div className="space-y-5">
                  {/* Preview Area */}
                  {selectedFiles.length > 0 && (
                    <div className="relative aspect-video rounded-2xl overflow-hidden bg-gray-100 shadow-lg group">
                      {postType === 'video' ? (
                          <div className="relative w-full h-full">
                             <video src={selectedFiles[0]} className="w-full h-full object-cover" />
                             <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                <div className="w-16 h-16 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-xl">
                                  <Play className="w-8 h-8 text-purple-600 fill-purple-600 ml-1" />
                                </div>
                             </div>
                          </div>
                      ) : (
                          <div className="flex overflow-x-auto snap-x snap-mandatory w-full h-full scrollbar-hide">
                             {selectedFiles.map((url, idx) => (
                                <div key={idx} className="flex-shrink-0 w-full h-full snap-center relative group/slide">
                                   <img src={url} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                                   <button 
                                      onClick={() => removeFile(idx)}
                                      className="absolute top-3 right-3 p-1.5 bg-black/50 backdrop-blur-sm hover:bg-red-500/80 rounded-full text-white transition-all opacity-0 group-hover/slide:opacity-100 z-10"
                                      title="Remove image"
                                   >
                                      <X className="w-4 h-4" />
                                   </button>
                                </div>
                             ))}
                          </div>
                      )}

                      {/* Add Button for Photos */}
                      {postType === 'photo' && (
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="absolute bottom-4 right-4 p-3 bg-white/90 backdrop-blur-sm shadow-lg rounded-full text-purple-600 hover:bg-white hover:scale-105 active:scale-95 transition-all z-20"
                          title="Add more photos"
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                      )}

                      {/* Carousel Indicators */}
                      {selectedFiles.length > 1 && (
                         <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                           {selectedFiles.map((_, idx) => (
                             <div key={idx} className="w-1.5 h-1.5 rounded-full bg-white/50 backdrop-blur-sm shadow-sm" />
                           ))}
                         </div>
                      )}

                      {/* Type Badge */}
                      <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-sm shadow-lg z-20">
                        <div className="flex items-center gap-2">
                          {postType === 'photo' ? (
                            <ImageIcon className="w-4 h-4 text-purple-600" />
                          ) : (
                            <Video className="w-4 h-4 text-pink-600" />
                          )}
                          <span className="text-sm capitalize text-gray-900">{postType}</span>
                           {selectedFiles.length > 1 && (
                             <span className="text-xs text-gray-500 border-l border-gray-300 pl-2 ml-1">
                               {selectedFiles.length} items
                             </span>
                           )}
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

                  <div className="flex items-center gap-3">
            {organizerProfile && (
              <button
                onClick={() => setPostAsOrganizer(!postAsOrganizer)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  postAsOrganizer 
                    ? 'bg-purple-100 text-purple-700 border border-purple-200' 
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {postAsOrganizer ? (
                  <>
                    <Briefcase className="w-3.5 h-3.5" />
                    <span>{organizerProfile.organizerName || 'Organizer'}</span>
                  </>
                ) : (
                  <>
                    <User className="w-3.5 h-3.5" />
                    <span>Myself</span>
                  </>
                )}
              </button>
            )}

            <button
              onClick={() => {
                        if (!isUploading) {
                          setPostType(null);
                          setSelectedFiles([]);
                          setFilesToUpload([]);
                          setPostCaption('');
                        }
                      }}
                      className="flex-1 px-6 py-3.5 rounded-xl border-2 border-gray-200 text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={isUploading}
                    >
                      Back
                    </button>
                    <button
                      onClick={handleSharePost}
                      disabled={isUploading}
                      className="flex-1 bg-[#8A2BE2] text-white px-6 py-3.5 rounded-xl hover:shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:hover:scale-100 disabled:active:scale-100 disabled:cursor-wait"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Posting...
                        </>
                      ) : (
                        <>
                          <Upload className="w-5 h-5" />
                          Share Post
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Event List Modal */}
      {showEventListModal && (
        <EventListModal
          title={isOrganizer ? "Hosted Events" : "Attended Events"}
          events={isOrganizer ? publishedEvents : attendedEvents}
          onClose={() => setShowEventListModal(false)}
          onEventClick={(event) => {
             setSelectedEvent(event);
             // Don't close the list modal to allow going back? 
             // Or close it? Usually clicking an item opens details on top.
             // If EventDetailModal opens on top, we can keep this open or close it.
             // Let's keep it open so back navigation works if implemented, or just close it.
             // Standard behavior: Close list, open detail.
             // But if detail is a modal, it stacks.
             // Let's stack it.
          }}
        />
      )}

      {/* Modals for Followers/Following/User Profile */}
      <UserListModal 
        isOpen={showFollowersModal}
        onClose={() => setShowFollowersModal(false)}
        title="Followers"
        users={followList}
        loading={isLoadingFollowList}
        onUserSelect={(user) => {
          setSelectedUserForModal({
            ...user,
            type: user.is_organizer ? 'Organizer' : 'Attendee',
            name: user.full_name || user.username || 'User',
            avatar: user.avatar_url || '',
            verified: false
          });
          setShowUserProfileModal(true);
        }}
      />

      <UserListModal 
        isOpen={showFollowingModal}
        onClose={() => setShowFollowingModal(false)}
        title="Following"
        users={followList}
        loading={isLoadingFollowList}
        onUserSelect={(user) => {
          setSelectedUserForModal({
            ...user,
            type: user.is_organizer ? 'Organizer' : 'Attendee',
            name: user.full_name || user.username || 'User',
            avatar: user.avatar_url || '',
            verified: false
          });
          setShowUserProfileModal(true);
        }}
      />

      {showUserProfileModal && selectedUserForModal && (
        <UserProfileModal
          user={selectedUserForModal}
          onClose={() => {
            setShowUserProfileModal(false);
            setSelectedUserForModal(null);
          }}
          onFollow={() => {
             if (showFollowersModal) handleShowFollowers();
             if (showFollowingModal) handleShowFollowing();
          }}
          onViewPost={onViewPost}
        />
      )}

      {showProfessionalDashboard && organizerProfile && (
        <ProfessionalDashboardModal
          onClose={() => setShowProfessionalDashboard(false)}
          organizerProfile={organizerProfile}
          onCreateEvent={() => {
             setShowProfessionalDashboard(false);
             onCreateEvent?.();
          }}
          onEditEvent={(event) => {
             setShowProfessionalDashboard(false);
             onEditEvent?.(event);
          }}
        />
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <SettingsModal
          onClose={() => setShowSettingsModal(false)}
          onLogout={onLogout}
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

      {/* Ticket Viewer */}
      {showTicketViewer && selectedTicket && (
        <TicketViewer
          ticket={{
            id: selectedTicket.id,
            name: selectedTicket.event?.title || 'Unknown Event',
            date: selectedTicket.event?.date || '',
            time: selectedTicket.event?.time || '',
            location: selectedTicket.event?.location || '',
            image: selectedTicket.event?.image_url || '',
            category: selectedTicket.event?.category || '',
            ticketType: selectedTicket.ticket_type,
            price: selectedTicket.price,
            qrCode: selectedTicket.ticket_number || selectedTicket.qr_code || '',
          }}
          onClose={() => {
            setShowTicketViewer(false);
            setSelectedTicket(null);
          }}
        />
      )}

      {/* Ticket List Modal */}
      {showTicketListModal && selectedEventTickets.length > 0 && (
        <TicketListModal
          eventName={selectedEventTickets[0].event?.title || 'Event'}
          tickets={selectedEventTickets}
          onClose={() => setShowTicketListModal(false)}
          onSelectTicket={(ticket) => {
            setSelectedTicket(ticket);
            setShowTicketViewer(true);
          }}
        />
      )}
    </div>
  );
}
