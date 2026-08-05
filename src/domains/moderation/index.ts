// Moderation Domain Index
// Manages: Reports, blocks, content review

// API
export {
  getBlockedUserIds,
  reportContent,
  blockUser,
  unblockUser,
  assertUsersCanInteract,
} from './api/moderation';

// Types
export type { ReportContentType } from './api/moderation';

// Constants
export const DOMAIN_NAME = 'moderation';
