import { useState, useEffect, useRef } from 'react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { EventCard } from './EventCard';
import { Settings, MapPin, Calendar, Video, Edit2, Bookmark, X, Sparkles, Play, Ticket as TicketIcon, Camera, Image as ImageIcon, Smile, Loader2, Upload, Heart, Plus, Trash, BarChart3, MoreHorizontal, Clock, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { SettingsModal } from './SettingsModal';
import { MediaViewer } from './MediaViewer';
import { TicketViewer } from './TicketViewer';
import { EventDetailModal } from './EventDetailModal';
import { UserAvatar } from './UserAvatar';
import { supabase } from '../utils/supabase/client';
import { getProfile, getUserTickets, getSavedEvents, getFollowersCount, getFollowingCount, createPost, uploadImage, getPosts, subscribeToSavedEvents, Profile as UserProfile, Ticket, Post, getFollowers, getFollowing, deletePost, getOrganizerProfile, getOrganizerStats, getOrganizerEvents, deleteEvent } from '../utils/supabase/api';
import type { Event as AppEvent } from '../utils/supabase/api';
import { UserListModal } from './UserListModal';
import { UserProfileModal } from './UserProfileModal';
import { TicketListModal } from './TicketListModal';
import { ProfessionalDashboardModal } from './ProfessionalDashboardModal';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";

const FALLBACK_COVER_IMAGE = "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80"; // Generic event background

interface ProfileProps {
  onLogout: () => Promise<void>;
  onCreateEvent?: () => void;
  onEditEvent?: (event: any) => void;
}

export function Profile({ onLogout, onCreateEvent, onEditEvent }: ProfileProps) {
  const [activeTab, setActiveTab] = useState<'tickets' | 'events' | 'media' | 'saved' | 'my_events'>('events');
  const [savedEvents, setSavedEvents] = useState<(AppEvent & { isSaved: boolean; hasReminder: boolean })[]>([]);
  const [showSavedEventsModal, setShowSavedEventsModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsInitialView, setSettingsInitialView] = useState<'main' | 'profile'>('main');
  // const [showOrganizerOnboarding, setShowOrganizerOnboarding] = useState(false);
  const [showSharePostModal, setShowSharePostModal] = useState(false);
  const [postCaption, setPostCaption] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [postType, setPostType] = useState<'photo' | 'video' | null>(null);
  const [showMediaViewer, setShowMediaViewer] = useState(false);
  const [mediaViewerIndex, setMediaViewerIndex] = useState(0);
  const [mediaViewerType, setMediaViewerType] = useState<'photo' | 'video'>('photo');
  const [showTicketViewer, setShowTicketViewer] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<AppEvent | null>(null);
  
  // Ticket List Modal State
  const [showTicketListModal, setShowTicketListModal] = useState(false);
  const [selectedEventTickets, setSelectedEventTickets] = useState<Ticket[]>([]);
  
  // Data states
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [organizerProfile, setOrganizerProfile] = useState<any>(null);
  const [organizerStats, setOrganizerStats] = useState<any>(null);
  const [publishedEvents, setPublishedEvents] = useState<any[]>([]);
  const [showProfessionalDashboard, setShowProfessionalDashboard] = useState(false);
  
  const [attendedEvents, setAttendedEvents] = useState<AppEvent[]>([]);
  const [ticketEvents, setTicketEvents] = useState<Ticket[]>([]);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [followStats, setFollowStats] = useState({ followers: 0, following: 0 });
  
  // Follower/Following Modal State
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [followList, setFollowList] = useState<any[]>([]);
  const [isLoadingFollowList, setIsLoadingFollowList] = useState(false);

  // User Profile Modal State
  const [showUserProfileModal, setShowUserProfileModal] = useState(false);
  const [selectedUserForModal, setSelectedUserForModal] = useState<any>(null);

  const handleShowFollowers = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    setShowFollowersModal(true);
    setIsLoadingFollowList(true);
    try {
      const followers = await getFollowers(user.id);
      setFollowList(followers);
    } catch (err) {
      console.error('Error fetching followers:', err);
      toast.error('Failed to load followers');
    } finally {
      setIsLoadingFollowList(false);
    }
  };

  const handleShowFollowing = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    setShowFollowingModal(true);
    setIsLoadingFollowList(true);
    try {
      const following = await getFollowing(user.id);
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

  // Load all data
  useEffect(() => {

    const fetchSavedEvents = async (userId: string) => {
      try {
        const saved = await getSavedEvents(userId);
        if (saved) {
           setSavedEvents(saved as unknown as (Event & { isSaved: boolean; hasReminder: boolean })[]);
        }
      } catch (error) {
        console.error('Error fetching saved events:', error);
      }
    };

    const loadData = async () => {
      try {
        setIsLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          // 1. Profile
          const profile = await getProfile(user.id);
          if (profile) setUserProfile(profile);

          // 1b. Organizer Profile & Stats
          try {
            const orgProfile = await getOrganizerProfile(user.id);
            if (orgProfile) {
              setOrganizerProfile({
                organizerName: orgProfile.organizer_name || profile?.full_name || 'Organizer',
                ...orgProfile
              });
              
              // Load stats only if organizer
              const stats = await getOrganizerStats(user.id);
              setOrganizerStats(stats);

              // Load created events
              const events = await getOrganizerEvents(user.id);
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
            console.error('Error loading organizer data:', err);
          }

          // Load Follow Stats
          try {
            const followers = await getFollowersCount(user.id);
            const following = await getFollowingCount(user.id);
            setFollowStats({ followers, following });
          } catch (err) {
            console.error('Error loading follow stats:', err);
            // Default to 0 is already set in state
          }
          
          // 2. Saved Events (from DB)
          await fetchSavedEvents(user.id);

          // Subscribe to saved events changes
          savedEventsSubscriptionRef.current = subscribeToSavedEvents(user.id, () => {
            fetchSavedEvents(user.id);
          });

          // 3. Tickets
          const tickets = await getUserTickets(user.id);
          if (tickets) {
            setTicketEvents(tickets);
            
            // Derive Attended Events (Past Tickets)
            const attended = tickets
              .filter(t => {
                if (!t.event?.date) return false;
                const eventDate = new Date(t.event.date);
                return !isNaN(eventDate.getTime()) && eventDate < new Date();
              })
              .map(t => t.event!)
              .filter(e => !!e);
            
            // Deduplicate
            const uniqueAttended = Array.from(new Map(attended.map(item => [item.id, item])).values());
            setAttendedEvents(uniqueAttended);
          }

          // 4. Posts (for Photos & Videos)
          const posts = await getPosts({ authorId: user.id });
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
  }, []);

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
        user_id: user.id
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

  const handleDeletePost = async (postId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    
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

  // Derive media from posts
  const filteredUserPosts = userPosts.filter(p => !p.posted_as_organizer);
  const photos = filteredUserPosts.flatMap(p => 
    (p.image_urls || []).map((url, idx) => ({
      id: p.id * 1000 + idx,
      url,
      likes: p.likes_count || 0,
      eventName: p.content,
      isPost: true,
      postId: p.id,
      isLiked: p.is_liked
    }))
  );

  const videoClips = filteredUserPosts
    .filter(p => p.video_url)
    .map(p => ({
      id: p.id,
      thumbnail: p.image_urls?.[0] || FALLBACK_COVER_IMAGE,
      videoUrl: p.video_url!,
      views: 0,
      likes: p.likes_count || 0,
      eventName: p.content,
      isPost: true,
      postId: p.id,
      isLiked: p.is_liked,
      duration: '0:30'
    }));

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
    <div className="bg-white min-h-screen pb-20">
      {/* Immersive Header Design */}
      <div className="relative">
        {/* Large Cover Photo - Half Screen */}
        <div className="relative w-full h-[45vh] overflow-hidden">
          <ImageWithFallback
            src={organizerProfile?.cover_url || organizerProfile?.organizer_avatar_url || userProfile?.avatar_url || FALLBACK_COVER_IMAGE}
            alt="Profile"
            className="w-full h-full object-cover"
          />
          {/* Settings Button - Top Right */}
          <button 
            className="absolute top-6 right-6 p-2.5 bg-black/20 backdrop-blur-md rounded-full text-white hover:bg-black/40 transition-all z-10" 
            onClick={() => {
              setSettingsInitialView('main');
              setShowSettingsModal(true);
            }}
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>

        {/* Profile Content Sheet - Slides up */}
        <div className="relative -mt-16 bg-white rounded-t-[2.5rem] px-6 pt-16 pb-6 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
          
          {/* Header Info */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-gray-900 text-2xl font-bold mb-1">
                {organizerProfile?.organizerName || userProfile?.full_name || 'Loading...'}
              </h1>
              <p className="text-gray-500 text-sm font-medium">
                {organizerProfile?.organizerType || `@${userProfile?.username || 'user'}`}
              </p>
            </div>
            
            {/* Actions */}
            <div className="flex items-center gap-2">
              {organizerProfile && (
                <button
                  onClick={() => setShowProfessionalDashboard(true)}
                  className="px-4 py-2 bg-[#8A2BE2] text-white rounded-xl text-sm font-semibold hover:bg-[#7825d4] transition-colors flex items-center gap-2 shadow-sm"
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  Dashboard
                </button>
              )}
              <button 
                onClick={() => {
                  setSettingsInitialView('profile');
                  setShowSettingsModal(true);
                }}
                className="px-4 py-2 bg-purple-50 text-purple-600 rounded-xl text-sm font-semibold hover:bg-purple-100 transition-colors flex items-center gap-2"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Edit
              </button>
            </div>
          </div>

          {/* Bio */}
          <div className="mb-6">
            <p className="text-gray-700 leading-relaxed text-[15px]">
              {organizerProfile?.bio || userProfile?.bio ? (
                organizerProfile?.bio || userProfile?.bio
              ) : (
                <span className="text-gray-400 italic">No bio yet</span>
              )}
            </p>
          </div>

          {/* Stats Cards - Modern Grid */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-gray-50 rounded-2xl p-3 text-center border border-gray-100">
              <span className="block text-gray-900 font-bold text-lg mb-0.5">
                {organizerStats ? organizerStats.totalEvents : attendedEvents.length}
              </span>
              <span className="text-gray-500 text-xs font-medium">
                {organizerStats ? 'Hosted' : 'Attended'}
              </span>
            </div>
            <div 
              className="bg-gray-50 rounded-2xl p-3 text-center border border-gray-100 cursor-pointer hover:border-purple-200 hover:bg-purple-50 transition-all"
              onClick={handleShowFollowers}
            >
              <span className="block text-gray-900 font-bold text-lg mb-0.5">
                {organizerStats ? organizerStats.followers : followStats.followers}
              </span>
              <span className="text-gray-500 text-xs font-medium">Followers</span>
            </div>
            <div 
              className="bg-gray-50 rounded-2xl p-3 text-center border border-gray-100 cursor-pointer hover:border-purple-200 hover:bg-purple-50 transition-all"
              onClick={handleShowFollowing}
            >
              <span className="block text-gray-900 font-bold text-lg mb-0.5">{followStats.following}</span>
              <span className="text-gray-500 text-xs font-medium">Following</span>
            </div>
          </div>

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
            />
          )}

          {/* Modern Tab Navigation */}
          <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl overflow-x-auto no-scrollbar">
            {organizerProfile && (
               <button
                onClick={() => setActiveTab('my_events')}
                className={`flex-1 min-w-[70px] flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-lg transition-all ${
                  activeTab === 'my_events'
                    ? 'bg-white text-purple-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Calendar className="w-6 h-6" />
                <span className="text-[11px] whitespace-nowrap">Created</span>
              </button>
            )}
            <button
              onClick={() => setActiveTab('tickets')}
              className={`flex-1 min-w-[70px] flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-lg transition-all ${
                activeTab === 'tickets'
                  ? 'bg-white text-purple-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <TicketIcon className="w-6 h-6" />
              <span className="text-[11px] whitespace-nowrap">Tickets</span>
            </button>
            <button
              onClick={() => setActiveTab('events')}
              className={`flex-1 min-w-[70px] flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-lg transition-all ${
                activeTab === 'events'
                  ? 'bg-white text-purple-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Clock className="w-6 h-6" />
              <span className="text-[11px] whitespace-nowrap">History</span>
            </button>
            <button
              onClick={() => setActiveTab('media')}
              className={`flex-1 min-w-[70px] flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-lg transition-all ${
                activeTab === 'media'
                  ? 'bg-white text-purple-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <ImageIcon className="w-6 h-6" />
              <span className="text-[11px] whitespace-nowrap">Media</span>
            </button>
            <button
              onClick={() => setActiveTab('saved')}
              className={`relative flex-1 min-w-[70px] flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-lg transition-all ${
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
              <span className="text-[11px] whitespace-nowrap">Saved</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="px-6">
        {isLoading && (
          <div className="py-3 text-gray-500 text-sm">Loading...</div>
        )}
        {/* Created Events - Organizer Only */}
        {activeTab === 'my_events' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-gray-900">Created Events</h3>
              <button 
                onClick={onCreateEvent}
                className="text-purple-600 text-sm font-semibold flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Create
              </button>
            </div>
            
            {publishedEvents.length === 0 ? (
               <div className="flex flex-col items-center justify-center py-12 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                 <Calendar className="w-12 h-12 text-gray-300 mb-3" />
                 <p className="text-gray-900 font-medium mb-1">No events created yet</p>
                 <button 
                   onClick={onCreateEvent}
                   className="text-purple-600 text-sm font-medium hover:underline"
                 >
                   Create your first event
                 </button>
               </div>
            ) : (
              publishedEvents.map((event) => (
                <div key={event.id} className="flex gap-4 bg-white border border-gray-100 rounded-xl p-3 hover:shadow-md transition-all cursor-pointer group relative">
                  <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                    <ImageWithFallback
                      src={event.coverImage}
                      alt={event.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-1 left-1 bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded text-[10px] text-white">
                      {event.status || 'Published'}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-gray-900 text-sm mb-1 line-clamp-1">{event.title}</h4>
                    <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(event.date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                       <div className="flex items-center gap-1 text-xs text-gray-500">
                         <TicketIcon className="w-3 h-3" />
                         <span>{event.ticketsSold || 0}</span>
                       </div>
                       <div className="flex items-center gap-1 text-xs text-gray-500">
                         <Eye className="w-3 h-3" />
                         <span>{event.views || 0}</span>
                       </div>
                    </div>
                  </div>
                  
                  {/* Actions Menu */}
                  <div className="absolute top-3 right-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1 hover:bg-gray-100 rounded-full">
                          <MoreHorizontal className="w-4 h-4 text-gray-400" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEditEvent?.(event)}>
                          <Edit2 className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                           className="text-red-600"
                           onClick={async (e) => {
                             e.stopPropagation();
                             if (window.confirm('Delete this event?')) {
                               try {
                                 await deleteEvent(event.id);
                                 setPublishedEvents(prev => prev.filter(p => p.id !== event.id));
                                 toast.success('Event deleted');
                               } catch (err) {
                                 toast.error('Failed to delete event');
                               }
                             }
                           }}
                        >
                          <Trash className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

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
                    src={event.image_url}
                    alt={event.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-gray-900 text-sm mb-1 line-clamp-1">{event.title}</h4>
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

        {/* Media Grid (Photos & Videos) */}
        {activeTab === 'media' && (
          <div className="space-y-8">
            {/* Photos Section */}
            {photos.length > 0 && (
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
                        <button 
                          onClick={(e) => handleDeletePost(photo.postId, e)}
                          className="absolute top-2 right-2 p-1.5 bg-black/40 hover:bg-red-500/80 rounded-full text-white transition-colors z-10"
                          title="Delete post"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
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

            {/* Videos Section */}
            {videoClips.length > 0 && (
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
                      <video
                        src={video.videoUrl}
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
                      {/* Duration Badge */}
                      <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 bg-black/80 rounded text-white text-[10px] pointer-events-none">
                        {video.duration}
                      </div>
                      {/* Hover Stats */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button 
                          onClick={(e) => handleDeletePost(video.postId, e)}
                          className="absolute top-2 right-2 p-1.5 bg-black/40 hover:bg-red-500/80 rounded-full text-white transition-colors z-10"
                          title="Delete post"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                        <div className="flex flex-col items-center gap-1 text-white text-xs pointer-events-none">
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

            {photos.length === 0 && videoClips.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                <ImageIcon className="w-12 h-12 text-gray-300 mb-3" />
                <p className="text-gray-900 font-medium mb-1">No media shared yet</p>
                <p className="text-gray-500 text-sm">Share photos and videos from events you attend</p>
              </div>
            )}
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

        {/* Tickets Grid - Instagram Style */}
        {activeTab === 'tickets' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-900">Tickets</h3>
              <span className="text-gray-500 text-sm">{uniqueTicketGroups.length} events</span>
            </div>
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
                      src={ticket.event?.image_url || FALLBACK_COVER_IMAGE}
                      alt={`Event ${ticket.event?.title}`}
                      className="w-full h-full object-cover"
                    />
                    {/* Count Badge */}
                    <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-black/80 rounded text-white text-[10px]">
                      {tickets.length} Ticket{tickets.length > 1 ? 's' : ''}
                    </div>
                    
                    {/* Event Name (Bottom) */}
                    <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-black/80 to-transparent">
                      <p className="text-white text-[10px] line-clamp-1 font-medium">{ticket.event?.title}</p>
                    </div>

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center">
                        <TicketIcon className="w-5 h-5 text-purple-600 fill-purple-600 ml-0.5" />
                      </div>
                    </div>
                  </div>
                );
              })}
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

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-2">
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
            qrCode: selectedTicket.qr_code || '',
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
