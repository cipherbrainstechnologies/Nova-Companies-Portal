import { Card } from "@/components/ui";
import { requireClientPage } from "@/server/auth/client-page-guard";

export default async function Page({ params }: { params: Promise<{ clientSlug: string }> }) {
  const { clientSlug } = await params;
  await requireClientPage(clientSlug);
  return (
    <div className="space-y-3">
      <h2 className="text-2xl font-bold">People</h2>
      <Card className="p-4 text-sm text-[var(--nova-text-secondary)]">
        Tenant-scoped module. Complete onboarding and grants to unlock actions.
      </Card>
    </div>
  );
}
