import { prisma } from "@/server/db";
import { writeAudit } from "@/server/audit";
import { normalizeIndianPhone } from "@/server/auth/phone";
import {
  generateOtpCode,
  hashOtp,
  hashPassword,
  safeEqualHex,
  verifyPassword,
} from "@/server/auth/crypto";
import {
  createSession,
  revokeAllUserSessions,
  setSessionCookie,
} from "@/server/auth/session";
import { sendEmail } from "@/server/email";

const MAX_FAILED = 5;
const LOCK_MINUTES = 15;
const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_RATE_WINDOW_MS = 15 * 60 * 1000;
const OTP_RATE_MAX = 5;

export class LoginError extends Error {
  status = 401;
  constructor(message: string) {
    super(message);
    this.name = "LoginError";
  }
}

export async function loginWithPhonePassword(input: {
  phone: string;
  password: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const phone = normalizeIndianPhone(input.phone);
  const user = await prisma.user.findUnique({
    where: { phone },
    include: { employee: true },
  });

  if (!user || !user.isActive) {
    throw new LoginError("Invalid credentials");
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw new LoginError("Account temporarily locked");
  }

  if (user.employee && (user.employee.status === "BLOCKED" || user.employee.status === "EXITED")) {
    await revokeAllUserSessions(user.id);
    await writeAudit({
      actorUserId: user.id,
      action: "auth.login_denied_status",
      entityType: "User",
      entityId: user.id,
      metadata: { status: user.employee.status },
      ipAddress: input.ipAddress,
    });
    throw new LoginError("Account not permitted to sign in");
  }

  const ok = await verifyPassword(input.password, user.passwordHash);
  if (!ok) {
    const failed = user.failedLoginAttempts + 1;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: failed,
        lockedUntil: failed >= MAX_FAILED ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null,
      },
    });
    await writeAudit({
      actorUserId: user.id,
      action: "auth.login_failed",
      entityType: "User",
      entityId: user.id,
      ipAddress: input.ipAddress,
    });
    throw new LoginError("Invalid credentials");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginAttempts: 0, lockedUntil: null },
  });

  const token = await createSession({
    userId: user.id,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });
  await setSessionCookie(token);

  await writeAudit({
    actorUserId: user.id,
    action: "auth.login",
    entityType: "User",
    entityId: user.id,
    ipAddress: input.ipAddress,
  });

  return {
    mustChangePassword: user.mustChangePassword,
    globalRole: user.globalRole,
  };
}

export async function changePassword(input: {
  userId: string;
  currentPassword: string;
  newPassword: string;
}) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: input.userId } });
  const ok = await verifyPassword(input.currentPassword, user.passwordHash);
  if (!ok) throw new LoginError("Current password incorrect");
  if (input.newPassword.length < 10) throw new LoginError("Password too short");

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(input.newPassword),
      mustChangePassword: false,
    },
  });

  await writeAudit({
    actorUserId: user.id,
    action: "auth.password_changed",
    entityType: "User",
    entityId: user.id,
  });
}

export async function requestPasswordResetOtp(input: {
  phone: string;
  emailTarget: "personal" | "official";
  ipAddress?: string;
}) {
  const phone = normalizeIndianPhone(input.phone);
  const user = await prisma.user.findUnique({
    where: { phone },
    include: { employee: { include: { contact: true } } },
  });

  // Always return generic success to avoid account enumeration
  if (!user?.employee?.contact) {
    return { ok: true };
  }

  const recent = await prisma.passwordResetOtp.count({
    where: {
      userId: user.id,
      createdAt: { gte: new Date(Date.now() - OTP_RATE_WINDOW_MS) },
    },
  });
  if (recent >= OTP_RATE_MAX) {
    throw new LoginError("Too many OTP requests");
  }

  const email =
    input.emailTarget === "personal"
      ? user.employee.contact.personalEmail
      : user.employee.contact.officialEmail;

  if (!email) throw new LoginError("Selected email is not available");

  const code = generateOtpCode();
  await prisma.passwordResetOtp.create({
    data: {
      userId: user.id,
      emailTarget: email,
      codeHash: hashOtp(code),
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    },
  });

  await sendEmail({
    to: email,
    subject: "Nova Portal password reset code",
    text: `Your one-time code is ${code}. It expires in 10 minutes. If you did not request this, ignore this email.`,
  });

  await writeAudit({
    actorUserId: user.id,
    action: "auth.otp_sent",
    entityType: "User",
    entityId: user.id,
    metadata: { emailTarget: input.emailTarget },
    ipAddress: input.ipAddress,
  });

  return { ok: true };
}

export async function resetPasswordWithOtp(input: {
  phone: string;
  code: string;
  newPassword: string;
  ipAddress?: string;
}) {
  const phone = normalizeIndianPhone(input.phone);
  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user) throw new LoginError("Invalid reset request");

  const otp = await prisma.passwordResetOtp.findFirst({
    where: {
      userId: user.id,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!otp || !safeEqualHex(otp.codeHash, hashOtp(input.code))) {
    await writeAudit({
      actorUserId: user.id,
      action: "auth.otp_failed",
      entityType: "User",
      entityId: user.id,
      ipAddress: input.ipAddress,
    });
    throw new LoginError("Invalid or expired OTP");
  }

  if (input.newPassword.length < 10) throw new LoginError("Password too short");

  await prisma.$transaction([
    prisma.passwordResetOtp.update({
      where: { id: otp.id },
      data: { usedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await hashPassword(input.newPassword),
        mustChangePassword: false,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    }),
  ]);

  await revokeAllUserSessions(user.id);
  await writeAudit({
    actorUserId: user.id,
    action: "auth.password_reset",
    entityType: "User",
    entityId: user.id,
    ipAddress: input.ipAddress,
  });

  return { ok: true };
}

export async function adminSetTemporaryPassword(input: {
  actorUserId: string;
  targetUserId: string;
  temporaryPassword: string;
}) {
  await prisma.user.update({
    where: { id: input.targetUserId },
    data: {
      passwordHash: await hashPassword(input.temporaryPassword),
      mustChangePassword: true,
    },
  });
  await revokeAllUserSessions(input.targetUserId);
  await writeAudit({
    actorUserId: input.actorUserId,
    action: "auth.admin_set_password",
    entityType: "User",
    entityId: input.targetUserId,
  });
}
