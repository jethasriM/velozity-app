export type Role = "ADMIN" | "PM" | "DEVELOPER";
export type TaskStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
export type Priority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface Client {
  id: string;
  name: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  clientId: string;
  client?: Client;
  pmId: string;
  pm?: { id: string; name: string };
  _count?: { tasks: number };
}

export interface Task {
  id: string;
  number: number;
  projectId: string;
  project?: { id: string; name: string; pmId: string };
  title: string;
  description?: string | null;
  assignedToId?: string | null;
  assignedTo?: { id: string; name: string; email?: string } | null;
  status: TaskStatus;
  priority: Priority;
  dueDate?: string | null;
  isOverdue: boolean;
  createdAt: string;
}

export interface ActivityEvent {
  id: string;
  taskId: string;
  taskNumber: number;
  taskTitle: string;
  projectId: string;
  projectName: string;
  actorId: string;
  actorName: string;
  fromStatus: TaskStatus | null;
  toStatus: TaskStatus;
  createdAt: string;
  message?: string;
  pmId?: string;
  assignedToId?: string | null;
}

export type NotificationType = "TASK_ASSIGNED" | "TASK_MOVED_TO_REVIEW" | "TASK_OVERDUE";

export interface AppNotification {
  id: string;
  type: NotificationType;
  message: string;
  taskId?: string | null;
  isRead: boolean;
  createdAt: string;
}
