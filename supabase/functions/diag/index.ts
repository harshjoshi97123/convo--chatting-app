import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  
  return new Response(
    JSON.stringify({
      url: !!url,
      serviceKey: !!serviceKey,
      anonKey: !!anonKey
    }),
    { headers: { "Content-Type": "application/json" } },
  )
})
