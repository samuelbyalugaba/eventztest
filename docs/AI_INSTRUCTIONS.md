# AI Development Instructions — Eventz

**Version:** 1.0  
**Purpose:** Master instructions for AI coding assistants (OpenCode, Codex, Claude Code, Cursor)  
**Last Updated:** July 2026

---

## CRITICAL: Read Before Writing Any Code

This document defines the rules, patterns, and constraints that every AI coding assistant MUST follow when working on the Eventz codebase. Violation of these rules is considered a critical error.

---

## 1. Architecture Principles (NEVER VIOLATE)

### 1.1 Domain Boundaries
- **NEVER** import from a domain you don't own
- **NEVER** access another domain's database directly
- **NEVER** put business logic in components — use hooks and services
- **ALWAYS** communicate between domains via events or API calls

### 1.2 Data Ownership
- Each domain owns its data model
- No shared databases between domains
- Foreign keys between domains are forbidden — use events for synchronization

### 1.3 API First
- Every feature must have an API contract before implementation
- APIs must be versioned
- Breaking changes require a new version

### 1.4 Security by Design
- Never store secrets in client-side code
- Always validate input on both client and server
- Always use parameterized queries
- Always encrypt sensitive data at rest and in transit

---

## 2. Project Structure

### 2.1 Current Structure (Phase 0)

```
src/
├── domains/                    # Domain-driven organization
│   ├── identity/               # Auth, profiles, users
│   │   ├── api/                # API functions
│   │   ├── components/         # Domain-specific components
│   │   ├── hooks/              # Domain-specific hooks
│   │   ├── types.ts            # Domain types
│   │   ├── index.ts            # Public API
│   │   └── __tests__/          # Domain tests
│   ├── events/                 # Event CRUD, categories
│   ├── tickets/                # Ticketing, scanning
│   ├── messaging/              # Conversations, messages
│   ├── payments/               # Wallet, transactions
│   ├── streaming/              # Live streaming, VOD
│   ├── notifications/          # Push, in-app
│   ├── social/                 # Follows, presence
│   ├── media/                  # File uploads, storage
│   ├── moderation/             # Reports, blocks
│   └── search/                 # Search, trending
├── shared/                     # Shared utilities
│   ├── api/                    # Supabase client, query helpers
│   ├── ui/                     # Shared UI components
│   ├── utils/                  # Shared utilities
│   ├── hooks/                  # Shared hooks
│   └── types/                  # Shared types
├── infrastructure/             # Infrastructure concerns
│   ├── auth/                   # Auth provider, context
│   ├── storage/                # File storage abstraction
│   ├── realtime/               # WebSocket abstraction
│   └── monitoring/             # Sentry, logging
├── App.tsx                     # Root component
├── main.tsx                    # Entry point
├── queryClient.ts              # TanStack Query config
├── queryKeys.ts                # Query key factory
└── types.ts                    # Root types (legacy)
```

### 2.2 Target Structure (Phase 1+)

```
platform/
├── domains/
│   ├── identity-service/       # Standalone identity microservice
│   ├── event-service/          # Standalone event microservice
│   ├── ticket-service/         # Standalone ticket microservice
│   ├── payment-service/        # Standalone payment microservice
│   ├── messaging-service/      # Standalone messaging microservice
│   ├── notification-service/   # Standalone notification microservice
│   ├── search-service/         # Standalone search microservice
│   └── analytics-service/      # Standalone analytics microservice
├── shared-contracts/           # API contracts, event schemas
├── shared-libraries/           # Shared code across services
├── infrastructure/             # Terraform, Kubernetes configs
├── developer-tools/            # CLI tools, generators
└── documentation/              # All docs
```

---

## 3. Domain Boundaries

### 3.1 Identity Domain
**Owns:** Users, profiles, authentication, authorization
**Never touches:** Events, tickets, payments, messages
**Events published:** UserCreated, UserUpdated, UserDeleted, ProfileUpdated

### 3.2 Events Domain
**Owns:** Events, categories, organizers, venues
**Never touches:** Tickets, payments, users (except organizer_id reference)
**Events published:** EventCreated, EventUpdated, EventPublished, EventCancelled

### 3.3 Tickets Domain
**Owns:** Tickets, ticket tiers, scanning, check-in
**Never touches:** Payments (receives PaymentCompleted event), Users (receives UserCreated)
**Events published:** TicketPurchased, TicketCheckedIn, TicketCancelled

### 3.4 Payments Domain
**Owns:** Transactions, wallet, charges, refunds
**Never touches:** Tickets (publishes PaymentCompleted), Users (receives UserCreated)
**Events published:** PaymentCompleted, PaymentFailed, RefundCompleted

### 3.5 Messaging Domain
**Owns:** Conversations, messages, presence
**Never touches:** Events, tickets, payments
**Events published:** MessageSent, ConversationCreated

