import { createBrowserClient } from "@supabase/ssr";

// Use this inside "use client" components (login form, profile page, etc.)
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
