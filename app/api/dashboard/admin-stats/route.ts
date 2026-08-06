import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";

export async function GET() {
  const gate = await requireRole(["admin"]);
  if (!gate.ok) return gate.response;

  const [totalEmployees, activeProjects] = await Promise.all([
    prisma.profile.count({ where: { status: "active" } }),
    prisma.project.count({ where: { status: "active" } }),
  ]);

  // "Active users today" needs a last-login timestamp captured on login;
  // TODO once that field/table exists — placeholder 0 for now so the
  // response shape matches the contract from day one.
  return NextResponse.json({ totalEmployees, activeProjects, activeUsersToday: 0 });
}
