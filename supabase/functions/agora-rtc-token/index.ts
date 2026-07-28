import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { RtcTokenBuilder, RtcRole } from "https://esm.sh/agora-access-token@2.0.4";
import { getCorsHeaders, corsResponse, corsOptionsResponse } from "../shared/cors.ts";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return corsOptionsResponse(req);
  }

  try {
    const APP_ID = Deno.env.get("AGORA_APP_ID");
    const APP_CERTIFICATE = Deno.env.get("AGORA_APP_CERTIFICATE");

    if (!APP_ID || !APP_CERTIFICATE) {
      return corsResponse({
        error: "AGORA_APP_ID/AGORA_APP_CERTIFICATE not configured in Edge Function secrets",
      }, 500, req);
    }

    const { channelName, uid, role, expireSeconds } = await req.json();

    if (!channelName) {
      throw new Error("channelName is required");
    }

    const exp = Number(expireSeconds) || 3600;
    const privilegeExpiredTs = Math.floor(Date.now() / 1000) + exp;
    const rtcRole = role === "publisher" ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;

    let token: string;
    if (uid !== undefined && uid !== null && uid !== "") {
      if (typeof uid === "number" || /^\d+$/.test(String(uid))) {
        token = RtcTokenBuilder.buildTokenWithUid(
          APP_ID,
          APP_CERTIFICATE,
          channelName,
          typeof uid === "number" ? uid : parseInt(String(uid), 10),
          rtcRole,
          privilegeExpiredTs,
        );
      } else {
        token = RtcTokenBuilder.buildTokenWithAccount(
          APP_ID,
          APP_CERTIFICATE,
          channelName,
          String(uid),
          rtcRole,
          privilegeExpiredTs,
        );
      }
    } else {
      token = RtcTokenBuilder.buildTokenWithUid(
        APP_ID,
        APP_CERTIFICATE,
        channelName,
        0,
        rtcRole,
        privilegeExpiredTs,
      );
    }

    return corsResponse({
      token,
      role: role || "subscriber",
      channel: channelName,
      expireAt: privilegeExpiredTs,
    }, 200, req);
  } catch (e: any) {
    return corsResponse({ error: e?.message || "Unknown error" }, 400, req);
  }
});
