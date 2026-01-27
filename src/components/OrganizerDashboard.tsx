import { ImageWithFallback } from './figma/ImageWithFallback';
import { toast } from 'sonner';
import organizerProfileImg from 'figma:asset/f341912f973a7295b54e9b5936a0020cb0975622.png';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { EventAnalyticsModal } from './EventAnalyticsModal';
import { HighlightViewerModal } from './HighlightViewerModal';
import { OrganizerSettingsModal } from './OrganizerSettingsModal';
import { CreatePostModal } from './CreatePostModal';
import { handleShare as shareUtil } from '../utils/share';
import { Settings, MapPin, Radio, BarChart3, Star, PlusCircle, Play, Share2, Heart, MessageCircle, DollarSign, Ticket, Eye, Users, Clock, Calendar, MoreVertical, Edit, TrendingUp } from 'lucide-react';
import { supabase } from '../utils/supabase/client';
import { getProfile, getPosts, toggleLikePost, getOrganizerStats, getOrganizerEvents } from '../utils/supabase/api';
import { ShareModal } from './ShareModal';

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
  const [isLoading, setIsLoading] = useState(true);
  const [organizerPosts, setOrganizerPosts] = useState<any[]>([]);
  const [showCreatePostModal, setShowCreatePostModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'events' | 'tickets' | 'analytics'>('overview');
  const [stats, setStats] = useState({
    totalEvents: 0,
    followers: 0,
    totalViews: 0,
    revenue: 0,
    liveStreams: 0,
    ticketsSold: 0
  });

  // Load published events and profile from Supabase
  useEffect(() => {
    const loadOrganizerData = async () => {
      // setIsLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          // setIsLoading(false);
          return;
        }

        // Load profile
        const profile = await getProfile(user.id);
        if (profile) {
          setOrganizerProfile({
            organizerName: profile.full_name || profile.username || 'Organizer',
            organizerType: profile.organizer_type || 'Event Organizer',
            location: profile.location || 'Location not set',
            ...profile
          });
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
             mediaType: p.image_urls && p.image_urls.length > 0 ? 'image' : 'text',
             title: p.content ? p.content.substring(0, 30) + '...' : 'New Post',
             description: p.content,
             image: p.image_urls ? p.image_urls[0] : 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80',
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
            <span className="text-sm font-medium whitespace-nowrap hidden xs:inline">Settings</span>
          </button>
        </div>,
        document.body
      )}

      {/* Create Post Modal */}
      <CreatePostModal
        isOpen={showCreatePostModal}
        onClose={() => setShowCreatePostModal(false)}
        onPostCreated={() => {
          // The component listens to eventsUpdated, but let's also manually trigger a reload or rely on the event if the modal emits one?
          // The modal calls onPostCreated. We should reload posts.
          // loadOrganizerData is inside useEffect, we can't call it directly easily unless we extract it or use a trigger state.
          // But wait, the useEffect listens to 'eventsUpdated'. Does CreatePostModal emit it?
          // CreatePostModal calls createPost API.
          // Let's check CreatePostModal again. It calls onPostCreated callback.
          // In OrganizerDashboard, we can use window.dispatchEvent(new Event('eventsUpdated')) or just trigger a reload.
          // Actually, OrganizerDashboard has a listener for 'eventsUpdated'.
          // So if we dispatch it here, it will reload.
          window.dispatchEvent(new Event('eventsUpdated'));
        }}
      />

      <div className="bg-gray-50 min-h-screen pb-24">
        {/* Professional Header - Solid Purple */}
        <div className="bg-[#8A2BE2] px-6 py-12 shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm overflow-hidden relative">
                  <img 
                    src={organizerProfile.avatar_url || organizerProfileImg}
                    alt="Organizer Profile"
                    className="w-full h-full object-cover"
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
              <div className="flex items-center gap-3">
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
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0 self-start">
                  <BarChart3 className="w-7 h-7 text-[#8A2BE2]" />
                </div>
                <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-y-6 gap-x-8">
                  <div>
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
          {/* Welcome Section - Professional */}
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
                  
                  {/* Share Button - Appears on Hover */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShare(highlight);
                    }}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm hover:bg-white flex items-center justify-center transition-all shadow-lg opacity-0 group-hover:opacity-100"
                  >
                    <Share2 className="w-4 h-4 text-[#8A2BE2]" />
                  </button>
                  
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
                  <span className="text-green-600 text-xs bg-green-50 px-2 py-1 rounded-full">+0%</span>
                </div>
                <p className="text-gray-600 text-sm mb-1">Total Revenue</p>
                <p className="text-gray-900 text-2xl">TSh {formatNumber(stats.revenue)}</p>
              </div>

              {/* Tickets Sold */}
              <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Ticket className="w-5 h-5 text-[#8A2BE2]" />
                  </div>
                  <span className="text-purple-600 text-xs bg-purple-50 px-2 py-1 rounded-full">+0%</span>
                </div>
                <p className="text-gray-600 text-sm mb-1">Tickets Sold</p>
                <p className="text-gray-900 text-2xl">{stats.ticketsSold}</p>
              </div>

              {/* Live Streams */}
              <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                    <Radio className="w-5 h-5 text-red-600" />
                  </div>
                  <span className="text-red-600 text-xs bg-red-50 px-2 py-1 rounded-full">+0%</span>
                </div>
                <p className="text-gray-600 text-sm mb-1">Live Streams</p>
                <p className="text-gray-900 text-2xl">{stats.liveStreams}</p>
              </div>

              {/* Total Views */}
              <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center">
                    <Eye className="w-5 h-5 text-cyan-600" />
                  </div>
                  <span className="text-cyan-600 text-xs bg-cyan-50 px-2 py-1 rounded-full">+0%</span>
                </div>
                <p className="text-gray-600 text-sm mb-1">Total Views</p>
                <p className="text-gray-900 text-2xl">{formatNumber(stats.totalViews)}</p>
              </div>
            </div>
          </div>

          {/* HD Streaming Performance */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-gray-900 text-xl">HD Streaming Performance</h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 bg-[#8A2BE2] rounded-lg flex items-center justify-center">
                    <Play className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm mb-1">Stream Quality</p>
                    <p className="text-gray-900 text-xl">HD 1080p</p>
                  </div>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#8A2BE2] w-0 transition-all"></div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 bg-cyan-600 rounded-lg flex items-center justify-center">
                    <Users className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm mb-1">Peak Viewers</p>
                    <p className="text-gray-900 text-xl">0</p>
                  </div>
                </div>
                <p className="text-gray-500 text-sm">Concurrent: 0 viewers</p>
              </div>

              <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 bg-green-600 rounded-lg flex items-center justify-center">
                    <Clock className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm mb-1">Stream Time</p>
                    <p className="text-gray-900 text-xl">0h 0m</p>
                  </div>
                </div>
                <p className="text-gray-500 text-sm">Last 30 days</p>
              </div>
            </div>
          </div>

          {/* Your Events */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-gray-900 text-xl">Your Events</h2>
              <button
                onClick={onCreateEvent}
                className="text-[#8A2BE2] hover:text-[#7825d4] flex items-center gap-2"
              >
                <PlusCircle className="w-5 h-5" />
                <span>Create Event</span>
              </button>
            </div>

            <div className="flex gap-6 mb-6 border-b border-gray-200">
              <button 
                className={`pb-3 text-sm font-medium transition-colors relative ${
                  activeTab === 'published' 
                    ? 'text-[#8A2BE2]' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setActiveTab('published')}
              >
                Published ({publishedEvents.length})
                {activeTab === 'published' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#8A2BE2] rounded-t-full"></div>
                )}
              </button>
              <button 
                className={`pb-3 text-sm font-medium transition-colors relative ${
                  activeTab === 'drafts' 
                    ? 'text-[#8A2BE2]' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setActiveTab('drafts')}
              >
                Drafts ({draftEvents.length})
                {activeTab === 'drafts' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#8A2BE2] rounded-t-full"></div>
                )}
              </button>
            </div>

            {(activeTab === 'published' ? publishedEvents : draftEvents).length === 0 ? (
              <div className="bg-white rounded-lg p-16 border border-gray-200 text-center shadow-sm">
                <div className="w-20 h-20 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-10 h-10 text-[#8A2BE2]" />
                </div>
                <h3 className="text-gray-900 text-xl mb-2">
                  {activeTab === 'published' ? 'No Events Yet' : 'No Drafts'}
                </h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  {activeTab === 'published' 
                    ? "Start creating amazing events with HD live streaming and reach thousands of people worldwide."
                    : "You don't have any saved drafts."}
                </p>
                {activeTab === 'published' && (
                  <button
                    onClick={onCreateEvent}
                    className="bg-[#8A2BE2] text-white px-8 py-3.5 rounded-lg hover:bg-[#7825d4] transition-all inline-flex items-center gap-2.5 mx-auto"
                  >
                    <PlusCircle className="w-5 h-5" />
                    <span>Create Your First Event</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {(activeTab === 'published' ? publishedEvents : draftEvents).map((event) => (
                  <div key={event.id} className="bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-sm hover:shadow-lg transition-all group">
                    {/* Event Image */}
                    <div className="relative h-52 overflow-hidden bg-gradient-to-br from-purple-600 to-pink-600">
                      {event.coverImage ? (
                        <img 
                          src={event.coverImage} 
                          alt={event.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Calendar className="w-16 h-16 text-white/30" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                      
                      {/* Category Badge */}
                      <div className="absolute top-4 left-4">
                        <div className="px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-md border border-white/30">
                          <span className="text-white text-xs">{event.category}</span>
                        </div>
                      </div>
                      
                      {/* Actions Menu */}
                      <div className="absolute top-4 right-4 flex gap-2">
                        <button
                          onClick={() => {
                            toast.success('Event link copied! 📋');
                          }}
                          className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-md border border-white/30 hover:bg-white/30 flex items-center justify-center transition-all"
                        >
                          <Share2 className="w-4 h-4 text-white" />
                        </button>
                        <button className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-md border border-white/30 hover:bg-white/30 flex items-center justify-center transition-all">
                          <MoreVertical className="w-4 h-4 text-white" />
                        </button>
                      </div>

                      {/* Title Overlay */}
                      <div className="absolute bottom-4 left-4 right-4">
                        <h3 className="text-white text-xl mb-1 line-clamp-1">{event.title || 'Untitled Event'}</h3>
                        <div className="flex items-center gap-3 text-white/90 text-sm">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>{event.date || 'TBD'}</span>
                          </div>
                          {event.location && (
                            <>
                              <span>•</span>
                              <div className="flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                <span className="line-clamp-1">{event.location}</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Event Stats */}
                    <div className="p-5">
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <Eye className="w-4 h-4 text-cyan-600" />
                            <p className="text-gray-900">{event.views || 0}</p>
                          </div>
                          <p className="text-gray-500 text-xs">Views</p>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <Users className="w-4 h-4 text-purple-600" />
                            <p className="text-gray-900">{event.interested || 0}</p>
                          </div>
                          <p className="text-gray-500 text-xs">Interested</p>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <Share2 className="w-4 h-4 text-pink-600" />
                            <p className="text-gray-900">{event.shares || 0}</p>
                          </div>
                          <p className="text-gray-500 text-xs">Shares</p>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <button 
                          onClick={() => {
                            if (onEditEvent) {
                              onEditEvent(event);
                            }
                          }}
                          className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all text-sm flex items-center justify-center gap-2"
                        >
                          <Edit className="w-4 h-4" />
                          Edit
                        </button>
                        <button 
                          onClick={() => setSelectedEventForAnalytics(event)}
                          className="flex-1 px-4 py-2.5 rounded-lg bg-[#8A2BE2] text-white hover:bg-[#7825d4] transition-all text-sm flex items-center justify-center gap-2"
                        >
                          <BarChart3 className="w-4 h-4" />
                          Analytics
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Growth Tips */}
          <div className="bg-white border border-purple-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-6 h-6 text-[#8A2BE2]" />
              </div>
              <div>
                <h3 className="text-gray-900 text-lg mb-3">Tips to Grow Your Audience</h3>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="text-[#8A2BE2] mt-1">•</span>
                    <span>Enable HD live streaming to attract more viewers and boost engagement</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#8A2BE2] mt-1">•</span>
                    <span>Share your events on social media to reach a wider audience</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#8A2BE2] mt-1">•</span>
                    <span>Offer early bird tickets and exclusive perks to build anticipation</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#8A2BE2] mt-1">•</span>
                    <span>Engage with your followers through live chat and reactions during streams</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Event Analytics Modal */}
        {selectedEventForAnalytics && (
          <EventAnalyticsModal
            event={selectedEventForAnalytics}
            onClose={() => setSelectedEventForAnalytics(null)}
          />
        )}

        {/* Highlight Viewer Modal */}
        {selectedHighlight && (
          <HighlightViewerModal
            highlight={selectedHighlight}
            onClose={() => setSelectedHighlight(null)}
            onLike={handleLike}
            onShare={handleShare}
          />
        )}

        {/* Organizer Settings Modal */}
        {showSettings && (
          <OrganizerSettingsModal
            onClose={() => setShowSettings(false)}
          />
        )}

        {/* Share Modal */}
        {shareModalData && (
          <ShareModal
            isOpen={showShareModal}
            onClose={() => {
              setShowShareModal(false);
              setShareModalData(null);
            }}
            title={shareModalData.title}
            text={shareModalData.text}
            url={shareModalData.url}
          />
        )}
      </div>
    </>
  );
}