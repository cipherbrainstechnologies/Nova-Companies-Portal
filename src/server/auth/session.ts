import { cookies } from "next/headers";
import { prisma } from "@/server/db";
import { generateSessionToken, hashToken } from "@/server/auth/crypto";
import type { SessionUser } from "@/server/rbac/permissions";
import { AuthError } from "@/server/rbac/permissions";

const COOKIE_NAME = "nova_session";
const SESSION_DAYS = 14;

export async function createSession(input: {
  userId: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<string> {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await prisma.session.create({
    data: {
      userId: input.userId,
      tokenHash: hashToken(token),
      expiresAt,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    },
  });
  return token;
}

export async function setSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export async function revokeSessionByToken(token: string) {
  await prisma.session.updateMany({
    where: { tokenHash: hashToken(token), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllUserSessions(userId: string) {
  await prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });

  if (!session || session.revokedAt || session.expiresAt < new Date()) {
    return null;
  }

  const u = session.user;
  if (!u.isActive) return null;

  return {
    id: u.id,
    phone: u.phone,
    email: u.email,
    globalRole: u.globalRole,
    mustChangePassword: u.mustChangePassword,
    employeeId: u.employeeId,
    isActive: u.isActive,
  };
}

export async function requireSessionUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new AuthError();
  return user;
}

export { COOKIE_NAME };
