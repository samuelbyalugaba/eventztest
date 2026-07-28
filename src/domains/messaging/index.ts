// Messaging Domain Index
// Manages: Conversations, messages, presence

// API
export {
  deleteConversation,
  markConversationAsUnread,
  getConversations,
  getMessages,
  sendMessage,
  startConversation,
  deleteMessage,
  markMessagesAsRead,
  subscribeToMessages,
  subscribeToAllMessages,
} from './api/conversations';

// Types
export type { Conversation, Message } from './types';

// Constants
export const DOMAIN_NAME = 'messaging';
