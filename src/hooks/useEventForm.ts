import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { toast } from 'sonner';
import { supabase } from '../utils/supabase/client';
import { uploadImage } from '../utils/supabase/api';
import {
  TIER_COLORS,
  DEFAULT_FREE_PERKS,
  DEFAULT_PERKS,
  eventCategories,
  createCurrencies,
  formatMoney,
  calculatePriceRange,
  normalizeDateInput,
  normalizeTimeInput,
  parseMoney,
  createTierClientId,
  getInitialCurrency,
  normalizeIncomingTiers,
  isFreeEvent,
  getExternalTicketingPhone,
  type TicketTier,
} from '../components/create-event/createEventHelpers';

type TicketMode = 'tiers' | 'free';

interface EventSettings {
  liveStream: boolean;
  virtualTickets: boolean;
  externalTicketing: boolean;
  idVerification: boolean;
}

export interface EventForm {
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

export function useEventForm(event?: any) {
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
      price: event?.price_range || '',
      description: event?.description || '',
      coverImage: event?.image_url || null,
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
  const [tierFeatureDrafts, setTierFeatureDrafts] = useState<Record<number, string>>({});
  const [freePerkDraft, setFreePerkDraft] = useState('');

  const revenueTotal = useMemo(
    () => formData.ticketTiers.reduce((sum, tier) => sum + Math.max(0, Number(tier.priceNumeric) || 0) * Math.max(0, Number(tier.available) || 0), 0),
    [formData.ticketTiers],
  );
  const computedPrice = formData.ticketMode === 'free' ? 'Free' : calculatePriceRange(formData.ticketTiers, formData.currency);

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
    } catch (error) {
      console.error('Failed to upload image:', error);
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
        clientId: createTierClientId(),
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
    if (!tier) return;

    const matchedDefaultPerk = DEFAULT_PERKS.find((perk) => perk.toLowerCase() === value.toLowerCase());
    const feature = matchedDefaultPerk || value;
    const alreadyAdded = tier.features.some((item) => item.toLowerCase() === feature.toLowerCase());
    if (alreadyAdded) {
      setTierFeatureDrafts((prev) => ({ ...prev, [index]: '' }));
      return;
    }

    handleUpdateTier(index, 'features', [...tier.features, feature]);
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

  return {
    formData,
    setFormData,
    tierFeatureDrafts,
    setTierFeatureDrafts,
    freePerkDraft,
    setFreePerkDraft,
    revenueTotal,
    computedPrice,
    updateForm,
    handleCurrencyChange,
    handleCategoryChange,
    handleImageUpload,
    handleUpdateTier,
    handleAdjustTierCapacity,
    handleAddTier,
    handleRemoveTier,
    toggleTierFeature,
    addTierFeature,
    toggleFreePerk,
    addFreePerk,
    handleSettingChange,
    validateForPublish,
    serializeTicketTiers,
    buildStreamingPayload,
    buildEventData,
  };
}
