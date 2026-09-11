import { Router, Request, Response } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { asyncHandler } from "../middleware/errorHandler";
import { getFeed } from "../services/activity.service";

const router = Router();
router.use(authenticate);

const querySchema = z.object({
  projectId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  before: z.coerce.date().optional(),
});

// GET /api/activity?projectId=...&before=...&limit=20
// `before` lets a client that was offline page backward through everything
// it missed, always sourced from the database.
router.get(
  "/",
  validate({ query: querySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { projectId, limit, before } = req.query as any;
    const feed = await getFeed(req.user!, { projectId, limit, before });
    res.json({ feed });
  })
);

export default router;
