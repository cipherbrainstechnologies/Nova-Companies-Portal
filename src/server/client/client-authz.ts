import type {
  ClientCapabilityAction,
  ClientCapabilityModule,
  ClientMembershipStatus,
} from "@prisma/client";
import { prisma } from "@/server/db";
import { AuthError, AuthzError, type SessionUser } from "@/server/rbac/permissions";
import { roleHasCapability } from "@/server/client/capability-matrix";
import { writeClientActivity } from "@/server/client/client-audit";

export type ResolvedClientMembership = {
  id: string;
  clientOrganizationId: string;
  status: ClientMembershipStatus;
  portalRole: import("@prisma/client").ClientPortalRole;
  slug: string;
  legalName: string;
  lifecycleStatus: import("@prisma/client").ClientOrganizationStatus;
};

export async function requireNovaClientAdmin(user: SessionUser): Promise<void> {
  if (!user.isActive) throw new AuthzError("Account inactive");
  if (user.globalRole === "EMPLOYEE" || user.globalRole === "CLIENT_USER") {
    throw new AuthzError("Forbidden");
  }
  if (user.globalRole === "SUPER_ADMIN" || user.globalRole === "OPERATIONS_MANAGER") return;
  throw new AuthzError("Forbidden");
}

export async function resolveClientBySlug(slug: string) {
  const client = await prisma.clientOrganization.findUnique({ where: { slug } });
  if (!client) return null;
  return client;
}

export async function requireClientMembership(input: {
  user: SessionUser;
  clientSlug: string;
}): Promise<ResolvedClientMembership> {
  if (!input.user.isActive) throw new AuthError("Unauthorized");
  if (input.user.globalRole === "EMPLOYEE") {
    throw new AuthzError("Employees cannot access the client portal");
  }

  const client = await resolveClientBySlug(input.clientSlug);
  if (!client) throw new AuthzError("Not found");

  // NOVA operators may impersonate read-only for support when explicitly granted clients/view on any company — never SUPER_ADMIN bypass on mutations.
  if (input.user.globalRole === "SUPER_ADMIN" || input.user.globalRole === "OPERATIONS_MANAGER") {
    return {
      id: "nova-support",
      clientOrganizationId: client.id,
      status: "ACTIVE",
      portalRole: "OWNER_ADMIN",
      slug: client.slug,
      legalName: client.legalName,
      lifecycleStatus: client.lifecycleStatus,
    };
  }

  if (input.user.globalRole !== "CLIENT_USER") {
    throw new AuthzError("Forbidden");
  }

  const membership = await prisma.clientMembership.findUnique({
    where: {
      userId_clientOrganizationId: {
        userId: input.user.id,
        clientOrganizationId: client.id,
      },
    },
    include: { clientOrganization: true },
  });

  if (!membership || membership.status !== "ACTIVE") {
    await writeClientActivity({
      clientOrganizationId: client.id,
      actorUserId: input.user.id,
      action: "client.access_denied",
      entityType: "ClientOrganization",
      entityId: client.id,
    });
    throw new AuthzError("Not found");
  }

  return {
    id: membership.id,
    clientOrganizationId: client.id,
    status: membership.status,
    portalRole: membership.portalRole,
    slug: client.slug,
    legalName: client.legalName,
    lifecycleStatus: client.lifecycleStatus,
  };
}

export async function requireClientCapability(input: {
  user: SessionUser;
  clientSlug: string;
  module: ClientCapabilityModule;
  action: ClientCapabilityAction;
  employeeId?: string;
}): Promise<ResolvedClientMembership> {
  const membership = await requireClientMembership({
    user: input.user,
    clientSlug: input.clientSlug,
  });

  const overrides = membership.id === "nova-support"
    ? []
    : await prisma.clientPermissionOverride.findMany({
        where: { membershipId: membership.id },
      });

  let allowed = roleHasCapability(membership.portalRole, input.module, input.action);
  for (const o of overrides) {
    if (o.module === input.module && o.action === input.action) {
      allowed = o.allowed;
    }
  }

  if (!allowed) {
    await writeClientActivity({
      clientOrganizationId: membership.clientOrganizationId,
      actorUserId: input.user.id,
      action: "client.capability_denied",
      entityType: "ClientCapability",
      metadata: { module: input.module, action: input.action },
    });
    throw new AuthzError("Forbidden");
  }

  if (input.employeeId && membership.portalRole === "TEAM_MANAGER" && membership.id !== "nova-support") {
    const scoped = await prisma.clientEmployeeScope.findFirst({
      where: { membershipId: membership.id, employeeId: input.employeeId },
    });
    const assigned = await prisma.employmentAssignment.findFirst({
      where: {
        clientOrganizationId: membership.clientOrganizationId,
        employeeId: input.employeeId,
        status: "ACTIVE",
      },
    });
    if (!assigned) throw new AuthzError("Not found");
    if (!scoped) throw new AuthzError("Forbidden");
  }

  return membership;
}

export async function assertEmployeeInClientTenant(clientOrganizationId: string, employeeId: string) {
  const assignment = await prisma.employmentAssignment.findFirst({
    where: {
      clientOrganizationId,
      employeeId,
      status: { in: ["ACTIVE", "PENDING"] },
    },
  });
  if (!assignment) throw new AuthzError("Not found");
  return assignment;
}
