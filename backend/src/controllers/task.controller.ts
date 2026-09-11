import { Request, Response } from "express";
import { z } from "zod";
import { asyncHandler } from "../middleware/errorHandler";
import * as taskService from "../services/task.service";

const statusEnum = z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]);
const priorityEnum = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);

// Filters arrive as query params so views are shareable/bookmarkable URLs,
// e.g. GET /api/tasks?status=IN_PROGRESS&priority=HIGH&dueBefore=2026-09-30
export const listTasksQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
  status: statusEnum.optional(),
  priority: priorityEnum.optional(),
  dueBefore: z.coerce.date().optional(),
  dueAfter: z.coerce.date().optional(),
});

export const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(4000).optional(),
  assignedToId: z.string().uuid().optional(),
  priority: priorityEnum.optional(),
  dueDate: z.coerce.date().optional(),
});

export const updateStatusSchema = z.object({
  status: statusEnum,
});

export const listTasksHandler = asyncHandler(async (req: Request, res: Response) => {
  const { projectId, status, priority, dueBefore, dueAfter } = req.query as any;
  const tasks = await taskService.listTasks(req.user!, { status, priority, dueBefore, dueAfter }, projectId);
  res.json({ tasks });
});

export const createTaskHandler = asyncHandler(async (req: Request, res: Response) => {
  const task = await taskService.createTask(req.user!, req.params.projectId, req.body);
  res.status(201).json({ task });
});

export const updateTaskStatusHandler = asyncHandler(async (req: Request, res: Response) => {
  const task = await taskService.updateTaskStatus(req.user!, req.params.id, req.body.status);
  res.json({ task });
});
