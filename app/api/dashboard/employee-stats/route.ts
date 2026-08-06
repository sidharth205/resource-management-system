import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";

export async function GET() {
  const gate = await requireRole(["employee"]);
  if (!gate.ok) return gate.response;

  const [myOpenTasks, pendingTimesheets] = await Promise.all([
    prisma.task.count({ where: { assignedTo: gate.profile.id, status: { not: "completed" } } }),
    prisma.timesheet.count({ where: { employeeId: gate.profile.id, status: "pending" } }),
  ]);

  return NextResponse.json({ myOpenTasks, pendingTimesheets });
}
