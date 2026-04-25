// @ts-nocheck
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { jwtDecode } from "https://esm.sh/jwt-decode@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client, x-supabase-client-platform",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

type DeletePostBody = {
  postId: number;
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.split(" ")[1];
    let userId = "";
    try {
      const decoded: any = jwtDecode(token);
      userId = decoded?.sub || decoded?.user_id || "";
    } catch {
      return new Response(JSON.stringify({ error: "Invalid auth token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "Server not configured (missing SUPABASE_URL or SERVICE_ROLE)" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { postId }: DeletePostBody = await req.json();
    if (!postId || typeof postId !== "number") {
      return new Response(JSON.stringify({ error: "postId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: post, error: fetchErr } = await supabase
      .from("posts")
      .select("id, user_id, image_urls")
      .eq("id", postId)
      .single();
    if (fetchErr) {
      return new Response(JSON.stringify({ error: fetchErr.message || "Failed to fetch post" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!post) {
      return new Response(JSON.stringify({ error: "Post not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (post.user_id !== userId) {
      return new Response(JSON.stringify({ error: "Not authorized to delete this post" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: delErr } = await supabase.from("posts").delete().eq("id", postId);
    if (delErr) {
      return new Response(JSON.stringify({ error: delErr.message || "Failed to delete post" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    try {
      const urls: string[] = Array.isArray(post.image_urls) ? post.image_urls : [];
      const paths = urls
        .map((url: string) => {
          const idx = url.indexOf("/posts/");
          if (idx === -1) return null;
          return url.substring(idx + "/posts/".length);
        })
        .filter((p: string | null) => !!p) as string[];
      if (paths.length > 0) {
        await supabase.storage.from("posts").remove(paths);
      }
    } catch {
      // Best effort; ignore storage errors
    }

    return new Response(JSON.stringify({ success: true, postId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
