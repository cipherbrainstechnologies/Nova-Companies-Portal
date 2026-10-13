import type { MetadataRoute } from "next";

const MARKETING = [
  "",
  "about",
  "pricing",
  "contact",
  "employer-of-record-india",
  "services/payroll",
  "india-hiring-guide",
  "how-it-works",
  "fx-transparency",
  "security",
  "book-demo",
  "privacy",
  "faq",
  "services",
  "companies",
  "how-we-work",
  "who-we-serve",
  "careers",
  "platform",
  "compliance",
  "terms",
  "cookies",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.APP_URL ?? "https://nova-companies-portal-production.up.railway.app";
  return MARKETING.map((path) => ({
    url: `${base}/${path}`,
    lastModified: new Date(),
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : 0.6,
  }));
}
