// Re-export from domain folders (backward compatibility)
// This file maintains existing imports while we gradually migrate to domain-specific imports

export { supabase } from '../client';

// Identity Domain
export {
  onAuthStateChange,
  updateUserEmail,
  deleteAccount,
  signOut,
} from '../../../domains/identity/api/auth';

export type { Profile } from '../../../domains/identity/api/profile';
export {
  getProfile,
  updateProfile,
  checkUsernameUnique,
  becomeOrganizer,
  searchProfiles,
} from '../../../domains/identity/api/profile';

// Events Domain
export type { Event } from '../../../domains/events/api/events';
export {
  getEvents,
  getOrganizerEvents,
  incrementEventView,
  getEventAnalytics,
  getEventById,
  getEventAttendees,
  createEvent,
  updateEvent,
  deleteEvent,
  getLiveStreams,
  getUpcomingStreams,
  updateEventStreamingStatus,
  toggleLikeEvent,
  getEventLikes,
  hasUserLikedEvent,
  sendGift,
  updateLiveViewerCount,
  subscribeToEventStreaming,
  subscribeToStreamPresence,
  subscribeToEventLikes,
  generateStreamKeys,
} from '../../../domains/events/api/events';

export {
  getSavedEvents,
  getSavedPosts,
  toggleSaveEvent,
  toggleReminder,
  subscribeToSavedEvents,
  subscribeToSavedPosts,
} from '../../../domains/events/api/saved';

export { getTrending } from '../../../domains/events/api/search';

// Tickets Domain
export type { Ticket } from '../../../domains/tickets/api/tickets';
export {
  getUserTickets,
  hasActiveVirtualTicket,
  createTicket,
  scanTicket,
} from '../../../domains/tickets/api/tickets';

// Messaging Domain
export type { Conversation, Message } from '../../../domains/messaging/api/conversations';
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
} from '../../../domains/messaging/api/conversations';

// Streaming Domain
export type { StreamMessage } from '../../../domains/streaming/api/streamChat';
export {
  getStreamMessages,
  sendStreamMessage,
  subscribeToStreamMessages,
} from '../../../domains/streaming/api/streamChat';

export type { CloudflareStream } from '../../../domains/streaming/api/streams';
export { getProfileStreamedVideos, getStreamDownloadUrl, deleteStreamRecord } from '../../../domains/streaming/api/streams';

// Payments Domain
export { createTransaction, waitForTransactionCompletion } from '../../../domains/payments/api/transactions';

// Media Domain
export type { UserMedia } from '../../../domains/media/api/userMedia';
export { getUserMedia, incrementUserMediaView } from '../../../domains/media/api/userMedia';

// Notifications Domain
export type { Notification } from '../../../domains/notifications/api/notifications';
export { getNotifications, markNotificationsAsRead } from '../../../domains/notifications/api/notifications';

// Social Domain
export {
  getFollowedUserIds,
  checkIsFollowing,
  toggleFollow,
  getFollowersCount,
  getFollowingCount,
  followUser,
  unfollowUser,
  isFollowing,
  getFollowers,
  getFollowing,
  getMutualFollows,
  subscribeToOnlineUsers,
} from '../../../domains/social/api/follows';

// Moderation Domain
export type { ReportContentType } from '../../../domains/moderation/api/moderation';
export {
  getBlockedUserIds,
  reportContent,
  blockUser,
  unblockUser,
  assertUsersCanInteract,
} from '../../../domains/moderation/api/moderation';

// Feed Domain
export type { ApiPost, PostComment } from '../../../domains/feed/api/posts';
export {
  incrementPostView,
  getPosts,
  getProfilePostsGrid,
  getPostById,
  deletePost,
  createPost,
  updatePostCaption,
  toggleLikePost,
  toggleSavePost,
  getPostComments,
  createPostComment,
  toggleLikeComment,
} from '../../../domains/feed/api/posts';

// Platform
export { getOrganizerStats, getPlatformStats } from './platform';

// Storage (Media Domain)
export { deleteFile, uploadImage } from '../../../domains/media/api/storage';
