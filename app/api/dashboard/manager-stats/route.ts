import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";

export async function GET() {
  const gate = await requireRole(["manager"]);
  if (!gate.ok) return gate.response;

  const [activeProjects, pendingTimesheets, openTasks] = await Promise.all([
    prisma.project.count({ where: { managerId: gate.profile.id, status: "active" } }),
    prisma.timesheet.count({ where: { project: { managerId: gate.profile.id }, status: "pending" } }),
    prisma.task.count({
      where: { project: { managerId: gate.profile.id }, status: { not: "completed" } },
    }),
  ]);

  return NextResponse.json({ activeProjects, pendingTimesheets, openTasks });
}
