import { createClient } from "npm:@supabase/supabase-js@2";

const NTZS_API_KEY = Deno.env.get("NTZS_API_KEY");
const NTZS_BASE_URL = "https://www.ntzs.co.tz/api/v1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function ntzsRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!NTZS_API_KEY) {
    throw new Error("Missing NTZS_API_KEY");
  }

  const response = await fetch(`${NTZS_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${NTZS_API_KEY}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });

  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const error: Error & { status?: number; details?: unknown } = new Error(
      (typeof body === "object" && body && (body.message || body.error)) ||
        `nTZS API Error: ${response.status}`
    );
    error.status = response.status;
    error.details = body;
    throw error;
  }

  return body as T;
}

async function getOrCreateNtzsUser(externalId: string, email: string) {
  return await ntzsRequest<{ id: string; email?: string }>("/users", {
    method: "POST",
    body: JSON.stringify({ externalId, email }),
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);

    if (claimsError || !claimsData?.claims?.sub) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const userId = claimsData.claims.sub as string;
    const userEmail = (claimsData.claims.email as string) || "";

    const body = await req.json();
    const eventId = Number(body?.eventId);
    const amount = Number(body?.amount);
    const currency = typeof body?.currency === "string" ? body.currency : "TZS";

    if (!Number.isFinite(eventId) || !Number.isFinite(amount) || amount <= 0) {
      return jsonResponse({ error: "Invalid eventId or amount" }, 400);
    }

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: event, error: eventError } = await admin
      .from("events")
      .select("organizer_id")
      .eq("id", eventId)
      .single();

    if (eventError || !event?.organizer_id) {
      return jsonResponse({ error: "Could not find stream organizer" }, 404);
    }

    if (event.organizer_id === userId) {
      return jsonResponse({ error: "You cannot send a gift to yourself" }, 400);
    }

    const { data: organizerProfile } = await admin
      .from("profiles")
      .select("email")
      .eq("id", event.organizer_id)
      .maybeSingle();

    const senderNtzsUser = await getOrCreateNtzsUser(userId, userEmail);
    const recipientNtzsUser = await getOrCreateNtzsUser(
      event.organizer_id,
      organizerProfile?.email || ""
    );

    const senderWallet = await ntzsRequest<{ balanceTzs?: number; balance?: number }>(
      `/users/${senderNtzsUser.id}`
    );
    const balance = Number(senderWallet.balanceTzs ?? senderWallet.balance ?? 0);

    if (balance < amount) {
      return jsonResponse(
        {
          error: `Insufficient balance. You have TSh ${balance.toLocaleString()} but need TSh ${amount.toLocaleString()}.`,
        },
        400
      );
    }

    const transfer = await ntzsRequest<{ id?: string; txHash?: string; status?: string }>(
      "/transfers",
      {
        method: "POST",
        body: JSON.stringify({
          fromUserId: senderNtzsUser.id,
          toUserId: recipientNtzsUser.id,
          amountTzs: amount,
        }),
      }
    );

    const transactionMetadata = {
      source: "ntzs-transfer",
      ntzsTransferId: transfer.id ?? null,
      txHash: transfer.txHash ?? null,
    };

    const { data: insertedTransactions, error: txError } = await admin
      .from("transactions")
      .insert([
        {
          user_id: userId,
          event_id: eventId,
          amount,
          currency,
          provider: "Wallet",
          status: "completed",
          metadata: {
            ...transactionMetadata,
            type: "gift",
            direction: "sent",
            recipientId: event.organizer_id,
          },
        },
        {
          user_id: event.organizer_id,
          event_id: eventId,
          amount,
          currency,
          provider: "Wallet",
          status: "completed",
          metadata: {
            ...transactionMetadata,
            type: "gift-received",
            direction: "received",
            senderId: userId,
          },
        },
      ])
      .select();

    if (txError) throw txError;

    const debit = insertedTransactions?.find(
      (tx: any) => tx.user_id === userId && tx.metadata?.type === "gift"
    );

    return jsonResponse(debit || { success: true, transfer });
  } catch (err: any) {
    const status = typeof err?.status === "number" ? (err.status >= 500 ? 502 : 400) : 500;
    return jsonResponse(
      {
        error: err?.message || "Internal error",
        ...(err?.details ? { details: err.details } : {}),
      },
      status
    );
  }
});
