import { useState, useEffect } from 'react';
import { UserAvatar } from './UserAvatar';
import { Bell, Calendar, Ticket, UserPlus, Loader2, Check, CheckCheck } from 'lucide-react';
import { PurchasedTicket } from '../types';
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead, AppNotification, supabase } from '../utils/supabase/api';
import { toast } from 'sonner';

interface NotificationsProps {
  purchasedTickets: PurchasedTicket[];
}

export function Notifications({ purchasedTickets }: NotificationsProps) {
  const [activeFilter, setActiveFilter] = useState<'all' | 'follower' | 'reminder' | 'update'>('all');
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingRead, setMarkingRead] = useState(false);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const data = await getNotifications(user.id);
          setNotifications(data);
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (notification: AppNotification) => {
    if (notification.read) return;

    try {
      // Optimistic update
      setNotifications(prev => prev.map(n => 
        n.id === notification.id ? { ...n, read: true } : n
      ));

      // If it's a DB notification (starts with notif-), update backend
      if (typeof notification.id === 'string' && notification.id.startsWith('notif-')) {
        const dbId = parseInt(notification.id.replace('notif-', ''));
        if (!isNaN(dbId)) {
          await markNotificationAsRead(dbId);
        }
      }
    } catch (error) {
      console.error('Error marking as read:', error);
      toast.error('Failed to mark as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setMarkingRead(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Update backend for supported types
        await markAllNotificationsAsRead(user.id);
        
        // Update local state for all
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        toast.success('All notifications marked as read');
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Failed to mark all as read');
    } finally {
      setMarkingRead(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'reminder':
        return <Calendar className="w-5 h-5 text-cyan-500" />;
      case 'update':
        return <Bell className="w-5 h-5 text-purple-500" />;
      case 'ticket':
        return <Ticket className="w-5 h-5 text-blue-500" />;
      case 'follower':
        return <UserPlus className="w-5 h-5 text-green-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  // Merge purchasedTickets (from props - recent/session) with API notifications
  const mergedNotifications = [...notifications];
  
  // Check if ticket from prop is already in notifications
  purchasedTickets.forEach(ticket => {
    // Check by ID or ticket number to avoid duplicates
    // API tickets have ID `ticket-{db_id}`, prop tickets have `temp-{timestamp}` or db id
    const exists = notifications.some(n => 
      n.ticketData?.ticketNumber === ticket.ticketNumber || 
      (typeof ticket.id === 'number' && n.id === `ticket-${ticket.id}`)
    );
    
    if (!exists) {
       mergedNotifications.unshift({
        id: ticket.id,
        type: 'ticket',
        title: 'Virtual Ticket Purchased ✅',
        message: `Your virtual ticket for ${ticket.eventTitle} has been confirmed!`,
        time: ticket.purchaseDate, // Assuming ISO string
        read: false,
        ticketData: {
          ticketNumber: ticket.ticketNumber,
          barcode: ticket.barcode,
          eventTitle: ticket.eventTitle,
        },
        image: 'https://images.unsplash.com/photo-1543857778-c4a1a3e0b2eb?w=100&q=80', // Default ticket image
      });
    }
  });

  // Combine and sort
  const allNotifications = mergedNotifications.sort((a, b) => {
    const timeA = new Date(a.time).getTime();
    const timeB = new Date(b.time).getTime();
    return timeB - timeA;
  });

  // Filter notifications based on active filter
  const filteredNotifications = allNotifications.filter((notification) => {
    if (activeFilter === 'all') return true;
    return notification.type === activeFilter;
  });

  const unreadCount = allNotifications.filter((n) => !n.read).length;

  // Get filter-specific empty state
  const getEmptyState = () => {
    switch (activeFilter) {
      case 'follower':
        return {
          icon: <UserPlus className="w-16 h-16 text-gray-300 mx-auto mb-4" />,
          title: 'No follower notifications',
          message: 'When someone follows you, you\'ll see it here',
        };
      case 'reminder':
        return {
          icon: <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />,
          title: 'No reminders',
          message: 'Event reminders will appear here',
        };
      case 'update':
        return {
          icon: <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />,
          title: 'No updates',
          message: 'Event updates will appear here',
        };
      default:
        return {
          icon: <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />,
          title: 'No notifications yet',
          message: 'We\'ll notify you when something happens',
        };
    }
  };

  const emptyState = getEmptyState();

  // Get count for each filter
  const getFilterCount = (filter: 'all' | 'follower' | 'reminder' | 'update') => {
    if (filter === 'all') return allNotifications.length;
    return allNotifications.filter((n) => n.type === filter).length;
  };

  return (
    <div className="bg-white min-h-screen">
      <div className="px-6 py-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-gray-900 text-2xl font-bold">Notifications</h1>
            {unreadCount > 0 && (
              <button 
                onClick={handleMarkAllAsRead}
                disabled={markingRead}
                className="flex items-center gap-2 text-sm text-pink-600 hover:text-pink-700 font-medium disabled:opacity-50"
              >
                <CheckCheck className="w-4 h-4" />
                Mark all as read
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <p className="text-gray-600">Stay updated with your events</p>
            {unreadCount > 0 && (
              <span className="px-3 py-1 bg-pink-100 text-pink-600 rounded-full text-xs font-medium">
                {unreadCount} new
              </span>
            )}
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            className={`px-4 py-2 transition-all duration-200 ${
              activeFilter === 'all' 
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30 scale-105' 
                : 'border border-gray-300 text-gray-700 hover:scale-105'
            } rounded-lg`}
            onClick={() => setActiveFilter('all')}
          >
            All ({getFilterCount('all')})
          </button>
          <button
            className={`px-4 py-2 transition-all duration-200 ${
              activeFilter === 'follower' 
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30 scale-105' 
                : 'border border-gray-300 text-gray-700 hover:scale-105'
            } rounded-lg`}
            onClick={() => setActiveFilter('follower')}
          >
            Followers ({getFilterCount('follower')})
          </button>
          <button
            className={`px-4 py-2 transition-all duration-200 ${
              activeFilter === 'reminder' 
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30 scale-105' 
                : 'border border-gray-300 text-gray-700 hover:scale-105'
            } rounded-lg`}
            onClick={() => setActiveFilter('reminder')}
          >
            Reminders ({getFilterCount('reminder')})
          </button>
          <button
            className={`px-4 py-2 transition-all duration-200 ${
              activeFilter === 'update' 
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30 scale-105' 
                : 'border border-gray-300 text-gray-700 hover:scale-105'
            } rounded-lg`}
            onClick={() => setActiveFilter('update')}
          >
            Updates ({getFilterCount('update')})
          </button>
        </div>

        {/* Notifications List */}
        <div className="space-y-3">
          {filteredNotifications.map((notification, index) => (
            <div
              key={notification.id}
              style={{ animationDelay: `${index * 50}ms` }}
              className={`flex gap-4 p-4 rounded-xl border transition-all cursor-pointer animate-fadeIn ${
                notification.read
                  ? 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-md'
                  : 'bg-purple-50 border-purple-200 hover:border-purple-300 hover:shadow-lg'
              }`}
            >
              {/* Image */}
              <div className="flex-shrink-0 w-12 h-12">
                <UserAvatar
                  src={notification.image}
                  name={notification.title}
                  className="w-full h-full"
                />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    {getIcon(notification.type)}
                    <h3 className="text-gray-900 font-medium">{notification.title}</h3>
                  </div>
                  {!notification.read && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkAsRead(notification);
                      }}
                      className="flex items-center gap-1 px-3 py-1 bg-white border border-pink-200 hover:bg-pink-50 hover:border-pink-300 rounded-full text-pink-600 hover:text-pink-700 transition-all shadow-sm text-xs font-medium"
                      title="Mark as read"
                    >
                      <Check className="w-3 h-3" />
                      Mark as read
                    </button>
                  )}
                </div>
                <p className="text-gray-700 mb-1 line-clamp-2 text-sm">{notification.message}</p>
                <p className="text-gray-500 text-xs">{new Date(notification.time).toLocaleDateString()} • {new Date(notification.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                {notification.ticketData && (
                  <div className="mt-3 p-3 bg-gradient-to-br from-purple-50 to-cyan-50 border border-purple-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Ticket className="w-4 h-4 text-purple-600" />
                      <p className="text-purple-600">Ticket Details</p>
                    </div>
                    <div className="space-y-1 text-sm">
                      <p className="text-gray-700"><span className="font-medium">Ticket #:</span> {notification.ticketData.ticketNumber}</p>
                      <p className="text-gray-700"><span className="font-medium">Barcode:</span> {notification.ticketData.barcode}</p>
                      <div className="mt-2 pt-2 border-t border-purple-200">
                        <p className="text-xs text-gray-600">✅ This ticket grants you access to watch the live stream</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Empty State (if no notifications) */}
        {filteredNotifications.length === 0 && (
          <div className="text-center py-16">
            {emptyState.icon}
            <h3 className="text-gray-900 mb-2">{emptyState.title}</h3>
            <p className="text-gray-600">{emptyState.message}</p>
          </div>
        )}
      </div>
    </div>
  );
}