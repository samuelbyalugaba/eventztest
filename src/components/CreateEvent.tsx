import { useState, useEffect } from 'react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Upload, Calendar, MapPin, Tag, Eye, Save, Music, GraduationCap, Church, Briefcase, Dumbbell, Palette, CheckCircle, ArrowLeft, Plus, Trash2, X, Tv } from 'lucide-react';
import { toast } from 'sonner';
import { ShareModal } from './ShareModal';
import { supabase } from '../utils/supabase/client';
import { currencies, extractCurrencyFromPrice } from '../utils/currencies';
import { createEvent, updateEvent, uploadImage, getProfile, getEventAnalytics } from '../utils/supabase/api';
import { EventPreview } from './create-event/EventPreview';
import { EventSuccessScreen } from './create-event/EventSuccessScreen';

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

const eventCategories = [
  { name: 'Entertainment', icon: Music, gradient: 'from-purple-600 to-pink-600' },
  { name: 'Culture', icon: Palette, gradient: 'from-cyan-500 to-blue-600' },
  { name: 'Religion', icon: Church, gradient: 'from-amber-500 to-orange-600' },
  { name: 'Education', icon: GraduationCap, gradient: 'from-green-500 to-emerald-600' },
  { name: 'Business & Tech', icon: Briefcase, gradient: 'from-indigo-600 to-purple-600' },
  { name: 'Sports & Fitness', icon: Dumbbell, gradient: 'from-red-500 to-pink-600' },
];

const subcategoriesMap: Record<string, string[]> = {
  'Entertainment': ['Concerts', 'Live Performances', 'Music Festival', 'Themed Parties', 'Club Nights', 'Bars & Lounges'],
  'Culture': ['Festivals', 'Arts', 'Food & Drink', 'Local Traditions', 'Fashion Events'],
  'Education': ['Workshops', 'Seminars', 'Webinars'],
  'Religion': ['Religious Gatherings', 'Spiritual Events'],
  'Business & Tech': ['Startup Events', 'Networking', 'Tech Talks'],
  'Sports & Fitness': ['Competitions', 'Fitness Classes', 'Sports Events'],
};

