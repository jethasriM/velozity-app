import { Priority, TaskStatus } from "@prisma/client";
import { prisma } from "../config/prisma";
import { ApiError } from "../utils/ApiError";
import { AuthUser } from "../middleware/auth";
import { getProjectOrThrow } from "./project.service";
import { broadcastActivity, emitNotificationToUser } from "../sockets/index";
import { createNotification } from "./notification.service";

export interface TaskFilters {
  status?: TaskStatus;
  priority?: Priority;
  dueBefore?: Date;
  dueAfter?: Date;
}

// Builds the base `where` clause for task queries strictly scoped to what
// the requesting role is permitted to see. This is applied at the
// database query level (not filtered client-side after fetching), which
// is what prevents a Developer from ever receiving another developer's
// tasks in a response, even if they tamper with query params.
function scopedWhere(actor: AuthUser, filters: TaskFilters, projectId?: string) {
  const where: any = {};
  if (projectId) where.projectId = projectId;
  if (filters.status) where.status = filters.status;
  if (filters.priority) where.priority = filters.priority;
  if (filters.dueBefore || filters.dueAfter) {
    where.dueDate = {};
    if (filters.dueBefore) where.dueDate.lte = filters.dueBefore;
    if (filters.dueAfter) where.dueDate.gte = filters.dueAfter;
  }

  if (actor.role === "DEVELOPER") {
    where.assignedToId = actor.id; // a developer can only ever see their own tasks
  } else if (actor.role === "PM") {
    where.project = { pmId: actor.id }; // a PM can only see tasks in projects they own
  }
  // Admin: no additional restriction.

  return where;
}

export async function listTasks(actor: AuthUser, filters: TaskFilters, projectId?: string) {
  if (projectId) {
    // Confirms the requester actually has rights to this project before
    // any task data is returned, regardless of role.
    await getProjectOrThrow(actor, projectId);
  }
  const where = scopedWhere(actor, filters, projectId);
  return prisma.task.findMany({
    where,
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      project: { select: { id: true, name: true, pmId: true } },
    },
    orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
  });
}

export async function createTask(
  actor: AuthUser,
  projectId: string,
  data: { title: string; description?: string; assignedToId?: string; priority?: Priority; dueDate?: Date }
) {
  const project = await getProjectOrThrow(actor, projectId);
  if (actor.role === "DEVELOPER") throw ApiError.forbidden("Developers cannot create tasks");
  if (actor.role === "PM" && project.pmId !== actor.id) {
    throw ApiError.forbidden("You do not manage this project");
  }

  const task = await prisma.task.create({
    data: {
      projectId,
      title: data.title,
      description: data.description,
      assignedToId: data.assignedToId,
      priority: data.priority ?? "MEDIUM",
      dueDate: data.dueDate,
    },
    include: { assignedTo: { select: { id: true, name: true } } },
  });

  if (data.assignedToId) {
    const notification = await createNotification({
      userId: data.assignedToId,
      type: "TASK_ASSIGNED",
      message: `You were assigned to "${task.title}"`,
      taskId: task.id,
    });
    emitNotificationToUser(data.assignedToId, notification);
  }

  return task;
}

const VALID_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  TODO: ["IN_PROGRESS"],
  IN_PROGRESS: ["IN_REVIEW", "TODO"],
  IN_REVIEW: ["DONE", "IN_PROGRESS"],
  DONE: [],
};

export async function updateTaskStatus(actor: AuthUser, taskId: string, toStatus: TaskStatus) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { project: true },
  });
  if (!task) throw ApiError.notFound("Task not found");

  // Access check mirrors scopedWhere: a developer may only move their own
  // tasks; a PM only within projects they manage; admin unrestricted.
  if (actor.role === "DEVELOPER" && task.assignedToId !== actor.id) {
    throw ApiError.forbidden("You can only update tasks assigned to you");
  }
  if (actor.role === "PM" && task.project.pmId !== actor.id) {
    throw ApiError.forbidden("You do not manage this project");
  }

  if (!VALID_TRANSITIONS[task.status].includes(toStatus)) {
    throw ApiError.badRequest(`Cannot move task from ${task.status} to ${toStatus}`);
  }

  const fromStatus = task.status;

  // Status change + activity log row are written in a single transaction
  // so the log can never drift out of sync with the task's actual state.
  const [updatedTask, activityLog] = await prisma.$transaction([
    prisma.task.update({
      where: { id: taskId },
      data: { status: toStatus, isOverdue: toStatus === "DONE" ? false : task.isOverdue },
    }),
    prisma.activityLog.create({
      data: {
        taskId,
        projectId: task.projectId,
        actorId: actor.id,
        fromStatus,
        toStatus,
        message: `moved Task #${task.number} from ${fromStatus} → ${toStatus}`,
      },
      include: { actor: { select: { id: true, name: true } } },
    }),
  ]);

  const project = await prisma.project.findUnique({ where: { id: task.projectId } });

  broadcastActivity({
    id: activityLog.id,
    taskId,
    taskTitle: task.title,
    taskNumber: task.number,
    projectId: task.projectId,
    projectName: project!.name,
    actorId: actor.id,
    actorName: activityLog.actor.name,
    fromStatus,
    toStatus,
    createdAt: activityLog.createdAt.toISOString(),
    pmId: project!.pmId,
    assignedToId: task.assignedToId,
  });

  // PM is notified whenever a task in their project moves into review.
  if (toStatus === "IN_REVIEW") {
    const notification = await createNotification({
      userId: project!.pmId,
      type: "TASK_MOVED_TO_REVIEW",
      message: `Task #${task.number} "${task.title}" was moved to In Review`,
      taskId: task.id,
    });
    emitNotificationToUser(project!.pmId, notification);
  }

  return updatedTask;
}
