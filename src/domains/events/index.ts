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

// Types
export type { Event, EventStreaming, TicketTier, EventHighlight } from './types';

// Constants
export const DOMAIN_NAME = 'events';
