import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PostDetailPage } from './PostDetailPage';
import { getPostById, toggleLikePost, toggleSavePost, deletePost, createPostComment, toggleLikeComment, updatePostCaption } from '../utils/supabase/api';
import { handleShare } from '../utils/share';
import { toast } from 'sonner';
import { formatTimeAgo } from '../utils/format';
import { supabase } from '../utils/supabase/client';
import { useAuth } from '../contexts/AuthContext';
import { DetailPageSkeleton } from './skeletons/PageSkeletons';

const POST_DETAIL_KEY = (id: number, userId?: string) => ['post', 'detail', id, userId || 'anon'] as const;

function formatFetchedPost(fetchedPost: any) {
  const isVideo = (url?: string) => {
    if (!url) return false;
    const cleaned = url.split('#')[0].split('?')[0];
    return /\.(mp4|webm|ogg|ogv|mov|m4v|hevc|3gp|3gpp)$/i.test(cleaned);
  };

  const isOrganizerPage = !!fetchedPost.posted_as_organizer;
  const displayName = fetchedPost.user?.full_name || fetchedPost.user?.username || 'Unknown User';
  const avatarUrl = fetchedPost.user?.avatar_url;

  return {
    id: fetchedPost.id,
    user_id: fetchedPost.user_id,
    user: {
      id: fetchedPost.user?.id || 'unknown',
      name: displayName || 'Unknown',
      username: fetchedPost.user?.username || '@unknown',
      avatar: avatarUrl || '',
      verified: fetchedPost.user?.verified || false,
      isOrganizer: fetchedPost.user?.is_organizer || false,
      isOrganizerPage,
    },
    event: fetchedPost.event ? {
      id: fetchedPost.event.id,
      name: fetchedPost.event.title,
      date: fetchedPost.event.date,
      time: fetchedPost.event.time,
      location: fetchedPost.event.location,
      image: fetchedPost.event.image_url,
      price: fetchedPost.event.price_range,
    } : undefined,
    content: {
      text: fetchedPost.content,
      images: fetchedPost.image_urls,
      image: fetchedPost.image_urls?.[0],
      hashtags: fetchedPost.hashtags,
    },
    timestamp: formatTimeAgo(fetchedPost.created_at),
    likes: fetchedPost.likes_count || 0,
    comments: [] as any[],
    comments_count: fetchedPost.comments_count || 0,
    shares: 0,
    views: fetchedPost.views || 0,
    isLiked: fetchedPost.is_liked || false,
    isSaved: fetchedPost.is_saved || false,
    isHighlight: !!fetchedPost.video_url,
    highlights: fetchedPost.video_url ? [{
      id: fetchedPost.id,
      thumbnail: (fetchedPost.image_urls?.find((url: string) => !isVideo(url))) || 'https://images.unsplash.com/photo-1516280440614-6697288d5d38?w=300&h=500&fit=crop',
      duration: fetchedPost.duration || '',
      title: fetchedPost.content || 'Video Highlight',
      videoUrl: fetchedPost.video_url,
      views: fetchedPost.views || 0,
    }] : undefined,
    mutualFriends: [],
  };
}

function PostErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6 text-center">
      <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
        <span className="text-red-500 text-2xl font-bold">!</span>
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">Could not load post</h2>
      <p className="text-gray-500 mb-6 max-w-sm">The post may have been deleted or is temporarily unavailable.</p>
      <button
        onClick={onRetry}
        className="rounded-full bg-[#8A2BE2] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#7C3AED]"
      >
        Try again
      </button>
    </div>
  );
}

