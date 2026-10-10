import { requireClientPage } from "@/server/auth/client-page-guard";
import { prisma } from "@/server/db";
import { Card } from "@/components/ui";
import { MoneyValue, StatusBadge } from "@/components/industrial";
import Link from "next/link";

export default async function ClientInvoicesPage({
  params,
}: {
  params: Promise<{ clientSlug: string }>;
}) {
  const { clientSlug } = await params;
  const { membership } = await requireClientPage(clientSlug);
  const invoices = await prisma.clientInvoice.findMany({
    where: { clientOrganizationId: membership.clientOrganizationId },
    orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
  });

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Invoices</h2>
      <Card className="overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-[var(--nova-surface-muted)] text-xs uppercase text-[var(--nova-muted)]">
            <tr>
              <th className="px-4 py-3 text-left">Invoice</th>
              <th className="px-4 py-3 text-left">Period</th>
              <th className="px-4 py-3 text-left">Total</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id} className="border-t border-[var(--nova-border)]">
                <td className="px-4 py-3 font-medium">{inv.invoiceNumber}</td>
                <td className="px-4 py-3">{inv.periodMonth}/{inv.periodYear}</td>
                <td className="px-4 py-3">
                  <MoneyValue value={inv.total.toString()} />
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={inv.financialState} tone="info" />
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/client/${clientSlug}/invoices/${inv.id}`} className="text-[var(--nova-teal)]">
                    View
                  </Link>
                </td>
              </tr>
            ))}
            {!invoices.length ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-[var(--nova-muted)]">
                  No invoices issued yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
