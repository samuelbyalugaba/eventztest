import { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '../utils/supabase/client';
import { toggleLikePost, toggleSavePost, createPostComment, incrementPostView, deletePost, getPostComments, toggleLikeComment, updatePostCaption, searchProfiles } from '../utils/supabase/api';
import { formatTimeAgo } from '../utils/format';
import { Post, HighlightClip, Conversation } from '../types';
import { PostDetailModal } from './PostDetailModal';
import { handleShare } from '../utils/share';
import { useFeedData } from '../hooks/useFeedData';
import { useFeedConversationState } from '../hooks/useFeedConversationState';

import { ChatList } from './ChatList';
import { ChatDetail } from './ChatDetail';
import { UserProfileModal } from './UserProfileModal';
import { ShareModal } from './ShareModal';
import { FeedHeader } from './FeedHeader';
import { CommentsSheet } from './CommentsSheet';

// Sub-components
import { NotificationsPanel } from './feed/NotificationsPanel';
import { VideoPlayerOverlay } from './feed/VideoPlayerOverlay';
import { FullScreenImageModal } from './feed/FullScreenImageModal';
import { LikeAnimation, FeedAnimationStyles } from './feed/FeedAnimations';
import { FeedContent } from './feed/FeedContent';

type FilterTab = 'all' | 'organizers' | 'trending' | 'following';

interface FeedProps {
  conversations: Conversation[];
  onStartConversation: (user: { name: string; username?: string; avatar: string; verified: boolean; isOrganizer?: boolean; id?: string }) => Promise<Conversation | null | undefined> | Conversation | null;
  onSendMessage: (conversationId: number, messageText: string) => void;
  onMarkAsRead?: (conversationId: number) => void;
  onlineUsers?: { id: string; name: string; avatar: string; username: string }[];
  onDeleteConversation?: (conversationId: number) => void;
  currentUser?: any;
  isOrganizer?: boolean;
  onCreateEvent?: () => void;
  onViewPost?: (post: any) => void;
  isPaused?: boolean;
}

export function Feed({ 
  conversations: globalConversations, 
  onStartConversation, 
  onMarkAsRead, 
  onlineUsers = [], 
  onDeleteConversation, 
  currentUser: propCurrentUser,
  onViewPost,
  isPaused
}: FeedProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const handledNavKeyRef = useRef<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedUserProfile, setSelectedUserProfile] = useState<{ id: string; name: string; username: string; avatar: string; verified: boolean; isOrganizer?: boolean; type?: string } | null>(null);
  const [showComments, setShowComments] = useState(false);
  const [selectedPostForComments, setSelectedPostForComments] = useState<Post | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareModalData, setShareModalData] = useState<{ title: string; text: string; url?: string } | null>(null);
  const [likeAnimation, setLikeAnimation] = useState<{ show: boolean; x: number; y: number }>({ show: false, x: 0, y: 0 });
  const [playingVideo, setPlayingVideo] = useState<{ postId: number; clipIndex: number; clips: HighlightClip[] } | null>(null);
  const [fullScreenImage, setFullScreenImage] = useState<{ images: string[]; currentIndex: number; postId: number } | null>(null);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [renderCount, setRenderCount] = useState(20);
  const [exploreSearch, setExploreSearch] = useState('');
  const [searchedProfiles, setSearchedProfiles] = useState<any[]>([]);
  const [isSearchingProfiles, setIsSearchingProfiles] = useState(false);
  const [isRestoringScroll, setIsRestoringScroll] = useState(
    !!sessionStorage.getItem('feedScrollPos') || !!sessionStorage.getItem('feedLastPostId')
  );
  const restoreAttemptedRef = useRef(false);
  const [feedHeaderHeight, setFeedHeaderHeight] = useState(0);
  const feedContainerRef = useRef<HTMLDivElement>(null);
  const feedScrollRef = useRef<HTMLDivElement>(null);
  const [feedScrollContainer, setFeedScrollContainer] = useState<HTMLDivElement | null>(null);

  const {
    posts,
    setPosts,
    hasMore,
    isLoadingMore,
    currentUser,
    isLoading,
    followingIds,
    notifications,
    notificationsLoading,
    currentUserProfile,
    handleLoadMore,
    setNotifications,
    setNotificationsLoading,
  } = useFeedData(propCurrentUser);

  const {
    showMessages,
    setShowMessages,
    activeConversation,
    setActiveConversation,
  } = useFeedConversationState({
    globalConversations,
    currentUserId: currentUser?.id,
    onMarkAsRead,
  });

  // Force pause highlight player if background is paused
  useEffect(() => {
    if (isPaused && playingVideo) {
      const video = document.getElementById('highlight-video') as HTMLVideoElement;
      if (video && !video.paused) {
        video.pause();
      }
    }
  }, [isPaused, playingVideo]);

  useEffect(() => {
    const header = document.getElementById('feed-header');
    if (!header) return;
    const update = () => {
      const next = Math.ceil(header.getBoundingClientRect().height);
      setFeedHeaderHeight((prev) => (prev === next ? prev : next));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(header);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      const original = window.history.scrollRestoration;
      window.history.scrollRestoration = 'manual';
      return () => { window.history.scrollRestoration = original; };
    }
  }, []);

  useLayoutEffect(() => {
    if (restoreAttemptedRef.current) return;
    if (isLoading || posts.length === 0) return;

    const savedPos = sessionStorage.getItem('feedScrollPos');
    const lastPostId = sessionStorage.getItem('feedLastPostId');
    const hasRestoreData = (savedPos !== null && savedPos !== '') || (lastPostId !== null && lastPostId !== '');

    if (!hasRestoreData) {
      restoreAttemptedRef.current = true;
      setIsRestoringScroll(false);
      return;
    }

    let rafId = 0;
    const startMs = performance.now();
    const maxWaitMs = 2500;

    const finish = () => {
      sessionStorage.removeItem('feedScrollPos');
      sessionStorage.removeItem('feedLastPostId');
      restoreAttemptedRef.current = true;
      setIsRestoringScroll(false);
    };

    const attempt = () => {
      const scrollEl = feedScrollRef.current;
      const currentLastPostId = sessionStorage.getItem('feedLastPostId');
      const currentSavedPos = sessionStorage.getItem('feedScrollPos');
      const target = currentLastPostId ? document.getElementById(`post-${currentLastPostId}`) : null;

      if (target) {
        if (scrollEl) {
          const scrollRect = scrollEl.getBoundingClientRect();
          const targetRect = target.getBoundingClientRect();
          scrollEl.scrollTop += targetRect.top - scrollRect.top;
        } else {
          const targetRect = target.getBoundingClientRect();
          window.scrollTo(0, window.scrollY + targetRect.top);
        }
        finish();
        return;
      }

      if (currentSavedPos !== null && currentSavedPos !== '') {
        const scrollY = parseInt(currentSavedPos, 10);
        if (!isNaN(scrollY) && scrollY >= 0) {
          if (scrollEl) {
            const maxScrollTop = Math.max(0, scrollEl.scrollHeight - scrollEl.clientHeight);
            if (maxScrollTop >= scrollY) { scrollEl.scrollTop = scrollY; finish(); return; }
          } else {
            const maxScrollTop = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
            if (maxScrollTop >= scrollY) { window.scrollTo(0, scrollY); finish(); return; }
          }
        }
      }

      if (performance.now() - startMs >= maxWaitMs) { finish(); return; }
      rafId = requestAnimationFrame(attempt);
    };

    attempt();
    return () => { cancelAnimationFrame(rafId); };
  }, [isLoading, posts.length]);

  useEffect(() => {
    if (handledNavKeyRef.current === location.key) return;
    handledNavKeyRef.current = location.key;
    const state = (location.state || {}) as any;
    if (!state?.openMessages && !state?.userToMessage) return;
    if (state.openMessages) setShowMessages(true);
    if (state.userToMessage) {
      (async () => {
        try {
          setShowMessages(true);
          const conv = await onStartConversation(state.userToMessage);
          if (conv) setActiveConversation(conv);
        } catch (e) { console.error('Failed to start conversation from navigation state', e); }
        finally { navigate(location.pathname, { replace: true }); }
      })();
    } else {
      navigate(location.pathname, { replace: true });
    }
  }, [location.key, location.pathname, location.state, navigate, onStartConversation]);

  useEffect(() => {
    const performSearch = async () => {
      if (exploreSearch.trim().length >= 2) {
        setIsSearchingProfiles(true);
        try {
          const profiles = await searchProfiles(exploreSearch.trim());
          setSearchedProfiles(profiles || []);
        } catch (error) { console.error('Error searching profiles:', error); }
        finally { setIsSearchingProfiles(false); }
      } else { setSearchedProfiles([]); }
    };
    const timer = setTimeout(performSearch, 300);
    return () => clearTimeout(timer);
  }, [exploreSearch]);

  useEffect(() => {
    const unlockAudio = () => {
      setAudioUnlocked(true);
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
    window.addEventListener('click', unlockAudio);
    window.addEventListener('touchstart', unlockAudio);
    window.addEventListener('keydown', unlockAudio);
    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
  }, []);

  useEffect(() => {
    if (selectedPost) {
      incrementPostView(selectedPost.id);
      const fetchComments = async () => {
        try {
          const comments = await getPostComments(selectedPost.id);
          const mappedComments = (comments || []).map((c: any) => ({
            id: c.id,
            user: { name: c.user?.full_name || c.user?.username || 'User', avatar: c.user?.avatar_url || '' },
            text: c.text,
            timestamp: formatTimeAgo(c.created_at)
          }));
          setSelectedPost(prev => prev && prev.id === selectedPost.id ? { ...prev, comments: mappedComments } : prev);
        } catch (error) { console.error('Error fetching comments:', error); }
      };
      fetchComments();
    }
  }, [selectedPost?.id]);

  useEffect(() => {
    if (playingVideo) {
      const currentClip = playingVideo.clips[playingVideo.clipIndex];
      incrementPostView(currentClip.id);
    }
  }, [playingVideo?.clipIndex, playingVideo?.clips]);

  useEffect(() => {
    if (selectedPost && (!selectedPost.comments || selectedPost.comments.length === 0) && (selectedPost.comments_count || 0) > 0) {
      const fetchComments = async () => {
        try {
          const { data: commentsData } = await supabase
            .from('post_comments')
            .select('*, user:profiles(*)')
            .eq('post_id', selectedPost.id)
            .order('created_at', { ascending: true });
          if (commentsData) {
            const mappedComments = commentsData.map((c: any) => ({
              id: c.id,
              user: { name: c.user?.full_name || c.user?.username || 'User', avatar: c.user?.avatar_url || '', is_organizer: c.user?.is_organizer || false },
              text: c.text,
              timestamp: formatTimeAgo(c.created_at)
            }));
            setSelectedPost(prev => prev ? { ...prev, comments: mappedComments } : null);
          }
        } catch (e) { console.error('Error fetching comments for modal:', e); }
      };
      fetchComments();
    }
  }, [selectedPost?.id]);

  const unreadMessagesCount = useMemo(
    () => (globalConversations || []).reduce((acc, conv) => acc + (conv?.unreadCount || 0), 0),
    [globalConversations]
  );

  useEffect(() => {
    const sentinel = document.getElementById('feed-sentinel');
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => { entries.forEach((entry) => { if (entry.isIntersecting) { setRenderCount((c) => c + 20); if (hasMore && !isLoadingMore) handleLoadMore(); } }); },
      { threshold: 0.1, root: feedScrollContainer ?? null }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [renderCount, posts.length, activeFilter, hasMore, isLoadingMore, feedScrollContainer]);

  useEffect(() => {
    if (currentUser) {
      const fetchNotifications = async () => {
        setNotificationsLoading(true);
        try {
          const { getNotifications } = await import('../utils/supabase/api');
          const data = await getNotifications(currentUser.id);
          setNotifications(data);
        }
        catch (error) { console.error('Error fetching notifications:', error); }
        finally { setNotificationsLoading(false); }
      };
      void fetchNotifications();
      let interval: ReturnType<typeof setInterval>;
      if (showNotifications) interval = setInterval(() => { void fetchNotifications(); }, 60000);
      return () => { if (interval) clearInterval(interval); };
    }
  }, [currentUser, showNotifications]);

  const toggleLike = useCallback(async (postId: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    let wasLiked = false;
    setPosts(prev => prev.map(post => {
      if (post.id !== postId) return post;
      wasLiked = !!post.isLiked;
      return { ...post, isLiked: !post.isLiked, likes: post.isLiked ? post.likes - 1 : post.likes + 1 };
    }));
    if (e && !wasLiked) {
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      setLikeAnimation({ show: true, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
      setTimeout(() => setLikeAnimation({ show: false, x: 0, y: 0 }), 1000);
    }
    setSelectedPost(prev => (prev && prev.id === postId)
      ? { ...prev, isLiked: !prev.isLiked, likes: prev.isLiked ? prev.likes - 1 : prev.likes + 1 }
      : prev);
    if (currentUser) {
      try { await toggleLikePost(postId, currentUser.id); }
      catch (error) { console.error('Error toggling like:', error); toast.error('Failed to update like'); }
    }
  }, [currentUser, setPosts]);

  const toggleSave = useCallback(async (postId: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setPosts(prev => prev.map(post => {
      if (post.id === postId) { if (!post.isSaved) toast.success('Saved for later! 📌'); return { ...post, isSaved: !post.isSaved }; }
      return post;
    }));
    setSelectedPost(prev => (prev && prev.id === postId) ? { ...prev, isSaved: !prev.isSaved } : prev);
    if (currentUser) {
      try { await toggleSavePost(postId, currentUser.id); }
      catch (error) { console.error('Error toggling save:', error); toast.error('Failed to update saved post'); }
    }
  }, [currentUser, setPosts]);

  const sharePost = useCallback(async (post: Post, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const postUrl = `${window.location.origin}/post/${post.id}`;
    const shared = await handleShare({ title: `Check out this post from ${post.user.name}`, text: post.content.text || 'Check out this amazing post on EVENTZ!', url: postUrl });
    if (!shared) {
      setShareModalData({ title: `Post from ${post.user.name}`, text: post.content.text || 'Check out this amazing post on EVENTZ!', url: postUrl });
      setShowShareModal(true);
    }
  }, []);

  const handleDeletePost = useCallback(async (postId: number) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    let previousPosts: Post[] = [];
    setPosts(prev => { previousPosts = prev; return prev.filter(p => p.id !== postId); });
    setSelectedPost(prev => (prev && prev.id === postId) ? null : prev);
    try { await deletePost(postId); toast.success('Post deleted'); }
    catch (error) { console.error('Error deleting post:', error); toast.error('Failed to delete post'); setPosts(previousPosts); }
  }, [setPosts]);

  const handlePostComment = useCallback(async (postId: number, text: string, parentId?: number) => {
    if (!text || !text.trim()) return;
    if (!currentUser) { toast.error('Please sign in to comment'); return; }
    try {
      const newCommentData = await createPostComment(postId, currentUser.id, text.trim(), parentId);
      const newComment: any = {
        id: newCommentData.id,
        user: { name: newCommentData.user?.full_name || newCommentData.user?.username || 'Unknown', avatar: newCommentData.user?.avatar_url, is_organizer: newCommentData.user?.is_organizer || false },
        text: newCommentData.text, timestamp: 'Just now', parent_id: newCommentData.parent_id, likes_count: 0, is_liked: false
      };
      setPosts(prev => prev.map(post => post.id === postId ? { ...post, comments: [...(post.comments || []), newComment], comments_count: (post.comments_count || 0) + 1 } : post));
      setSelectedPost(prev => { if (!prev || prev.id !== postId) return prev; return { ...prev, comments: [...(prev.comments || []), newComment], comments_count: (prev.comments_count || 0) + 1 }; });
      toast.success('Comment posted');
    } catch (error) { console.error('Error posting comment:', error); toast.error('Failed to post comment'); }
  }, [currentUser, setPosts]);

  const handleLikeComment = useCallback(async (commentId: number) => {
    if (!currentUser) { toast.error('Please sign in to like comments'); return; }
    try {
      const isLiked = await toggleLikeComment(commentId, currentUser.id);
      setSelectedPost(prev => {
        if (!prev) return null;
        return { ...prev, comments: (prev.comments || []).map((c: any) => c.id === commentId ? { ...c, is_liked: isLiked, likes_count: isLiked ? (c.likes_count || 0) + 1 : Math.max(0, (c.likes_count || 0) - 1) } : c) };
      });
    } catch (e) { console.error('Error liking comment:', e); toast.error('Failed to update like'); }
  }, [currentUser]);

  const handleEditCaption = useCallback(async (postId: number, caption: string) => {
    if (!currentUser) { toast.error('Please sign in'); return; }
    try {
      const updated = await updatePostCaption(postId, currentUser.id, caption);
      setPosts(prev => prev.map(p => p.id !== postId ? p : { ...p, content: { ...(p.content || {}), text: updated.content } } as any));
      setSelectedPost(prev => { if (!prev || prev.id !== postId) return prev; return { ...prev, content: { ...(prev.content || {}), text: updated.content } } as any; });
      window.dispatchEvent(new Event('postsUpdated'));
    } catch (e) { console.error(e); toast.error('Failed to update caption'); throw e; }
  }, [currentUser, setPosts]);

  const handleStartConversationLocal = useCallback(async (user: { name: string; username: string; avatar: string; verified: boolean; isOrganizer?: boolean }, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!currentUser) { toast.error('Please sign in to start a conversation'); return; }
    const toastId = toast.loading('Opening chat...');
    try {
      const conversation = await onStartConversation(user);
      if (conversation) { setSelectedPost(null); setActiveConversation(conversation); setShowMessages(true); toast.dismiss(toastId); }
      else toast.error('Could not start conversation', { id: toastId });
    } catch (error) { console.error('Error starting conversation:', error); toast.error('Failed to start conversation', { id: toastId }); }
  }, [currentUser, onStartConversation, setActiveConversation, setShowMessages]);

  const handleOpenUserProfile = useCallback((user: { id: string; name: string; username: string; avatar: string; verified: boolean; isOrganizer?: boolean; isOrganizerPage?: boolean }, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedUserProfile({
      id: user.id,
      name: user.name,
      username: user.username,
      avatar: user.avatar,
      verified: user.verified,
      isOrganizer: user.isOrganizer,
      type: user.isOrganizer ? 'Organizer' : 'Attendee',
    });
  }, []);

  const filteredPosts = useMemo(() => posts.filter(post => {
    if (activeFilter === 'organizers') return post.user.isOrganizer;
    if (activeFilter === 'trending') return post.likes > 200;
    if (activeFilter === 'following') return followingIds.has(post.user.id);
    return true;
  }), [posts, activeFilter, followingIds]);

  const handlePostClick = useCallback((post: Post, startTime?: number, isMuted?: boolean) => {
    const scrollPos = feedScrollRef.current?.scrollTop ?? window.scrollY;
    sessionStorage.setItem('feedScrollPos', String(scrollPos));
    sessionStorage.setItem('feedLastPostId', post.id.toString());
    if (onViewPost) onViewPost({ ...post, startTime, isMuted });
  }, [onViewPost]);

  const handleViewComments = useCallback(async (post: Post) => {
    setSelectedPostForComments(post);
    setShowComments(true);
    try {
      const comments = await getPostComments(post.id);
      if (comments) {
        const mapped = comments.map((c: any) => ({
          id: c.id,
          user: { name: c.user?.full_name || c.user?.username || 'User', avatar: c.user?.avatar_url || '', is_organizer: c.user?.is_organizer || false },
          text: c.text, timestamp: formatTimeAgo(c.created_at), parent_id: c.parent_id, likes_count: c.likes_count || 0, is_liked: c.is_liked || false
        }));
        setPosts(prev => prev.map(p => p.id !== post.id ? p : { ...p, comments: mapped, comments_count: comments.length } as any));
        setSelectedPostForComments(prev => { if (!prev || prev.id !== post.id) return prev; return { ...prev, comments: mapped, comments_count: comments.length } as any; });
      }
    } catch (err) { console.error('Error fetching comments:', err); }
  }, [setPosts]);

  // Stable adapter wrappers for FeedContent props (kept stable so memoized PostCards don't re-render)
  const onLikeId = useCallback((id: number) => toggleLike(id), [toggleLike]);
  const onSaveId = useCallback((id: number) => toggleSave(id), [toggleSave]);
  const onShareP = useCallback((p: Post) => sharePost(p), [sharePost]);
  const onMessageU = useCallback((user: any) => handleStartConversationLocal(user), [handleStartConversationLocal]);

  return (
    <>
      <div ref={feedContainerRef} className="relative min-h-screen bg-gradient-to-b from-gray-50 to-white pb-20">
        <FeedHeader
          currentUser={currentUser}
          showNotifications={showNotifications}
          showMessages={showMessages}
          unreadMessagesCount={unreadMessagesCount}
          notifications={notifications}
          exploreSearch={exploreSearch}
          setExploreSearch={setExploreSearch}
          activeFilter={activeFilter}
          setActiveFilter={setActiveFilter}
          onToggleNotifications={() => { setShowNotifications(!showNotifications); setShowMessages(false); }}
          onToggleMessages={() => { setShowMessages(!showMessages); setShowNotifications(false); }}
          showMessagesOrPost={showMessages || !!selectedPost}
          scrollContainer={feedScrollContainer}
        />

        <div
          ref={(el) => {
            (feedScrollRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
            setFeedScrollContainer(el);
          }}
          className="overflow-y-auto h-[100dvh] overscroll-behavior-y-contain"
          style={{
            paddingTop: feedHeaderHeight > 0 ? `${feedHeaderHeight}px` : '7rem',
            visibility: isRestoringScroll ? 'hidden' : 'visible',
            pointerEvents: isRestoringScroll ? 'none' : 'auto',
          }}
        >
          <div id="top-sentinel" className="w-full h-px pointer-events-none" />
          <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
            <FeedContent
              exploreSearch={exploreSearch}
              isSearchingProfiles={isSearchingProfiles}
              searchedProfiles={searchedProfiles}
              isLoading={isLoading}
              filteredPosts={filteredPosts}
              isRestoringScroll={isRestoringScroll}
              hasMore={hasMore}
              isLoadingMore={isLoadingMore}
              audioUnlocked={audioUnlocked}
              isPaused={isPaused || !!selectedUserProfile || !!selectedPost || !!playingVideo || !!fullScreenImage || showNotifications || showComments || showShareModal}
              onProfileClick={handleOpenUserProfile}
              onLike={onLikeId}
              onSave={onSaveId}
              onShare={onShareP}
              onMessage={onMessageU}
              onViewPost={handlePostClick}
              onViewComments={handleViewComments}
            />
          </div>
        </div>
      </div>

      {/* Post Detail Modal */}
      {selectedPost && (
        <PostDetailModal
          post={selectedPost}
          currentUser={currentUser}
          currentUserProfile={currentUserProfile}
          onClose={() => setSelectedPost(null)}
          onLike={(id, e) => toggleLike(id, e)}
          onSave={(id, e) => toggleSave(id, e)}
          onShare={(p, e) => sharePost(p, e)}
          onDelete={handleDeletePost}
          onEditCaption={handleEditCaption}
          onProfileClick={(user, e) => handleOpenUserProfile(user, e)}
          onComment={(postId, text, parentId) => handlePostComment(postId, text, parentId)}
          onLikeComment={handleLikeComment}
        />
      )}

      {/* Notifications Panel */}
      {showNotifications && (
        <NotificationsPanel
          notifications={notifications}
          setNotifications={setNotifications}
          notificationsLoading={notificationsLoading}
          currentUser={currentUser}
          onClose={() => setShowNotifications(false)}
        />
      )}

      {/* Messages Panel */}
      {showMessages && (
        !activeConversation ? (
          <ChatList
            conversations={globalConversations}
            onSelectConversation={(conv) => { setActiveConversation(conv); if (conv.unreadCount > 0 && onMarkAsRead) onMarkAsRead(conv.id); }}
            onStartNewChat={async (user) => { const conv = await onStartConversation(user); if (conv) setActiveConversation(conv); }}
            onClose={() => setShowMessages(false)}
            onlineUsers={onlineUsers}
            onDeleteConversation={onDeleteConversation}
          />
        ) : (
          <ChatDetail
            conversationId={activeConversation.id}
            recipient={{ id: activeConversation.user.id || '', username: activeConversation.user.username, full_name: activeConversation.user.name, avatar_url: activeConversation.user.avatar, verified: activeConversation.user.verified, is_organizer: activeConversation.user.isOrganizer, updated_at: new Date().toISOString() } as any}
            currentUser={{ id: currentUser?.id || '' }}
            onBack={() => setActiveConversation(null)}
            onViewProfile={() => {
              setSelectedUserProfile({ id: activeConversation.user.id || '', name: activeConversation.user.name, username: activeConversation.user.username, avatar: activeConversation.user.avatar, verified: activeConversation.user.verified, isOrganizer: activeConversation.user.isOrganizer });
            }}
            isOnline={onlineUsers.some(u => u.id === activeConversation.user.id)}
          />
        )
      )}

      <LikeAnimation show={likeAnimation.show} x={likeAnimation.x} y={likeAnimation.y} />

      {playingVideo && (
        <VideoPlayerOverlay
          playingVideo={playingVideo}
          onClose={() => setPlayingVideo(null)}
        />
      )}

      {fullScreenImage && (
        <FullScreenImageModal
          images={fullScreenImage.images}
          currentIndex={fullScreenImage.currentIndex}
          postId={fullScreenImage.postId}
          posts={posts}
          setPosts={setPosts}
          onClose={() => setFullScreenImage(null)}
        />
      )}

      {selectedUserProfile && (
        <UserProfileModal
          user={{ id: selectedUserProfile.id, name: selectedUserProfile.name, type: (selectedUserProfile as any).type ?? (selectedUserProfile.isOrganizer ? 'Organizer' : 'Attendee'), avatar: selectedUserProfile.avatar, verified: selectedUserProfile.verified }}
          onClose={() => setSelectedUserProfile(null)}
          onFollow={() => toast.success(`Following ${selectedUserProfile.name}`)}
          onMessage={() => { handleStartConversationLocal(selectedUserProfile); setSelectedUserProfile(null); }}
        />
      )}

      {shareModalData && (
        <ShareModal
          isOpen={showShareModal}
          onClose={() => { setShowShareModal(false); setShareModalData(null); }}
          title={shareModalData.title}
          text={shareModalData.text}
          url={shareModalData.url}
        />
      )}

      {showComments && selectedPostForComments && (
        <CommentsSheet
          isOpen={showComments}
          onClose={() => { setShowComments(false); setSelectedPostForComments(null); }}
          post={selectedPostForComments}
          currentUser={currentUser}
          userProfile={currentUserProfile}
          onComment={handlePostComment}
          onLikeComment={handleLikeComment}
        />
      )}

      <FeedAnimationStyles />
    </>
  );
}
