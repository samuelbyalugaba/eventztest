import type { CloudflareStream } from '../domains/streaming/api/streams';

/**
 * Extract a UID from any Cloudflare Stream URL (videodelivery.net or cloudflarestream.com).
 */
export function extractStreamUid(url: string): string | null {
  const match = url.match(/(?:videodelivery\.net|cloudflarestream\.com)\/([^/]+)/);
  return match ? match[1] : null;
}

/**
 * Get the streaming JSONB from a CloudflareStream's linked event.
 */
function getEventStreaming(stream: CloudflareStream): Record<string, unknown> | null {
  const streaming = (stream.event as any)?.streaming;
  if (streaming && typeof streaming === 'object') return streaming;
  return null;
}

/**
 * Returns the live input UID for a stream (the RTMP input, NOT the recording).
 */
export function getLiveInputUid(stream: CloudflareStream): string | null {
  if (stream.live_input_uid) return stream.live_input_uid;
  const streaming = getEventStreaming(stream);
  if (streaming?.cf_live_input_uid) return String(streaming.cf_live_input_uid);
  return null;
}

/**
 * Returns a real recording UID, discarding any candidate that matches the live input UID.
 * Checks multiple sources in priority order.
 */
export function getRecordingUid(stream: CloudflareStream): string | null {
  const liveInputUid = getLiveInputUid(stream);
  const candidates: string[] = [];

  // 1. Explicit recording_uid on the event
  const streaming = getEventStreaming(stream);
  if (streaming?.recording_uid) candidates.push(String(streaming.recording_uid));

  // 2. UID extracted from recording_url
  if (streaming?.recording_url) {
    const uid = extractStreamUid(String(streaming.recording_url));
    if (uid) candidates.push(uid);
  }

  // 3. Stream's own uid (when it's a real CF record, not synthetic event-<id>)
  if (stream.uid && !stream.uid.startsWith('event-')) {
    candidates.push(stream.uid);
  }

  // 4. UID extracted from stream.playback_url
  if (stream.playback_url) {
    const uid = extractStreamUid(stream.playback_url);
    if (uid) candidates.push(uid);
  }

  // 5. UID extracted from event's streaming.playback_url
  if (streaming?.playback_url) {
    const uid = extractStreamUid(String(streaming.playback_url));
    if (uid) candidates.push(uid);
  }

  // Return the first candidate that is NOT the live input UID
  for (const uid of candidates) {
    if (uid && uid !== liveInputUid) return uid;
  }

  return null;
}

/**
 * Get the customer subdomain (e.g. "customer-npjmxl0uic7o3g3o.cloudflarestream.com").
 * Stored in streaming.cf_customer_subdomain by cloudflare-stream-create.
 */
export function getCustomerSubdomain(stream: CloudflareStream): string | null {
  const streaming = getEventStreaming(stream);
  if (streaming?.cf_customer_subdomain) return String(streaming.cf_customer_subdomain);

  // Try to extract from playback_url
  const url = stream.playback_url || String(streaming?.playback_url || '');
  if (url) {
    const match = url.match(/(customer-[a-z0-9]+\.cloudflarestream\.com)/i);
    if (match) return match[1];
  }

  return null;
}

/**
 * Build a Cloudflare Stream iframe URL from a recording UID.
 * Uses customer subdomain when available, falls back to iframe.videodelivery.net.
 */
function buildIframeUrl(recordingUid: string, customerSubdomain: string | null): string {
  if (customerSubdomain) {
    return `https://${customerSubdomain}/${recordingUid}/iframe`;
  }
  return `https://iframe.videodelivery.net/${recordingUid}`;
}

/**
 * Returns the iframe URL for replay playback, or null if no valid recording exists.
 */
export function getReplayIframeUrl(stream: CloudflareStream): string | null {
  const recordingUid = getRecordingUid(stream);
  if (!recordingUid) return null;
  const subdomain = getCustomerSubdomain(stream);
  return buildIframeUrl(recordingUid, subdomain);
}

/**
 * Returns true if the stream has a valid recording that can be played back.
 */
export function streamHasReplay(stream: CloudflareStream): boolean {
  if (stream.has_recording === false) return false;
  return getReplayIframeUrl(stream) !== null;
}

/**
 * Returns the thumbnail URL for a stream.
 * Uses Cloudflare's thumbnail endpoint with the recording UID when possible.
 */
export function getReplayThumbnail(stream: CloudflareStream): string {
  if (stream.thumbnail_url) return stream.thumbnail_url;

  const recordingUid = getRecordingUid(stream);
  if (recordingUid) {
    return `https://videodelivery.net/${recordingUid}/thumbnails/thumbnail.jpg`;
  }

  return stream.event?.image_url || '';
}
