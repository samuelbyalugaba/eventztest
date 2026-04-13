import { useState, useEffect } from 'react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { EventCard } from './EventCard';
import { Upload, Calendar, MapPin, Tag, Eye, Save, Music, GraduationCap, Church, Briefcase, Dumbbell, Palette, CheckCircle, ArrowLeft, Sparkles, Share2, TrendingUp, Users, BarChart3, Plus, Trash2, X, Tv } from 'lucide-react';
import { toast } from 'sonner';
import { ShareModal } from './ShareModal';
import { handleShare as shareUtil } from '../utils/share';
import { supabase } from '../utils/supabase/client';
import { currencies, extractCurrencyFromPrice } from '../utils/currencies';
import { createEvent, updateEvent, uploadImage, getProfile, getEventAnalytics } from '../utils/supabase/api';

interface TicketTier {
  name: string;
  price: string;
  priceNumeric: number;
  available: number;
  features: string[];
}

interface EventForm {
  title: string;
  category: string;
  subcategory: string;
  date: string;
  time: string;
  location: string;
  price: string;
  description: string;
  coverImage: string | null;
  ticketTiers: TicketTier[];
  currency: string;
  streaming: {
    available: boolean;
    virtualPrice: string;
    virtualPriceNumeric: number;
    quality: 'HD' | '4K' | 'SD';
  };
}

interface CreateEventProps {
  onBack?: () => void;
  event?: any;
}

