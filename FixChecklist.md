# Eventz PWA - Global Scale Fix Checklist

This checklist outlines the critical steps required to transition Eventz PWA from an "AI MVP" to a secure, globally scalable application.

## 🚨 Phase 1: Critical Security (MUST FIX IMMEDIATELY)

The application is currently vulnerable to financial fraud and data manipulation. These issues must be resolved before any real-world usage.

- [ ] **Secure Payment Flow (Anti-Fraud)**
    - [ ] **Remove Client Trust**: Modify `purchase_ticket` RPC to **require** a valid, completed `transaction_id`.
    - [ ] **Server-Side Verification**: Implement a check inside `purchase_ticket` that queries the `transactions` table to ensure:
        1.  Transaction exists.
        2.  `status` is `'completed'`.
        3.  `amount` matches the ticket price.
        4.  Transaction has not already been used for a ticket.
    - [ ] **Webhook Reliability**: Ensure `azampay-callback` handles idempotent requests (processing the same webhook twice doesn't create double records).

- [ ] **Row Level Security (RLS) Auditing**
    - [ ] **Organizer Privileges**: Update `events` table policies. Instead of trusting `is_organizer` flag on the client profile, verify the user exists in a secure `organizers` table or has a strictly managed role claim in `auth.users`.
    - [ ] **Strict Profile Updates**: Ensure users can strictly only `UPDATE` their own profile columns (e.g., prevent a user from setting their own `is_verified` or `is_organizer` flags to true).

- [ ] **API Hardening**
    - [ ] **Error Handling**: Update Edge Functions (`azampay-payment`) to return proper HTTP error codes (400, 401, 500) instead of masking everything as "success: false" inside a 200 OK response.
    - [ ] **Rate Limiting**: Enable Supabase Rate Limiting to prevent brute-force attacks on sensitive RPCs and Edge Functions.

---

## 🚀 Phase 2: Scalability & Performance (Preparing for 1M+ Users)

To handle global traffic, the application logic must be decoupled from the database bottlenecks.

- [ ] **Database Optimization**
    - [ ] **Index Everything**: Run `EXPLAIN ANALYZE` on all frequent queries (`get_events`, `get_posts`). Add B-Tree indexes on foreign keys (`user_id`, `event_id`) and filter columns (`category`, `date`).
    - [ ] **Remove Locking**: Refactor `purchase_ticket`. Instead of `FOR UPDATE` (which locks the whole row), use:
        -   **Atomic Decrement**: `UPDATE events SET available_tickets = available_tickets - 1 WHERE id = X AND available_tickets > 0 RETURNING id`.
        -   **Queue System**: For high-demand events (e.g., "Taylor Swift"), implement a Redis-based waiting room or Supabase Realtime queue to throttle requests before they hit the DB.

- [ ] **Frontend Architecture (Performance)**
    - [ ] **Virtualization**: Replace the standard list in `Feed.tsx` with `react-window` or `virtuoso`. This ensures only the visible items are rendered, preventing the phone from freezing after scrolling 100+ posts.
    - [ ] **Image Optimization**:
        -   Implement lazy loading for all images.
        -   Use Supabase Image Transformations to request the exact size needed (`width=400`), rather than downloading the full 4MB original upload.
    - [ ] **Code Splitting**: Break `App.tsx` and `Feed.tsx` into smaller chunks. Use `React.lazy()` for routes like `OrganizerDashboard` so standard users don't download admin code.

- [ ] **Global Infrastructure**
    - [ ] **CDN**: Ensure Supabase Storage is served via a CDN (Global Content Delivery Network) to reduce latency for users in different regions.
    - [ ] **Edge Functions Regions**: Deploy Edge Functions to regions closest to your primary user base (or multiple regions if truly global).

---

## 🛠 Phase 3: Maintainability & Code Quality

To sustain development velocity as the team grows.

- [ ] **Refactor "God Components"**
    - [ ] **Feed.tsx**: Split into `FeedPost`, `StoriesRail`, `FeedFilter`, and `FeedDataHook`.
    - [ ] **App.tsx**: Move global state (Auth, Theme, Toast) into React Context providers (`AuthProvider`, `UIProvider`).
    
- [ ] **State Management**
    - [ ] **Adopt Zustand/Redux**: Stop prop-drilling `currentUser` and `conversations` through 5 layers of components. Use a global store.
    
- [ ] **DevOps & Migrations**
    - [ ] **Consolidate Migrations**: Move all root-level SQL files to `supabase/migrations` and number them sequentially.
    - [ ] **CI/CD**: Set up a GitHub Action to automatically run type checks (`tsc`) and linting (`eslint`) on every Pull Request.
