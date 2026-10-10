import { notFound } from "next/navigation";
import { requireClientPage } from "@/server/auth/client-page-guard";
import { prisma } from "@/server/db";
import { Card } from "@/components/ui";
import { MoneyValue } from "@/components/industrial";

export default async function ClientInvoiceDetailPage({
  params,
}: {
  params: Promise<{ clientSlug: string; invoiceId: string }>;
}) {
  const { clientSlug, invoiceId } = await params;
  const { membership } = await requireClientPage(clientSlug);
  const invoice = await prisma.clientInvoice.findFirst({
    where: { id: invoiceId, clientOrganizationId: membership.clientOrganizationId },
    include: { lines: true, novaCompany: true },
  });
  if (!invoice) notFound();

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Invoice {invoice.invoiceNumber}</h2>
      <p className="text-sm text-[var(--nova-muted)]">
        Seller: {invoice.novaCompany.name} · Period {invoice.periodMonth}/{invoice.periodYear} ·{" "}
        {invoice.financialState}
      </p>
      <Card className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[var(--nova-surface-muted)] text-xs uppercase text-[var(--nova-muted)]">
            <tr>
              <th className="px-4 py-3 text-left">Description</th>
              <th className="px-4 py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lines.map((line) => (
              <tr key={line.id} className="border-t border-[var(--nova-border)]">
                <td className="px-4 py-3">{line.description}</td>
                <td className="px-4 py-3 text-right">
                  <MoneyValue value={line.lineTotal.toString()} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <p className="text-lg font-semibold">
        Total: <MoneyValue value={invoice.total.toString()} />
      </p>
    </div>
  );
}
