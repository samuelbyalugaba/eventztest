// Messaging Domain Types
// Manages: Conversations, messages, presence

import type { Profile } from '../identity/api/profile';

export interface Conversation {
  id: number;
  participant1_id: string;
  participant2_id: string;
  created_at: string;
  updated_at: string;
  participant1?: Profile;
  participant2?: Profile;
  last_message?: Message;
  unread_count?: number;
}

export interface Message {
  id: number;
  conversation_id: number;
  sender_id: string;
  content: string;
  image_url?: string;
  is_read: boolean;
  created_at: string;
  sender?: Profile;
}
