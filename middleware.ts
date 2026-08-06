import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Runs on every request. Refreshes the Supabase session cookie and blocks
// role-mismatched access to /admin, /manager, /employee before any page
// or API route even loads.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isProtected =
    path.startsWith("/admin") || path.startsWith("/manager") || path.startsWith("/employee");

  if (isProtected && !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Role-specific redirect happens by checking the `profiles` table.
  // We call our own lightweight API instead of Prisma directly here, since
  // Prisma isn't edge-runtime friendly inside middleware.
  if (isProtected && user) {
    const roleRes = await fetch(new URL("/api/auth/role", request.url), {
      headers: { cookie: request.headers.get("cookie") ?? "" },
    });
    const { role } = (await roleRes.json()) as { role?: string };

    if (path.startsWith("/admin") && role !== "admin") {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (path.startsWith("/manager") && role !== "manager") {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (path.startsWith("/employee") && role !== "employee") {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/manager/:path*", "/employee/:path*"],
};
