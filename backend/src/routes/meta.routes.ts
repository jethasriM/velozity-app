import { Router, Request, Response } from "express";
import { authenticate, authorize } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { prisma } from "../config/prisma";

const router = Router();
router.use(authenticate);

router.get(
  "/clients",
  authorize("ADMIN", "PM"),
  asyncHandler(async (_req: Request, res: Response) => {
    const clients = await prisma.client.findMany({ orderBy: { name: "asc" } });
    res.json({ clients });
  })
);

// Developers list for assignment dropdowns. PMs need this to assign tasks;
// only basic identity fields are exposed, never password hashes or role
// data beyond what's needed to render a picker.
router.get(
  "/developers",
  authorize("ADMIN", "PM"),
  asyncHandler(async (_req: Request, res: Response) => {
    const developers = await prisma.user.findMany({
      where: { role: "DEVELOPER" },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    });
    res.json({ developers });
  })
);

router.get(
  "/project-managers",
  authorize("ADMIN"),
  asyncHandler(async (_req: Request, res: Response) => {
    const pms = await prisma.user.findMany({
      where: { role: "PM" },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    });
    res.json({ pms });
  })
);

export default router;
