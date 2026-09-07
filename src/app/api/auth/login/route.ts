import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { loginWithPhonePassword, LoginError } from "@/server/auth/login";

const schema = z.object({
  phone: z.string().min(10),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json());
    const result = await loginWithPhonePassword({
      phone: body.phone,
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
