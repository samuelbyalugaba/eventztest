import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, webhook-id, webhook-signature, webhook-timestamp",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type AuthEmailData = {
  email_action_type?: string;
  token?: string;
  token_hash?: string;
  token_new?: string;
  token_hash_new?: string;
  redirect_to?: string;
  site_url?: string;
};

type AuthHookPayload = {
  user?: {
    id?: string;
    email?: string;
    new_email?: string;
    user_metadata?: Record<string, unknown>;
  };
  email?: AuthEmailData;
  email_data?: AuthEmailData;
};

type OutgoingAuthEmail = {
  to: string;
  subject: string;
  html: string;
  text: string;
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

const createAdminClient = () => {
  const url = Deno.env.get("SUPABASE_URL");
  const key = getServiceKey();
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
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

const buildVerifyUrl = (emailData: AuthEmailData, tokenHash?: string) => {
  const siteUrl = emailData.site_url || Deno.env.get("SUPABASE_URL") || appUrl();
  const url = new URL("/auth/v1/verify", siteUrl);
  url.searchParams.set("token_hash", tokenHash || emailData.token_hash || "");
  url.searchParams.set("type", emailData.email_action_type || "email");
  if (emailData.redirect_to) url.searchParams.set("redirect_to", emailData.redirect_to);
  return url.toString();
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
  ctaLabel: string;
  ctaUrl: string;
}) => `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
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
                <h1 style="margin:0 0 14px;font-size:24px;line-height:1.25;color:#111827">${escapeHtml(title)}</h1>
                <div style="font-size:15px;line-height:1.65;color:#374151">${body}</div>
                <p style="margin:28px 0 4px"><a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:#8A2BE2;color:#fff;text-decoration:none;font-weight:700;border-radius:999px;padding:12px 20px">${escapeHtml(ctaLabel)}</a></p>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px;background:#fafafa;border-top:1px solid #eceef3;font-size:12px;line-height:1.5;color:#6b7280">
                If you did not request this, you can ignore this email. Need help? <a href="mailto:${escapeHtml(supportEmail())}" style="color:#6d28d9">${escapeHtml(supportEmail())}</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

const plainTextFromHtml = (html: string) =>
  html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const displayName = (payload: AuthHookPayload) => {
  const metadata = payload.user?.user_metadata || {};
  return String(metadata.full_name || metadata.name || payload.user?.email?.split("@")[0] || "there");
};

const renderEmail = (payload: AuthHookPayload, to: string, tokenHash?: string): OutgoingAuthEmail => {
  const emailData = payload.email_data || payload.email || {};
  const actionType = emailData.email_action_type || "email";
  const name = displayName(payload);
  const verifyUrl = buildVerifyUrl(emailData, tokenHash);

  if (actionType === "signup" || actionType === "invite") {
    const html = baseLayout({
      title: "Confirm your Eventz account",
      preview: "Confirm your email to finish joining Eventz.",
      body: `<p>Hi ${escapeHtml(name)},</p><p>Confirm your email address to finish setting up your Eventz account.</p>`,
      ctaLabel: "Confirm email",
      ctaUrl: verifyUrl,
    });
    return { to, subject: "Confirm your Eventz account", html, text: plainTextFromHtml(html) };
  }

  if (actionType === "recovery") {
    const html = baseLayout({
      title: "Reset your Eventz password",
      preview: "Use this secure link to create a new password.",
      body: `<p>Use this secure link to create a new password for your Eventz account.</p>`,
      ctaLabel: "Reset password",
      ctaUrl: verifyUrl,
    });
    return { to, subject: "Reset your Eventz password", html, text: plainTextFromHtml(html) };
  }

  if (actionType === "email_change") {
    const html = baseLayout({
      title: "Confirm your email change",
      preview: "Confirm this address for your Eventz account.",
      body: `<p>Confirm this email address for your Eventz account.</p>`,
      ctaLabel: "Confirm email change",
      ctaUrl: verifyUrl,
    });
    return { to, subject: "Confirm your Eventz email change", html, text: plainTextFromHtml(html) };
  }

  if (actionType === "reauthentication") {
    const token = emailData.token || "";
    const html = baseLayout({
      title: "Confirm it is you",
      preview: "Use this code to continue in Eventz.",
      body: `<p>Use this verification code to continue:</p><p style="font-size:28px;font-weight:900;letter-spacing:0.16em;color:#111827">${escapeHtml(token)}</p>`,
      ctaLabel: "Open Eventz",
      ctaUrl: appUrl(),
    });
    return { to, subject: "Your Eventz verification code", html, text: plainTextFromHtml(html) };
  }

  const html = baseLayout({
    title: "Sign in to Eventz",
    preview: "Use this secure link to continue.",
    body: `<p>Use this secure link to continue to Eventz.</p>`,
    ctaLabel: "Continue to Eventz",
    ctaUrl: verifyUrl,
  });
  return { to, subject: "Sign in to Eventz", html, text: plainTextFromHtml(html) };
};

const sendWithResend = async (message: OutgoingAuthEmail) => {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("AUTH_EMAIL_FROM") || Deno.env.get("EMAIL_FROM") || "Eventz <auth@eventz.app>";

  if (!apiKey) throw new Error("RESEND_API_KEY is not configured");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    }),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result?.message || "Email provider rejected the message");
  return result;
};

const logDelivery = async (
  payload: AuthHookPayload,
  message: OutgoingAuthEmail,
  status: "sent" | "failed",
  providerResponse: Record<string, unknown> = {},
  error?: string
) => {
  const admin = createAdminClient();
  if (!admin) return;

  await admin.from("email_deliveries").insert({
    user_id: payload.user?.id || null,
    recipient_email: message.to,
    category: "security",
    template: `auth_${payload.email_data?.email_action_type || payload.email?.email_action_type || "email"}`,
    subject: message.subject,
    status,
    provider_message_id: String((providerResponse as any)?.id || ""),
    provider_response: providerResponse,
    error: error || null,
    sent_at: status === "sent" ? new Date().toISOString() : null,
  }).catch(() => undefined);
};

const getMessagesForPayload = (payload: AuthHookPayload) => {
  const user = payload.user || {};
  const emailData = payload.email_data || payload.email || {};
  const actionType = emailData.email_action_type || "email";

  if (actionType === "email_change" && user.email && user.new_email && emailData.token_hash && emailData.token_hash_new) {
    return [
      renderEmail(payload, user.email, emailData.token_hash_new),
      renderEmail(payload, user.new_email, emailData.token_hash),
    ];
  }

  const to = user.new_email || user.email;
  if (!to) throw new Error("Auth hook payload does not include a recipient email");
  return [renderEmail(payload, to, emailData.token_hash || emailData.token_hash_new)];
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const hookSecret = Deno.env.get("SEND_EMAIL_HOOK_SECRET");
    if (!hookSecret) throw new Error("SEND_EMAIL_HOOK_SECRET is not configured");

    const rawBody = await req.text();
    const webhook = new Webhook(hookSecret);
    const payload = webhook.verify(rawBody, Object.fromEntries(req.headers)) as AuthHookPayload;
    const messages = getMessagesForPayload(payload);

    for (const message of messages) {
      try {
        const provider = await sendWithResend(message);
        await logDelivery(payload, message, "sent", provider);
      } catch (error) {
        await logDelivery(payload, message, "failed", {}, (error as Error).message);
        throw error;
      }
    }

    return json({});
  } catch (error) {
    return json({ error: (error as Error).message || "Failed to send auth email" }, 400);
  }
});
