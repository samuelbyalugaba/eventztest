// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client, x-supabase-client-platform",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const USER_STORAGE_BUCKETS = ["avatars", "events", "posts"];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    if (!authHeader?.toLowerCase().startsWith("bearer ")) {
      return json({ error: "Missing Authorization header" }, 401);
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return json({ error: "Server not configured for account deletion" }, 500);
    }

    const token = authHeader.replace(/^Bearer\s+/i, "");
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData?.user) {
      return json({ error: "Unauthorized" }, 401);
    }

    const userId = userData.user.id;

    await removeUserOwnedStorage(admin, userId);

    const { error: deleteError } = await admin.auth.admin.deleteUser(userId, false);
    if (deleteError) {
      return json({ error: deleteError.message || "Failed to delete user" }, 400);
    }

    await Promise.allSettled([
      admin.from("profiles").delete().eq("id", userId),
      admin.from("organizer_profiles").delete().eq("id", userId),
    ]);

    return json({ success: true });
  } catch (error) {
    return json({ error: error?.message || "Unknown account deletion error" }, 500);
  }
});

async function removeUserOwnedStorage(admin: ReturnType<typeof createClient>, userId: string) {
  const { data, error } = await admin
    .schema("storage")
    .from("objects")
    .select("bucket_id,name")
    .eq("owner", userId)
    .in("bucket_id", USER_STORAGE_BUCKETS);

  if (error || !data?.length) return;

  const byBucket = data.reduce((acc: Record<string, Set<string>>, object: { bucket_id: string; name: string }) => {
    if (!object.bucket_id || !object.name) return acc;
    if (!acc[object.bucket_id]) acc[object.bucket_id] = new Set<string>();
    acc[object.bucket_id].add(object.name);
    return acc;
  }, {});

  await Promise.allSettled(
    Object.entries(byBucket).map(([bucket, paths]) =>
      admin.storage.from(bucket).remove(Array.from(paths)),
    ),
  );
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
