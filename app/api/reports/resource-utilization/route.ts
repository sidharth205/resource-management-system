import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";

export async function GET() {
  const gate = await requireRole(["admin", "manager"]);
  if (!gate.ok) return gate.response;

  const employees = await prisma.profile.findMany({
    where: { role: "employee" },
    select: { id: true, name: true, _count: { select: { assignedTasks: true } } },
  });

  return NextResponse.json(
    employees.map((e) => ({ employeeId: e.id, name: e.name, assignedTaskCount: e._count.assignedTasks }))
  );
}
