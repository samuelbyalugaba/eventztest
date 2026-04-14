import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// Webhook endpoint for nTZS deposit/withdrawal/transfer status updates

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Only accept POST
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log('[ntzs-webhook] Received:', JSON.stringify(body, null, 2));

    const eventType = body.type || body.event;
    if (!eventType) {
      return new Response(JSON.stringify({ error: 'Missing event type' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // nTZS sends events like deposit.completed, transfer.completed, withdrawal.completed
    // Extract the user reference and amount
    const data = body.data || body;
    const externalId = data.externalId || data.userId || data.user?.externalId;
    const amount = data.amountTzs || data.amount || 0;
    const txHash = data.txHash || data.transactionHash || '';

    let txType = 'unknown';
    let txStatus = 'pending';

    if (eventType.includes('deposit')) {
      txType = 'deposit';
    } else if (eventType.includes('withdrawal')) {
      txType = 'withdrawal';
    } else if (eventType.includes('transfer')) {
      txType = 'transfer';
    }

    if (eventType.includes('completed') || eventType.includes('confirmed')) {
      txStatus = 'completed';
    } else if (eventType.includes('failed')) {
      txStatus = 'failed';
    }

    // Record in transactions table if we have a user reference
    if (externalId && txStatus !== 'pending') {
      // externalId is the Supabase user UUID we used when creating the nTZS user
      const { error: insertError } = await supabase
        .from('transactions')
        .insert({
          user_id: externalId,
          amount: amount,
          currency: 'TZS',
          provider: 'nTZS',
          status: txStatus === 'completed' ? 'success' : txStatus,
          metadata: {
            type: txType === 'deposit' ? 'top-up' : txType,
            source: 'ntzs-webhook',
            txHash,
            rawEvent: eventType,
          },
        });

      if (insertError) {
        console.error('[ntzs-webhook] DB insert error:', insertError);
      } else {
        console.log(`[ntzs-webhook] Recorded ${txType} (${txStatus}) for user ${externalId}`);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[ntzs-webhook] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});