import { prisma } from "./prisma";

interface LogAuditParams {
  userId: string;
  module: "users" | "designations" | "projects" | "tasks" | "timesheets";
  action: "create" | "update" | "delete" | "approve" | "reject";
  recordId: string;
  previousValue?: unknown;
  newValue?: unknown;
}

/**
 * Call this at the end of every create/update/delete handler, after the
 * write succeeds. Never awaited in a way that blocks the response if it's
 * not essential — but for a student project, keeping it awaited and simple
 * is fine and easier to debug.
 */
export async function logAudit(params: LogAuditParams) {
  await prisma.auditLog.create({
    data: {
      userId: params.userId,
      module: params.module,
      action: params.action,
      recordId: params.recordId,
      previousValue: params.previousValue as never,
      newValue: params.newValue as never,
    },
  });
}
