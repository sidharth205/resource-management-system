import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";

// GET /api/projects — admin: all; manager: own; employee: assigned only
export async function GET() {
  const gate = await requireRole(["admin", "manager", "employee"]);
  if (!gate.ok) return gate.response;

  const { profile } = gate;

  const projects = await prisma.project.findMany({
    where:
      profile.role === "admin"
        ? {}
        : profile.role === "manager"
        ? { managerId: profile.id }
        : { members: { some: { profileId: profile.id } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(projects);
}

// POST /api/projects (manager only) — { name, description, startDate, endDate }
export async function POST(request: Request) {
  const gate = await requireRole(["manager"]);
  if (!gate.ok) return gate.response;

  const { name, description, startDate, endDate } = await request.json();
  if (!name || !startDate) {
    return NextResponse.json({ error: "name and startDate are required" }, { status: 400 });
  }

  const project = await prisma.project.create({
    data: {
      name,
      description,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      managerId: gate.profile.id,
    },
  });

  await logAudit({
    userId: gate.profile.id,
    module: "projects",
    action: "create",
    recordId: project.id,
    newValue: project,
  });

  return NextResponse.json(project, { status: 201 });
}
