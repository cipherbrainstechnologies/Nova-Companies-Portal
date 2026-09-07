import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nova Salary Portal",
  description: "Secure multi-company salary slip delivery and finance reconciliation",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