export function PostDetailWrapper() {
  const { user: currentUser, profile: userProfile } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const postId = id ? parseInt(id, 10) : null;
  const initialPost = location.state?.post || null;
  const startTime = location.state?.startTime || 0;
  const initialMuted = location.state?.isMuted !== undefined ? location.state.isMuted : false;

  const postQuery = useQuery({
    queryKey: POST_DETAIL_KEY(postId ?? 0, currentUser?.id),
    queryFn: async () => {
      if (!postId) throw new Error('Invalid post ID');
      const fetched = await getPostById(postId, currentUser?.id);
      if (!fetched) throw new Error('Post not found');
      return formatFetchedPost(fetched);
    },
    enabled: !!postId && !isNaN(postId),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: 2,
    initialData: initialPost,
    initialDataUpdatedAt: initialPost ? Date.now() - 1000 : undefined,
  });

  const [post, setPost] = useState<any>(postQuery.data);

  useEffect(() => {
    if (postQuery.data) {
      setPost(postQuery.data);
    }
  }, [postQuery.data]);

  useEffect(() => {
    if (!post || post.comments.length > 0) return;
    (async () => {
      try {
        const { data: commentsData } = await supabase
          .from('post_comments')
          .select('*, user:profiles(*)')
          .eq('post_id', post.id)
          .order('created_at', { ascending: true });
        if (commentsData) {
          const comments = commentsData.map((c: any) => ({
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
            timestamp: formatTimeAgo(c.created_at),
          }));
          setPost((prev: any) => prev ? { ...prev, comments, comments_count: comments.length } : prev);
        }
      } catch {
      }
    })();
  }, [post?.id]);

  const handleComment = async (commentPostId: number, text: string, parentId?: number) => {
    if (!currentUser) {
      toast.error('Please sign in to comment');
      return;
    }
    try {
      const newCommentData = await createPostComment(commentPostId, currentUser.id, text, parentId);
      const displayName = userProfile?.full_name || currentUser.user_metadata?.full_name || userProfile?.username || 'User';
      const displayAvatar = userProfile?.avatar_url || currentUser.user_metadata?.avatar_url || '';
      const newComment = {
        id: newCommentData.id,
        user: {
          id: newCommentData.user?.id || currentUser.id,
          name: displayName,
          username: newCommentData.user?.username || userProfile?.username || '',
          avatar: displayAvatar,
          verified: newCommentData.user?.verified || userProfile?.verified || false,
          is_organizer: userProfile?.is_organizer || false,
        },
        text: newCommentData.text,
        timestamp: 'Just now',
        parent_id: newCommentData.parent_id,
        likes_count: 0,
        is_liked: false,
      };
      setPost((prev: any) => prev ? {
        ...prev,
        comments: [...(prev.comments || []), newComment],
        comments_count: (prev.comments_count || 0) + 1,
      } : prev);
      toast.success('Comment posted');
    } catch (error) {
      toast.error('Failed to post comment');
    }
  };

  const handleLikeComment = async (commentId: number) => {
    if (!currentUser) return;
    try {
      const isLiked = await toggleLikeComment(commentId, currentUser.id);
      setPost((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          comments: (prev.comments || []).map((c: any) =>
            c.id === commentId ? {
              ...c, is_liked: isLiked,
              likes_count: isLiked ? (c.likes_count || 0) + 1 : Math.max(0, (c.likes_count || 0) - 1),
            } : c
          ),
        };
      });
    } catch (e) { console.error(e); }
  };

  const handleEditCaption = async (captionPostId: number, caption: string) => {
    if (!currentUser) {
      toast.error('Please sign in');
      return;
    }
    const updated = await updatePostCaption(captionPostId, currentUser.id, caption);
    setPost((prev: any) => {
      if (!prev) return prev;
      const next = { ...prev };
      if (next.content && typeof next.content === 'object') {
        next.content = { ...next.content, text: updated.content };
      } else {
        next.content = updated.content;
      }
      return next;
    });
    window.dispatchEvent(new Event('postsUpdated'));
  };

  if (postQuery.isPending) {
    return <DetailPageSkeleton />;
  }

  if (postQuery.isError) {
    return <PostErrorState onRetry={() => postQuery.refetch()} />;
  }

  if (!post) return null;

  return (
    <>
    <PostDetailPage
      post={post}
      currentUser={currentUser}
      userProfile={userProfile}
      onBack={() => {
        if (window.history.length > 2) {
            navigate(-1);
        } else {
            navigate('/feed');
        }
      }}
      onLike={async (likePostId) => {
        if (!currentUser) return;
        try {
          await toggleLikePost(likePostId, currentUser.id);
          setPost((prev: any) => prev ? {
            ...prev,
            isLiked: !prev.isLiked,
            likes: prev.isLiked ? prev.likes - 1 : prev.likes + 1,
          } : prev);
        } catch (e) { console.error(e); }
      }}
      onSave={async (savePostId) => {
        if (!currentUser) return;
        try {
          const saved = await toggleSavePost(savePostId, currentUser.id);
          setPost((prev: any) => prev ? { ...prev, isSaved: saved } : prev);
          window.dispatchEvent(new Event('savedPostsUpdated'));
        } catch (e) { console.error(e); }
      }}
      onEditCaption={handleEditCaption}
      onShare={async (sharePost) => {
        const shareTitle = `Check out this post from ${sharePost?.user?.name || 'a user'}`;
        const shareText = sharePost?.content?.text || 'Check out this amazing post on EVENTZ!';
        await handleShare({
          title: shareTitle,
          text: shareText,
          url: `${window.location.origin}/post/${sharePost?.id}`,
        });
      }}
      onDelete={async (deletePostId) => {
        try {
          await deletePost(deletePostId);
          toast.success('Post deleted');
          navigate('/feed');
        } catch (e) {
          toast.error('Failed to delete post');
        }
      }}
      onProfileClick={(user) => {
        if (user && user.id) {
          navigate(`/profile/${user.id}`);
        } else {
          toast.error('Could not find user profile');
        }
      }}
      onComment={handleComment}
      onLikeComment={handleLikeComment}
      startTime={startTime}
      initialMuted={initialMuted}
    />
    </>
  );
}
