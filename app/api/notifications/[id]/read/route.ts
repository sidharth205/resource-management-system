import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";

// PATCH /api/notifications/:id/read — marks the caller's own notification read
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireRole(["admin", "manager", "employee"]);
  if (!gate.ok) return gate.response;

  const { id } = await params;
  const notification = await prisma.notification.findUnique({ where: { id } });

  if (!notification || notification.userId !== gate.profile.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.notification.update({ where: { id }, data: { isRead: true } });
  return NextResponse.json(updated);
}
