import catalog from "../../messages/catalog.json";

export type Locale = "en" | "fr" | "es";

const dictionaries = catalog as Record<Locale, Record<string, string>>;

export function t(locale: Locale, key: string): string {
  return dictionaries[locale]?.[key] ?? dictionaries.en[key] ?? key;
}

export function getLocaleFromHeader(acceptLanguage?: string | null): Locale {
  const raw = (acceptLanguage ?? "en").toLowerCase();
  if (raw.includes("fr")) return "fr";
  if (raw.includes("es")) return "es";
  return "en";
}
