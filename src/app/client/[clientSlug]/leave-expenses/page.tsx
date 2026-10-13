import { Card } from "@/components/ui";
import { requireClientPage } from "@/server/auth/client-page-guard";

export default async function Page({ params }: { params: Promise<{ clientSlug: string }> }) {
  const { clientSlug } = await params;
  await requireClientPage(clientSlug);
  return (
    <div className="space-y-3">
      <h2 className="text-2xl font-bold">Leave Expenses</h2>
      <Card className="p-4 text-sm text-[var(--nova-text-secondary)]">
        Leave balances and requests are not accepted on this page yet. Statutory leave is administered by Nova and is not set by the EOR service plan.
      </Card>
    </div>
  );
}
