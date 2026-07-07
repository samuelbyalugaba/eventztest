import { useEffect, useState } from 'react';
import { BarChart3, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../utils/supabase/client';
import { createEvent, getEventAnalytics, getProfile, updateEvent } from '../utils/supabase/api';
import { queryClient } from '../queryClient';
import { queryKeys } from '../queryKeys';
import { EventPreview } from './create-event/EventPreview';
import { EventSuccessScreen } from './create-event/EventSuccessScreen';
import { TIER_COLORS, formatMoney } from './create-event/createEventHelpers';
import { useEventForm } from '../hooks/useEventForm';
import { useEventAutoSave } from '../hooks/useEventAutoSave';
import { StickyHeader } from './create-event/StickyHeader';
import { CoverImageSection } from './create-event/CoverImageSection';
import { EventNameField } from './create-event/EventNameField';
import { DateTimeFields } from './create-event/DateTimeFields';
import { LocationField } from './create-event/LocationField';
import { CategorySelector } from './create-event/CategorySelector';
import { TicketModeBar } from './create-event/TicketModeBar';
import { TicketTierCard } from './create-event/TicketTierCard';
import { FreeEntrySection } from './create-event/FreeEntrySection';
import { EventSettingsSection } from './create-event/EventSettingsSection';
import { DescriptionField } from './create-event/DescriptionField';
import { PublishButton } from './create-event/PublishButton';
import type { Event } from '../utils/supabase/api';

interface CreateEventProps {
  onBack?: () => void;
  event?: Event;
}

export function CreateEvent({ onBack, event }: CreateEventProps) {
  const {
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
    buildEventData,
  } = useEventForm(event);

  const [showPreview, setShowPreview] = useState(false);
  const [showSuccessScreen, setShowSuccessScreen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [categoryOpen, setCategoryOpen] = useState(false);

  const {
    savedEventId,
    setSavedEventId,
    currentStatus,
    setCurrentStatus,
    isAutoSaving,
  } = useEventAutoSave({
    formData,
    buildEventData,
    isSubmitting,
    showSuccessScreen,
    initialSavedEventId: event?.id,
    initialStatus: event?.status,
  });

  const isEditing = !!savedEventId;

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
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
      }
    };

    fetchAnalytics();
  }, [showSuccessScreen, savedEventId]);

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
        queryClient.invalidateQueries({ queryKey: queryKeys.events.publicList });
        setCurrentStatus('published');
        toast.success('Event updated successfully', { description: 'Your changes have been saved' });
        window.dispatchEvent(new Event('eventsUpdated'));
        if (onBack) onBack();
      } else {
        const newEvent = await createEvent(eventData as any);
        queryClient.invalidateQueries({ queryKey: queryKeys.events.publicList });
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
      <StickyHeader
        onBack={onBack}
        isEditing={isEditing}
        isAutoSaving={isAutoSaving}
        onPreview={() => setShowPreview(true)}
      />

      <main className="mx-auto max-w-[460px] px-3 py-4">
        <CoverImageSection
          coverImage={formData.coverImage}
          title={formData.title}
          onImageUpload={handleImageUpload}
          onRemoveImage={() => updateForm('coverImage', null)}
        />

        <div className="space-y-5 p-4">
          <EventNameField value={formData.title} onChange={(value) => updateForm('title', value)} />

          <DateTimeFields
            date={formData.date}
            time={formData.time}
            onDateChange={(value) => updateForm('date', value)}
            onTimeChange={(value) => updateForm('time', value)}
          />

          <LocationField value={formData.location} onChange={(value) => updateForm('location', value)} />

          <CategorySelector
            category={formData.category}
            subcategory={formData.subcategory}
            isOpen={categoryOpen}
            onToggle={() => setCategoryOpen((open) => !open)}
            onCategoryChange={handleCategoryChange}
            onSubcategoryChange={(name) => {
              updateForm('subcategory', name);
              setCategoryOpen(false);
            }}
            onClose={() => setCategoryOpen(false)}
          />

          <div className="h-px bg-gray-200" />

          <TicketModeBar
            ticketMode={formData.ticketMode}
            currency={formData.currency}
            onModeChange={(mode) => updateForm('ticketMode', mode)}
            onCurrencyChange={handleCurrencyChange}
          />

          {formData.ticketMode === 'tiers' ? (
            <div className="space-y-3">
              {formData.ticketTiers.length === 0 && (
                <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4 text-center">
                  <p className="text-sm font-semibold text-gray-800">No ticket tiers yet</p>
                  <p className="mt-1 text-xs text-gray-500">Customize tiers, Pricing, and Capacity</p>
                </div>
              )}

              {formData.ticketTiers.map((tier, index) => {
                const tierFeatureDraft = tierFeatureDrafts[index] || '';
                return (
                  <TicketTierCard
                    key={tier.clientId || `ticket-tier-${index}`}
                    tier={tier}
                    index={index}
                    currency={formData.currency}
                    tierFeatureDraft={tierFeatureDraft}
                    onUpdate={handleUpdateTier}
                    onAdjustCapacity={handleAdjustTierCapacity}
                    onRemove={handleRemoveTier}
                    onToggleFeature={toggleTierFeature}
                    onAddFeature={addTierFeature}
                    onFeatureDraftChange={(idx, value) => setTierFeatureDrafts((prev) => ({ ...prev, [idx]: value }))}
                  />
                );
              })}

              <button
                type="button"
                onClick={handleAddTier}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-purple-300 bg-purple-50/50 text-sm font-semibold text-purple-700 hover:bg-purple-50"
              >
                <Plus className="h-4 w-4" />
                Add tier
              </button>

              <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
                <div className="mb-3 flex items-center gap-2 text-2xs font-bold uppercase tracking-[0.12em] text-gray-500">
                  <BarChart3 className="h-4 w-4 text-purple-600" />
                  Live revenue estimate
                </div>
                {formData.ticketTiers.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {formData.ticketTiers.map((tier, index) => {
                      const subtotal = (Number(tier.priceNumeric) || 0) * (Number(tier.available) || 0);
                      return (
                        <div key={tier.clientId ? `revenue-${tier.clientId}` : `revenue-${index}`} className="rounded-xl border border-gray-200 bg-gray-50 p-2 text-center">
                          <p className="truncate text-xs font-medium" style={{ color: tier.color || TIER_COLORS[index % TIER_COLORS.length] }}>
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
            <FreeEntrySection
              expectedGuests={formData.expectedGuests}
              requireRegistration={formData.requireRegistration}
              freePerks={formData.freePerks}
              freePerkDraft={freePerkDraft}
              onExpectedGuestsChange={(value) => updateForm('expectedGuests', value)}
              onRequireRegistrationChange={(value) => updateForm('requireRegistration', value)}
              onTogglePerk={toggleFreePerk}
              onPerkDraftChange={setFreePerkDraft}
              onAddPerk={addFreePerk}
              onPerkDraftKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addFreePerk();
                }
              }}
            />
          )}

          <div className="h-px bg-gray-200" />

          <EventSettingsSection
            settings={formData.settings}
            currency={formData.currency}
            externalTicketingPhone={formData.externalTicketingPhone}
            streaming={formData.streaming}
            onSettingChange={handleSettingChange}
            onExternalTicketingPhoneChange={(value) => updateForm('externalTicketingPhone', value)}
            onVirtualPriceChange={(amount) => {
              setFormData((prev) => ({
                ...prev,
                streaming: {
                  ...prev.streaming,
                  virtualPriceNumeric: amount,
                  virtualPrice: formatMoney(amount, prev.currency),
                },
              }));
            }}
          />

          <DescriptionField value={formData.description} onChange={(value) => updateForm('description', value)} />

          <PublishButton isSubmitting={isSubmitting} isEditing={isEditing} onPublish={handlePublish} />
        </div>
      </main>
    </div>
  );
}
