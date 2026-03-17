import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { PostDetailPage } from './PostDetailPage';
import { getPostById, toggleLikePost, toggleSavePost, deletePost, createPostComment, toggleLikeComment, updatePostCaption } from '../utils/supabase/api';
import { handleShare } from '../utils/share';
import { toast } from 'sonner';
import { formatTimeAgo } from '../utils/format';
import { supabase } from '../utils/supabase/client';

interface PostDetailWrapperProps {
  currentUser: any;
  userProfile?: any;
}

export function PostDetailWrapper({ currentUser, userProfile }: PostDetailWrapperProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [post, setPost] = useState<any>(location.state?.post || null);
  const startTime = location.state?.startTime || 0;
  const initialMuted = location.state?.isMuted !== undefined ? location.state.isMuted : false;
  const [loading, setLoading] = useState(!post);

  useEffect(() => {
    const fetchPost = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const fetchedPost = await getPostById(parseInt(id), currentUser?.id);
        
        // Format the post to match component expectations
        const isVideo = (url?: string) => {
          if (!url) return false;
          const cleaned = url.split('#')[0].split('?')[0];
          return /\.(mp4|webm|ogg|mov)$/i.test(cleaned);
        };
        
        const isOrganizerPage = !!fetchedPost.posted_as_organizer;
        const displayName = fetchedPost.user?.full_name || fetchedPost.user?.username || 'Unknown User';
        const avatarUrl = fetchedPost.user?.avatar_url;

        const formattedPost = {
            id: fetchedPost.id,
            user_id: fetchedPost.user_id,
            user: {
              id: fetchedPost.user?.id || 'unknown',
              name: displayName || 'Unknown',
              username: fetchedPost.user?.username || '@unknown',
              avatar: avatarUrl || '',
              verified: fetchedPost.user?.verified || false,
              isOrganizer: fetchedPost.user?.is_organizer || false,
              isOrganizerPage: isOrganizerPage
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
        
        // Fetch comments for this post
        const { data: commentsData } = await supabase
          .from('post_comments')
          .select('*, user:profiles(*)')
          .eq('post_id', fetchedPost.id)
          .order('created_at', { ascending: true });
        
        if (commentsData) {
             formattedPost.comments = commentsData.map((c: any) => ({
                 id: c.id,
                 user: {
                   name: c.user?.full_name || c.user?.username || 'User',
                   avatar: c.user?.avatar_url || '',
                   is_organizer: c.user?.is_organizer || false
                 },
                 text: c.text,
                 timestamp: formatTimeAgo(c.created_at)
             }));
        }

        setPost(formattedPost);
      } catch (error) {
        console.error('Error fetching post detail:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [id, currentUser?.id]);

  const handleComment = async (postId: number, text: string, parentId?: number) => {
    if (!currentUser) {
      toast.error('Please sign in to comment');
      return;
    }

    try {
      const newCommentData = await createPostComment(postId, currentUser.id, text, parentId);
      
      // Use userProfile for the most up-to-date name/avatar, fallback to metadata
      const displayName = userProfile?.full_name || currentUser.user_metadata?.full_name || userProfile?.username || 'User';
      const displayAvatar = userProfile?.avatar_url || currentUser.user_metadata?.avatar_url || '';

      const newComment = {
        id: newCommentData.id,
        user: {
          name: displayName,
          avatar: displayAvatar,
          is_organizer: userProfile?.is_organizer || false
        },
        text: newCommentData.text,
        timestamp: 'Just now',
        parent_id: newCommentData.parent_id,
        likes_count: 0,
        is_liked: false
      };

      setPost((prev: any) => prev ? {
        ...prev,
        comments: [...(prev.comments || []), newComment],
        comments_count: (prev.comments_count || 0) + 1
      } : null);

      toast.success('Comment posted');
    } catch (error) {
      console.error('Error posting comment:', error);
      toast.error('Failed to post comment');
    }
  };

  const handleLikeComment = async (commentId: number) => {
    if (!currentUser) return;
    try {
      const isLiked = await toggleLikeComment(commentId, currentUser.id);
      setPost((prev: any) => {
        if (!prev) return null;
        return {
          ...prev,
          comments: (prev.comments || []).map((c: any) => {
            if (c.id === commentId) {
              return {
                ...c,
                is_liked: isLiked,
                likes_count: isLiked ? (c.likes_count || 0) + 1 : Math.max(0, (c.likes_count || 0) - 1)
              };
            }
            return c;
          })
        };
      });
    } catch (e) { console.error(e); }
  };

  const handleEditCaption = async (postId: number, caption: string) => {
    if (!currentUser) {
      toast.error('Please sign in');
      return;
    }
    const updated = await updatePostCaption(postId, currentUser.id, caption);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!post) return null;

  return (
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
      onLike={async (id) => {
        if (!currentUser) return;
        try {
          await toggleLikePost(id, currentUser.id);
          setPost((prev: any) => ({
             ...prev,
             isLiked: !prev.isLiked,
             likes: prev.isLiked ? prev.likes - 1 : prev.likes + 1
          }));
        } catch (e) { console.error(e); }
      }}
      onSave={async (id) => {
        if (!currentUser) return;
        try {
          await toggleSavePost(id, currentUser.id);
          setPost((prev: any) => ({
             ...prev,
             isSaved: !prev.isSaved
          }));
        } catch (e) { console.error(e); }
      }}
      onEditCaption={handleEditCaption}
      onShare={async (post) => {
        const shareTitle = `Check out this post from ${post?.user?.name || 'a user'}`;
        const shareText = post?.content?.text || 'Check out this amazing post on EVENTZ!';
        await handleShare({
          title: shareTitle,
          text: shareText,
          url: `${window.location.origin}/post/${post?.id}`,
        });
      }}
      onDelete={async (id) => {
        try {
          await deletePost(id);
          toast.success('Post deleted');
          navigate('/feed');
        } catch (e) {
          console.error(e);
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
  );
}
