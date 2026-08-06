import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";

// GET /api/notifications — current user's own notifications only
export async function GET() {
  const gate = await requireRole(["admin", "manager", "employee"]);
  if (!gate.ok) return gate.response;

  const notifications = await prisma.notification.findMany({
    where: { userId: gate.profile.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(notifications);
}
