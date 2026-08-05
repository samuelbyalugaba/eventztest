// Media Domain Types
// Manages: File uploads, storage, user media gallery

export interface UserMedia {
  id: number;
  user_id: string;
  url: string;
  type: string;
  created_at: string;
}
