# Streaming Service Design — Eventz

**Last Updated:** July 2026

---

## Responsibilities

- Real-time live broadcasting via Agora RTC
- VOD recording and playback via Cloudflare Stream
- Live stream chat
- Viewer count tracking
- Stream discovery and management

## Edge Functions

| Function | Purpose | Secrets |
|---|---|---|
| `agora-rtc-token` | Generate Agora RTC tokens | AGORA_APP_ID, AGORA_APP_CERTIFICATE |
| `cloudflare-stream-create` | Provision Cloudflare Stream input | CLOUDFLARE_STREAM_TOKEN, CLOUDFLARE_ACCOUNT_ID |
| `cloudflare-stream-status` | Poll stream status | CLOUDFLARE_STREAM_TOKEN |
| `cloudflare-stream-webhook` | Handle stream events | CLOUDFLARE_WEBHOOK_SECRET |
| `cloudflare-stream-backfill` | VOD backfill from stream | CLOUDFLARE_STREAM_TOKEN |

## API Functions

| Function | Purpose | File |
|---|---|---|
| `getLiveStreams` | Get currently live events | `events.ts` |
| `getUpcomingStreams` | Get upcoming live events | `events.ts` |
| `updateEventStreamingStatus` | Update stream status | `events.ts` |
| `updateLiveViewerCount` | Update viewer count | `events.ts` |
| `generateStreamKeys` | Generate stream keys | `events.ts` |
| `subscribeToEventStreaming` | Subscribe to stream status changes | `events.ts` |
| `subscribeToStreamPresence` | Subscribe to viewer presence | `events.ts` |
| `getStreamMessages` | Get live chat messages | `streamChat.ts` |
| `sendStreamMessage` | Send live chat message | `streamChat.ts` |
| `subscribeToStreamMessages` | Subscribe to live chat | `streamChat.ts` |

## Broadcast Flow

```
Organizer taps "Go Live"
    ↓
Request Agora RTC token (agora-rtc-token Edge Function)
    ↓
Join Agora channel as broadcaster
    ↓
Start publishing audio/video via Agora SDK
    ↓
Create Cloudflare Stream input (cloudflare-stream-create)
    ↓
Update event streaming status to isLive=true
    ↓
Followers receive push notification
    ↓
Viewers join channel as audience
    ↓
Agora SDK delivers real-time stream to viewers
    ↓
Cloudflare Stream records for VOD
```

## Viewer Flow

```
User taps live event in feed
    ↓
Load event details with streaming info
    ↓
Check if user has virtual ticket (hasActiveVirtualTicket)
    ↓
Connect to Agora channel as audience
    ↓
Receive stream via Agora SDK or HLS.js playback
    ↓
Join live chat (subscribeToStreamMessages)
    ↓
Send messages in real-time
```

## VOD Flow

```
Broadcaster ends stream
    ↓
Agora channel disconnected
    ↓
Cloudflare Stream webhook fires (cloudflare-stream-webhook)
    ↓
Update event streaming status (isLive=false, replayAvailable=true)
    ↓
VOD processed by Cloudflare Stream
    ↓
Playback URL available for replay
```

## Live Chat

- **Channel:** `streamChat:{eventId}`
- **Messages:** Real-time via Supabase Realtime
- **Storage:** `stream_chat_messages` table
- **Missing Index:** `event_id` column lacks index (performance issue)

## Component Architecture

```
LiveFeed (page)
├── StreamCard (live event card)
│   ├── StreamThumbnail
│   ├── LiveBadge
│   ├── ViewerCount
│   └── StreamInfo
└── StreamViewer (full screen)
    ├── VideoPlayer (Agora/HLS)
    ├── StreamInfo
    ├── ViewerCount
    ├── ChatPanel
    │   ├── ChatMessage
    │   └── ChatInput
    └── StreamControls
```
