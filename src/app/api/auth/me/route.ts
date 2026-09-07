import { NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ user: null }, { status: 401 });
  return NextResponse.json({
    user: {
      id: user.id,
      phone: user.phone,
      email: user.email,
      globalRole: user.globalRole,
      mustChangePassword: user.mustChangePassword,
      employeeId: user.employeeId,
    },
  });
}
