import { useState, useEffect } from 'react';
import { X, Bell, Check, User, Calendar, MessageCircle, Heart, Star } from 'lucide-react';
import { supabase } from '../utils/supabase/client';
import { getNotifications, markNotificationAsRead, Notification } from '../utils/supabase/api';
import { formatDistanceToNow } from 'date-fns';
import { UserAvatar } from './UserAvatar';
import { toast } from 'sonner';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

export function NotificationsModal({ isOpen, onClose, userId }: NotificationsModalProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && userId) {
      loadNotifications();
    }
  }, [isOpen, userId]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await getNotifications(userId);
      setNotifications(data || []);
    } catch (error) {
      console.error('Error loading notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notification: Notification) => {
    if (notification.read) return;
    
    try {
      // Optimistic update
      setNotifications(notifications.map(n => 
        n.id === notification.id ? { ...n, read: true } : n
      ));
      
      await markNotificationAsRead(notification.id);
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      setNotifications(notifications.map(n => ({ ...n, read: true })));
      // Ideally we'd have a markAllAsRead API, but for now loop or simple update
      // We can implement markAllNotificationsAsRead in api.ts if needed (it is there)
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false);
        
      toast.success('All marked as read');
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'like': return <Heart className="w-4 h-4 text-red-500" />;
      case 'comment': return <MessageCircle className="w-4 h-4 text-blue-500" />;
      case 'follow': return <User className="w-4 h-4 text-purple-500" />;
      case 'event': return <Calendar className="w-4 h-4 text-orange-500" />;
      default: return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center sm:items-center p-4 sm:p-0">
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200 mt-16 sm:mt-0">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#8A2BE2]" />
            <h2 className="text-lg font-bold text-gray-900">Notifications</h2>
            {notifications.filter(n => !n.read).length > 0 && (
              <span className="bg-[#8A2BE2] text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {notifications.filter(n => !n.read).length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {notifications.some(n => !n.read) && (
              <button 
                onClick={handleMarkAllRead}
                className="text-xs font-medium text-gray-500 hover:text-[#8A2BE2] transition-colors"
              >
                Mark all read
              </button>
            )}
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1 p-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <div className="w-8 h-8 border-2 border-[#8A2BE2] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-500">Loading updates...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <Bell className="w-8 h-8 text-gray-300" />
              </div>
              <h3 className="text-gray-900 font-medium mb-1">No notifications yet</h3>
              <p className="text-gray-500 text-sm">When you get likes, comments, or followers, they'll show up here.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {notifications.map((notification) => (
                <div 
                  key={notification.id}
                  onClick={() => handleMarkAsRead(notification)}
                  className={`flex gap-4 p-4 rounded-xl transition-all cursor-pointer ${
                    notification.read ? 'bg-white hover:bg-gray-50' : 'bg-purple-50/50 hover:bg-purple-50'
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <UserAvatar 
                      src={notification.actor?.avatar_url} 
                      name={notification.actor?.full_name || 'User'} 
                      className="w-10 h-10"
                    />
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-sm">
                      {getIcon(notification.type)}
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm text-gray-900 leading-snug">
                        <span className="font-semibold">{notification.actor?.full_name || 'Someone'}</span>
                        {' '}
                        {notification.message}
                      </p>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-[#8A2BE2] rounded-full flex-shrink-0 mt-1.5" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
