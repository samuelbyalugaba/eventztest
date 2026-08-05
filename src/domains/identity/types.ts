// Identity Domain Types
// Manages: Users, profiles, authentication, authorization

export interface Profile {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string;
  bio: string;
  is_organizer: boolean;
  verified: boolean;
  location: string;
  birthdate?: string;
  cover_url?: string;
  organizer_type?: string;
  phone?: string;
  website?: string;
  social_links?: {
    instagram?: string;
    facebook?: string;
    twitter?: string;
  };
  contact_email?: string;
  streaming_settings?: {
    defaultQuality: string;
    autoRecord: boolean;
    chatEnabled: boolean;
    reactionsEnabled: boolean;
    multiCamera: boolean;
    lowLatency: boolean;
  };
  privacy_settings?: {
    profileVisibility: string;
    showEmail: boolean;
    showPhone: boolean;
    allowMessages: boolean;
    showFollowers: boolean;
    showStats: boolean;
    showActivity?: boolean;
  };
  notification_settings?: {
    ticketSales: boolean;
    streamAlerts: boolean;
    weeklyReport: boolean;
    marketingEmails: boolean;
    newFollowers: boolean;
  };
  payment_settings?: {
    bankName?: string;
    accountNumber?: string;
    accountName?: string;
    mobileMoney?: string;
    paymentMethod: string;
  };
  preferences?: {
    recentCountries?: string[];
    pwaDismissed?: string;
  };
  description?: string;
}

export interface OrganizerProfile {
  id: string;
  user_id: string;
  organizer_type: string;
  cover_url?: string;
  social_links?: Record<string, string>;
}
