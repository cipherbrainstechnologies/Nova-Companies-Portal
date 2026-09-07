import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { loginWithCredentials, LoginError } from "@/server/auth/login";

const schema = z.object({
  portal: z.enum(["admin", "employee"]),
  identifier: z.string().min(3),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json());
    const result = await loginWithCredentials({
      portal: body.portal,
      identifier: body.identifier,
      password: body.password,
      ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
      userAgent: req.headers.get("user-agent") ?? undefined,
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof LoginError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    return NextResponse.json({ error: "Unable to sign in" }, { status: 500 });
  }
}
