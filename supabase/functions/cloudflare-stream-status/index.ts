// Polls Cloudflare Stream Live Input state and syncs events.streaming.isLive.
// Public — anyone can trigger a refresh; we only update DB when CF says state changed.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const CF_ACCOUNT_ID = Deno.env.get("CLOUDFLARE_ACCOUNT_ID");
const CF_STREAM_TOKEN = Deno.env.get("CLOUDFLARE_STREAM_TOKEN");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!CF_ACCOUNT_ID || !CF_STREAM_TOKEN) {
      return json({ error: "Cloudflare not configured" }, 500);
    }
    const body = await req.json().catch(() => ({}));
    const eventId = body.eventId ? Number(body.eventId) : null;

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch the events to check (single event or all cloudflare-provisioned events)
    let query = admin
      .from("events")
      .select("id, streaming")
      .not("streaming->>cf_live_input_uid", "is", null);
    if (eventId) query = query.eq("id", eventId);

    const { data: events, error } = await query;
    if (error) return json({ error: error.message }, 500);

    const results: Array<Record<string, unknown>> = [];

    for (const ev of events || []) {
      const streaming = (ev.streaming || {}) as Record<string, any>;
      const uid = streaming.cf_live_input_uid;
      if (!uid) continue;

      const cfRes = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/stream/live_inputs/${uid}`,
        { headers: { Authorization: `Bearer ${CF_STREAM_TOKEN}` } },
      );
      const cfJson = await cfRes.json();
      if (!cfRes.ok || !cfJson?.success) {
        results.push({ eventId: ev.id, error: cfJson?.errors || "cf_error" });
        continue;
      }

      // CF returns status.current.state: 'connected' | 'disconnected' | etc.
      const state: string | undefined = cfJson.result?.status?.current?.state;
      const isLive = state === "connected";
      const wasLive = !!streaming.isLive;

      if (isLive !== wasLive) {
        const updated: Record<string, unknown> = {
          ...streaming,
          isLive,
          last_cf_status: state,
        };
        if (isLive) updated.startedAt = Date.now();
        await admin.from("events").update({ streaming: updated }).eq("id", ev.id);
      }
      results.push({ eventId: ev.id, state, isLive, changed: isLive !== wasLive });
    }

    return json({ results });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return json({ error: msg }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
