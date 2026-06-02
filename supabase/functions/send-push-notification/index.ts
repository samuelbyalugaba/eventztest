import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-eventz-internal-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type PushKind = "generic" | "like" | "comment" | "follow";

type PushRequest = {
  kind?: PushKind;
  userId?: string;
  userIds?: string[];
  postId?: number;
  commentId?: number;
  targetUserId?: string;
  title?: string;
  body?: string;
  url?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
};

type PushSubscriptionRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const getJsonSecret = (name: string, key = "default") => {
  const raw = Deno.env.get(name);
  if (!raw) return "";
  try {
    return JSON.parse(raw)[key] || "";
  } catch {
    return "";
  }
};

const getServiceKey = () =>
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
  getJsonSecret("SUPABASE_SECRET_KEYS") ||
  "";

const getAnonKey = () =>
  Deno.env.get("SUPABASE_ANON_KEY") ||
  getJsonSecret("SUPABASE_PUBLISHABLE_KEYS") ||
  "";

const createAdminClient = () => {
  const url = Deno.env.get("SUPABASE_URL");
  const key = getServiceKey();
  if (!url || !key) throw new Error("Supabase admin credentials are not configured");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};

const getAuthenticatedUser = async (req: Request) => {
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) return null;

  const url = Deno.env.get("SUPABASE_URL");
  const key = getAnonKey();
  if (!url || !key) throw new Error("Supabase client credentials are not configured");

  const userClient = createClient(url, key, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const token = authHeader.replace(/^Bearer\s+/i, "");
  const { data, error } = await userClient.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
};

const getActorProfile = async (admin: ReturnType<typeof createAdminClient>, userId: string) => {
  const { data } = await admin
    .from("profiles")
    .select("full_name, username, avatar_url")
    .eq("id", userId)
    .maybeSingle();

  const name = data?.full_name || data?.username || "Someone";
  return {
    name,
    avatar: data?.avatar_url || "/icons/icon-192x192.png",
  };
};

const buildSocialPayload = async (
  admin: ReturnType<typeof createAdminClient>,
  actorId: string,
  body: PushRequest
) => {
  const kind = body.kind;
  const actor = await getActorProfile(admin, actorId);

  if (kind === "follow") {
    if (!body.targetUserId) throw new Error("Missing target user");

    const { data: follow } = await admin
      .from("follows")
      .select("id")
      .eq("follower_id", actorId)
      .eq("following_id", body.targetUserId)
      .maybeSingle();

    if (!follow) throw new Error("Follow activity was not found");

    return {
      userIds: [body.targetUserId],
      payload: {
        title: "New follower",
        body: `${actor.name} started following you`,
        url: `/profile/${actorId}`,
        icon: actor.avatar,
        tag: `follow-${actorId}`,
        data: { kind, actorId },
      },
    };
  }

  if (kind === "like") {
    if (!body.postId) throw new Error("Missing post");

    const [{ data: post }, { data: like }] = await Promise.all([
      admin.from("posts").select("id, user_id").eq("id", body.postId).maybeSingle(),
      admin
        .from("post_likes")
        .select("user_id")
        .eq("post_id", body.postId)
        .eq("user_id", actorId)
        .maybeSingle(),
    ]);

    if (!post || !like) throw new Error("Like activity was not found");

    return {
      userIds: [post.user_id],
      payload: {
        title: "New like",
        body: `${actor.name} liked your post`,
        url: `/post/${body.postId}`,
        icon: actor.avatar,
        tag: `like-${body.postId}-${actorId}`,
        data: { kind, actorId, postId: body.postId },
      },
    };
  }

  if (kind === "comment") {
    if (!body.commentId && !body.postId) throw new Error("Missing comment");

    let query = admin
      .from("post_comments")
      .select("id, post_id, user_id, text, post:posts!inner(id, user_id)")
      .eq("user_id", actorId);

    query = body.commentId
      ? query.eq("id", body.commentId)
      : query.eq("post_id", body.postId);

    const { data: comment } = await query.order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!comment?.post) throw new Error("Comment activity was not found");

    const targetUserId = Array.isArray(comment.post)
      ? comment.post[0]?.user_id
      : (comment.post as { user_id?: string }).user_id;

    return {
      userIds: [targetUserId].filter(Boolean),
      payload: {
        title: "New comment",
        body: `${actor.name}: ${String(comment.text || "").slice(0, 90)}`,
        url: `/post/${comment.post_id}`,
        icon: actor.avatar,
        tag: `comment-${comment.id}`,
        data: { kind, actorId, postId: comment.post_id, commentId: comment.id },
      },
    };
  }

  throw new Error("Unsupported push notification kind");
};

const sendToSubscriptions = async (
  admin: ReturnType<typeof createAdminClient>,
  userIds: string[],
  payload: Record<string, unknown>
) => {
  const uniqueUserIds = [...new Set(userIds.filter(Boolean))];
  if (uniqueUserIds.length === 0) return { sent: 0, removed: 0 };

  const { data: subscriptions, error } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .in("user_id", uniqueUserIds)
    .eq("enabled", true);

  if (error) throw error;

  let sent = 0;
  let removed = 0;
  const invalidIds: string[] = [];

  await Promise.all(
    ((subscriptions || []) as PushSubscriptionRow[]).map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          JSON.stringify(payload)
        );
        sent += 1;
      } catch (error) {
        const statusCode = Number((error as { statusCode?: number }).statusCode || 0);
        if (statusCode === 404 || statusCode === 410) {
          invalidIds.push(subscription.id);
          removed += 1;
        }
      }
    })
  );

  if (invalidIds.length > 0) {
    await admin.from("push_subscriptions").update({ enabled: false }).in("id", invalidIds);
  }

  return { sent, removed };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:support@eventz.app";

    if (!vapidPublicKey || !vapidPrivateKey) {
      return json({ error: "Push notification keys are not configured" }, 500);
    }

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    const internalSecret = Deno.env.get("EVENTZ_INTERNAL_FUNCTION_SECRET");
    const isInternal =
      !!internalSecret && req.headers.get("x-eventz-internal-secret") === internalSecret;

    const admin = createAdminClient();
    const body = (await req.json()) as PushRequest;
    const kind = body.kind || "generic";

    if (kind === "generic") {
      if (!isInternal) return json({ error: "Unauthorized" }, 401);

      const userIds = body.userIds || (body.userId ? [body.userId] : []);
      const result = await sendToSubscriptions(admin, userIds, {
        title: body.title || "Eventz",
        body: body.body || "You have a new update.",
        url: body.url || "/",
        icon: body.icon || "/icons/icon-192x192.png",
        badge: body.badge || "/icons/icon-96x96.png",
        tag: body.tag,
        data: body.data || {},
      });

      return json({ ok: true, ...result });
    }

    const user = await getAuthenticatedUser(req);
    if (!user) return json({ error: "Unauthorized" }, 401);

    const { userIds, payload } = await buildSocialPayload(admin, user.id, { ...body, kind });
    const targetIds = userIds.filter((userId) => userId !== user.id);
    const result = await sendToSubscriptions(admin, targetIds, payload);

    return json({ ok: true, ...result });
  } catch (error) {
    return json({ error: (error as Error).message || "Failed to send push notification" }, 400);
  }
});
