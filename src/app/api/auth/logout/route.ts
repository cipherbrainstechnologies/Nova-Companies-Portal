import { NextResponse } from "next/server";
import { clearSessionCookie, getSessionUser, revokeSessionByToken } from "@/server/auth/session";
import { cookies } from "next/headers";
import { COOKIE_NAME } from "@/server/auth/session";
import { writeAudit } from "@/server/audit";

export async function POST() {
  const user = await getSessionUser();
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (token) await revokeSessionByToken(token);
  await clearSessionCookie();
  if (user) {
    await writeAudit({
      actorUserId: user.id,
      action: "auth.logout",
      entityType: "User",
      entityId: user.id,
    });
  }
  return NextResponse.json({ ok: true });
}
