// Starts / stops Agora Cloud Recording for a webcam (Agora) livestream.
// The recording is written directly to Supabase Storage via its S3-compatible
// endpoint (vendor 11 / self-built S3). On stop it is registered for replay by
// inserting a row into `cloudflare_streams` (the app's recordings table) and
// patching `events.streaming` with the playback URL.
//
// Secrets required:
//   AGORA_APP_ID, AGORA_APP_CERTIFICATE
//   AGORA_CUSTOMER_ID, AGORA_CUSTOMER_CERTIFICATE   (REST basic auth)
//   S3_ACCESS_KEY, S3_SECRET_KEY                    (Storage S3 keys)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { RtcTokenBuilder, RtcRole } from "https://esm.sh/agora-access-token@2.0.4";

const APP_ID = Deno.env.get("AGORA_APP_ID") || "";
const APP_CERTIFICATE = Deno.env.get("AGORA_APP_CERTIFICATE") || "";
const CUSTOMER_ID = Deno.env.get("AGORA_CUSTOMER_ID") || "";
const CUSTOMER_CERTIFICATE = Deno.env.get("AGORA_CUSTOMER_CERTIFICATE") || "";
const S3_ACCESS_KEY = Deno.env.get("S3_ACCESS_KEY") || "";
const S3_SECRET_KEY = Deno.env.get("S3_SECRET_KEY") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
// Supabase S3 endpoint (host + path, no scheme) — path-style requests against it.
const S3_ENDPOINT = Deno.env.get("S3_ENDPOINT") ||
  "xikoggtidxqtjetiqsnj.storage.supabase.co/storage/v1/s3";
const S3_BUCKET = Deno.env.get("S3_BUCKET") || "recordings";

// Inline CORS helpers. Note: importing ../shared/cors.ts is NOT bundled on this
// deploy path ("Module not found .../shared/cors.ts"), so we keep them local.
const ALLOWED_ORIGINS = [
  "https://eventz.app",
  "https://www.eventz.app",
  "https://app.eventz.app",
  "https://eventz.live",
  "https://www.eventz.live",
  "https://app.eventz.live",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:8080",
];

const ALLOWED_ORIGIN_PATTERNS = [
  /^https:\/\/[a-z0-9-]+\.lovable\.app$/i,
  /^https:\/\/[a-z0-9-]+\.lovableproject\.com$/i,
  /^https:\/\/[a-z0-9-]+\.vercel\.app$/i,
  /^capacitor:\/\/localhost$/i,
  /^http:\/\/localhost(:\d+)?$/i,
];

function isAllowed(origin: string): boolean {
  return ALLOWED_ORIGINS.includes(origin) || ALLOWED_ORIGIN_PATTERNS.some((p) => p.test(origin));
}

function getCorsHeaders(req?: Request): Record<string, string> {
  const origin = req?.headers?.get("origin") || "";
  const allowedOrigin = isAllowed(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Vary": "Origin",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-eventz-internal-secret",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Credentials": "true",
  };
}

function corsResponse(body: unknown, status = 200, req?: Request): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
  });
}

function corsOptionsResponse(req?: Request): Response {
  return new Response("ok", { headers: getCorsHeaders(req) });
}

// Cloud Recording RESTful API moved to api.sd-rtn.com, and the acquire endpoint
// no longer carries the /resourceid/ path segment. Other endpoints keep it.
const AGORA_API_BASE = `https://api.sd-rtn.com/v1/apps/${APP_ID}/cloud_recording`;
const MAX_IDLE_TIME = 120; // seconds before Agora auto-stops the recording
const TOKEN_EXPIRY = 86400; // recording token valid for 24h

