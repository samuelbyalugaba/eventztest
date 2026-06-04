import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  getWebhookSignatureHeader,
  verifyHmacSha256Signature,
} from "../_shared/webhookSignature.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const WEBHOOK_SECRET = Deno.env.get("SNIPPE_WEBHOOK_SECRET");

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const rawBody = await req.text();

    if (!WEBHOOK_SECRET) {
      console.error("SNIPPE_WEBHOOK_SECRET is not configured");
      return new Response("Webhook not configured", { status: 500, headers: corsHeaders });
    }

    const signature = getWebhookSignatureHeader(req.headers);
    const isValidSignature = await verifyHmacSha256Signature(rawBody, WEBHOOK_SECRET, signature);
    if (!isValidSignature) {
      console.error("Invalid Snippe webhook signature");
      return new Response("Invalid signature", { status: 401, headers: corsHeaders });
    }

    const body = JSON.parse(rawBody);

    // Extract details
    // Structure typically: { event: "payment.completed", reference: "...", status: "...", metadata: {...} }
    // Or wrapped in data: { event: "...", data: { ... } }
    // Based on SDK: payload.event, payload.reference
    
    const eventType = body.event; // "payment.completed" or "payment.failed"
    const reference = body.reference || body.data?.reference;
    const status = body.status || body.data?.status;
    const metadata = body.metadata || body.data?.metadata;
    const transactionId = metadata?.transaction_id;
    console.log("Snippe Webhook Received:", { eventType, reference, status, transactionId });

    if (!transactionId) {
        console.warn("Webhook received without transaction_id metadata. Ignoring or manual check required.");
        // We return 200 to stop Snippe from retrying if it's just malformed for us
        return new Response("Missing transaction_id", { status: 200 });
    }

    // Initialize Supabase Admin
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let dbStatus = 'pending';
    if (eventType === 'payment.completed' || status === 'completed' || status === 'successful') {
        dbStatus = 'success';
    } else if (eventType === 'payment.failed' || status === 'failed') {
        dbStatus = 'failed';
    } else {
        // Other events (e.g. initiated), don't change status to success/failed yet
        console.log(`Event type ${eventType} received, keeping status as pending/current.`);
        return new Response("Event acknowledged", { status: 200 });
    }

    // Update Transaction
    const { error } = await supabase
        .from('transactions')
        .update({ 
            status: dbStatus,
            updated_at: new Date().toISOString(),
            // We append the webhook event to metadata for audit trail
            metadata: { 
                webhook_history: body 
            } 
        })
        .eq('id', transactionId);

    if (error) {
        console.error("Failed to update transaction:", error);
        return new Response("DB Error", { status: 500 });
    }

    console.log(`Transaction ${transactionId} updated to ${dbStatus}`);
    return new Response("Webhook processed", { status: 200 });

  } catch (error: any) {
    console.error("Webhook Error:", error);
    return new Response(`Error: ${error.message}`, { status: 400 });
  }
});
