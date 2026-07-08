import { useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import type { Post, HighlightClip } from '../types';
import { incrementPostView, getPostComments, createPostComment, toggleLikeComment } from '../utils/supabase/api';
import { formatTimeAgo } from '../utils/format';
import { supabase } from '../utils/supabase/client';

export type MappedComment = {
  id: number;
  user: { id: string; name: string; username: string; avatar: string; verified: boolean; is_organizer: boolean };
  text: string; timestamp: string; parent_id?: number; likes_count: number; is_liked: boolean;
};

export function useFeedComments(
  selectedPost: Post | null,
  setSelectedPost: React.Dispatch<React.SetStateAction<Post | null>>,
  currentUser?: { id: string } | null,
  setPosts?: React.Dispatch<React.SetStateAction<Post[]>>,
  playingVideo?: { postId: number; clipIndex: number; clips: HighlightClip[] } | null,
) {
  useEffect(() => {
    if (selectedPost) {
      incrementPostView(selectedPost.id);
      const fetchComments = async () => {
        try {
          const comments = await getPostComments(selectedPost.id);
          const mappedComments = (comments || []).map((c) => ({
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
    if (selectedPost && (!selectedPost.comments || selectedPost.comments.length === 0) && (selectedPost.comments_count || 0) > 0) {
      const fetchComments = async () => {
        try {
          const { data: commentsData } = await supabase
            .from('post_comments')
            .select('*, user:profiles(*)')
            .eq('post_id', selectedPost.id)
            .order('created_at', { ascending: true });
          if (commentsData) {
            const mappedComments = commentsData.map((c) => ({
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

  useEffect(() => {
    if (playingVideo) {
      const currentClip = playingVideo.clips[playingVideo.clipIndex];
      incrementPostView(currentClip.id);
    }
  }, [playingVideo?.clipIndex, playingVideo?.clips]);

  const handlePostComment = useCallback(async (postId: number, text: string, parentId?: number) => {
    if (!text || !text.trim()) return;
    if (!currentUser) { toast.error('Please sign in to comment'); return; }
    try {
      const newCommentData = await createPostComment(postId, currentUser.id, text.trim(), parentId);
      const newComment: MappedComment = {
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
      setPosts?.(prev => prev.map(post => post.id === postId ? { ...post, comments: [...(post.comments || []), newComment], comments_count: (post.comments_count || 0) + 1 } : post));
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
        return { ...prev, comments: (prev.comments || []).map((c) => c.id === commentId ? { ...c, is_liked: isLiked, likes_count: isLiked ? (c.likes_count || 0) + 1 : Math.max(0, (c.likes_count || 0) - 1) } : c) };
      });
    } catch (e) { console.error('Error liking comment:', e); toast.error('Failed to update like'); }
  }, [currentUser]);

  return { handlePostComment, handleLikeComment };
}
