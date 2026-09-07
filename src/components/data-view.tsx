import { DataRow, EmptyState } from "@/components/industrial";

export function DataList({
  items,
}: {
  items: Array<{ id: string; title: string; subtitle?: string }>;
}) {
  if (!items.length) {
    return <EmptyState title="No records" />;
  }
  return (
    <div className="grid gap-3">
      {items.map((item) => (
        <DataRow key={item.id} title={item.title} subtitle={item.subtitle} />
      ))}
    </div>
  );
}
