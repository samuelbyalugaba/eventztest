import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { toggleLikePost, toggleSavePost, getPostComments, updatePostCaption } from '../utils/supabase/api';
import { formatTimeAgo } from '../utils/format';
import { Post, Conversation } from '../types';
import { removeUserPostsFromFeedCache, useFeedData } from '../hooks/useFeedData';
import { queryClient } from '../queryClient';
import { queryKeys } from '../queryKeys';

import { FeedHeader } from './FeedHeader';
import { FeedModals } from './feed/FeedModals';
import { FeedScroller } from './feed/FeedScroller';
import { FeedAnimationStyles } from './feed/FeedAnimations';

import { useFeedComments } from '../hooks/useFeedComments';
import { useFeedModals } from '../hooks/useFeedModals';
import { useFeedScrollRestore } from '../hooks/useFeedScrollRestore';

type RouteTarget = {
  pathname: string;
  search?: string;
  hash?: string;
  state?: unknown;
};

interface FeedProps {
  conversations: Conversation[];
  onStartConversation: (user: { name: string; username?: string; avatar: string; verified: boolean; isOrganizer?: boolean; id?: string }) => Promise<Conversation | null | undefined> | Conversation | null;
  currentUser?: { id: string; user_metadata?: Record<string, unknown> } | null;
  onViewPost?: (post: Post) => void;
  isPaused?: boolean;
}

