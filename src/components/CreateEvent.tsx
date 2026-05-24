import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ComponentType } from 'react';
import {
  ArrowLeft,
  BarChart3,
  Bolt,
  Briefcase,
  Calendar,
  Camera,
  Check,
  CheckCircle,
  ChevronDown,
  Church,
  Clock,
  Crown,
  Dumbbell,
  Eye,
  GraduationCap,
  Info,
  MapPin,
  Mic,
  Minus,
  Music,
  Palette,
  Phone,
  Plus,
  Settings,
  Shirt,
  Sparkles,
  Tag,
  Ticket,
  Trash2,
  Tv,
  Upload,
  Users,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { supabase } from '../utils/supabase/client';
import { currencies, extractCurrencyFromPrice } from '../utils/currencies';
import { createEvent, getEventAnalytics, getProfile, updateEvent, uploadImage } from '../utils/supabase/api';
import { eventsStore } from '../store/eventStore';
import { EventPreview } from './create-event/EventPreview';
import { EventSuccessScreen } from './create-event/EventSuccessScreen';

type IconType = ComponentType<{ className?: string }>;
type TicketMode = 'tiers' | 'free';

interface TicketTier {
  name: string;
  price: string;
  priceNumeric: number;
  available: number;
  features: string[];
  color?: string;
  badge?: string;
  saleEnds?: string;
  registrationRequired?: boolean;
}

interface EventSettings {
  liveStream: boolean;
  virtualTickets: boolean;
  externalTicketing: boolean;
  idVerification: boolean;
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
  ticketMode: TicketMode;
  ticketTiers: TicketTier[];
  currency: string;
  expectedGuests: number;
  requireRegistration: boolean;
  freePerks: string[];
  externalTicketingPhone: string;
  settings: EventSettings;
  streaming: {
    virtualPrice: string;
    virtualPriceNumeric: number;
    quality: 'HD' | '4K' | 'SD';
  };
}

interface CreateEventProps {
  onBack?: () => void;
  event?: any;
}

const TIER_COLORS = ['#7C3AED', '#F59E0B', '#10B981', '#EC4899', '#06B6D4', '#F97316'];
const CREATE_CURRENCY_CODES = ['TZS', 'KES', 'UGX', 'USD', 'GBP', 'EUR', 'ZAR'];
const DEFAULT_FREE_PERKS = ['Free entry', 'Networking'];
const DEFAULT_PERKS = [
  'General entry',
  'Priority entry',
  'Reserved seating',
  'Digital pass',
  'Event programme',
  'Free drink',
  'Meet and greet',
  'Backstage access',
];

const eventCategories: {
  name: string;
  icon: IconType;
  subcategories: { name: string; icon: IconType }[];
}[] = [
  {
    name: 'Entertainment',
    icon: Music,
    subcategories: [
      { name: 'Concerts', icon: Mic },
      { name: 'Club Nights', icon: Sparkles },
      { name: 'Live Performances', icon: Music },
      { name: 'Nightlife', icon: Sparkles },
      { name: 'Themed Parties', icon: Crown },
      { name: 'Comedy Shows', icon: Mic },
    ],
  },
  {
    name: 'Education',
    icon: GraduationCap,
    subcategories: [
      { name: 'Workshops', icon: Settings },
      { name: 'Seminars', icon: GraduationCap },
      { name: 'Webinars', icon: Tv },
      { name: 'Bootcamps', icon: Bolt },
      { name: 'Talks and Panels', icon: Users },
      { name: 'Masterclasses', icon: CheckCircle },
    ],
  },
  {
    name: 'Business & Tech',
    icon: Briefcase,
    subcategories: [
      { name: 'Startup Events', icon: Bolt },
      { name: 'Networking', icon: Users },
      { name: 'Conferences', icon: Briefcase },
      { name: 'Talks and Panels', icon: Users },
      { name: 'Product Launches', icon: Sparkles },
      { name: 'Trade Shows', icon: Settings },
    ],
  },
  {
    name: 'Culture',
    icon: Palette,
    subcategories: [
      { name: 'Festivals', icon: Sparkles },
      { name: 'Arts and Exhibitions', icon: Palette },
      { name: 'Theatre', icon: Users },
      { name: 'Food and Drink', icon: Crown },
      { name: 'Local Traditions', icon: Church },
      { name: 'Film and Cinema', icon: Tv },
    ],
  },
  {
    name: 'Religion',
    icon: Church,
    subcategories: [
      { name: 'Worship and Services', icon: Church },
      { name: 'Youth and Community', icon: Users },
      { name: 'Spiritual Retreats', icon: Sparkles },
      { name: 'Religious Celebrations', icon: CheckCircle },
    ],
  },
  {
    name: 'Sports & Fitness',
    icon: Dumbbell,
    subcategories: [
      { name: 'Fitness and Wellness', icon: Dumbbell },
      { name: 'Tournaments', icon: Crown },
      { name: 'Live Matches', icon: Users },
      { name: 'Marathons and Runs', icon: Dumbbell },
      { name: 'Sports Camps', icon: Settings },
    ],
  },
  {
    name: 'Fashion',
    icon: Shirt,
    subcategories: [
      { name: 'Runway Shows', icon: Sparkles },
      { name: 'Pop-Up Markets', icon: Shirt },
      { name: 'Style and Beauty', icon: Palette },
      { name: 'Brand Launches', icon: Bolt },
      { name: 'Fashion Weeks', icon: Calendar },
    ],
  },
];

const createCurrencies = CREATE_CURRENCY_CODES
  .map((code) => currencies.find((currency) => currency.code === code))
  .filter((currency): currency is (typeof currencies)[number] => Boolean(currency));

const getCurrency = (code: string) => createCurrencies.find((currency) => currency.code === code) || createCurrencies[0];

const getCurrencySymbol = (code: string) => getCurrency(code)?.symbol || code;

const parseMoney = (value: unknown) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  return parseFloat(String(value || '').replace(/[^0-9.]/g, '')) || 0;
};

