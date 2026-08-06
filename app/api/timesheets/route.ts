import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { createNotification } from "@/lib/notify";

// GET /api/timesheets?status=&projectId=
// employee: own only; manager: timesheets for their own projects
export async function GET(request: Request) {
  const gate = await requireRole(["admin", "manager", "employee"]);
  if (!gate.ok) return gate.response;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? undefined;
  const projectId = searchParams.get("projectId") ?? undefined;
  const { profile } = gate;

  const timesheets = await prisma.timesheet.findMany({
    where: {
      ...(status ? { status: status as never } : {}),
      ...(projectId ? { projectId } : {}),
      ...(profile.role === "employee" ? { employeeId: profile.id } : {}),
      ...(profile.role === "manager" ? { project: { managerId: profile.id } } : {}),
    },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(timesheets);
}

// POST /api/timesheets (employee only) — { projectId, taskId, date, hours, remarks }
export async function POST(request: Request) {
  const gate = await requireRole(["employee"]);
  if (!gate.ok) return gate.response;

  const { projectId, taskId, date, hours, remarks } = await request.json();
  if (!projectId || !date || !hours) {
    return NextResponse.json({ error: "projectId, date, and hours are required" }, { status: 400 });
  }

  const timesheet = await prisma.timesheet.create({
    data: {
      employeeId: gate.profile.id,
      projectId,
      taskId: taskId ?? null,
      date: new Date(date),
      hours,
      remarks,
    },
  });

  await logAudit({
    userId: gate.profile.id,
    module: "timesheets",
    action: "create",
    recordId: timesheet.id,
    newValue: timesheet,
  });

  return NextResponse.json(timesheet, { status: 201 });
}
