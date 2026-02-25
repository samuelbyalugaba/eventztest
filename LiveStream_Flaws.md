# LiveStream Feature Analysis - Global Scale Fix Checklist

## 1. Executive Summary
The current Livestream implementation is a **Proof of Concept (PoC)** suitable for demos or very small user bases (< 50 viewers). It is **not production-ready** for a global audience. 

While the basic WebRTC (Agora) video flow works, the backend architecture handles state (chat, viewer counts, interactions) in a way that will cause immediate database bottlenecks, race conditions, and heavy costs at scale. The RTMP (OBS) feature is currently non-functional (stubbed).

## 2. Critical Blockers (Must Fix Immediately)

### 🚨 1. Fake RTMP Implementation
*   **Issue:** The `generateStreamKeys` function in `api.ts` returns a hardcoded local URL (`rtmp://rtmp.eventz-bridge.local/live`). This will simply fail for any real user trying to stream via OBS.
*   **Impact:** Feature is broken.
*   [ ] **Fix:** Integrate a real media server provider (e.g., Mux, AWS IVS, or a self-hosted Node-Media-Server) to generate valid ingest endpoints.

### 🚨 2. Security Vulnerability in Token Generation
*   **Issue:** The `agora-rtc-token` Edge Function generates a `publisher` token for *anyone* who requests it, provided they know the `channelName` (predictable: `event-{id}`) and an arbitrary `uid`.
*   **Impact:** A malicious user can hijack a stream by generating a publisher token for an active event ID.
*   [ ] **Fix:** The Edge Function **must** validate that the user requesting a `publisher` token is indeed the **organizer** of the event (by querying the `events` table) before issuing the token.

### 🚨 3. Race Conditions in Viewer Count
*   **Issue:** `updateLiveViewerCount` performs a `SELECT` followed by an `UPDATE`.
    ```typescript
    const currentCount = currentStreaming.liveViewers || 0;
    // ... wait ...
    await supabase.from('events').update({ liveViewers: currentCount + 1 })
    ```
*   **Impact:** Under high concurrency (e.g., 100 users joining in 1 second), most updates will be overwritten. The viewer count will be wildly inaccurate.
*   [ ] **Fix:** Use a Postgres RPC for **atomic increments** (`live_viewers = live_viewers + 1`) OR use Supabase Presence (client-side approximation) for cheaper, real-time counting without DB writes.

### 🚨 4. Camera & Mic Not Closing (Hardware Leak)
*   **Issue:** When the broadcaster closes the streaming window, the camera and microphone light remain on.
*   **Root Cause:** The `useEffect` cleanup function in `StreamManager.tsx` has an empty dependency array `[]`. It captures the *initial* state of `localAudioTrack` and `localVideoTrack` (which are `null`). When the component unmounts, it tries to close `null` tracks, leaving the actual hardware tracks active.
*   [x] **Fix:** Use a `useRef` to track the active media tracks so the cleanup function can access the current instances, or update the dependency array correctly (though `useRef` is safer for cleanup).

## 3. Scalability & Performance Flaws

### ⚠️ 1. Chat Architecture (The "DB Hammer")
*   **Issue:** Every chat message is an `INSERT` into Postgres. Every client subscribes to `postgres_changes`.
*   **Impact:** With 10,000 viewers, a "hype" moment (100 msgs/sec) will trigger 10,000 * 100 = 1,000,000 events/sec sent out by Supabase. This will kill the database connection pool and incur massive costs.
*   **Fix:** 
    *   [ ] **Short Term:** Throttle chat updates on the client.
    *   [ ] **Long Term (Global Scale):** Decouple chat from the DB. Use an ephemeral Pub/Sub system (e.g., Redis, Firebase Realtime DB, or Supabase Broadcast Channels) for live chat. Only persist logs to Postgres asynchronously (batch processing).

### ⚠️ 2. Infinite State Growth (Memory Leak)
*   **Issue:** 
    *   `LiveStreamViewer.tsx`: `setMessages(prev => [...prev, msg])`
    *   `LiveStreamViewer.tsx`: `setReactions(prev => [...prev, Date.now()])`
*   **Impact:** On a long stream, the browser memory will bloat until the tab crashes. DOM nodes for messages will reach thousands.
*   [ ] **Fix:** Implement **Virtualization** (e.g., `react-virtuoso`) for chat and cap the `messages` array (e.g., keep last 200). Remove old reaction DOM nodes after animation completes.

### ⚠️ 3. Inefficient Data Fetching
*   **Issue:** `getStreamMessages` fetches the last 50 messages, but `subscribeToStreamMessages` listens to *everything*.
*   [ ] **Fix:** Ensure the subscription filter is tight. For high volume, implement "room" logic to shard users if necessary.

## 4. UI/UX Flaws & Broken Buttons

### ❌ 1. Non-Functional "Fake" Buttons
*   **Like Button:** Updates local state only (`setLikes`). Other viewers cannot see these likes, and they are not saved to the server.
*   **Gift Button:** Completely non-functional (no `onClick` handler).
*   **Follow Button:** Completely non-functional (no `onClick` handler).
*   [x] **Fix:** Implement backend logic for these actions or hide them until implemented.

### ❌ 2. No Adaptive Quality Control
*   **Issue:** The viewer is forced to whatever bandwidth is available. No UI to select "Low Data Mode" or specific resolutions (720p, 480p).
*   [ ] **Fix:** Implement the Agora quality switching API and expose a settings gear icon for viewers.

### ❌ 3. Lack of Reconnection State
*   **Issue:** If the internet drops, the screen might freeze or show black without clear "Reconnecting..." feedback.
*   [ ] **Fix:** Listen to Agora's `connection-state-change` events and overlay a distinct UI loader/status message.

### ❌ 4. Mobile vs Desktop Layout
*   **Issue:** The layout is hardcoded to `aspect-[9/16]` (Mobile Portrait). On a desktop, this looks like a giant phone screen in the middle of a black void.
*   [ ] **Fix:** Responsive layout. Desktop should allow a landscape mode or a "Theater Mode" with chat on the side, not floating over the video.

## 5. Code Quality & Maintenance

### 🔧 1. Hardcoded Secrets (Frontend)
*   **Issue:** `LiveStreamViewer.tsx` imports `AGORA_APP_ID`. If this file is committed to a public repo without env var handling, it's a leak.
*   [ ] **Fix:** Ensure `AGORA_APP_ID` is strictly an environment variable (`import.meta.env.VITE_AGORA_APP_ID`).

### 🔧 2. Missing Error Boundaries
*   **Issue:** If the Agora client crashes or the Supabase subscription fails, the entire component might unmount or leave the user in a broken state.
*   [ ] **Fix:** Wrap the player in a React Error Boundary to offer a "Reload Player" button without refreshing the whole page.

## 6. Implementation Plan (The "Senior Dev" Path)

1.  [x] **Fix Hardware Leak:** Patch `StreamManager.tsx` cleanup logic immediately.
2.  [ ] **Secure the Backend:** Rewrite `agora-rtc-token` to validate ownership.
3.  [ ] **Fix the Counter:** Implement `rpc('increment_viewer_count')`.
4.  [x] **Implement Interactions:** Connect Like/Follow/Gift buttons to real API endpoints.
5.  [ ] **Virtualize Chat:** Replace the chat list with a virtualized list.
6.  [ ] **Real RTMP:** Integrate Mux/IVS or build a Node-Media-Server container.
7.  [ ] **Optimize Network:** Switch Chat from "Persist-First" to "Broadcast-First" (Supabase Channels).
