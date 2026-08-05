// Events Domain Index
// Manages: Events, categories, organizers, venues, saving, reminders

// API
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
} from './api/events';

export {
  getSavedEvents,
  getSavedPosts,
  toggleSaveEvent,
  toggleReminder,
  subscribeToSavedEvents,
  subscribeToSavedPosts,
} from './api/saved';

export { getTrending } from './api/search';

// Types
export type { Event } from './api/events';

// Constants
export const DOMAIN_NAME = 'events';
