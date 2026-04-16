import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const WEBHOOK_SECRET = Deno.env.get('NTZS_WEBHOOK_SECRET');

async function verifySignature(body: string, signature: string | null): Promise<boolean> {
  if (!WEBHOOK_SECRET || !signature) return !WEBHOOK_SECRET; // skip if no secret configured
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(WEBHOOK_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
  const expected = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
  return expected === signature;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Only accept POST
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const rawBody = await req.text();
    console.log('[ntzs-webhook] Received:', rawBody);

    // Verify HMAC signature
    const signature = req.headers.get('x-ntzs-signature');
    if (!(await verifySignature(rawBody, signature))) {
      console.error('[ntzs-webhook] Invalid signature');
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = JSON.parse(rawBody);

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

      // For deposits: try to UPDATE the existing 'pending' deposit first
      if (txType === 'deposit') {
        const finalStatus = txStatus === 'completed' ? 'success' : txStatus;
        const { data: updated, error: updateError } = await supabase
          .from('transactions')
          .update({
            status: finalStatus,
            provider: 'nTZS',
            metadata: {
              type: 'deposit',
              source: 'ntzs-webhook',
              txHash,
              rawEvent: eventType,
            },
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', externalId)
          .eq('status', 'pending')
          .ilike('metadata->>type', 'deposit')
          .order('created_at', { ascending: false })
          .limit(1)
          .select();

        if (updated && updated.length > 0) {
          console.log(`[ntzs-webhook] Updated pending deposit to ${finalStatus} for user ${externalId}`);
        } else {
          // No pending deposit found — insert a new record as fallback
          console.log(`[ntzs-webhook] No pending deposit found, inserting new record`);
          if (updateError) console.error('[ntzs-webhook] Update error:', updateError);
          
          const { error: insertError } = await supabase
            .from('transactions')
            .insert({
              user_id: externalId,
              amount: amount,
              currency: 'TZS',
              provider: 'nTZS',
              status: finalStatus,
              metadata: {
                type: 'deposit',
                source: 'ntzs-webhook',
                txHash,
                rawEvent: eventType,
              },
            });
          if (insertError) console.error('[ntzs-webhook] Insert error:', insertError);
        }
      } else {
        // For withdrawals/transfers, insert as before
        const { error: insertError } = await supabase
          .from('transactions')
          .insert({
            user_id: externalId,
            amount: amount,
            currency: 'TZS',
            provider: 'nTZS',
            status: txStatus === 'completed' ? 'success' : txStatus,
            metadata: {
              type: txType,
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