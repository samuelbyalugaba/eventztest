import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { PostDetailPage } from './PostDetailPage';
import { getPostById, toggleLikePost, toggleSavePost, deletePost, createPostComment } from '../utils/supabase/api';
import { handleShare } from '../utils/share';
import { toast } from 'sonner';
import { formatTimeAgo } from '../utils/format';

interface PostDetailWrapperProps {
  currentUser: any;
  userProfile?: any;
}

export function PostDetailWrapper({ currentUser, userProfile }: PostDetailWrapperProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [post, setPost] = useState<any>(location.state?.post || null);
  const [loading, setLoading] = useState(!post);

  useEffect(() => {
    const fetchPost = async () => {
      if (!id) return;
      if (post && String(post.id) === id) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        const fetchedPost = await getPostById(parseInt(id), currentUser?.id);
        
        // Format the post to match component expectations
        const isVideo = (url?: string) => {
          if (!url) return false;
          return /\.(mp4|webm|ogg|mov)$/i.test(url);
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
            comments: [], // Comments are fetched separately in PostDetailPage usually, or we need to fetch them? 
                          // Wait, PostDetailPage displays comments from post.comments array. 
                          // getPostById returns comments count but not full comments array unless we join differently.
                          // But getPostById uses: comments:post_comments(count)
                          // PostDetailPage tries to map post.comments.
                          // The original getPosts also only returned count. 
                          // Ah, PostDetailPage handles comments? 
                          // Let's check PostDetailPage again. 
                          // It maps `post.comments`.
                          // But `getPosts` returns `comments:post_comments(count)`.
                          // So `post.comments` would be `[{count: 5}]`.
                          // This implies `PostDetailPage` might be broken for comments list unless `post.comments` is populated elsewhere.
                          // Wait, looking at `PostDetailPage.tsx`:
                          // It says: `post.comments.map((comment: any) => ...)`
                          // This means `post.comments` MUST be an array of comment objects.
                          // But `getPosts` only fetches count.
                          // Where are comments fetched?
                          // In `App.tsx`, `prefetchFeed` maps comments to `[]`.
                          // So by default comments are empty.
                          // `PostDetailPage` doesn't fetch comments itself?
                          // Let's re-read `PostDetailPage.tsx`.
                          // It renders `post.comments.map(...)`.
                          // It does NOT have a `useEffect` to fetch comments.
                          // This means comments were missing in the feed view?
                          // Yes, `prefetchFeed` sets `comments: []`.
                          // So currently comments are not shown?
                          // Or maybe `PostDetailPage` was expecting them to be passed.
                          // But `App.tsx` didn't fetch them.
                          // Maybe I should fetch comments here in Wrapper.
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
        const { data: commentsData } = await import('../utils/supabase/api').then(m => m.supabase
            .from('post_comments')
            .select('*, user:profiles(*)')
            .eq('post_id', fetchedPost.id)
            .order('created_at', { ascending: true })
        );
        
        if (commentsData) {
             formattedPost.comments = commentsData.map((c: any) => ({
                 id: c.id,
                 text: c.text,
                 timestamp: formatTimeAgo(c.created_at),
                 user: {
                     name: c.user?.full_name || 'User',
                     avatar: c.user?.avatar_url || '',
                     is_organizer: c.user?.is_organizer || false
                 }
             }));
        }

        setPost(formattedPost);
      } catch (error) {
        console.error('Error fetching post:', error);
        toast.error('Failed to load post');
        navigate('/feed');
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [id, currentUser]);

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
      onShare={async (post) => {
        const shareTitle = `Check out this post from ${post?.user?.name || 'a user'}`;
        const shareText = post?.content?.text || 'Check out this amazing post on EVENTZ!';
        await handleShare({
          title: shareTitle,
          text: shareText,
          url: window.location.href,
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
        // Navigate to profile (placeholder for now, or implement profile route)
        navigate('/profile'); 
      }}
      onComment={async (postId, text) => {
        if (!currentUser) return;
        try {
          const newComment = await createPostComment(postId, currentUser.id, text);
          toast.success('Comment posted');
          
          // Add comment to state
          const formattedComment = {
             id: newComment.id,
             text: newComment.text,
             timestamp: 'Just now',
             user: {
                 name: currentUser.user_metadata?.full_name || 'You',
                 avatar: currentUser.user_metadata?.avatar_url || '',
                 is_organizer: false // approximate
             }
          };
          
          setPost((prev: any) => ({
             ...prev,
             comments: [...(prev.comments || []), formattedComment],
             comments_count: (prev.comments_count || 0) + 1
          }));
        } catch (e) {
          console.error(e);
          toast.error('Failed to post comment');
        }
      }}
    />
  );
}
