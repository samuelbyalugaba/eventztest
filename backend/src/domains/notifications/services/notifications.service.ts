import { database } from '../../../shared/database';

export interface Notification {
  id: number;
  user_id: string;
  type: string;
  content: string;
  read: boolean;
  created_at: Date;
}

export const notificationsService = {
  async getNotifications(userId: string): Promise<Notification[]> {
    return database('notifications')
      .where('user_id', userId)
      .orderBy('created_at', 'desc')
      .limit(50);
  },
  
  async markAsRead(userId: string): Promise<void> {
    await database('notifications')
      .where('user_id', userId)
      .andWhere('read', false)
      .update({ read: true });
  },
  
  async createNotification(input: {
    user_id: string;
    type: string;
    content: string;
  }): Promise<Notification> {
    const [notification] = await database('notifications')
      .insert({
        ...input,
        read: false,
        created_at: new Date(),
      })
      .returning('*');
    
    return notification;
  },
  
  async sendPushNotification(userId: string, title: string, body: string): Promise<void> {
    // Implementation for web push notification
    // This would use the VAPID keys and web-push library
  },
};