async function agoraRequest(
  method: string,
  path: string,
  body?: unknown,
): Promise<Record<string, any>> {
  const auth = `Basic ${btoa(`${CUSTOMER_ID}:${CUSTOMER_CERTIFICATE}`)}`;
  const res = await fetch(`${AGORA_API_BASE}${path}`, {
    method,
    headers: { Authorization: auth, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json: Record<string, any> = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      `Agora ${method} ${path} failed (${res.status}) for appId "${APP_ID}": ${JSON.stringify(json)}`,
    );
  }
  return json;
}

function recordingToken(channelName: string, recorderUid: number): string {
  const privilegeExpiredTs = Math.floor(Date.now() / 1000) + TOKEN_EXPIRY;
  return RtcTokenBuilder.buildTokenWithUid(
    APP_ID,
    APP_CERTIFICATE,
    channelName,
    recorderUid,
    RtcRole.SUBSCRIBER,
    privilegeExpiredTs,
  );
}

function newRecorderUid(): { uidStr: string; uidInt: number } {
  // 9-digit numeric UID to avoid colliding with host accounts (host uses organizer UUID).
  const uidInt = Math.floor(100000000 + Math.random() * 899999999);
  return { uidStr: String(uidInt), uidInt };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return corsOptionsResponse(req);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return corsResponse({ error: "Unauthorized" }, 401, req);
    }
    if (!APP_ID || !APP_CERTIFICATE || !CUSTOMER_ID || !CUSTOMER_CERTIFICATE || !S3_ACCESS_KEY || !S3_SECRET_KEY) {
      return corsResponse({
        error: "Agora Cloud Recording / S3 credentials are not fully configured.",
      }, 500, req);
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "").toLowerCase();
    const eventId = Number(body.eventId);
    if (!["start", "stop", "status"].includes(action)) {
      return corsResponse({ error: "action must be start | stop | status" }, 400, req);
    }
    if (!eventId || Number.isNaN(eventId)) {
      return corsResponse({ error: "eventId is required" }, 400, req);
    }

    // Verify the caller owns the event.
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !userData?.user) {
      return corsResponse({ error: "Unauthorized" }, 401, req);
    }
    const userId = userData.user.id;

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: event, error: evErr } = await admin
      .from("events")
      .select("id, organizer_id, title, image_url, streaming")
      .eq("id", eventId)
      .single();
    if (evErr || !event) return corsResponse({ error: "Event not found" }, 404, req);
    if (event.organizer_id !== userId) {
      return corsResponse({ error: "Forbidden" }, 403, req);
    }

    const streaming = (event.streaming || {}) as Record<string, any>;
    const channelName = `event-${eventId}`;
    const prefixPath = `recordings/event${eventId}`;
    const rec = (streaming.agoraRecording || {}) as Record<string, any>;

    if (action === "start") {
      if (rec?.resourceId && rec?.sid && rec?.status === "recording") {
        return corsResponse({
          resourceId: rec.resourceId,
          sid: rec.sid,
          alreadyRecording: true,
        }, 200, req);
      }

      const { uidStr, uidInt } = newRecorderUid();

      try {
        const acquire = await agoraRequest("POST", "/acquire", {
          cname: channelName,
          uid: uidStr,
          clientRequest: { resourceExpiredHour: 24 },
        });
        const resourceId = acquire?.resourceId;
        if (!resourceId) throw new Error("acquire returned no resourceId");

        // Composite (mix) mode transcodes all streams to a fixed canvas and
        // produces a single playable MP4 (plus HLS). The canvas size is supplied
        // by the client so it matches the recorder's current screen orientation.
        const orientation = String(body.orientation || 'portrait');
        const isLandscape = orientation === 'landscape';
        const canvasW = isLandscape ? 1280 : 720;
        const canvasH = isLandscape ? 720 : 1280;
        const start = await agoraRequest("POST", `/resourceid/${resourceId}/mode/mix/start`, {
          cname: channelName,
          uid: uidStr,
          clientRequest: {
            token: recordingToken(channelName, uidInt),
            storageConfig: {
              vendor: 11,
              region: 0,
              bucket: S3_BUCKET,
              accessKey: S3_ACCESS_KEY,
              secretKey: S3_SECRET_KEY,
              fileNamePrefix: ["recordings", `event${eventId}`],
              extensionParams: { endpoint: S3_ENDPOINT },
            },
            // Composite (mix) mode: `transcodingConfig` MUST be nested inside
            // `recordingConfig` and `avFileType` lives in `recordingFileConfig`.
            // Putting avFileType inside recordingConfig (or moving transcodingConfig
            // to the top level) makes Agora write only HLS and never finalize the MP4.
            recordingConfig: {
              channelType: 0,
              streamTypes: 2,
              maxIdleTime: MAX_IDLE_TIME,
              transcodingConfig: {
                width: canvasW,
                height: canvasH,
                fps: 30,
                bitrate: isLandscape ? 4500 : 2500,
                mixedVideoLayout: 1,
                backgroundColor: "#000000",
              },
            },
            // Composite requires MP4 alongside HLS; ["mp4"] alone errors.
            recordingFileConfig: {
              avFileType: ["hls", "mp4"],
              videoStreamType: 0,
            },
          },
        });
        const sid = start?.sid;
        if (!sid) throw new Error("start returned no sid");

        await admin
          .from("events")
          .update({
            streaming: {
              ...streaming,
              agoraRecording: {
                resourceId,
                sid,
                uid: uidStr,
                status: "recording",
                startedAt: Date.now(),
              },
            },
          })
          .eq("id", eventId);

        return corsResponse({ success: true, resourceId, sid }, 200, req);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        console.error("agora-cloud-recording start error", msg);
        // Surface the failure on the event so it is visible instead of silent.
        await admin
          .from("events")
          .update({
            streaming: {
              ...streaming,
              agoraRecording: {
                ...(streaming.agoraRecording || ({} as Record<string, any>)),
                status: "error",
                error: msg,
                startedAt: Date.now(),
              },
            },
          })
          .eq("id", eventId);
        return corsResponse({ success: false, error: msg }, 500, req);
      }
    }

    if (!rec?.resourceId || !rec?.sid) {
      return corsResponse({ success: false, alreadyStopped: true }, 200, req);
    }

    if (action === "status") {
      const queried = await agoraRequest(
        "GET",
        `/resourceid/${rec.resourceId}/sid/${rec.sid}/mode/mix/query`,
      ).catch(() => ({}));
      return corsResponse({ status: queried?.serverResponse || queried, sid: rec.sid }, 200, req);
    }

    // ---- stop ----
    let stopResponse: Record<string, any> = {};
    let workerGone = false; // 404 "failed to find worker" = already auto-stopped
    try {
      stopResponse = await agoraRequest(
        "POST",
        `/resourceid/${rec.resourceId}/sid/${rec.sid}/mode/mix/stop`,
        {
          cname: channelName,
          uid: String(rec.uid || "0"),
          clientRequest: { async_stop: false },
        },
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      // The recorder worker already terminated (idle-expired or double stop). A
      // dead worker can never yield a file list, so there is no point polling it.
      workerGone = msg.includes("(404)");
      console.warn(workerGone
        ? "agora worker already gone on stop (no further closeout possible)"
        : "agora stop failed (likely already stopped):", msg);
    }

    let serverResponse = stopResponse?.serverResponse || {};
    let fileList: Array<Record<string, any>> = Array.isArray(serverResponse.fileList)
      ? serverResponse.fileList
      : [];

    // The MP4 may still be uploading to S3 when the synchronous stop returns
    // (empty fileList). Poll `query` briefly until the upload completes, then
    // re-stop to fetch the final file list — but only while a worker could
    // still be producing output. If the worker is already gone, skip polling.
    const mp4Present = () =>
      fileList.some((f) => /\.mp4$/i.test(String(f.fileName || f.filename || ""))) ||
      fileList.some((f) => /\.mp4$/i.test(String(f.sliceType || f.mediaType || f.fileType || "")));
    if (!workerGone && !mp4Present()) {
      const deadline = Date.now() + 60_000;
      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 5_000));
        const queried = await agoraRequest(
          "GET",
          `/resourceid/${rec.resourceId}/sid/${rec.sid}/mode/mix/query`,
          // A short query is fine even if the worker is mid-finalization — the
          // recorded state (uploading/stopped) is what we need.
        ).catch(() => ({}));
        const sr = queried?.serverResponse || queried || ({} as Record<string, any>);
        const uploaded = String(sr.uploadingStatus || "") === "uploaded";
        const listed = Array.isArray(sr.fileList) &&
          sr.fileList.some((f: any) => /\.mp4$/i.test(String(f.fileName || f.filename || "")));
        if (uploaded || listed) {
          if (listed) {
            serverResponse = sr;
            fileList = sr.fileList;
          } else {
            const retry = await agoraRequest(
              "POST",
              `/resourceid/${rec.resourceId}/sid/${rec.sid}/mode/mix/stop`,
              {
                cname: channelName,
                uid: String(rec.uid || "0"),
                clientRequest: { async_stop: false },
              },
            ).catch(() => ({}));
            const retrySr = retry?.serverResponse || {};
            if (Array.isArray(retrySr.fileList)) {
              serverResponse = retrySr;
              fileList = retrySr.fileList;
            }
          }
          break;
        }
      }
      if (!mp4Present()) {
        // Give the recorder one final synchronous stop to flush any last-write
        // MP4 that completed after the last query, before declaring "no replay".
        try {
          const finalStop = await agoraRequest(
            "POST",
            `/resourceid/${rec.resourceId}/sid/${rec.sid}/mode/mix/stop`,
            {
              cname: channelName,
              uid: String(rec.uid || "0"),
              clientRequest: { async_stop: false },
            },
          );
          const fsr = finalStop?.serverResponse || finalStop || {};
          if (Array.isArray(fsr.fileList)) {
            serverResponse = fsr;
            fileList = fsr.fileList;
          }
        } catch { /* ignore — worker already gone */ }

        if (!mp4Present()) {
          // No MP4 within the window — either a genuinely short/empty recording,
          // or the worker auto-stopped before finalizing. HLS (.ts) may still be
          // present in storage, but without a finalized MP4 we can't offer a
          // playable replay, so mark the event ended without one.
          console.warn("agora recording produced no MP4; finalising as ended without replay");
        }
      }
    }

    const mp4File = fileList.find((f) => /\.mp4$/i.test(String(f.fileName || f.filename || "")));
    const fileName = String(mp4File?.fileName || mp4File?.filename || "");
    // Agora's fileName already carries the full object key (e.g.
    // "recordings/event123/xxx.mp4"). Only prepend the prefix when missing, so we
    // never build a doubled path like ".../recordings/event123/recordings/event123/...".
    const key = fileName
      ? fileName.startsWith(prefixPath) || fileName.startsWith(`${prefixPath}/`)
        ? fileName
        : `${prefixPath}/${fileName}`
      : "";
    const fullPath = key || null;

    let publicUrl: string | null = null;
    if (fullPath) {
      const { data: urlData } = admin.storage.from(S3_BUCKET).getPublicUrl(fullPath);
      publicUrl = urlData.publicUrl;
    }

    const duration = rec.startedAt
      ? Math.max(0, (Date.now() - Number(rec.startedAt)) / 1000)
      : null;

    if (publicUrl && fileName) {
      const streamUid = `agora-${rec.sid}`;
      const { error: insErr } = await admin.from("cloudflare_streams")
        .upsert({
          user_id: event.organizer_id,
          event_id: event.id,
          uid: streamUid,
          title: event.title || "Streamed video",
          thumbnail_url: event.image_url || null,
          preview_url: null,
          playback_url: publicUrl,
          duration,
          status: "ended",
          raw_payload: { recordingInfo: { resourceId: rec.resourceId, sid: rec.sid, fileName } },
          updated_at: new Date().toISOString(),
        }, { onConflict: "uid" });

      if (insErr) console.error("cloudflare_streams insert error", insErr);

      const { agoraRecording: _dropped, ...rest } = streaming;
      await admin
        .from("events")
        .update({
          streaming: {
            ...rest,
            isLive: false,
            endedAt: new Date().toISOString(),
            replayAvailable: true,
            has_recording: true,
            recording_uid: String(rec.sid),
            recording_url: publicUrl,
            playback_url: publicUrl,
          },
        })
        .eq("id", eventId);
    } else {
      // No MP4 was produced (short/empty recording, or the worker already died
      // before closeout). Finalise the event as ended WITHOUT replay. Critically
      // we do NOT echo back `streaming` (captured at request start, when isLive
      // was still true) — doing so would resurrect live state after the host
      // stopped the stream. The agoraRecording marker is dropped so a stale
      // resourceId/sid can't be reused by a later stop call.
      await admin
        .from("events")
        .update({
          streaming: {
            ...streaming,
            isLive: false,
            endedAt: new Date().toISOString(),
            replayAvailable: false,
            has_recording: false,
            agoraRecording: {
              ...rec,
              status: "ended",
              stopRequestedAt: Date.now(),
            },
          },
        })
        .eq("id", eventId);
    }

    return corsResponse({
      success: true,
      fileName: fileName || null,
      playbackUrl: publicUrl,
      duration,
    }, 200, req);
  } catch (err) {
    console.error("agora-cloud-recording error", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return corsResponse({ error: msg }, 500, req);
  }
});