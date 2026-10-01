import { headers } from "next/headers";
import { getLocaleFromHeader, type Locale } from "@/i18n";

export async function getRequestLocale(): Promise<Locale> {
  const headerList = await headers();
  return getLocaleFromHeader(headerList.get("accept-language"));
}
