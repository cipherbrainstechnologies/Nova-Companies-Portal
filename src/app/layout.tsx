import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-body-loaded",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL((process.env.APP_URL ?? "https://www.novaworkforce.in").replace(/\/$/, "")),
  title: {
    default: "Nova Group of Companies",
    template: "%s · Nova Group",
  },
  description:
    "Nova Group of Companies employs people in India. Nova Workforce is the employer of record. Employees and admins sign in for salary slips and documents.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body style={{ fontFamily: "var(--font-body-loaded), var(--font-sans)" }}>{children}</body>
    </html>
  );
}
