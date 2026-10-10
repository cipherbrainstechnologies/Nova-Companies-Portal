import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/server/api-helpers";
import { acceptClientInvitation } from "@/server/client/invitation-service";

const schema = z.object({
  token: z.string().min(16),
  password: z.string().min(10),
  displayName: z.string().min(2),
  phone: z.string().min(10),
});

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json());
    const result = await acceptClientInvitation({
      ...body,
      ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
      userAgent: req.headers.get("user-agent") ?? undefined,
    });
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error);
  }
}
