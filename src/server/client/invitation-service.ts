import { prisma } from "@/server/db";
import { hashPassword, hashToken } from "@/server/auth/crypto";
import { createSession, setSessionCookie } from "@/server/auth/session";
import { writeClientActivity } from "@/server/client/client-audit";
import { normalizeIndianPhone } from "@/server/auth/phone";

export async function acceptClientInvitation(input: {
  token: string;
  password: string;
  displayName: string;
  phone: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const invite = await prisma.clientInvitation.findUnique({
    where: { tokenHash: hashToken(input.token) },
    include: { clientOrganization: true },
  });
  if (!invite || invite.expiresAt < new Date() || invite.acceptedAt) {
    throw new Error("Invalid or expired invitation");
  }
  if (input.password.length < 10) throw new Error("Password too short");

  const phone = normalizeIndianPhone(input.phone);
  let user = await prisma.user.findFirst({
    where: { email: { equals: invite.email, mode: "insensitive" } },
  });
  if (user) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        phone,
        displayName: input.displayName,
        passwordHash: await hashPassword(input.password),
        globalRole: "CLIENT_USER",
      },
    });
    await prisma.clientMembership.upsert({
      where: {
        userId_clientOrganizationId: {
          userId: user.id,
          clientOrganizationId: invite.clientOrganizationId,
        },
      },
      create: {
        userId: user.id,
        clientOrganizationId: invite.clientOrganizationId,
        status: "ACTIVE",
        portalRole: invite.portalRole,
        invitedAt: invite.createdAt,
        acceptedAt: new Date(),
      },
      update: {
        status: "ACTIVE",
        portalRole: invite.portalRole,
        acceptedAt: new Date(),
      },
    });
  } else {
    user = await prisma.user.create({
      data: {
        phone,
        email: invite.email,
        displayName: input.displayName,
        passwordHash: await hashPassword(input.password),
        globalRole: "CLIENT_USER",
        mustChangePassword: false,
        clientMemberships: {
          create: {
            clientOrganizationId: invite.clientOrganizationId,
            status: "ACTIVE",
            portalRole: invite.portalRole,
            invitedAt: invite.createdAt,
            acceptedAt: new Date(),
          },
        },
      },
    });
  }

  await prisma.clientInvitation.update({
    where: { id: invite.id },
    data: { acceptedAt: new Date() },
  });

  await writeClientActivity({
    clientOrganizationId: invite.clientOrganizationId,
    actorUserId: user.id,
    action: "people.invite_accepted",
    entityType: "ClientInvitation",
    entityId: invite.id,
  });

  const sessionToken = await createSession({
    userId: user.id,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });
  await setSessionCookie(sessionToken);

  return {
    clientSlug: invite.clientOrganization.slug,
    userId: user.id,
  };
}
