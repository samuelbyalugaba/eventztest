export { supabase } from '../client';

export type { ReportContentType } from './moderation';
export {
  getBlockedUserIds,
  reportContent,
  blockUser,
  unblockUser,
  assertUsersCanInteract,
} from './moderation';

export type { Profile } from './profile';
export {
  getProfile,
  updateProfile,
  checkUsernameUnique,
  becomeOrganizer,
  searchProfiles,
} from './profile';

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
} from './follows';

export type { Event } from './events';
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
} from './events';

export type { ApiPost, PostComment } from './posts';
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
} from './posts';

export type { Conversation, Message } from './conversations';
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
} from './conversations';

export type { StreamMessage } from './streamChat';
export {
  getStreamMessages,
  sendStreamMessage,
  subscribeToStreamMessages,
} from './streamChat';

export type { CloudflareStream } from './streams';
export { getProfileStreamedVideos } from './streams';

export type { Ticket } from './tickets';
export {
  getUserTickets,
  hasActiveVirtualTicket,
  createTicket,
  scanTicket,
} from './tickets';

export {
  getSavedEvents,
  getSavedPosts,
  toggleSaveEvent,
  toggleReminder,
  subscribeToSavedEvents,
  subscribeToSavedPosts,
} from './saved';

export { createTransaction, waitForTransactionCompletion } from './transactions';

export type { UserMedia } from './userMedia';
export { getUserMedia, incrementUserMediaView } from './userMedia';

export type { Notification } from './notifications';
export { getNotifications, markNotificationsAsRead } from './notifications';

export { getTrending } from './search';

export { getOrganizerStats, getPlatformStats } from './platform';

export { deleteFile, uploadImage } from './storage';
