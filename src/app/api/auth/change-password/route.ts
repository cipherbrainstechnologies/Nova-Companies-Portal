import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/server/auth/session";
import { changePassword } from "@/server/auth/login";
import { apiError } from "@/server/api-helpers";

const schema = z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(10).max(200) });

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();
    const body = schema.parse(await request.json());
    await changePassword({ userId: user.id, ...body });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
