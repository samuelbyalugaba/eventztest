import { supabase } from './supabase/client';

async function invokeRecording(
  action: 'start' | 'stop',
  eventId: number | string,
  orientation?: 'portrait' | 'landscape',
) {
  try {
    const { data, error } = await supabase.functions.invoke('agora-cloud-recording', {
      body: { action, eventId, orientation },
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
 * Returns the invocation promise so callers can optionally observe the outcome.
 */
export const startAgoraRecording = (eventId: number | string, orientation?: 'portrait' | 'landscape') => {
  const promise = invokeRecording('start', eventId, orientation);
  // Surface the result for debugging; failures are also stored on the event
  // (`streaming.agoraRecording.error`) by the edge function.
  void promise.then((data) => {
    if (data?.success === true && data?.sid) {
      console.log(`[agoraRecording] started for event ${eventId} (sid ${data.sid})`);
    } else if (data?.error) {
      console.error(`[agoraRecording] start for event ${eventId} returned: ${data.error}`);
    }
  });
  return promise;
};

/**
 * Stop of Cloud Recording. Safe for OBS streams too — the edge function no-ops
 * when no recording is in flight. Resolves once the edge function has finished
 * registering the replay, so callers can await it before deleting an event.
 */
export const stopAgoraRecording = (eventId: number | string) => {
  return invokeRecording('stop', eventId);
};