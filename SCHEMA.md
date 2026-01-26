# Supabase Database Schema Documentation

## Overview

This document describes the database schema used in the Eventz PWA application. The application uses Supabase (PostgreSQL) as its backend.

## Tables

### 1. `profiles`
Stores user profile information. Extends the default `auth.users` table.

| Column | Type | Description |
|---|---|---|
| `id` | uuid | Primary Key, references `auth.users.id`. |
| `username` | text | Unique username. |
| `full_name` | text | User's full display name. |
| `avatar_url` | text | URL to the user's avatar image. |
| `bio` | text | User's biography. |
| `is_organizer` | boolean | Whether the user is an event organizer. |
| `verified` | boolean | Whether the user is verified. |
| `location` | text | User's location (e.g., "Dar es Salaam"). |
| `cover_url` | text | URL to the user's profile cover image. |
| `organizer_type` | text | Type of organizer (e.g., 'Event Organizer', 'Artist', 'Venue'). |
| `created_at` | timestamptz | Creation timestamp. |
| `updated_at` | timestamptz | Last update timestamp. |

### 2. `events`
Stores event information.

| Column | Type | Description |
|---|---|---|
| `id` | bigint | Primary Key (auto-increment). |
| `organizer_id` | uuid | Foreign Key referencing `profiles.id`. |
| `title` | text | Event title. |
| `description` | text | Detailed event description. |
| `date` | date | Event date. |
| `time` | time | Event start time. |
| `location` | text | Event venue or location name. |
| `city` | text | City where the event is held. |
| `category` | text | Event category (e.g., "Music", "Tech"). |
| `subcategory` | text | Event subcategory. |
| `price_range` | text | Display string for price range (e.g., "TSh 10,000 - 50,000"). |
| `image_url` | text | Main event cover image URL. |
| `attendees` | integer | Count of attendees (cached/estimated). |
| `views` | integer | Count of event page views. |
| `status` | text | Event status: 'published', 'draft', 'cancelled', 'past'. |
| `streaming` | jsonb | JSON object for streaming details (`available`, `quality`, `playback_url`, etc.). |
| `ticket_tiers` | jsonb | JSON array of ticket tier objects (`name`, `price`, `available`, etc.). |
| `event_highlights` | jsonb | JSON array of highlight objects (`image`, `video`, `caption`, `type`). |
| `created_at` | timestamptz | Creation timestamp. |
| `updated_at` | timestamptz | Last update timestamp. |

### 3. `tickets`
Stores purchased tickets.

| Column | Type | Description |
|---|---|---|
| `id` | bigint | Primary Key. |
| `user_id` | uuid | FK referencing `profiles.id` (Buyer). |
| `event_id` | bigint | FK referencing `events.id`. |
| `ticket_number` | text | Unique ticket identifier. |
| `barcode` | text | Barcode string. |
| `price` | text | Price paid (string format). |
| `purchase_date` | timestamptz | When the ticket was purchased. |
| `customer_name` | text | Name on the ticket. |
| `customer_email` | text | Email for the ticket. |
| `ticket_type` | text | Type/Tier name (e.g., "VIP"). |
| `status` | text | Ticket status (e.g., "valid", "used"). |
| `qr_code` | text | QR code data string. |

### 4. `saved_events`
Stores events saved by users (bookmarks).

| Column | Type | Description |
|---|---|---|
| `id` | bigint | Primary Key. |
| `user_id` | uuid | FK referencing `profiles.id`. |
| `event_id` | bigint | FK referencing `events.id`. |
| `is_reminder` | boolean | Whether a reminder is set. |
| `created_at` | timestamptz | Timestamp. |

### 5. `posts`
Stores social feed posts.

| Column | Type | Description |
|---|---|---|
| `id` | bigint | Primary Key. |
| `user_id` | uuid | FK referencing `profiles.id`. |
| `content` | text | Post text content. |
| `image_urls` | text[] | Array of image URLs. |
| `video_url` | text | Optional video URL for video posts. |
| `views` | integer | View count for video posts. |
| `duration` | text | Duration of the video (e.g., "0:30"). |
| `hashtags` | text[] | Array of hashtags. |
| `event_id` | bigint | Optional FK referencing `events.id` (if post is about an event). |
| `created_at` | timestamptz | Timestamp. |