### 3.6 Notifications Domain
**Owns:** Notification delivery, push subscriptions
**Never touches:** Domain data (only receives events to trigger notifications)
**Events published:** NotificationSent

### 3.7 Streaming Domain
**Owns:** Live streams, VOD, stream chat
**Never touches:** Tickets (but checks ticket ownership), Events (references event_id)
**Events published:** StreamStarted, StreamEnded, StreamChatMessage

### 3.8 Social Domain
**Owns:** Follows, mutual follows, online presence
**Never touches:** Events, tickets, payments
**Events published:** UserFollowed, UserUnfollowed

---

## 4. Coding Standards

### 4.1 TypeScript
```typescript
// ALWAYS use strict mode
// NEVER use `any` — use `unknown` and type guards
// ALWAYS use interfaces for object shapes
// ALWAYS use enums for constants

// GOOD
interface UserProfile {
  id: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
}

// BAD
type UserProfile = {
  id: string;
  username: string;
  [key: string]: any; // NEVER DO THIS
}
```

### 4.2 React Components
```typescript
// ALWAYS use functional components
// ALWAYS use TypeScript for props
// ALWAYS destructure props
// NEVER use class components
// NEVER use default exports for domain components (use named exports)

// GOOD
interface EventCardProps {
  event: Event;
  onSave: (eventId: number) => void;
}

export function EventCard({ event, onSave }: EventCardProps) {
  return <div>{event.title}</div>;
}

// BAD
export default function EventCard(props: any) {
  return <div>{props.event.title}</div>;
}
```

### 4.3 Hooks
```typescript
// ALWAYS prefix with `use`
// ALWAYS return a typed result
// NEVER put business logic in components — use hooks
// NEVER call hooks conditionally

// GOOD
export function useEvent(eventId: number) {
  return useQuery({
    queryKey: queryKeys.events.detail(eventId),
    queryFn: () => getEventById(eventId),
  });
}
```

### 4.4 API Functions
```typescript
// ALWAYS use the Supabase client from shared/api/client
// ALWAYS handle errors
// NEVER expose raw Supabase errors to components
// ALWAYS validate input before calling API

// GOOD
export async function getEvents(options?: GetEventsOptions): Promise<Event[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('date', { ascending: true });
  
  if (error) throw new ApiError(error.message, error.code);
  return data;
}
```

### 4.5 File Naming
```
Components:       PascalCase.tsx (EventCard.tsx)
Hooks:            camelCase.ts (useEvent.ts)
API functions:    camelCase.ts (events.ts)
Types:            PascalCase.ts (Event.ts)
Tests:            *.test.ts or *.test.tsx
Domain folders:   kebab-case (event-service/)
```

---

## 5. Dependency Rules

### 5.1 Import Hierarchy
```
domains/[specific] → shared → infrastructure → external
```

- A domain CAN import from `shared`
- A domain CAN import from `infrastructure`
- A domain CANNOT import from another domain
- `shared` CANNOT import from any domain
- `infrastructure` CANNOT import from any domain

### 5.2 Allowed Dependencies
```typescript
// GOOD — Domain imports from shared
import { supabase } from '../../shared/api/client';
import { Button } from '../../shared/ui/Button';

// BAD — Domain imports from another domain
import { getTickets } from '../../tickets/api/tickets'; // FORBIDDEN
```

### 5.3 External Dependencies
- Always check if a library already exists in the project before adding new ones
- Prefer lightweight alternatives (date-fns over moment, zod over yup)
- Never add UI frameworks (Material UI, Ant Design) — use Tailwind + Radix

---

## 6. Event-Driven Communication

### 6.1 Event Format
```typescript
interface DomainEvent {
  id: string;           // UUID
  type: string;         // e.g., 'ticket.purchased'
  aggregateId: string;  // ID of the entity this event relates to
  timestamp: Date;
  version: number;
  payload: Record<string, unknown>;
  metadata: {
    userId: string;
    correlationId: string;
  };
}
```

### 6.2 Event Naming
```
[Domain].[Entity].[Action]

Examples:
identity.user.created
events.event.published
tickets.ticket.purchased
payments.payment.completed
messaging.message.sent
```

### 6.3 Publishing Events
```typescript
// NEVER publish events directly — use the event bus
// NEVER modify another domain's data in response to an event
// ALWAYS publish events after the transaction commits

// GOOD
await publishEvent({
  type: 'tickets.ticket.purchased',
  aggregateId: ticket.id,
  payload: { ticketId: ticket.id, eventId: ticket.eventId, userId: ticket.userId },
});
```

---

## 7. API Standards

### 7.1 REST Endpoints
```
GET    /api/v1/events           # List events
GET    /api/v1/events/:id       # Get event
POST   /api/v1/events           # Create event
PUT    /api/v1/events/:id       # Update event
DELETE /api/v1/events/:id       # Delete event
```

