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
  ticketType?: 'Normal' | 'VIP' | 'VVIP';
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