export function CreateEvent({ onBack, event }: CreateEventProps) {
  // Rebuilt pricing calculation system - defined before useState to use in initialization
  const calculatePriceRange = (tiers: TicketTier[], currencyCode: string): string => {
    // No tiers = no price
    if (!tiers || tiers.length === 0) {
      return '';
    }

    // Extract valid prices (must be > 0 and a valid number)
    const validPrices = tiers
      .map(tier => {
        const price = tier.priceNumeric;
        // Check if price is a valid positive number
        if (typeof price !== 'number') return null;
        if (isNaN(price)) return null;
        if (price <= 0) return null;
        return price;
      })
      .filter((p): p is number => p !== null);

    // No valid prices = empty string
    if (validPrices.length === 0) {
      return '';
    }

    // Calculate min and max
    const min = Math.min(...validPrices);
    const max = Math.max(...validPrices);
    
    // Get currency symbol
    const currency = currencies.find(c => c.code === currencyCode);
    const symbol = currency?.symbol || currencyCode;
    
    // Format: single price or range
    if (min === max) {
      return `${symbol} ${min.toLocaleString()}`;
    } else {
      return `${symbol} ${min.toLocaleString()} - ${symbol} ${max.toLocaleString()}`;
    }
  };

  const initialCurrency = (() => {
    const direct = (event as any)?.currency;
    if (typeof direct === 'string' && direct.trim()) return direct.trim();

    const tierPrice = (event as any)?.ticket_tiers?.[0]?.price;
    if (typeof tierPrice === 'string' && tierPrice.trim()) return extractCurrencyFromPrice(tierPrice);

    const priceRange = (event as any)?.price_range || (event as any)?.price;
    if (typeof priceRange === 'string' && priceRange.trim()) return extractCurrencyFromPrice(priceRange);

    return 'TZS';
  })();

  const normalizeManualPrice = (value: string, currencyCode: string) => {
    const input = String(value ?? '').trim();
    if (!input) return '';

    if (input.toLowerCase() === 'free') return 'Free';

    const currency = currencies.find(c => c.code === currencyCode);
    const symbol = currency?.symbol || currencyCode;

    const includesCurrency = currencies.some(c => {
      if (!c.symbol) return false;
      return input.includes(c.symbol) || new RegExp(`\\b${c.code}\\b`, 'i').test(input);
    });

    if (includesCurrency) return input;

    const parts = input.split(/\s*-\s*/).filter(Boolean);
    if (parts.length === 2) {
      const left = parseFloat(parts[0].replace(/[^0-9.]/g, ''));
      const right = parseFloat(parts[1].replace(/[^0-9.]/g, ''));
      if (!isNaN(left) && !isNaN(right) && left > 0 && right > 0) {
        const min = Math.min(left, right);
        const max = Math.max(left, right);
        return `${symbol} ${min.toLocaleString()} - ${symbol} ${max.toLocaleString()}`;
      }
      return input;
    }

    const numeric = parseFloat(input.replace(/[^0-9.]/g, ''));
    if (!isNaN(numeric) && numeric > 0) {
      return `${symbol} ${numeric.toLocaleString()}`;
    }

    return input;
  };

  // Initialize form state - calculatePriceRange is available here
  const [formData, setFormData] = useState<EventForm>({
    title: event?.title || '',
    category: event?.category || 'Entertainment',
    subcategory: event?.subcategory || '',
    date: event?.date || '',
    time: event?.time || '',
    location: event?.location || '',
    price: (() => {
      // Initialize price: if event has tiers, calculate from tiers, otherwise use price_range
      if (event?.ticket_tiers && event.ticket_tiers.length > 0) {
        const tiers = event.ticket_tiers.map((t: any) => ({
          name: t.name || '',
          price: t.price || '',
          priceNumeric: t.priceNumeric ?? (parseFloat(String(t.price || '0').replace(/[^0-9.]/g, '')) || 0),
          available: t.available || 100,
          features: t.features || []
        }));
        const currency = initialCurrency;
        // Calculate from tiers
        const calculated = calculatePriceRange(tiers, currency);
        return calculated || '';
      }
      return event?.price_range || event?.price || '';
    })(),
    description: event?.description || '',
    coverImage: event?.image_url || event?.coverImage || null,
    ticketTiers: event?.ticket_tiers || [],
    currency: initialCurrency,
    streaming: {
      available: event?.streaming?.available || false,
      virtualPrice: event?.streaming?.virtualPrice || '',
      virtualPriceNumeric: parseFloat(event?.streaming?.virtualPrice?.replace(/[^0-9.]/g, '') || '0'),
      quality: event?.streaming?.quality || 'HD',
    }
  });

  const handleCurrencyChange = (currencyCode: string) => {
    setFormData(prev => {
      const currencyData = currencies.find(c => c.code === currencyCode);
      const symbol = currencyData?.symbol || currencyCode;
      
      // Update all existing tiers' display price string
      const newTiers = prev.ticketTiers.map(tier => {
        // Only update price string if priceNumeric is valid
        const priceStr = (tier.priceNumeric > 0 && !isNaN(tier.priceNumeric))
          ? `${symbol} ${tier.priceNumeric.toLocaleString()}`
          : `${symbol} 0`;
        
        return {
          ...tier,
          price: priceStr
        };
      });

      // Recalculate price range from updated tiers
      const newPriceRange = calculatePriceRange(newTiers, currencyCode);
      
      return {
        ...prev,
        currency: currencyCode,
        ticketTiers: newTiers,
        // Always use calculated price when tiers exist, otherwise keep manual price
        price: prev.ticketTiers.length > 0 ? newPriceRange : prev.price
      };
    });
  };

  const handleAddTier = () => {
    setFormData(prev => {
      const currency = currencies.find(c => c.code === prev.currency);
      const symbol = currency?.symbol || prev.currency;
      
      const newTier: TicketTier = {
        name: '',
        price: `${symbol} 0`,
        priceNumeric: 0, // Start with 0 - user must enter price
        available: 100,
        features: []
      };
      
      const newTiers = [...prev.ticketTiers, newTier];
      
      // Recalculate price range (will be empty since new tier has priceNumeric: 0)
      const newPriceRange = calculatePriceRange(newTiers, prev.currency);
      
      return {
        ...prev,
        ticketTiers: newTiers,
        // Clear price when adding new empty tier, or recalculate if other tiers have prices
        price: newPriceRange
      };
    });
  };

  const handleRemoveTier = (index: number) => {
    setFormData(prev => {
      const newTiers = [...prev.ticketTiers];
      newTiers.splice(index, 1);
      
      // Recalculate price range
      const newPriceRange = newTiers.length > 0 
        ? calculatePriceRange(newTiers, prev.currency)
        : ''; // No tiers = no auto-calculated price
      
      return { 
        ...prev, 
        ticketTiers: newTiers, 
        // Always use calculated price when tiers exist, empty string when no tiers
        price: newPriceRange
      };
    });
  };

  const handleUpdateTier = (index: number, field: keyof TicketTier, value: any) => {
    setFormData(prev => {
      const newTiers = [...prev.ticketTiers];
      const updatedTier = { ...newTiers[index], [field]: value };
      
      // Handle priceNumeric updates
      if (field === 'priceNumeric') {
        const currency = currencies.find(c => c.code === prev.currency);
        const symbol = currency?.symbol || prev.currency;
        
        // Parse the value to number
        const numericValue = typeof value === 'number' ? value : parseFloat(String(value)) || 0;
        
        // Update both priceNumeric and price string
        updatedTier.priceNumeric = numericValue;
        updatedTier.price = numericValue > 0 
          ? `${symbol} ${numericValue.toLocaleString()}`
          : `${symbol} 0`;
      }
      
      newTiers[index] = updatedTier;
      
      // Always recalculate price range from current tiers
      const newPriceRange = calculatePriceRange(newTiers, prev.currency);
      
      return { 
        ...prev, 
        ticketTiers: newTiers, 
        // Always use calculated price - never keep stale values
        price: newPriceRange
      };
    });
  };

  const [savedEventId, setSavedEventId] = useState<number | undefined>(event?.id);
  const [currentStatus, setCurrentStatus] = useState<string>(event?.status || 'draft');
  const [showPreview, setShowPreview] = useState(false);
  const [showSuccessScreen, setShowSuccessScreen] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  // const [isUploading, setIsUploading] = useState(false);
  const isEditing = !!savedEventId;

  const [userProfile, setUserProfile] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const profile = await getProfile(user.id);
        setUserProfile(profile);
      }
    };
    fetchProfile();
  }, []);

  useEffect(() => {
    if (showSuccessScreen && savedEventId) {
      const fetchAnalytics = async () => {
        try {
          const data = await getEventAnalytics(savedEventId);
          setAnalytics(data);
        } catch (error) {
        }
      };
      fetchAnalytics();
    }
  }, [showSuccessScreen, savedEventId]);

  // Auto-save functionality
  useEffect(() => {
    const autoSave = async () => {
      // Don't auto-save if no title (minimum requirement) or if submitting or if event is published
      if (!formData.title || isSubmitting || currentStatus === 'published' || showSuccessScreen) return;

      setIsAutoSaving(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const priceRange =
          formData.ticketTiers.length > 0
            ? calculatePriceRange(formData.ticketTiers, formData.currency)
            : normalizeManualPrice(formData.price, formData.currency);

        const eventData = {
          title: formData.title,
          description: formData.description,
          date: formData.date,
          time: formData.time,
          location: formData.location,
          category: formData.category || 'Entertainment', // Ensure category is never null
          subcategory: formData.subcategory,
          image_url: formData.coverImage || '',
          price_range: priceRange,
          organizer_id: user.id,
          status: 'draft' as const,
          ticket_tiers: formData.ticketTiers,
          streaming: {
            available: formData.streaming.available,
            quality: formData.streaming.quality,
            virtualPrice: formData.streaming.virtualPrice
          }
        };

        if (savedEventId) {
          await updateEvent(savedEventId, eventData);
        } else {
          const newEvent = await createEvent(eventData);
          setSavedEventId(newEvent.id);
        }
      } catch (error) {
      } finally {
        setIsAutoSaving(false);
      }
    };

    const timeoutId = setTimeout(autoSave, 3000); // Auto-save after 3 seconds of inactivity
    return () => clearTimeout(timeoutId);
  }, [formData, savedEventId, isSubmitting, currentStatus, showSuccessScreen]);

  const categories = [
    { name: 'Entertainment', icon: Music, gradient: 'from-purple-600 to-pink-600' },
    { name: 'Culture', icon: Palette, gradient: 'from-cyan-500 to-blue-600' },
    { name: 'Religion', icon: Church, gradient: 'from-amber-500 to-orange-600' },
    { name: 'Education', icon: GraduationCap, gradient: 'from-green-500 to-emerald-600' },
    { name: 'Business & Tech', icon: Briefcase, gradient: 'from-indigo-600 to-purple-600' },
    { name: 'Sports & Fitness', icon: Dumbbell, gradient: 'from-red-500 to-pink-600' },
  ];

  // Subcategories for each category
  const subcategoriesMap: Record<string, string[]> = {
    'Entertainment': [
      'Concerts',
      'Live Performances',
      'Music Festival',
      'Themed Parties',
      'Club Nights',
      'Bars & Lounges'
    ],
    'Culture': [
      'Festivals',
      'Arts',
      'Food & Drink',
      'Local Traditions',
      'Fashion Events'
    ],
    'Education': [
      'Workshops',
      'Seminars',
      'Webinars'
    ],
    'Religion': [
      'Religious Gatherings',
      'Spiritual Events'
    ],
    'Business & Tech': [
      'Startup Events',
      'Networking',
      'Tech Talks'
    ],
    'Sports & Fitness': [
      'Competitions',
      'Fitness Classes',
      'Sports Events'
    ]
  };

  const handleInputChange = (field: keyof EventForm, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCategoryChange = (categoryName: string) => {
    setFormData((prev) => ({ 
      ...prev, 
      category: categoryName,
      subcategory: '' // Reset subcategory when category changes
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file');
        return;
      }
      
      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Image size should be less than 10MB');
        return;
      }

      const toastId = toast.loading('Uploading image...');

      try {
        const publicUrl = await uploadImage(file, 'events');
        handleInputChange('coverImage', publicUrl);
        toast.success('Cover image uploaded! 📸', { id: toastId });
      } catch (error) {
        toast.error('Failed to upload image', { id: toastId });
      }
    }
  };

  /*
  const handleSaveDraft = async () => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to save drafts');
        return;
      }

      // Ensure price is calculated from tiers if empty
      let calculatedPrice = formData.price;
      if (!calculatedPrice && formData.ticketTiers.length > 0) {
        calculatedPrice = calculatePriceRange(formData.ticketTiers, formData.currency);
      }

      const eventData = {
        title: formData.title || 'Untitled Draft',
        description: formData.description,
        date: formData.date,
        time: formData.time,
        location: formData.location,
        category: formData.category,
        subcategory: formData.subcategory,
        image_url: formData.coverImage || '',
        price_range: calculatedPrice || formData.price,
        organizer_id: user.id,
        status: 'draft' as const,
      };

      if (isEditing && savedEventId) {
        await updateEvent(savedEventId, eventData);
        setCurrentStatus('draft');
        toast.success('Draft updated! 📝');
      } else {
        const newEvent = await createEvent(eventData);
        setSavedEventId(newEvent.id);
        setCurrentStatus('draft');
        toast.success('Draft saved! 📝', {
          description: 'You can continue editing later',
        });
      }
    } catch (error) {
      toast.error('Failed to save draft');
    } finally {
      setIsSubmitting(false);
    }
  };
  */

  const handlePublish = async () => {
    // Basic validation
    if (!formData.title || !formData.date) {
      toast.error('Please fill in all required fields (Title, Date)');
      return;
    }
    
    // Explicitly check category
    if (!formData.category) {
       toast.error('Please select a category');
       return;
    }

    // Calculate final price: use calculated price if tiers exist, otherwise normalize manual price
    let finalPrice = '';
    if (formData.ticketTiers.length > 0) {
      // Always calculate from tiers when tiers exist
      finalPrice = calculatePriceRange(formData.ticketTiers, formData.currency);
      if (!finalPrice) {
        toast.error('Please add prices to your ticket tiers');
        return;
      }
    } else {
      // No tiers - use manual price entry
      finalPrice = normalizeManualPrice(formData.price, formData.currency);
      if (!finalPrice) {
        toast.error('Please set a price or add ticket tiers with prices');
        return;
      }
    }

    // Date validation
    const selectedDate = new Date(formData.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      toast.error('Event date cannot be in the past');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to publish events');
        return;
      }

      const eventData = {
        title: formData.title,
        description: formData.description,
        date: formData.date,
        time: formData.time,
        location: formData.location,
        category: formData.category || 'Entertainment', // Ensure category is never null
        subcategory: formData.subcategory,
        image_url: formData.coverImage || '',
        price_range: finalPrice,
        organizer_id: user.id,
        status: 'published' as const,
        ticket_tiers: formData.ticketTiers,
        streaming: {
          available: formData.streaming.available,
          quality: formData.streaming.quality,
          virtualPrice: formData.streaming.virtualPrice
        }
      };
      

      if (isEditing && savedEventId) {
        // Update existing event
        await updateEvent(savedEventId, eventData);
        setCurrentStatus('published');
        
        toast.success('Event updated successfully! ✏️', {
          description: 'Your changes have been saved',
        });
        
        // Dispatch update event
        window.dispatchEvent(new Event('eventsUpdated'));
        
        if (onBack) onBack();
      } else {
        // Create new event
        const newEvent = await createEvent(eventData);
        setSavedEventId(newEvent.id);
        setCurrentStatus('published');

        toast.success('Event published successfully! 🎉', {
          description: 'Your event is now live on EVENTZ',
        });
        setShowSuccessScreen(true);
        
        // Dispatch update event
        window.dispatchEvent(new Event('eventsUpdated'));
      }
    } catch (error: any) {
      toast.error(`Failed to publish event: ${error.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Preview Screen
  if (showPreview) {
    const previewPriceRange =
      formData.ticketTiers.length > 0
        ? calculatePriceRange(formData.ticketTiers, formData.currency)
        : normalizeManualPrice(formData.price, formData.currency);

    const previewEvent: any = {
      id: savedEventId || 0,
      title: formData.title || 'Untitled Event',
      category: formData.category,
      subcategory: formData.subcategory,
      date: formData.date || 'TBD',
      time: formData.time,
      location: formData.location || 'TBD',
      image_url: formData.coverImage || '',
      price_range: previewPriceRange,
      description: formData.description,
      organizer: userProfile ? {
        full_name: userProfile.full_name || userProfile.username || 'You',
        id: userProfile.id,
        avatar_url: userProfile.avatar_url || ''
      } : {
        full_name: 'You',
        id: 'user',
        avatar_url: ''
      },
      streaming: {
        available: false,
        isLive: false
      }
    };

    return (
      <div className="fixed inset-0 z-50 bg-gray-50 overflow-y-auto animate-in fade-in">
        <div className="sticky top-0 z-10 bg-white px-4 py-4 border-b border-gray-100 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
             <button 
              onClick={() => setShowPreview(false)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-gray-900" />
            </button>
            <h2 className="text-xl font-bold text-gray-900">Event Preview</h2>
          </div>
          <button 
            onClick={handlePublish}
            disabled={isSubmitting}
            className="px-6 py-2 bg-purple-600 text-white rounded-full font-medium hover:bg-purple-700 transition-colors shadow-lg shadow-purple-200"
          >
            {isEditing ? 'Save Changes' : 'Publish Now'}
          </button>
        </div>
        
        <div className="p-4 sm:p-6 max-w-5xl mx-auto">
           <div className="grid md:grid-cols-2 gap-12 items-start">
             <div>
               <h3 className="text-gray-900 font-semibold mb-4 flex items-center gap-2">
                 <Eye className="w-5 h-5 text-purple-600" />
                 Card Preview
               </h3>
               <p className="text-gray-600 text-sm mb-6">This is how your event will appear in the main feed and search results.</p>
               <div className="max-w-sm mx-auto md:mx-0 shadow-2xl rounded-2xl transform hover:scale-105 transition-transform duration-300">
                 <EventCard 
                   event={previewEvent} 
                   onClick={() => toast.info('This is a preview of the event card')} 
                 />
               </div>
             </div>

             <div>
                <h3 className="text-gray-900 font-semibold mb-4 flex items-center gap-2">
                 <BarChart3 className="w-5 h-5 text-purple-600" />
                 Details Preview
               </h3>
               <p className="text-gray-600 text-sm mb-6">Quick summary of your event details.</p>
               
               <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
                 <div>
                   <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Title</label>
                   <p className="text-lg font-semibold text-gray-900 mt-1">{formData.title || 'Untitled'}</p>
                 </div>
                 
                 <div>
                   <div>
                     <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</label>
                     <p className="text-gray-900 mt-1 flex items-center gap-2">
                       <Calendar className="w-4 h-4 text-purple-600" />
                       {formData.date || 'TBD'} • {formData.time || '--:--'}
                     </p>
                   </div>

                 </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                   <div>
                     <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Category</label>
                     <p className="text-gray-900 mt-1 flex items-center gap-2">
                       <Tag className="w-4 h-4 text-purple-600" />
                       {formData.category}
                       {formData.subcategory && <span className="text-gray-400">/ {formData.subcategory}</span>}
                     </p>
                   </div>
                   <div>
                     <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Price</label>
                    <p className="text-gray-900 mt-1">
                      <span className="text-purple-600 font-bold text-sm">
                        {formData.price || 'Free'}
                      </span>
                    </p>
                  </div>
                 </div>

                 <div>
                   <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Description</label>
                   <p className="text-gray-600 mt-2 text-sm leading-relaxed whitespace-pre-wrap">
                     {formData.description || 'No description provided.'}
                   </p>
                 </div>
               </div>
             </div>
           </div>
        </div>
      </div>
    );
  }

  // Success Screen
  if (showSuccessScreen) {
    return (
      <div className="bg-gradient-to-br from-purple-50 via-white to-pink-50 min-h-screen flex items-center justify-center p-6">
        <div className="max-w-2xl w-full">
          {/* Success Animation */}
          <div className="text-center mb-8">
            <div className="relative inline-block mb-6">
              <div className="w-32 h-32 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center shadow-2xl animate-pulse">
                <CheckCircle className="w-16 h-16 text-white" />
              </div>
              <Sparkles className="w-8 h-8 text-yellow-400 absolute -top-2 -right-2 animate-bounce" />
              <Sparkles className="w-6 h-6 text-pink-400 absolute -bottom-1 -left-1 animate-pulse" />
            </div>
            <h1 className="text-gray-900 text-4xl mb-3">Event Published! 🎉</h1>
            <p className="text-gray-600 text-lg">Your event is now live on EVENTZ</p>
          </div>

          {/* Event Summary Card */}
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden mb-6">
            {/* Event Preview */}
            <div className="relative h-48 bg-gradient-to-br from-purple-600 to-pink-600">
              {formData.coverImage ? (
                <img src={formData.coverImage} alt={formData.title} className="w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Calendar className="w-16 h-16 text-white/40" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
              <div className="absolute bottom-4 left-4 right-4">
                <h2 className="text-white text-2xl mb-1">{formData.title || 'Untitled Event'}</h2>
                <div className="flex items-center gap-4 text-white/90 text-sm">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>{formData.date || 'TBD'}</span>
                  </div>

                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-px bg-gray-200 border-y border-gray-200">
              <div className="bg-white p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Users className="w-5 h-5 text-purple-600" />
                  <p className="text-gray-900 text-xl">{analytics?.interested?.total || 0}</p>
                </div>
                <p className="text-gray-600 text-xs">Interested</p>
              </div>
              <div className="bg-white p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Eye className="w-5 h-5 text-cyan-600" />
                  <p className="text-gray-900 text-xl">{analytics?.views?.total || 0}</p>
                </div>
                <p className="text-gray-600 text-xs">Views</p>
              </div>
              <div className="bg-white p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Share2 className="w-5 h-5 text-pink-600" />
                  <p className="text-gray-900 text-xl">{analytics?.shares?.total || 0}</p>
                </div>
                <p className="text-gray-600 text-xs">Shares</p>
              </div>
            </div>

            {/* Tips */}
            <div className="p-6 bg-gradient-to-br from-purple-50 to-pink-50">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-gray-900 mb-2">Boost Your Event</h3>
                  <ul className="text-gray-600 text-sm space-y-1">
                    <li>• Share on social media to reach more people</li>
                    <li>• Add engaging photos and videos</li>
                    <li>• Enable live streaming for virtual attendance</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={async () => {
                const shared = await shareUtil({
                  title: formData.title,
                  text: `${formData.date}\nPrice: ${formData.price}`,
                  url: window.location.href,
                });
                
                // If native share not available, show custom modal
                if (!shared) {
                  setShowShareModal(true);
                }
              }}
              className="flex items-center justify-center gap-2 px-6 py-4 bg-white border-2 border-purple-600 text-purple-600 rounded-xl hover:bg-purple-50 transition-all"
            >
              <Share2 className="w-5 h-5" />
              Share Event
            </button>
            <button
              onClick={() => {
                if (onBack) onBack();
              }}
              className="flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all"
            >
              <BarChart3 className="w-5 h-5" />
              View Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-white sticky top-0 z-50 border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onBack}
              className="h-10 w-10 inline-flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5 text-gray-900" />
            </button>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                {isEditing ? 'Edit Event' : 'Create Event'}
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 truncate">
                {isEditing ? 'Update details and save changes' : 'Create a new event and publish when ready'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPreview(true)}
              className="h-10 w-10 inline-flex items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
              aria-label="Preview"
            >
              <Eye className="w-5 h-5" />
            </button>
            <button
              onClick={handlePublish}
              disabled={isSubmitting}
              className="h-10 px-4 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors inline-flex items-center gap-2 disabled:opacity-70"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : isAutoSaving ? (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span className="text-xs">Saving...</span>
                </div>
              ) : (
                <Save className="w-4 h-4" />
              )}
              {isEditing ? 'Save' : 'Publish'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 sm:p-6">
        {/* Category Selection - Visual Cards */}
        <div className="mb-8">
          <label className="block text-gray-900 mb-4">Select Event Category</label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isSelected = formData.category === cat.name;
              return (
                <button
                  key={cat.name}
                  onClick={() => handleCategoryChange(cat.name)}
                  className={`relative p-4 rounded-xl border-2 transition-all ${
                    isSelected
                      ? 'border-purple-600 bg-purple-50 shadow-lg scale-105'
                      : 'border-gray-200 bg-white hover:border-purple-300 hover:shadow-md'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div
                    className={`w-12 h-12 ${isSelected ? 'bg-gray-900' : 'bg-gray-100'} rounded-xl flex items-center justify-center mb-3 mx-auto`}
                  >
                    <Icon className={`w-6 h-6 ${isSelected ? 'text-white' : 'text-gray-900'}`} />
                  </div>
                  <p className={`text-sm text-center ${isSelected ? 'text-purple-700' : 'text-gray-700'}`}>
                    {cat.name}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Subcategory Selection */}
        <div className="mb-8">
          <label className="block text-gray-900 mb-4">Select Event Subcategory</label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {subcategoriesMap[formData.category]?.map((subcat) => {
              const isSelected = formData.subcategory === subcat;
              return (
                <button
                  key={subcat}
                  onClick={() => handleInputChange('subcategory', subcat)}
                  className={`relative p-4 rounded-xl border-2 transition-all ${
                    isSelected
                      ? 'border-purple-600 bg-purple-50 shadow-lg scale-105'
                      : 'border-gray-200 bg-white hover:border-purple-300 hover:shadow-md'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div
                    className={`w-12 h-12 ${isSelected ? 'bg-gray-900' : 'bg-gray-100'} rounded-xl flex items-center justify-center mb-3 mx-auto`}
                  >
                    <Tag className={`w-6 h-6 ${isSelected ? 'text-white' : 'text-gray-900'}`} />
                  </div>
                  <p className={`text-sm text-center ${isSelected ? 'text-purple-700' : 'text-gray-700'}`}>
                    {subcat}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Cover Image Upload */}
        <div className="mb-6">
          <label className="block text-gray-900 mb-3">Cover Image</label>
          <div className="relative w-full h-64 border-2 border-dashed border-gray-300 rounded-xl hover:border-purple-400 transition-colors cursor-pointer group overflow-hidden">
            {formData.coverImage ? (
              <>
                <ImageWithFallback
                  src={formData.coverImage}
                  alt="Cover"
                  className="w-full h-full object-cover"
                />
                {/* Change Image Button */}
                <button
                  onClick={() => handleInputChange('coverImage', '')}
                  className="absolute top-4 right-4 w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center hover:bg-purple-700 transition-all shadow-lg opacity-0 group-hover:opacity-100"
                >
                  <Upload className="w-6 h-6 text-white" />
                </button>
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all"></div>
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 group-hover:bg-purple-50 transition-colors">
                <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mb-4">
                  <Upload className="w-8 h-8 text-purple-600" />
                </div>
                <p className="text-gray-700">Click to upload cover image</p>
                <p className="text-gray-500 text-sm">JPG, PNG up to 10MB</p>
              </div>
            )}
            <input
              type="file"
              id="cover-image-input"
              accept="image/*"
              onChange={handleImageUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
        </div>

        {/* Title */}
        <div className="mb-6">
          <label className="block text-gray-900 mb-3">Event Title</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            placeholder="e.g., Summer Music Festival 2025"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
          />
        </div>

        {/* Date & Time */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-gray-900 mb-3">Date</label>
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="date"
                value={formData.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
              />
            </div>
          </div>
          <div>
            <label className="block text-gray-900 mb-3">Time</label>
            <input
              type="time"
              value={formData.time}
              onChange={(e) => handleInputChange('time', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
            />
          </div>
        </div>

        {/* Location */}
        <div className="mb-6">
          <label className="block text-gray-900 mb-3">Location</label>
          <div className="relative">
            <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={formData.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
              placeholder="e.g., Mlimani City Hall, Dar es Salaam"
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
            />
          </div>
        </div>

        {/* Ticket Strategy & Price */}
        <div className="mb-6">
          <label className="block text-gray-900 mb-3">Ticket Pricing</label>

          {/* Currency Selection */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-500 mb-1">Currency</label>
            <select
              value={formData.currency}
              onChange={(e) => handleCurrencyChange(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all bg-white appearance-none"
            >
              {currencies.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} - {c.name} ({c.symbol})
                </option>
              ))}
            </select>
          </div>
          
          {/* Tiers List */}
          {formData.ticketTiers.length > 0 && (
            <div className="space-y-4 mb-4">
              {formData.ticketTiers.map((tier, index) => (
                <div key={index} className="bg-gray-50 p-4 rounded-xl border border-gray-200 relative group animate-in fade-in slide-in-from-top-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Ticket Name</label>
                      <input
                        type="text"
                        value={tier.name}
                        onChange={(e) => handleUpdateTier(index, 'name', e.target.value)}
                        placeholder="e.g. VIP, Regular"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Price ({currencies.find(c => c.code === formData.currency)?.symbol || formData.currency})</label>
                      <input
                        type="number"
                        value={tier.priceNumeric === undefined || isNaN(tier.priceNumeric) ? '' : tier.priceNumeric}
                        onChange={(e) => handleUpdateTier(index, 'priceNumeric', parseFloat(e.target.value))}
                        placeholder="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Quantity Available</label>
                      <input
                        type="number"
                        value={tier.available}
                        onChange={(e) => handleUpdateTier(index, 'available', parseInt(e.target.value))}
                        placeholder="100"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Features</label>
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-2 min-h-[24px]">
                          {tier.features.map((feature, fIdx) => (
                            <span key={fIdx} className="bg-purple-50 text-purple-700 border border-purple-100 px-2 py-1 rounded-md text-xs flex items-center gap-1">
                              {feature}
                              <button 
                                onClick={() => {
                                  const newFeatures = [...tier.features];
                                  newFeatures.splice(fIdx, 1);
                                  handleUpdateTier(index, 'features', newFeatures);
                                }}
                                className="hover:text-red-500 transition-colors"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Add features (comma separated)"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-purple-500"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                const val = e.currentTarget.value;
                                const newFeatures = val.split(',').map(s => s.trim()).filter(s => s.length > 0);
                                if (newFeatures.length > 0) {
                                  handleUpdateTier(index, 'features', [...tier.features, ...newFeatures]);
                                  e.currentTarget.value = '';
                                }
                              }
                            }}
                          />
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                              const val = input.value;
                              const newFeatures = val.split(',').map(s => s.trim()).filter(s => s.length > 0);
                              if (newFeatures.length > 0) {
                                handleUpdateTier(index, 'features', [...tier.features, ...newFeatures]);
                                input.value = '';
                              }
                            }}
                            className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-purple-100 hover:text-purple-600 transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => handleRemoveTier(index)}
                    className="absolute -top-2 -right-2 bg-white text-red-500 p-1 rounded-full shadow-md border border-gray-100 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add Tier Button */}
          <button
            onClick={handleAddTier}
            className="flex items-center gap-2 text-purple-600 font-medium hover:text-purple-700 transition-colors mb-4"
          >
             <Plus className="w-4 h-4" />
             Add Ticket Type
          </button>

          {/* Price Range Display/Input */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Price Range
              {formData.ticketTiers.length > 0 && (
                <span className="ml-2 text-xs font-normal text-gray-500">(Auto-calculated)</span>
              )}
            </label>
            
            {formData.ticketTiers.length > 0 ? (
              // Display mode when tiers exist
              <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl">
                <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <span className="text-purple-600 font-bold text-lg">
                    {currencies.find(c => c.code === formData.currency)?.symbol || formData.currency}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-gray-900">
                      {(() => {
                        // Always recalculate from current tiers to ensure accuracy
                        const calculated = calculatePriceRange(formData.ticketTiers, formData.currency);
                        return calculated || 'Enter prices above';
                      })()}
                    </span>
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                      Auto
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    {(() => {
                      const calculated = calculatePriceRange(formData.ticketTiers, formData.currency);
                      return calculated 
                        ? 'Based on your ticket tiers above' 
                        : 'Add prices to your ticket tiers above';
                    })()}
                  </p>
                </div>
              </div>
            ) : (
              // Input mode when no tiers
              <div className="relative">
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2 flex items-center justify-center w-5 h-5 text-gray-400 font-bold text-sm pointer-events-none">
                  {currencies.find(c => c.code === formData.currency)?.symbol || '$'}
                </div>
                <input
                  type="text"
                  value={formData.price}
                  onChange={(e) => handleInputChange('price', e.target.value)}
                  placeholder="e.g., $45 - $120 or Free"
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all bg-white"
                />
              </div>
            )}
          </div>
        </div>

        {/* Virtual Access / Streaming */}
        <div className="mb-6 bg-purple-50 p-6 rounded-2xl border border-purple-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center">
                <Tv className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-gray-900 font-semibold">Virtual Access</h3>
                <p className="text-gray-600 text-sm">Enable live streaming for this event</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer"
                checked={formData.streaming.available}
                onChange={(e) => {
                  setFormData(prev => ({
                    ...prev,
                    streaming: {
                      ...prev.streaming,
                      available: e.target.checked
                    }
                  }));
                }}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>

          {formData.streaming.available && (
            <div className="animate-in fade-in slide-in-from-top-2">
              <label className="block text-gray-900 mb-3 text-sm font-medium">Virtual Ticket Price ({currencies.find(c => c.code === formData.currency)?.symbol || formData.currency})</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2 flex items-center justify-center w-5 h-5 text-gray-400 font-bold text-sm pointer-events-none">
                  {currencies.find(c => c.code === formData.currency)?.symbol || '$'}
                </div>
                <input
                  type="number"
                  value={formData.streaming.virtualPriceNumeric || ''}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    const currency = currencies.find(c => c.code === formData.currency) || { symbol: formData.currency };
                    setFormData(prev => ({
                      ...prev,
                      streaming: {
                        ...prev.streaming,
                        virtualPriceNumeric: val,
                        virtualPrice: isNaN(val) ? '' : `${currency.symbol} ${val.toLocaleString()}`
                      }
                    }));
                  }}
                  placeholder="0"
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all bg-white"
                />
              </div>
              <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-green-500" />
                Virtual ticket holders will get a unique link to join the stream.
              </p>
            </div>
          )}
        </div>

        {/* Description */}
        <div className="mb-8">
          <label className="block text-gray-900 mb-3">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            placeholder="Tell people what your event is about..."
            rows={6}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all resize-none"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 sticky bottom-20 bg-white py-4 border-t border-gray-200">
          {onBack && (
            <button
              onClick={onBack}
              className="flex-1 flex items-center justify-center gap-1.5 border-2 border-gray-300 text-gray-700 py-3 rounded-xl hover:bg-gray-50 transition-colors min-w-0"
            >
              <ArrowLeft className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm font-medium truncate">Back</span>
            </button>
          )}
          {/* Save Draft button removed until backend support is added */}
          {/* <button
            onClick={handleSaveDraft}
            className="flex-1 flex items-center justify-center gap-1.5 border-2 border-gray-300 text-gray-700 py-3 rounded-xl hover:bg-gray-50 transition-colors min-w-0"
          >
            <Save className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="text-sm font-medium truncate">Save</span>
          </button> */}
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="flex-1 flex items-center justify-center gap-1.5 border-2 border-cyan-500 text-cyan-600 py-3 rounded-xl hover:bg-cyan-50 transition-colors min-w-0"
          >
            <span className="text-sm font-medium truncate">Preview</span>
          </button>
          <button
            onClick={handlePublish}
            className="flex-1 flex items-center justify-center gap-1.5 bg-purple-600 text-white py-3 rounded-xl hover:bg-purple-700 transition-colors font-medium min-w-0"
          >
            <span className="text-sm truncate">{isEditing ? 'Update' : 'Publish'}</span>
          </button>
        </div>
      </div>
      </div>

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        title={formData.title}
        text={`${formData.date} at ${formData.location}\nPrice: ${formData.price}`}
        url={window.location.href}
      />
    </div>
  );
}
