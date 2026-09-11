import { Request, Response } from "express";
import { z } from "zod";
import { asyncHandler } from "../middleware/errorHandler";
import { login, refreshAccessToken } from "../services/auth.service";
import { env } from "../config/env";
import { prisma } from "../config/prisma";
import { ApiError } from "../utils/ApiError";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const REFRESH_COOKIE_NAME = "refresh_token";

function setRefreshCookie(res: Response, token: string) {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true, // not readable by client-side JS — mitigates XSS token theft
    secure: env.cookieSecure, // true in production (HTTPS only) — required for SameSite=None
    // "None" is required when the frontend (e.g. *.vercel.app) and backend
    // (e.g. *.up.railway.app) are on different domains, since the browser
    // treats that as a cross-site request. Falls back to "lax" for local
    // dev over plain http, where Secure cookies aren't sent at all.
    sameSite: env.cookieSecure ? "none" : "lax",
    path: "/api/auth", // scoped narrowly to auth endpoints
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export const loginHandler = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const { accessToken, refreshToken, user } = await login(email, password);
  setRefreshCookie(res, refreshToken);
  res.json({ accessToken, user });
});

export const refreshHandler = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies?.[REFRESH_COOKIE_NAME];
  const { accessToken, user } = await refreshAccessToken(token);
  res.json({ accessToken, user });
});

export const logoutHandler = asyncHandler(async (_req: Request, res: Response) => {
  res.clearCookie(REFRESH_COOKIE_NAME, { path: "/api/auth" });
  res.json({ success: true });
});

export const meHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { id: true, name: true, email: true, role: true },
  });
  if (!user) throw ApiError.notFound("User not found");
  res.json({ user });
});
