# Event Service Design — Eventz

**Last Updated:** July 2026

---

## Responsibilities

- Event CRUD operations (create, read, update, delete)
- Event browsing with filtering (category, date, location)
- Event analytics (views, attendees, likes)
- Event saving and reminders
- Organizer event management
- Streaming status management

## API Functions

| Function | Purpose | File |
|---|---|---|
| `getEvents` | Fetch published events | `events.ts` |
| `getEventById` | Fetch single event | `events.ts` |
| `getOrganizerEvents` | Fetch events by organizer | `events.ts` |
| `createEvent` | Create new event | `events.ts` |
| `updateEvent` | Update event details | `events.ts` |
| `deleteEvent` | Delete event with cascade | `events.ts` |
| `toggleLikeEvent` | Like/unlike event | `events.ts` |
| `getEventLikes` | Get event like count | `events.ts` |
| `hasUserLikedEvent` | Check if user liked event | `events.ts` |
| `incrementEventView` | Track event views | `events.ts` |
| `getEventAnalytics` | Get event stats | `events.ts` |
| `getEventAttendees` | Get event attendees | `events.ts` |
| `toggleSaveEvent` | Save/unsave event | `saved.ts` |
| `toggleReminder` | Toggle event reminder | `saved.ts` |
| `updateEventStreamingStatus` | Update streaming status | `events.ts` |

## Data Flow

```
User creates event
    ↓
EventForm component → useEventForm hook
    ↓
uploadImage() → Supabase Storage → public URL
    ↓
createEvent() → Supabase INSERT → event record
    ↓
Query invalidation → feed refreshes
```

## State Management

- **Server state:** TanStack Query with `queryKeys.events.*`
- **Form state:** `useEventForm` hook with validation
- **Optimistic updates:** Like/save mutations update cache immediately

## Event Lifecycle

```
Draft → Published → Live → Completed → Archived
  ↓        ↓         ↓         ↓
Cancelled  Cancelled  Ended    Deleted
```

## Key Design Decisions

1. **JSONB ticket_tiers** — Stored in events table for simplicity, not normalized
2. **JSONB streaming** — Streaming status embedded in event record
3. **Soft deletes** — Events are hard-deleted (no soft delete)
4. **Image uploads** — Direct to Supabase Storage, URL stored in event

## Component Architecture

```
EventsPage (list)
├── EventCard (summary card)
│   ├── EventImage
│   ├── EventInfo (title, date, location)
│   ├── EventOrganizer
│   └── EventActions (save, share)
└── EventFilters (category, date)

EventDetails (detail page)
├── EventHero (image + overlay)
├── EventInfo (full details)
├── EventOrganizer
├── EventTickets (tier selection)
├── EventAttendees
├── EventStreaming (live status)
└── EventActions (edit, share, save)
```
