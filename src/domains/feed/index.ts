// Feed Domain Index
// Manages: Posts, comments, likes, shares, hashtags

// API
export {
  incrementPostView,
  getPosts,
  getProfilePostsGrid,
  getPostById,
  deletePost,
  createPost,
  updatePostCaption,
  toggleLikePost,
  toggleSavePost,
  getPostComments,
  createPostComment,
  toggleLikeComment,
} from './api/posts';

// Types
export type { ApiPost, PostComment, Post } from './types';

// Constants
export const DOMAIN_NAME = 'feed';
