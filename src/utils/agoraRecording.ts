import { supabase } from './supabase/client';

async function invokeRecording(action: 'start' | 'stop', eventId: number | string) {
  try {
    const { data, error } = await supabase.functions.invoke('agora-cloud-recording', {
      body: { action, eventId },
    });
    if (error) {
      console.error(`[agoraRecording] ${action} failed`, error);
      return null;
    }
    return data as Record<string, any> | null;
  } catch (e) {
    console.error(`[agoraRecording] ${action} error`, e);
    return null;
  }
}

/**
 * Fire-and-forget start of Cloud Recording for a webcam stream.
 * Safe to call repeatedly; the edge function is idempotent.
 */
export const startAgoraRecording = (eventId: number | string) => {
  void invokeRecording('start', eventId);
};

/**
 * Stop of Cloud Recording. Safe for OBS streams too — the edge function no-ops
 * when no recording is in flight. Resolves once the edge function has finished
 * registering the replay, so callers can await it before deleting an event.
 */
export const stopAgoraRecording = (eventId: number | string) => {
  return invokeRecording('stop', eventId);
};