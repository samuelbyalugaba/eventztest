export interface LiveStreamData {
  id: number;
  title: string;
  thumbnail: string;
  viewers?: number;
  host: string;
  quality: string;
  playback_url?: string;
  organizer_id: string;
  host_avatar?: string;
  category?: string;
}

export interface GiftOption {
  id: string;
  name: string;
  emoji: string;
  amount: number;
  color: string;
}

export const GIFT_OPTIONS: GiftOption[] = [
  { id: 'rose', name: 'Rose', emoji: '🌹', amount: 500, color: '#FF6B6B' },
  { id: 'star', name: 'Star', emoji: '⭐', amount: 1000, color: '#FFD93D' },
  { id: 'heart', name: 'Heart', emoji: '💖', amount: 2000, color: '#FF6EB4' },
  { id: 'fire', name: 'Fire', emoji: '🔥', amount: 5000, color: '#FF4500' },
  { id: 'diamond', name: 'Diamond', emoji: '💎', amount: 10000, color: '#00D4FF' },
  { id: 'crown', name: 'Crown', emoji: '👑', amount: 25000, color: '#FFD700' },
  { id: 'rocket', name: 'Rocket', emoji: '🚀', amount: 50000, color: '#8A2BE2' },
  { id: 'universe', name: 'Universe', emoji: '🌌', amount: 100000, color: '#4B0082' },
];

export interface FloatingHeart {
  id: number;
  x: number;
  size: number;
  color: string;
  delay: number;
}

export interface GiftBanner {
  id: number;
  senderName: string;
  gift: GiftOption;
  timestamp: number;
}

export interface StreamStats {
  peakViewers: number;
  totalLikes: number;
  totalGifts: number;
  totalRevenue: number;
  duration: number;
  newFollowers: number;
  chatMessages: number;
}
