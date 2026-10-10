import { NextResponse } from "next/server";
import { apiError } from "@/server/api-helpers";
import { requireSessionUser } from "@/server/auth/session";
import { requireNovaClientAdmin } from "@/server/client/client-authz";
import { prisma } from "@/server/db";

export async function GET() {
  try {
    const user = await requireSessionUser();
    await requireNovaClientAdmin(user);
    const rows = await prisma.hireRequest.findMany({
      where: { status: { in: ["SUBMITTED", "NOVA_REVIEW", "MORE_INFO"] } },
      include: { clientOrganization: { select: { legalName: true, slug: true } } },
      orderBy: { submittedAt: "desc" },
      take: 100,
    });
    return NextResponse.json({ requests: rows });
  } catch (error) {
    return apiError(error);
  }
}
