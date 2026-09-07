import type { Metadata } from "next";
import { Source_Sans_3 } from "next/font/google";
import "./globals.css";

/** Desert Rose ≈ FreeSans Bold / FreeSans via Source Sans 3 */
const sourceSans = Source_Sans_3({
  weight: ["400", "600", "700"],
  subsets: ["latin"],
  variable: "--font-body-loaded",
  display: "swap",
});

const sourceSansDisplay = Source_Sans_3({
  weight: ["700"],
  subsets: ["latin"],
  variable: "--font-display-loaded",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Nova Salary Portal",
  description: "Secure multi-company salary slip delivery and finance reconciliation",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sourceSans.variable} ${sourceSansDisplay.variable}`}>
      <body style={{ fontFamily: "var(--font-body-loaded), var(--font-sans)" }}>
        {children}
      </body>
    </html>
  );
}
