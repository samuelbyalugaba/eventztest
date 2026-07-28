// Identity Domain Index
// Manages: Users, profiles, authentication, authorization

// API
export { onAuthStateChange, updateUserEmail, deleteAccount, signOut } from './api/auth';
export { getProfile, updateProfile, checkUsernameUnique, becomeOrganizer, searchProfiles } from './api/profile';

// Types
export type { Profile, OrganizerProfile } from './types';

// Constants
export const DOMAIN_NAME = 'identity';
