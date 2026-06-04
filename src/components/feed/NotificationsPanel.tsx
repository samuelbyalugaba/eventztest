import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Bell,
  BellOff,
  Calendar,
  CheckCheck,
  ChevronRight,
  Heart,
  Inbox,
  MessageCircle,
  ShieldAlert,
  UserPlus,
} from 'lucide-react';
import { toast } from 'sonner';
import { UserAvatar } from '../UserAvatar';
import verifiedBadge from '../../assets/verified-badge.png';
import { formatTimeAgo } from '../../utils/format';
import { markNotificationsAsRead, Notification } from '../../utils/supabase/api';
import { isNativeCapacitor } from '../../utils/platform';
import {
  getPushPermission,
  getPushSubscriptionState,
  subscribeToPushNotifications,
  type PushSubscriptionState,
} from '../../utils/pushNotifications';

type NotificationTab = 'all' | 'unread' | 'people' | 'comments' | 'professional';
type NotificationFeedItem =
  | { kind: 'push'; id: 'push-status' }
  | { kind: 'notification'; id: string; notification: Notification };

interface NotificationsPanelProps {
  notifications: Notification[];
  setNotifications: Dispatch<SetStateAction<Notification[]>>;
  notificationsLoading: boolean;
  currentUser: any;
  currentUserProfile?: any;
  onClose: () => void;
  onRefreshNotifications?: () => Promise<void> | void;
}

const tabs: Array<{ id: NotificationTab; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'people', label: 'People you follow' },
  { id: 'comments', label: 'Comments' },
  { id: 'professional', label: 'Professional' },
];

const getNotificationIcon = (type: Notification['type']) => {
  if (type === 'like') return Heart;
  if (type === 'comment') return MessageCircle;
  if (type === 'follow') return UserPlus;
  return Calendar;
};

const notificationAccent = 'bg-gradient-to-br from-purple-600 to-blue-600 text-white shadow-sm shadow-purple-200';

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

const getSectionTitle = (isoTime: string) => {
  const time = new Date(isoTime).getTime();
  if (!Number.isFinite(time)) return 'Earlier';

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterday = today - 24 * 60 * 60 * 1000;
  const sevenDaysAgo = today - 6 * 24 * 60 * 60 * 1000;

  if (time >= today) return 'Highlights';
  if (time >= yesterday) return 'Yesterday';
  if (time >= sevenDaysAgo) return 'Last 7 days';
  return 'Earlier';
};

