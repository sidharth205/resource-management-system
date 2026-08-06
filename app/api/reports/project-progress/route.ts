import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";

export async function GET() {
  const gate = await requireRole(["admin", "manager"]);
  if (!gate.ok) return gate.response;

  const projects = await prisma.project.findMany({
    where: gate.profile.role === "manager" ? { managerId: gate.profile.id } : {},
    select: { id: true, name: true, progress: true },
  });

  return NextResponse.json(
    projects.map((p) => ({ projectId: p.id, name: p.name, progress: p.progress }))
  );
}
