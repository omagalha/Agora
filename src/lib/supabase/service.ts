import { createClient } from "@supabase/supabase-js";

// Usado somente em Server Components e Server Actions.
// Bypassa RLS — nunca expor ao cliente.
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
