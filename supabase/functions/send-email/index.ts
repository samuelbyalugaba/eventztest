import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-eventz-internal-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type EmailRequest = {
  to?: string | string[];
  userId?: string;
  userIds?: string[];
  subject?: string;
  html?: string;
  text?: string;
  replyTo?: string;
  category?: "update" | "transactional" | "support";
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
  if (!url || !key) throw new Error("Supabase admin credentials are not configured");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};

const normalizeEmailList = (value?: string | string[]) => {
  if (!value) return [] as string[];
  return (Array.isArray(value) ? value : [value])
    .map((email) => String(email || "").trim().toLowerCase())
    .filter((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
};

const getEmailsForUsers = async (userIds: string[]) => {
  if (userIds.length === 0) return [] as string[];

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("id, contact_email, email, notification_settings")
    .in("id", userIds);

  if (error) throw error;

  return (data || [])
    .filter((profile: any) => profile.notification_settings?.marketingEmails !== false)
    .map((profile: any) => profile.contact_email || profile.email)
    .filter(Boolean);
};

const sendWithResend = async ({
  to,
  subject,
  html,
  text,
  replyTo,
}: {
  to: string[];
  subject: string;
  html?: string;
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
      text,
      reply_to: replyTo,
    }),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result?.message || "Email provider rejected the message");
  }

  return result;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const internalSecret = Deno.env.get("EVENTZ_INTERNAL_FUNCTION_SECRET");
    const isInternal =
      !!internalSecret && req.headers.get("x-eventz-internal-secret") === internalSecret;

    if (!isInternal) {
      return json({ error: "Unauthorized" }, 401);
    }

    const body = (await req.json()) as EmailRequest;
    if (!body.subject?.trim()) return json({ error: "Subject is required" }, 400);
    if (!body.html?.trim() && !body.text?.trim()) {
      return json({ error: "Email body is required" }, 400);
    }

    const explicitRecipients = normalizeEmailList(body.to);
    const userRecipients = await getEmailsForUsers([
      ...(body.userIds || []),
      ...(body.userId ? [body.userId] : []),
    ]);
    const recipients = [...new Set([...explicitRecipients, ...normalizeEmailList(userRecipients)])];

    if (recipients.length === 0) return json({ error: "No valid recipients" }, 400);

    const result = await sendWithResend({
      to: recipients,
      subject: body.subject.trim(),
      html: body.html,
      text: body.text,
      replyTo: body.replyTo,
    });

    return json({ ok: true, sent: recipients.length, provider: result });
  } catch (error) {
    return json({ error: (error as Error).message || "Failed to send email" }, 400);
  }
});
