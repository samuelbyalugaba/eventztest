// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const payload = await req.json()
    const { utilityref, transactionstatus, success } = payload

    let status = 'pending'
    if (success === true || transactionstatus?.toLowerCase() === 'success') {
      status = 'completed'
    } else if (success === false || transactionstatus?.toLowerCase() === 'failure') {
      status = 'failed'
    }

    if (!utilityref) {
      throw new Error('Missing utilityref')
    }

    const txId = Number(utilityref)
    if (!Number.isFinite(txId)) {
      throw new Error('Invalid utilityref')
    }

    const { data: existing } = await supabaseClient
      .from('transactions')
      .select('id,status,metadata')
      .eq('id', txId)
      .single()

    if (!existing) {
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
      )
    }

    if (existing.status === 'completed') {
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
      )
    }

    const { error } = await supabaseClient
      .from('transactions')
      .update({ 
        status: status,
        provider_transaction_id: payload.reference || payload.transactionId,
        metadata: Object.assign({}, existing.metadata || {}, payload, { updated_at: new Date().toISOString() })
      })
      .eq('id', txId)

    if (error) {
      throw error
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
    )
  }
})
