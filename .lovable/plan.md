# Fix stream replays (and track down the white screen)

## What I verified

- The `cloudflare_streams` table is **empty** — no recording rows have ever been saved.
- The only event with live-stream metadata (id 99, "Test Stream") stores:
  `playback_url = https://videodelivery.net/61edb.../manifest/video.m3u8`, where `61edb...` is the
  **live input UID** (`cf_live_input_uid`), not a recording UID.
- The Hosted > Streams tab falls back to that event metadata and builds the player URL straight from
  it, so the Cloudflare player is asked to play a *live input* that is no longer broadcasting —
  hence "stream has not started yet".
- The app itself loads fine at `/` (login screen renders). One page error is present in the console
  ("Incorrect locale information provided"), source not yet identified.

## The replay fix

A live input UID and a recording (VOD) UID are two different things. The UI currently treats them as
interchangeable. Fix it in three layers:

1. **New helper `src/utils/streamPlayback.ts`**
   - `extractStreamUid(url)` — pull the UID out of any videodelivery/cloudflarestream URL.
   - `getRecordingUid(stream)` — returns a real recording UID, checking, in order:
     `streaming.recording_uid`, UID in `streaming.recording_url`, `stream.uid` (when not the
     synthetic `event-<id>`), UID in `stream.playback_url`, UID in `streaming.playback_url` —
     and **discarding any candidate equal to the live input UID**.
   - `getReplayIframeUrl(stream)` / `streamHasReplay(stream)` / `getReplayThumbnail(stream)`.

2. **`src/components/profile/HostedPage.tsx`**
   - Replace the local `streamHasPlayback`, `streamThumbnailUrl` and `getStreamPlaybackUrl` with the
     shared helpers, so a stream with only a live-input URL is listed as "Processing / no replay"
     instead of opening a dead player.
   - Filter the Streams tab on `streamHasReplay`.
   - Trigger the existing `cloudflare-stream-backfill` function whenever a listed stream has no
     recording UID (today it only fires for `event-` prefixed UIDs), and refresh the list after it
     returns.

3. **`src/components/profile/ProfileContent.tsx`**
   - Same swap for its `getStreamPlaybackUrl` / `hasPlayableRecording`, which currently blindly
     builds `iframe.videodelivery.net/<uid>` from whatever UID is present.

Also update the empty/te placeholder copy so it says the replay is still processing and will appear
once Cloudflare finishes the recording.

## Why the recordings are missing at all

The backfill function is correct but has never populated the table, and the webhook has never
written a recording row. Two prerequisites must hold on the Cloudflare side:

- the live input must have **recording enabled** (`mode: "automatic"`) — otherwise Cloudflare keeps
  no VOD and no replay can ever exist;
- the Stream webhook must point at `cloudflare-stream-webhook`.

As part of this work I will make `cloudflare-stream-create` set `recording: { mode: "automatic" }` on
new live inputs, and have the backfill report clearly when Cloudflare returns zero recordings for a
live input, so the UI can say "recording was not enabled for this stream" instead of silently
showing a broken player.

## White screen

Not reproducible at `/` from here — the app renders. I need the route to fix it precisely, so step
one is to load the route you saw blank, capture the page error, and fix that component. The
"Incorrect locale information provided" error already visible in the console is the leading
candidate and will be tracked to its source and fixed regardless.

**Which page showed the white screen?**