### 7.2 Response Format
```typescript
// Success
{
  "data": Event,
  "meta": { "page": 1, "total": 100 }
}

// Error
{
  "error": {
    "code": "EVENT_NOT_FOUND",
    "message": "Event with id 123 not found",
    "details": {}
  }
}
```

### 7.3 Authentication
- All API calls require JWT token
- Token passed via `Authorization: Bearer <token>` header
- API Gateway validates token and forwards user context

---

## 8. Database Rules

### 8.1 Schema Ownership
- Each domain owns its tables
- No foreign keys across domain boundaries
- Use UUIDs for primary keys
- Always include `created_at` and `updated_at`

### 8.2 Migrations
- Every schema change must have a migration
- Migrations must be reversible
- Never modify existing migrations
- Test migrations before deploying

### 8.3 Indexing
- Index all foreign keys
- Index frequently queried columns
- Use composite indexes for multi-column queries
- Never over-index (slows writes)

---

## 9. Security Requirements

### 9.1 Authentication
- Never store passwords in plain text
- Always use bcrypt/argon2 for hashing
- Always validate JWT tokens
- Always refresh tokens before expiry

### 9.2 Authorization
- Always check permissions before operations
- Never rely on client-side authorization
- Always use RLS or middleware for API authorization
- Never expose internal IDs to clients

### 9.3 Data Protection
- Never log sensitive data (passwords, tokens, PII)
- Never commit secrets to version control
- Always encrypt sensitive data at rest
- Always use TLS for data in transit

### 9.4 Input Validation
- Always validate input on both client and server
- Always sanitize user input
- Always use parameterized queries
- Never trust client-side validation alone

---

## 10. Testing Requirements

### 10.1 Test Types
- **Unit Tests:** Every hook, utility, and API function
- **Integration Tests:** Domain workflows
- **Contract Tests:** API contracts between services
- **E2E Tests:** Critical user flows

### 10.2 Test Coverage
- Minimum 80% code coverage per domain
- 100% coverage for payment and ticketing logic
- All edge cases must be tested
- All error paths must be tested

### 10.3 Test Naming
```typescript
describe('useEvent', () => {
  it('should return event data when event exists', () => {});
  it('should throw error when event not found', () => {});
  it('should handle network errors gracefully', () => {});
});
```

---

## 11. Performance Requirements

### 11.1 Frontend
- First Contentful Paint: < 1.5s
- Largest Contentful Paint: < 2.5s
- Cumulative Layout Shift: < 0.1
- Time to Interactive: < 3.0s

### 11.2 API
- p50 latency: < 100ms
- p95 latency: < 500ms
- p99 latency: < 1000ms

### 11.3 Database
- Query execution: < 100ms for 95% of queries
- Connection pool: never exhaust connections
- Always use connection pooling for read replicas

---

## 12. Documentation Requirements

### 12.1 Code Documentation
- Every public function must have JSDoc
- Every complex algorithm must have comments
- Every TODO must have a ticket reference

### 12.2 API Documentation
- Every endpoint must have OpenAPI spec
- Every request/response must be documented
- Every error code must be documented

### 12.3 Architecture Documentation
- Every architectural decision must have an ADR
- Every domain must have a design document
- Every service must have a runbook

---

## 13. Code Review Checklist

Before approving any PR, verify:

- [ ] No imports from other domains
- [ ] No `any` types
- [ ] All functions have TypeScript types
- [ ] Error handling is comprehensive
- [ ] Tests are included
- [ ] Documentation is updated
- [ ] No secrets in code
- [ ] No console.log in production code
- [ ] Performance is acceptable
- [ ] Security is considered

---

## 14. Definition of Done

A feature is "done" when:

1. **Code:** Implements requirements, follows coding standards
2. **Tests:** Unit tests, integration tests pass
3. **Documentation:** API docs, ADR (if architectural), runbook (if operational)
4. **Security:** Input validation, authorization checks, no vulnerabilities
5. **Performance:** Meets performance budgets
6. **Review:** Code reviewed and approved
7. **Deploy:** Successfully deployed to staging, verified in production

---

## 15. Common Mistakes to Avoid

| Mistake | Why It's Wrong | Correct Approach |
|---|---|---|
| Importing from another domain | Violates domain boundaries | Use events or API calls |
| Using `any` type | Defeats TypeScript benefits | Use `unknown` and type guards |
| Putting logic in components | Hard to test, reuse | Extract to hooks |
| Console.log in production | Security risk, noise | Use proper logging |
| Hardcoding secrets | Security risk | Use environment variables |
| Skipping tests | Technical debt | Always write tests |
| No error handling | Poor UX | Always handle errors |
| Ignoring performance | Poor UX | Always measure |
