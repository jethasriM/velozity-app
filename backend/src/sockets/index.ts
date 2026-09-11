import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { Role, TaskStatus } from "@prisma/client";
import { env } from "../config/env";
import { verifyAccessToken } from "../utils/jwt";
import { prisma } from "../config/prisma";

let io: Server;

// userId -> set of connected socket ids (a user can have multiple tabs/devices open)
const onlineUsers = new Map<string, Set<string>>();

interface SocketUser {
  id: string;
  role: Role;
}

declare module "socket.io" {
  interface Socket {
    user?: SocketUser;
  }
}

export function initSockets(httpServer: HttpServer) {
  io = new Server(httpServer, {
    cors: { origin: env.clientOrigin, credentials: true },
  });

  // Every socket connection must present the same short-lived access token
  // used for REST calls. This is verified before any room joins are
  // permitted, so a socket can never see more than the token's role allows.
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error("Missing access token"));
    try {
      const payload = verifyAccessToken(token);
      socket.user = { id: payload.sub, role: payload.role };
      next();
    } catch {
      next(new Error("Invalid or expired access token"));
    }
  });

  io.on("connection", (socket: Socket) => handleConnection(socket));

  return io;
}

async function handleConnection(socket: Socket) {
  const user = socket.user!;

  // Personal room for notification badge updates.
  socket.join(`user:${user.id}`);

  if (user.role === "ADMIN") {
    socket.join("admin-feed");
  } else if (user.role === "PM") {
    socket.join(`pm-feed:${user.id}`);
  } else if (user.role === "DEVELOPER") {
    socket.join(`dev-feed:${user.id}`);
  }

  trackOnline(user.id, socket.id);
  broadcastPresenceCount();

  // A client joins a project room only while actively viewing that
  // project's page. Server re-validates access on every join — a
  // Developer cannot join a project room for a project they have no
  // task in, and a PM cannot join another PM's project room, regardless
  // of what the client requests.
  socket.on("project:join", async (projectId: string, ack?: (ok: boolean) => void) => {
    const allowed = await userCanAccessProject(user, projectId);
    if (!allowed) return ack?.(false);
    socket.join(`project:${projectId}`);
    ack?.(true);
  });

  socket.on("project:leave", (projectId: string) => {
    socket.leave(`project:${projectId}`);
  });

  socket.on("disconnect", () => {
    untrackOnline(user.id, socket.id);
    broadcastPresenceCount();
  });
}

async function userCanAccessProject(user: SocketUser, projectId: string): Promise<boolean> {
  if (user.role === "ADMIN") return true;
  if (user.role === "PM") {
    const project = await prisma.project.findFirst({ where: { id: projectId, pmId: user.id } });
    return !!project;
  }
  // Developer: allowed only if they have at least one task in this project.
  const task = await prisma.task.findFirst({ where: { projectId, assignedToId: user.id } });
  return !!task;
}

function trackOnline(userId: string, socketId: string) {
  if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
  onlineUsers.get(userId)!.add(socketId);
}

function untrackOnline(userId: string, socketId: string) {
  const set = onlineUsers.get(userId);
  if (!set) return;
  set.delete(socketId);
  if (set.size === 0) onlineUsers.delete(userId);
}

function broadcastPresenceCount() {
  io.to("admin-feed").emit("presence:count", onlineUsers.size);
}

export interface ActivityBroadcastPayload {
  id: string;
  taskId: string;
  taskTitle: string;
  taskNumber: number;
  projectId: string;
  projectName: string;
  actorId: string;
  actorName: string;
  fromStatus: TaskStatus | null;
  toStatus: TaskStatus;
  createdAt: string;
  pmId: string;
  assignedToId: string | null;
}

// Called by the task service right after an activity log row is committed
// to the database. Fans the event out to every room that should see it:
// the project page itself, the admin global feed, the owning PM's feed,
// and (if applicable) the assigned developer's feed.
export function broadcastActivity(payload: ActivityBroadcastPayload) {
  io.to(`project:${payload.projectId}`).emit("activity:new", payload);
  io.to("admin-feed").emit("activity:new", payload);
  io.to(`pm-feed:${payload.pmId}`).emit("activity:new", payload);
  if (payload.assignedToId) {
    io.to(`dev-feed:${payload.assignedToId}`).emit("activity:new", payload);
  }
}

export function emitNotificationToUser(userId: string, notification: unknown) {
  io.to(`user:${userId}`).emit("notification:new", notification);
}

export function getOnlineCount() {
  return onlineUsers.size;
}
