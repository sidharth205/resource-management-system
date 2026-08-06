import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Use this inside API route handlers and server components — reads/writes the
// session from Next.js cookies so Supabase Auth knows who's calling.
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll called from a Server Component — safe to ignore if you
            // have middleware refreshing sessions (we do, see middleware.ts).
          }
        },
      },
    }
  );
}
