import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { AuthError, AuthzError, requirePermission, type SessionUser } from "@/server/rbac/permissions";

export async function authorize(user: SessionUser, companyId: string, module: Parameters<typeof requirePermission>[0]["module"], action: Parameters<typeof requirePermission>[0]["action"]) {
  if (!companyId) throw new AuthzError("Company scope is required");
  await requirePermission({ user, companyId, module, action });
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
