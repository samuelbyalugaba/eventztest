# Service Catalog — Eventz

**Last Updated:** July 2026

---

## Supabase Edge Functions

| Function | Purpose | Secrets | Dependencies |
|---|---|---|---|
| `agora-rtc-token` | Generate Agora RTC tokens for broadcasting | AGORA_APP_ID, AGORA_APP_CERTIFICATE | Agora SDK |
| `cloudflare-stream-create` | Provision Cloudflare Stream live input | CLOUDFLARE_STREAM_TOKEN, CLOUDFLARE_ACCOUNT_ID | Cloudflare API |
| `cloudflare-stream-status` | Poll Cloudflare Stream status | CLOUDFLARE_STREAM_TOKEN | Cloudflare API |
| `cloudflare-stream-webhook` | Handle Cloudflare Stream webhooks | CLOUDFLARE_WEBHOOK_SECRET | Supabase DB |
| `cloudflare-stream-backfill` | Backfill VOD from Cloudflare Stream | CLOUDFLARE_STREAM_TOKEN | Cloudflare API |
| `delete-account` | Delete user account with cascade cleanup | SERVICE_ROLE_KEY | Supabase DB, Storage |
| `delete-post-complete` | Delete post with storage cleanup | SERVICE_ROLE_KEY | Supabase DB, Storage |
| `send-email` | Send transactional email via Resend | RESEND_API_KEY, EMAIL_FROM | Resend API |
| `send-auth-email` | Send branded auth email (hook) | RESEND_API_KEY, AUTH_EMAIL_FROM | Resend API |
| `send-gift` | Send virtual gift via nTZS wallet | NTZS_API_KEY, NTZS_SECRET | nTZS API |
| `send-push-notification` | Send web push notification | VAPID_PRIVATE_KEY, VAPID_PUBLIC_KEY | Web Push API |
| `ntzs-proxy` | Proxy nTZS payment API calls | NTZS_API_KEY, NTZS_SECRET | nTZS API |
| `ntzs-webhook` | Receive nTZS payment webhooks | NTZS_WEBHOOK_SECRET | Supabase DB |
| `wallet-ticket-payment` | Process wallet-based ticket purchase | SERVICE_ROLE_KEY | Supabase DB |

---

## API Modules (Client-Side)

| Module | Purpose | Key Functions |
|---|---|---|
| `auth` | Authentication management | onAuthStateChange, signOut, deleteAccount, updateUserEmail |
| `profile` | User profile CRUD | getProfile, updateProfile, checkUsernameUnique, becomeOrganizer, searchProfiles |
| `events` | Event management | getEvents, createEvent, updateEvent, deleteEvent, toggleLikeEvent, getEventAttendees |
| `posts` | Post management | getPosts, createPost, deletePost, toggleLikePost, toggleSavePost, getPostComments |
| `tickets` | Ticket operations | getUserTickets, createTicket, scanTicket, hasActiveVirtualTicket |
| `conversations` | Messaging | getConversations, getMessages, sendMessage, startConversation, deleteConversation |
| `follows` | Social graph | toggleFollow, getFollowers, getFollowing, getMutualFollows, subscribeToOnlineUsers |
| `notifications` | Notifications | getNotifications, markNotificationsAsRead |
| `transactions` | Financial records | createTransaction, waitForTransactionCompletion |
| `saved` | Saved content | getSavedEvents, getSavedPosts, toggleSaveEvent, toggleReminder |
| `moderation` | Content moderation | reportContent, blockUser, unblockUser, getBlockedUserIds |
| `search` | Search and trending | getTrending |
| `storage` | File uploads | uploadImage, deleteFile |
| `platform` | Platform stats | getOrganizerStats, getPlatformStats |
| `streams` | Cloudflare Stream | getProfileStreamedVideos |
| `streamChat` | Live stream chat | getStreamMessages, sendStreamMessage, subscribeToStreamMessages |
| `userMedia` | User media gallery | getUserMedia, incrementUserMediaView |

---

## PostgreSQL RPC Functions

| Function | Purpose | Security | Parameters |
|---|---|---|---|
| `purchase_ticket` | Purchase a ticket with idempotency | SECURITY DEFINER | event_id, tier_name, transaction_id, customer_name, customer_email |
| `become_organizer` | Upgrade user to organizer | SECURITY DEFINER | organizer_type |
| `scan_ticket` | Validate and mark ticket as used | SECURITY DEFINER | barcode |
| `delete_event_complete` | Delete event with all related data | SECURITY DEFINER | p_event_id |
| `delete_conversation_complete` | Delete conversation with messages | SECURITY DEFINER | p_conversation_id |
| `protect_profile_updates` | Prevent privilege escalation via profile update | SECURITY DEFINER | (trigger) |
| `handle_new_user` | Auto-create profile on signup | SECURITY DEFINER | (trigger) |
| `update_updated_at` | Auto-update updated_at column | SECURITY DEFINER | (trigger) |
| `check_username_unique` | Check username availability | SECURITY DEFINER | p_username |
| `get_organizer_events` | Get events by organizer | SECURITY DEFINER | p_organizer_id |
| `get_event_analytics` | Get event view/attendee counts | SECURITY DEFINER | p_event_id |
| `set_config` | Set session configuration | SECURITY DEFINER | setting_name, setting_value |

---

## External Services

| Service | Purpose | Integration |
|---|---|---|
| Supabase | Backend-as-a-Service | JS SDK v2.104 |
| Agora | Real-time live streaming | RTC SDK + Edge Functions |
| Cloudflare Stream | VOD and live ingest | REST API + Webhooks |
| nTZS | Mobile money payments | REST API (Tanzania) |
| Resend | Transactional email | REST API |
| Sentry | Error monitoring | @sentry/react |
| Vercel | SPA hosting | Auto-deploy from Git |
| Capacitor | Native mobile builds | Android/iOS |
