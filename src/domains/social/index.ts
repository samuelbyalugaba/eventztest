// Social Domain Index
// Manages: Follows, mutual follows, online presence

// API
export {
  getFollowedUserIds,
  checkIsFollowing,
  toggleFollow,
  getFollowersCount,
  getFollowingCount,
  followUser,
  unfollowUser,
  isFollowing,
  getFollowers,
  getFollowing,
  getMutualFollows,
  subscribeToOnlineUsers,
} from './api/follows';

// Constants
export const DOMAIN_NAME = 'social';
