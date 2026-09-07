import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { AuthError, AuthzError, requirePermission, type SessionUser } from "@/server/rbac/permissions";

export async function authorize(user: SessionUser, companyId: string, module: Parameters<typeof requirePermission>[0]["module"], action: Parameters<typeof requirePermission>[0]["action"]) {
  if (!companyId) throw new AuthzError("Company scope is required");
  await requirePermission({ user, companyId, module, action });
}

type ModuleAction = [
  Parameters<typeof requirePermission>[0]["module"],
  Parameters<typeof requirePermission>[0]["action"],
];

/**
 * Grants access when any one of the listed module/action pairs is held. Used where a
 * dedicated permission (e.g. `salaryStructure/edit`) falls back to a broader one that
 * existing operators already have (`employees/edit`).
 */
export async function authorizeAny(
  user: SessionUser,
  companyId: string,
  candidates: ModuleAction[],
) {
  if (!companyId) throw new AuthzError("Company scope is required");
  let lastError: unknown;
  for (const [module, action] of candidates) {
    try {
      await requirePermission({ user, companyId, module, action });
      return;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new AuthzError("Missing permission");
}

export function apiError(error: unknown) {
  if (error instanceof AuthError || error instanceof AuthzError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof ZodError) {
    return NextResponse.json({ error: "Invalid request", details: error.flatten() }, { status: 400 });
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
    return NextResponse.json({ error: "Resource not found" }, { status: 404 });
  }
  return NextResponse.json({ error: error instanceof Error ? error.message : "Request failed" }, { status: 400 });
}
