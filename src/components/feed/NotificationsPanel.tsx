import { X, Heart, MessageCircle, UserPlus, Calendar } from 'lucide-react';
import { UserAvatar } from '../UserAvatar';
import { formatTimeAgo } from '../../utils/format';
import { markNotificationsAsRead, Notification } from '../../utils/supabase/api';
import { toast } from 'sonner';

interface NotificationsPanelProps {
  notifications: Notification[];
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
  notificationsLoading: boolean;
  currentUser: any;
  onClose: () => void;
}

export function NotificationsPanel({
  notifications,
  setNotifications,
  notificationsLoading,
  currentUser,
  onClose,
}: NotificationsPanelProps) {
  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-white md:max-w-md md:right-0 md:left-auto md:border-l border-gray-100 shadow-2xl animate-in slide-in-from-right-full duration-300">
      <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-gray-900">Notifications</h2>
          <button
            className="text-xs font-semibold text-purple-600 hover:text-purple-700 bg-purple-50 px-2 py-1 rounded-full transition-colors"
            onClick={async () => {
              setNotifications(notifications.map(n => ({ ...n, read: true })));
              toast.success('All notifications marked as read');
              if (currentUser) {
                try {
                  await markNotificationsAsRead(currentUser.id);
                } catch (error) {
                }
              }
            }}
          >
            Mark all as read
          </button>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        <div className="space-y-1">
          {notificationsLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`flex items-start gap-3 p-3 rounded-xl transition-colors cursor-pointer ${
                  notification.read ? 'bg-white hover:bg-gray-50' : 'bg-purple-50/50 hover:bg-purple-50'
                }`}
              >
                <div className="relative">
                  <UserAvatar
                    src={notification.user.avatar}
                    name={notification.user.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div
                    className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center ${
                      notification.type === 'like' ? 'bg-pink-500' :
                      notification.type === 'comment' ? 'bg-blue-500' :
                      notification.type === 'follow' ? 'bg-purple-500' :
                      'bg-orange-500'
                    }`}
                  >
                    {notification.type === 'like' && <Heart className="w-3 h-3 text-white fill-white" />}
                    {notification.type === 'comment' && <MessageCircle className="w-3 h-3 text-white fill-white" />}
                    {notification.type === 'follow' && <UserPlus className="w-3 h-3 text-white" />}
                    {notification.type === 'event' && <Calendar className="w-3 h-3 text-white" />}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 leading-snug">
                    <span className="font-semibold">{notification.user.name}</span>{' '}
                    <span className="text-gray-600">{notification.content}</span>
                  </p>
                  <span className="text-xs text-gray-400 mt-0.5 block">{formatTimeAgo(notification.time)}</span>
                </div>
                {!notification.read && (
                  <div className="w-2 h-2 bg-purple-600 rounded-full mt-2" />
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
