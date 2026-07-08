import type { Event as ApiEvent } from '../utils/supabase/api';

export function getVirtualPriceNumber(event: ApiEvent): number {
  const priceString = event.streaming?.virtualPrice || '0';
  return parseFloat(String(priceString).replace(/[^0-9.]/g, '')) || 0;
}

export function requiresVirtualAccess(event: ApiEvent): boolean {
  return !!event.streaming?.available && getVirtualPriceNumber(event) > 0;
}

export function hasExternalTicketing(event: ApiEvent): boolean {
  return !!(
    event.streaming?.features?.includes('external_ticketing') ||
    event.streaming?.externalTicketing?.enabled
  );
}

export function getExternalTicketingPhone(event: ApiEvent): string {
  return String(
    event.streaming?.externalTicketing?.phone ||
    (event.streaming as any)?.externalTicketingPhone ||
    event.organizer?.phone ||
    ''
  ).trim();
}

export function getExternalTicketingHref(phone: string): string {
  return phone ? `tel:${phone.replace(/[^\d+]/g, '')}` : '';
}

export function isEventPast(event: ApiEvent): boolean {
  try {
    const dateStr = event.date;
    const timeStr = event.time ? event.time.replace(' ', '') : '23:59';
    return new Date(`${dateStr} ${timeStr}`) < new Date();
  } catch {
    console.warn('Failed to parse event date for isEventPast check', event.date, event.time);
    return false;
  }
}

export function getLocationMapsUrl(location: string): string {
  return location
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`
    : '';
}

export function buildPhotosForViewer(event: ApiEvent, eventPosts: any[]) {
  return [
    ...(event.event_highlights?.filter((h: any) => h.mediaType === 'image').map((highlight: any, index: number) => ({
      id: index,
      url: highlight.image || event.image_url,
      eventName: event.title,
    })) || []),
    ...eventPosts.filter((p: any) => p.image_urls && p.image_urls.length > 0).flatMap((post: any) =>
      post.image_urls.map((url: string, imgIndex: number) => ({
        id: post.id * 1000 + imgIndex,
        url: url,
        likes: post.likes_count || 0,
        eventName: event.title,
        isPost: true,
        postId: post.id,
        isLiked: post.is_liked || false,
      })),
    ),
  ];
}

export function buildVideosForViewer(event: ApiEvent, eventPosts: any[]) {
  return [
    ...(event.event_highlights?.filter((h: any) => h.mediaType === 'video').map((highlight: any, index: number) => ({
      id: index + 500,
      thumbnail: highlight.image || event.image_url,
      videoUrl: highlight.video || '',
      eventName: event.title,
    })) || []),
    ...eventPosts.filter((p: any) => p.video_url).map((post: any, index: number) => ({
      id: 2000 + post.id,
      thumbnail: post.image_urls?.[0] || '',
      views: post.views || 0,
      likes: post.likes_count || 0,
      videoUrl: post.video_url,
      eventName: event.title,
      isPost: true,
      postId: post.id,
      isLiked: post.is_liked || false,
    })),
  ];
}
