import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const NTZS_API_KEY = Deno.env.get('NTZS_API_KEY');
const NTZS_BASE_URL = 'https://www.ntzs.co.tz/api/v1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

function jsonResponse(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (!NTZS_API_KEY) {
      console.error('[ntzs-proxy] Missing NTZS_API_KEY');
      return jsonResponse({ error: 'Server configuration error: Missing NTZS_API_KEY. Add it in Supabase Edge Function Secrets.' }, 500);
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    // Validate JWT
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return jsonResponse({ error: 'Invalid or expired token' }, 401);
    }
    const authenticatedUserId = claimsData.claims.sub;

    let bodyData;
    try {
      bodyData = await req.json();
    } catch {
      return jsonResponse({ error: 'Invalid JSON body' }, 400);
    }

    const { action, payload } = bodyData;
    if (!action) return jsonResponse({ error: 'Missing action' }, 400);

    // For create_user, enforce the externalId matches the authenticated user
    if (action === 'create_user' && payload?.externalId && payload.externalId !== authenticatedUserId) {
      return jsonResponse({ error: 'Cannot create user for a different account' }, 403);
    }

    // Route to nTZS API endpoint
    let endpoint = '';
    let method = 'GET';
    let apiBody: any = null;

    switch (action) {
      case 'create_user':
        endpoint = '/users';
        method = 'POST';
        apiBody = payload;
        break;
      case 'get_user':
        if (!payload?.userId) return jsonResponse({ error: 'Missing payload.userId' }, 400);
        endpoint = `/users/${payload.userId}`;
        break;
      case 'get_balance':
        if (!payload?.userId) return jsonResponse({ error: 'Missing payload.userId' }, 400);
        endpoint = `/users/${payload.userId}`;
        break;
      case 'deposit':
        endpoint = '/deposits';
        method = 'POST';
        apiBody = payload;
        break;
      case 'get_deposit':
        if (!payload?.depositId) return jsonResponse({ error: 'Missing payload.depositId' }, 400);
        endpoint = `/deposits/${payload.depositId}`;
        break;
      case 'transfer':
        endpoint = '/transfers';
        method = 'POST';
        apiBody = payload;
        break;
      case 'withdraw':
        endpoint = '/withdrawals';
        method = 'POST';
        apiBody = payload;
        break;
      default:
        return jsonResponse({ error: `Unknown action: ${action}` }, 400);
    }

    const url = `${NTZS_BASE_URL}${endpoint}`;
    console.log(`[ntzs-proxy] ${method} ${url}`);

    const ntzsResponse = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${NTZS_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: apiBody ? JSON.stringify(apiBody) : undefined,
    });

    const contentType = ntzsResponse.headers.get('content-type');
    let data;
    if (contentType?.includes('application/json')) {
      data = await ntzsResponse.json();
    } else {
      const text = await ntzsResponse.text();
      console.error(`[ntzs-proxy] Non-JSON response (${ntzsResponse.status}):`, text.substring(0, 300));
      // Return 200 with fallback flag so client doesn't get a hard error
      return jsonResponse({
        error: `nTZS API Error: ${ntzsResponse.status}`,
        details: text.substring(0, 500),
        url: endpoint,
        apiUnavailable: true,
        fallback: true,
      }, 200);
    }

    if (!ntzsResponse.ok) {
      console.error(`[ntzs-proxy] nTZS error ${ntzsResponse.status}:`, data);
      const isFallbackable = ntzsResponse.status >= 500;
      // Return 200 for server errors to prevent client-side "non-2xx" crashes
      return jsonResponse({
        error: data.message || `nTZS API Error: ${ntzsResponse.status}`,
        details: data,
        statusCode: ntzsResponse.status,
        apiUnavailable: isFallbackable,
        fallback: isFallbackable,
      }, isFallbackable ? 200 : 400);
    }

    return jsonResponse(data);

  } catch (error) {
    console.error('[ntzs-proxy] Internal Error:', error);
    // Return 200 with fallback flag to prevent client crash
    return jsonResponse({ error: error.message || 'Internal Server Error', apiUnavailable: true, fallback: true }, 200);
  }
});
