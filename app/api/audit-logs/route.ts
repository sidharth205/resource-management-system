import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";

// GET /api/audit-logs?module=&userId= (admin only)
export async function GET(request: Request) {
  const gate = await requireRole(["admin"]);
  if (!gate.ok) return gate.response;

  const { searchParams } = new URL(request.url);
  const module = searchParams.get("module") ?? undefined;
  const userId = searchParams.get("userId") ?? undefined;

  const logs = await prisma.auditLog.findMany({
    where: { ...(module ? { module } : {}), ...(userId ? { userId } : {}) },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json(logs);
}
