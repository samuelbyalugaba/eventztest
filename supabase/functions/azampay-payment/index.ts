// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// Configuration
const AZAMPAY_BASE_URL = Deno.env.get('AZAMPAY_ENV') === 'production' 
  ? "https://checkout.azampay.co.tz" 
  : "https://sandbox.azampay.co.tz";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { amount, accountNumber, provider, externalId } = await req.json()

    // Basic Validation
    if (!amount || !accountNumber || !provider || !externalId) {
      throw new Error('Missing required fields: amount, accountNumber, provider, or externalId');
    }

    // 1. Get Access Token
    const clientId = Deno.env.get('AZAMPAY_CLIENT_ID');
    const clientSecret = Deno.env.get('AZAMPAY_CLIENT_SECRET');
    const appName = Deno.env.get('AZAMPAY_APP_NAME') || 'Eventz';

    if (!clientId || !clientSecret) {
      throw new Error('AzamPay credentials (AZAMPAY_CLIENT_ID, AZAMPAY_CLIENT_SECRET) not configured in Edge Function secrets.');
    }

    console.log(`Authenticating with AzamPay for app: ${appName}`);

    const authResponse = await fetch(`${AZAMPAY_BASE_URL}/azampay/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        appName: appName,
        clientId: clientId,
        clientSecret: clientSecret,
      }),
    });

    if (!authResponse.ok) {
      const errorText = await authResponse.text();
      console.error('AzamPay Auth Error:', errorText);
      throw new Error(`AzamPay Auth Failed: ${authResponse.statusText}`);
    }

    const authData = await authResponse.json();
    const accessToken = authData.data?.accessToken;

    if (!accessToken) {
      throw new Error('Failed to retrieve access token from AzamPay response');
    }

    // 2. Initiate Checkout (MNO Push Payment)
    // Providers: "Airtel", "Tigo", "Halantel", "Azampesa"
    console.log(`Initiating checkout for Transaction ${externalId} via ${provider}`);
    
    const checkoutResponse = await fetch(`${AZAMPAY_BASE_URL}/azampay/mno/checkout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        accountNumber: accountNumber, // Format: 255XXXXXXXXX
        amount: String(amount),
        currency: "TZS",
        externalId: externalId, // Maps to our transactions.id (or provider_transaction_id)
        provider: provider, 
      }),
    });

    // AzamPay might return 200 even if transaction fails later (async), or 400/500 if immediate fail.
    const checkoutData = await checkoutResponse.json();
    
    if (!checkoutResponse.ok) {
      console.error('AzamPay Checkout Error:', checkoutData);
      throw new Error(`AzamPay Checkout Failed: ${JSON.stringify(checkoutData)}`);
    }

    // Log success (in a real app, maybe update transaction status to 'processing' via Supabase client here)

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: checkoutData,
        message: 'Payment request initiated successfully' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error: any) {
    console.error('Edge Function Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400, // Return 400 for bad requests/logic errors
      },
    )
  }
})
