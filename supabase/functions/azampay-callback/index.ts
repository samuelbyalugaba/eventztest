// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const payload = await req.json()
    console.log('AzamPay Callback Payload:', payload)

    // Extract status and ID
    // AzamPay MNO Checkout Callback format:
    // {
    //   "utilityref": "12345",   <-- This is our externalId / transaction ID
    //   "operator": "Airtel",
    //   "reference": "12345678",
    //   "transactionstatus": "success" | "failure", 
    //   "submerchantAcc": "...",
    //   "amount": "1000",
    //   "message": "...",
    //   "success": true
    // }

    const { utilityref, transactionstatus, success } = payload
    
    // Normalize status
    let status = 'pending';
    if (success === true || transactionstatus?.toLowerCase() === 'success') {
      status = 'completed';
    } else if (success === false || transactionstatus?.toLowerCase() === 'failure') {
      status = 'failed';
    }

    if (!utilityref) {
      throw new Error('Missing utilityref in callback payload');
    }

    // Update Transaction in Supabase
    const { error } = await supabaseClient
      .from('transactions')
      .update({ 
        status: status,
        provider_transaction_id: payload.reference || payload.transactionId,
        metadata: {
            ...payload,
            updated_at: new Date().toISOString()
        }
      })
      .eq('id', utilityref)

    if (error) {
        console.error('Error updating transaction:', error);
        throw error;
    }

    // If successful, we might want to trigger ticket creation if it wasn't done yet.
    // However, in our current flow, we optimistically created the ticket or the client handles it.
    // Ideally, the ticket creation should happen here if we want to be secure.
    // For now, just updating the transaction status is a good first step.

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Callback Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
