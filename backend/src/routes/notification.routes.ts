import { Router, Request, Response } from "express";
import { authenticate } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import * as notificationService from "../services/notification.service";

const router = Router();
router.use(authenticate);

router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const notifications = await notificationService.listNotifications(req.user!.id);
    res.json({ notifications });
  })
);

router.get(
  "/unread-count",
  asyncHandler(async (req: Request, res: Response) => {
    const count = await notificationService.unreadCount(req.user!.id);
    res.json({ count });
  })
);

router.patch(
  "/:id/read",
  asyncHandler(async (req: Request, res: Response) => {
    const notification = await notificationService.markRead(req.user!.id, req.params.id);
    res.json({ notification });
  })
);

router.post(
  "/read-all",
  asyncHandler(async (req: Request, res: Response) => {
    const result = await notificationService.markAllRead(req.user!.id);
    res.json(result);
  })
);

export default router;