export function CreateEvent({ onBack, event }: CreateEventProps) {
  const calculatePriceRange = (tiers: TicketTier[], currencyCode: string): string => {
    if (!tiers || tiers.length === 0) return '';
    const validPrices = tiers
      .map(tier => {
        const price = tier.priceNumeric;
        if (typeof price !== 'number' || isNaN(price) || price <= 0) return null;
        return price;
      })
      .filter((p): p is number => p !== null);
    if (validPrices.length === 0) return '';
    const min = Math.min(...validPrices);
    const max = Math.max(...validPrices);
    const currency = currencies.find(c => c.code === currencyCode);
    const symbol = currency?.symbol || currencyCode;
    return min === max
      ? `${symbol} ${min.toLocaleString()}`
      : `${symbol} ${min.toLocaleString()} - ${symbol} ${max.toLocaleString()}`;
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
        const mn = Math.min(left, right);
        const mx = Math.max(left, right);
        return `${symbol} ${mn.toLocaleString()} - ${symbol} ${mx.toLocaleString()}`;
      }
      return input;
    }
    const numeric = parseFloat(input.replace(/[^0-9.]/g, ''));
    if (!isNaN(numeric) && numeric > 0) return `${symbol} ${numeric.toLocaleString()}`;
    return input;
  };

  const [formData, setFormData] = useState<EventForm>({
    title: event?.title || '',
    category: event?.category || 'Entertainment',
    subcategory: event?.subcategory || '',
    date: event?.date || '',
    time: event?.time || '',
    location: event?.location || '',
    price: (() => {
      if (event?.ticket_tiers && event.ticket_tiers.length > 0) {
        const tiers = event.ticket_tiers.map((t: any) => ({
          name: t.name || '', price: t.price || '',
          priceNumeric: t.priceNumeric ?? (parseFloat(String(t.price || '0').replace(/[^0-9.]/g, '')) || 0),
          available: t.available || 100, features: t.features || []
        }));
        return calculatePriceRange(tiers, initialCurrency) || '';
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
      const newTiers = prev.ticketTiers.map(tier => ({
        ...tier,
        price: (tier.priceNumeric > 0 && !isNaN(tier.priceNumeric))
          ? `${symbol} ${tier.priceNumeric.toLocaleString()}` : `${symbol} 0`
      }));
      const newPriceRange = calculatePriceRange(newTiers, currencyCode);
      return { ...prev, currency: currencyCode, ticketTiers: newTiers, price: prev.ticketTiers.length > 0 ? newPriceRange : prev.price };
    });
  };

  const handleAddTier = () => {
    setFormData(prev => {
      const currency = currencies.find(c => c.code === prev.currency);
      const symbol = currency?.symbol || prev.currency;
      const newTier: TicketTier = { name: '', price: `${symbol} 0`, priceNumeric: 0, available: 100, features: [] };
      const newTiers = [...prev.ticketTiers, newTier];
      return { ...prev, ticketTiers: newTiers, price: calculatePriceRange(newTiers, prev.currency) };
    });
  };

  const handleRemoveTier = (index: number) => {
    setFormData(prev => {
      const newTiers = [...prev.ticketTiers];
      newTiers.splice(index, 1);
      return { ...prev, ticketTiers: newTiers, price: newTiers.length > 0 ? calculatePriceRange(newTiers, prev.currency) : '' };
    });
  };

  const handleUpdateTier = (index: number, field: keyof TicketTier, value: any) => {
    setFormData(prev => {
      const newTiers = [...prev.ticketTiers];
      const updatedTier = { ...newTiers[index], [field]: value };
      if (field === 'priceNumeric') {
        const currency = currencies.find(c => c.code === prev.currency);
        const symbol = currency?.symbol || prev.currency;
        const numericValue = typeof value === 'number' ? value : parseFloat(String(value)) || 0;
        updatedTier.priceNumeric = numericValue;
        updatedTier.price = numericValue > 0 ? `${symbol} ${numericValue.toLocaleString()}` : `${symbol} 0`;
      }
      newTiers[index] = updatedTier;
      return { ...prev, ticketTiers: newTiers, price: calculatePriceRange(newTiers, prev.currency) };
    });
  };

  const [savedEventId, setSavedEventId] = useState<number | undefined>(event?.id);
  const [currentStatus, setCurrentStatus] = useState<string>(event?.status || 'draft');
  const [showPreview, setShowPreview] = useState(false);
  const [showSuccessScreen, setShowSuccessScreen] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const isEditing = !!savedEventId;
  const [userProfile, setUserProfile] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) { const profile = await getProfile(user.id); setUserProfile(profile); }
    };
    fetchProfile();
  }, []);

  useEffect(() => {
    if (showSuccessScreen && savedEventId) {
      const fetchAnalytics = async () => {
        try { const data = await getEventAnalytics(savedEventId); setAnalytics(data); } catch { /* skip */ }
      };
      fetchAnalytics();
    }
  }, [showSuccessScreen, savedEventId]);

  // Auto-save
  useEffect(() => {
    const autoSave = async () => {
      if (!formData.title || isSubmitting || currentStatus === 'published' || showSuccessScreen) return;
      setIsAutoSaving(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const priceRange = formData.ticketTiers.length > 0
          ? calculatePriceRange(formData.ticketTiers, formData.currency)
          : normalizeManualPrice(formData.price, formData.currency);
        const eventData = {
          title: formData.title, description: formData.description, date: formData.date, time: formData.time,
          location: formData.location, category: formData.category || 'Entertainment', subcategory: formData.subcategory,
          image_url: formData.coverImage || '', price_range: priceRange, organizer_id: user.id, status: 'draft' as const,
          ticket_tiers: formData.ticketTiers,
          streaming: { available: formData.streaming.available, quality: formData.streaming.quality, virtualPrice: formData.streaming.virtualPrice }
        };
        if (savedEventId) { await updateEvent(savedEventId, eventData); }
        else { const newEvent = await createEvent(eventData); setSavedEventId(newEvent.id); }
      } catch { /* skip */ } finally { setIsAutoSaving(false); }
    };
    const timeoutId = setTimeout(autoSave, 3000);
    return () => clearTimeout(timeoutId);
  }, [formData, savedEventId, isSubmitting, currentStatus, showSuccessScreen]);

  const handleInputChange = (field: keyof EventForm, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCategoryChange = (categoryName: string) => {
    setFormData((prev) => ({ ...prev, category: categoryName, subcategory: '' }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please upload an image file'); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error('Image size should be less than 10MB'); return; }
    const toastId = toast.loading('Uploading image...');
    try {
      const publicUrl = await uploadImage(file, 'events');
      handleInputChange('coverImage', publicUrl);
      toast.success('Cover image uploaded! 📸', { id: toastId });
    } catch {
      toast.error('Failed to upload image', { id: toastId });
    }
  };

  const handlePublish = async () => {
    if (!formData.title || !formData.date) { toast.error('Please fill in all required fields (Title, Date)'); return; }
    if (!formData.category) { toast.error('Please select a category'); return; }

    let finalPrice = '';
    if (formData.ticketTiers.length > 0) {
      finalPrice = calculatePriceRange(formData.ticketTiers, formData.currency);
      if (!finalPrice) { toast.error('Please add prices to your ticket tiers'); return; }
    } else {
      finalPrice = normalizeManualPrice(formData.price, formData.currency);
      if (!finalPrice) { toast.error('Please set a price or add ticket tiers with prices'); return; }
    }

    const selectedDate = new Date(formData.date);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (selectedDate < today) { toast.error('Event date cannot be in the past'); return; }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error('Please sign in to publish events'); return; }
      const eventData = {
        title: formData.title, description: formData.description, date: formData.date, time: formData.time,
        location: formData.location, category: formData.category || 'Entertainment', subcategory: formData.subcategory,
        image_url: formData.coverImage || '', price_range: finalPrice, organizer_id: user.id, status: 'published' as const,
        ticket_tiers: formData.ticketTiers,
        streaming: { available: formData.streaming.available, quality: formData.streaming.quality, virtualPrice: formData.streaming.virtualPrice }
      };

      if (isEditing && savedEventId) {
        await updateEvent(savedEventId, eventData);
        setCurrentStatus('published');
        toast.success('Event updated successfully! ✏️', { description: 'Your changes have been saved' });
        window.dispatchEvent(new Event('eventsUpdated'));
        if (onBack) onBack();
      } else {
        const newEvent = await createEvent(eventData);
        setSavedEventId(newEvent.id);
        setCurrentStatus('published');
        toast.success('Event published successfully', { description: 'Your event is now live on EVENTZ' });
        setShowSuccessScreen(true);
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
    const previewPriceRange = formData.ticketTiers.length > 0
      ? calculatePriceRange(formData.ticketTiers, formData.currency)
      : normalizeManualPrice(formData.price, formData.currency);
    return (
      <EventPreview
        formData={{ ...formData, price: previewPriceRange }}
        userProfile={userProfile}
        savedEventId={savedEventId}
        isEditing={isEditing}
        isSubmitting={isSubmitting}
        onBack={() => setShowPreview(false)}
        onPublish={handlePublish}
      />
    );
  }

  // Success Screen
  if (showSuccessScreen) {
    return <EventSuccessScreen formData={formData} analytics={analytics} onBack={onBack} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-white sticky top-0 z-50 border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={onBack} className="h-10 w-10 inline-flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors" aria-label="Back">
              <ArrowLeft className="w-5 h-5 text-gray-900" />
            </button>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-semibold text-gray-900 truncate">{isEditing ? 'Edit Event' : 'Create Event'}</h1>
              <p className="text-xs sm:text-sm text-gray-500 truncate">{isEditing ? 'Update details and save changes' : 'Create a new event and publish when ready'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowPreview(true)} className="h-10 w-10 inline-flex items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100 transition-colors" aria-label="Preview">
              <Eye className="w-5 h-5" />
            </button>
            <button onClick={handlePublish} disabled={isSubmitting} className="h-10 px-4 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors inline-flex items-center gap-2 disabled:opacity-70">
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
          {/* Category Selection */}
          <div className="mb-8">
            <label className="block text-gray-900 mb-4">Select Event Category</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {eventCategories.map((cat) => {
                const Icon = cat.icon;
                const isSelected = formData.category === cat.name;
                return (
                  <button key={cat.name} onClick={() => handleCategoryChange(cat.name)} className={`relative p-4 rounded-xl border-2 transition-all ${isSelected ? 'border-purple-600 bg-purple-50 shadow-lg scale-105' : 'border-gray-200 bg-white hover:border-purple-300 hover:shadow-md'}`}>
                    {isSelected && <div className="absolute -top-2 -right-2 w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center"><CheckCircle className="w-4 h-4 text-white" /></div>}
                    <div className={`w-12 h-12 ${isSelected ? 'bg-gray-900' : 'bg-gray-100'} rounded-xl flex items-center justify-center mb-3 mx-auto`}>
                      <Icon className={`w-6 h-6 ${isSelected ? 'text-white' : 'text-gray-900'}`} />
                    </div>
                    <p className={`text-sm text-center ${isSelected ? 'text-purple-700' : 'text-gray-700'}`}>{cat.name}</p>
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
                  <button key={subcat} onClick={() => handleInputChange('subcategory', subcat)} className={`relative p-4 rounded-xl border-2 transition-all ${isSelected ? 'border-purple-600 bg-purple-50 shadow-lg scale-105' : 'border-gray-200 bg-white hover:border-purple-300 hover:shadow-md'}`}>
                    {isSelected && <div className="absolute -top-2 -right-2 w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center"><CheckCircle className="w-4 h-4 text-white" /></div>}
                    <div className={`w-12 h-12 ${isSelected ? 'bg-gray-900' : 'bg-gray-100'} rounded-xl flex items-center justify-center mb-3 mx-auto`}>
                      <Tag className={`w-6 h-6 ${isSelected ? 'text-white' : 'text-gray-900'}`} />
                    </div>
                    <p className={`text-sm text-center ${isSelected ? 'text-purple-700' : 'text-gray-700'}`}>{subcat}</p>
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
                  <ImageWithFallback src={formData.coverImage} alt="Cover" className="w-full h-full object-cover" />
                  <button onClick={() => handleInputChange('coverImage', '')} className="absolute top-4 right-4 w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center hover:bg-purple-700 transition-all shadow-lg opacity-0 group-hover:opacity-100">
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
              <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
            </div>
          </div>

          {/* Title */}
          <div className="mb-6">
            <label className="block text-gray-900 mb-3">Event Title</label>
            <input type="text" value={formData.title} onChange={(e) => handleInputChange('title', e.target.value)} placeholder="e.g., Summer Music Festival 2025" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all" />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-gray-900 mb-3">Date</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input type="date" value={formData.date} onChange={(e) => handleInputChange('date', e.target.value)} className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all" />
              </div>
            </div>
            <div>
              <label className="block text-gray-900 mb-3">Time</label>
              <input type="time" value={formData.time} onChange={(e) => handleInputChange('time', e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all" />
            </div>
          </div>

          {/* Location */}
          <div className="mb-6">
            <label className="block text-gray-900 mb-3">Location</label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input type="text" value={formData.location} onChange={(e) => handleInputChange('location', e.target.value)} placeholder="e.g., Mlimani City Hall, Dar es Salaam" className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all" />
            </div>
          </div>

          {/* Ticket Pricing */}
          <div className="mb-6">
            <label className="block text-gray-900 mb-3">Ticket Pricing</label>
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-500 mb-1">Currency</label>
              <select value={formData.currency} onChange={(e) => handleCurrencyChange(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all bg-white appearance-none">
                {currencies.map((c) => <option key={c.code} value={c.code}>{c.code} - {c.name} ({c.symbol})</option>)}
              </select>
            </div>

            {/* Tiers */}
            {formData.ticketTiers.length > 0 && (
              <div className="space-y-4 mb-4">
                {formData.ticketTiers.map((tier, index) => (
                  <div key={index} className="bg-gray-50 p-4 rounded-xl border border-gray-200 relative group animate-in fade-in slide-in-from-top-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Ticket Name</label>
                        <input type="text" value={tier.name} onChange={(e) => handleUpdateTier(index, 'name', e.target.value)} placeholder="e.g. VIP, Regular" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Price ({currencies.find(c => c.code === formData.currency)?.symbol || formData.currency})</label>
                        <input type="number" value={tier.priceNumeric === undefined || isNaN(tier.priceNumeric) ? '' : tier.priceNumeric} onChange={(e) => handleUpdateTier(index, 'priceNumeric', parseFloat(e.target.value))} placeholder="0" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Quantity Available</label>
                        <input type="number" value={tier.available} onChange={(e) => handleUpdateTier(index, 'available', parseInt(e.target.value))} placeholder="100" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Features</label>
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-2 min-h-[24px]">
                            {tier.features.map((feature, fIdx) => (
                              <span key={fIdx} className="bg-purple-50 text-purple-700 border border-purple-100 px-2 py-1 rounded-md text-xs flex items-center gap-1">
                                {feature}
                                <button onClick={() => { const nf = [...tier.features]; nf.splice(fIdx, 1); handleUpdateTier(index, 'features', nf); }} className="hover:text-red-500 transition-colors"><X className="w-3 h-3" /></button>
                              </span>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <input type="text" placeholder="Add features (comma separated)" className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-purple-500"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const val = e.currentTarget.value;
                                  const nf = val.split(',').map(s => s.trim()).filter(s => s.length > 0);
                                  if (nf.length > 0) { handleUpdateTier(index, 'features', [...tier.features, ...nf]); e.currentTarget.value = ''; }
                                }
                              }}
                            />
                            <button onClick={(e) => {
                              const input = (e.currentTarget as HTMLElement).previousElementSibling as HTMLInputElement;
                              const val = input.value;
                              const nf = val.split(',').map(s => s.trim()).filter(s => s.length > 0);
                              if (nf.length > 0) { handleUpdateTier(index, 'features', [...tier.features, ...nf]); input.value = ''; }
                            }} className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-purple-100 hover:text-purple-600 transition-colors"><Plus className="w-4 h-4" /></button>
                          </div>
                        </div>
                      </div>
                    </div>
                    <button onClick={() => handleRemoveTier(index)} className="absolute -top-2 -right-2 bg-white text-red-500 p-1 rounded-full shadow-md border border-gray-100 hover:bg-red-50 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            )}

            <button onClick={handleAddTier} className="flex items-center gap-2 text-purple-600 font-medium hover:text-purple-700 transition-colors mb-4"><Plus className="w-4 h-4" /> Add Ticket Type</button>

            {/* Price Range Display/Input */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Price Range
                {formData.ticketTiers.length > 0 && <span className="ml-2 text-xs font-normal text-gray-500">(Auto-calculated)</span>}
              </label>
              {formData.ticketTiers.length > 0 ? (
                <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl">
                  <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <span className="text-purple-600 font-bold text-lg">{currencies.find(c => c.code === formData.currency)?.symbol || formData.currency}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-gray-900">{calculatePriceRange(formData.ticketTiers, formData.currency) || 'Enter prices above'}</span>
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">Auto</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">{calculatePriceRange(formData.ticketTiers, formData.currency) ? 'Based on your ticket tiers above' : 'Add prices to your ticket tiers above'}</p>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute left-4 top-1/2 transform -translate-y-1/2 flex items-center justify-center w-5 h-5 text-gray-400 font-bold text-sm pointer-events-none">
                    {currencies.find(c => c.code === formData.currency)?.symbol || '$'}
                  </div>
                  <input type="text" value={formData.price} onChange={(e) => handleInputChange('price', e.target.value)} placeholder="e.g., $45 - $120 or Free" className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all bg-white" />
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
                <input type="checkbox" className="sr-only peer" checked={formData.streaming.available}
                  onChange={(e) => setFormData(prev => ({ ...prev, streaming: { ...prev.streaming, available: e.target.checked } }))} />
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
                  <input type="number" value={formData.streaming.virtualPriceNumeric || ''} onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    const currency = currencies.find(c => c.code === formData.currency) || { symbol: formData.currency };
                    setFormData(prev => ({ ...prev, streaming: { ...prev.streaming, virtualPriceNumeric: val, virtualPrice: isNaN(val) ? '' : `${currency.symbol} ${val.toLocaleString()}` } }));
                  }} placeholder="0" className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all bg-white" />
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
            <textarea value={formData.description} onChange={(e) => handleInputChange('description', e.target.value)} placeholder="Tell people what your event is about..." rows={6} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all resize-none" />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 sticky bottom-20 bg-white py-4 border-t border-gray-200">
            {onBack && (
              <button onClick={onBack} className="flex-1 flex items-center justify-center gap-1.5 border-2 border-gray-300 text-gray-700 py-3 rounded-xl hover:bg-gray-50 transition-colors min-w-0">
                <ArrowLeft className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm font-medium truncate">Back</span>
              </button>
            )}
            <button onClick={() => setShowPreview(!showPreview)} className="flex-1 flex items-center justify-center gap-1.5 border-2 border-cyan-500 text-cyan-600 py-3 rounded-xl hover:bg-cyan-50 transition-colors min-w-0">
              <span className="text-sm font-medium truncate">Preview</span>
            </button>
            <button onClick={handlePublish} className="flex-1 flex items-center justify-center gap-1.5 bg-purple-600 text-white py-3 rounded-xl hover:bg-purple-700 transition-colors font-medium min-w-0">
              <span className="text-sm truncate">{isEditing ? 'Update' : 'Publish'}</span>
            </button>
          </div>
        </div>
      </div>

      <ShareModal isOpen={showShareModal} onClose={() => setShowShareModal(false)} title={formData.title} text={`${formData.date} at ${formData.location}\nPrice: ${formData.price}`} url={window.location.href} />
    </div>
  );
}
