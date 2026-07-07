import { useEffect } from 'react';
import type { Post } from '../types';
import { incrementPostView, getPostComments } from '../utils/supabase/api';
import { formatTimeAgo } from '../utils/format';
import { supabase } from '../utils/supabase/client';

export function useFeedComments(
  selectedPost: Post | null,
  setSelectedPost: React.Dispatch<React.SetStateAction<Post | null>>
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
}
