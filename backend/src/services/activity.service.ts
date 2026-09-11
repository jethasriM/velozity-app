import { prisma } from "../config/prisma";
import { AuthUser } from "../middleware/auth";

// Powers both the initial feed render and the "missed events while
// offline" catch-up. Always reads from the database (never an in-memory
// cache), so a user reconnecting after being offline sees a durable,
// consistent history rather than whatever happened to still be in
// process memory.
export async function getFeed(actor: AuthUser, opts: { projectId?: string; limit?: number; before?: Date } = {}) {
  const limit = opts.limit ?? 20;
  const where: any = {};

  if (opts.projectId) {
    where.projectId = opts.projectId;
  } else if (actor.role === "PM") {
    where.project = { pmId: actor.id };
  } else if (actor.role === "DEVELOPER") {
    where.task = { assignedToId: actor.id };
  }
  // Admin with no projectId: global feed, no extra filter.

  if (opts.before) {
    where.createdAt = { lt: opts.before };
  }

  const logs = await prisma.activityLog.findMany({
    where,
    include: {
      actor: { select: { id: true, name: true } },
      task: { select: { id: true, number: true, title: true } },
      project: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return logs.map((log) => ({
    id: log.id,
    taskId: log.taskId,
    taskNumber: log.task.number,
    taskTitle: log.task.title,
    projectId: log.projectId,
    projectName: log.project.name,
    actorId: log.actorId,
    actorName: log.actor.name,
    fromStatus: log.fromStatus,
    toStatus: log.toStatus,
    message: `${log.actor.name} ${log.message}`,
    createdAt: log.createdAt,
  }));
}
