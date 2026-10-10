import { Suspense } from "react";

export default function AcceptInviteLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div className="p-8 text-center">Loading…</div>}>{children}</Suspense>;
}
