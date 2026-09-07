import { DataRow } from "@/components/industrial";
import { Card } from "@/components/ui";

export function DataList({
  items,
}: {
  items: Array<{ id: string; title: string; subtitle?: string }>;
}) {
  if (!items.length) {
    return (
      <Card>
        <p className="meta text-[var(--muted)]">No records</p>
      </Card>
    );
  }
  return (
    <div className="grid gap-3">
      {items.map((item) => (
        <DataRow key={item.id} title={item.title} subtitle={item.subtitle} />
      ))}
    </div>
  );
}
