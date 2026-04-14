import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const NTZS_API_KEY = Deno.env.get('NTZS_API_KEY');
const NTZS_BASE_URL = 'https://api.ntzs.co/api/v1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

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

    let bodyData;
    try {
      bodyData = await req.json();
    } catch {
      return jsonResponse({ error: 'Invalid JSON body' }, 400);
    }

    const { action, payload } = bodyData;
    if (!action) return jsonResponse({ error: 'Missing action' }, 400);

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
        endpoint = `/users/${payload.userId}/balance`;
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
      return jsonResponse({
        error: `nTZS API returned ${ntzsResponse.status}`,
        details: text.substring(0, 500),
      }, 502);
    }

    if (!ntzsResponse.ok) {
      console.error(`[ntzs-proxy] nTZS error ${ntzsResponse.status}:`, data);
      return jsonResponse({
        error: data.message || `nTZS API Error: ${ntzsResponse.status}`,
        details: data,
        statusCode: ntzsResponse.status,
      });
    }

    return jsonResponse(data);

  } catch (error) {
    console.error('[ntzs-proxy] Internal Error:', error);
    return jsonResponse({ error: error.message || 'Internal Server Error' }, 500);
  }
})
