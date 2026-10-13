import Link from "next/link";

export function FAQAccordion({
  items,
  allHref,
  allLabel,
}: {
  items: Array<{ id: string; q: string; a: string }>;
  allHref: string;
  allLabel: string;
}) {
  return (
    <div>
      <div className="divide-y divide-[var(--nova-border)] border-y border-[var(--nova-border)]">
        {items.map((item) => (
          <details key={item.id} className="group py-1">
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 text-base font-semibold text-[var(--nova-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--nova-purple)] [&::-webkit-details-marker]:hidden">
              {item.q}
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--nova-purple-light)] text-lg leading-none text-[var(--nova-purple)]" aria-hidden>
                <span className="group-open:hidden">+</span>
                <span className="hidden group-open:inline">–</span>
              </span>
            </summary>
            <p className="max-w-3xl pb-4 text-base leading-relaxed text-[var(--nova-muted)]">{item.a}</p>
          </details>
        ))}
      </div>
      <p className="mt-6">
        <Link href={allHref} className="text-sm font-semibold text-[var(--nova-purple)] hover:text-[var(--nova-purple-hover)]">
          {allLabel}
        </Link>
      </p>
    </div>
  );
}
