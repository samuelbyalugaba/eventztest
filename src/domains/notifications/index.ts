// Notifications Domain Index
// Manages: In-app notifications, push notifications

// API
export { getNotifications, markNotificationsAsRead } from './api/notifications';

// Types
export type { Notification } from './api/notifications';

// Constants
export const DOMAIN_NAME = 'notifications';
