import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  requestPasswordResetOtp,
  resetPasswordWithOtp,
  LoginError,
} from "@/server/auth/login";

const requestSchema = z.object({
  phone: z.string().min(10),
  emailTarget: z.enum(["personal", "official"]),
});

const resetSchema = z.object({
  phone: z.string().min(10),
  code: z.string().length(6),
  newPassword: z.string().min(10),
});

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("mode") ?? "request";
  try {
    if (mode === "request") {
      const body = requestSchema.parse(await req.json());
      await requestPasswordResetOtp({
        phone: body.phone,
        emailTarget: body.emailTarget,
        ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
      });
      return NextResponse.json({ ok: true });
    }
    const body = resetSchema.parse(await req.json());
    await resetPasswordWithOtp({
      phone: body.phone,
      code: body.code,
      newPassword: body.newPassword,
      ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof LoginError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Request failed" }, { status: 400 });
  }
}
