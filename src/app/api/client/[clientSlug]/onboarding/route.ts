import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/server/api-helpers";
import { requireSessionUser } from "@/server/auth/session";
import { requireClientCapability } from "@/server/client/client-authz";
import { assertClientPortalActor } from "@/server/client/mutation-guard";
import {
  OnboardingInputError,
  saveOnboardingProfile,
  saveProposedPlan,
  submitClientOnboarding,
} from "@/server/client/kyb-service";
import { prisma } from "@/server/db";

const profileSchema = z.object({
  action: z.literal("profile"),
  legalName: z.string().trim().min(2).max(200),
  tradeName: z.string().trim().max(200).optional(),
  countryCode: z.string().trim().length(2),
  registrationNumber: z.string().trim().max(80).optional(),
  website: z.string().trim().max(200).optional(),
  intendedEmployeeCount: z.number().int().positive().max(100_000).optional(),
  registeredAddress: z.string().trim().max(500).optional(),
  sector: z.string().trim().max(120).optional(),
  authorisedRepresentative: z.string().trim().max(200).optional(),
  primaryContact: z.string().trim().max(200).optional(),
  billingContact: z.string().trim().max(200).optional(),
  commencementDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

const planSchema = z.object({
  action: z.literal("plan"),
  planId: z.enum(["essential", "managed", "enterprise"]),
});

const submitSchema = z.object({ action: z.literal("submit") });

const bodySchema = z.discriminatedUnion("action", [profileSchema, planSchema, submitSchema]);

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ clientSlug: string }> },
) {
  try {
    const { clientSlug } = await ctx.params;
    const user = await requireSessionUser();
    const membership = await requireClientCapability({
      user,
      clientSlug,
      module: "onboarding",
      action: "VIEW",
    });
    const caseRow = await prisma.clientOnboardingCase.findFirst({
      where: { clientOrganizationId: membership.clientOrganizationId },
      orderBy: { createdAt: "desc" },
      include: { kybDocuments: true, complianceReviews: { orderBy: { createdAt: "desc" }, take: 5 } },
    });
    const client = await prisma.clientOrganization.findUniqueOrThrow({
      where: { id: membership.clientOrganizationId },
    });
    return NextResponse.json({ client, case: caseRow });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ clientSlug: string }> },
) {
  try {
    const { clientSlug } = await ctx.params;
    const user = await requireSessionUser();
    const membership = await requireClientCapability({
      user,
      clientSlug,
      module: "onboarding",
      action: "SUBMIT",
    });
    assertClientPortalActor(membership);
    const body = bodySchema.parse(await req.json());

    if (body.action === "profile") {
      await requireClientCapability({
        user,
        clientSlug,
        module: "onboarding",
        action: "EDIT",
      });
      await saveOnboardingProfile({
        clientOrganizationId: membership.clientOrganizationId,
        actorUserId: user.id,
        legalName: body.legalName,
        tradeName: body.tradeName,
        countryCode: body.countryCode,
        registrationNumber: body.registrationNumber,
        website: body.website,
        intendedEmployeeCount: body.intendedEmployeeCount,
        profile: {
          registeredAddress: body.registeredAddress,
          sector: body.sector,
          authorisedRepresentative: body.authorisedRepresentative,
          primaryContact: body.primaryContact,
          billingContact: body.billingContact,
          commencementDate: body.commencementDate,
        },
      });
      return NextResponse.json({ ok: true });
    }

    if (body.action === "plan") {
      const saved = await saveProposedPlan({
        clientOrganizationId: membership.clientOrganizationId,
        actorUserId: user.id,
        planId: body.planId,
      });
      return NextResponse.json(saved);
    }

    const result = await submitClientOnboarding({
      clientOrganizationId: membership.clientOrganizationId,
      actorUserId: user.id,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof OnboardingInputError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return apiError(error);
  }
}
