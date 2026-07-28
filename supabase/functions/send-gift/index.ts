import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders, corsResponse, corsOptionsResponse } from "../shared/cors.ts";

const NTZS_API_KEY = Deno.env.get("NTZS_API_KEY");
const NTZS_BASE_URL = "https://www.ntzs.co.tz/api/v1";

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

function generateIdempotencyKey(userId: string, eventId: string, amount: string): string {
  const timestamp = Date.now();
  return `send-gift-${userId}-${eventId}-${amount}-${timestamp}`;
}

async function checkIdempotency(admin: any, userId: string, key: string) {
  const { data, error } = await admin
    .from("idempotency_keys")
    .select("id, result, status")
    .eq("user_id", userId)
    .eq("key", key)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function setIdempotencyPending(admin: any, userId: string, key: string, operation: string) {
  const { error } = await admin
    .from("idempotency_keys")
    .insert({
      user_id: userId,
      key,
      operation,
      status: "pending",
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });

  if (error) throw error;
}

async function setIdempotencyCompleted(admin: any, userId: string, key: string, result: any) {
  const { error } = await admin
    .from("idempotency_keys")
    .update({
      status: "completed",
      result,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("key", key);

  if (error) throw error;
}

async function setIdempotencyFailed(admin: any, userId: string, key: string, error: any) {
  const { error: updateError } = await admin
    .from("idempotency_keys")
    .update({
      status: "failed",
      result: { error: error?.message || "Unknown error" },
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("key", key);

  if (updateError) throw updateError;
}

async function rollbackNtzsTransfer(transferId: string) {
  try {
    await ntzsRequest("/transfers/rollback", {
      method: "POST",
      body: JSON.stringify({ transferId }),
    });
  } catch (rollbackError) {
    console.error("[send-gift] Rollback failed:", rollbackError);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return corsOptionsResponse(req);
  }

  let idempotencyKey = "";
  let admin: any = null;
  let userId = "";

  try {
    const authHeader = req.headers.get("authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return corsResponse({ error: "Unauthorized" }, 401, req);
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
      return corsResponse({ error: "Unauthorized" }, 401, req);
    }

    userId = claimsData.claims.sub as string;
    const userEmail = (claimsData.claims.email as string) || "";

    const body = await req.json();
    const eventId = Number(body?.eventId);
    const amount = Number(body?.amount);
    const currency = typeof body?.currency === "string" ? body.currency : "TZS";
    const clientProvidedKey = body?.idempotencyKey;

    if (!Number.isFinite(eventId) || !Number.isFinite(amount) || amount <= 0) {
      return corsResponse({ error: "Invalid eventId or amount" }, 400, req);
    }

    admin = createClient(supabaseUrl, serviceKey);

    idempotencyKey = clientProvidedKey || generateIdempotencyKey(userId, String(eventId), String(amount));

    const existing = await checkIdempotency(admin, userId, idempotencyKey);
    if (existing) {
      if (existing.status === "completed") {
        return corsResponse({ ...existing.result, idempotent: true }, 200, req);
      }
      if (existing.status === "pending") {
        return corsResponse({ error: "Operation already in progress" }, 409, req);
      }
      if (existing.status === "failed") {
        return corsResponse({ error: "Previous attempt failed, please try again" }, 400, req);
      }
    }

    await setIdempotencyPending(admin, userId, idempotencyKey, "send-gift");

    const { data: event, error: eventError } = await admin
      .from("events")
      .select("organizer_id")
      .eq("id", eventId)
      .single();

    if (eventError || !event?.organizer_id) {
      await setIdempotencyFailed(admin, userId, idempotencyKey, { message: "Could not find stream organizer" });
      return corsResponse({ error: "Could not find stream organizer" }, 404, req);
    }

    if (event.organizer_id === userId) {
      await setIdempotencyFailed(admin, userId, idempotencyKey, { message: "Cannot send gift to self" });
      return corsResponse({ error: "You cannot send a gift to yourself" }, 400, req);
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
      const errorMsg = `Insufficient balance. You have TSh ${balance.toLocaleString()} but need TSh ${amount.toLocaleString()}.`;
      await setIdempotencyFailed(admin, userId, idempotencyKey, { message: errorMsg });
      return corsResponse({ error: errorMsg }, 400, req);
    }

    let transfer: { id?: string; txHash?: string; status?: string };
    try {
      transfer = await ntzsRequest<{ id?: string; txHash?: string; status?: string }>(
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
    } catch (transferError) {
      await setIdempotencyFailed(admin, userId, idempotencyKey, transferError);
      throw transferError;
    }

    const transactionMetadata = {
      source: "ntzs-transfer",
      ntzsTransferId: transfer.id ?? null,
      txHash: transfer.txHash ?? null,
      idempotencyKey,
    };

    let insertedTransactions: any[] = [];
    try {
      const { data, error: txError } = await admin
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
      insertedTransactions = data || [];
    } catch (dbError) {
      console.error("[send-gift] DB insert failed, rolling back transfer:", dbError);
      if (transfer.id) {
        await rollbackNtzsTransfer(transfer.id);
      }
      await setIdempotencyFailed(admin, userId, idempotencyKey, dbError);
      throw dbError;
    }

    const debit = insertedTransactions.find(
      (tx: any) => tx.user_id === userId && tx.metadata?.type === "gift"
    );

    const result = debit || { success: true, transfer };
    await setIdempotencyCompleted(admin, userId, idempotencyKey, result);

    return corsResponse(result, 200, req);
  } catch (err: any) {
    const status = typeof err?.status === "number" ? (err.status >= 500 ? 502 : 400) : 500;
    return corsResponse(
      {
        error: err?.message || "Internal error",
        ...(err?.details ? { details: err.details } : {}),
      },
      status,
      req
    );
  }
});
