import { useState, useEffect } from 'react';
import { X, MapPin, Calendar, CheckCircle2, Share2, Play, MessageCircle, Phone, Trash2, CreditCard, Smartphone, ArrowRight, MoreVertical, ChevronLeft, LayoutGrid, Star } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { VideoPreview } from './VideoPreview';
import { MediaViewer } from './MediaViewer';
import { PurchasedTicket } from '../types';
import { ProfileSkeleton, ProfileSkeletonContent } from './skeletons/ProfileSkeleton';
import { toast } from 'sonner';
import { supabase, createTicket, getProfile, getOrganizerEvents, getPosts, getOrganizerStats, getFollowers, getFollowing, getFollowingCount, getOrganizerProfile, toggleFollow, deleteEvent, createTransaction, initiateSnippePayment, waitForTransactionCompletion } from '../utils/supabase/api';
import { extractCurrencyFromPrice } from '../utils/currencies';
import { UserListModal } from './UserListModal';
import { UserProfileModal } from './UserProfileModal';
import { EventDetailModal } from './EventDetailModal';
import { PostDetailModal } from './PostDetailModal';
import { toggleLikePost, toggleSavePost, createPostComment, deletePost, getPostComments, incrementPostView } from '../utils/supabase/api';
import { handleShare } from '../utils/share';
import { formatTimeAgo } from '../utils/format';
import { mapPostsToViewModel } from '../utils/postMapper';

const getFallbackImage = (index: number) => {
  const fallbacks = [
    'https://images.unsplash.com/photo-1492684223066-81342ee5ff30',
    'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4',
    'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b',
    'https://images.unsplash.com/photo-1533174072545-e8d4aa97d848',
    'https://images.unsplash.com/photo-1514525253440-b393452e8d26'
  ];
  return fallbacks[index % fallbacks.length];
};

interface OrganizerData {
  id?: string;
  name: string;
  bio: string;
  coverImage: string;
  avatar: string;
  location: string;
  totalEvents: number;
  followers: number;
  following: number;
  verified: boolean;
  rating: number;
  phone?: string;
  whatsapp?: string;
  highlights: {
    id: number;
    image: string;
    video?: string;
    title: string;
    date: string;
    attendees: number;
  }[];
  photos: {
    id: number;
    image: string;
    video?: string;
    mediaType: 'image' | 'video';
    size: 'small' | 'large';
    eventName?: string;
  }[];
  upcomingEvents: {
    id: number;
    title: string;
    image: string;
    date: string;
    time: string;
    location: string;
    price: string;
    attendees?: number;
  }[];
}

interface OrganizerProfileProps {
  organizerName: string;
  organizerId?: string;
  onClose: () => void;
  onTicketPurchase?: (ticket: PurchasedTicket) => void;
  onMessage?: (organizer: { name: string; avatar: string; verified: boolean; isOrganizer: boolean; id?: string }) => void;
}

