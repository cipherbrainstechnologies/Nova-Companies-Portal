export function slugifyClientName(legalName: string): string {
  const base = legalName
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 48);
  return base || "client";
}

export function withUniqueSuffix(slug: string, suffix: string): string {
  return `${slug}-${suffix}`.slice(0, 64);
}
