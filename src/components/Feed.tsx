import { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from 'react';
// Profile navigation updated to use unified /profile/:userId route
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '../utils/supabase/client';
import { toggleLikePost, toggleSavePost, createPostComment, incrementPostView, deletePost, getPostComments, toggleLikeComment, updatePostCaption } from '../utils/supabase/api';
import { formatTimeAgo } from '../utils/format';
import { Post, HighlightClip, Conversation } from '../types';
import { PostDetailModal } from './PostDetailModal';
import { handleShare } from '../utils/share';
import { removePostFromFeedCache, removeUserPostsFromFeedCache, useFeedData } from '../hooks/useFeedData';

import { ShareModal } from './ShareModal';
import { FeedHeader } from './FeedHeader';
import { CommentsSheet } from './CommentsSheet';

// Sub-components
import { NotificationsPanel } from './feed/NotificationsPanel';
import { VideoPlayerOverlay } from './feed/VideoPlayerOverlay';
import { FullScreenImageModal } from './feed/FullScreenImageModal';
import { LikeAnimation, FeedAnimationStyles } from './feed/FeedAnimations';
import { FeedContent } from './feed/FeedContent';

type RouteTarget = {
  pathname: string;
  search?: string;
  hash?: string;
  state?: unknown;
};

interface FeedProps {
  conversations: Conversation[];
  onStartConversation: (user: { name: string; username?: string; avatar: string; verified: boolean; isOrganizer?: boolean; id?: string }) => Promise<Conversation | null | undefined> | Conversation | null;
  currentUser?: any;
  onViewPost?: (post: any) => void;
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
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [selectedPostForComments, setSelectedPostForComments] = useState<Post | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareModalData, setShareModalData] = useState<{ title: string; text: string; url?: string } | null>(null);
  const [likeAnimation, setLikeAnimation] = useState<{ show: boolean; x: number; y: number }>({ show: false, x: 0, y: 0 });
  const [playingVideo, setPlayingVideo] = useState<{ postId: number; clipIndex: number; clips: HighlightClip[] } | null>(null);
  const [fullScreenImage, setFullScreenImage] = useState<{ images: string[]; currentIndex: number; postId: number } | null>(null);
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
    notifications,
    notificationsLoading,
    currentUserProfile,
    handleLoadMore,
    refreshNotifications,
    setNotifications,
  } = useFeedData(propCurrentUser);

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
    if (selectedPost) {
      incrementPostView(selectedPost.id);
      const fetchComments = async () => {
        try {
          const comments = await getPostComments(selectedPost.id);
          const mappedComments = (comments || []).map((c: any) => ({
            id: c.id,
            user: {
              id: c.user?.id || c.user_id,
              name: c.user?.full_name || c.user?.username || 'User',
              username: c.user?.username || '',
              avatar: c.user?.avatar_url || '',
              verified: c.user?.verified || false,
              is_organizer: c.user?.is_organizer || false,
            },
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
              user: {
                id: c.user?.id || c.user_id,
                name: c.user?.full_name || c.user?.username || 'User',
                username: c.user?.username || '',
                avatar: c.user?.avatar_url || '',
                verified: c.user?.verified || false,
                is_organizer: c.user?.is_organizer || false,
              },
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
  }, [currentUser, setPosts]);

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
      window.dispatchEvent(new Event('savedPostsUpdated'));
      if (saved) toast.success('Post saved!');
    }
    catch (error) {
      console.error('Error toggling save:', error);
      setPosts(prev => prev.map(post => post.id === postId ? { ...post, isSaved: previousSaved } : post));
      setSelectedPost(prev => (prev && prev.id === postId) ? { ...prev, isSaved: previousSaved } : prev);
      toast.error('Failed to update saved post');
      throw error;
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
    try {
      await deletePost(postId);
      removePostFromFeedCache(postId);
      window.dispatchEvent(new CustomEvent('postsUpdated', { detail: { deletedPostId: postId } }));
      toast.success('Post deleted');
    }
    catch (error) { console.error('Error deleting post:', error); toast.error('Failed to delete post'); setPosts(previousPosts); }
  }, [setPosts]);

  const handlePostComment = useCallback(async (postId: number, text: string, parentId?: number) => {
    if (!text || !text.trim()) return;
    if (!currentUser) { toast.error('Please sign in to comment'); return; }
    try {
      const newCommentData = await createPostComment(postId, currentUser.id, text.trim(), parentId);
      const newComment: any = {
        id: newCommentData.id,
        user: {
          id: newCommentData.user?.id || currentUser.id,
          name: newCommentData.user?.full_name || newCommentData.user?.username || 'Unknown',
          username: newCommentData.user?.username || '',
          avatar: newCommentData.user?.avatar_url,
          verified: newCommentData.user?.verified || false,
          is_organizer: newCommentData.user?.is_organizer || false,
        },
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
    window.dispatchEvent(new Event('postsUpdated'));
  }, [setPosts]);

  const filteredPosts = posts;

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

  // Stable header callbacks
  const handleToggleNotifications = useCallback(() => {
    setShowNotifications(prev => !prev);
  }, []);
  const handleToggleMessages = useCallback(() => {
    setShowNotifications(false);
    navigate('/messages', { state: { returnTo: currentRouteTarget } });
  }, [currentRouteTarget, navigate]);

  // Stable post-detail-modal callbacks
  const handleClosePostModal = useCallback(() => setSelectedPost(null), []);
  const handleClosePlayingVideo = useCallback(() => setPlayingVideo(null), []);
  const handleCloseFullScreenImage = useCallback(() => setFullScreenImage(null), []);
  const handleCloseNotifications = useCallback(() => setShowNotifications(false), []);
  const handleRefreshNotifications = useCallback(() => refreshNotifications({ silent: true }), [refreshNotifications]);
  const handleCloseShareModal = useCallback(() => {
    setShowShareModal(false);
    setShareModalData(null);
  }, []);
  const handleCloseComments = useCallback(() => {
    setShowComments(false);
    setSelectedPostForComments(null);
  }, []);

  // Memoized derived value to avoid recomputing isPaused on every render
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

        <div
          ref={(el) => {
            (feedScrollRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
            setFeedScrollContainer(el);
          }}
          className="h-[100dvh] overflow-y-auto overscroll-behavior-y-contain touch-pan-y"
          style={{
            paddingTop: feedHeaderHeight > 0 ? `${feedHeaderHeight}px` : '7rem',
            WebkitOverflowScrolling: 'touch',
            visibility: isRestoringScroll ? 'hidden' : 'visible',
            pointerEvents: isRestoringScroll ? 'none' : 'auto',
          }}
        >
          <div id="top-sentinel" className="w-full h-px pointer-events-none" />
          <div className="max-w-2xl xl:max-w-[640px] mx-auto px-3 pt-3 pb-[calc(6.5rem+var(--eventz-safe-area-bottom))] space-y-0">
            <FeedContent
              isLoading={isLoading}
              filteredPosts={filteredPosts}
              isRestoringScroll={isRestoringScroll}
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
        </div>
      </div>

      {/* Post Detail Modal */}
      {selectedPost && (
        <PostDetailModal
          post={selectedPost}
          currentUser={currentUser}
          currentUserProfile={currentUserProfile}
          onClose={handleClosePostModal}
          onLike={toggleLike}
          onSave={toggleSave}
          onShare={sharePost}
          onDelete={handleDeletePost}
          onEditCaption={handleEditCaption}
          onProfileClick={handleOpenUserProfile}
          onComment={handlePostComment}
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
          onClose={handleCloseNotifications}
          onRefreshNotifications={handleRefreshNotifications}
        />
      )}

      <LikeAnimation show={likeAnimation.show} x={likeAnimation.x} y={likeAnimation.y} />

      {playingVideo && (
        <VideoPlayerOverlay
          playingVideo={playingVideo}
          onClose={handleClosePlayingVideo}
        />
      )}

      {fullScreenImage && (
        <FullScreenImageModal
          images={fullScreenImage.images}
          currentIndex={fullScreenImage.currentIndex}
          postId={fullScreenImage.postId}
          posts={posts}
          setPosts={setPosts}
          onClose={handleCloseFullScreenImage}
        />
      )}

      {shareModalData && (
        <ShareModal
          isOpen={showShareModal}
          onClose={handleCloseShareModal}
          title={shareModalData.title}
          text={shareModalData.text}
          url={shareModalData.url}
        />
      )}

      {showComments && selectedPostForComments && (
        <CommentsSheet
          isOpen={showComments}
          onClose={handleCloseComments}
          post={selectedPostForComments}
          currentUser={currentUser}
          userProfile={currentUserProfile}
          onComment={handlePostComment}
          onLikeComment={handleLikeComment}
          onOpenUserProfile={handleOpenUserProfile}
        />
      )}

      <FeedAnimationStyles />
    </>
  );
}
