import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.APP_URL ?? "https://nova-companies-portal-production.up.railway.app";
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/employee/", "/client/", "/api/"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
