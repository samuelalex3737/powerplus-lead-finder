import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Browser client using the anon key.
// RLS is enabled with NO policies for the anon role, so this client has zero data access.
// Kept for potential future use (e.g., real-time subscriptions).
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error(
      'Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local'
    );
  }

  return createSupabaseClient(supabaseUrl, anonKey);
}
