import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify the caller's JWT
    const authHeader = req.headers.get("authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Client with caller's JWT to verify identity
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { eventId, amount, currency = "TZS" } = await req.json();

    if (!eventId || !amount || amount <= 0) {
      return new Response(
        JSON.stringify({ error: "Invalid eventId or amount" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Service role client to bypass RLS
    const admin = createClient(supabaseUrl, serviceKey);

    // 1. Check sender balance from completed transactions
    const { data: txs } = await admin
      .from("transactions")
      .select("amount, metadata, status")
      .eq("user_id", user.id)
      .in("status", ["completed", "success"]);

    let balance = 0;
    for (const tx of txs || []) {
      const type = tx.metadata?.type;
      if (type === "deposit" || type === "top-up" || type === "gift-received") {
        balance += tx.amount || 0;
      } else if (
        type === "withdrawal" ||
        type === "payment" ||
        type === "gift"
      ) {
        balance -= tx.amount || 0;
      }
    }
    balance = Math.max(0, balance);

    if (balance < amount) {
      return new Response(
        JSON.stringify({
          error: `Insufficient balance. You have TSh ${balance.toLocaleString()} but need TSh ${amount.toLocaleString()}.`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 2. Get event organizer
    const { data: event, error: eventError } = await admin
      .from("events")
      .select("organizer_id")
      .eq("id", eventId)
      .single();

    if (eventError || !event?.organizer_id) {
      return new Response(
        JSON.stringify({ error: "Could not find stream organizer" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (event.organizer_id === user.id) {
      return new Response(
        JSON.stringify({ error: "You cannot send a gift to yourself" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 3. Debit sender
    const { data: debit, error: debitErr } = await admin
      .from("transactions")
      .insert({
        user_id: user.id,
        event_id: eventId,
        amount,
        currency,
        provider: "Wallet",
        status: "completed",
        metadata: {
          type: "gift",
          direction: "sent",
          recipientId: event.organizer_id,
        },
      })
      .select()
      .single();

    if (debitErr) throw debitErr;

    // 4. Credit organizer
    const { error: creditErr } = await admin.from("transactions").insert({
      user_id: event.organizer_id,
      event_id: eventId,
      amount,
      currency,
      provider: "Wallet",
      status: "completed",
      metadata: {
        type: "gift-received",
        direction: "received",
        senderId: user.id,
      },
    });

    if (creditErr) throw creditErr;

    return new Response(JSON.stringify(debit), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
