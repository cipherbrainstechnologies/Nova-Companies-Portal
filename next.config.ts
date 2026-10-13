import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/how-we-work", destination: "/how-it-works", permanent: true },
      { source: "/services/payroll", destination: "/india-payroll-services", permanent: true },
      { source: "/book-demo", destination: "/contact", statusCode: 301 },
      { source: "/compliance", destination: "/security", statusCode: 301 },
    ];
  },
  serverExternalPackages: ["pdf-parse", "playwright", "@prisma/client", "bcryptjs", "bullmq", "ioredis"],
  experimental: {
    serverActions: {
      bodySizeLimit: "16mb",
    },
  },
};

export default nextConfig;
