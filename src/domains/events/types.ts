// Events Domain Types
// Manages: Events, categories, organizers, venues, saving, reminders

import type { Profile } from '../identity/api/profile';

export interface EventStreaming {
  available: boolean;
  quality: 'HD' | '4K' | 'SD';
  virtualPrice?: string;
  isLive?: boolean;
  liveViewers?: number;
  replayAvailable?: boolean;
  features?: string[];
  playback_url?: string;
  stream_key?: string;
  ingest_url?: string;
  provider?: string;
  startedAt?: string | number;
  endedAt?: string | number;
  lastRecordedAt?: string | number;
  cf_live_input_uid?: string;
  externalTicketing?: {
    enabled: boolean;
    phone?: string;
  };
}

export interface TicketTier {
  name: string;
  price: string;
  priceNumeric: number;
  available: number;
  features: string[];
  color?: string;
}

export interface EventHighlight {
  image?: string;
  video?: string;
  caption: string;
  type: 'performer' | 'special_guest' | 'venue' | 'preview';
  mediaType: 'image' | 'video';
}

export interface Event {
  id: number;
  organizer_id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  city?: string;
  category: string;
  subcategory: string;
  price?: string;
  price_range: string;
  image_url: string;
  attendees?: number;
  views?: number;
  created_at?: string;
  updated_at?: string;
  streaming?: EventStreaming;
  ticket_tiers?: TicketTier[];
  event_highlights?: EventHighlight[];
  organizer?: Profile;
  isSaved?: boolean;
  hasReminder?: boolean;
  status?: 'published' | 'draft' | 'cancelled';
}
