import { useState, useEffect } from 'react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { MapPin, Calendar, ChevronLeft, X, Filter, Tv, Search, Send, Star, CheckCircle2, Smartphone, CreditCard, ArrowRight } from 'lucide-react';
import { EventCard } from './EventCard';
import { toast } from 'sonner';
import { PurchasedTicket, Conversation, Message } from '../types';
import { PremiumSearchModal } from './PremiumSearchModal';
import { UserProfileModal } from './UserProfileModal';
import { TierTicketModal } from './TierTicketModal';
import { MediaViewer } from './MediaViewer';
import { ShareModal } from './ShareModal';
import { EventDetailModal } from './EventDetailModal';
import { VirtualTicketPurchaseModal } from './VirtualTicketPurchaseModal';
import { supabase } from '../utils/supabase/client';
import { getEvents, getSavedEvents, createTicket, getPosts, Event as ApiEvent, incrementEventView, createTransaction, initiatePayment } from '../utils/supabase/api';



const locations = [
  { id: 'all', name: 'All Locations', flag: '🌍' },
  { id: 'atlanta', name: 'Atlanta, USA', flag: '🇺🇸' },
  { id: 'dar', name: 'Dar es Salaam, Tanzania', flag: '🇹🇿' },
  { id: 'zanzibar', name: 'Zanzibar, Tanzania', flag: '🇹🇿' },
  { id: 'newyork', name: 'New York, USA', flag: '🇺🇸' },
];



interface EventDetailsProps {
  conversations: Conversation[];
  onStartConversation: (user: { name: string; username?: string; avatar: string; verified: boolean; isOrganizer?: boolean; id?: string }) => Promise<Conversation | null | undefined> | Conversation | null;
  onSendMessage: (conversationId: number, messageText: string) => void;
}

