import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";

// GET /api/users?role=&status=  — admin: all; manager: employees only (for dropdowns)
export async function GET(request: Request) {
  const gate = await requireRole(["admin", "manager"]);
  if (!gate.ok) return gate.response;

  const { searchParams } = new URL(request.url);
  const roleFilter = searchParams.get("role");
  const statusFilter = searchParams.get("status");

  // Managers are restricted to seeing employees only, regardless of query params,
  // since they use this endpoint purely to populate assignment dropdowns.
  const effectiveRole = gate.profile.role === "manager" ? "employee" : roleFilter ?? undefined;

  const users = await prisma.profile.findMany({
    where: {
      ...(effectiveRole ? { role: effectiveRole as never } : {}),
      ...(statusFilter ? { status: statusFilter as never } : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      managerId: true,
      designation: { select: { id: true, name: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(users);
}

// POST /api/users  (admin only) — { name, email, role, designationId, managerId }
export async function POST(request: Request) {
  const gate = await requireRole(["admin"]);
  if (!gate.ok) return gate.response;

  const body = await request.json();
  const { name, email, role, designationId, managerId } = body;

  if (!name || !email || !role) {
    return NextResponse.json({ error: "name, email, and role are required" }, { status: 400 });
  }

  // NOTE: this only creates the `profiles` row. Creating the matching
  // Supabase Auth user (so they can log in) needs the admin service-role
  // key — see the setup notes for the two-step create flow.
  const user = await prisma.profile.create({
    data: { name, email, role, designationId: designationId ?? null, managerId: managerId ?? null },
  });

  await logAudit({
    userId: gate.profile.id,
    module: "users",
    action: "create",
    recordId: user.id,
    newValue: user,
  });

  return NextResponse.json(user, { status: 201 });
}
