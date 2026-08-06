const ALLOWED_ORIGINS = [
  "https://eventz.app",
  "https://www.eventz.app",
  "https://app.eventz.app",
  "https://eventz.live",
  "https://www.eventz.live",
  "https://app.eventz.live",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:8080",
];

const ALLOWED_ORIGIN_PATTERNS = [
  /^https:\/\/[a-z0-9-]+\.lovable\.app$/i,
  /^https:\/\/[a-z0-9-]+\.lovableproject\.com$/i,
  /^https:\/\/[a-z0-9-]+\.vercel\.app$/i,
  /^capacitor:\/\/localhost$/i,
  /^http:\/\/localhost(:\d+)?$/i,
];

function isAllowed(origin: string): boolean {
  return ALLOWED_ORIGINS.includes(origin) || ALLOWED_ORIGIN_PATTERNS.some((p) => p.test(origin));
}

export function getCorsHeaders(req?: Request): Record<string, string> {
  const origin = req?.headers?.get("origin") || "";
  const allowedOrigin = isAllowed(origin) ? origin : ALLOWED_ORIGINS[0];

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Vary": "Origin",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-eventz-internal-secret",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Credentials": "true",
  };
}


export function corsResponse(body: unknown, status = 200, req?: Request): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
  });
}

export function corsOptionsResponse(req?: Request): Response {
  return new Response("ok", { headers: getCorsHeaders(req) });
}
