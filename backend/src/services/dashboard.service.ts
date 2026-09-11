import { prisma } from "../config/prisma";
import { AuthUser } from "../middleware/auth";
import { getOnlineCount } from "../sockets/index";

export async function getAdminDashboard() {
  const [totalProjects, tasksByStatus, overdueCount] = await Promise.all([
    prisma.project.count(),
    prisma.task.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.task.count({ where: { isOverdue: true } }),
  ]);

  return {
    totalProjects,
    tasksByStatus: Object.fromEntries(tasksByStatus.map((t) => [t.status, t._count._all])),
    overdueCount,
    onlineUsers: getOnlineCount(),
  };
}

export async function getPmDashboard(actor: AuthUser) {
  const oneWeekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const [projects, tasksByPriority, upcoming] = await Promise.all([
    prisma.project.findMany({
      where: { pmId: actor.id },
      include: { _count: { select: { tasks: true } } },
    }),
    prisma.task.groupBy({
      by: ["priority"],
      where: { project: { pmId: actor.id } },
      _count: { _all: true },
    }),
    prisma.task.findMany({
      where: {
        project: { pmId: actor.id },
        dueDate: { gte: new Date(), lte: oneWeekFromNow },
        status: { not: "DONE" },
      },
      include: { assignedTo: { select: { name: true } } },
      orderBy: { dueDate: "asc" },
    }),
  ]);

  return {
    projects,
    tasksByPriority: Object.fromEntries(tasksByPriority.map((t) => [t.priority, t._count._all])),
    upcomingDueDates: upcoming,
  };
}

export async function getDeveloperDashboard(actor: AuthUser) {
  const tasks = await prisma.task.findMany({
    where: { assignedToId: actor.id },
    include: { project: { select: { id: true, name: true } } },
    orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
  });
  return { tasks };
}