### 6. `post_likes`
Stores likes on posts.

| Column | Type | Description |
|---|---|---|
| `user_id` | uuid | FK referencing `profiles.id`. |
| `post_id` | bigint | FK referencing `posts.id`. |
| `created_at` | timestamptz | Timestamp. |
| **PK** | | Composite Primary Key (`user_id`, `post_id`). |

### 7. `post_comments`
Stores comments on posts.

| Column | Type | Description |
|---|---|---|
| `id` | bigint | Primary Key. |
| `user_id` | uuid | FK referencing `profiles.id`. |
| `post_id` | bigint | FK referencing `posts.id`. |
| `text` | text | Comment text. |
| `created_at` | timestamptz | Timestamp. |

### 8. `saved_posts`
Stores posts saved by users.

| Column | Type | Description |
|---|---|---|
| `user_id` | uuid | FK referencing `profiles.id`. |
| `post_id` | bigint | FK referencing `posts.id`. |
| `created_at` | timestamptz | Timestamp. |
| **PK** | | Composite Primary Key (`user_id`, `post_id`). |

### 9. `follows`
Stores user follow relationships.

| Column | Type | Description |
|---|---|---|
| `follower_id` | uuid | FK referencing `profiles.id` (User who follows). |
| `following_id` | uuid | FK referencing `profiles.id` (User being followed). |
| `created_at` | timestamptz | Timestamp. |
| **PK** | | Composite Primary Key (`follower_id`, `following_id`). |

### 10. `user_media`
Stores user-uploaded media (photos/videos).

| Column | Type | Description |
|---|---|---|
| `id` | bigint | Primary Key. |
| `user_id` | uuid | FK referencing `profiles.id`. |
| `media_type` | text | 'photo' or 'video'. |
| `url` | text | Media URL. |
| `thumbnail_url` | text | Thumbnail URL (for videos). |
| `caption` | text | Media caption. |
| `likes` | integer | Like count. |
| `views` | integer | View count. |
| `duration` | text | Video duration. |

### 11. `stream_chat_messages`
Stores live stream chat messages.

| Column | Type | Description |
|---|---|---|
| `id` | bigint | Primary Key (auto-increment). |
| `event_id` | bigint | FK referencing `events.id`. |
| `user_id` | uuid | FK referencing `profiles.id`. |
| `message` | text | Chat message content. |
| `created_at` | timestamptz | Timestamp. |

### 12. `conversations`
Stores direct message conversations between users.

| Column | Type | Description |
|---|---|---|
| `id` | bigint | Primary Key (auto-increment). |
| `participant1_id` | uuid | FK referencing `profiles.id`. |
| `participant2_id` | uuid | FK referencing `profiles.id`. |
| `created_at` | timestamptz | Creation timestamp. |
| `updated_at` | timestamptz | Last message timestamp (for sorting). |

### 13. `messages`
Stores direct messages within a conversation.

| Column | Type | Description |
|---|---|---|
| `id` | bigint | Primary Key (auto-increment). |
| `conversation_id` | bigint | FK referencing `conversations.id`. |
| `sender_id` | uuid | FK referencing `profiles.id`. |
| `content` | text | Message content. |
| `is_read` | boolean | Read status. |
| `created_at` | timestamptz | Timestamp. |

## RLS Policies

Row Level Security is enabled on all tables.
- **Public Read**: Generally, all content (Profiles, Events, Posts) is viewable by everyone.
- **Authenticated Create/Update**: Users can only create/update their own data.
- **Organizers**: Specific policies allow organizers to manage their events and view associated tickets.

## Notes

- `event_highlights` in the `events` table is a JSONB array. It contains media items displayed in the event details. Currently, likes/views for these specific highlights are not persisted in a separate table but handled within the client or static.
