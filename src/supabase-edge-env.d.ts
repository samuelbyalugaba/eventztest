declare module "https://deno.land/std@0.168.0/http/server.ts" {
  export function serve(handler: (req: Request) => Response | Promise<Response>): void;
}

declare module "npm:jwt-decode" {
  export default function jwtDecode(token: string): any;
}

declare module "npm:@supabase/supabase-js" {
  export function createClient(url: string, key: string): any;
}

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

