// One-shot backfill: for the calling organizer, fetches all Cloudflare Stream recordings
// associated with their live inputs and upserts them into cloudflare_streams + stamps
// streaming.replayAvailable on the matching events.
//
// Call: POST /cloudflare-stream-backfill   (Authorization: Bearer <user JWT>)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const CF_ACCOUNT_ID = Deno.env.get("CLOUDFLARE_ACCOUNT_ID");
const CF_STREAM_TOKEN = Deno.env.get("CLOUDFLARE_STREAM_TOKEN");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    if (!CF_ACCOUNT_ID || !CF_STREAM_TOKEN) {
      return json({ error: "Cloudflare not configured" }, 500);
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);
    const userId = userData.user.id;

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // All events owned by this user that have a CF live input attached
    const { data: events, error: evErr } = await admin
      .from("events")
      .select("id, organizer_id, title, image_url, streaming")
      .eq("organizer_id", userId);
    if (evErr) return json({ error: evErr.message }, 500);

    const liveInputs = (events || [])
      .map((e: any) => ({
        eventId: e.id as number,
        title: e.title as string,
        image_url: e.image_url as string | null,
        liveInputUid: (e.streaming || {}).cf_live_input_uid as string | undefined,
        streaming: (e.streaming || {}) as Record<string, unknown>,
      }))
      .filter((e) => !!e.liveInputUid);

    let totalRecordings = 0;
    const results: Array<Record<string, unknown>> = [];

    for (const ev of liveInputs) {
      // List videos for this live input
      const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/stream?live_input=${ev.liveInputUid}`;
      const cfRes = await fetch(url, {
        headers: { Authorization: `Bearer ${CF_STREAM_TOKEN}` },
      });
      const cfJson = await cfRes.json().catch(() => null);
      if (!cfRes.ok || !cfJson?.success) {
        results.push({ eventId: ev.eventId, error: cfJson?.errors || "cf list failed" });
        continue;
      }

      const videos: any[] = Array.isArray(cfJson.result) ? cfJson.result : [];
      // Prefer the most recent ready recording
      const ready = videos
        .filter((v) => v?.readyToStream === true || v?.status?.state === "ready")
        .sort((a, b) => new Date(b.created || 0).getTime() - new Date(a.created || 0).getTime());

      for (const v of videos) {
        const videoUid = v?.uid;
        if (!videoUid || videoUid === ev.liveInputUid) continue;
        const hls: string = v?.playback?.hls || `https://videodelivery.net/${videoUid}/manifest/video.m3u8`;
        await admin.from("cloudflare_streams").upsert({
          user_id: userId,
          event_id: ev.eventId,
          uid: videoUid,
          live_input_uid: ev.liveInputUid!,
          title: v?.meta?.name || ev.title || "Streamed video",
          thumbnail_url: v?.thumbnail || ev.image_url || null,
          preview_url: v?.preview || null,
          playback_url: hls,
          duration: typeof v?.duration === "number" ? v.duration : null,
          status: v?.status?.state || (v?.readyToStream ? "ready" : null),
          raw_payload: v || {},
          updated_at: new Date().toISOString(),
        }, { onConflict: "uid" });
        totalRecordings++;
      }

      // Stamp the latest ready recording onto the event so the fallback path works
      const latest = ready[0];
      if (latest?.uid) {
        const hls: string = latest?.playback?.hls ||
          `https://videodelivery.net/${latest.uid}/manifest/video.m3u8`;
        const updated = {
          ...ev.streaming,
          isLive: false,
          replayAvailable: true,
          recording_uid: latest.uid,
          recording_url: hls,
          playback_url: hls,
          replay_thumbnail: latest?.thumbnail || undefined,
          recordingReadyAt: Date.now(),
        };
        await admin.from("events").update({ streaming: updated }).eq("id", ev.eventId);
      }

      results.push({ eventId: ev.eventId, recordings: videos.length, latest: latest?.uid || null });
    }

    return json({ ok: true, totalRecordings, eventsScanned: liveInputs.length, results });
  } catch (err) {
    console.error("backfill error", err);
    return json({ error: err instanceof Error ? err.message : "unknown" }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
