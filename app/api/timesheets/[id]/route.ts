import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { createNotification } from "@/lib/notify";

// PATCH /api/timesheets/:id (manager only) — { status: "approved"|"rejected", remarks? }
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireRole(["manager"]);
  if (!gate.ok) return gate.response;

  const { id } = await params;
  const { status, remarks } = await request.json();

  if (!["approved", "rejected"].includes(status)) {
    return NextResponse.json({ error: "status must be approved or rejected" }, { status: 400 });
  }

  const existing = await prisma.timesheet.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.timesheet.update({
    where: { id },
    data: { status, remarks, approvedBy: gate.profile.id, approvedAt: new Date() },
  });

  await createNotification({
    userId: updated.employeeId,
    title: `Timesheet ${status}`,
    message: `Your timesheet for ${updated.date.toDateString()} was ${status}.`,
    type: status === "approved" ? "timesheet_approved" : "timesheet_rejected",
  });

  await logAudit({
    userId: gate.profile.id,
    module: "timesheets",
    action: status === "approved" ? "approve" : "reject",
    recordId: updated.id,
    previousValue: existing,
    newValue: updated,
  });

  return NextResponse.json(updated);
}
