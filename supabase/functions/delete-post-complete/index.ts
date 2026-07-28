import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getCorsHeaders, corsResponse, corsOptionsResponse } from "../shared/cors.ts";

type DeletePostBody = {
  postId: number;
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return corsOptionsResponse(req);
  }

  try {
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
      return corsResponse({ error: "Missing Authorization header" }, 401, req);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return corsResponse({ error: "Server not configured (missing SUPABASE_URL or SERVICE_ROLE)" }, 500, req);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    const userId = userData.user?.id || "";

    if (userError || !userId) {
      return corsResponse({ error: "Invalid auth token" }, 401, req);
    }

    const { postId }: DeletePostBody = await req.json();
    if (!postId || typeof postId !== "number") {
      return corsResponse({ error: "postId is required" }, 400, req);
    }

    const { data: post, error: fetchErr } = await supabase
      .from("posts")
      .select("id, user_id, image_urls")
      .eq("id", postId)
      .single();
    if (fetchErr) {
      return corsResponse({ error: fetchErr.message || "Failed to fetch post" }, 400, req);
    }
    if (!post) {
      return corsResponse({ error: "Post not found" }, 404, req);
    }
    if (post.user_id !== userId) {
      return corsResponse({ error: "Not authorized to delete this post" }, 403, req);
    }

    const { error: delErr } = await supabase.from("posts").delete().eq("id", postId);
    if (delErr) {
      return corsResponse({ error: delErr.message || "Failed to delete post" }, 400, req);
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

    return corsResponse({ success: true, postId }, 200, req);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return corsResponse({ error: message }, 500, req);
  }
});