export function Feed({ 
  conversations: globalConversations, 
  onStartConversation, 
  currentUser: propCurrentUser,
  onViewPost,
  isPaused
}: FeedProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const currentRouteTarget = useMemo<RouteTarget>(() => ({
    pathname: location.pathname,
    search: location.search,
    hash: location.hash,
    state: location.state,
  }), [location.hash, location.pathname, location.search, location.state]);
  const feedContainerRef = useRef<HTMLDivElement>(null);
  const [feedHeaderHeight, setFeedHeaderHeight] = useState(0);

  const {
    posts,
    setPosts,
    hasMore,
    isLoadingMore,
    currentUser,
    isLoading,
    notifications,
    notificationsLoading,
    currentUserProfile,
    handleLoadMore,
    refreshNotifications,
    setNotifications,
  } = useFeedData(propCurrentUser);

  const {
    selectedPost,
    setSelectedPost,
    showNotifications,
    setShowNotifications,
    showComments,
    setShowComments,
    selectedPostForComments,
    setSelectedPostForComments,
    showShareModal,
    shareModalData,
    likeAnimation,
    setLikeAnimation,
    playingVideo,
    fullScreenImage,
    pendingDeletePostId,
    setPendingDeletePostId,
    sharePost,
    handleDeletePost,
    handleConfirmDeletePost,
    handleClosePostModal,
    handleClosePlayingVideo,
    handleCloseFullScreenImage,
    handleCloseNotifications,
    handleRefreshNotifications,
    handleCloseShareModal,
    handleCloseComments,
  } = useFeedModals(setPosts, refreshNotifications);

  const { handlePostComment, handleLikeComment } = useFeedComments(
    selectedPost, setSelectedPost, currentUser, setPosts, playingVideo
  );

  const { isRestoringScroll, feedScrollRef, feedScrollContainer, setFeedScrollContainer } = useFeedScrollRestore(isLoading, posts);

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

  const unreadMessagesCount = useMemo(
    () => (globalConversations || []).reduce((acc, conv) => acc + (conv?.unreadCount || 0), 0),
    [globalConversations]
  );

  useEffect(() => {
    if (!feedScrollContainer || !hasMore) return;
    const sentinel = document.getElementById('feed-sentinel');
    if (!sentinel) return;
    let didRequest = false;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting) || isLoadingMore || didRequest) return;
        didRequest = true;
        void Promise.resolve(handleLoadMore()).finally(() => {
          didRequest = false;
        });
      },
      { threshold: 0, rootMargin: '240px 0px', root: feedScrollContainer }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [posts.length, hasMore, isLoadingMore, feedScrollContainer, handleLoadMore]);

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
  }, [currentUser, setPosts, setSelectedPost, setLikeAnimation]);

  const toggleSave = useCallback(async (postId: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!currentUser) {
      toast.error('Please sign in');
      throw new Error('User must be signed in to save posts');
    }
    let previousSaved = false;
    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
        previousSaved = post.isSaved;
        return { ...post, isSaved: !post.isSaved };
      }
      return post;
    }));
    setSelectedPost(prev => (prev && prev.id === postId) ? { ...prev, isSaved: !prev.isSaved } : prev);
    try {
      const saved = await toggleSavePost(postId, currentUser.id);
      setPosts(prev => prev.map(post => post.id === postId ? { ...post, isSaved: saved } : post));
      setSelectedPost(prev => (prev && prev.id === postId) ? { ...prev, isSaved: saved } : prev);
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      if (saved) toast.success('Post saved!');
    }
    catch (error) {
      console.error('Error toggling save:', error);
      setPosts(prev => prev.map(post => post.id === postId ? { ...post, isSaved: previousSaved } : post));
      setSelectedPost(prev => (prev && prev.id === postId) ? { ...prev, isSaved: previousSaved } : prev);
      toast.error('Failed to update saved post');
      throw error;
    }
  }, [currentUser, setPosts, setSelectedPost]);

  const handleEditCaption = useCallback(async (postId: number, caption: string) => {
    if (!currentUser) { toast.error('Please sign in'); return; }
    try {
      const updated = await updatePostCaption(postId, currentUser.id, caption);
      setPosts(prev => prev.map(p => p.id !== postId ? p : { ...p, content: { ...(p.content || {}), text: updated.content } } as Post));
      setSelectedPost(prev => { if (!prev || prev.id !== postId) return prev; return { ...prev, content: { ...(prev.content || {}), text: updated.content } } as Post; });
      queryClient.invalidateQueries({ queryKey: queryKeys.feed.root });
    } catch (e) { console.error(e); toast.error('Failed to update caption'); throw e; }
  }, [currentUser, setPosts, setSelectedPost]);

  const handleStartConversationLocal = useCallback(async (user: { name: string; username: string; avatar: string; verified: boolean; isOrganizer?: boolean }, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!currentUser) { toast.error('Please sign in to start a conversation'); return; }
    setSelectedPost(null);
    try {
      const conversation = await onStartConversation(user);
      if (conversation) {
        navigate(`/messages/${conversation.id}`, { state: { returnTo: currentRouteTarget } });
      } else {
        toast.error('Could not start conversation');
      }
    } catch (error) { console.error('Error starting conversation:', error); toast.error('Failed to start conversation'); }
  }, [currentRouteTarget, currentUser, navigate, onStartConversation]);

  const handleOpenUserProfile = useCallback((user: { id: string; name: string; username: string; avatar: string; verified: boolean; isOrganizer?: boolean; isOrganizerPage?: boolean }, e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigate(`/profile/${user.id}`);
  }, [navigate]);

  const handleUserBlocked = useCallback((userId: string) => {
    setPosts(prev => prev.filter(post => String(post.user?.id || post.user_id || '') !== String(userId)));
    setSelectedPost(prev => (prev && String(prev.user?.id || prev.user_id || '') === String(userId)) ? null : prev);
    setSelectedPostForComments(prev => (prev && String(prev.user?.id || prev.user_id || '') === String(userId)) ? null : prev);
    removeUserPostsFromFeedCache(userId);
    queryClient.invalidateQueries({ queryKey: queryKeys.feed.root });
  }, [setPosts, setSelectedPost, setSelectedPostForComments]);

  const filteredPosts = posts;

  const handlePostClick = useCallback((post: Post, startTime?: number, isMuted?: boolean) => {
    const scrollPos = feedScrollRef.current?.scrollTop ?? window.scrollY;
    sessionStorage.setItem('feedScrollPos', String(scrollPos));
    sessionStorage.setItem('feedLastPostId', post.id.toString());
    if (onViewPost) onViewPost({ ...post, startTime, isMuted } as Post);
  }, [onViewPost]);

  const handleViewComments = useCallback(async (post: Post) => {
    setSelectedPostForComments(post);
    setShowComments(true);
    try {
      const comments = await getPostComments(post.id);
      if (comments) {
        const mapped = comments.map((c) => ({
          id: c.id,
          user: {
            id: c.user?.id || c.user_id,
            name: c.user?.full_name || c.user?.username || 'User',
            username: c.user?.username || '',
            avatar: c.user?.avatar_url || '',
            verified: c.user?.verified || false,
            is_organizer: c.user?.is_organizer || false,
          },
          text: c.text, timestamp: formatTimeAgo(c.created_at), parent_id: c.parent_id, likes_count: c.likes_count || 0, is_liked: c.is_liked || false
        }));
        setPosts(prev => prev.map(p => p.id !== post.id ? p : { ...p, comments: mapped, comments_count: comments.length } as Post));
        setSelectedPostForComments(prev => { if (!prev || prev.id !== post.id) return prev; return { ...prev, comments: mapped, comments_count: comments.length } as Post; });
      }
    } catch (err) { console.error('Error fetching comments:', err); }
  }, [setPosts]);

  const onLikeId = useCallback((id: number) => toggleLike(id), [toggleLike]);
  const onSaveId = useCallback((id: number) => toggleSave(id), [toggleSave]);
  const onShareP = useCallback((p: Post) => sharePost(p), [sharePost]);
  const onMessageU = useCallback((user: Post['user']) => handleStartConversationLocal(user), [handleStartConversationLocal]);

  const handleToggleNotifications = useCallback(() => {
    setShowNotifications(prev => !prev);
  }, []);
  const handleToggleMessages = useCallback(() => {
    setShowNotifications(false);
    navigate('/messages', { state: { returnTo: currentRouteTarget } });
  }, [currentRouteTarget, navigate]);

  const isFeedPaused = useMemo(
    () => isPaused || !!selectedPost || !!playingVideo || !!fullScreenImage || showNotifications || showComments || showShareModal,
    [isPaused, selectedPost, playingVideo, fullScreenImage, showNotifications, showComments, showShareModal]
  );

  return (
    <>
      <div ref={feedContainerRef} className="relative h-[100dvh] overflow-hidden bg-gradient-to-b from-gray-50 to-white">
        <FeedHeader
          currentUser={currentUser}
          showNotifications={showNotifications}
          showMessages={false}
          unreadMessagesCount={unreadMessagesCount}
          notifications={notifications}
          onToggleNotifications={handleToggleNotifications}
          onToggleMessages={handleToggleMessages}
          showMessagesOrPost={!!selectedPost}
          scrollContainer={feedScrollContainer}
        />

        <FeedScroller
          feedScrollRef={feedScrollRef}
          setFeedScrollContainer={setFeedScrollContainer}
          feedHeaderHeight={feedHeaderHeight}
          isRestoringScroll={isRestoringScroll}
          isLoading={isLoading}
          filteredPosts={filteredPosts}
          hasMore={hasMore}
          isLoadingMore={isLoadingMore}
          isPaused={isFeedPaused}
          currentUserId={currentUser?.id}
          onProfileClick={handleOpenUserProfile}
          onLike={onLikeId}
          onSave={onSaveId}
          onShare={onShareP}
          onMessage={onMessageU}
          onUserBlocked={handleUserBlocked}
          onDelete={handleDeletePost}
          onEditCaption={handleEditCaption}
          onViewPost={handlePostClick}
          onViewComments={handleViewComments}
        />
      </div>

      <FeedModals
        selectedPost={selectedPost}
        onClosePostModal={handleClosePostModal}
        currentUser={currentUser}
        currentUserProfile={currentUserProfile}
        onLike={toggleLike}
        onSave={toggleSave}
        onShare={sharePost}
        onDelete={handleDeletePost}
        onEditCaption={handleEditCaption}
        onProfileClick={handleOpenUserProfile}
        onComment={handlePostComment}
        onLikeComment={handleLikeComment}
        showNotifications={showNotifications}
        notifications={notifications}
        setNotifications={setNotifications}
        notificationsLoading={notificationsLoading}
        onCloseNotifications={handleCloseNotifications}
        onRefreshNotifications={handleRefreshNotifications}
        likeAnimation={likeAnimation}
        playingVideo={playingVideo}
        onClosePlayingVideo={handleClosePlayingVideo}
        fullScreenImage={fullScreenImage}
        posts={posts}
        setPosts={setPosts}
        onCloseFullScreenImage={handleCloseFullScreenImage}
        showShareModal={showShareModal}
        shareModalData={shareModalData}
        onCloseShareModal={handleCloseShareModal}
        showComments={showComments}
        selectedPostForComments={selectedPostForComments}
        onCloseComments={handleCloseComments}
        onOpenUserProfile={handleOpenUserProfile}
        pendingDeletePostId={pendingDeletePostId}
        setPendingDeletePostId={setPendingDeletePostId}
        onConfirmDeletePost={handleConfirmDeletePost}
      />

      <FeedAnimationStyles />
    </>
  );
}