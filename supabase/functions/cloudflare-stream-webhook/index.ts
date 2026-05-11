// Receives Cloudflare Stream webhook notifications (live input connect/disconnect, recording ready).
// Updates the matching event's streaming state and saves completed recordings for profile playback.
//
// Configure in Cloudflare dashboard: Stream → Webhooks → add this function URL.
// Cloudflare signs requests with HMAC SHA-256 in the `Webhook-Signature` header.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, webhook-signature",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WEBHOOK_SECRET = Deno.env.get("CLOUDFLARE_STREAM_WEBHOOK_SECRET");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const raw = await req.text();

    // Verify Cloudflare signature when secret configured
    if (WEBHOOK_SECRET) {
      const sigHeader = req.headers.get("Webhook-Signature") || "";
      const ok = await verifyCfSignature(raw, sigHeader, WEBHOOK_SECRET);
      if (!ok) return new Response("Invalid signature", { status: 401 });
    }

    const payload = JSON.parse(raw);
    const liveInputUid = getString(payload, [
      "live_input_uid",
      "liveInputUid",
      "live_input.uid",
      "liveInput.uid",
      "input.uid",
      "video.live_input_uid",
      "video.liveInputUid",
      "video.input.uid",
      "data.live_input_uid",
      "data.liveInputUid",
      "data.live_input.uid",
      "data.liveInput.uid",
      "data.input.uid",
      "data.video.live_input_uid",
      "data.video.liveInputUid",
      "data.video.input.uid",
      "meta.live_input_uid",
      "meta.liveInputUid",
      "result.live_input_uid",
      "result.liveInputUid",
      "result.input.uid",
    ]);
    const status = getString(payload, [
      "status",
      "notification_type",
      "event",
      "type",
      "data.status",
      "data.event",
      "data.type",
      "video.status",
      "result.status",
    ]);
    const eventIdFromPayload = getEventIdFromPayload(payload);

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Find event by live input uid (matches inside JSONB streaming.cf_live_input_uid)
    let query = admin
      .from("events")
      .select("id, organizer_id, title, image_url, streaming")
      .limit(1);

    if (liveInputUid) {
      query = query.eq("streaming->>cf_live_input_uid", liveInputUid);
    } else if (eventIdFromPayload) {
      query = query.eq("id", eventIdFromPayload);
    } else {
      console.warn("Webhook missing live input uid and event id", payload);
      return new Response("ok", { status: 200 });
    }

    const { data: events, error } = await query;

    if (error || !events?.length) {
      console.warn("No event found for Cloudflare webhook", { liveInputUid, eventIdFromPayload });
      return new Response("ok", { status: 200 });
    }

    const event = events[0];
    const streaming = (event.streaming || {}) as Record<string, unknown>;

    // Map Cloudflare status → our flags
    const isConnect = /connect|live_input.*connected|streaming/i.test(
      String(status),
    );
    const isDisconnect = /disconnect|stopped|ended/i.test(String(status));

    let updated: Record<string, unknown> = { ...streaming, last_cf_status: status };
    if (isConnect) updated = { ...updated, isLive: true, startedAt: Date.now() };
    if (isDisconnect) updated = { ...updated, isLive: false };

    await admin
      .from("events")
      .update({ streaming: updated })
      .eq("id", event.id);

    const videoUid = getString(payload, [
      "uid",
      "id",
      "video.uid",
      "video.id",
      "data.uid",
      "data.id",
      "data.video.uid",
      "data.video.id",
      "meta.uid",
      "result.uid",
      "result.id",
    ]);

    if (videoUid) {
      const duration = getNumber(payload, [
        "duration",
        "video.duration",
        "data.duration",
        "data.video.duration",
        "result.duration",
      ]);
      const thumbnail = getString(payload, [
        "thumbnail",
        "thumbnail_url",
        "video.thumbnail",
        "data.thumbnail",
        "data.thumbnail_url",
        "data.video.thumbnail",
        "result.thumbnail",
      ]);
      const preview = getString(payload, [
        "preview",
        "preview_url",
        "video.preview",
        "data.preview",
        "data.preview_url",
        "data.video.preview",
        "result.preview",
      ]);

      await admin
        .from("cloudflare_streams")
        .upsert({
          user_id: event.organizer_id,
          event_id: event.id,
          uid: videoUid,
          live_input_uid: liveInputUid || String(streaming.cf_live_input_uid || ""),
          title: getString(payload, ["name", "data.name", "video.name", "result.name"]) ||
            event.title ||
            "Streamed video",
          thumbnail_url: thumbnail || event.image_url || null,
          preview_url: preview || null,
          playback_url: `https://iframe.videodelivery.net/${videoUid}`,
          duration,
          status: status || null,
          raw_payload: payload,
          updated_at: new Date().toISOString(),
        }, { onConflict: "uid" });
    }

    return new Response("ok", { status: 200 });
  } catch (err) {
    console.error("webhook error", err);
    return new Response("ok", { status: 200 }); // 200 so Cloudflare doesn't retry forever
  }
});

function getPath(source: unknown, path: string): unknown {
  return path.split(".").reduce((value: any, key) => value?.[key], source as any);
}

function getString(source: unknown, paths: string[]): string | null {
  for (const path of paths) {
    const value = getPath(source, path);
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function getEventIdFromPayload(source: unknown): number | null {
  const direct = getNumber(source, [
    "event_id",
    "eventId",
    "data.event_id",
    "data.eventId",
    "meta.event_id",
    "meta.eventId",
    "result.event_id",
    "result.eventId",
  ]);
  if (direct && direct > 0) return direct;

  const name = getString(source, [
    "name",
    "data.name",
    "video.name",
    "data.video.name",
    "result.name",
    "meta.name",
    "data.meta.name",
  ]);
  const match = name?.match(/event-(\d+)/i);
  if (!match) return null;

  const eventId = Number(match[1]);
  return Number.isFinite(eventId) && eventId > 0 ? eventId : null;
}

function getNumber(source: unknown, paths: string[]): number | null {
  for (const path of paths) {
    const value = getPath(source, path);
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
      return Number(value);
    }
  }
  return null;
}

async function verifyCfSignature(
  body: string,
  header: string,
  secret: string,
): Promise<boolean> {
  // Cloudflare format: "time=TIMESTAMP,sig1=HEX_HMAC"
  try {
    const parts = Object.fromEntries(
      header.split(",").map((p) => p.trim().split("=")),
    );
    const timestamp = parts.time;
    const sig = parts.sig1;
    if (!timestamp || !sig) return false;

    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const mac = await crypto.subtle.sign(
      "HMAC",
      key,
      enc.encode(`${timestamp}.${body}`),
    );
    const hex = [...new Uint8Array(mac)]
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return hex === sig;
  } catch {
    return false;
  }
}