export function NotificationsPanel({
  notifications,
  setNotifications,
  notificationsLoading,
  currentUser,
  currentUserProfile,
  onClose,
  onRefreshNotifications,
}: NotificationsPanelProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<NotificationTab>('all');
  const [pushState, setPushState] = useState<PushSubscriptionState | null>(null);
  const [isCheckingPush, setIsCheckingPush] = useState(true);
  const [isChangingPush, setIsChangingPush] = useState(false);
  const isNativeApp = useMemo(() => isNativeCapacitor(), []);

  const unreadCount = useMemo(() => notifications.filter((notification) => !notification.read).length, [notifications]);
  const title = useMemo(() => {
    return (
      currentUserProfile?.username ||
      currentUserProfile?.full_name ||
      currentUser?.user_metadata?.username ||
      currentUser?.user_metadata?.full_name ||
      currentUser?.email?.split('@')[0] ||
      'Notifications'
    );
  }, [currentUser, currentUserProfile]);

  const visibleNotifications = useMemo(() => {
    if (activeTab === 'unread') return notifications.filter((notification) => !notification.read);
    if (activeTab === 'people') return notifications.filter((notification) => notification.type === 'follow');
    if (activeTab === 'comments') return notifications.filter((notification) => notification.type === 'comment');
    if (activeTab === 'professional') return notifications.filter((notification) => notification.type === 'event');
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

  const handleOpenNotification = (notification: Notification) => {
    const target = getNotificationTarget(notification);
    if (!target) return;

    onClose();
    navigate(target);
  };

  const pushPrompt = useMemo(() => {
    if (isCheckingPush || !pushState?.supported) return null;

    if (!pushState.configured) {
      return {
        title: 'Push setup required',
        body: 'Server push keys need to be configured.',
        icon: ShieldAlert,
        action: 'Setup',
        disabled: true,
        onClick: undefined,
      };
    }

    if (pushState.permission === 'denied') {
      return {
        title: 'Notifications blocked',
        body: isNativeApp
          ? 'Enable notifications from Android app settings.'
          : 'Enable notifications in your browser or device settings.',
        icon: BellOff,
        action: 'Blocked',
        disabled: true,
        onClick: undefined,
      };
    }

    if (pushState.subscribed) return null;

    return {
      title: 'Enable push notifications',
      body: isNativeApp
        ? 'Receive Eventz alerts in your device notification bar.'
        : 'Receive Eventz alerts in your notification bar.',
      icon: Bell,
      action: 'Enable',
      disabled: isChangingPush,
      onClick: handleEnablePush,
    };
  }, [handleEnablePush, isChangingPush, isCheckingPush, isNativeApp, pushState]);

  const groupedItems = useMemo(() => {
    const items: NotificationFeedItem[] = visibleNotifications.map((notification) => ({
      kind: 'notification',
      id: notification.id,
      notification,
    }));

    if (pushPrompt && activeTab === 'all') {
      items.unshift({ kind: 'push', id: 'push-status' });
    }

    const groups = new Map<string, NotificationFeedItem[]>();
    items.forEach((item) => {
      const sectionTitle = item.kind === 'push' ? 'Highlights' : getSectionTitle(item.notification.time);
      groups.set(sectionTitle, [...(groups.get(sectionTitle) || []), item]);
    });

    const orderedTitles = ['Highlights', 'Yesterday', 'Last 7 days', 'Earlier'];
    return orderedTitles
      .map((sectionTitle) => ({ title: sectionTitle, items: groups.get(sectionTitle) || [] }))
      .filter((section) => section.items.length > 0);
  }, [activeTab, pushPrompt, visibleNotifications]);

  const renderPushRow = () => {
    if (!pushPrompt) return null;

    const PushIcon = pushPrompt.icon;

    return (
      <div className="flex items-center gap-3 py-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-purple-50 text-purple-700">
          <PushIcon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-snug text-gray-900">
            <span className="font-semibold">{pushPrompt.title}</span>{' '}
            <span>{pushPrompt.body}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={pushPrompt.onClick}
          disabled={pushPrompt.disabled}
          className="h-9 shrink-0 rounded-xl bg-purple-600 px-4 text-sm font-semibold text-white transition-opacity disabled:bg-gray-100 disabled:text-gray-500"
        >
          {isChangingPush ? 'Saving' : pushPrompt.action}
        </button>
      </div>
    );
  };

  const renderNotificationRow = (notification: Notification) => {
    const Icon = getNotificationIcon(notification.type);
    const target = getNotificationTarget(notification);

    return (
      <button
        type="button"
        key={notification.id}
        onClick={() => handleOpenNotification(notification)}
        disabled={!target}
        className="flex w-full items-center gap-3 py-2.5 text-left disabled:cursor-default"
      >
        <div className="relative shrink-0 overflow-visible">
          <UserAvatar
            src={notification.user.avatar}
            name={notification.user.name}
            className={`h-11 w-11 rounded-full object-cover ${
              !notification.read ? 'ring-2 ring-purple-500/80 ring-offset-2' : ''
            }`}
          />
          <span
            className={`absolute bottom-0 right-0 z-20 flex h-5 w-5 translate-x-1 translate-y-1 items-center justify-center rounded-full border-2 border-white ${notificationAccent}`}
          >
            <Icon className={`h-3 w-3 ${notification.type === 'like' ? 'fill-current' : ''}`} />
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm leading-snug text-gray-900">
            <span className="font-semibold">{notification.user.name}</span>
            {(notification.user.verified || notification.user.isOrganizer) && (
              <img
                src={verifiedBadge}
                alt="Verified"
                className="mx-1 inline h-3.5 w-3.5 align-[-2px] select-none"
                loading="lazy"
                decoding="async"
              />
            )}{' '}
            <span>{notification.content}</span>{' '}
            <span className="whitespace-nowrap text-gray-500">{formatTimeAgo(notification.time)}</span>
          </p>
        </div>

        {notification.type === 'follow' ? (
          <span className="h-9 shrink-0 rounded-xl bg-purple-600 px-4 pt-2 text-sm font-semibold text-white">
            View
          </span>
        ) : notification.type === 'event' && notification.user.avatar ? (
          <img
            src={notification.user.avatar}
            alt=""
            className="h-11 w-11 shrink-0 rounded-xl object-cover"
          />
        ) : target ? (
          <ChevronRight className="h-5 w-5 shrink-0 text-gray-300" />
        ) : null}
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-white md:left-auto md:right-0 md:max-w-md md:border-l md:border-gray-100 shadow-2xl animate-in slide-in-from-right-full duration-300">
      <div className="sticky top-0 z-10 bg-white px-4 pb-3 pt-[calc(0.8rem+var(--eventz-safe-area-top))]">
        <div className="flex h-11 items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="-ml-2 inline-flex h-10 w-10 items-center justify-center rounded-full text-gray-950 transition-colors hover:bg-gray-100"
            aria-label="Close notifications"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            <h2 className="truncate text-xl font-semibold leading-none tracking-normal text-gray-950">{title}</h2>
            {unreadCount > 0 && <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" />}
          </div>
          <button
            type="button"
            onClick={markAllAsRead}
            disabled={unreadCount === 0}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-900 transition-colors hover:bg-gray-100 disabled:text-gray-300 disabled:hover:bg-transparent"
            aria-label="Mark all as read"
          >
            <CheckCheck className="h-5 w-5" />
          </button>
        </div>

        <div className="-mx-4 mt-3 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex w-max gap-3">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`h-10 rounded-xl px-4 text-sm font-semibold transition-colors ${
                  activeTab === tab.id
                    ? 'bg-purple-50 text-purple-700'
                    : 'bg-gray-100 text-gray-950 hover:bg-gray-200'
                }`}
              >
                <span>{tab.label}</span>
                {tab.id === 'unread' && unreadCount > 0 && (
                  <span className="ml-1 text-xs font-semibold">{unreadCount}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-y-contain px-4 pb-[calc(1.25rem+var(--eventz-safe-area-bottom))] pt-1">
        {notificationsLoading ? (
          <div className="flex justify-center py-14">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" />
          </div>
        ) : groupedItems.length === 0 ? (
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
          <div className="space-y-4">
            {groupedItems.map((section) => (
              <section key={section.title}>
                <h3 className="mb-1 text-xl font-semibold tracking-normal text-gray-950">{section.title}</h3>
                <div>
                  {section.items.map((item) =>
                    item.kind === 'push' ? renderPushRow() : renderNotificationRow(item.notification)
                  )}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
