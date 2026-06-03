import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  BellOff,
  Calendar,
  CheckCheck,
  ChevronRight,
  Heart,
  Inbox,
  MessageCircle,
  RefreshCw,
  ShieldAlert,
  UserPlus,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { UserAvatar } from '../UserAvatar';
import { formatTimeAgo } from '../../utils/format';
import { markNotificationsAsRead, Notification } from '../../utils/supabase/api';
import {
  getPushPermission,
  getPushSubscriptionState,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  type PushSubscriptionState,
} from '../../utils/pushNotifications';

type NotificationTab = 'all' | 'unread' | 'social' | 'events';

interface NotificationsPanelProps {
  notifications: Notification[];
  setNotifications: Dispatch<SetStateAction<Notification[]>>;
  notificationsLoading: boolean;
  currentUser: any;
  onClose: () => void;
  onRefreshNotifications?: () => Promise<void> | void;
}

const tabLabel: Record<NotificationTab, string> = {
  all: 'All',
  unread: 'Unread',
  social: 'Social',
  events: 'Events',
};

const getNotificationIcon = (type: Notification['type']) => {
  if (type === 'like') return Heart;
  if (type === 'comment') return MessageCircle;
  if (type === 'follow') return UserPlus;
  return Calendar;
};

const getNotificationAccent = (type: Notification['type']) => {
  if (type === 'like') return 'bg-pink-500 text-white';
  if (type === 'comment') return 'bg-blue-500 text-white';
  if (type === 'follow') return 'bg-purple-600 text-white';
  return 'bg-amber-500 text-white';
};

const getNotificationTarget = (notification: Notification) => {
  if ((notification.type === 'like' || notification.type === 'comment') && notification.postId) {
    return `/post/${notification.postId}`;
  }

  if (notification.type === 'event' && notification.eventId) {
    return `/event/${notification.eventId}`;
  }

  if (notification.user.id) {
    return `/profile/${notification.user.id}`;
  }

  return '';
};

