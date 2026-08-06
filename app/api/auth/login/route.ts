import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";

// POST /api/auth/login  { email, password } -> { role }
export async function POST(request: Request) {
  const { email, password } = await request.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const profile = await prisma.profile.findUnique({
    where: { id: data.user.id },
    select: { role: true, status: true },
  });

  if (!profile) {
    return NextResponse.json({ error: "No profile found for this account" }, { status: 401 });
  }

  if (profile.status !== "active") {
    await supabase.auth.signOut();
    return NextResponse.json({ error: "Account is not active" }, { status: 403 });
  }

  return NextResponse.json({ role: profile.role });
}
