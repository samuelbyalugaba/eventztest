import { supabase } from '../../../shared/api/client';
import type { Event } from '../../events/api/events';
import { deleteFile } from '../../media/api/storage';

export type CloudflareStream = {
  id: number;
  user_id: string;
  event_id?: number | null;
  uid: string;
  live_input_uid?: string | null;
  title: string;
  thumbnail_url?: string | null;
  preview_url?: string | null;
  playback_url?: string | null;
  duration?: number | null;
  status?: string | null;
  created_at: string;
  event?: Event | null;
  source?: 'cloudflare' | 'event';
  has_recording?: boolean;
};

function eventToStreamRecord(event: Event, userId: string): CloudflareStream | null {
  const streaming: any = event.streaming || {};
  if (!streaming.available || streaming.isLive) return null;

  const playbackUrl = streaming.playback_url || streaming.recording_url || null;
  const hasCfdLiveInput = Boolean(streaming.cf_live_input_uid);
  const streamTime = streaming.endedAt || streaming.lastRecordedAt || streaming.startedAt;
  const hasPastStreamMetadata = Boolean(
    streamTime || playbackUrl || streaming.replayAvailable || hasCfdLiveInput
  );
  if (!hasPastStreamMetadata) return null;

  const fallbackDate = new Date(`${event.date || ''} ${event.time || ''}`.trim()).getTime();
  const createdAt = new Date(
    new Date(streamTime || 0).getTime() || (Number.isFinite(fallbackDate) ? fallbackDate : Date.now())
  ).toISOString();

  return {
    id: -event.id,
    user_id: userId,
    event_id: event.id,
    uid: streaming.recording_uid || `event-${event.id}`,
    live_input_uid: streaming.cf_live_input_uid || null,
    title: event.title || 'Streamed video',
    thumbnail_url: streaming.replay_thumbnail || event.image_url || null,
    preview_url: null,
    playback_url: playbackUrl,
    duration: null,
    status: 'ended',
    created_at: createdAt,
    event,
    source: 'event',
    // Only advertise a recording when there is actually something playable (or
    // a Cloudflare live stream that may still be processing).
    has_recording: Boolean(playbackUrl || hasCfdLiveInput),
  };
}

export const getProfileStreamedVideos = async (userId: string) => {
  const select = `
      *,
      event:events(id, title, image_url, date, time, location, category, streaming)
    `;

  const { data, error } = await supabase
    .from('cloudflare_streams')
    .select(select)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    if (error.code === '42P01' || /cloudflare_streams/i.test(error.message || '')) {
      return [] as CloudflareStream[];
    }
    throw error;
  }

  const byUser = (data || []) as CloudflareStream[];

  const { data: ownedEvents, error: ownedEventsError } = await supabase
    .from('events')
    .select('id, organizer_id, title, image_url, date, time, location, category, streaming')
    .eq('organizer_id', userId);

  if (ownedEventsError || !ownedEvents?.length) return byUser;

  const eventIds = ownedEvents
    .map((event: any) => event.id)
    .filter((id: unknown): id is number | string => typeof id === 'number' || typeof id === 'string')
    .map(Number);

  let byEvent: CloudflareStream[] = [];
  if (eventIds.length > 0) {
    const { data: eventStreams, error: byEventError } = await supabase
      .from('cloudflare_streams')
      .select(select)
      .in('event_id', eventIds)
      .order('created_at', { ascending: false });

    if (!byEventError) byEvent = (eventStreams || []) as CloudflareStream[];
  }

  const merged = new Map<string, CloudflareStream>();
  for (const stream of [...byUser, ...byEvent]) {
    merged.set(stream.uid || String(stream.id), { ...stream, source: 'cloudflare', has_recording: true });
  }

  for (const event of ownedEvents as any[]) {
    const streamRecord = eventToStreamRecord(event, userId);
    if (!streamRecord) continue;
    const hasCloudflareRecording = [...merged.values()].some((stream) => stream.event_id === event.id);
    if (!hasCloudflareRecording) merged.set(streamRecord.uid, streamRecord);
  }

  return Array.from(merged.values()).sort((a: any, b: any) => {
    const aTime = new Date(a.created_at || 0).getTime();
    const bTime = new Date(b.created_at || 0).getTime();
    return bTime - aTime;
  });
};

/**
 * Returns a direct (non-Cloudflare-embed) playback URL for a stream, or null when
 * the recording is a Cloudflare iframe embed (which can't be downloaded as a file).
 * Agora recordings are MP4/HLS objects in Supabase Storage, so they download fine.
 */
export const getStreamDownloadUrl = (stream: CloudflareStream): string | null => {
  const candidates = [
    stream.playback_url,
    (stream.event as any)?.streaming?.recording_url,
    (stream.event as any)?.streaming?.playback_url,
  ];
  for (const url of candidates) {
    if (typeof url === 'string' && /^https?:\/\//i.test(url) && !/iframe\.videodelivery\.net/i.test(url) && !/\.cloudflarestream\.com\/[^/]+\/iframe$/i.test(url)) {
      return url;
    }
  }
  return null;
};

/**
 * Removes a stream recording for the owner:
 * - deletes the `cloudflare_streams` row (when it's a real DB row),
 * - removes the MP4 object from Supabase Storage when it's an Agora recording,
 * - clears the linked event's recording metadata so the synthetic event-derived
 *   record can't resurface in the hosted list.
 * The event itself is preserved — only the recording is removed.
 */
export const deleteStreamRecord = async (stream: CloudflareStream) => {
  const downloadUrl = getStreamDownloadUrl(stream);
  const isAgoraStorage = Boolean(downloadUrl && /\/storage\/v1\/object\/public\//i.test(downloadUrl));
  if (isAgoraStorage && downloadUrl) {
    try { await deleteFile('recordings', downloadUrl); } catch { /* best-effort */ }
  }

  const eventId = stream.event_id ?? (stream.event as any)?.id;

  if (stream.id > 0) {
    try {
      await supabase.from('cloudflare_streams').delete().eq('id', stream.id);
    } catch { /* best-effort */ }
  }

  if (eventId) {
    try {
      const { data: evt } = await supabase
        .from('events')
        .select('id, streaming')
        .eq('id', eventId)
        .single();
      if (evt) {
        const streaming = (evt.streaming || {}) as Record<string, any>;
        const { recording_url, playback_url, recording_uid, replayAvailable, has_recording, agoraRecording, ...rest } = streaming;
        await supabase
          .from('events')
          .update({
            streaming: {
              ...rest,
              replayAvailable: false,
              has_recording: false,
              recording_uid: null,
              recording_url: null,
              playback_url: null,
            },
          })
          .eq('id', eventId);
      }
    } catch { /* best-effort */ }
  }
};
