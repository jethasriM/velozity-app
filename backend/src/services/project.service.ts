import { prisma } from "../config/prisma";
import { ApiError } from "../utils/ApiError";
import { AuthUser } from "../middleware/auth";

export async function createProject(actor: AuthUser, data: { name: string; description?: string; clientId: string; pmId?: string }) {
  // Admin can assign any PM to a project; a PM creating a project is
  // always assigned as its own PM (cannot hand a project to someone else).
  const pmId = actor.role === "ADMIN" ? data.pmId ?? actor.id : actor.id;

  if (actor.role === "PM" && data.pmId && data.pmId !== actor.id) {
    throw ApiError.forbidden("Project Managers can only create projects for themselves");
  }

  return prisma.project.create({
    data: {
      name: data.name,
      description: data.description,
      clientId: data.clientId,
      pmId,
    },
    include: { client: true, pm: { select: { id: true, name: true, email: true } } },
  });
}

// Returns the project list scoped to what the requester is allowed to see:
// Admin -> all projects. PM -> only projects they created. Developers do
// not list projects directly; they see project context only through their
// assigned tasks.
export async function listProjects(actor: AuthUser) {
  if (actor.role === "ADMIN") {
    return prisma.project.findMany({
      include: { client: true, pm: { select: { id: true, name: true } }, _count: { select: { tasks: true } } },
      orderBy: { createdAt: "desc" },
    });
  }
  if (actor.role === "PM") {
    return prisma.project.findMany({
      where: { pmId: actor.id },
      include: { client: true, pm: { select: { id: true, name: true } }, _count: { select: { tasks: true } } },
      orderBy: { createdAt: "desc" },
    });
  }
  throw ApiError.forbidden("Developers cannot list all projects");
}

// Fetches a single project AFTER verifying the requester has rights to it.
// This function is the enforcement point that prevents a Developer or a
// non-owning PM from reading project data even with a syntactically valid
// token — access is checked against the database, not inferred from the
// token's role alone.
export async function getProjectOrThrow(actor: AuthUser, projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { client: true, pm: { select: { id: true, name: true, email: true } } },
  });
  if (!project) throw ApiError.notFound("Project not found");

  if (actor.role === "ADMIN") return project;
  if (actor.role === "PM") {
    if (project.pmId !== actor.id) throw ApiError.forbidden("You do not manage this project");
    return project;
  }
  // Developer: allowed only if they have a task in this project.
  const hasTask = await prisma.task.findFirst({ where: { projectId, assignedToId: actor.id } });
  if (!hasTask) throw ApiError.forbidden("You have no tasks in this project");
  return project;
}
