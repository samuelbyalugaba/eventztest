export interface PurchasedTicket {
  id: string;
  eventId: number;
  eventTitle: string;
  eventDate: string;
  eventLocation: string;
  ticketNumber: string;
  barcode: string;
  purchaseDate: string;
  customerName: string;
  customerEmail: string;
  price: string;
  ticketType?: string;
}

export interface Message {
  id: number;
  senderId: number; // 0 for current user, or specific ID
  text: string;
  timestamp: string;
  read: boolean;
}

export interface Conversation {
  id: number;
  user: {
    name: string;
    username: string;
    avatar: string;
    verified: boolean;
    isOrganizer?: boolean;
    id?: string; // Added ID to track real user ID
  };
  lastMessage: {
    text: string;
    timestamp: string;
    isRead: boolean;
  };
  unreadCount: number;
  messages: Message[];
}

export interface Comment {
  id: number;
  user: {
    name: string;
    avatar: string;
  };
  text: string;
  timestamp: string;
}

export interface HighlightClip {
  id: number;
  thumbnail: string;
  duration: string;
  title: string;
  videoUrl?: string;
  views: number;
}

export interface Post {
  id: number;
  user: {
    id: string;
    name: string;
    username: string;
    avatar: string;
    verified: boolean;
    isOrganizer?: boolean;
    isOrganizerPage?: boolean;
  };
  event?: {
    id: number;
    name: string;
    date: string;
    time?: string;
    location: string;
    image: string;
    price?: string;
  };
  content: {
    text?: string;
    image?: string;
    images?: string[]; // For carousel posts with multiple images
    hashtags?: string[];
  };
  timestamp: string;
  likes: number;
  comments: Comment[];
  comments_count?: number;
  shares: number;
  views?: number;
  isLiked: boolean;
  isSaved: boolean;
  recommended?: boolean;
  isHighlight?: boolean;
  highlights?: HighlightClip[];
  totalHighlightViews?: number;
  mutualFriends?: { name: string; avatar: string }[];
}
