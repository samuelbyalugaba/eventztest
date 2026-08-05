// Streaming Domain Types
// Manages: Live streams, VOD, stream chat, Agora integration

export interface StreamMessage {
  id: number;
  event_id: number;
  user_id: string;
  message: string;
  created_at: string;
}

export interface CloudflareStream {
  id: string;
  uid: string;
  name: string;
  status: {
    state: string;
    pctComplete: number;
  };
  playback: {
    hls: string;
    dash: string;
  };
  created: string;
  modified: string;
}
