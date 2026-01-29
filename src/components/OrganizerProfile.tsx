import { useState, useEffect } from 'react';
import { X, MapPin, Calendar, Users, CheckCircle2, Star, Share2, Heart, Play, ChevronLeft, MessageCircle, Phone } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { MediaViewer } from './MediaViewer';
import { PurchasedTicket } from '../types';
import { toast } from 'sonner';
import { supabase, createTicket, getProfile, getOrganizerEvents, getPosts, getOrganizerStats, getFollowers, Event as ApiEvent, Profile } from '../utils/supabase/api';
import { UserListModal } from './UserListModal';

interface OrganizerData {
  id?: string;
  name: string;
  bio: string;
  coverImage: string;
  avatar: string;
  location: string;
  totalEvents: number;
  followers: number;
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

  const handleShowFollowers = async () => {
    if (!organizerId) return;
    setShowFollowersModal(true);
    setLoadingFollowers(true);
    try {
      const followers = await getFollowers(organizerId);
      setFollowersList(followers);
    } catch (err) {
      console.error('Error fetching followers:', err);
      toast.error('Failed to load followers');
    } finally {
      setLoadingFollowers(false);
    }
  };

  // Additional state from old component
  const [showMediaViewer, setShowMediaViewer] = useState(false);
  const [mediaViewerIndex, setMediaViewerIndex] = useState(0);
  const [mediaViewerType, setMediaViewerType] = useState<'photo' | 'video'>('photo');
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<OrganizerData['upcomingEvents'][0] | null>(null);
  const [ticketQuantity, setTicketQuantity] = useState(1);
  const [ticketStep, setTicketStep] = useState<'quantity' | 'details' | 'confirm'>('quantity');
  const [ticketFormData, setTicketFormData] = useState({ name: '', email: '' });

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

        // 1. Fetch Profile
        const profile = await getProfile(organizerId);
        if (!profile) throw new Error('Organizer not found');

        // 2. Fetch Stats
        const stats = await getOrganizerStats(organizerId);

        // 3. Fetch Events
        const events = await getOrganizerEvents(organizerId);

        // 4. Fetch Posts (as highlights/photos)
        const posts = await getPosts({ authorId: organizerId });

