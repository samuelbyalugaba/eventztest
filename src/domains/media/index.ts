// Media Domain Index
// Manages: File uploads, storage, user media gallery

// API
export { getUserMedia, incrementUserMediaView } from './api/userMedia';
export { deleteFile, uploadImage } from './api/storage';

// Types
export type { UserMedia } from './api/userMedia';

// Constants
export const DOMAIN_NAME = 'media';
