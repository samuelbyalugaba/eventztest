import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-eventz-internal-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type EmailCategory =
  | "transactional"
  | "security"
  | "update"
  | "event_reminder"
  | "social"
  | "marketing"
  | "support";

type EmailKind =
  | "config"
  | "generic"
  | "welcome"
  | "event_reminder"
  | "ticket_confirmation"
  | "product_update"
  | "support"
  | "like"
  | "comment"
  | "follow";

type EmailRequest = {
  kind?: EmailKind;
  to?: string | string[];
  userId?: string;
  userIds?: string[];
  targetUserId?: string;
  postId?: number;
  commentId?: number;
  eventId?: number;
  subject?: string;
  html?: string;
  text?: string;
  replyTo?: string;
  category?: EmailCategory;
  template?: string;
  variables?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

type Recipient = {
  userId?: string | null;
  email: string;
  name?: string | null;
  preferences?: Record<string, unknown> | null;
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

const normalizeEmailList = (value?: string | string[]) => {
  if (!value) return [] as string[];
  return (Array.isArray(value) ? value : [value])
    .map((email) => String(email || "").trim().toLowerCase())
    .filter((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
};

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const appUrl = () => Deno.env.get("APP_URL") || Deno.env.get("PUBLIC_SITE_URL") || "https://eventz.app";
const supportEmail = () => Deno.env.get("SUPPORT_EMAIL") || "support@eventz.app";

const absoluteUrl = (path = "/") => {
  if (/^https?:\/\//i.test(path)) return path;
  return `${appUrl().replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
};

const baseLayout = ({
  title,
  preview,
  body,
  ctaLabel,
  ctaUrl,
}: {
  title: string;
  preview?: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
}) => {
  const safeTitle = escapeHtml(title);
  const cta = ctaLabel && ctaUrl
    ? `<p style="margin:28px 0 4px"><a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:#8A2BE2;color:#fff;text-decoration:none;font-weight:700;border-radius:999px;padding:12px 20px">${escapeHtml(ctaLabel)}</a></p>`
    : "";

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${safeTitle}</title>
  </head>
  <body style="margin:0;background:#f6f7fb;color:#111827;font-family:Inter,Arial,sans-serif">
    <div style="display:none;max-height:0;overflow:hidden">${escapeHtml(preview || title)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f7fb;padding:28px 12px">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:20px;border:1px solid #eceef3;overflow:hidden">
            <tr>
              <td style="padding:26px 28px 12px">
                <div style="font-size:24px;font-weight:900;letter-spacing:-0.02em;color:#111827">Eventz</div>
              </td>
            </tr>
            <tr>
              <td style="padding:10px 28px 30px">
                <h1 style="margin:0 0 14px;font-size:24px;line-height:1.25;color:#111827">${safeTitle}</h1>
                <div style="font-size:15px;line-height:1.65;color:#374151">${body}</div>
                ${cta}
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px;background:#fafafa;border-top:1px solid #eceef3;font-size:12px;line-height:1.5;color:#6b7280">
                You received this email from Eventz. For help, contact <a href="mailto:${escapeHtml(supportEmail())}" style="color:#6d28d9">${escapeHtml(supportEmail())}</a>.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
};

const plainTextFromHtml = (html: string) =>
  html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const renderTemplate = (request: EmailRequest) => {
  const variables = request.variables || {};
  const kind = request.kind || request.template || "generic";
  const get = (key: string, fallback = "") => String(variables[key] ?? fallback);

  if (request.html || request.text) {
    const subject = request.subject?.trim() || get("subject", "Eventz update");
    return {
      subject,
      html: request.html || baseLayout({ title: subject, body: `<p>${escapeHtml(request.text || "")}</p>` }),
      text: request.text,
      template: request.template || String(kind),
    };
  }

  if (kind === "welcome") {
    const name = get("name", "there");
    const html = baseLayout({
      title: `Welcome to Eventz, ${name}`,
      preview: "Your Eventz account is ready.",
      body: `<p>Your Eventz account is ready. Discover live events, follow creators, and keep your tickets in one place.</p>`,
      ctaLabel: "Open Eventz",
      ctaUrl: absoluteUrl("/events"),
    });
    return { subject: "Welcome to Eventz", html, text: plainTextFromHtml(html), template: "welcome" };
  }

  if (kind === "event_reminder") {
    const title = get("eventTitle", "Your event");
    const time = get("eventTime", "soon");
    const html = baseLayout({
      title: `${title} is coming up`,
      preview: `Reminder: ${title} starts ${time}.`,
      body: `<p><strong>${escapeHtml(title)}</strong> starts ${escapeHtml(time)}.</p><p>Open Eventz for details, tickets, and live access.</p>`,
      ctaLabel: "View event",
      ctaUrl: absoluteUrl(get("eventUrl", "/events")),
    });
    return { subject: `Reminder: ${title}`, html, text: plainTextFromHtml(html), template: "event_reminder" };
  }

  if (kind === "ticket_confirmation") {
    const title = get("eventTitle", "your event");
    const html = baseLayout({
      title: "Your ticket is confirmed",
      preview: `Your ticket for ${title} is ready.`,
      body: `<p>Your ticket for <strong>${escapeHtml(title)}</strong> is confirmed.</p><p>You can open your ticket from Eventz anytime.</p>`,
      ctaLabel: "Open ticket",
      ctaUrl: absoluteUrl(get("ticketUrl", "/profile")),
    });
    return { subject: `Ticket confirmed: ${title}`, html, text: plainTextFromHtml(html), template: "ticket_confirmation" };
  }

  if (kind === "product_update") {
    const subject = request.subject?.trim() || get("subject", "New on Eventz");
    const message = get("message", "We have a new Eventz update for you.");
    const html = baseLayout({
      title: subject,
      preview: message,
      body: `<p>${escapeHtml(message)}</p>`,
      ctaLabel: get("ctaLabel", "Open Eventz"),
      ctaUrl: absoluteUrl(get("ctaUrl", "/events")),
    });
    return { subject, html, text: plainTextFromHtml(html), template: "product_update" };
  }

  if (kind === "support") {
    const subject = request.subject?.trim() || get("subject", "Eventz support");
    const message = get("message", "Our support team has an update for you.");
    const html = baseLayout({
      title: subject,
      body: `<p>${escapeHtml(message)}</p>`,
      ctaLabel: "Contact support",
      ctaUrl: `mailto:${supportEmail()}`,
    });
    return { subject, html, text: plainTextFromHtml(html), template: "support" };
  }

  const subject = request.subject?.trim() || get("subject", "Eventz update");
  const message = get("message", "You have a new update from Eventz.");
  const html = baseLayout({
    title: subject,
    preview: message,
    body: `<p>${escapeHtml(message)}</p>`,
    ctaLabel: get("ctaLabel", "Open Eventz"),
    ctaUrl: absoluteUrl(get("ctaUrl", "/events")),
  });
  return { subject, html, text: plainTextFromHtml(html), template: request.template || String(kind) };
};

const categoryForKind = (kind?: string, requested?: EmailCategory): EmailCategory => {
  if (requested) return requested;
  if (kind === "event_reminder") return "event_reminder";
  if (kind === "like" || kind === "comment" || kind === "follow") return "social";
  if (kind === "product_update") return "update";
  if (kind === "support") return "support";
  if (kind === "ticket_confirmation" || kind === "welcome") return "transactional";
  return "transactional";
};

const preferenceKeyForCategory = (category: EmailCategory) => {
  if (category === "event_reminder") return "event_reminders";
  if (category === "social") return "social_notifications";
  if (category === "update") return "product_updates";
  if (category === "marketing") return "marketing";
  if (category === "security") return "security";
  return "transactional";
};

const isRecipientAllowed = (recipient: Recipient, category: EmailCategory) => {
  if (category === "transactional" || category === "security" || category === "support") return true;
  const preferences = recipient.preferences || {};
  const key = preferenceKeyForCategory(category);
  return preferences[key] !== false && !preferences.unsubscribed_at;
};

const getRecipientsForUsers = async (
  admin: ReturnType<typeof createAdminClient>,
  userIds: string[]
) => {
  const uniqueUserIds = [...new Set(userIds.filter(Boolean))];
  if (uniqueUserIds.length === 0) return [] as Recipient[];

  const { data, error } = await admin
    .from("profiles")
    .select("id, full_name, username, contact_email, email, email_preferences(*)")
    .in("id", uniqueUserIds);

  if (error) throw error;

  return ((data || []) as any[])
    .map((profile) => ({
      userId: profile.id,
      email: profile.contact_email || profile.email,
      name: profile.full_name || profile.username,
      preferences: Array.isArray(profile.email_preferences)
        ? profile.email_preferences[0]
        : profile.email_preferences,
    }))
    .filter((recipient) => recipient.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient.email));
};

const getExplicitRecipients = (emails: string[]) =>
  emails.map((email) => ({ email, userId: null, preferences: null } as Recipient));

const sendWithResend = async ({
  to,
  subject,
  html,
  text,
  replyTo,
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}) => {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("EMAIL_FROM") || "Eventz <updates@eventz.app>";

  if (!apiKey) throw new Error("RESEND_API_KEY is not configured");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      html,
      text: text || plainTextFromHtml(html),
      reply_to: replyTo,
    }),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result?.message || "Email provider rejected the message");
  }

  return result;
};

const logDelivery = async (
  admin: ReturnType<typeof createAdminClient>,
  input: {
    recipient: Recipient;
    category: EmailCategory;
    template: string;
    subject: string;
    status: "sent" | "failed" | "skipped";
    providerResponse?: Record<string, unknown>;
    error?: string;
    metadata?: Record<string, unknown>;
  }
) => {
  await admin.from("email_deliveries").insert({
    user_id: input.recipient.userId || null,
    recipient_email: input.recipient.email,
    category: input.category,
    template: input.template,
    subject: input.subject,
    status: input.status,
    provider_message_id: String((input.providerResponse as any)?.id || ""),
    provider_response: input.providerResponse || {},
    error: input.error || null,
    metadata: input.metadata || {},
    sent_at: input.status === "sent" ? new Date().toISOString() : null,
  }).catch(() => undefined);
};

const deliverEmail = async (
  admin: ReturnType<typeof createAdminClient>,
  recipients: Recipient[],
  request: EmailRequest,
  metadata: Record<string, unknown> = {}
) => {
  const rendered = renderTemplate(request);
  const category = categoryForKind(request.kind || request.template, request.category);
  const uniqueRecipients = [
    ...new Map(recipients.map((recipient) => [recipient.email.toLowerCase(), recipient])).values(),
  ];

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  await Promise.all(
    uniqueRecipients.map(async (recipient) => {
      if (!isRecipientAllowed(recipient, category)) {
        skipped += 1;
        await logDelivery(admin, {
          recipient,
          category,
          template: rendered.template,
          subject: rendered.subject,
          status: "skipped",
          error: "Recipient opted out",
          metadata,
        });
        return;
      }

      try {
        const provider = await sendWithResend({
          to: recipient.email,
          subject: rendered.subject,
          html: rendered.html,
          text: rendered.text,
          replyTo: request.replyTo,
        });
        sent += 1;
        await logDelivery(admin, {
          recipient,
          category,
          template: rendered.template,
          subject: rendered.subject,
          status: "sent",
          providerResponse: provider,
          metadata,
        });
      } catch (error) {
        failed += 1;
        await logDelivery(admin, {
          recipient,
          category,
          template: rendered.template,
          subject: rendered.subject,
          status: "failed",
          error: (error as Error).message,
          metadata,
        });
      }
    })
  );

  return { sent, skipped, failed, total: uniqueRecipients.length };
};

const getActorProfile = async (admin: ReturnType<typeof createAdminClient>, userId: string) => {
  const { data } = await admin
    .from("profiles")
    .select("full_name, username")
    .eq("id", userId)
    .maybeSingle();

  return data?.full_name || data?.username || "Someone";
};

const buildSocialEmail = async (
  admin: ReturnType<typeof createAdminClient>,
  actorId: string,
  request: EmailRequest
) => {
  const actorName = await getActorProfile(admin, actorId);

  if (request.kind === "follow") {
    if (!request.targetUserId) throw new Error("Missing target user");
    const { data: follow } = await admin
      .from("follows")
      .select("id")
      .eq("follower_id", actorId)
      .eq("following_id", request.targetUserId)
      .maybeSingle();

    if (!follow) throw new Error("Follow activity was not found");

    return {
      userIds: [request.targetUserId],
      request: {
        ...request,
        subject: `${actorName} started following you`,
        variables: {
          subject: `${actorName} started following you`,
          message: `${actorName} started following you on Eventz.`,
          ctaLabel: "View profile",
          ctaUrl: `/profile/${actorId}`,
        },
        template: "social_follow",
        category: "social" as EmailCategory,
      },
    };
  }

  if (request.kind === "like") {
    if (!request.postId) throw new Error("Missing post");
    const [{ data: post }, { data: like }] = await Promise.all([
      admin.from("posts").select("id, user_id").eq("id", request.postId).maybeSingle(),
      admin
        .from("post_likes")
        .select("user_id")
        .eq("post_id", request.postId)
        .eq("user_id", actorId)
        .maybeSingle(),
    ]);

    if (!post || !like) throw new Error("Like activity was not found");

    return {
      userIds: [post.user_id],
      request: {
        ...request,
        subject: `${actorName} liked your post`,
        variables: {
          subject: `${actorName} liked your post`,
          message: `${actorName} liked your post on Eventz.`,
          ctaLabel: "View post",
          ctaUrl: `/post/${request.postId}`,
        },
        template: "social_like",
        category: "social" as EmailCategory,
      },
    };
  }

  if (request.kind === "comment") {
    if (!request.commentId && !request.postId) throw new Error("Missing comment");

    let query = admin
      .from("post_comments")
      .select("id, post_id, user_id, text, post:posts!inner(id, user_id)")
      .eq("user_id", actorId);

    query = request.commentId
      ? query.eq("id", request.commentId)
      : query.eq("post_id", request.postId);

    const { data: comment } = await query.order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!comment?.post) throw new Error("Comment activity was not found");

    const targetUserId = Array.isArray(comment.post)
      ? comment.post[0]?.user_id
      : (comment.post as { user_id?: string }).user_id;

    return {
      userIds: [targetUserId].filter(Boolean),
      request: {
        ...request,
        subject: `${actorName} commented on your post`,
        variables: {
          subject: `${actorName} commented on your post`,
          message: `${actorName}: ${String(comment.text || "").slice(0, 160)}`,
          ctaLabel: "View comment",
          ctaUrl: `/post/${comment.post_id}`,
        },
        template: "social_comment",
        category: "social" as EmailCategory,
      },
    };
  }

  throw new Error("Unsupported social email kind");
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = (await req.json().catch(() => ({}))) as EmailRequest;
    const kind = body.kind || "generic";

    if (kind === "config") {
      return json({
        configured: Boolean(Deno.env.get("RESEND_API_KEY")),
        from: Deno.env.get("EMAIL_FROM") || "",
      });
    }

    const internalSecret = Deno.env.get("EVENTZ_INTERNAL_FUNCTION_SECRET");
    const isInternal =
      !!internalSecret && req.headers.get("x-eventz-internal-secret") === internalSecret;
    const admin = createAdminClient();

    if (kind === "like" || kind === "comment" || kind === "follow") {
      const user = await getAuthenticatedUser(req);
      if (!user) return json({ error: "Unauthorized" }, 401);

      const { userIds, request } = await buildSocialEmail(admin, user.id, body);
      const recipients = await getRecipientsForUsers(
        admin,
        userIds.filter((userId) => userId !== user.id)
      );
      const result = await deliverEmail(admin, recipients, request, {
        actorId: user.id,
        kind,
        postId: body.postId,
        commentId: body.commentId,
        targetUserId: body.targetUserId,
      });

      return json({ ok: true, ...result });
    }

    if (!isInternal) return json({ error: "Unauthorized" }, 401);

    const explicitRecipients = getExplicitRecipients(normalizeEmailList(body.to));
    const userRecipients = await getRecipientsForUsers(admin, [
      ...(body.userIds || []),
      ...(body.userId ? [body.userId] : []),
    ]);
    const recipients = [...explicitRecipients, ...userRecipients];

    if (recipients.length === 0) return json({ error: "No valid recipients" }, 400);

    const result = await deliverEmail(admin, recipients, body, body.metadata || {});
    return json({ ok: true, ...result });
  } catch (error) {
    return json({ error: (error as Error).message || "Failed to send email" }, 400);
  }
});
