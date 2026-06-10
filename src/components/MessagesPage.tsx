import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { ChatList } from './ChatList';
import { ChatDetail } from './ChatDetail';
import { useAuth } from '../contexts/AuthContext';
import { useMessaging } from '../contexts/MessagingContext';
import type { Conversation } from '../types';

type RouteTarget = {
  pathname: string;
  search?: string;
  hash?: string;
  state?: unknown;
};

type StartConversationRouteUser = {
  id: string;
  name: string;
  username?: string;
  avatar: string;
  verified: boolean;
  isOrganizer?: boolean;
};

type MessagesLocationState = {
  returnTo?: unknown;
  startConversationUser?: unknown;
  optimisticConversation?: unknown;
};

const toRouteTarget = (value: unknown): RouteTarget | null => {
  if (!value || typeof value !== 'object' || typeof (value as RouteTarget).pathname !== 'string') {
    return null;
  }

  const target = value as RouteTarget;
  return {
    pathname: target.pathname,
    search: target.search || '',
    hash: target.hash || '',
    state: target.state,
  };
};

const toStartConversationUser = (value: unknown): StartConversationRouteUser | null => {
  if (!value || typeof value !== 'object' || typeof (value as { id?: unknown }).id !== 'string') {
    return null;
  }

  const user = value as Partial<StartConversationRouteUser>;
  return {
    id: user.id!,
    name: typeof user.name === 'string' && user.name.trim() ? user.name : 'User',
    username: typeof user.username === 'string' ? user.username : '',
    avatar: typeof user.avatar === 'string' ? user.avatar : '',
    verified: !!user.verified,
    isOrganizer: !!user.isOrganizer,
  };
};

const toOptimisticConversation = (value: unknown): Conversation | null => {
  if (!value || typeof value !== 'object') return null;
  const conversation = value as Partial<Conversation>;
  if (typeof conversation.id !== 'number' || !conversation.user) return null;
  return conversation as Conversation;
};

