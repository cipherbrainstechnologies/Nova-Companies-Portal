import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/server/auth/session";
import type { GlobalRole } from "@prisma/client";

export async function requirePageUser(roles?: GlobalRole[]) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.mustChangePassword) redirect("/change-password");
  if (roles && !roles.includes(user.globalRole)) redirect("/login");
  return user;
}

export async function getLocaleCookie() {
  const jar = await cookies();
  const v = jar.get("locale")?.value;
  if (v === "fr" || v === "es" || v === "en") return v;
  return "en" as const;
}
