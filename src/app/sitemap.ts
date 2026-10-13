import type { MetadataRoute } from "next";

const MARKETING = [
  "",
  "about",
  "pricing",
  "contact",
  "employer-of-record-india",
  "india-payroll-services",
  "hire-employees-in-india",
  "india-employment-compliance",
  "india-hiring-guide",
  "how-it-works",
  "fx-transparency",
  "security",
  "privacy",
  "faq",
  "services",
  "companies",
  "who-we-serve",
  "careers",
  "platform",
  "terms",
  "cookies",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = (process.env.APP_URL ?? "https://www.novaworkforce.in").replace(/\/$/, "");
  return MARKETING.map((path) => ({
    url: `${base}/${path}`,
    lastModified: new Date(),
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : 0.6,
  }));
}
