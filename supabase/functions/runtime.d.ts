// Minimal declarations for local TypeScript checks; deployment uses Deno types.
declare const Deno: {
  env: { get(name: string): string | undefined }
  serve(handler: (request: Request) => Response | Promise<Response>): unknown
}
declare module 'https://esm.sh/@supabase/supabase-js@2.111.0' {
  export const createClient: typeof import('@supabase/supabase-js').createClient
}
declare module 'https://esm.sh/@supabase/supabase-js@2' {
  export const createClient: typeof import('@supabase/supabase-js').createClient
}
