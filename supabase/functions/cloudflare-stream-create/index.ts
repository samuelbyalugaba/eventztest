// Provisions a Cloudflare Stream Live Input for an event.
// Returns RTMPS ingest URL + stream key (for OBS) and HLS playback URL (for viewers).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getCorsHeaders, corsResponse, corsOptionsResponse } from "../shared/cors.ts";

const CF_ACCOUNT_ID = Deno.env.get("CLOUDFLARE_ACCOUNT_ID");
const CF_STREAM_TOKEN = Deno.env.get("CLOUDFLARE_STREAM_TOKEN");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return corsOptionsResponse(req);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return corsResponse({ error: "Unauthorized" }, 401, req);
    }

    if (!CF_ACCOUNT_ID || !CF_STREAM_TOKEN) {
      return corsResponse({
        error:
          "Cloudflare Stream not configured. Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_STREAM_TOKEN secrets.",
      }, 500, req);
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !userData?.user) {
      return corsResponse({ error: "Unauthorized" }, 401, req);
    }
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const eventId = Number(body.eventId);
    if (!eventId || Number.isNaN(eventId)) {
      return corsResponse({ error: "eventId is required" }, 400, req);
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify caller owns the event
    const { data: event, error: evErr } = await admin
      .from("events")
      .select("id, organizer_id, streaming, title")
      .eq("id", eventId)
      .single();

    if (evErr || !event) return corsResponse({ error: "Event not found" }, 404, req);
    if (event.organizer_id !== userId) {
      return corsResponse({ error: "Forbidden" }, 403, req);
    }

    const existing = (event.streaming || {}) as Record<string, unknown>;

    // If we already provisioned a Cloudflare live input for this event, reuse it.
    if (existing.provider === "cloudflare" && existing.cf_live_input_uid) {
      return corsResponse({
        ingestUrl: existing.ingest_url,
        streamKey: existing.stream_key,
        playbackUrl: existing.playback_url,
        liveInputUid: existing.cf_live_input_uid,
        reused: true,
      }, 200, req);
    }

    // Create a new Live Input on Cloudflare Stream
    const cfPayload = {
      meta: { name: `event-${eventId}` },
      recording: { mode: "automatic", requireSignedURLs: false },
      defaultCreator: userId,
    };
    console.log("Cloudflare request payload:", JSON.stringify(cfPayload));

    const cfRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/stream/live_inputs`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${CF_STREAM_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(cfPayload),
      },
    );

    const cfJson = await cfRes.json();
    if (!cfRes.ok || !cfJson?.success) {
      console.error("Cloudflare error", JSON.stringify(cfJson));
      return corsResponse({
        error: "Cloudflare API error",
        details: cfJson?.errors || cfJson,
      }, 502, req);
    }

    const result = cfJson.result;
    const liveInputUid: string = result.uid;
    const rtmps = result.rtmps; // { url, streamKey }
    const ingestUrl: string = rtmps?.url ?? "rtmps://live.cloudflare.com:443/live/";
    const streamKey: string = rtmps?.streamKey ?? "";
    // Cloudflare exposes HLS via the manifest URL pattern using the customer subdomain.
    // For live, the playback url is at:
    //   https://customer-<code>.cloudflarestream.com/<inputUID>/manifest/video.m3u8
    // The customer subdomain is returned at result.playback?.hls (when available).
    const playbackUrl: string = result.playback?.hls ??
      `https://videodelivery.net/${liveInputUid}/manifest/video.m3u8`;

    const streamingUpdate = {
      ...existing,
      provider: "cloudflare",
      cf_live_input_uid: liveInputUid,
      ingest_url: ingestUrl,
      stream_key: streamKey,
      playback_url: playbackUrl,
      channel: `event-${eventId}`,
    };

    const { error: updErr } = await admin
      .from("events")
      .update({ streaming: streamingUpdate })
      .eq("id", eventId);

    if (updErr) {
      console.error("DB update error", updErr);
      return corsResponse({ error: "Failed to save stream config" }, 500, req);
    }

    return corsResponse({
      ingestUrl,
      streamKey,
      playbackUrl,
      liveInputUid,
      reused: false,
    }, 200, req);
  } catch (err) {
    console.error("create-stream error", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return corsResponse({ error: msg }, 500, req);
  }
});