const formatMoney = (amount: number, currencyCode: string) => {
  const symbol = getCurrencySymbol(currencyCode);
  return amount > 0 ? `${symbol} ${amount.toLocaleString()}` : `${symbol} 0`;
};

const normalizeIncomingTiers = (event: any, currencyCode: string): TicketTier[] => {
  const rawTiers = Array.isArray(event?.ticket_tiers) ? event.ticket_tiers : [];

  if (rawTiers.length > 0) {
    return rawTiers.map((tier: any, index: number) => {
      const priceNumeric = typeof tier.priceNumeric === 'number' ? tier.priceNumeric : parseMoney(tier.price);
      return {
        name: tier.name || (priceNumeric > 0 ? 'Ticket' : 'Free Entry'),
        price: tier.price || (priceNumeric > 0 ? formatMoney(priceNumeric, currencyCode) : 'Free'),
        priceNumeric,
        available: Math.max(0, Number(tier.available ?? tier.quantity ?? 100) || 0),
        features: Array.isArray(tier.features) ? tier.features.filter(Boolean) : [],
        color: tier.color || TIER_COLORS[index % TIER_COLORS.length],
        badge: tier.badge,
        saleEnds: tier.saleEnds,
        registrationRequired: tier.registrationRequired,
      };
    });
  }

  const existingPrice = event?.price_range || event?.price;
  const numeric = parseMoney(existingPrice);
  if (existingPrice && String(existingPrice).toLowerCase() !== 'free' && numeric > 0) {
    return [
      {
        name: 'General Admission',
        price: formatMoney(numeric, currencyCode),
        priceNumeric: numeric,
        available: Number(event?.attendees) || 100,
        features: ['General entry'],
        color: TIER_COLORS[0],
        badge: 'GA',
      },
    ];
  }

  return [];
};

const calculatePriceRange = (tiers: TicketTier[], currencyCode: string): string => {
  const validPrices = tiers
    .map((tier) => Number(tier.priceNumeric))
    .filter((price) => Number.isFinite(price) && price > 0);

  if (validPrices.length === 0) return '';

  const min = Math.min(...validPrices);
  const max = Math.max(...validPrices);
  return min === max ? formatMoney(min, currencyCode) : `${formatMoney(min, currencyCode)} - ${formatMoney(max, currencyCode)}`;
};

const getInitialCurrency = (event: any) => {
  const direct = event?.currency;
    if (typeof direct === 'string' && CREATE_CURRENCY_CODES.includes(direct.trim())) return direct.trim();

  const tierPrice = Array.isArray(event?.ticket_tiers) ? event.ticket_tiers.find((tier: any) => tier?.price)?.price : null;
  if (typeof tierPrice === 'string' && tierPrice.trim()) {
    const detected = extractCurrencyFromPrice(tierPrice);
    return CREATE_CURRENCY_CODES.includes(detected) ? detected : 'TZS';
  }

  const priceRange = event?.price_range || event?.price;
  if (typeof priceRange === 'string' && priceRange.trim()) {
    const detected = extractCurrencyFromPrice(priceRange);
    return CREATE_CURRENCY_CODES.includes(detected) ? detected : 'TZS';
  }

  return 'TZS';
};

const isFreeEvent = (event: any) => {
  const priceRange = String(event?.price_range || event?.price || '').trim().toLowerCase();
  const rawTiers = Array.isArray(event?.ticket_tiers) ? event.ticket_tiers : [];
  return priceRange === 'free' || (rawTiers.length > 0 && rawTiers.every((tier: any) => parseMoney(tier?.priceNumeric ?? tier?.price) === 0));
};

const getExternalTicketingPhone = (streaming: any) => {
  if (typeof streaming?.externalTicketing?.phone === 'string') return streaming.externalTicketing.phone;
  if (typeof streaming?.externalTicketingPhone === 'string') return streaming.externalTicketingPhone;
  return '';
};

const formatDateFieldValue = (value: string) => {
  if (!value) return 'mm/dd/yyyy';

  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return value;

  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return value;

  const monthName = new Intl.DateTimeFormat(undefined, { month: 'short' }).format(date);
  return `${day} ${monthName} ${year}`;
};

const formatTimeFieldValue = (value: string) => {
  if (!value) return '--:--';

  const [hours = '', minutes = ''] = value.split(':');
  if (!hours || !minutes) return value;

  return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
};

