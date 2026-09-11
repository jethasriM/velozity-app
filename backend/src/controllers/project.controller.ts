import { Request, Response } from "express";
import { z } from "zod";
import { asyncHandler } from "../middleware/errorHandler";
import * as projectService from "../services/project.service";

export const createProjectSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  clientId: z.string().uuid(),
  pmId: z.string().uuid().optional(),
});

export const listProjectsHandler = asyncHandler(async (req: Request, res: Response) => {
  const projects = await projectService.listProjects(req.user!);
  res.json({ projects });
});

export const createProjectHandler = asyncHandler(async (req: Request, res: Response) => {
  const project = await projectService.createProject(req.user!, req.body);
  res.status(201).json({ project });
});

export const getProjectHandler = asyncHandler(async (req: Request, res: Response) => {
  const project = await projectService.getProjectOrThrow(req.user!, req.params.id);
  res.json({ project });
});
