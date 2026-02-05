import { ImageWithFallback } from './figma/ImageWithFallback';
import { UserAvatar } from './UserAvatar';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { EventAnalyticsModal } from './EventAnalyticsModal';
import { HighlightViewerModal } from './HighlightViewerModal';
import { OrganizerSettingsModal } from './OrganizerSettingsModal';
import { CreatePostModal } from './CreatePostModal';
import { handleShare as shareUtil } from '../utils/share';
import { Settings, MapPin, Radio, BarChart3, Star, PlusCircle, Play, Share2, Heart, MessageCircle, DollarSign, Ticket, Eye, Users, Clock, Calendar, Edit, Trash2 } from 'lucide-react';
import { supabase } from '../utils/supabase/client';
import { getProfile, getPosts, toggleLikePost, getOrganizerStats, getOrganizerEvents, getFollowers, getOrganizerProfile, deletePost, deleteEvent } from '../utils/supabase/api';
import { ShareModal } from './ShareModal';
import { UserListModal } from './UserListModal';

interface OrganizerDashboardProps {
  onCreateEvent: () => void;
  onEditEvent?: (event: any) => void;
}

export function OrganizerDashboard({ onCreateEvent, onEditEvent }: OrganizerDashboardProps) {
  const [organizerProfile, setOrganizerProfile] = useState<any>({});
  const [publishedEvents, setPublishedEvents] = useState<any[]>([]);
  const [draftEvents, setDraftEvents] = useState<any[]>([]);
  const [selectedEventForAnalytics, setSelectedEventForAnalytics] = useState<any>(null);
  const [selectedHighlight, setSelectedHighlight] = useState<any>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareModalData, setShareModalData] = useState<{ title: string; text: string; url?: string } | null>(null);
  const [organizerPosts, setOrganizerPosts] = useState<any[]>([]);
  const [showCreatePostModal, setShowCreatePostModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'published' | 'drafts'>('published');
  const [stats, setStats] = useState({
    totalEvents: 0,
    followers: 0,
    totalViews: 0,
    revenue: 0,
    liveStreams: 0,
    ticketsSold: 0
  });

  // Followers Modal State
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [followersList, setFollowersList] = useState<any[]>([]);
  const [loadingFollowers, setLoadingFollowers] = useState(false);

  const handleShowFollowers = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    setShowFollowersModal(true);
    setLoadingFollowers(true);
    try {
      const followers = await getFollowers(user.id);
      setFollowersList(followers);
    } catch (err) {
      console.error('Error fetching followers:', err);
      toast.error('Failed to load followers');
    } finally {
      setLoadingFollowers(false);
    }
  };

  // Load published events and profile from Supabase
  useEffect(() => {
    const loadOrganizerData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          return;
        }

        // Load profile
        // Try to get organizer profile first
        try {
          const orgProfile = await getOrganizerProfile(user.id);
          if (orgProfile) {
            setOrganizerProfile({
              organizerName: orgProfile.organizer_name || 'Organizer',
              organizerType: orgProfile.organizer_type || 'Event Organizer',
              location: orgProfile.location || 'Location not set',
              avatar_url: orgProfile.avatar_url,
              cover_url: orgProfile.cover_url,
              ...orgProfile
            });
          } else {
             // Fallback to user profile if no organizer profile
             // But give it a distinct "Organization" feel as requested
             const profile = await getProfile(user.id);
             if (profile) {
               setOrganizerProfile({
                 organizerName: 'Your Organization', // Default to generic name to distinguish from user profile
                 organizerType: 'Event Organizer',
                 location: profile.location || 'Location not set',
                 avatar_url: profile.avatar_url,
                 cover_url: profile.cover_url,
                 ...profile,
                 isDefault: true // Flag to indicate this is a fallback
               });
             }
          }
        } catch (err) {
           console.error("Error loading organizer profile", err);
           const profile = await getProfile(user.id);
           if (profile) {
             setOrganizerProfile({
               organizerName: 'Your Organization',
               organizerType: 'Event Organizer',
               location: profile.location || 'Location not set',
               avatar_url: profile.avatar_url,
               cover_url: profile.cover_url,
               ...profile,
               isDefault: true
             });
           }
        }

        // Load stats
        const statsData = await getOrganizerStats(user.id);
        setStats(statsData);

        // Load events
        const userEvents = await getOrganizerEvents(user.id);
        if (userEvents) {
          const published = userEvents.filter((e: any) => e.status === 'published' || !e.status);
          const drafts = userEvents.filter((e: any) => e.status === 'draft');

          const mapEvent = (e: any) => ({
             ...e,
             coverImage: e.image_url || e.coverImage, // Map image_url to coverImage
             price: e.price_range || e.price // Map price_range to price
          });

          setPublishedEvents(published.map(mapEvent));
          setDraftEvents(drafts.map(mapEvent));
        }

        // Load posts (highlights)
        const userPosts = await getPosts({ currentUserId: user.id, authorId: user.id });
        if (userPosts) {
          setOrganizerPosts(userPosts.map((p: any) => ({
             id: p.id,
             type: 'post',
             mediaType: p.video_url ? 'video' : (p.image_urls && p.image_urls.length > 0 ? 'image' : 'text'),
             title: p.content ? p.content.substring(0, 30) + '...' : 'New Post',
             description: p.content,
             image: p.image_urls ? p.image_urls[0] : 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80',
             video: p.video_url,
             likes: p.likes_count || 0,
             comments: p.comments_count || 0,
             shares: 0,
             timestamp: new Date(p.created_at).toLocaleDateString(),
             isLiked: p.is_liked
          })));
        }

      } catch (error) {
        console.error('Error loading organizer data:', error);
        toast.error('Failed to load dashboard data');
      }
    };

    loadOrganizerData();
    
    // Listen for updates
    const handleEventsUpdated = () => {
      loadOrganizerData();
    };
    const handlePostsUpdated = () => {
      loadOrganizerData();
    };

    window.addEventListener('eventsUpdated', handleEventsUpdated);
    window.addEventListener('postsUpdated', handlePostsUpdated);
    
    return () => {
      window.removeEventListener('eventsUpdated', handleEventsUpdated);
      window.removeEventListener('postsUpdated', handlePostsUpdated);
    };
  }, []);

  // Helper function to format numbers with k notation
  const formatNumber = (num: number): string => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  };

  const highlights = organizerPosts.length > 0 ? organizerPosts : [];

  const handleShare = async (highlight: typeof highlights[0]) => {
    const shared = await shareUtil({
      title: highlight.title,
      text: `Check out this highlight from my event!`,
      url: window.location.href,
    });
    
    // If native share not available, show custom modal
    if (!shared) {
      setShareModalData({
        title: highlight.title,
        text: 'Check out this highlight from my event!',
        url: window.location.href,
      });
      setShowShareModal(true);
    }
  };

  const handleLike = async (highlightId: number) => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            toast.error('Please sign in to like posts');
            return;
        }

        // Optimistic update
        const updatedPosts = organizerPosts.map(post => {
            if (post.id === highlightId) {
                return {
                    ...post,
                    isLiked: !post.isLiked,
                    likes: post.isLiked ? post.likes - 1 : post.likes + 1
                };
            }
            return post;
        });
        setOrganizerPosts(updatedPosts);
        
        // Find if this is a like or unlike action based on previous state
        const post = organizerPosts.find(p => p.id === highlightId);
        if (post) {
            await toggleLikePost(highlightId, user.id);
            toast.success(post.isLiked ? 'Unliked' : 'Liked!');
        }
    } catch (error) {
        console.error('Error toggling like:', error);
        toast.error('Failed to update like');
        // Revert on error - re-fetch or revert state
    }
  };

  const handleDeletePost = async (postId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    
    try {
      await deletePost(postId);
      setOrganizerPosts(organizerPosts.filter(p => p.id !== postId));
      toast.success('Post deleted');
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Failed to delete post');
    }
  };

  const handleDeleteEvent = async (eventId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this event?')) return;
    
    try {
      await deleteEvent(eventId);
      setPublishedEvents(publishedEvents.filter(ev => ev.id !== eventId));
      setDraftEvents(draftEvents.filter(ev => ev.id !== eventId));
      toast.success('Event deleted');
      setStats(prev => ({ ...prev, totalEvents: prev.totalEvents - 1 }));
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Failed to delete event');
    }
  };

  return (
    <>
      {/* Settings Button - Portal to document.body to TRULY ESCAPE all parent containers */}
      {createPortal(
        <div className="fixed top-4 right-4 z-[99999]" style={{ position: 'fixed' }}>
          <button 
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-2 bg-white shadow-xl text-gray-700 px-4 py-2.5 rounded-xl hover:bg-gray-50 hover:shadow-2xl transition-all border border-gray-200 flex-shrink-0 backdrop-blur-sm"
          >
            <Settings className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm font-medium whitespace-nowrap hidden xs:inline">Manage Page</span>
          </button>
        </div>,
        document.body
      )}

      {/* Create Post Modal */}
      <CreatePostModal
        isOpen={showCreatePostModal}
        onClose={() => setShowCreatePostModal(false)}
        onPostCreated={() => {
          window.dispatchEvent(new Event('eventsUpdated'));
        }}
        isOrganizer={true}
        organizerName={organizerProfile.organizerName}
      />

      <div className="bg-gray-50 min-h-screen pb-24">
        {/* Professional Header - Solid Purple */}
        <div className="bg-[#8A2BE2] px-6 py-12 shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-6">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white/50 bg-gray-100">
                  <UserAvatar
                    src={organizerProfile.avatar_url}
                    name={organizerProfile.organizerName || 'Organizer'}
                    className="w-full h-full"
                  />
                </div>
                <div>
                  <p className="text-white/70 text-xs uppercase tracking-wide mb-1">Organizer Dashboard</p>
                  <h1 className="text-white text-2xl mb-1">{organizerProfile.organizerName}</h1>
                  <p className="text-white/80 text-sm mb-1">{organizerProfile.organizerType}</p>
                  <div className="flex items-center gap-1.5 text-white/70 text-xs">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{organizerProfile.location}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 w-full md:w-auto">
                <button
                  onClick={onCreateEvent}
                  className="flex items-center gap-2 bg-white/10 text-white px-4 py-2 rounded-xl hover:bg-white/20 transition-all border border-white/20 backdrop-blur-sm"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span className="text-sm font-semibold whitespace-nowrap">Create Event</span>
                </button>
                
                {/* Premium Go Live Button - Optimized for iPhone 16 (392x852) */}
                <button className="flex items-center gap-2 bg-gradient-to-r from-red-500 to-pink-600 text-white px-4 py-2 rounded-xl hover:shadow-xl hover:shadow-red-500/30 transition-all group relative overflow-hidden min-w-[110px] flex-shrink-0">
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform"></div>
                  <div className="relative flex items-center gap-1.5 justify-center w-full">
                    <div className="relative flex-shrink-0">
                      <Radio className="w-4 h-4" />
                      <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                    </div>
                    <span className="text-sm font-semibold whitespace-nowrap">Go Live</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Combined Stats Card - Professional Minimal Layout */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-5">
                <div className="w-14 h-14 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0 self-start">
                  <BarChart3 className="w-7 h-7 text-[#8A2BE2]" />
                </div>
                <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-y-6 gap-x-8 w-full">
                  <div 
                    onClick={handleShowFollowers}
                    className="cursor-pointer hover:opacity-70 transition-opacity"
                  >
                    <p className="text-gray-500 text-sm mb-1">Followers</p>
                    <p className="text-gray-900 text-2xl font-semibold">{formatNumber(stats.followers)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-sm mb-1">Events</p>
                    <p className="text-gray-900 text-2xl font-semibold">{stats.totalEvents}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-sm mb-1">Views</p>
                    <p className="text-gray-900 text-2xl font-semibold">{formatNumber(stats.totalViews)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-sm mb-1">Tickets Sold</p>
                    <p className="text-gray-900 text-2xl font-semibold">{formatNumber(stats.ticketsSold)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-sm mb-1">Revenue</p>
                    <p className="text-gray-900 text-2xl font-semibold">TSh {formatNumber(stats.revenue)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-sm mb-1">Live Streams</p>
                    <p className="text-gray-900 text-2xl font-semibold">{stats.liveStreams}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-8 max-w-7xl mx-auto">
          {/* Welcome Section - Professional - Only show when no events exist */}
          {publishedEvents.length === 0 && draftEvents.length === 0 && (
            <div className="bg-white border border-purple-200 rounded-lg p-6 mb-8 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Star className="w-6 h-6 text-[#8A2BE2]" />
                </div>
                <div className="flex-1">
                  <h2 className="text-gray-900 text-xl mb-2">Welcome to EVENTZ Organizers</h2>
                  <p className="text-gray-600 mb-4 leading-relaxed">
                    You're all set to create amazing events and reach thousands of people with HD live streaming. 
                    Start by creating your first event and watch your audience grow.
                  </p>
                  <button
                    onClick={onCreateEvent}
                    className="bg-[#8A2BE2] text-white px-6 py-2.5 rounded-lg hover:bg-[#7825d4] transition-all flex items-center gap-2"
                  >
                    <PlusCircle className="w-5 h-5" />
                    <span>Create Your First Event</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Highlights/Posts Section */}
          <div className="mb-8">
            {/* Section Header */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-gray-900 text-xl">Event Highlights & Posts</h2>
                <button 
                  onClick={() => setShowCreatePostModal(true)}
                  className="text-[#8A2BE2] hover:text-[#7825d4] text-sm flex items-center gap-1.5"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Create Post</span>
                </button>
              </div>
            </div>
            
            {/* Grid Gallery - Instagram Style */}
            <div className="grid grid-cols-3 gap-2">
              {highlights.map(highlight => (
                <div 
                  key={highlight.id} 
                  className="group relative overflow-hidden rounded-lg bg-gray-100 aspect-square cursor-pointer"
                  onClick={() => setSelectedHighlight(highlight)}
                >
                  {/* Image */}
                  <ImageWithFallback
                    src={highlight.image}
                    alt={highlight.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  
                  {/* Video Play Icon - Always Visible for Videos */}
                  {highlight.mediaType === 'video' && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                        <Play className="w-4 h-4 text-[#8A2BE2] ml-0.5" fill="currentColor" />
                      </div>
                    </div>
                  )}
                  
                  {/* Gradient Overlay - Appears on Hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  
                  {/* Actions - Appears on Hover */}
                  <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <button 
                      onClick={(e) => handleDeletePost(highlight.id, e)}
                      className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm hover:bg-white flex items-center justify-center transition-all shadow-lg"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleShare(highlight); }}
                      className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm hover:bg-white flex items-center justify-center transition-all shadow-lg"
                      title="Share"
                    >
                      <Share2 className="w-4 h-4 text-gray-700" />
                    </button>
                  </div>
                  
                  {/* Content Overlay - Appears on Hover */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                    <h3 className="text-white mb-2 line-clamp-2 leading-snug">{highlight.title}</h3>
                    
                    {/* Stats */}
                    <div className="flex items-center gap-4 text-white/90">
                      <div className="flex items-center gap-1.5">
                        <Heart className="w-4 h-4" />
                        <span className="text-sm">{highlight.likes}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MessageCircle className="w-4 h-4" />
                        <span className="text-sm">{highlight.comments}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Share2 className="w-4 h-4" />
                        <span className="text-sm">{highlight.shares}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Analytics Overview */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-gray-900 text-xl">Analytics Overview</h2>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Revenue */}
              <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-green-600" />
                  </div>
                  {/* <span className="text-green-600 text-xs bg-green-50 px-2 py-1 rounded-full">+0%</span> */}
                </div>
                <p className="text-gray-500 text-sm mb-1">Total Revenue</p>
                <p className="text-gray-900 text-2xl font-bold">TSh {formatNumber(stats.revenue)}</p>
              </div>

              {/* Tickets */}
              <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Ticket className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
                <p className="text-gray-500 text-sm mb-1">Tickets Sold</p>
                <p className="text-gray-900 text-2xl font-bold">{formatNumber(stats.ticketsSold)}</p>
              </div>

              {/* Views */}
              <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Eye className="w-5 h-5 text-purple-600" />
                  </div>
                </div>
                <p className="text-gray-500 text-sm mb-1">Total Views</p>
                <p className="text-gray-900 text-2xl font-bold">{formatNumber(stats.totalViews)}</p>
              </div>

              {/* Followers */}
              <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
                    <Users className="w-5 h-5 text-pink-600" />
                  </div>
                </div>
                <p className="text-gray-500 text-sm mb-1">Followers</p>
                <p className="text-gray-900 text-2xl font-bold">{formatNumber(stats.followers)}</p>
              </div>
            </div>
          </div>

          {/* Published Events */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-gray-900 text-xl">My Events</h2>
              <div className="flex bg-white rounded-lg p-1 border border-gray-200">
                <button
                  onClick={() => setActiveTab('published')}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                    activeTab === 'published'
                      ? 'bg-[#8A2BE2] text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Published
                </button>
                <button
                  onClick={() => setActiveTab('drafts')}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                    activeTab === 'drafts'
                      ? 'bg-[#8A2BE2] text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Drafts
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeTab === 'published' ? (
                publishedEvents.length > 0 ? (
                  publishedEvents.map(event => (
                    <div key={event.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-all group">
                      <div className="relative h-48">
                        <ImageWithFallback
                          src={event.coverImage}
                          alt={event.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="absolute top-3 right-3 flex gap-2">
                          <button 
                            onClick={() => setSelectedEventForAnalytics(event)}
                            className="bg-white/90 backdrop-blur-sm p-2 rounded-lg text-gray-700 hover:text-[#8A2BE2] hover:bg-white transition-all shadow-sm"
                            title="Analytics"
                          >
                            <BarChart3 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => onEditEvent?.(event)}
                            className="bg-white/90 backdrop-blur-sm p-2 rounded-lg text-gray-700 hover:text-[#8A2BE2] hover:bg-white transition-all shadow-sm"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={(e) => handleDeleteEvent(event.id, e)}
                            className="bg-white/90 backdrop-blur-sm p-2 rounded-lg text-gray-700 hover:text-red-600 hover:bg-white transition-all shadow-sm"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="text-gray-900 font-semibold line-clamp-1">{event.title}</h3>
                          <span className="text-[#8A2BE2] font-bold text-sm">
                            {event.price === 0 ? 'Free' : `TSh ${formatNumber(event.price)}`}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4" />
                            <span>{new Date(event.date).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-4 h-4" />
                            <span>{event.time}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                          <div className="flex items-center gap-1.5 text-sm text-gray-600">
                            <Ticket className="w-4 h-4 text-gray-400" />
                            <span>{event.ticketsSold || 0} sold</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-sm text-gray-600">
                            <Eye className="w-4 h-4 text-gray-400" />
                            <span>{event.views || 0} views</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Calendar className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-gray-900 font-medium mb-1">No published events</p>
                    <p className="text-gray-500 text-sm">Create your first event to get started</p>
                  </div>
                )
              ) : (
                draftEvents.length > 0 ? (
                  draftEvents.map(event => (
                    <div key={event.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-all group opacity-80 hover:opacity-100">
                      <div className="relative h-48">
                        <ImageWithFallback
                          src={event.coverImage}
                          alt={event.title}
                          className="w-full h-full object-cover grayscale"
                        />
                        <div className="absolute inset-0 bg-black/10"></div>
                        <div className="absolute top-3 right-3 flex gap-2">
                          <button 
                            onClick={() => onEditEvent?.(event)}
                            className="bg-white p-2 rounded-lg text-gray-700 hover:text-[#8A2BE2] shadow-sm"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={(e) => handleDeleteEvent(event.id, e)}
                            className="bg-white p-2 rounded-lg text-gray-700 hover:text-red-600 shadow-sm"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="absolute bottom-3 left-3">
                          <span className="bg-gray-900/80 text-white text-xs px-2 py-1 rounded-md backdrop-blur-sm">
                            Draft
                          </span>
                        </div>
                      </div>
                      <div className="p-4">
                        <h3 className="text-gray-900 font-semibold mb-2">{event.title}</h3>
                        <p className="text-sm text-gray-500 line-clamp-2">{event.description}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                    <p className="text-gray-500">No draft events</p>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showSettings && (
        <OrganizerSettingsModal onClose={() => setShowSettings(false)} />
      )}

      {selectedEventForAnalytics && (
        <EventAnalyticsModal
          event={selectedEventForAnalytics}
          onClose={() => setSelectedEventForAnalytics(null)}
        />
      )}

      {selectedHighlight && (
        <HighlightViewerModal
          highlight={selectedHighlight}
          onClose={() => setSelectedHighlight(null)}
          onLike={handleLike}
          onShare={handleShare}
        />
      )}

      {showShareModal && shareModalData && (
        <ShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          title={shareModalData.title}
          text={shareModalData.text}
          url={shareModalData.url || window.location.href}
        />
      )}
      
      {showFollowersModal && (
        <UserListModal
          isOpen={showFollowersModal}
          onClose={() => setShowFollowersModal(false)}
          title="Followers"
          users={followersList}
          loading={loadingFollowers}
        />
      )}
    </>
  );
}