export function CreateEvent({ onBack, event }: CreateEventProps) {
  const [formData, setFormData] = useState<EventForm>(() => {
    const initialCurrency = getInitialCurrency(event);
    const incomingTiers = normalizeIncomingTiers(event, initialCurrency);
    const freeMode = isFreeEvent(event);
    const freeTier = incomingTiers.find((tier) => tier.priceNumeric === 0) || incomingTiers[0];
    const streaming: any = event?.streaming || {};
    const streamingFeatures = Array.isArray(streaming.features) ? streaming.features : [];

    return {
      title: event?.title || '',
      category: event?.category || '',
      subcategory: event?.subcategory || '',
      date: event?.date || '',
      time: event?.time || '',
      location: event?.location || '',
      price: event?.price_range || event?.price || '',
      description: event?.description || '',
      coverImage: event?.image_url || event?.coverImage || null,
      ticketMode: freeMode ? 'free' : 'tiers',
      ticketTiers: incomingTiers,
      currency: initialCurrency,
      expectedGuests: Math.max(0, Number(freeTier?.available ?? event?.attendees ?? 0) || 0),
      requireRegistration: typeof freeTier?.registrationRequired === 'boolean' ? freeTier.registrationRequired : true,
      freePerks: freeTier?.features?.length ? freeTier.features : (event && freeMode ? DEFAULT_FREE_PERKS : []),
      externalTicketingPhone: getExternalTicketingPhone(streaming),
      settings: {
        liveStream: streamingFeatures.includes('live_stream') || !!streaming.available,
        virtualTickets: streamingFeatures.includes('virtual_tickets') || !!streaming.virtualPrice,
        externalTicketing: streamingFeatures.includes('external_ticketing') || !!streaming.externalTicketing?.enabled,
        idVerification: streamingFeatures.includes('id_verification'),
      },
      streaming: {
        virtualPrice: streaming.virtualPrice || '',
        virtualPriceNumeric: parseMoney(streaming.virtualPrice),
        quality: streaming.quality || 'HD',
      },
    };
  });

  const [savedEventId, setSavedEventId] = useState<number | undefined>(event?.id);
  const [currentStatus, setCurrentStatus] = useState<string>(event?.status || 'draft');
  const [showPreview, setShowPreview] = useState(false);
  const [showSuccessScreen, setShowSuccessScreen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [tierFeatureDrafts, setTierFeatureDrafts] = useState<Record<number, string>>({});
  const [freePerkDraft, setFreePerkDraft] = useState('');
  const dateInputRef = useRef<HTMLInputElement>(null);
  const timeInputRef = useRef<HTMLInputElement>(null);

  const isEditing = !!savedEventId;
  const selectedCategory = eventCategories.find((category) => category.name === formData.category);
  const SelectedCategoryIcon = selectedCategory?.icon || Tag;
  const revenueTotal = useMemo(
    () => formData.ticketTiers.reduce((sum, tier) => sum + Math.max(0, Number(tier.priceNumeric) || 0) * Math.max(0, Number(tier.available) || 0), 0),
    [formData.ticketTiers],
  );
  const computedPrice = formData.ticketMode === 'free' ? 'Free' : calculatePriceRange(formData.ticketTiers, formData.currency);

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
    if (!showSuccessScreen || !savedEventId) return;

    const fetchAnalytics = async () => {
      try {
        const data = await getEventAnalytics(savedEventId);
        setAnalytics(data);
      } catch {
        /* Analytics are nice to have, not a blocker. */
      }
    };

    fetchAnalytics();
  }, [showSuccessScreen, savedEventId]);

  const updateForm = <K extends keyof EventForm>(field: K, value: EventForm[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const serializeTicketTiers = (data: EventForm) => {
    if (data.ticketMode === 'free') {
      return [
        {
          name: 'Free Entry',
          price: 'Free',
          priceNumeric: 0,
          available: Math.max(1, Number(data.expectedGuests) || 1),
          features: data.freePerks.filter(Boolean),
          color: TIER_COLORS[2],
          registrationRequired: data.requireRegistration,
        },
      ];
    }

    return data.ticketTiers.map((tier, index) => {
      const priceNumeric = Math.max(0, Number(tier.priceNumeric) || 0);
      return {
        name: tier.name.trim() || `Ticket ${index + 1}`,
        price: formatMoney(priceNumeric, data.currency),
        priceNumeric,
        available: Math.max(0, Number(tier.available) || 0),
        features: tier.features.filter(Boolean),
        color: tier.color || TIER_COLORS[index % TIER_COLORS.length],
      };
    });
  };

  const buildStreamingPayload = (data: EventForm) => {
    const features: string[] = [];
    if (data.settings.liveStream) features.push('live_stream');
    if (data.settings.virtualTickets) features.push('virtual_tickets');
    if (data.settings.externalTicketing) features.push('external_ticketing');
    if (data.settings.idVerification) features.push('id_verification');

    const virtualPrice = data.settings.virtualTickets
      ? formatMoney(Math.max(0, Number(data.streaming.virtualPriceNumeric) || 0), data.currency)
      : '';

    return {
      available: data.settings.liveStream || data.settings.virtualTickets,
      quality: data.streaming.quality,
      virtualPrice,
      features,
      externalTicketing: {
        enabled: data.settings.externalTicketing,
        phone: data.settings.externalTicketing ? data.externalTicketingPhone.trim() : '',
      },
    };
  };

  const buildEventData = (status: 'draft' | 'published', userId: string) => {
    const ticketTiers = serializeTicketTiers(formData);
    const priceRange = formData.ticketMode === 'free' ? 'Free' : calculatePriceRange(formData.ticketTiers, formData.currency);

    return {
      title: formData.title.trim(),
      description: formData.description.trim(),
      date: formData.date,
      time: formData.time,
      location: formData.location.trim(),
      category: formData.category,
      subcategory: formData.subcategory,
      image_url: formData.coverImage || '',
      price_range: priceRange,
      organizer_id: userId,
      status,
      attendees: formData.ticketMode === 'free' ? Math.max(0, Number(formData.expectedGuests) || 0) : undefined,
      ticket_tiers: ticketTiers,
      streaming: buildStreamingPayload(formData),
    };
  };

  useEffect(() => {
    const autoSave = async () => {
      if (!formData.title.trim() || !formData.date || !formData.category || isSubmitting || currentStatus === 'published' || showSuccessScreen) return;

      setIsAutoSaving(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const eventData = buildEventData('draft', user.id);
        if (savedEventId) {
          await updateEvent(savedEventId, eventData);
        } else {
          const newEvent = await createEvent(eventData as any);
          setSavedEventId(newEvent.id);
        }
      } catch {
        /* Draft saves should never interrupt event creation. */
      } finally {
        setIsAutoSaving(false);
      }
    };

    const timeoutId = window.setTimeout(autoSave, 3000);
    return () => window.clearTimeout(timeoutId);
  }, [formData, savedEventId, isSubmitting, currentStatus, showSuccessScreen]);

  const handleCurrencyChange = (currencyCode: string) => {
    setFormData((prev) => ({
      ...prev,
      currency: currencyCode,
      ticketTiers: prev.ticketTiers.map((tier) => ({
        ...tier,
        price: formatMoney(tier.priceNumeric, currencyCode),
      })),
      streaming: {
        ...prev.streaming,
        virtualPrice: prev.streaming.virtualPriceNumeric > 0 ? formatMoney(prev.streaming.virtualPriceNumeric, currencyCode) : '',
      },
    }));
  };

  const handleCategoryChange = (categoryName: string) => {
    setFormData((prev) => ({ ...prev, category: categoryName, subcategory: '' }));
  };

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image size should be less than 10MB');
      return;
    }

    const toastId = toast.loading('Uploading cover image...');
    try {
      const publicUrl = await uploadImage(file, 'events');
      updateForm('coverImage', publicUrl);
      toast.success('Cover image uploaded', { id: toastId });
    } catch {
      toast.error('Failed to upload image', { id: toastId });
    } finally {
      e.target.value = '';
    }
  };

  const handleUpdateTier = (index: number, field: keyof TicketTier, value: string | number | string[]) => {
    setFormData((prev) => {
      const ticketTiers = [...prev.ticketTiers];
      const nextTier = { ...ticketTiers[index] };

      if (field === 'priceNumeric') {
        const priceNumeric = Math.max(0, Number(value) || 0);
        nextTier.priceNumeric = priceNumeric;
        nextTier.price = formatMoney(priceNumeric, prev.currency);
      } else if (field === 'available') {
        nextTier.available = Math.max(0, Number(value) || 0);
      } else {
        (nextTier as any)[field] = value;
      }

      ticketTiers[index] = nextTier;
      return { ...prev, ticketTiers, price: calculatePriceRange(ticketTiers, prev.currency) };
    });
  };

  const handleAdjustTierCapacity = (index: number, delta: number) => {
    setFormData((prev) => {
      const ticketTiers = [...prev.ticketTiers];
      const nextTier = { ...ticketTiers[index] };
      nextTier.available = Math.max(0, (Number(nextTier.available) || 0) + delta);
      ticketTiers[index] = nextTier;
      return { ...prev, ticketTiers };
    });
  };

  const handleAddTier = () => {
    setFormData((prev) => {
      const index = prev.ticketTiers.length;
      const newTier: TicketTier = {
        name: '',
        price: formatMoney(0, prev.currency),
        priceNumeric: 0,
        available: 0,
        features: [],
        color: TIER_COLORS[index % TIER_COLORS.length],
      };

      return { ...prev, ticketTiers: [...prev.ticketTiers, newTier] };
    });
  };

  const handleRemoveTier = (index: number) => {
    setFormData((prev) => {
      const ticketTiers = prev.ticketTiers.filter((_, tierIndex) => tierIndex !== index);
      return { ...prev, ticketTiers };
    });
  };

  const toggleTierFeature = (index: number, feature: string) => {
    const tier = formData.ticketTiers[index];
    if (!tier) return;

    const features = tier.features.includes(feature)
      ? tier.features.filter((item) => item !== feature)
      : [...tier.features, feature];
    handleUpdateTier(index, 'features', features);
  };

  const addTierFeature = (index: number) => {
    const value = tierFeatureDrafts[index]?.trim();
    if (!value) return;

    const tier = formData.ticketTiers[index];
    if (!tier || tier.features.includes(value)) return;

    handleUpdateTier(index, 'features', [...tier.features, value]);
    setTierFeatureDrafts((prev) => ({ ...prev, [index]: '' }));
  };

  const toggleFreePerk = (perk: string) => {
    setFormData((prev) => ({
      ...prev,
      freePerks: prev.freePerks.includes(perk)
        ? prev.freePerks.filter((item) => item !== perk)
        : [...prev.freePerks, perk],
    }));
  };

  const addFreePerk = () => {
    const value = freePerkDraft.trim();
    if (!value || formData.freePerks.includes(value)) return;

    setFormData((prev) => ({ ...prev, freePerks: [...prev.freePerks, value] }));
    setFreePerkDraft('');
  };

  const handleSettingChange = (field: keyof EventSettings, value: boolean) => {
    setFormData((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        [field]: value,
      },
    }));
  };

  const validateForPublish = () => {
    if (!formData.title.trim()) {
      toast.error('Please add an event name');
      return false;
    }

    if (!formData.date) {
      toast.error('Please choose an event date');
      return false;
    }

    if (!formData.location.trim()) {
      toast.error('Please add a venue or location');
      return false;
    }

    if (!formData.category) {
      toast.error('Please select a category');
      return false;
    }

    const selectedDate = new Date(formData.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate < today) {
      toast.error('Event date cannot be in the past');
      return false;
    }

    if (formData.ticketMode === 'tiers') {
      const validTiers = formData.ticketTiers.filter((tier) => tier.name.trim() && tier.priceNumeric > 0 && tier.available > 0);
      if (validTiers.length === 0) {
        toast.error('Add at least one ticket tier with price and capacity');
        return false;
      }
    } else if (!formData.expectedGuests || formData.expectedGuests < 1) {
      toast.error('Set an expected guest count for free entry');
      return false;
    }

    if (formData.settings.externalTicketing && !formData.externalTicketingPhone.trim()) {
      toast.error('Add the phone number buyers should contact for ticketing');
      return false;
    }

    return true;
  };

  const handlePublish = async () => {
    if (!validateForPublish()) return;

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to publish events');
        return;
      }

      const eventData = buildEventData('published', user.id);

      if (isEditing && savedEventId) {
        await updateEvent(savedEventId, eventData);
        eventsStore.invalidate();
        setCurrentStatus('published');
        toast.success('Event updated successfully', { description: 'Your changes have been saved' });
        window.dispatchEvent(new Event('eventsUpdated'));
        if (onBack) onBack();
      } else {
        const newEvent = await createEvent(eventData as any);
        eventsStore.invalidate();
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

  if (showPreview) {
    return (
      <EventPreview
        formData={{ ...formData, price: computedPrice }}
        userProfile={userProfile}
        savedEventId={savedEventId}
        isEditing={isEditing}
        isSubmitting={isSubmitting}
        onBack={() => setShowPreview(false)}
        onPublish={handlePublish}
      />
    );
  }

  if (showSuccessScreen) {
    return <EventSuccessScreen formData={{ ...formData, price: computedPrice }} analytics={analytics} onBack={onBack} />;
  }

  return (
    <div className="min-h-screen bg-[#F2F2F7] pb-24 text-[#1C1C1E]">
      <div className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[460px] items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={onBack}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-gray-900 hover:bg-gray-100"
              aria-label="Back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold">{isEditing ? 'Edit Event' : 'Create Event'}</h1>
              <p className="truncate text-xs text-gray-500">{isAutoSaving ? 'Saving draft...' : 'One clean flow from idea to tickets'}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => setShowPreview(true)}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-700 hover:bg-gray-100"
              aria-label="Preview"
            >
              <Eye className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-[460px] px-3 py-4">
        <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
          <div className="relative h-40 bg-gradient-to-br from-purple-600 to-violet-900">
            {formData.coverImage && (
              <>
                <ImageWithFallback src={formData.coverImage} alt={formData.title || 'Event cover'} className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
              </>
            )}
            <label className="absolute bottom-4 left-4 inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/35 bg-white/10 px-3 py-2 text-xs font-medium text-white backdrop-blur hover:bg-white/15">
              {formData.coverImage ? <Upload className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
              {formData.coverImage ? 'Change cover' : 'Add cover image'}
              <input type="file" accept="image/*" onChange={handleImageUpload} className="sr-only" />
            </label>
            {formData.coverImage && (
              <button
                type="button"
                onClick={() => updateForm('coverImage', null)}
                className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur hover:bg-black/55"
                aria-label="Remove cover image"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="space-y-5 p-4">
            <div>
              <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.12em] text-gray-500">Event name</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => updateForm('title', e.target.value)}
                placeholder="e.g. Nairobi Jazz Night"
                className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.12em] text-gray-500">Date</label>
                <label className="relative flex h-11 w-full cursor-pointer items-center rounded-xl border border-gray-200 bg-white pl-10 pr-3 text-sm outline-none transition focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-100">
                  <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <span className={`pointer-events-none min-w-0 truncate leading-none ${formData.date ? 'text-gray-900' : 'text-gray-500'}`}>
                    {formatDateFieldValue(formData.date)}
                  </span>
                  <input
                    ref={dateInputRef}
                    type="date"
                    value={formData.date}
                    onChange={(e) => updateForm('date', e.target.value)}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    aria-label="Event date"
                  />
                </label>
              </div>
              <div>
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.12em] text-gray-500">Time</label>
                <label className="relative flex h-11 w-full cursor-pointer items-center rounded-xl border border-gray-200 bg-white px-3 pr-10 text-sm outline-none transition focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-100">
                  <span className={`pointer-events-none min-w-0 truncate leading-none ${formData.time ? 'text-gray-900' : 'text-gray-500'}`}>
                    {formatTimeFieldValue(formData.time)}
                  </span>
                  <Clock className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                  <input
                    ref={timeInputRef}
                    type="time"
                    value={formData.time}
                    onChange={(e) => updateForm('time', e.target.value)}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    aria-label="Event time"
                  />
                </label>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.12em] text-gray-500">Venue / Location</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => updateForm('location', e.target.value)}
                  placeholder="e.g. Mlimani City Hall, Dar es Salaam"
                  className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-3 text-sm outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.12em] text-gray-500">Category</label>
              <button
                type="button"
                onClick={() => setCategoryOpen((open) => !open)}
                className="flex h-11 w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-4 text-left text-sm outline-none transition hover:border-purple-200"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <SelectedCategoryIcon className="h-4 w-4 shrink-0 text-purple-600" />
                  <span className={`truncate ${formData.category ? 'text-gray-900' : 'text-gray-500'}`}>
                    {formData.category || 'Select a category'}
                    {formData.subcategory ? ` > ${formData.subcategory}` : ''}
                  </span>
                </span>
                <ChevronDown className={`h-4 w-4 shrink-0 text-gray-400 transition ${categoryOpen ? 'rotate-180' : ''}`} />
              </button>

              {categoryOpen && (
                <div className="mt-2 rounded-2xl border border-gray-200 bg-white p-3 shadow-lg shadow-black/5">
                  <div className="grid grid-cols-3 gap-2">
                    {eventCategories.map((category) => {
                      const Icon = category.icon;
                      const active = formData.category === category.name;
                      return (
                        <button
                          key={category.name}
                          type="button"
                          onClick={() => handleCategoryChange(category.name)}
                          className={`min-h-[76px] rounded-xl border p-2 text-center transition ${
                            active ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-purple-200'
                          }`}
                        >
                          <Icon className={`mx-auto mb-2 h-5 w-5 ${active ? 'text-purple-600' : 'text-gray-500'}`} />
                          <span className="block text-[11px] font-medium leading-tight">{category.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedCategory && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedCategory.subcategories.map((subcategory) => {
                  const active = formData.subcategory === subcategory.name;
                  return (
                    <button
                      key={subcategory.name}
                      type="button"
                      onClick={() => {
                        updateForm('subcategory', subcategory.name);
                        setCategoryOpen(false);
                      }}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                        active ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 bg-white text-gray-600 hover:border-purple-200'
                      }`}
                    >
                      {subcategory.name}
                    </button>
                  );
                })}
                </div>
              )}
            </div>

            <div className="h-px bg-gray-200" />

            <div className="flex items-center justify-between gap-3">
              <div className="flex rounded-full border border-gray-200 bg-gray-100 p-1">
                <button
                  type="button"
                  onClick={() => updateForm('ticketMode', 'tiers')}
                  className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition ${
                    formData.ticketMode === 'tiers' ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-500'
                  }`}
                >
                  <Ticket className="h-3.5 w-3.5" />
                  Ticket tiers
                </button>
                <button
                  type="button"
                  onClick={() => updateForm('ticketMode', 'free')}
                  className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition ${
                    formData.ticketMode === 'free' ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-500'
                  }`}
                >
                  <Users className="h-3.5 w-3.5" />
                  Free entry
                </button>
              </div>

              <select
                value={formData.currency}
                onChange={(e) => handleCurrencyChange(e.target.value)}
                className="h-8 max-w-[98px] rounded-full border border-gray-200 bg-gray-100 px-3 text-xs font-semibold text-gray-700 outline-none focus:border-purple-500"
                aria-label="Currency"
              >
                {createCurrencies.map((currency) => (
                  <option key={currency.code} value={currency.code}>
                    {currency.code}
                  </option>
                ))}
              </select>
            </div>

            {formData.ticketMode === 'tiers' ? (
              <div className="space-y-3">
                {formData.ticketTiers.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4 text-center">
                    <p className="text-sm font-semibold text-gray-800">No ticket tiers yet</p>
                    <p className="mt-1 text-xs text-gray-500">Host. Sell Tickets. Go Live</p>
                  </div>
                )}

                {formData.ticketTiers.map((tier, index) => (
                  <div key={`${tier.name}-${index}`} className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
                    <div className="mb-3 flex items-center gap-2">
                      <div className="h-7 w-1 rounded-full" style={{ backgroundColor: tier.color || TIER_COLORS[index % TIER_COLORS.length] }} />
                      <input
                        type="text"
                        value={tier.name}
                        onChange={(e) => handleUpdateTier(index, 'name', e.target.value)}
                        placeholder="Tier name"
                        className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none"
                        aria-label="Ticket tier name"
                      />
                      <span className="rounded-full bg-purple-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-purple-700">
                        {tier.badge || 'TIER'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTier(index)}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100"
                        aria-label={`Remove ${tier.name || 'ticket tier'}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-gray-500">Price ({formData.currency})</label>
                        <input
                          type="number"
                          min="0"
                          value={Number.isNaN(tier.priceNumeric) ? '' : tier.priceNumeric}
                          onChange={(e) => handleUpdateTier(index, 'priceNumeric', e.target.value)}
                          className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm outline-none focus:border-purple-500"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-gray-500">Capacity</label>
                        <div className="flex h-10 items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-2">
                          <button
                            type="button"
                            onClick={() => handleAdjustTierCapacity(index, -10)}
                            className="flex h-7 w-7 items-center justify-center rounded-md bg-white text-gray-600 shadow-sm"
                            aria-label="Decrease capacity"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="min-w-10 text-center text-sm font-semibold">{tier.available}</span>
                          <button
                            type="button"
                            onClick={() => handleAdjustTierCapacity(index, 10)}
                            className="flex h-7 w-7 items-center justify-center rounded-md bg-white text-gray-600 shadow-sm"
                            aria-label="Increase capacity"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {tier.name.toLowerCase().includes('early') && (
                      <div className="mt-3">
                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-gray-500">Sale ends</label>
                        <input
                          type="date"
                          value={tier.saleEnds || ''}
                          onChange={(e) => handleUpdateTier(index, 'saleEnds', e.target.value)}
                          className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm outline-none focus:border-purple-500"
                        />
                      </div>
                    )}

                    <div className="mt-3">
                      <label className="mb-2 block text-[10px] font-bold uppercase tracking-wide text-gray-500">Perks</label>
                      <div className="flex flex-wrap gap-2">
                        {DEFAULT_PERKS.map((feature) => {
                          const active = tier.features.includes(feature);
                          return (
                            <button
                              key={feature}
                              type="button"
                              onClick={() => toggleTierFeature(index, feature)}
                              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1.5 text-[11px] font-medium ${
                                active ? 'border-purple-300 bg-purple-50 text-purple-700' : 'border-gray-200 bg-gray-50 text-gray-600'
                              }`}
                            >
                              {active && <Check className="h-3 w-3" />}
                              {feature}
                            </button>
                          );
                        })}
                      </div>
                      <div className="mt-2 flex gap-2">
                        <input
                          type="text"
                          value={tierFeatureDrafts[index] || ''}
                          onChange={(e) => setTierFeatureDrafts((prev) => ({ ...prev, [index]: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addTierFeature(index);
                            }
                          }}
                          placeholder="Custom perk"
                          className="h-9 min-w-0 flex-1 rounded-lg border border-dashed border-gray-300 bg-white px-3 text-xs outline-none focus:border-purple-400"
                        />
                        <button
                          type="button"
                          onClick={() => addTierFeature(index)}
                          className="flex h-9 w-9 items-center justify-center rounded-lg border border-dashed border-purple-300 text-purple-600"
                          aria-label="Add custom perk"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={handleAddTier}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-purple-300 bg-purple-50/50 text-sm font-semibold text-purple-700 hover:bg-purple-50"
                >
                  <Plus className="h-4 w-4" />
                  Add tier
                </button>

                <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
                  <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-gray-500">
                    <BarChart3 className="h-4 w-4 text-purple-600" />
                    Live revenue estimate
                  </div>
                  {formData.ticketTiers.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {formData.ticketTiers.map((tier, index) => {
                      const subtotal = (Number(tier.priceNumeric) || 0) * (Number(tier.available) || 0);
                      return (
                        <div key={`revenue-${tier.name}-${index}`} className="rounded-xl border border-gray-200 bg-gray-50 p-2 text-center">
                          <p className="truncate text-[11px] font-medium" style={{ color: tier.color || TIER_COLORS[index % TIER_COLORS.length] }}>
                            {tier.name || `Tier ${index + 1}`}
                          </p>
                          <p className="mt-1 text-sm font-semibold">{formData.currency} {subtotal.toLocaleString()}</p>
                        </div>
                      );
                    })}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-center text-xs text-gray-500">
                      Revenue appears after tiers are added.
                    </div>
                  )}
                  <div className="mt-3 flex items-center justify-between border-t border-gray-200 pt-3">
                    <span className="text-xs font-medium text-gray-600">Potential gross</span>
                    <span className="text-xl font-bold text-purple-800">{formData.currency} {revenueTotal.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-4 border-b border-gray-100 pb-3">
                  <div>
                    <p className="text-sm font-semibold">Expected guests</p>
                    <p className="mt-0.5 text-xs text-gray-500">Approximate number attending</p>
                  </div>
                  <input
                    type="number"
                    min="1"
                    value={formData.expectedGuests || ''}
                    onChange={(e) => updateForm('expectedGuests', Math.max(1, Number(e.target.value) || 1))}
                    className="h-10 w-24 rounded-lg border border-gray-200 bg-gray-50 px-3 text-center text-sm outline-none focus:border-purple-500"
                  />
                </div>

                <div className="flex items-center justify-between gap-4 border-b border-gray-100 py-3">
                  <div>
                    <p className="text-sm font-semibold">Require registration</p>
                    <p className="mt-0.5 text-xs text-gray-500">Guests confirm their spot in advance</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateForm('requireRegistration', !formData.requireRegistration)}
                    className={`relative h-6 w-11 rounded-full transition ${formData.requireRegistration ? 'bg-purple-600' : 'bg-gray-300'}`}
                    aria-pressed={formData.requireRegistration}
                    aria-label="Toggle registration requirement"
                  >
                    <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition ${formData.requireRegistration ? 'left-6' : 'left-1'}`} />
                  </button>
                </div>

                <div className="pt-3">
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-wide text-gray-500">What's included</label>
                  <div className="flex flex-wrap gap-2">
                    {['Free entry', 'Refreshments', 'Networking', 'Certificate'].map((perk) => {
                      const active = formData.freePerks.includes(perk);
                      return (
                        <button
                          key={perk}
                          type="button"
                          onClick={() => toggleFreePerk(perk)}
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1.5 text-[11px] font-medium ${
                            active ? 'border-purple-300 bg-purple-50 text-purple-700' : 'border-gray-200 bg-gray-50 text-gray-600'
                          }`}
                        >
                          {active && <Check className="h-3 w-3" />}
                          {perk}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <input
                      type="text"
                      value={freePerkDraft}
                      onChange={(e) => setFreePerkDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addFreePerk();
                        }
                      }}
                      placeholder="Custom inclusion"
                      className="h-9 min-w-0 flex-1 rounded-lg border border-dashed border-gray-300 bg-white px-3 text-xs outline-none focus:border-purple-400"
                    />
                    <button
                      type="button"
                      onClick={addFreePerk}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-dashed border-purple-300 text-purple-600"
                      aria-label="Add custom inclusion"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 flex items-start gap-2 rounded-xl bg-purple-50 p-3 text-xs leading-5 text-purple-900">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-purple-600" />
                  <p>Guests receive a free EVENTZ confirmation. Payment is skipped, and registration can stay optional.</p>
                </div>
              </div>
            )}

            <div className="h-px bg-gray-200" />

            <div>
              <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-gray-500">
                <Settings className="h-4 w-4 text-purple-600" />
                Event settings
              </div>
              <div className="divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-white px-3 shadow-sm">
                {[
                  {
                    key: 'liveStream' as const,
                    label: 'Live stream',
                    sub: 'Broadcast this event on EVENTZ',
                  },
                  {
                    key: 'virtualTickets' as const,
                    label: 'Virtual tickets',
                    sub: 'Sell online access globally',
                  },
                  {
                    key: 'externalTicketing' as const,
                    label: 'Use external ticketing',
                    sub: 'Display price only - buyers will contact you for ticketing',
                  },
                  {
                    key: 'idVerification' as const,
                    label: 'ID verification',
                    sub: 'Require ID at entry',
                  },
                ].map((setting) => (
                  <div key={setting.key} className="flex items-center justify-between gap-4 py-3">
                    <div>
                      <p className="text-sm font-medium">{setting.label}</p>
                      <p className="mt-0.5 text-xs text-gray-500">{setting.sub}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSettingChange(setting.key, !formData.settings[setting.key])}
                      className={`relative h-6 w-11 shrink-0 rounded-full transition ${formData.settings[setting.key] ? 'bg-purple-600' : 'bg-gray-300'}`}
                      aria-pressed={formData.settings[setting.key]}
                      aria-label={`Toggle ${setting.label}`}
                    >
                      <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition ${formData.settings[setting.key] ? 'left-6' : 'left-1'}`} />
                    </button>
                  </div>
                ))}
              </div>

              {formData.settings.virtualTickets && (
                <div className="mt-3 rounded-2xl border border-purple-100 bg-purple-50 p-3">
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-wide text-purple-700">Virtual ticket price ({formData.currency})</label>
                  <input
                    type="number"
                    min="0"
                    value={Number.isNaN(formData.streaming.virtualPriceNumeric) ? '' : formData.streaming.virtualPriceNumeric}
                    onChange={(e) => {
                      const amount = Math.max(0, Number(e.target.value) || 0);
                      setFormData((prev) => ({
                        ...prev,
                        streaming: {
                          ...prev.streaming,
                          virtualPriceNumeric: amount,
                          virtualPrice: formatMoney(amount, prev.currency),
                        },
                      }));
                    }}
                    className="h-10 w-full rounded-xl border border-purple-100 bg-white px-3 text-sm outline-none focus:border-purple-500"
                  />
                </div>
              )}

              {formData.settings.externalTicketing && (
                <div className="mt-3 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-wide text-gray-500">Ticketing contact phone</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="tel"
                      value={formData.externalTicketingPhone}
                      onChange={(e) => updateForm('externalTicketingPhone', e.target.value)}
                      placeholder="+255 7XX XXX XXX"
                      className="h-10 w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-3 text-sm outline-none focus:border-purple-500 focus:bg-white"
                    />
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.12em] text-gray-500">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => updateForm('description', e.target.value)}
                placeholder="Tell guests what to expect..."
                rows={4}
                className="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm leading-6 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
              />
            </div>

            <button
              type="button"
              onClick={handlePublish}
              disabled={isSubmitting}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-purple-600 text-sm font-bold text-white shadow-lg shadow-purple-200 hover:bg-purple-700 disabled:opacity-70"
            >
              {isSubmitting ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <Bolt className="h-4 w-4" />}
              {isEditing ? 'Save event' : 'Publish event'}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
