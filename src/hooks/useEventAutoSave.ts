import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabase/client';
import { createEvent, updateEvent } from '../utils/supabase/api';
import type { EventForm } from './useEventForm';

interface UseEventAutoSaveParams {
  formData: EventForm;
  buildEventData: (status: 'draft' | 'published', userId: string) => any;
  isSubmitting: boolean;
  showSuccessScreen: boolean;
  initialSavedEventId?: number;
  initialStatus?: string;
}

export function useEventAutoSave({ formData, buildEventData, isSubmitting, showSuccessScreen, initialSavedEventId, initialStatus }: UseEventAutoSaveParams) {
  const [savedEventId, setSavedEventId] = useState<number | undefined>(initialSavedEventId);
  const [currentStatus, setCurrentStatus] = useState<string>(initialStatus || 'draft');
  const [isAutoSaving, setIsAutoSaving] = useState(false);

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
      } catch (error) {
        console.error('Failed to auto-save draft:', error);
      } finally {
        setIsAutoSaving(false);
      }
    };

    const timeoutId = window.setTimeout(autoSave, 3000);
    return () => window.clearTimeout(timeoutId);
  }, [formData, savedEventId, isSubmitting, currentStatus, showSuccessScreen, buildEventData]);

  return {
    savedEventId,
    setSavedEventId,
    currentStatus,
    setCurrentStatus,
    isAutoSaving,
  };
}
