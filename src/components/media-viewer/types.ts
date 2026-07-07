export interface Photo {
  id: number;
  url: string;
  likes?: number;
  eventName?: string;
  isPost?: boolean;
  postId?: number;
  isLiked?: boolean;
  fallbackSrc?: string;
}

export interface VideoClip {
  id: number;
  thumbnail: string;
  views?: number;
  likes?: number;
  videoUrl: string;
  eventName?: string;
  isPost?: boolean;
  postId?: number;
  isLiked?: boolean;
}
