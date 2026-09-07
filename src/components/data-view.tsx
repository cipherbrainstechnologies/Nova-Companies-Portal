import { Card } from "@/components/ui";

export function StatGrid({ items }: { items: Array<{ label: string; value: React.ReactNode }> }) {
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{items.map((item) =>
    <Card key={item.label}><p className="text-sm text-[var(--muted)]">{item.label}</p><p className="mt-2 text-3xl font-bold">{item.value}</p></Card>
  )}</div>;
}

export function DataTable({ columns, rows, empty = "No records found." }: {
  columns: string[]; rows: Array<Array<React.ReactNode>>; empty?: string;
}) {
  return <div className="overflow-x-auto rounded-lg border border-[var(--line)] bg-[var(--paper)]">
    <table className="w-full text-left text-sm">
      <thead className="bg-[var(--paper-soft)]"><tr>{columns.map((column) => <th key={column} className="px-4 py-3 font-semibold">{column}</th>)}</tr></thead>
      <tbody>{rows.length ? rows.map((row, index) => <tr key={index} className="border-t border-[var(--line)]">{row.map((cell, cellIndex) => <td key={cellIndex} className="px-4 py-3">{cell}</td>)}</tr>) :
        <tr><td colSpan={columns.length} className="px-4 py-8 text-center text-[var(--muted)]">{empty}</td></tr>}</tbody>
    </table>
  </div>;
}
