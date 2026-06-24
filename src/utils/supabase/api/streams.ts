import { supabase } from './client';
import type { Event } from './events';

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

  const streamTime = streaming.endedAt || streaming.lastRecordedAt || streaming.startedAt;
  const hasPastStreamMetadata = Boolean(streamTime || streaming.playback_url || streaming.replayAvailable);
  if (!hasPastStreamMetadata) return null;

  const fallbackDate = new Date(`${event.date || ''} ${event.time || ''}`.trim()).getTime();
  const createdAt = new Date(
    new Date(streamTime || 0).getTime() || (Number.isFinite(fallbackDate) ? fallbackDate : Date.now())
  ).toISOString();

  return {
    id: -event.id,
    user_id: userId,
    event_id: event.id,
    uid: `event-${event.id}`,
    live_input_uid: streaming.cf_live_input_uid || null,
    title: event.title || 'Streamed video',
    thumbnail_url: event.image_url || null,
    preview_url: null,
    playback_url: streaming.replayAvailable ? streaming.playback_url || null : null,
    duration: null,
    status: 'ended',
    created_at: createdAt,
    event,
    source: 'event',
    has_recording: Boolean(streaming.replayAvailable && streaming.playback_url),
  };
}

export const getProfileStreamedVideos = async (userId: string) => {
  const select = `
      *,
      event:events(id, title, image_url, date, time, location, category)
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
    .filter((id: unknown): id is number | string => typeof id === 'number' || typeof id === 'string');

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