export function OrganizerProfile({ organizerName, organizerId, onClose, onTicketPurchase, onMessage }: OrganizerProfileProps) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [organizerData, setOrganizerData] = useState<OrganizerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Followers Modal State
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [followersList, setFollowersList] = useState<any[]>([]);
  const [loadingFollowers, setLoadingFollowers] = useState(false);

  // Following Modal State
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [followingList, setFollowingList] = useState<any[]>([]);
  const [loadingFollowing, setLoadingFollowing] = useState(false);

  const [showUserProfileModal, setShowUserProfileModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const handleShowFollowers = async () => {
    if (!organizerId) return;
    setShowFollowersModal(true);
    setLoadingFollowers(true);
    try {
      const followers = await getFollowers(organizerId);
      // Map followers to the format expected by UserListModal
      const mappedFollowers = (followers || []).map((f: any) => ({
          id: f.id,
          name: f.full_name || f.username || 'User',
          username: f.username,
          avatar: f.avatar_url,
          isOrganizer: f.is_organizer,
          verified: f.verified
      }));
      setFollowersList(mappedFollowers);
    } catch (err) {
      console.error('Error fetching followers:', err);
      toast.error('Failed to load followers');
    } finally {
      setLoadingFollowers(false);
    }
  };

  const handleShowFollowing = async () => {
    if (!organizerId) return;
    setShowFollowingModal(true);
    setLoadingFollowing(true);
    try {
      const following = await getFollowing(organizerId);
      // Map following to the format expected by UserListModal
      const mappedFollowing = (following || []).map((f: any) => ({
          id: f.id,
          name: f.full_name || f.username || 'User',
          username: f.username,
          avatar: f.avatar_url,
          isOrganizer: f.is_organizer,
          verified: f.verified
      }));
      setFollowingList(mappedFollowing);
    } catch (err) {
      console.error('Error fetching following:', err);
      toast.error('Failed to load following list');
    } finally {
      setLoadingFollowing(false);
    }
  };

  const handleDeleteEvent = async (eventId: number) => {
    if (!window.confirm('Are you sure you want to delete this event?')) return;
    
    try {
      await deleteEvent(eventId);
      
      toast.success('Event deleted successfully');
      // Update local state to remove event
      if (organizerData) {
        setOrganizerData({
          ...organizerData,
          upcomingEvents: organizerData.upcomingEvents.filter(e => e.id !== eventId)
        });
      }
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('An error occurred while deleting the event');
    }
  };

  // Additional state from old component
  const [showMediaViewer, setShowMediaViewer] = useState(false);
  const [mediaViewerIndex, setMediaViewerIndex] = useState(0);
  const [mediaViewerType, setMediaViewerType] = useState<'photo' | 'video'>('photo');
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<OrganizerData['upcomingEvents'][0] | null>(null);
  const [ticketQuantity, setTicketQuantity] = useState(1);
  const [ticketStep, setTicketStep] = useState<'quantity' | 'details' | 'payment' | 'confirm'>('quantity');
  const [ticketFormData, setTicketFormData] = useState({ name: '', email: '' });
  const [showEventDetailModal, setShowEventDetailModal] = useState(false);
  const [selectedEventDetail, setSelectedEventDetail] = useState<any>(null);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [allPosts, setAllPosts] = useState<any[]>([]);

  const toggleLike = async (postId: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!currentUser) {
      toast.error('Please login to like posts');
      return;
    }

    try {
      const isLiked = await toggleLikePost(postId, currentUser.id);
      
      // Update local state for allPosts
      setAllPosts(prev => prev.map(p => 
        p.id === postId 
          ? { ...p, isLiked, likes_count: (p.likes_count || 0) + (isLiked ? 1 : -1) } 
          : p
      ));
      
      // Update selectedPost if it's the one being liked
      if (selectedPost && selectedPost.id === postId) {
        setSelectedPost((prev: any) => ({
          ...prev,
          isLiked,
          likes_count: (prev.likes_count || 0) + (isLiked ? 1 : -1)
        }));
      }

      if (isLiked) {
        toast.success('Added to favorites');
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      toast.error('Failed to update like');
    }
  };

  const toggleSave = async (postId: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!currentUser) {
      toast.error('Please login to save posts');
      return;
    }

    try {
      const isSaved = await toggleSavePost(postId, currentUser.id);
      
      setAllPosts(prev => prev.map(p => 
        p.id === postId ? { ...p, isSaved } : p
      ));

      if (selectedPost && selectedPost.id === postId) {
        setSelectedPost((prev: any) => ({ ...prev, isSaved }));
      }

      toast.success(isSaved ? 'Saved to collection' : 'Removed from collection');
    } catch (error) {
      console.error('Error toggling save:', error);
      toast.error('Failed to update save status');
    }
  };

  const sharePost = async (post: any, e?: React.MouseEvent) => {
    e?.stopPropagation();
    handleShare({
      title: 'Check out this post on Eventz',
      text: post.content?.text || post.content || 'Interesting post!',
      url: window.location.href
    });
  };

  const handleDeletePost = async (postId: number) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;

    try {
      await deletePost(postId);
      setAllPosts(prev => prev.filter(p => p.id !== postId));
      setSelectedPost(null);
      toast.success('Post deleted successfully');
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Failed to delete post');
    }
  };

  const handlePostComment = async (postId: number, text: string) => {
    if (!currentUser) {
      toast.error('Please login to comment');
      return;
    }

    try {
      const newComment = await createPostComment(postId, currentUser.id, text);
      
      // Fetch latest comments for this post or update manually
      setAllPosts(prev => prev.map(p => {
        if (p.id === postId) {
          const updatedComments = [...(p.comments || []), {
            id: newComment.id,
            user: {
              name: currentUser.user_metadata?.full_name || 'You',
              avatar: currentUser.user_metadata?.avatar_url || ''
            },
            text: text,
            timestamp: 'Just now'
          }];
          return { ...p, comments: updatedComments };
        }
        return p;
      }));

      if (selectedPost && selectedPost.id === postId) {
        setSelectedPost((prev: any) => ({
          ...prev,
          comments: [...(prev.comments || []), {
            id: newComment.id,
            user: {
              name: currentUser.user_metadata?.full_name || 'You',
              avatar: currentUser.user_metadata?.avatar_url || ''
            },
            text: text,
            timestamp: 'Just now'
          }]
        }));
      }

      toast.success('Comment posted');
    } catch (error) {
      console.error('Error posting comment:', error);
      toast.error('Failed to post comment');
    }
  };
  
  // Payment State
  const [paymentPhone, setPaymentPhone] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('Airtel');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'events' | 'posts'>('events');

  useEffect(() => {
    if (selectedPost) {
      incrementPostView(selectedPost.id);
      
      const fetchComments = async () => {
        try {
          const comments = await getPostComments(selectedPost.id);
          const mappedComments = (comments || []).map((c: any) => ({
            id: c.id,
            user: {
              name: c.user?.full_name || c.user?.username || 'User',
              avatar: c.user?.avatar_url || ''
            },
            text: c.text,
            timestamp: formatTimeAgo(c.created_at)
          }));
          
          setSelectedPost((prev: any) => prev && prev.id === selectedPost.id ? { ...prev, comments: mappedComments } : prev);
        } catch (error) {
          console.error('Error fetching comments:', error);
        }
      };
      
      fetchComments();
    }
  }, [selectedPost?.id]);

  useEffect(() => {
    if (currentUser) {
      setTicketFormData({
        name: currentUser.user_metadata?.full_name || '',
        email: currentUser.email || ''
      });
    }
  }, [currentUser]);

  useEffect(() => {
    const fetchOrganizerData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUser(user);

        if (!organizerId) {
          setError('Organizer ID is missing');
          setLoading(false);
          return;
        }

        // Parallel Fetching with individual error handling to be more resilient
        const [profileRes, organizerProfileRes, statsRes, eventsRes, postsRes, followingCountRes] = await Promise.allSettled([
          getProfile(organizerId),
          getOrganizerProfile(organizerId),
          getOrganizerStats(organizerId),
          getOrganizerEvents(organizerId),
          getPosts({ authorId: organizerId }),
          getFollowingCount(organizerId)
        ]);

        const profile = profileRes.status === 'fulfilled' ? profileRes.value : null;
        const organizerProfile = organizerProfileRes.status === 'fulfilled' ? organizerProfileRes.value : null;
        const stats = statsRes.status === 'fulfilled' ? statsRes.value : { totalEvents: 0, followers: 0, avgRating: 0 };
        const events = eventsRes.status === 'fulfilled' ? eventsRes.value : [];
        const posts = postsRes.status === 'fulfilled' ? postsRes.value : [];
        const followingCount = followingCountRes.status === 'fulfilled' ? followingCountRes.value : 0;

        // Use the mapper to normalize post data
        setAllPosts(posts ? mapPostsToViewModel(posts) : []);

        if (!profile && !organizerProfile) {
          throw new Error('Organizer not found');
        }

        const filteredPosts = (posts || []).filter((p: any) => {
          const asOrganizer = !!p.posted_as_organizer;
          const belongsToOrganizerEvent = !!p.event && p.event.organizer_id === organizerId;
          return asOrganizer || belongsToOrganizerEvent;
        });
        
        setOrganizerData({
          id: organizerId,
          name: organizerProfile?.organizer_name || profile?.full_name || organizerName || 'Organizer',
          bio: organizerProfile?.bio || profile?.bio || 'No bio available',
          coverImage: organizerProfile?.cover_url || '',
          avatar: organizerProfile?.organizer_avatar_url || profile?.avatar_url || '',
          location: organizerProfile?.location || profile?.location || 'Tanzania',
          totalEvents: stats?.totalEvents || 0,
          followers: stats?.followers || 0,
          following: followingCount || 0,
          verified: profile?.verified || false,
          rating: stats?.avgRating || 0,
          phone: organizerProfile?.phone,
          whatsapp: organizerProfile?.phone, // Assuming phone is whatsapp for now
          highlights: filteredPosts.slice(0, 5).map(p => ({
            id: p.id,
            image: p.image_urls?.[0] || '',
            video: p.video_url,
            title: p.content ? p.content.substring(0, 20) + '...' : 'Post',
            date: (() => { try { const d = new Date(p.created_at); return isNaN(d.getTime()) ? '' : d.toLocaleDateString(); } catch { return ''; } })(),
            attendees: p.likes_count || 0
          })),
          photos: filteredPosts.flatMap((p, postIndex) => 
             (p.image_urls || []).map((url: string, imgIndex: number) => ({
               id: p.id * 1000 + imgIndex,
               image: url,
               video: p.video_url,
               mediaType: p.video_url ? 'video' : 'image',
               size: (postIndex + imgIndex) % 3 === 0 ? 'large' : 'small',
               eventName: p.content ? p.content.substring(0, 15) + '...' : 'Event'
             }))
           ),
          upcomingEvents: (events || []).filter((e: any) => e.date && new Date(e.date) >= new Date()).map((e: any) => ({
            id: e.id,
            title: e.title,
            image: e.image_url,
            date: (() => { try { const d = new Date(e.date); return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); } catch { return ''; } })(),
            time: e.time ? e.time.substring(0, 5) : '',
            location: e.location,
            price: e.price_range,
            attendees: e.attendees || e.interested || 0
          }))
        });

        // Check if following
        if (user) {
            const { data: followData } = await supabase
              .from('follows')
              .select('created_at')
              .eq('follower_id', user.id)
              .eq('following_id', organizerId)
              .single();
            setIsFollowing(!!followData);
        }

      } catch (error) {
        console.error('Error fetching organizer data:', error);
        setError('Failed to load organizer profile');
        toast.error('Failed to load organizer profile');
      } finally {
        setLoading(false);
      }
    };

    fetchOrganizerData();
  }, [organizerName, organizerId]);

  const handleFollow = async () => {
    if (!currentUser) {
      toast.error('Please login to follow organizers');
      return;
    }
    
    if (!organizerId) {
      toast.error('Cannot follow unknown organizer');
      return;
    }

    try {
      const isFollowingNow = await toggleFollow(currentUser.id, organizerId);
      setIsFollowing(isFollowingNow);
      toast.success(isFollowingNow ? 'Following' : 'Unfollowed');
    } catch (error) {
      console.error('Error toggling follow:', error);
      toast.error('Failed to update follow status');
    }
  };

  const handleBuyTicket = async (event: any) => {
    if (!currentUser) {
      toast.error('Please login to buy tickets');
      return;
    }

    try {
      setIsProcessingPayment(true);
      const quantity = ticketQuantity || 1;
      const name = ticketFormData.name || currentUser.user_metadata?.full_name || 'Customer';
      const email = ticketFormData.email || currentUser.email || 'email@example.com';
      
      // Calculate total price (parse "TSh 10,000" or similar)
      const priceString = event.price?.toString().replace(/[^0-9.]/g, '') || '0';
      const priceNumeric = parseFloat(priceString);
      const currency = extractCurrencyFromPrice(event.price?.toString());
      const totalPrice = priceNumeric * quantity;

      // Only process payment if price > 0
      if (totalPrice > 0) {
          if (!paymentPhone || paymentPhone.length < 10) {
            toast.error('Please enter a valid phone number for payment');
            setIsProcessingPayment(false);
            return;
          }

          // 1. Create Transaction
          const transactionData = {
            user_id: currentUser.id,
            event_id: event.id,
            amount: totalPrice,
            currency: currency,
            provider: selectedProvider,
            status: 'pending',
            metadata: {
              customer_name: name,
              customer_email: email,
              customer_phone: paymentPhone,
              ticket_type: 'General Admission',
              quantity: quantity
            }
          };

          const transaction = await createTransaction(transactionData);

          // 2. Initiate Payment
          toast.info('Initiating payment request...');
          await initiateSnippePayment({
            amount: totalPrice,
            currency: currency,
            phoneNumber: paymentPhone,
            provider: selectedProvider,
            eventId: event.id,
            userId: currentUser.id,
            metadata: { 
              transactionId: transaction.id,
              customer_name: name,
              customer_email: email
            }
          });

          toast.info(`Payment request sent to ${paymentPhone}. Waiting for confirmation...`);
          const ok = await waitForTransactionCompletion(transaction.id);
          if (!ok) {
            throw new Error('Payment not confirmed');
          }
      }

      // Create tickets loop
      for (let i = 0; i < quantity; i++) {
          const ticketData = {
            user_id: currentUser.id,
            event_id: event.id,
            ticket_number: `TKT-${crypto.randomUUID().split('-')[0].toUpperCase()}-${Date.now().toString().slice(-4)}`,
            barcode: crypto.randomUUID(),
            price: event.price || '0',
            purchase_date: new Date().toISOString(),
            customer_name: name,
            customer_email: email,
            ticket_type: 'General Admission',
            status: 'valid'
          };
          await createTicket({ ...ticketData, transaction_id: transaction.id });
      }

      // UI Update
      const purchasedTicket: PurchasedTicket = {
        id: `temp-${Date.now()}`,
        eventId: event.id,
        eventTitle: event.title || event.name,
        eventDate: event.date,
        eventLocation: event.location,
        ticketNumber: `TKT-${Date.now()}`,
        barcode: `${Date.now()}`,
        customerName: name,
        customerEmail: email,
        ticketType: 'General Admission',
        price: event.price, 
        purchaseDate: new Date().toISOString(),
      };

      if (onTicketPurchase) {
        onTicketPurchase(purchasedTicket);
      }
      
      toast.success(`${quantity} Ticket${quantity > 1 ? 's' : ''} purchased successfully!`);
      setShowTicketModal(false);
      
      // Reset state
      setTicketStep('quantity');
      setPaymentPhone('');
      setSelectedProvider('Airtel');

    } catch (error: any) {
      console.error('Error purchasing ticket:', error);
      toast.error(`Purchase failed: ${error.message || 'Unknown error'}`);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  if (error) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
        <div className="bg-white rounded-xl p-6 max-w-sm w-full text-center" onClick={(e) => e.stopPropagation()}>
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
             <X className="w-6 h-6 text-red-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Error</h3>
          <p className="text-gray-600 mb-6">{error}</p>
          <button 
            onClick={onClose}
            className="w-full bg-gray-900 text-white py-3 rounded-xl font-semibold hover:bg-gray-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  if (!organizerData && !loading) return null;

  // Combine highlights and photos into a unified gallery for the combined layout
  // Use allPosts directly for more consistent data
  const combinedGallery = allPosts.length > 0 ? allPosts.map((post, index) => ({
      id: post.id,
      uniqueId: `post-${post.id}`,
      image: post.content.image || post.user.avatar || getFallbackImage(index), // Use mapped properties
      video: post.highlights?.[0]?.videoUrl, // Use mapped properties
      title: post.content.text || `${organizerData?.name} Post`,
      mediaType: post.isHighlight ? 'video' as const : 'photo' as const,
      likes: post.likes,
      comments: post.comments_count,
      shares: post.shares,
      // MediaViewer compatibility
      url: post.content.image || getFallbackImage(index),
      thumbnail: post.content.image || getFallbackImage(index),
      videoUrl: post.highlights?.[0]?.videoUrl || '',
      fallbackSrc: getFallbackImage(index),
      originalPost: post
    })) : [];

  return (
    <>
    <div className="fixed inset-0 z-[60] bg-white overflow-y-auto animate-in slide-in-from-right duration-300">
      {loading ? (
        <ProfileSkeletonContent onClose={onClose} />
      ) : organizerData ? (
      <div className="w-full min-h-screen bg-white pb-20 pt-6 px-6">
        
        {/* Header Section - Minimal & Professional */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="p-2 -ml-2 hover:bg-gray-50 rounded-full transition-colors active:scale-95">
              <ChevronLeft className="w-6 h-6 text-gray-900" />
            </button>
            
            <div className="w-14 h-14 rounded-full overflow-hidden bg-gray-50 border border-gray-100 shadow-sm">
              <ImageWithFallback
                src={organizerData.avatar}
                alt={organizerData.name}
                className="w-full h-full object-cover"
              />
            </div>
            
            <div className="flex-1 min-w-0">
               <h1 className="text-lg font-bold text-gray-900 leading-tight flex items-center gap-1.5">
                 {organizerData.name}
                 {organizerData.verified && (
                    <CheckCircle2 className="w-4 h-4 text-[#8A2BE2] fill-white" />
                 )}
               </h1>
               <div className="text-gray-500 font-medium text-xs flex items-center gap-1 mt-0.5">
                 <span className="text-purple-600 font-semibold text-xs">@{organizerData.name.toLowerCase().replace(/\s+/g, '')}</span>
               </div>
            </div>
          </div>

          {/* Header Actions */}
          <div className="flex items-center">
             <button 
               onClick={() => {
                 navigator.clipboard.writeText(window.location.href);
                 toast.success('Link copied to clipboard');
               }}
               className="p-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-full transition-colors active:scale-95"
             >
                <Share2 className="w-5 h-5" />
             </button>
          </div>
        </div>

        {/* Bio Section */}
        <div className="mb-6">
          <div className="flex flex-col gap-2">
             <div className="text-sm font-medium text-gray-500">
               Organizer
             </div>
             
            <p className="text-gray-800 font-medium leading-relaxed text-[15px]">
              {organizerData.bio}
            </p>
            
            {organizerData.location && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
                <MapPin className="w-3.5 h-3.5" />
                <span>{organizerData.location}</span>
              </div>
            )}
            
            {/* Follow & Message Buttons */}
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleFollow}
                className={`flex-1 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors ${
                  isFollowing
                    ? 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                    : 'bg-[#8A2BE2] text-white hover:bg-[#7a26c9]'
                }`}
              >
                {isFollowing ? 'Following' : 'Follow'}
              </button>
              <button
                onClick={() => {
                  if (!currentUser) {
                    toast.error('Please login to message organizers');
                    return;
                  }
                  if (onMessage) {
                    onMessage({
                      name: organizerData.name,
                      avatar: organizerData.avatar,
                      verified: organizerData.verified,
                      isOrganizer: true,
                      id: organizerId // Pass the correct organizerId here
                    });
                  }
                }}
                className="flex-1 py-3 bg-gray-100 text-gray-900 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors"
              >
                Message
              </button>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex items-center justify-between px-4 mb-8">
            <div 
              className="text-center flex-1 border-r border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors py-1 rounded-lg active:scale-95"
              onClick={() => {
                setActiveTab('events');
                toast.success('Viewing hosted events');
              }}
            >
              <div className="text-xl font-bold text-gray-900 mb-1">
                  {organizerData.totalEvents}
              </div>
              <div className="text-xs text-gray-500 uppercase tracking-wide font-semibold">
                  Hosted
              </div>
            </div>
            <div 
              className="text-center flex-1 border-r border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors py-1 rounded-lg active:scale-95"
              onClick={handleShowFollowers}
            >
              <div className="text-xl font-bold text-gray-900 mb-1">
                  {organizerData.followers >= 1000 
                    ? `${(organizerData.followers / 1000).toFixed(1)}k` 
                    : organizerData.followers}
              </div>
              <div className="text-xs text-gray-500 uppercase tracking-wide font-semibold">
                  Followers
              </div>
            </div>
            <div 
              className="text-center flex-1 cursor-pointer hover:bg-gray-50 transition-colors py-1 rounded-lg active:scale-95"
              onClick={handleShowFollowing}
            >
              <div className="text-xl font-bold text-gray-900 mb-1">
                  {organizerData.following >= 1000 
                    ? `${(organizerData.following / 1000).toFixed(1)}k` 
                    : organizerData.following}
              </div>
              <div className="text-xs text-gray-500 uppercase tracking-wide font-semibold">
                  Following
              </div>
            </div>
        </div>

          {showFollowersModal && (
            <UserListModal
              title="Followers"
              isOpen={showFollowersModal}
              users={followersList}
              loading={loadingFollowers}
              onClose={() => setShowFollowersModal(false)}
              onUserSelect={(user: any) => {
                setSelectedUser(user);
                setShowUserProfileModal(true);
              }}
            />
          )}

          {showFollowingModal && (
            <UserListModal
              title="Following"
              isOpen={showFollowingModal}
              users={followingList}
              loading={loadingFollowing}
              onClose={() => setShowFollowingModal(false)}
              onUserSelect={(user: any) => {
                setSelectedUser(user);
                setShowUserProfileModal(true);
              }}
            />
          )}

        {/* Tabs - Simplified for Organizer View */}
        <div className="bg-gray-100 p-1.5 rounded-2xl flex mb-6 overflow-x-auto scrollbar-hide">
          <button 
            onClick={() => setActiveTab('events')}
            className={`flex-1 min-w-[80px] py-2.5 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === 'events' 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
             <Calendar className="w-3.5 h-3.5" />
             Events
          </button>
          <button 
            onClick={() => setActiveTab('posts')}
            className={`flex-1 min-w-[80px] py-2.5 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === 'posts' 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
             <LayoutGrid className="w-3.5 h-3.5" />
             Posts
          </button>
        </div>

          {/* Upcoming Events */}
          {activeTab === 'events' && (
            <div>
              <h3 className="text-gray-900 mb-4 font-bold">Upcoming Events</h3>
              <div className="space-y-2">
                {organizerData.upcomingEvents.length > 0 ? organizerData.upcomingEvents.map((event) => (
                  <div 
                    key={event.id} 
                    className="grid grid-cols-[64px_1fr_44px] gap-3 p-3 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer items-center group"
                    onClick={() => {
                      setSelectedEventDetail(event);
                      setShowEventDetailModal(true);
                    }}
                  >
                    {/* Left: Thumbnail (Fixed 64x64) */}
                    <ImageWithFallback
                      src={event.image}
                      alt={event.title}
                      className="w-16 h-16 rounded-xl object-cover bg-gray-200 shadow-sm"
                    />
                    
                    {/* Middle: Flexible Text Block */}
                    <div className="flex flex-col justify-center min-w-0">
                      <h4 className="text-gray-900 font-medium text-sm leading-snug line-clamp-2 mb-1 group-hover:text-[#8A2BE2] transition-colors">
                        {event.title}
                      </h4>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <Calendar className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{event.date} • {event.time}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{event.location}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Fixed Actions (44px) */}
                    <div className="flex items-center justify-center w-[44px]">
                      {currentUser && currentUser.id === organizerId ? (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteEvent(event.id);
                          }}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                          title="Delete Event"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      ) : (
                        <button 
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Future: Open menu
                          }}
                        >
                          <MoreVertical className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-8 text-gray-500 text-sm bg-gray-50 rounded-2xl">
                    No upcoming events found
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Posts / Highlights */}
          {activeTab === 'posts' && (
            <div>
              <div className="grid grid-cols-3 gap-2">
                {combinedGallery.length > 0 ? combinedGallery.map((item) => (
                  <div 
                    key={item.uniqueId} 
                    className="group relative overflow-hidden rounded-lg bg-gray-100 aspect-square cursor-pointer"
                    onClick={() => {
                      if (item.originalPost) {
                        setSelectedPost(item.originalPost);
                      } else {
                        // Fallback to MediaViewer if originalPost is missing
                        const filteredByType = combinedGallery.filter(g => g.mediaType === item.mediaType);
                        const indexInFiltered = filteredByType.findIndex(g => g.id === item.id);
                        setMediaViewerIndex(indexInFiltered);
                        setMediaViewerType(item.mediaType);
                        setShowMediaViewer(true);
                      }
                    }}
                  >
                    {/* Image */}
                    {item.mediaType === 'video' ? (
                      <VideoPreview 
                        src={item.video || ''} 
                        poster={item.image || item.fallbackSrc}
                        alt={item.title}
                        className="w-full h-full"
                      />
                    ) : (
                      <ImageWithFallback
                        src={item.image}
                        alt={item.title}
                        fallbackSrc={item.fallbackSrc}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    )}

                    {/* Video Indicator */}
                    {item.mediaType === 'video' && (
                      <div className="absolute top-2 right-2 pointer-events-none z-0">
                        <div className="w-6 h-6 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center shadow-sm">
                          <Play className="w-3 h-3 text-white fill-white ml-0.5" />
                        </div>
                      </div>
                    )}
                    
                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300" />
                  </div>
                )) : (
                  <div className="col-span-3 text-center py-8 text-gray-500 text-sm bg-gray-50 rounded-2xl">
                    No posts yet
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>

    {showUserProfileModal && selectedUser && (
      <UserProfileModal
        user={selectedUser}
        onClose={() => {
          setShowUserProfileModal(false);
          setSelectedUser(null);
        }}
        onFollow={() => {
          handleShowFollowers();
        }}
      />
    )}

    {/* Event Detail Modal */}
    {showEventDetailModal && selectedEventDetail && (
      <EventDetailModal
        event={selectedEventDetail}
        onClose={() => {
          setShowEventDetailModal(false);
          setSelectedEventDetail(null);
        }}
        onBuyTicket={(event) => {
          setSelectedEvent(event);
          setShowTicketModal(true);
        }}
        onMessage={() => {
          // Message organizer
        }}
      />
    )}

    {/* Media Viewer - Rendered outside modal for engaging photo viewing */}
    {showMediaViewer && (
      <MediaViewer
        media={combinedGallery
          .filter(item => item.mediaType === mediaViewerType)
          .map((item) => {
            if (item.mediaType === 'video') {
              return {
                id: item.id,
                thumbnail: item.thumbnail,
                duration: '2:30',
                views: (item.id * 123) % 5000 + 1000,
                likes: item.likes,
                videoUrl: item.videoUrl,
                eventName: item.title,
                isPost: true,
                postId: item.postId
              };
            } else {
              return {
                id: item.id,
                url: item.url,
                likes: item.likes,
                eventName: item.title,
                isPost: true,
                postId: item.postId
              };
            }
          }) as any}
        initialIndex={mediaViewerIndex}
        onClose={() => setShowMediaViewer(false)}
        type={mediaViewerType}
      />
    )}

    {/* Post Detail Modal */}
    {selectedPost && (
      <PostDetailModal
        post={selectedPost}
        currentUser={currentUser}
        onClose={() => setSelectedPost(null)}
        onLike={toggleLike}
        onSave={toggleSave}
        onShare={sharePost}
        onDelete={handleDeletePost}
        onProfileClick={(user) => {
          setSelectedUser({
            id: user.id,
            name: user.name,
            username: user.username,
            avatar: user.avatar,
            verified: user.verified,
            isOrganizer: user.isOrganizer
          });
          setShowUserProfileModal(true);
        }}
        onComment={handlePostComment}
      />
    )}

    {/* Ticket Modal */}
    {showTicketModal && selectedEvent && (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl max-h-[95vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="relative h-52 rounded-t-3xl overflow-hidden">
            <ImageWithFallback
              src={selectedEvent.image}
              alt={selectedEvent.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"></div>
            
            {/* Top Actions */}
            <div className="absolute top-4 right-4 flex gap-2">
              <button 
                onClick={() => handleShareEvent(selectedEvent)}
                className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors"
              >
                <Share2 className="w-5 h-5 text-gray-900" />
              </button>
              <button 
                onClick={() => setShowTicketModal(false)}
                className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors"
              >
                <X className="w-5 h-5 text-gray-900" />
              </button>
            </div>

            {/* Organizer Name & Follow Button */}
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-white drop-shadow-lg">{selectedEvent.title}</h2>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            
            {/* Stats Section */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {/* Events */}
              <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl p-3 text-center border border-gray-300 shadow-sm">
                <div className="text-lg text-gray-900 font-bold">{selectedEvent.date}</div>
                <div className="text-xs text-gray-600 font-semibold">Date</div>
              </div>

              {/* Followers */}
              <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl p-3 text-center border border-gray-300 shadow-sm">
                <div className="text-lg text-gray-900 font-bold">{selectedEvent.time}</div>
                <div className="text-xs text-gray-600 font-semibold">Time</div>
              </div>
            </div>

            {/* About */}
            <div className="mb-6">
              <h3 className="text-gray-900 mb-2">About</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{selectedEvent.location}</p>
            </div>

            {/* Ticket Steps */}
            <div className="space-y-4">
              {ticketStep === 'quantity' && (
                <div>
                  <h3 className="text-gray-900 mb-2">Select Quantity</h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setTicketQuantity(Math.max(1, ticketQuantity - 1))}
                      className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={ticketQuantity}
                      onChange={(e) => setTicketQuantity(parseInt(e.target.value))}
                      className="w-16 h-8 bg-gray-100 rounded-full text-center"
                    />
                    <button
                      onClick={() => setTicketQuantity(ticketQuantity + 1)}
                      className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                  <button
                    onClick={() => setTicketStep('details')}
                    className="mt-4 bg-[#8A2BE2] text-white px-5 py-2 rounded-full text-sm hover:bg-[#7526c7] transition-colors"
                  >
                    Next
                  </button>
                </div>
              )}
              {ticketStep === 'details' && (
                <div>
                  <h3 className="text-gray-900 mb-2">Enter Details</h3>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={ticketFormData.name}
                      onChange={(e) => setTicketFormData({ ...ticketFormData, name: e.target.value })}
                      placeholder="Full Name"
                      className="w-full h-8 bg-gray-100 rounded-full px-4"
                    />
                    <input
                      type="email"
                      value={ticketFormData.email}
                      onChange={(e) => setTicketFormData({ ...ticketFormData, email: e.target.value })}
                      placeholder="Email Address"
                      className="w-full h-8 bg-gray-100 rounded-full px-4"
                    />
                  </div>
                  <button
                    onClick={() => {
                        const priceString = selectedEvent.price?.toString().replace(/[^0-9.]/g, '') || '0';
                        const priceNumeric = parseFloat(priceString);
                        if (priceNumeric > 0) {
                            setTicketStep('payment');
                        } else {
                            setTicketStep('confirm');
                        }
                    }}
                    className="mt-4 bg-[#8A2BE2] text-white px-5 py-2 rounded-full text-sm hover:bg-[#7526c7] transition-colors"
                  >
                    Next
                  </button>
                </div>
              )}
              {ticketStep === 'payment' && (
                <div>
                  <h3 className="text-gray-900 mb-2">Payment Method</h3>
                  <div className="space-y-4">
                     {/* Provider Selection */}
                      <div className="grid grid-cols-2 gap-2 mb-4">
                        {['Airtel', 'Tigo', 'Halopesa', 'Mpesa'].map((provider) => (
                          <button
                            key={provider}
                            onClick={() => setSelectedProvider(provider)}
                            className={`p-3 rounded-xl border transition-all flex flex-col items-center gap-1 ${
                              selectedProvider === provider
                                ? 'border-purple-500 bg-purple-50 text-purple-700'
                                : 'border-gray-200 hover:border-purple-200 text-gray-600'
                            }`}
                          >
                            <CreditCard className={`w-5 h-5 ${selectedProvider === provider ? 'text-purple-600' : 'text-gray-400'}`} />
                            <span className="text-xs font-medium">{provider}</span>
                          </button>
                        ))}
                      </div>

                      {/* Phone Input */}
                      <div>
                        <label className="block text-xs text-gray-700 mb-1 font-medium">Mobile Number</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Smartphone className="w-4 h-4 text-gray-400" />
                          </div>
                          <input
                            type="tel"
                            value={paymentPhone}
                            onChange={(e) => setPaymentPhone(e.target.value)}
                            placeholder="2557..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all text-sm"
                          />
                        </div>
                      </div>
                  </div>
                  <button
                    onClick={() => setTicketStep('confirm')}
                    disabled={!paymentPhone || paymentPhone.length < 10}
                    className={`mt-4 w-full px-5 py-2 rounded-full text-sm transition-colors ${
                        !paymentPhone || paymentPhone.length < 10 
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-[#8A2BE2] text-white hover:bg-[#7526c7]'
                    }`}
                  >
                    Review Order
                  </button>
                </div>
              )}
              {ticketStep === 'confirm' && (
                <div>
                  <h3 className="text-gray-900 mb-2">Confirm Purchase</h3>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">Event: {selectedEvent.title}</p>
                    <p className="text-sm text-gray-600">Date: {selectedEvent.date}</p>
                    <p className="text-sm text-gray-600">Time: {selectedEvent.time}</p>
                    <p className="text-sm text-gray-600">Location: {selectedEvent.location}</p>
                    <p className="text-sm text-gray-600">Price: {selectedEvent.price}</p>
                    <p className="text-sm text-gray-600">Quantity: {ticketQuantity}</p>
                    <p className="text-sm text-gray-600">Name: {ticketFormData.name}</p>
                    <p className="text-sm text-gray-600">Email: {ticketFormData.email}</p>
                    {paymentPhone && <p className="text-sm text-gray-600">Payment: {selectedProvider} ({paymentPhone})</p>}
                  </div>
                  <button
                    onClick={() => handleBuyTicket(selectedEvent)}
                    disabled={isProcessingPayment}
                    className="mt-4 w-full bg-[#8A2BE2] text-white px-5 py-3 rounded-xl font-bold hover:bg-[#7526c7] transition-colors shadow-lg disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isProcessingPayment ? 'Processing...' : (paymentPhone ? 'Pay & Confirm' : 'Confirm')}
                    {!isProcessingPayment && <ArrowRight className="w-4 h-4" />}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
