# Messaging Service Design — Eventz

**Last Updated:** July 2026

---

## Responsibilities

- Real-time one-to-one conversations
- Message delivery with read receipts
- Online presence tracking
- Conversation management (create, delete, mark unread)

## API Functions

| Function | Purpose | File |
|---|---|---|
| `getConversations` | Get user's conversations | `conversations.ts` |
| `getMessages` | Get messages for a conversation | `conversations.ts` |
| `sendMessage` | Send a message | `conversations.ts` |
| `startConversation` | Start new conversation | `conversations.ts` |
| `deleteConversation` | Delete conversation + messages | `conversations.ts` |
| `deleteMessage` | Delete a single message | `conversations.ts` |
| `markMessagesAsRead` | Mark messages as read | `conversations.ts` |
| `markConversationAsUnread` | Mark conversation as unread | `conversations.ts` |

## Real-time Subscriptions

| Channel | Table | Filter | Purpose |
|---|---|---|---|
| `messages:{convId}` | messages | conversation_id = convId | Live message delivery |
| `presence:{userId}` | profiles | user_id = userId | Online status |
| `notifications:{userId}` | notifications | user_id = userId | New message notifications |

## Data Flow

```
User opens MessagesPage
    ↓
getConversations() → fetches all conversations
    ↓
For each conversation → get last message + unread count
    ↓
Subscribe to messages channel for each conversation
    ↓
Subscribe to presence channel for online users
    ↓
User taps conversation
    ↓
getMessages() → fetches messages
    ↓
markMessagesAsRead() → marks unread as read
    ↓
User types message → sendMessage()
    ↓
Optimistic UI update → message appears immediately
    ↓
Supabase Realtime → recipient sees message
```

## Online Presence

- **Mutual follows = online friends**
- `getMutualFollows()` returns list of mutual followers
- Online status shown in chat list and conversation header
- Presence tracked via Supabase Realtime presence channels

## State Management

- **Context:** `MessagingContext` provides conversations, messages, presence
- **Server state:** TanStack Query for message lists
- **Real-time state:** Supabase Realtime subscriptions
- **Optimistic updates:** Messages appear immediately before server confirm

## Known Issues

1. **Global Subscription** — `subscribeToAllMessages` subscribes to ALL messages globally, not filtered by user
2. **N+1 Pattern** — `getConversations` makes N+1 queries (1 for conversations, N for last messages)
3. **No Pagination** — Messages fetched all at once, no cursor-based pagination
4. **Channel Name Collision** — Channel names use user IDs, potential collision at scale

## Component Architecture

```
MessagesPage
├── ChatList
│   ├── OnlineFriends (carousel)
│   ├── SearchBar
│   └── ConversationList
│       └── ConversationItem (avatar, name, last message, unread)
└── ChatDetail
    ├── ChatHeader (avatar, name, online status)
    ├── MessageList
    │   └── MessageBubble (text, timestamp, read status)
    └── MessageInput (text field, send button)
```