function MessagesLoading() {
  return (
    <div className="fixed inset-0 z-[70] flex h-[100dvh] flex-col bg-white">
      <div className="flex min-h-[calc(4rem+var(--eventz-safe-area-top))] items-center gap-3 border-b border-gray-100 px-5 pt-[var(--eventz-safe-area-top)]">
        <div className="h-10 w-10 rounded-full bg-gray-100 animate-pulse" />
        <div className="space-y-2">
          <div className="h-4 w-32 rounded bg-gray-100 animate-pulse" />
          <div className="h-3 w-20 rounded bg-gray-100 animate-pulse" />
        </div>
      </div>
      <div className="flex-1 space-y-4 bg-gray-50 p-5">
        {[0, 1, 2].map((item) => (
          <div key={item} className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-white shadow-sm animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-36 rounded bg-white shadow-sm animate-pulse" />
              <div className="h-3 w-52 max-w-full rounded bg-white shadow-sm animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ConversationNotFound({ onBack }: { onBack: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] flex h-[100dvh] flex-col bg-white">
      <div className="flex min-h-[calc(4rem+var(--eventz-safe-area-top))] items-center border-b border-gray-100 px-5 pt-[var(--eventz-safe-area-top)]">
        <button onClick={onBack} aria-label="Back" className="p-2 -ml-2 hover:bg-gray-100 rounded-full">
          <ArrowLeft className="h-6 w-6 text-gray-900" />
        </button>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
          <MessageSquare className="h-8 w-8 text-gray-500" />
        </div>
        <h1 className="text-xl font-bold text-gray-900">Conversation not found</h1>
        <p className="mt-2 max-w-sm text-sm text-gray-500">
          This chat may have been deleted or is no longer available.
        </p>
        <button
          onClick={() => onBack()}
          className="mt-6 rounded-xl bg-[#8A2BE2] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#7a26c9]"
        >
          Back to messages
        </button>
      </div>
    </div>
  );
}

export default function MessagesPage() {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const startRequestKeyRef = useRef<string | null>(null);
  const { user: currentUser } = useAuth();
  const {
    conversations,
    isLoadingConversations,
    onlineFriends,
    startConversation,
    markAsRead,
    deleteConversation,
  } = useMessaging();

  const routeState = location.state as MessagesLocationState | null;
  const returnTo = useMemo(() => toRouteTarget(routeState?.returnTo), [routeState]);
  const startConversationUser = useMemo(() => toStartConversationUser(routeState?.startConversationUser), [routeState]);
  const optimisticConversation = useMemo(() => toOptimisticConversation(routeState?.optimisticConversation), [routeState]);
  const parsedConversationId = conversationId ? Number(conversationId) : null;
  const activeConversation = parsedConversationId
    ? conversations.find((conversation) => conversation.id === parsedConversationId) ||
      (optimisticConversation?.id === parsedConversationId ? optimisticConversation : null)
    : null;

  const navigateToTarget = useCallback((target: RouteTarget, replace = true) => {
    navigate({
      pathname: target.pathname,
      search: target.search || '',
      hash: target.hash || '',
    }, { replace, state: target.state });
  }, [navigate]);

  const handleListClose = useCallback(() => {
    if (returnTo) {
      navigateToTarget(returnTo);
      return;
    }

    navigate('/feed', { replace: true });
  }, [navigate, navigateToTarget, returnTo]);

  const handleChatBack = useCallback(() => {
    if (returnTo) {
      navigateToTarget(returnTo);
      return;
    }

    navigate('/messages', { replace: true });
  }, [navigate, navigateToTarget, returnTo]);

  useEffect(() => {
    if (conversationId || !startConversationUser?.id) return;
    const requestKey = `${location.key}:${startConversationUser.id}`;
    if (startRequestKeyRef.current === requestKey) return;
    startRequestKeyRef.current = requestKey;

    let cancelled = false;

    const openConversation = async () => {
      try {
        const conversation = await startConversation(startConversationUser);
        if (cancelled) return;

        if (conversation) {
          navigate(`/messages/${conversation.id}`, {
            replace: true,
            state: { returnTo, optimisticConversation: conversation },
          });
          return;
        }

        toast.error('Could not start conversation');
        navigate('/messages', { replace: true, state: returnTo ? { returnTo } : undefined });
      } catch {
        if (cancelled) return;
        toast.error('Failed to start conversation');
        navigate('/messages', { replace: true, state: returnTo ? { returnTo } : undefined });
      }
    };

    void openConversation();

    return () => {
      cancelled = true;
    };
  }, [conversationId, location.key, navigate, returnTo, startConversation, startConversationUser]);

  useEffect(() => {
    if (!activeConversation || activeConversation.unreadCount <= 0) return;
    void markAsRead(activeConversation.id);
  }, [activeConversation, markAsRead]);

  if (conversationId && (!parsedConversationId || Number.isNaN(parsedConversationId))) {
    return <ConversationNotFound onBack={handleChatBack} />;
  }

  if (conversationId && isLoadingConversations && !activeConversation) {
    return <MessagesLoading />;
  }

  if (conversationId && !activeConversation) {
    return <ConversationNotFound onBack={handleChatBack} />;
  }

  if (activeConversation) {
    return (
      <ChatDetail
        conversationId={activeConversation.id}
        recipient={{
          id: activeConversation.user.id || '',
          username: activeConversation.user.username,
          full_name: activeConversation.user.name,
          avatar_url: activeConversation.user.avatar,
          verified: activeConversation.user.verified,
          is_organizer: activeConversation.user.isOrganizer,
          updated_at: new Date().toISOString(),
        } as any}
        currentUser={{ id: currentUser?.id || '' }}
        onBack={handleChatBack}
        onViewProfile={() => {
          if (activeConversation.user.id) {
            navigate(`/profile/${activeConversation.user.id}`);
          }
        }}
        isOnline={onlineFriends.some((user) => user.id === activeConversation.user.id)}
      />
    );
  }

  if (startConversationUser) {
    return <MessagesLoading />;
  }

  if (isLoadingConversations) {
    return <MessagesLoading />;
  }

  return (
    <ChatList
      conversations={conversations}
      onSelectConversation={(conversation) => {
        navigate(`/messages/${conversation.id}`);
        if (conversation.unreadCount > 0) void markAsRead(conversation.id);
      }}
      onStartNewChat={async (user) => {
        const conversation = await startConversation(user);
        if (conversation) navigate(`/messages/${conversation.id}`);
      }}
      onClose={handleListClose}
      onlineUsers={onlineFriends}
      onDeleteConversation={deleteConversation}
    />
  );
}
