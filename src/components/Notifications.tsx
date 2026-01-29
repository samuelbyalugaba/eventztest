import { useState, useEffect } from 'react';
import { UserAvatar } from './UserAvatar';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Bell, Calendar, Ticket, UserPlus, Loader2 } from 'lucide-react';
import { PurchasedTicket } from '../types';
import { useState, useEffect } from 'react';
import { getNotifications, AppNotification, supabase } from '../utils/supabase/api';
import { toast } from 'sonner';

interface NotificationsProps {
  purchasedTickets: PurchasedTicket[];
}

export function Notifications({ purchasedTickets }: NotificationsProps) {
  const [activeFilter, setActiveFilter] = useState<'all' | 'follower' | 'reminder' | 'update'>('all');
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

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
        // Don't toast error here to avoid annoyance if it's just empty or auth issue
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, []);

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
          <h1 className="text-gray-900 mb-2">Notifications</h1>
          <div className="flex items-center justify-between">
            <p className="text-gray-600">Stay updated with your events</p>
            {unreadCount > 0 && (
              <span className="px-3 py-1 bg-pink-500 text-white rounded-full text-sm">
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
              {notification.image && (
                <div className="flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden">
                  {notification.type === 'follower' ? (
                    <UserAvatar
                      src={notification.image}
                      name={notification.title}
                      className="w-full h-full"
                    />
                  ) : (
                    <ImageWithFallback
                      src={notification.image}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              )}

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2 mb-1">
                  {getIcon(notification.type)}
                  <h3 className="text-gray-900 flex-1">{notification.title}</h3>
                  {!notification.read && (
                    <span className="w-2 h-2 bg-pink-500 rounded-full flex-shrink-0 mt-2"></span>
                  )}
                </div>
                <p className="text-gray-700 mb-1 line-clamp-2">{notification.message}</p>
                <p className="text-gray-500 text-sm">{notification.time}</p>
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