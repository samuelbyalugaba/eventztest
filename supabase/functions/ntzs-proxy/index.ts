import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// Initialize configuration
const NTZS_API_KEY = Deno.env.get('NTZS_API_KEY');
// List of potential base URLs to try (including path prefixes)
const BASE_URLS = [
  'https://api.ntzs.co/api/v1',      // Documented
  'https://api.ntzs.co.tz/api/v1',   // Likely
  'https://api.ntzs.co.tz/api',      // No version?
  'https://api.ntzs.co.tz',          // Root?
  'https://ntzs.co.tz/api/v1',
  'https://app.ntzs.co.tz/api/v1'
];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log(`[ntzs-proxy] Received request: ${req.method}`);
    
    // 0. Verify Environment Variables
    if (!NTZS_API_KEY) {
      console.error('[ntzs-proxy] Missing NTZS_API_KEY');
      return new Response(JSON.stringify({ error: 'Server configuration error: Missing API Key' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 1. Verify Authorization (Supabase Auth)
    const authHeader = req.headers.get('Authorization');
    
    // DEBUG: Log headers to verify what we are receiving
    console.log('[ntzs-proxy] Headers:', JSON.stringify(Object.fromEntries(req.headers.entries())));

    if (!authHeader) {
      console.error('[ntzs-proxy] Missing Authorization header');
      return new Response(JSON.stringify({ error: 'Unauthorized: Missing Authorization header' }), {
        status: 200, // Changed to 200 to verify if this is the source
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 2. Parse Payload
    let bodyData;
    try {
      bodyData = await req.json();
    } catch (e) {
      console.error('[ntzs-proxy] Failed to parse JSON body', e);
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    const { action, payload } = bodyData;
    console.log(`[ntzs-proxy] Action: ${action}`);

    // 3. Route to nTZS API
    let endpoint = '';
    let method = 'GET';
    let apiBody = null;

    switch (action) {
      case 'create_user':
        endpoint = '/users';
        method = 'POST';
        apiBody = payload;
        break;
      
      case 'get_user':
        if (!payload?.userId) throw new Error('Missing payload.userId');
        endpoint = `/users/${payload.userId}`;
        method = 'GET';
        break;

      case 'get_balance':
        if (!payload?.userId) throw new Error('Missing payload.userId');
        endpoint = `/users/${payload.userId}/balance`;
        method = 'GET';
        break;

      case 'deposit':
        endpoint = '/deposits';
        method = 'POST';
        apiBody = payload;
        break;

      case 'get_deposit':
        if (!payload?.depositId) throw new Error('Missing payload.depositId');
        endpoint = `/deposits/${payload.depositId}`;
        method = 'GET';
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
        console.error(`[ntzs-proxy] Unknown action: ${action}`);
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    // 4. Call nTZS API with Fallback
    let ntzsResponse;
    let lastError;
    let successUrl = '';
    let all404s = true;

    for (const baseUrl of BASE_URLS) {
      try {
        console.log(`[ntzs-proxy] Trying nTZS: ${method} ${baseUrl}${endpoint}`);
        
        ntzsResponse = await fetch(`${baseUrl}${endpoint}`, {
          method,
          headers: {
            'Authorization': `Bearer ${NTZS_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: apiBody ? JSON.stringify(apiBody) : undefined,
        });

        console.log(`[ntzs-proxy] Response from ${baseUrl}: ${ntzsResponse.status}`);
        
        // If 404, it might be the wrong domain/path, so try next one
        if (ntzsResponse.status === 404) {
           console.warn(`[ntzs-proxy] 404 from ${baseUrl}, trying next...`);
           lastError = new Error(`404 Not Found at ${baseUrl}${endpoint}`);
           continue;
        }

        // Got a non-404 response (could be 200, 400, 401, 500, etc.)
        all404s = false;
        successUrl = baseUrl;
        break; // Stop if we get a response (non-404)
      } catch (err) {
        console.error(`[ntzs-proxy] Failed to connect to ${baseUrl}:`, err.message);
        lastError = err;
        // Continue to next URL
      }
    }

    if (!ntzsResponse) {
      console.error('[ntzs-proxy] All connection attempts failed');
      return new Response(JSON.stringify({ 
        error: `Failed to connect to nTZS API. DNS/Network Error.`,
        details: lastError?.message || 'Unknown network error'
      }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // If all URLs returned 404, return a clear error
    if (all404s && ntzsResponse.status === 404) {
      console.error('[ntzs-proxy] All endpoints returned 404');
      return new Response(JSON.stringify({ 
        error: `nTZS API Error: 404 Not Found`,
        details: `Endpoint ${endpoint} not found on any nTZS API base URL. This may indicate an incorrect endpoint path or the user/resource does not exist.`,
        endpoint: endpoint,
        triedUrls: BASE_URLS.map(url => `${url}${endpoint}`)
      }), {
        status: 200, // Return 200 to allow client to read error message
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`[ntzs-proxy] Connected to ${successUrl}${endpoint}. Status: ${ntzsResponse.status}`);

    // Handle non-JSON responses
    const contentType = ntzsResponse.headers.get("content-type");
    let data;
    if (contentType && contentType.includes("application/json")) {
      data = await ntzsResponse.json();
    } else {
      const text = await ntzsResponse.text();
      console.error('[ntzs-proxy] nTZS Non-JSON Response:', text);
      return new Response(JSON.stringify({ 
        error: `nTZS API Error: ${ntzsResponse.status} ${ntzsResponse.statusText}`, 
        details: text.substring(0, 500),
        url: `${successUrl}${endpoint}`
      }), {
        status: 200, // Return 200 to show error in frontend
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!ntzsResponse.ok) {
      console.error('[ntzs-proxy] nTZS Error Data:', data);
      // Return 200 with error details so the client can parse the JSON body
      // instead of Supabase client throwing a generic non-2xx error.
      return new Response(JSON.stringify({ 
        error: data.message || `nTZS API Error: ${ntzsResponse.status}`,
        details: data,
        statusCode: ntzsResponse.status,
        url: `${successUrl}${endpoint}` // Return the successful URL
      }), {
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 5. Success
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[ntzs-proxy] Internal Error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), {
      status: 200, // Return 200 to allow client to read error message
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
