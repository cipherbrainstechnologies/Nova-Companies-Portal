import type { Locale } from "@/i18n";
import { siteCopyEn, type SiteCopy } from "./en";
import { siteCopyEs } from "./es";
import { siteCopyFr } from "./fr";

const copies: Record<Locale, SiteCopy> = {
  en: siteCopyEn,
  fr: siteCopyFr,
  es: siteCopyEs,
};

export function getSiteCopy(locale: Locale = "en"): SiteCopy {
  return copies[locale] ?? siteCopyEn;
}

export type { SiteCopy };
