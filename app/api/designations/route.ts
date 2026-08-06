import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";

// GET /api/designations?status=active — any authenticated role can read
export async function GET(request: Request) {
  const gate = await requireRole(["admin", "manager", "employee"]);
  if (!gate.ok) return gate.response;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  const designations = await prisma.designation.findMany({
    where: status ? { status: status as never } : {},
    orderBy: { name: "asc" },
  });

  return NextResponse.json(designations);
}

// POST /api/designations (admin only) — { name }
export async function POST(request: Request) {
  const gate = await requireRole(["admin"]);
  if (!gate.ok) return gate.response;

  const { name } = await request.json();
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

  const designation = await prisma.designation.create({ data: { name } });

  await logAudit({
    userId: gate.profile.id,
    module: "designations",
    action: "create",
    recordId: designation.id,
    newValue: designation,
  });

  return NextResponse.json(designation, { status: 201 });
}
