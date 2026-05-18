# Eventz PWA - Comprehensive Application Analysis (Test)

## 1. Executive Summary

**Eventz PWA** is a social event management platform built as a Progressive Web App (PWA) with React, wrapped for mobile distribution using Capacitor, and powered by Supabase.

The application demonstrates a solid foundation for a social MVP but suffers from **critical security vulnerabilities in the payment flow** and **scalability issues in the frontend architecture**. The "God Component" pattern in `Feed.tsx` and `App.tsx` will make future feature development increasingly difficult and error-prone.

---

## 2. Architecture Overview

### Tech Stack
*   **Frontend**: React 18 (Vite), TypeScript, Tailwind CSS, Shadcn/UI.
*   **Mobile Wrapper**: Capacitor 5 (Android/iOS).
*   **Backend / BaaS**: Supabase (PostgreSQL, Authentication, Edge Functions, Storage).
*   **State Management**: React `useState` / `useEffect` lifted to `App.tsx` (Prop Drilling). No global state library.
*   **Routing**: Custom tab-based navigation in `App.tsx` (No React Router).

### Infrastructure
*   **Database**: PostgreSQL hosted on Supabase.
*   **Serverless Functions**: Deno-based Edge Functions for payment integration (AzamPay) and third-party webhooks.
*   **Migrations**: SQL files are present in both the root directory and `supabase/migrations`, indicating a potentially fragmented schema management workflow.

---

## 3. Security Analysis ( CRITICAL)

### 3.1. Payment Bypass Vulnerability
**Severity: CRITICAL**
The ticket purchase flow is insecure and trusts the client-side application.
1.  **The Flaw**: The `purchase_ticket` database function (RPC) creates a valid ticket but **does not verify payment status**. It relies on the frontend to call it *after* a successful payment.
2.  **Exploit**: A malicious user can manually call `supabase.rpc('purchase_ticket', ...)` from the browser console to generate valid tickets without paying a cent.
3.  **Recommendation**:
    *   Modify `purchase_ticket` to accept a `transaction_id`.
    *   Inside the RPC, verify the transaction exists in the `transactions` table and has `status = 'completed'`.
    *   Alternatively, move ticket creation entirely to the `azampay-callback` Edge Function (server-side).

### 3.2. Row Level Security (RLS)
*   **Strengths**:
    *   `tickets` table is correctly secured against direct `INSERT` by users.
    *   `conversations` policies prevent users from reading messages they are not part of.
*   **Weaknesses**:
    *   The `purchase_ticket` function is defined as `SECURITY DEFINER`, which bypasses RLS. This is necessary for it to work, but because it lacks payment validation (see 3.1), it becomes a backdoor.
    *   Organizer privileges rely on an `is_organizer` flag in the `profiles` table. Ensure this flag cannot be toggled by the user themselves via standard `UPDATE` policies.

### 3.3. API Security
*   **Edge Functions**: The `azampay-payment` function returns "success" even in failure modes (to handle CORS/client errors gracefully), which might mislead the client if not handled strictly.
*   **Sandbox Simulation**: The payment function simulates success when connection resets occur in sandbox mode. Ensure this logic **never** deploys to production.

---

## 4. Code Quality & Bugs

### 4.1. "God Components"
*   **`src/components/Feed.tsx`**: This file is ~800+ lines long and violates the Single Responsibility Principle. It handles:
    *   UI Rendering (Posts, Stories, Suggestions)
    *   Data Fetching (Supabase calls)
    *   Local Caching (`localStorage`)
    *   Video Playback Logic
    *   Real-time Subscriptions
    *   **Risk**: High likelihood of regression bugs when modifying the feed. Hard to test.
*   **`src/App.tsx`**: Acts as a massive controller for the entire app. It manages auth state, global messaging state, live stream polling, and routing. This causes unnecessary re-renders of the entire tree.

### 4.2. State Management
*   **Prop Drilling**: Critical data like `currentUser`, `conversations`, and `onSendMessage` are drilled down 3-4 levels deep. This makes components tightly coupled and hard to reuse.
*   **Recommendation**: Adopt a lightweight state management solution like **Zustand** or **React Context** to manage global state (Auth, UI Theme, Toast Notifications).

### 4.3. Mobile Experience (Capacitor)
*   **Infinite Scroll**: The custom `IntersectionObserver` implementation in `Feed.tsx` may be jerky on lower-end mobile devices.
*   **Recommendation**: Use a virtualization library like `react-window` or `virtuoso` to render long lists efficiently.
*   **Config**: `capacitor.config.json` is minimal. Ensure `server.url` is configured for local development and removed for production builds.

---

## 5. Database & Data Integrity

### 5.1. Schema Management
*   **Issue**: Migration files are scattered (`root/*.sql` vs `supabase/migrations/*.sql`).
*   **Risk**: It is unclear which migrations have been applied to the production database.
*   **Fix**: Consolidate all SQL scripts into timestamped migrations within `supabase/migrations` and use the Supabase CLI for all schema changes.

### 5.2. Concurrency
*   **Good Practice**: The `purchase_ticket` function uses `FOR UPDATE` to lock the event row. This correctly prevents race conditions where multiple users might buy the last ticket simultaneously.

---

## 6. Action Plan

1.  **IMMEDIATE**: Patch `purchase_ticket` RPC to validate payment transactions.
2.  **High Priority**: Refactor `Feed.tsx` into smaller sub-components (`FeedPost`, `StoriesRail`, `FeedFilter`).
3.  **Medium Priority**: specific `App.tsx` state into React Contexts (`AuthContext`, `ChatContext`).
4.  **Low Priority**: Clean up `supabase/migrations` folder and archive old root-level SQL files.