export function EventDetails({ conversations: globalConversations, onStartConversation, onSendMessage }: EventDetailsProps) {
  const [events, setEvents] = useState<ApiEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const [allEvents, savedEvents] = await Promise.all([
          getEvents(),
          (async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) return getSavedEvents(user.id);
            return [];
          })()
        ]);
        
        // Map saved status
        const savedIds = new Set((savedEvents as any[]).map(e => e.id));
        const eventsWithSaved = (allEvents as any[]).map(e => ({
          ...e,
          isSaved: savedIds.has(e.id)
        }));
        
        setEvents(eventsWithSaved as ApiEvent[]);
      } catch (error) {
        console.error('Error fetching events:', error);
        toast.error('Failed to load events');
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
    
    // Listen for saved events updates
    const handleSavedUpdate = () => fetchEvents();
    window.addEventListener('savedEventsUpdated', handleSavedUpdate);
    return () => window.removeEventListener('savedEventsUpdated', handleSavedUpdate);
  }, []);

  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<ApiEvent | null>(null);
  const [eventPosts, setEventPosts] = useState<any[]>([]);



  useEffect(() => {
    if (selectedEvent) {
      // Increment view count
      incrementEventView(selectedEvent.id);

      const loadEventPosts = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const posts = await getPosts({ currentUserId: user?.id, eventId: selectedEvent.id });
            setEventPosts(posts || []);
        } catch (err) {
            console.error('Error loading event posts:', err);
        }
      };
      loadEventPosts();
    } else {
        setEventPosts([]);
    }
  }, [selectedEvent]);



  const [showFilters, setShowFilters] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [ticketFormData, setTicketFormData] = useState({ name: '', email: '' });
  const [eventToPurchase, setEventToPurchase] = useState<ApiEvent | null>(null);
  const [showNormalTicketModal, setShowNormalTicketModal] = useState(false);
  const [normalTicketQuantity, setNormalTicketQuantity] = useState(1);
  const [normalTicketStep, setNormalTicketStep] = useState<'quantity' | 'details' | 'payment' | 'confirm'>('quantity');
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  
  // Organizer stats hook
  const organizerStats = selectedUser?.is_organizer ? {
    followers: selectedUser.followers || 1200,
    totalEvents: selectedUser.totalEvents || 15,
    ticketsSold: selectedUser.ticketsSold || 3450,
    avgRating: selectedUser.avgRating || 4.8
  } : null;

  // Organizer events hook
  const organizerEvents = selectedUser?.is_organizer ? (selectedUser.upcomingEvents || []) : [];

  const [showTierTicketModal, setShowTierTicketModal] = useState(false);
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [tierTicketQuantity, setTierTicketQuantity] = useState(1);
  const [tierTicketStep, setTierTicketStep] = useState<'tier' | 'quantity' | 'details' | 'payment' | 'confirm'>('tier');
  const [paymentPhone, setPaymentPhone] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('Azampesa');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [showMediaViewer, setShowMediaViewer] = useState(false);
  const [mediaViewerIndex] = useState(0);
  const [mediaViewerType] = useState<'photo' | 'video'>('photo');
  
  // Messaging state
  const [showMessages, setShowMessages] = useState(false);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messageText, setMessageText] = useState('');

  // Sync activeConversation with global conversations updates
  useEffect(() => {
    if (activeConversation) {
      const updatedConv = globalConversations.find(c => c.id === activeConversation.id);
      if (updatedConv && updatedConv !== activeConversation) {
        setActiveConversation(updatedConv);
      }
    }
  }, [globalConversations, activeConversation]);

  const categories = [
    { id: 'all', name: 'All', icon: '🌟' },
    { id: 'entertainment', name: 'Entertainment', icon: '🎭', subcategories: ['Concerts', 'Club Nights', 'Live Performances', 'Nightlife (Bars/Lounges)', 'Themed Parties'] },
    { id: 'education', name: 'Education', icon: '📚', subcategories: ['Workshops', 'Seminars', 'Webinars'] },
    { id: 'culture', name: 'Culture', icon: '🌍', subcategories: ['Festivals', 'Arts', 'Theater', 'Food & Drink', 'Local Traditions', 'Fashion Events'] },
    { id: 'religion', name: 'Religion', icon: '🙏', subcategories: ['Worship Services', 'Religious Gatherings', 'Spiritual Events'] },
    { id: 'business & tech', name: 'Business & Tech', icon: '💼', subcategories: ['Startup Events', 'Networking', 'Conferences', 'Tech Talks'] },
    { id: 'sports & fitness', name: 'Sports & Fitness', icon: '⚡', subcategories: ['Fitness Classes', 'Competitions', 'Sports Events'] },
  ];

  const filteredEvents = events.filter(event => {
    const locationMatch = selectedLocation === 'all' || event.city === selectedLocation;
    const categoryMatch = selectedCategory === 'all' || event.category.toLowerCase() === selectedCategory.toLowerCase();
    const subcategoryMatch = selectedSubcategory === '' || event.subcategory.toLowerCase() === selectedSubcategory.toLowerCase();
    return locationMatch && categoryMatch && subcategoryMatch;
  });

  // Sort events into upcoming and past
  const now = new Date();
  const getEventDateTime = (event: ApiEvent) => {
    try {
      // Assuming date is YYYY-MM-DD
      const dateStr = event.date;
      // Try to parse time, default to end of day if looking for past events, but here we want precise
      const timeStr = event.time ? event.time.replace(' ', '') : '00:00';
      // simple check if time is AM/PM or 24h. 
      // If the date string is just text like "Mon, Feb 3", this will fail.
      // Based on HTML snippet "2026-02-03", it is ISO.
      return new Date(`${dateStr} ${timeStr}`);
    } catch (e) {
      return new Date(event.date);
    }
  };

  const upcomingEvents = filteredEvents
    .filter(e => getEventDateTime(e) >= now)
    .sort((a, b) => getEventDateTime(a).getTime() - getEventDateTime(b).getTime());

  const pastEvents = filteredEvents
    .filter(e => getEventDateTime(e) < now)
    .sort((a, b) => getEventDateTime(b).getTime() - getEventDateTime(a).getTime());

  // Filter locations based on search query
  const filteredLocations = locations.filter(location => 
    location.name.toLowerCase().includes(locationSearch.toLowerCase())
  );

  // Convert event highlights to format expected by MediaViewer
  const photosForViewer = [
    ...(selectedEvent?.event_highlights?.filter(h => h.mediaType === 'image').map((highlight, _index) => ({
      id: _index,
      url: highlight.image!,
      eventName: selectedEvent?.title || '',
    })) || []),
    ...eventPosts.filter(p => p.image_urls && p.image_urls.length > 0).flatMap((post) => 
      post.image_urls.map((url: string, imgIndex: number) => ({
        id: post.id * 1000 + imgIndex,
        url: url,
        likes: post.likes_count || 0,
        eventName: selectedEvent?.title || '',
        isPost: true,
        postId: post.id,
        isLiked: post.is_liked || false
      }))
    )
  ];

  const videosForViewer = [
    ...(selectedEvent?.event_highlights?.filter(h => h.mediaType === 'video').map((highlight, _index) => ({
      id: _index + 500,
      thumbnail: highlight.image || selectedEvent.image_url,
      videoUrl: highlight.video || '',
      eventName: selectedEvent?.title || '',
    })) || []),
    ...eventPosts.filter(p => p.video_url).map((post, _index) => ({
      id: 2000 + post.id,
      thumbnail: post.image_urls?.[0] || '',
      duration: post.duration || '0:00',
      views: post.views || 0,
      likes: post.likes_count || 0,
      videoUrl: post.video_url,
      eventName: selectedEvent?.title || '',
      isPost: true,
      postId: post.id,
      isLiked: post.is_liked || false
    }))
  ];

  const handleStartConversationLocal = async (user: { name: string; username?: string; avatar: string; verified: boolean; isOrganizer?: boolean }) => {
    // Close user profile modal
    setSelectedUser(null);
    
    // Use the global conversation handler
    const conversation = await onStartConversation(user);
    
    if (conversation) {
      // Open the conversation
      setActiveConversation(conversation);
      setShowMessages(true);
    }
  };

  const handleSendMessage = () => {
    if (!messageText.trim() || !activeConversation) return;

    // Update the global state
    onSendMessage(activeConversation.id, messageText);

    // Clear the input field
    setMessageText('');
  };

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'entertainment':
        return 'bg-purple-500 text-white';
      case 'business & tech':
        return 'bg-cyan-500 text-white';
      case 'culture':
        return 'bg-amber-600 text-white';
      case 'education':
        return 'bg-blue-500 text-white';
      case 'religion':
        return 'bg-red-600 text-white';
      case 'sports & fitness':
        return 'bg-green-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const hasActiveFilters = selectedLocation !== 'all' || selectedCategory !== 'all' || selectedSubcategory !== '';
  const activeFiltersCount = (selectedLocation !== 'all' ? 1 : 0) + (selectedCategory !== 'all' ? 1 : 0) + (selectedSubcategory !== '' ? 1 : 0);

  // Handle ticket purchase
  const handlePurchaseTicket = (event: ApiEvent) => {
    setEventToPurchase(event);
    setShowTicketModal(true);
    setTicketFormData({ name: '', email: '' });
    if (selectedEvent) {
      setSelectedEvent(null); // Close the event detail modal
    }
  };

  // Handle normal ticket purchase
  const handleNormalTicketPurchase = (event: ApiEvent) => {
    setEventToPurchase(event);
    
    // Check if event has multiple ticket tiers
    if (event.ticket_tiers && event.ticket_tiers.length > 0) {
      setShowTierTicketModal(true);
      setTierTicketStep('tier');
      setSelectedTier(null);
      setTierTicketQuantity(1);
    } else {
      setShowNormalTicketModal(true);
      setNormalTicketStep('quantity');
      setNormalTicketQuantity(1);
    }
    
    setTicketFormData({ name: '', email: '' });
    if (selectedEvent) {
      setSelectedEvent(null); // Close the event detail modal
    }
  };

  // Handle specific tier selection from modal
  const handleTierSelection = (event: ApiEvent, tierName: string) => {
    setEventToPurchase(event);
    setShowTierTicketModal(true);
    setSelectedTier(tierName);
    setTierTicketStep('quantity');
    setTierTicketQuantity(1);
    setTicketFormData({ name: '', email: '' });
    if (selectedEvent) {
      setSelectedEvent(null);
    }
  };

  const handleNormalTicketSubmit = async () => {
    if (!eventToPurchase || !ticketFormData.name || !ticketFormData.email || !paymentPhone) {
      toast.error('Please fill in all fields including payment details');
      return;
    }

    try {
      setIsProcessingPayment(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to purchase tickets');
        setIsProcessingPayment(false);
        return;
      }

      const priceStr = eventToPurchase.price_range;
      const numericPrice = parseInt(priceStr.replace(/[^\d]/g, '')) || 0;
      const totalPrice = numericPrice * normalTicketQuantity;

      // 1. Create Transaction
      const transactionData = {
        user_id: user.id,
        event_id: eventToPurchase.id,
        amount: totalPrice,
        currency: 'TZS',
        provider: selectedProvider,
        status: 'pending',
        metadata: {
          customer_name: ticketFormData.name,
          customer_email: ticketFormData.email,
          customer_phone: paymentPhone,
          ticket_tier: 'Normal',
          quantity: normalTicketQuantity
        }
      };

      const transaction = await createTransaction(transactionData);

      // 2. Initiate Payment
      toast.info('Initiating payment request...');
      await initiatePayment({
        amount: totalPrice,
        accountNumber: paymentPhone,
        provider: selectedProvider,
        externalId: transaction.id.toString()
      });

      toast.success(`Payment request sent to ${paymentPhone}! Please approve on your phone.`);

      // Generate tickets for each quantity
      const tickets: PurchasedTicket[] = [];
      for (let i = 0; i < normalTicketQuantity; i++) {
        const ticketNumber = `TKT-${Date.now()}-${crypto.randomUUID().split('-')[0].toUpperCase()}`;
        const barcode = crypto.randomUUID();
        
        const ticketData = {
          user_id: user.id,
          event_id: eventToPurchase.id,
          ticket_number: ticketNumber,
          barcode: barcode,
          price: eventToPurchase.price_range,
          purchase_date: new Date().toISOString(),
          customer_name: ticketFormData.name,
          customer_email: ticketFormData.email,
          ticket_type: 'Normal',
          status: 'active'
        };

        const newTicket = await createTicket(ticketData);

        const ticket: PurchasedTicket = {
          id: newTicket.id.toString(),
          eventId: eventToPurchase.id,
          eventTitle: eventToPurchase.title,
          eventDate: eventToPurchase.date,
          eventLocation: eventToPurchase.location,
          ticketNumber,
          barcode,
          purchaseDate: ticketData.purchase_date,
          customerName: ticketFormData.name,
          customerEmail: ticketFormData.email,
          price: eventToPurchase.price_range,
        };
        tickets.push(ticket);
      }

      // Show success toast
      toast.success(`${normalTicketQuantity} Ticket${normalTicketQuantity > 1 ? 's' : ''} Purchased! 🎉`, {
        description: `Sent to ${ticketFormData.email}. Check Alerts for details.`,
        duration: 5000,
      });

      // Close modal
      setShowNormalTicketModal(false);
      setEventToPurchase(null);
      setTicketFormData({ name: '', email: '' });
      setNormalTicketQuantity(1);
      setNormalTicketStep('quantity');
      setPaymentPhone('');
      setSelectedProvider('Azampesa');
    } catch (error: any) {
      console.error('Error purchasing ticket:', error);
      toast.error(`Failed to purchase tickets: ${error.message || 'Unknown error'}`);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Handle tier ticket purchase submit
  const handleTierTicketSubmit = async () => {
    if (!eventToPurchase || !selectedTier || !ticketFormData.name || !ticketFormData.email || !paymentPhone) {
      toast.error('Please fill in all fields including payment details');
      return;
    }

    const tierData = eventToPurchase.ticket_tiers?.find(t => t.name === selectedTier);
    if (!tierData) return;

    try {
      setIsProcessingPayment(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to purchase tickets');
        setIsProcessingPayment(false);
        return;
      }

      const totalPrice = tierData.priceNumeric * tierTicketQuantity;

      // 1. Create Transaction
      const transactionData = {
        user_id: user.id,
        event_id: eventToPurchase.id,
        amount: totalPrice,
        currency: 'TZS',
        provider: selectedProvider,
        status: 'pending',
        metadata: {
          customer_name: ticketFormData.name,
          customer_email: ticketFormData.email,
          customer_phone: paymentPhone,
          ticket_tier: selectedTier,
          quantity: tierTicketQuantity
        }
      };

      const transaction = await createTransaction(transactionData);

      // 2. Initiate Payment
      toast.info('Initiating payment request...');
      await initiatePayment({
        amount: totalPrice,
        accountNumber: paymentPhone,
        provider: selectedProvider,
        externalId: transaction.id.toString()
      });

      toast.success(`Payment request sent to ${paymentPhone}! Please approve on your phone.`);

      // For MVP/Demo: Assume success and proceed to create tickets
      // In production, we would wait for webhook/polling

      // Generate tickets for each quantity
      for (let i = 0; i < tierTicketQuantity; i++) {
        const ticketNumber = `${selectedTier.toUpperCase()}-${Date.now()}-${crypto.randomUUID().split('-')[0].toUpperCase()}`;
        const barcode = crypto.randomUUID();
        
        const ticketData = {
          user_id: user.id,
          event_id: eventToPurchase.id,
          ticket_number: ticketNumber,
          barcode: barcode,
          price: tierData.price,
          purchase_date: new Date().toISOString(),
          customer_name: ticketFormData.name,
          customer_email: ticketFormData.email,
          ticket_type: selectedTier,
          status: 'active'
        };

        await createTicket(ticketData);
      }

      // Show success toast
      toast.success(`${tierTicketQuantity} ${selectedTier} Ticket${tierTicketQuantity > 1 ? 's' : ''} Purchased! 🎉`, {
        description: `Sent to ${ticketFormData.email}. Check Alerts for details.`,
        duration: 5000,
      });

      // Close modal
      setShowTierTicketModal(false);
      setEventToPurchase(null);
      setTicketFormData({ name: '', email: '' });
      setTierTicketQuantity(1);
      setSelectedTier(null);
      setTierTicketStep('tier');
      setPaymentPhone('');
      setSelectedProvider('Azampesa');
    } catch (error: any) {
      console.error('Error purchasing ticket:', error);
      toast.error(`Purchase failed: ${error.message || 'Unknown error'}`);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Professional Header with Search & Filter */}
        <div className="mb-1 sticky top-0 z-50 bg-gray-50/95 backdrop-blur-sm pt-2 pb-2 -mx-4 px-4 transition-all">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-gray-900 text-2xl"><strong>EVENTZ</strong></h1>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Premium Search Button */}
              <button 
                onClick={() => setShowSearchModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white text-gray-900 rounded-xl border border-gray-200 hover:bg-gray-50 hover:shadow-lg hover:scale-105 transition-all"
              >
                <Search className="w-5 h-5" />
                <span className="text-sm">Search</span>
              </button>
              
              {/* Circular Filter Icon */}
              <button 
                onClick={() => setShowFilters(true)}
                className="relative w-11 h-11 bg-white rounded-full border border-gray-200 hover:bg-gray-50 hover:border-purple-300 transition-all shadow-sm flex items-center justify-center"
                title="Filter events"
              >
                <Filter className="w-5 h-5 text-gray-700" />
                {hasActiveFilters && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-purple-600 text-white text-xs rounded-full flex items-center justify-center shadow-md">
                    {activeFiltersCount}
                  </span>
                )}
              </button>
            </div>
          </div>
          
          {/* Tagline below - clean left-aligned with EVENTZ */}
          <p className="text-gray-600 text-sm">Discover amazing events happening around you</p>
        </div>

        {/* Active Filters Chips - Only shown when filters are active */}
        {hasActiveFilters && (
          <div className="flex gap-2 mb-4 flex-wrap">
            {selectedLocation !== 'all' && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-sm">
                <span>{locations.find(l => l.id === selectedLocation)?.flag}</span>
                <span>{locations.find(l => l.id === selectedLocation)?.name.split(',')[0]}</span>
                <button 
                  onClick={() => setSelectedLocation('all')}
                  className="ml-1 hover:bg-purple-200 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            {/* Only show subcategory if it exists, otherwise show main category */}
            {selectedSubcategory !== '' ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-sm">
                <span>🔍</span>
                <span>{selectedSubcategory}</span>
                <button 
                  onClick={() => setSelectedSubcategory('')}
                  className="ml-1 hover:bg-purple-200 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : selectedCategory !== 'all' && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-sm">
                <span>{categories.find(c => c.id === selectedCategory)?.icon}</span>
                <span>{categories.find(c => c.id === selectedCategory)?.name}</span>
                <button 
                  onClick={() => setSelectedCategory('all')}
                  className="ml-1 hover:bg-purple-200 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            <button 
              onClick={() => {
                setSelectedLocation('all');
                setSelectedCategory('all');
                setSelectedSubcategory('');
              }}
              className="px-3 py-1.5 text-purple-600 text-sm hover:bg-purple-50 rounded-lg transition-colors"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Subcategory Chips - Show when category is selected */}
        {selectedCategory !== 'all' && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-gray-900 text-sm">
                {categories.find(c => c.id === selectedCategory)?.name} Subcategories:
              </span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {categories
                .find(c => c.id === selectedCategory)?.subcategories?.map((subcategory) => (
                  <button
                    key={subcategory}
                    onClick={() => setSelectedSubcategory(selectedSubcategory === subcategory ? '' : subcategory)}
                    className={`flex-shrink-0 px-4 py-2 rounded-full text-sm transition-all ${ 
                      selectedSubcategory === subcategory
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'bg-white text-gray-700 border border-gray-200 hover:border-purple-300 hover:bg-purple-50'
                    }`}
                  >
                    {subcategory}
                  </button>
                ))}
            </div>
          </div>
        )}

        {/* Upcoming Events Grid */}
        {loading ? (
          <div className="mb-8">
            <h3 className="text-gray-900 font-semibold mb-2 ml-1">Upcoming Events</h3>
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm h-[260px] animate-pulse">
                  <div className="w-full h-40 bg-gray-200"></div>
                  <div className="p-3 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : upcomingEvents.length > 0 ? (
          <div className="mb-8">
            <h3 className="text-gray-900 font-semibold mb-2 ml-1">Upcoming Events</h3>
            <div className="grid grid-cols-2 gap-3">
              {upcomingEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onClick={setSelectedEvent}
                />
              ))}
            </div>
          </div>
        ) : null}



        {/* Fallback if logic fails or both empty but filteredEvents has items (shouldn't happen) */}
        {!loading && upcomingEvents.length === 0 && pastEvents.length === 0 && filteredEvents.length > 0 && (
           <div className="grid grid-cols-2 gap-3 mb-8">
             {filteredEvents.map((event) => (
               <EventCard
                 key={event.id}
                 event={event}
                 onClick={setSelectedEvent}
               />
             ))}
           </div>
        )}

        {/* Empty State */}
        {!loading && filteredEvents.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-gray-900 mb-2">No events found</h3>
            <p className="text-gray-600 text-sm">Try selecting different filters</p>
          </div>
        )}
      </div>

      {/* Filter Panel Sheet */}
      {showFilters && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm animate-in fade-in" onClick={() => setShowFilters(false)}>
          <div className="w-full max-w-4xl bg-white rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom" onClick={(e) => e.stopPropagation()}>
            {/* Filter Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h2 className="text-gray-900">Filter Events</h2>
              <button 
                onClick={() => setShowFilters(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Filter Content */}
            <div className="p-5 max-h-[70vh] overflow-y-auto">
              {/* Location Section */}
              <div className="mb-6">
                <h3 className="text-gray-900 text-sm mb-3">Location</h3>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search locations..."
                    value={locationSearch}
                    onChange={(e) => setLocationSearch(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-600 focus:outline-none"
                  />
                  <div className="absolute top-3 right-3">
                    <Search className="w-5 h-5 text-gray-500" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {filteredLocations.map((location) => (
                    <button
                      key={location.id}
                      onClick={() => setSelectedLocation(location.id)}
                      className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm transition-all border ${
                        selectedLocation === location.id
                          ? 'bg-purple-600 text-white border-purple-600 shadow-md'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-base">{location.flag}</span>
                      <span>{location.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Category Section */}
              <div className="mb-6">
                <h3 className="text-gray-900 text-sm mb-3">Categories</h3>
                <div className="grid grid-cols-2 gap-2">
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm transition-all border ${
                        selectedCategory === category.id
                          ? 'bg-purple-600 text-white border-purple-600 shadow-md'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-base">{category.icon}</span>
                      <span>{category.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Filter Footer */}
            <div className="p-5 border-t border-gray-200 flex gap-3">
              <button 
                onClick={() => {
                  setSelectedLocation('all');
                  setSelectedCategory('all');
                  setSelectedSubcategory('');
                }}
                className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Clear All
              </button>
              <button 
                onClick={() => setShowFilters(false)}
                className="flex-1 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors"
              >
                Show {filteredEvents.length} Events
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tier Ticket Purchase Modal - PREMIUM MULTI-TIER */}
      {showTierTicketModal && eventToPurchase && (
        <TierTicketModal
          event={{
            id: eventToPurchase.id,
            title: eventToPurchase.title,
            date: eventToPurchase.date,
            location: eventToPurchase.location,
            ticketTiers: eventToPurchase.ticket_tiers,
          }}
          step={tierTicketStep}
          selectedTier={selectedTier}
          quantity={tierTicketQuantity}
          formData={ticketFormData}
          paymentPhone={paymentPhone}
          selectedProvider={selectedProvider}
          isProcessingPayment={isProcessingPayment}
          onSelectTier={(tier) => setSelectedTier(tier)}
          onQuantityChange={(qty) => setTierTicketQuantity(qty)}
          onFormDataChange={(field, value) => setTicketFormData(prev => ({ ...prev, [field]: value }))}
          onPaymentPhoneChange={setPaymentPhone}
          onProviderChange={setSelectedProvider}
          onNext={() => {
            if (tierTicketStep === 'tier' && selectedTier) {
              setTierTicketStep('quantity');
            } else if (tierTicketStep === 'quantity') {
              setTierTicketStep('details');
            } else if (tierTicketStep === 'details') {
              setTierTicketStep('payment');
            } else if (tierTicketStep === 'payment') {
              setTierTicketStep('confirm');
            }
          }}
          onBack={() => {
            if (tierTicketStep === 'confirm') {
              setTierTicketStep('payment');
            } else if (tierTicketStep === 'payment') {
              setTierTicketStep('details');
            } else if (tierTicketStep === 'details') {
              setTierTicketStep('quantity');
            } else if (tierTicketStep === 'quantity') {
              setTierTicketStep('tier');
            }
          }}
          onClose={() => {
            setShowTierTicketModal(false);
            setEventToPurchase(null);
            setSelectedTier(null);
            setTierTicketQuantity(1);
            setTierTicketStep('tier');
            setTicketFormData({ name: '', email: '' });
            setPaymentPhone('');
            setSelectedProvider('Azampesa');
            setIsProcessingPayment(false);
          }}
          onSubmit={handleTierTicketSubmit}
        />
      )}

      {/* Premium Search Modal */}
      {showSearchModal && (
        <PremiumSearchModal
          onClose={() => setShowSearchModal(false)}
          events={events}
          onEventSelect={(event) => setSelectedEvent(event)}
          onPersonSelect={(person) => setSelectedUser(person)}
        />
      )}

      {/* User Profile Modal */}
      {selectedUser && (
        <UserProfileModal
          user={{
            name: selectedUser.full_name || selectedUser.name,
            type: selectedUser.is_organizer ? 'Organizer' : (selectedUser.type || 'Attendee'),
            followers: organizerStats?.followers?.toString() || selectedUser.followers || '0',
            following: '1.2k',
            eventsHosted: selectedUser.is_organizer ? (organizerStats?.totalEvents || 0) : undefined,
            eventsAttended: !selectedUser.is_organizer ? 156 : undefined,
            avatar: selectedUser.avatar_url || selectedUser.avatar,
            coverImage: selectedUser.cover_url || (selectedUser.full_name === 'Buki Jenard' ? 'https://i.ibb.co/F2wGf9R/B-Cover.jpg' : selectedUser.name === 'Luchy Ranks' ? 'https://i.ibb.co/k2Jg34Nv/L-cover.jpg' : 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200'),
            bio: selectedUser.bio || (selectedUser.is_organizer 
              ? 'Professional event organizer specializing in creating unforgettable experiences. Passionate about bringing people together through music, culture, and celebration.' 
              : selectedUser.type === 'Performer'
              ? 'Professional performer and artist bringing energy and entertainment to events across the globe. Book me for your next event!'
              : 'Event enthusiast and social butterfly. Love discovering new experiences and meeting amazing people!'),
            location: selectedUser.location || 'Unknown',
            verified: selectedUser.verified,
            joinedDate: 'January 2023',
            email: selectedUser.contact_email || (selectedUser.full_name ? selectedUser.full_name.toLowerCase().replace(' ', '.') + '@eventz.com' : ''),
            phone: selectedUser.phone || '+255 712 345 678',
            instagram: selectedUser.social_links?.instagram || (selectedUser.full_name ? selectedUser.full_name.toLowerCase().replace(' ', '') : ''),
            twitter: selectedUser.social_links?.twitter || (selectedUser.full_name ? selectedUser.full_name.toLowerCase().replace(' ', '_') : ''),
            highlights: selectedUser.is_organizer ? [
              {
                id: 1,
                image: 'https://images.unsplash.com/photo-1658046413536-6e5933dfd939?w=400&h=300&fit=crop',
                title: 'Summer Festival 2024',
                date: 'Dec 15, 2024',
                attendees: 4500,
              },
              {
                id: 2,
                image: 'https://images.unsplash.com/photo-1751998689590-f7ae39d9d218?w=400&h=300&fit=crop',
                title: 'New Year Bash',
                date: 'Jan 1, 2025',
                attendees: 5200,
              },
            ] : undefined,
            photos: selectedUser.type === 'Organizer' ? [
              { id: 1, image: 'https://images.unsplash.com/photo-1658046413536-6e5933dfd939?w=400&h=300&fit=crop', size: 'large' as const },
              { id: 2, image: 'https://images.unsplash.com/photo-1605286232233-e448650f5914?w=400&h=300&fit=crop', size: 'small' as const },
              { id: 3, image: 'https://images.unsplash.com/photo-1607313029691-fa108ddf807d?w=400&h=300&fit=crop', size: 'small' as const },
              { id: 4, image: 'https://images.unsplash.com/photo-1756978303719-57095d8bd250?w=400&h=300&fit=crop', size: 'large' as const },
              { id: 5, image: 'https://images.unsplash.com/photo-1751998689590-f7ae39d9d218?w=400&h=300&fit=crop', size: 'small' as const },
              { id: 6, image: 'https://images.unsplash.com/photo-1704830657561-a6a663931172?w=400&h=300&fit=crop', size: 'small' as const },
            ] : selectedUser.type === 'Attendee' ? [
              { id: 1, image: 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=400&h=300&fit=crop', size: 'large' as const },
              { id: 2, image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&h=300&fit=crop', size: 'small' as const },
              { id: 3, image: 'https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=400&h=300&fit=crop', size: 'small' as const },
              { id: 4, image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=300&fit=crop', size: 'large' as const },
              { id: 5, image: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=400&h=300&fit=crop', size: 'small' as const },
              { id: 6, image: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=400&h=300&fit=crop', size: 'small' as const },
            ] : undefined,
            upcomingEvents: selectedUser.is_organizer ? organizerEvents.map(event => ({
              id: event.id,
              title: event.title,
              date: event.date,
              time: event.time,
              location: event.location,
              image: event.image_url,
              attendees: (event.attendees || 0) + (event.streaming?.liveViewers || 0),
              price: event.price_range
            })) : undefined,
            stats: selectedUser.is_organizer ? {
              totalEvents: organizerStats?.totalEvents || 0,
              totalAttendees: organizerStats?.ticketsSold || 0,
              avgRating: organizerStats?.avgRating || 4.8,
              reviewsCount: 342,
            } : undefined,
          }}
          onClose={() => setSelectedUser(null)}
          onFollow={() => {
            toast.success(`You are now following ${selectedUser.name}!`);
          }}
          onMessage={() => {
            handleStartConversationLocal(selectedUser);
          }}
        />
      )}

      {/* Event Detail Modal */}
      {selectedEvent && (
        <EventDetailModal 
          event={selectedEvent} 
          onClose={() => setSelectedEvent(null)} 
          onPurchaseTicket={handlePurchaseTicket}
          onPurchaseNormalTicket={handleNormalTicketPurchase}
          onStartConversation={handleStartConversationLocal}
          onTierSelect={handleTierSelection}
        />
      )}

      {/* Ticket Purchase Modal */}
      {showTicketModal && eventToPurchase && (
        <VirtualTicketPurchaseModal
          isOpen={showTicketModal}
          onClose={() => setShowTicketModal(false)}
          event={eventToPurchase}
        />
      )}

      {/* Normal Ticket Purchase Modal - SUPER EASY FLOW */}
      {showNormalTicketModal && eventToPurchase && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowNormalTicketModal(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            
            {/* Step 1: Select Quantity */}
            {normalTicketStep === 'quantity' && (
              <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-gray-900 text-2xl mb-1">Get Tickets</h2>
                    <p className="text-gray-600">{eventToPurchase.title}</p>
                  </div>
                  <button 
                    onClick={() => setShowNormalTicketModal(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Event Preview */}
                <div className="mb-6 p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-200">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl overflow-hidden">
                      <img src={eventToPurchase.image_url} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-900">{eventToPurchase.title}</p>
                      <p className="text-sm text-gray-600">{eventToPurchase.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                    <span className="text-gray-700">Price per ticket</span>
                    <span className="text-purple-600">{eventToPurchase.price_range}</span>
                  </div>
                </div>

                {/* Quantity Selector */}
                <div className="mb-6">
                  <label className="block text-gray-900 mb-3">How many tickets?</label>
                  <div className="flex items-center justify-center gap-4">
                    <button
                      onClick={() => setNormalTicketQuantity(Math.max(1, normalTicketQuantity - 1))}
                      className="w-12 h-12 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors flex items-center justify-center text-gray-700"
                    >
                      <span className="text-2xl">−</span>
                    </button>
                    <div className="text-center">
                      <div className="text-4xl text-purple-600 mb-1">{normalTicketQuantity}</div>
                      <div className="text-sm text-gray-600">ticket{normalTicketQuantity > 1 ? 's' : ''}</div>
                    </div>
                    <button
                      onClick={() => setNormalTicketQuantity(normalTicketQuantity + 1)}
                      className="w-12 h-12 rounded-xl bg-purple-600 hover:bg-purple-700 transition-colors flex items-center justify-center text-white"
                    >
                      <span className="text-2xl">+</span>
                    </button>
                  </div>
                </div>

                {/* Total */}
                <div className="mb-6 p-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white">
                  <div className="flex items-center justify-between">
                    <span className="text-lg">Total</span>
                    <span className="text-2xl">
                      {(() => {
                        const priceStr = eventToPurchase.price_range;
                        const numericPrice = parseInt(priceStr.replace(/[^\d]/g, '')) || 0;
                        const total = numericPrice * normalTicketQuantity;
                        
                        if (priceStr.toLowerCase().includes('free')) return 'Free';
                        if (priceStr.includes('TSh')) return `TSh ${total.toLocaleString()}`;
                        if (priceStr.includes('$')) return `$${total.toLocaleString()}`;
                        // Fallback: if it has digits, assume it's a number and format it
                        if (/\d/.test(priceStr)) return total.toLocaleString();
                        return priceStr;
                      })()}
                    </span>
                  </div>
                </div>

                {/* Continue Button */}
                <button
                  onClick={() => setNormalTicketStep('details')}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg text-lg"
                >
                  Continue
                </button>
              </div>
            )}

            {/* Step 2: Enter Details */}
            {normalTicketStep === 'details' && (
              <div className="p-6">
                {/* Header */}
                <div className="mb-6">
                  <button 
                    onClick={() => setNormalTicketStep('quantity')}
                    className="text-purple-600 hover:text-purple-700 mb-3 flex items-center gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Back
                  </button>
                  <h2 className="text-gray-900 text-2xl mb-1">Your Details</h2>
                  <p className="text-gray-600">Almost there! Just need a few details</p>
                </div>

                {/* Quick Summary */}
                <div className="mb-6 p-3 bg-purple-50 rounded-xl flex items-center justify-between">
                  <span className="text-gray-700">{normalTicketQuantity} ticket{normalTicketQuantity > 1 ? 's' : ''}</span>
                  <span className="text-purple-600">
                    {eventToPurchase.price_range.includes('TSh') 
                      ? `TSh ${(parseInt(eventToPurchase.price_range.replace(/[^\d]/g, '')) * normalTicketQuantity).toLocaleString()}`
                      : eventToPurchase.price_range.includes('$')
                      ? `$${(parseInt(eventToPurchase.price_range.replace(/[^\d]/g, '')) * normalTicketQuantity).toLocaleString()}`
                      : eventToPurchase.price_range
                    }
                  </span>
                </div>

                {/* Simple Form */}
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-gray-700 mb-2">Full Name</label>
                    <input
                      type="text"
                      value={ticketFormData.name}
                      onChange={(e) => setTicketFormData({ ...ticketFormData, name: e.target.value })}
                      placeholder="John Doe"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      value={ticketFormData.email}
                      onChange={(e) => setTicketFormData({ ...ticketFormData, email: e.target.value })}
                      placeholder="john@example.com"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    <p className="text-gray-500 text-sm mt-1">📧 Tickets will be sent here</p>
                  </div>
                </div>

                {/* Continue Button */}
                <button
                  onClick={() => {
                    if (ticketFormData.name && ticketFormData.email) {
                      setNormalTicketStep('payment');
                    } else {
                      toast.error('Please fill in all fields');
                    }
                  }}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg text-lg"
                >
                  Continue to Payment
                </button>
              </div>
            )}

            {/* Step 3: Payment */}
            {normalTicketStep === 'payment' && (
              <div className="p-6">
                {/* Header */}
                <div className="mb-6">
                  <button 
                    onClick={() => setNormalTicketStep('details')}
                    className="text-purple-600 hover:text-purple-700 mb-3 flex items-center gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Back
                  </button>
                  <h2 className="text-gray-900 text-2xl mb-1">Payment Method</h2>
                  <p className="text-gray-600">Select your preferred payment provider</p>
                </div>

                {/* Provider Selection */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {['Azampesa', 'Airtel', 'Tigo', 'Halopesa'].map((provider) => (
                    <button
                      key={provider}
                      onClick={() => setSelectedProvider(provider)}
                      className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                        selectedProvider === provider
                          ? 'border-purple-500 bg-purple-50 text-purple-700'
                          : 'border-gray-200 hover:border-purple-200 text-gray-600'
                      }`}
                    >
                      <CreditCard className={`w-6 h-6 ${selectedProvider === provider ? 'text-purple-600' : 'text-gray-400'}`} />
                      <span className="font-medium">{provider}</span>
                    </button>
                  ))}
                </div>

                {/* Phone Input */}
                <div className="mb-6">
                  <label className="block text-gray-700 mb-2 font-medium">Mobile Number</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Smartphone className="w-5 h-5 text-gray-400" />
                    </div>
                    <input
                      type="tel"
                      value={paymentPhone}
                      onChange={(e) => setPaymentPhone(e.target.value)}
                      placeholder="2557..."
                      className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all text-lg"
                    />
                  </div>
                  <p className="text-sm text-gray-500 mt-2">Enter the number registered with {selectedProvider}</p>
                </div>

                {/* Continue Button */}
                <button
                  onClick={() => {
                    if (paymentPhone && paymentPhone.length >= 10) {
                      setNormalTicketStep('confirm');
                    } else {
                      toast.error('Please enter a valid phone number');
                    }
                  }}
                  disabled={!paymentPhone || paymentPhone.length < 10}
                  className={`w-full py-4 rounded-xl text-white flex items-center justify-center gap-2 transition-all shadow-lg text-lg ${
                    paymentPhone && paymentPhone.length >= 10
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
                      : 'bg-gray-300 cursor-not-allowed'
                  }`}
                >
                  Review Order
                </button>
              </div>
            )}

            {/* Step 3: Confirm */}
            {normalTicketStep === 'confirm' && (
              <div className="p-6">
                {/* Header */}
                <div className="mb-6">
                  <button 
                    onClick={() => setNormalTicketStep('payment')}
                    className="text-purple-600 hover:text-purple-700 mb-3 flex items-center gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Back
                  </button>
                  <h2 className="text-gray-900 text-2xl mb-1">Confirm Purchase</h2>
                  <p className="text-gray-600">Review your order</p>
                </div>

                {/* Order Summary */}
                <div className="mb-6 space-y-3">
                  {/* Event */}
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-sm text-gray-600 mb-1">Event</p>
                    <p className="text-gray-900">{eventToPurchase.title}</p>
                    <p className="text-sm text-gray-600">{eventToPurchase.date}</p>
                    <p className="text-sm text-gray-600">{eventToPurchase.location}</p>
                  </div>

                  {/* Customer */}
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-sm text-gray-600 mb-1">Ticket Holder</p>
                    <p className="text-gray-900">{ticketFormData.name}</p>
                    <p className="text-sm text-gray-600">{ticketFormData.email}</p>
                  </div>

                  {/* Tickets */}
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Tickets</p>
                        <p className="text-gray-900">{normalTicketQuantity} × {eventToPurchase.price_range}</p>
                      </div>
                      <p className="text-2xl text-purple-600">
                        {(() => {
                          const priceStr = eventToPurchase.price_range;
                          const numericPrice = parseInt(priceStr.replace(/[^\d]/g, '')) || 0;
                          const total = numericPrice * normalTicketQuantity;
                          
                          if (priceStr.toLowerCase().includes('free')) return 'Free';
                          if (priceStr.includes('TSh')) return `TSh ${total.toLocaleString()}`;
                          if (priceStr.includes('$')) return `$${total.toLocaleString()}`;
                          if (/\d/.test(priceStr)) return total.toLocaleString();
                          return priceStr;
                        })()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* What You'll Get */}
                <div className="mb-6 p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200">
                  <p className="text-green-900 mb-2 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" />
                    What you'll receive
                  </p>
                  <ul className="space-y-2 text-sm text-green-800">
                    <li>✅ {normalTicketQuantity} digital ticket{normalTicketQuantity > 1 ? 's' : ''} via email</li>
                    <li>✅ Unique ticket number & barcode</li>
                    <li>✅ Event details & location</li>
                    <li>✅ Entry to {eventToPurchase.title}</li>
                  </ul>
                </div>

                {/* Confirm Button */}
                <button
                  onClick={handleNormalTicketSubmit}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-4 rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg text-lg flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-6 h-6" />
                  Confirm & Purchase
                </button>
                <p className="text-gray-500 text-xs text-center mt-3">
                  🔒 Secure checkout
                </p>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Media Viewer - For engaging photo and video viewing */}
      {showMediaViewer && (
        <MediaViewer
          media={mediaViewerType === 'photo' ? photosForViewer : videosForViewer}
          initialIndex={mediaViewerIndex}
          onClose={() => setShowMediaViewer(false)}
          type={mediaViewerType}
        />
      )}

      {/* Messaging Panel */}
      {showMessages && (
        <div className="fixed inset-0 bg-black/50 z-50" onClick={() => {
          if (!activeConversation) setShowMessages(false);
        }}>
          <div 
            className="absolute right-0 top-0 w-full max-w-md bg-white h-full shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {!activeConversation ? (
              <>
                {/* Conversations List Header */}
                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                  <h2 className="text-gray-900">Messages</h2>
                  <button
                    onClick={() => setShowMessages(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Conversations List */}
                <div className="flex-1 overflow-y-auto">
                  {globalConversations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                      <MessageCircle className="w-16 h-16 text-gray-300 mb-4" />
                      <h3 className="text-gray-900 mb-2">No messages yet</h3>
                      <p className="text-gray-500 text-sm">Start a conversation with organizers or other users!</p>
                    </div>
                  ) : (
                    globalConversations.map((conv) => (
                      <button
                        key={conv.id}
                        onClick={() => setActiveConversation(conv)}
                        className="w-full p-4 flex items-start gap-3 hover:bg-gray-50 transition-colors border-b border-gray-100"
                      >
                        <div className="relative">
                          <ImageWithFallback
                            src={conv.user.avatar}
                            alt={conv.user.name}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                          {conv.unreadCount > 0 && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#8A2BE2] rounded-full flex items-center justify-center">
                              <span className="text-white text-xs font-bold">{conv.unreadCount}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 text-left">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1">
                              <span className="text-gray-900 text-sm font-medium">{conv.user.name}</span>
                              {conv.user.verified && (
                                <CheckCircle2 className="w-4 h-4 text-white fill-[#8A2BE2]" />
                              )}
                            </div>
                            <span className="text-gray-400 text-xs">{conv.lastMessage.timestamp}</span>
                          </div>
                          <p className={`text-sm line-clamp-1 ${conv.lastMessage.isRead ? 'text-gray-500' : 'text-gray-900 font-medium'}`}>
                            {conv.lastMessage.text}
                          </p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </>
            ) : (
              <>
                {/* Active Conversation Header - Purple Gradient */}
                <div className="bg-[#8A2BE2] px-5 py-4">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setActiveConversation(null)}
                      className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5 text-white" />
                    </button>
                    
                    <div className="relative">
                      <ImageWithFallback
                        src={activeConversation.user.avatar}
                        alt={activeConversation.user.name}
                        className="w-10 h-10 rounded-full object-cover ring-2 ring-white/50"
                      />
                      {activeConversation.user.isOrganizer && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-[#8A2BE2] rounded-full flex items-center justify-center ring-2 ring-white">
                          <Star className="w-2 h-2 text-white fill-white" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-white font-bold truncate">
                          {activeConversation.user.name}
                        </h3>
                        {activeConversation.user.verified && (
                          <div className="flex-shrink-0 w-4 h-4 bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center">
                            <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <p className="text-white/80 text-xs">{activeConversation.user.username}</p>
                    </div>

                    <button
                      onClick={() => {
                        setActiveConversation(null);
                        setShowMessages(false);
                      }}
                      className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5 text-white" />
                    </button>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto bg-gray-50 px-5 py-4">
                  {activeConversation.messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <MessageCircle className="w-12 h-12 text-gray-300 mb-3" />
                      <p className="text-gray-500 text-sm">Send a message to start the conversation</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {activeConversation.messages.map((msg) => {
                        const isMe = msg.senderId === 0;
                        return (
                          <div
                            key={msg.id}
                            className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                          >
                            <div className={`max-w-[75%] ${isMe ? 'order-2' : 'order-1'}`}>
                              <div
                                className={`rounded-2xl px-4 py-2.5 ${
                                  isMe
                                    ? 'bg-[#8A2BE2] text-white'
                                    : 'bg-white text-gray-900 shadow-sm'
                                }`}
                              >
                                <p className="text-sm leading-relaxed">{msg.text}</p>
                              </div>
                              <span className={`text-xs text-gray-400 mt-1 block ${
                                isMe ? 'text-right' : 'text-left'
                              }`}>
                                {msg.timestamp}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Message Input */}
                <div className="bg-white border-t border-gray-200 px-5 py-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder="Type a message..."
                      className="flex-1 px-4 py-2.5 bg-gray-100 rounded-full text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#8A2BE2]"
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!messageText.trim()}
                      className="w-10 h-10 bg-[#8A2BE2] text-white rounded-full flex items-center justify-center hover:bg-[#7526c7] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
