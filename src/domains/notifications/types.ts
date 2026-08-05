// Notifications Domain Types
// Manages: In-app notifications, push notifications

export interface Notification {
  id: number;
  user_id: string;
  type: string;
  content: string;
  read: boolean;
  created_at: string;
}
