import bcrypt from "bcrypt";
import { prisma } from "../config/prisma";
import { ApiError } from "../utils/ApiError";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt";

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw ApiError.unauthorized("Invalid email or password");

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw ApiError.unauthorized("Invalid email or password");

  const accessToken = signAccessToken({ sub: user.id, role: user.role });
  const refreshToken = signRefreshToken({ sub: user.id });

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  };
}

export async function refreshAccessToken(refreshToken: string | undefined) {
  if (!refreshToken) throw ApiError.unauthorized("Missing refresh token");

  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw ApiError.unauthorized("Invalid or expired refresh token");
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) throw ApiError.unauthorized("User no longer exists");

  const accessToken = signAccessToken({ sub: user.id, role: user.role });
  return { accessToken, user: { id: user.id, name: user.name, email: user.email, role: user.role } };
}