        // Map to component state
        setOrganizerData({
          id: profile.id,
          name: profile.full_name || profile.username || 'Organizer',
          bio: profile.bio || 'No bio available',
          coverImage: profile.cover_url || 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&h=400&fit=crop',
          avatar: profile.avatar_url || '',
          location: profile.location || 'Tanzania',
          totalEvents: stats.totalEvents,
          followers: stats.followers,
          verified: profile.verified || false,
          rating: stats.avgRating || 0,
          phone: profile.phone,
          whatsapp: profile.phone, // Assuming phone is whatsapp for now
          highlights: posts.slice(0, 5).map(p => ({
            id: p.id,
            image: p.image_urls?.[0] || '',
            video: p.video_url,
            title: p.content.substring(0, 20) + '...',
            date: (() => { try { const d = new Date(p.created_at); return isNaN(d.getTime()) ? '' : d.toLocaleDateString(); } catch { return ''; } })(),
            attendees: p.likes_count || 0
          })),
          photos: posts.map((p, index) => ({
            id: p.id,
            image: p.image_urls?.[0] || '',
            size: index % 3 === 0 ? 'large' : 'small',
            eventName: p.content.substring(0, 15) + '...'
          })),
          upcomingEvents: events.filter((e: any) => new Date(e.date) >= new Date()).map((e: any) => ({
            id: e.id,
            title: e.title,
            image: e.image_url,
            date: (() => { try { const d = new Date(e.date); return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); } catch { return ''; } })(),
            time: e.time.substring(0, 5),
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
      if (isFollowing) {
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUser.id)
          .eq('following_id', organizerId);
        if (error) throw error;
        setIsFollowing(false);
        toast.success('Unfollowed');
      } else {
        const { error } = await supabase
          .from('follows')
          .insert({ follower_id: currentUser.id, following_id: organizerId });
        if (error) throw error;
        setIsFollowing(true);
        toast.success('Following');
      }
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
      const quantity = ticketQuantity || 1;
      const name = ticketFormData.name || currentUser.user_metadata?.full_name || 'Customer';
      const email = ticketFormData.email || currentUser.email || 'email@example.com';

      // Create tickets loop
      for (let i = 0; i < quantity; i++) {
          const ticketData = {
            user_id: currentUser.id,
            event_id: event.id,
            ticket_number: `TKT-${crypto.randomUUID().split('-')[0].toUpperCase()}-${Date.now().toString().slice(-4)}`,
            barcode: crypto.randomUUID(),
            price: event.price ? (parseFloat(event.price.match(/\d+(\.\d+)?/)?.[0] || '0')) : 0,
            purchase_date: new Date().toISOString(),
            customer_name: name,
            customer_email: email,
            ticket_type: 'General Admission',
            status: 'valid'
          };
          await createTicket(ticketData);
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
      
      toast.success('Ticket purchased successfully!');
      setShowTicketModal(false);
    } catch (error) {
      console.error('Error purchasing ticket:', error);
      toast.error('Failed to purchase ticket');
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

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

  if (!organizerData) return null;

  // Combine highlights and photos into a unified gallery for the combined layout
  const combinedGallery = [
    ...organizerData.highlights.map((h) => ({
      id: h.id, // Use number ID for MediaViewer compatibility
      uniqueId: `highlight-${h.id}`, // Unique ID for key
      image: h.image,
      video: h.video,
      title: h.title,
      mediaType: h.video ? 'video' as const : 'photo' as const,
      likes: 0, // No likes count available in highlights structure yet
      comments: 0,
      shares: 0,
      // MediaViewer compatibility
      url: h.image,
      thumbnail: h.image,
      videoUrl: h.video || '',
    })),
    ...organizerData.photos.map((p) => ({
      id: p.id, // Use number ID for MediaViewer compatibility
      uniqueId: `photo-${p.id}`, // Unique ID for key
      image: p.image,
      video: undefined,
      title: p.eventName || `${organizerData.name} Gallery`,
      mediaType: 'photo' as const,
      likes: 0,
      comments: 0,
      shares: 0,
      // MediaViewer compatibility
      url: p.image,
      thumbnail: p.image,
      videoUrl: '',
    })),
  ];

  const handleShare = (item: typeof combinedGallery[0]) => {
    toast.success('Link copied to clipboard!', {
      description: `Share ${item.title} with your friends`,
      duration: 2000,
    });
  };

  return (
    <>
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl max-h-[95vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        
        {/* Hero Section with Cover */}
        <div className="relative h-52 rounded-t-3xl overflow-hidden">
          <ImageWithFallback
            src={organizerData.coverImage}
            alt={organizerData.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"></div>
          
          {/* Top Actions */}
          <div className="absolute top-4 right-4 flex gap-2">
            <button className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors">
              <Share2 className="w-5 h-5 text-gray-900" />
            </button>
            <button 
              onClick={onClose}
              className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors"
            >
              <X className="w-5 h-5 text-gray-900" />
            </button>
          </div>

          {/* Organizer Name & Follow Button */}
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-white drop-shadow-lg">{organizerData.name}</h2>
              {organizerData.verified && (
                <CheckCircle2 className="w-5 h-5 text-white fill-[#8A2BE2]" />
              )}
            </div>
            <button
              onClick={handleFollow}
              className={`px-6 py-2 rounded-full transition-all ${
                isFollowing
                  ? 'bg-white/20 backdrop-blur-sm text-white border border-white/40'
                  : 'bg-white text-gray-900'
              }`}
            >
              {isFollowing ? 'Following' : 'Follow'}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          
          {/* Stats Section */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {/* Events */}
            <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl p-3 text-center border border-gray-300 shadow-sm">
              <div className="text-lg text-gray-900 font-bold">{organizerData.totalEvents}</div>
              <div className="text-xs text-gray-600 font-semibold">Events</div>
            </div>

            {/* Followers */}
            <div 
              className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl p-3 text-center border border-gray-300 shadow-sm cursor-pointer hover:opacity-80 transition-opacity"
              onClick={handleShowFollowers}
            >
              <div className="text-lg text-gray-900 font-bold">
                {organizerData.followers >= 1000 
                  ? `${(organizerData.followers / 1000).toFixed(1)}k` 
                  : organizerData.followers}
              </div>
              <div className="text-xs text-gray-600 font-semibold">Followers</div>
            </div>
          </div>

          {/* Message Button */}
          <button
            onClick={() => {
              if (onMessage) {
                onMessage({
                  name: organizerData.name,
                  avatar: organizerData.avatar,
                  verified: organizerData.verified,
                  isOrganizer: true,
                  id: organizerData.id
                });
              }
            }}
            className="w-full mb-3 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <MessageCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Message</span>
          </button>

          {/* Contact - Ultra Minimal Single Line */}
          {organizerData.phone && organizerData.whatsapp && (
            <div className="mb-6 flex items-center justify-center gap-3 pb-3 border-b border-gray-100">
              <a 
                href={`tel:${organizerData.phone}`}
                className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-[#8A2BE2] transition-colors"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>{organizerData.phone}</span>
              </a>
              <div className="w-px h-3 bg-gray-300"></div>
              <a 
                href={`https://wa.me/${organizerData.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-[#25D366] hover:text-[#128C7E] transition-colors"
                aria-label="WhatsApp"
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                <span>WhatsApp</span>
              </a>
            </div>
          )}

          {/* About */}
          <div className="mb-6">
            <h3 className="text-gray-900 mb-2">About</h3>
            <p className="text-sm text-gray-600 leading-relaxed">{organizerData.bio}</p>
          </div>

          {/* Event Highlights & Posts - COMBINED INSTAGRAM-STYLE GRID */}
          <div className="mb-6">
            <h3 className="text-gray-900 mb-4">Event Highlights & Posts</h3>
            
            {/* 3-Column Grid Gallery */}
            <div className="grid grid-cols-3 gap-2">
              {combinedGallery.map((item) => (
                <div 
                  key={item.id} 
                  className="group relative overflow-hidden rounded-lg bg-gray-100 aspect-square cursor-pointer"
                  onClick={() => {
                    // Filter by media type first, then find the index within that filtered array
                    const filteredByType = combinedGallery.filter(g => g.mediaType === item.mediaType);
                    const indexInFiltered = filteredByType.findIndex(g => g.id === item.id);
                    setMediaViewerIndex(indexInFiltered);
                    setMediaViewerType(item.mediaType);
                    setShowMediaViewer(true);
                  }}
                >
                  {/* Image */}
                  <ImageWithFallback
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  
                  {/* Video Play Icon - Always Visible for Videos */}
                  {item.mediaType === 'video' && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                        <Play className="w-4 h-4 text-[#8A2BE2] ml-0.5" fill="currentColor" />
                      </div>
                    </div>
                  )}
                  
                  {/* Gradient Overlay - Appears on Hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  
                  {/* Content Overlay - Appears on Hover */}
                  <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                    <h4 className="text-white text-xs line-clamp-2 leading-snug">{item.title}</h4>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming Events */}
          <div>
            <h3 className="text-gray-900 mb-4">Upcoming Events</h3>
            <div className="space-y-4">
              {organizerData.upcomingEvents.map((event) => (
                <div key={event.id} className="flex gap-3">
                  {/* Event Image */}
                  <ImageWithFallback
                    src={event.image}
                    alt={event.title}
                    className="w-24 h-24 rounded-2xl object-cover flex-shrink-0"
                  />
                  
                  {/* Event Details */}
                  <div className="flex-1 flex flex-col justify-between py-1">
                    <div>
                      <h4 className="text-gray-900 mb-2 line-clamp-2 font-medium">{event.title}</h4>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 text-sm text-gray-600">
                          <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>{event.date} • {event.time}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-sm text-gray-600">
                          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="line-clamp-1">{event.location}</span>
                        </div>
                        {event.attendees && event.attendees > 0 && (
                          <div className="flex items-center gap-1.5 text-sm text-[#8A2BE2] font-medium">
                            <Users className="w-3.5 h-3.5 flex-shrink-0" />
                            <span>{event.attendees} Attending</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-gray-900 font-semibold text-sm">{event.price}</span>
                      <button className="bg-[#8A2BE2] text-white px-4 py-1.5 rounded-full text-xs font-medium hover:bg-[#7526c7] transition-colors"
                        onClick={() => {
                          setSelectedEvent(event);
                          setShowTicketModal(true);
                        }}
                      >
                        Get Ticket
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>

    {/* Followers Modal */}
    <UserListModal 
      isOpen={showFollowersModal}
      onClose={() => setShowFollowersModal(false)}
      title="Followers"
      users={followersList}
      loading={loadingFollowers}
    />

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
                postId: item.id
              };
            } else {
              return {
                id: item.id,
                url: item.url,
                likes: item.likes,
                eventName: item.title,
                isPost: true,
                postId: item.id
              };
            }
          }) as any}
        initialIndex={mediaViewerIndex}
        onClose={() => setShowMediaViewer(false)}
        type={mediaViewerType}
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
              <button className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors">
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
                    onClick={() => setTicketStep('confirm')}
                    className="mt-4 bg-[#8A2BE2] text-white px-5 py-2 rounded-full text-sm hover:bg-[#7526c7] transition-colors"
                  >
                    Next
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
                  </div>
                  <button
                    onClick={() => handleBuyTicket(selectedEvent)}
                    className="mt-4 w-full bg-[#8A2BE2] text-white px-5 py-3 rounded-xl font-bold hover:bg-[#7526c7] transition-colors shadow-lg"
                  >
                    Confirm & Pay
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
