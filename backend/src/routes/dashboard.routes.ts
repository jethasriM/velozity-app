import { Router, Request, Response } from "express";
import { authenticate } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import * as dashboardService from "../services/dashboard.service";
import { ApiError } from "../utils/ApiError";

const router = Router();
router.use(authenticate);

// Single endpoint that returns the correct shape for the caller's own
// role — the client never has to (and cannot) request another role's
// dashboard, since the role comes from the verified access token.
router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const user = req.user!;
    if (user.role === "ADMIN") return res.json(await dashboardService.getAdminDashboard());
    if (user.role === "PM") return res.json(await dashboardService.getPmDashboard(user));
    if (user.role === "DEVELOPER") return res.json(await dashboardService.getDeveloperDashboard(user));
    throw ApiError.forbidden();
  })
);

export default router;
