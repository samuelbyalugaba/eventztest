// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// Configuration
const AZAMPAY_ENV = Deno.env.get('AZAMPAY_ENV') || 'sandbox';

const AZAMPAY_AUTH_URL = AZAMPAY_ENV === 'production'
  ? "https://authenticator.azampay.co.tz/AppRegistration/GenerateToken"
  : "https://authenticator-sandbox.azampay.co.tz/AppRegistration/GenerateToken";

const AZAMPAY_BASE_URL = AZAMPAY_ENV === 'production' 
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
    const apiKey = Deno.env.get('AZAMPAY_API_KEY'); // Optional?
    const appName = Deno.env.get('AZAMPAY_APP_NAME') || 'Eventz';

    if (!clientId || !clientSecret) {
      throw new Error('AzamPay credentials (AZAMPAY_CLIENT_ID, AZAMPAY_CLIENT_SECRET) not configured in Edge Function secrets.');
    }

    console.log(`Authenticating with AzamPay for app: ${appName} at ${AZAMPAY_AUTH_URL}`);

    const authResponse = await fetch(AZAMPAY_AUTH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; Eventz/1.0)',
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
    
    console.log(`Auth Success! Token length: ${accessToken.length}`);

    // 2. Initiate Checkout (MNO Push Payment)
    console.log(`Initiating checkout for Transaction ${externalId} via ${provider} at ${AZAMPAY_BASE_URL}`);
    
    const checkoutHeaders: Record<string, string> = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (compatible; Eventz/1.0)',
    };

    if (apiKey) {
      checkoutHeaders['X-API-KEY'] = apiKey;
    }

    const checkoutResponse = await fetch(`${AZAMPAY_BASE_URL}/azampay/mno/checkout`, {
      method: 'POST',
      headers: checkoutHeaders,
      body: JSON.stringify({
        accountNumber: accountNumber,
        amount: String(amount),
        currency: "TZS",
        externalId: externalId,
        provider: provider, 
      }),
    });

    const checkoutText = await checkoutResponse.text();
    console.log(`AzamPay Checkout Response (${checkoutResponse.status}):`, checkoutText);

    let checkoutData;
    try {
        checkoutData = checkoutText ? JSON.parse(checkoutText) : {};
    } catch (e) {
        checkoutData = { raw: checkoutText };
    }
    
    if (!checkoutResponse.ok) {
      console.error('AzamPay Checkout Error:', checkoutData);
      throw new Error(`AzamPay Checkout Failed: ${checkoutResponse.status} - ${checkoutText}`);
    }

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

  } catch (error) {
    console.error('Payment Function Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
