import { ClientShell } from "@/components/client-shell";
import { AlertBanner } from "@/components/industrial";
import { requireClientPage } from "@/server/auth/client-page-guard";

export default async function ClientLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ clientSlug: string }>;
}) {
  const { clientSlug } = await params;
  const { membership } = await requireClientPage(clientSlug);

  const onboardingIncomplete =
    membership.lifecycleStatus !== "ACTIVE" && membership.lifecycleStatus !== "SUSPENDED";

  return (
    <ClientShell
      clientSlug={clientSlug}
      clientName={membership.legalName}
      banner={
        onboardingIncomplete ? (
          <div className="mb-4">
          <AlertBanner tone="warning">
            Onboarding is not complete ({membership.lifecycleStatus.replace(/_/g, " ")}). Some actions
            remain locked until NOVA compliance activates your account.
          </AlertBanner>
          </div>
        ) : null
      }
    >
      {children}
    </ClientShell>
  );
}
