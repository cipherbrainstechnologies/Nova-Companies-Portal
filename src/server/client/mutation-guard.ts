import type { ResolvedClientMembership } from "@/server/client/client-authz";
import { AuthzError } from "@/server/rbac/permissions";

/** Client portal mutations must not use NOVA operator impersonation paths. */
export function assertClientPortalActor(membership: ResolvedClientMembership) {
  if (membership.id === "nova-support") {
    throw new AuthzError("Use admin tools for this action");
  }
}
