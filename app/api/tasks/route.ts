import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { createNotification } from "@/lib/notify";

// GET /api/tasks?projectId=&status=&priority=
// manager: tasks within their own projects; employee: only tasks assigned to them
export async function GET(request: Request) {
  const gate = await requireRole(["admin", "manager", "employee"]);
  if (!gate.ok) return gate.response;

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId") ?? undefined;
  const status = searchParams.get("status") ?? undefined;
  const priority = searchParams.get("priority") ?? undefined;
  const { profile } = gate;

  const tasks = await prisma.task.findMany({
    where: {
      ...(projectId ? { projectId } : {}),
      ...(status ? { status: status as never } : {}),
      ...(priority ? { priority: priority as never } : {}),
      ...(profile.role === "employee" ? { assignedTo: profile.id } : {}),
      ...(profile.role === "manager" ? { project: { managerId: profile.id } } : {}),
    },
    orderBy: { dueDate: "asc" },
  });

  return NextResponse.json(tasks);
}

// POST /api/tasks (manager only) — { projectId, assignedTo, title, description, priority, dueDate, estimatedHours }
export async function POST(request: Request) {
  const gate = await requireRole(["manager"]);
  if (!gate.ok) return gate.response;

  const body = await request.json();
  const { projectId, assignedTo, title, description, priority, dueDate, estimatedHours } = body;

  if (!projectId || !assignedTo || !title) {
    return NextResponse.json(
      { error: "projectId, assignedTo, and title are required" },
      { status: 400 }
    );
  }

  const task = await prisma.task.create({
    data: {
      projectId,
      assignedTo,
      title,
      description,
      priority,
      dueDate: dueDate ? new Date(dueDate) : null,
      estimatedHours,
    },
  });

  await createNotification({
    userId: assignedTo,
    title: "New task assigned",
    message: `You've been assigned: ${title}`,
    type: "task_assigned",
  });

  await logAudit({
    userId: gate.profile.id,
    module: "tasks",
    action: "create",
    recordId: task.id,
    newValue: task,
  });

  return NextResponse.json(task, { status: 201 });
}
