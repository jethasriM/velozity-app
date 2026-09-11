import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import { validate } from "../middleware/validate";
import {
  createTaskHandler,
  createTaskSchema,
  listTasksHandler,
  listTasksQuerySchema,
  updateStatusSchema,
  updateTaskStatusHandler,
} from "../controllers/task.controller";

const router = Router();

router.use(authenticate);

// Scoping (which tasks are visible) is enforced inside the service layer
// based on req.user — not by role gating here — because all three roles
// are allowed to list tasks, just different subsets of them.
router.get("/", validate({ query: listTasksQuerySchema }), listTasksHandler);

router.post(
  "/project/:projectId",
  authorize("ADMIN", "PM"),
  validate({ body: createTaskSchema }),
  createTaskHandler
);

router.patch("/:id/status", validate({ body: updateStatusSchema }), updateTaskStatusHandler);

export default router;
