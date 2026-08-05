// Streaming Domain Index
// Manages: Live streams, VOD, stream chat, Agora integration

// API
export { getStreamMessages, sendStreamMessage, subscribeToStreamMessages } from './api/streamChat';
export { getProfileStreamedVideos } from './api/streams';

// Types
export type { StreamMessage } from './api/streamChat';
export type { CloudflareStream } from './api/streams';

// Constants
export const DOMAIN_NAME = 'streaming';
