import cron from "node-cron";
import { prisma } from "../config/prisma";
import { createNotification } from "../services/notification.service";
import { emitNotificationToUser } from "../sockets/index";

// Marks tasks whose due date has passed (and are not already Done) as
// overdue. This runs on a fixed schedule server-side — the flag is a
// persisted column (`isOverdue`), not something computed ad hoc when a
// client happens to load a page, so it stays accurate even if nobody is
// viewing the app.
export async function sweepOverdueTasks() {
  const now = new Date();

  const newlyOverdue = await prisma.task.findMany({
    where: {
      dueDate: { lt: now },
      status: { not: "DONE" },
      isOverdue: false,
    },
    select: { id: true, title: true, number: true, assignedToId: true },
  });

  if (newlyOverdue.length === 0) return { flagged: 0 };

  await prisma.task.updateMany({
    where: { id: { in: newlyOverdue.map((t) => t.id) } },
    data: { isOverdue: true },
  });

  for (const task of newlyOverdue) {
    if (!task.assignedToId) continue;
    const notification = await createNotification({
      userId: task.assignedToId,
      type: "TASK_OVERDUE",
      message: `Task #${task.number} "${task.title}" is now overdue`,
      taskId: task.id,
    });
    emitNotificationToUser(task.assignedToId, notification);
  }

  console.log(`[overdue-job] flagged ${newlyOverdue.length} task(s) as overdue`);
  return { flagged: newlyOverdue.length };
}

// Runs every 5 minutes. node-cron is used over a Bull queue here because
// this job is a single lightweight, idempotent DB sweep with no need for
// distributed workers, retries with backoff, or job payloads — Bull's
// Redis-backed queue would be operational overhead this task doesn't need.
// If the app later needs durable multi-worker job processing (e.g. sending
// bulk emails, retryable webhooks), Bull would be the better fit.
export function startOverdueJob() {
  cron.schedule("*/5 * * * *", () => {
    sweepOverdueTasks().catch((err) => console.error("[overdue-job] failed:", err));
  });
  // Run once at boot too, so overdue state is correct immediately on startup.
  sweepOverdueTasks().catch((err) => console.error("[overdue-job] initial run failed:", err));
}
