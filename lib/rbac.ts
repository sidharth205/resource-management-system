import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "./supabase-server";
import { prisma } from "./prisma";
import type { Role } from "@prisma/client";

/**
 * Call this first in every API route handler that needs auth/role gating.
 *
 * Usage:
 *   const gate = await requireRole(["admin"]);
 *   if (!gate.ok) return gate.response;
 *   const { profile } = gate;   // use profile.id, profile.role, etc.
 *
 * Returning a discriminated union (ok: true/false) instead of throwing keeps
 * every route's control flow explicit and easy for B/C to read even though
 * they never touch this file.
 */
export async function requireRole(allowedRoles: Role[]) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Not authenticated" }, { status: 401 }),
    };
  }

  const profile = await prisma.profile.findUnique({ where: { id: user.id } });

  if (!profile) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Profile not found" }, { status: 401 }),
    };
  }

  if (!allowedRoles.includes(profile.role)) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Not authorized for this action" }, { status: 403 }),
    };
  }

  return { ok: true as const, profile };
}
