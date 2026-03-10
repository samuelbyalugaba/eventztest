# Eventz PWA - Comprehensive Application Analysis & Finalization Plan

## 1. Executive Summary

**Eventz PWA** is a social event management platform built as a Progressive Web App (PWA) with React (Frontend), Supabase (Backend), and Capacitor (Mobile).

*   **Status:** The application has a solid MVP foundation with core social and event features implemented.
*   **Recent Wins:**
    *   **Security:** Critical vulnerability in ticket purchasing has been addressed in code (`secure_purchase_ticket.sql`).
    *   **Payments:** Transition from AzamPay to **Snippe (Mobile Money)** is code-complete.
    *   **Video:** HLS playback support added to the frontend.
*   **Critical Gaps:**
    *   **Live Streaming:** The "Go Live" feature is currently a **UI shell only**. There is no actual broadcasting infrastructure (RTMP/WebRTC) connected.
    *   **Architecture:** The frontend relies on massive "God Components" (`Feed.tsx`, `App.tsx`) that make maintenance difficult and performance poor.

---

## 2. Detailed Analysis (A - Z)

### A. Frontend (React + Vite + Tailwind)
*   **Tech Stack:** React 18, TypeScript, Tailwind CSS, Shadcn/UI, Lucide Icons.
*   **Architecture:**
    *   **State Management:** Currently relies on **Prop Drilling** (passing data down 4-5 levels). This is a major scalability bottleneck.
    *   **Routing:** Custom tab-based navigation in `App.tsx` instead of a standard router (like `react-router-dom`). This limits deep linking capabilities.
*   **Code Quality:**
    *   **`src/components/Feed.tsx`**: A ~800-line "God Component" handling UI, data fetching, caching, and media logic. Needs immediate refactoring.
    *   **`src/App.tsx`**: Acts as a massive controller for auth, global messaging, and routing.
*   **Mobile Experience (Capacitor):**
    *   Infinite scroll in `Feed.tsx` uses a custom implementation that may be jerky. **Recommendation:** Switch to `react-window` or `virtuoso` for virtualization.

### B. Backend (Supabase + Edge Functions)
*   **Database (PostgreSQL):**
    *   **Schema:** robust set of tables (`events`, `tickets`, `profiles`, `posts`, `transactions`).
    *   **Security (RLS):** Row Level Security policies are in place.
    *   **RPC Functions:** `purchase_ticket` has been updated to be secure (uses `FOR UPDATE` locks and verifies transactions server-side), preventing the "free ticket" exploit.
*   **Edge Functions:**
    *   **`snippe-payment`**: Implemented to handle mobile money payments via Snippe.
    *   **`snippe-webhook`**: Implemented to handle payment callbacks.
*   **Infrastructure:**
    *   **Migrations:** SQL files are scattered between the root directory and `supabase/migrations`. This makes it hard to know the exact state of the production DB.

### C. Features Status

| Feature | Status | Notes |
| :--- | :--- | :--- |
| **User Auth** | ✅ Working | Supabase Auth (Email/Password). |
| **Events & Tickets** | ⚠️ Verification Needed | Core logic exists. Payment provider switched to Snippe; needs end-to-end testing. |
| **Social Feed** | ✅ Working | Posts, Comments, Likes working. Code is monolithic (`Feed.tsx`). |
| **Chat/Messaging** | ✅ Working | Real-time chat via Supabase subscriptions. |
| **Live Streaming** | ❌ **Broken/Missing** | **UI Only.** "Go Live" updates a status but doesn't stream video. No RTMP server integration. |
| **Wallet/Payments** | ⚠️ Verification Needed | Snippe integration code is done, but needs verification. |

---

## 3. Recommended Actions Checklist

### Phase 1: Critical Fixes & Verification (Immediate)
- [ ] **Verify Snippe Payments**
    - [ ] Test the full flow: `Initiate Payment` -> `Mobile Simulation` -> `Webhook Callback` -> `Ticket Generation`.
    - [ ] Ensure the `transactions` table updates correctly with status `completed`.
- [ ] **Verify `purchase_ticket` Security**
    - [ ] Confirm that `20260226_secure_purchase_ticket.sql` is applied to the production database.
    - [ ] **Security Test:** Attempt to call the RPC manually without a valid transaction ID to ensure it fails.
- [x] **Consolidate Migrations**
    - [x] Move all root-level `.sql` files to `supabase/migrations`.
    - [x] Timestamp them correctly to ensure a reproducible database state.

### Phase 2: Live Streaming Implementation (High Priority)
The current "Go Live" feature is incomplete. You need to integrate a real streaming provider.
- [ ] **Select Streaming Provider** (Mux, AWS IVS, or Cloudflare Stream).
- [ ] **Backend Implementation**
    - [ ] Create an Edge Function to create a "Live Stream" asset via the provider's API.
    - [ ] Return the `stream_key` (for the broadcaster) and `playback_id` (for viewers).
- [ ] **Frontend Implementation**
    - [ ] Update `StreamManager.tsx` to display the real `stream_key` so the user can stream via OBS or mobile app.
    - [ ] Update `LiveStreamViewer.tsx` to use the real `playback_url`.

### Phase 3: Architecture & Refactoring (Medium Priority)
- [ ] **State Management Refactor**
    - [ ] Replace prop drilling in `App.tsx` with **React Context** or **Zustand**.
    - [ ] Create `AuthContext`, `ChatContext`, and `ToastContext`.
- [ ] **Refactor `Feed.tsx`**
    - [ ] Break into smaller components: `FeedPost`, `FeedStories`, `FeedFilters`.
    - [ ] Move data fetching logic to a custom hook `useFeed()`.
- [ ] **Performance Optimization**
    - [ ] Implement list virtualization (`react-window` or `virtuoso`) for the Feed and Comment sections.
