import { prisma } from "./prisma";

interface CreateNotificationParams {
  userId: string;
  title: string;
  message: string;
  type:
    | "task_assigned"
    | "task_updated"
    | "timesheet_submitted"
    | "timesheet_approved"
    | "timesheet_rejected"
    | "project_assigned";
}

/**
 * B and C never call this directly — it fires automatically inside your
 * task/timesheet API handlers (e.g. after a manager assigns a task, or
 * approves/rejects a timesheet). That's what lets B/C build real features
 * without writing any backend logic themselves.
 */
export async function createNotification(params: CreateNotificationParams) {
  await prisma.notification.create({
    data: {
      userId: params.userId,
      title: params.title,
      message: params.message,
      type: params.type,
    },
  });
}