export function NotificationsPanel({
  notifications,
  setNotifications,
  notificationsLoading,
  currentUser,
  onClose,
  onRefreshNotifications,
}: NotificationsPanelProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<NotificationTab>('all');
  const [pushState, setPushState] = useState<PushSubscriptionState | null>(null);
  const [isCheckingPush, setIsCheckingPush] = useState(true);
  const [isChangingPush, setIsChangingPush] = useState(false);

  const unreadCount = useMemo(() => notifications.filter((notification) => !notification.read).length, [notifications]);
  const eventCount = useMemo(() => notifications.filter((notification) => notification.type === 'event').length, [notifications]);
  const socialCount = Math.max(0, notifications.length - eventCount);

  const tabs = useMemo(
    () => [
      { id: 'all' as const, count: notifications.length },
      { id: 'unread' as const, count: unreadCount },
      { id: 'social' as const, count: socialCount },
      { id: 'events' as const, count: eventCount },
    ],
    [eventCount, notifications.length, socialCount, unreadCount]
  );

  const visibleNotifications = useMemo(() => {
    if (activeTab === 'unread') return notifications.filter((notification) => !notification.read);
    if (activeTab === 'social') return notifications.filter((notification) => notification.type !== 'event');
    if (activeTab === 'events') return notifications.filter((notification) => notification.type === 'event');
    return notifications;
  }, [activeTab, notifications]);

  const refreshPushState = useCallback(async () => {
    setIsCheckingPush(true);
    try {
      setPushState(await getPushSubscriptionState());
    } catch {
      setPushState({
        supported: false,
        configured: false,
        permission: getPushPermission(),
        subscribed: false,
      });
    } finally {
      setIsCheckingPush(false);
    }
  }, []);

  useEffect(() => {
    void refreshPushState();
    void onRefreshNotifications?.();
  }, [onRefreshNotifications, refreshPushState]);

  const markAllAsRead = async () => {
    if (unreadCount === 0) return;

    setNotifications((current) => current.map((notification) => ({ ...notification, read: true })));
    toast.success('Notifications marked as read');

    if (currentUser?.id) {
      try {
        await markNotificationsAsRead(currentUser.id);
      } catch {
        toast.error('Could not save read status');
      }
    }
  };

  const handleEnablePush = async () => {
    if (!currentUser?.id || isChangingPush) return;

    setIsChangingPush(true);
    try {
      await subscribeToPushNotifications(currentUser.id);
      await refreshPushState();
      toast.success('Push notifications enabled');
    } catch (error: any) {
      await refreshPushState();
      toast.error(error?.message || 'Could not enable push notifications');
    } finally {
      setIsChangingPush(false);
    }
  };

  const handleDisablePush = async () => {
    if (!currentUser?.id || isChangingPush) return;

    setIsChangingPush(true);
    try {
      await unsubscribeFromPushNotifications(currentUser.id);
      await refreshPushState();
      toast.success('Push notifications turned off');
    } catch {
      await refreshPushState();
      toast.error('Could not turn off push notifications');
    } finally {
      setIsChangingPush(false);
    }
  };

  const handleOpenNotification = (notification: Notification) => {
    const target = getNotificationTarget(notification);
    if (!target) return;

    onClose();
    navigate(target);
  };

  const pushCopy = useMemo(() => {
    if (isCheckingPush) {
      return {
        title: 'Checking push status',
        body: 'Confirming notification support for this device.',
        icon: RefreshCw,
        tone: 'bg-gray-50 text-gray-700 border-gray-100',
        action: 'Checking',
        disabled: true,
      };
    }

    if (!pushState?.supported) {
      return {
        title: 'Push unavailable here',
        body: 'Use the installed PWA or a browser that supports notifications.',
        icon: ShieldAlert,
        tone: 'bg-gray-50 text-gray-700 border-gray-100',
        action: 'Unavailable',
        disabled: true,
      };
    }

    if (!pushState.configured) {
      return {
        title: 'Push setup required',
        body: 'Server push keys are not configured yet.',
        icon: ShieldAlert,
        tone: 'bg-amber-50 text-amber-800 border-amber-100',
        action: 'Setup required',
        disabled: true,
      };
    }

    if (pushState.permission === 'denied') {
      return {
        title: 'Notifications blocked',
        body: 'Enable notifications from your browser or device settings.',
        icon: BellOff,
        tone: 'bg-gray-50 text-gray-700 border-gray-100',
        action: 'Blocked',
        disabled: true,
      };
    }

    if (pushState.subscribed) {
      return {
        title: 'Push notifications are on',
        body: 'Likes, comments, follows, and event alerts can appear in your notification bar.',
        icon: Bell,
        tone: 'bg-purple-50 text-purple-800 border-purple-100',
        action: 'Turn off',
        disabled: false,
      };
    }

    return {
      title: 'Enable push notifications',
      body: 'Receive Eventz alerts in your device notification bar.',
      icon: Bell,
      tone: 'bg-purple-50 text-purple-800 border-purple-100',
      action: 'Enable',
      disabled: false,
    };
  }, [isCheckingPush, pushState]);

  const PushIcon = pushCopy.icon;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-white md:left-auto md:right-0 md:max-w-md md:border-l md:border-gray-100 shadow-2xl animate-in slide-in-from-right-full duration-300">
      <div className="sticky top-0 z-10 border-b border-gray-100 bg-white/95 px-4 pb-3 pt-[calc(0.85rem+var(--eventz-safe-area-top))] backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-gray-950">Notifications</h2>
            <p className="text-xs font-medium text-gray-500">{unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}</p>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-purple-700 transition-colors hover:bg-purple-50 disabled:text-gray-300 disabled:hover:bg-transparent"
              aria-label="Mark all as read"
            >
              <CheckCheck className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100"
              aria-label="Close notifications"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="mt-3 flex rounded-full bg-gray-100 p-0.5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`h-8 flex-1 rounded-full px-1.5 text-[11px] font-bold transition-colors ${
                activeTab === tab.id
                  ? 'bg-white text-purple-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <span>{tabLabel[tab.id]}</span>
              {tab.id === 'unread' && tab.count > 0 && (
                <span className="ml-1 text-[10px] font-semibold opacity-70">{tab.count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-y-contain px-4 py-3 pb-[calc(1rem+var(--eventz-safe-area-bottom))]">
        <div className={`mb-3 rounded-2xl border p-3 ${pushCopy.tone}`}>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/80">
              <PushIcon className={`h-5 w-5 ${isCheckingPush ? 'animate-spin' : ''}`} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">{pushCopy.title}</p>
              <p className="mt-0.5 text-xs leading-5 opacity-80">{pushCopy.body}</p>
            </div>
            <button
              type="button"
              disabled={pushCopy.disabled || isChangingPush}
              onClick={pushState?.subscribed ? handleDisablePush : handleEnablePush}
              className="shrink-0 rounded-full bg-white px-3 py-2 text-xs font-bold text-gray-900 shadow-sm transition-opacity disabled:opacity-50"
            >
              {isChangingPush ? 'Saving' : pushCopy.action}
            </button>
          </div>
        </div>

        {notificationsLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" />
          </div>
        ) : visibleNotifications.length === 0 ? (
          <div className="flex min-h-[45vh] flex-col items-center justify-center text-center text-gray-500">
            <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-400">
              <Inbox className="h-6 w-6" />
            </span>
            <p className="text-sm font-bold text-gray-900">No notifications here</p>
            <p className="mt-1 max-w-[15rem] text-xs leading-5">
              {activeTab === 'unread' ? 'Unread activity will appear here.' : 'New Eventz activity will appear here.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {visibleNotifications.map((notification) => {
              const Icon = getNotificationIcon(notification.type);
              const target = getNotificationTarget(notification);

              return (
                <button
                  type="button"
                  key={notification.id}
                  onClick={() => handleOpenNotification(notification)}
                  disabled={!target}
                  className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors ${
                    notification.read
                      ? 'border-gray-100 bg-white hover:bg-gray-50'
                      : 'border-purple-100 bg-purple-50 hover:bg-purple-100/70'
                  } disabled:cursor-default`}
                >
                  <div className="relative shrink-0">
                    <UserAvatar
                      src={notification.user.avatar}
                      name={notification.user.name}
                      className="h-11 w-11 rounded-full object-cover"
                    />
                    <span
                      className={`absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white ${getNotificationAccent(notification.type)}`}
                    >
                      <Icon className={`h-3 w-3 ${notification.type === 'like' ? 'fill-current' : ''}`} />
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm leading-snug text-gray-800">
                      <span className="font-bold text-gray-950">{notification.user.name}</span>{' '}
                      <span>{notification.content}</span>
                    </p>
                    <p className="mt-1 text-xs font-medium text-gray-500">{formatTimeAgo(notification.time)}</p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {!notification.read && <span className="h-2 w-2 rounded-full bg-purple-600" />}
                    {target && <ChevronRight className="h-4 w-4 text-gray-300" />}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
