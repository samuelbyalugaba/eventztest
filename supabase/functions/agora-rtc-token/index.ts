import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { RtcTokenBuilder, RtcRole } from "npm:agora-access-token";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const APP_ID = Deno.env.get("AGORA_APP_ID");
    const APP_CERTIFICATE = Deno.env.get("AGORA_APP_CERTIFICATE");

    if (!APP_ID || !APP_CERTIFICATE) {
      return new Response(
        JSON.stringify({
          error: "AGORA_APP_ID/AGORA_APP_CERTIFICATE not configured in Edge Function secrets",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
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

    return new Response(
      JSON.stringify({
        token,
        role: role || "subscriber",
        channel: channelName,
        expireAt: privilegeExpiredTs,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: e?.message || "Unknown error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      },
    );
  }
});
