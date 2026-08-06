import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";

export async function GET() {
  const gate = await requireRole(["admin", "manager"]);
  if (!gate.ok) return gate.response;

  const scopeWhere = gate.profile.role === "manager" ? { project: { managerId: gate.profile.id } } : {};

  const [pending, approved, rejected] = await Promise.all([
    prisma.timesheet.count({ where: { ...scopeWhere, status: "pending" } }),
    prisma.timesheet.count({ where: { ...scopeWhere, status: "approved" } }),
    prisma.timesheet.count({ where: { ...scopeWhere, status: "rejected" } }),
  ]);

  return NextResponse.json({ pending, approved, rejected });
}
