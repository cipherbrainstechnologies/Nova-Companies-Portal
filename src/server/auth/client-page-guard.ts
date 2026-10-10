import { redirect } from "next/navigation";
import { requireSessionUser } from "@/server/auth/session";
import { requireClientMembership } from "@/server/client/client-authz";

export async function requireClientPage(clientSlug: string) {
  const user = await requireSessionUser();
  if (user.mustChangePassword) redirect("/change-password");
  const membership = await requireClientMembership({ user, clientSlug });
  return { user, membership };
}
