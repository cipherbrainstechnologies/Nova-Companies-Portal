"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Card, Input, Label, Select } from "@/components/ui";
import { AlertBanner, BracketLabel, Meta } from "@/components/industrial";

type Rule = {
  id: string;
  matchPattern: string;
  classification: string | null;
  treatment: string;
  categoryKey: string | null;
  label: string | null;
  priority: number;
  isActive: boolean;
};

const TREATMENTS = [
  "REVENUE",
  "BUSINESS_EXPENSE",
  "FINANCING_OR_PERSONAL",
  "OWNER_EXCLUDED",
  "IGNORE",
] as const;

const CATEGORIES = [
  "REVENUE",
  "SALARY_OVERTIME",
  "CASH_SALARY",
  "CBDT_TAX",
  "BUSINESS_EXPENSE",
  "HOME_LOAN",
  "BAJAJ_EMI",
  "CREDIT_CARD",
  "OWNER_TRANSFER",
  "OTHER_OUTFLOW",
  "UNCLASSIFIED",
  "IGNORE",
] as const;

export function ProfitPolicyEditor({
  companies,
  initialCompanyId,
}: {
  companies: Array<{ id: string; name: string }>;
  initialCompanyId?: string;
}) {
  const [companyId, setCompanyId] = useState(initialCompanyId ?? companies[0]?.id ?? "");
  const [rules, setRules] = useState<Rule[]>([]);
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({
    matchPattern: "",
    treatment: "BUSINESS_EXPENSE",
    categoryKey: "BUSINESS_EXPENSE",
    label: "",
    priority: 50,
  });

  const load = useCallback(async () => {
    if (!companyId) return;
    setError(null);
    const res = await fetch(`/api/finance/profit-policies?companyId=${companyId}`);
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Failed to load rules");
      return;
    }
    setRules(json.rules ?? []);
    setLabels(json.categoryLabels ?? {});
  }, [companyId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveRule(payload: Record<string, unknown>) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/finance/profit-policies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, ...payload }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Save failed");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function removeRule(id: string) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/finance/profit-policies?id=${id}&companyId=${companyId}`,
        { method: "DELETE" },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Delete failed");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="space-y-4 p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <BracketLabel>Company profit policy rules</BracketLabel>
          <p className="mt-1 text-sm text-[var(--nova-muted)]">
            Narration patterns map statement lines into earned-profit or personal-deduction
            buckets. Manual transaction classification still overrides these rules.
          </p>
        </div>
        <div>
          <Label>Company</Label>
          <Select value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {error ? <AlertBanner tone="danger">{error}</AlertBanner> : null}

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-[var(--nova-border)] text-xs uppercase tracking-[0.06em] text-[var(--nova-muted)]">
            <tr>
              <th className="py-2 pr-3">Priority</th>
              <th className="py-2 pr-3">Pattern</th>
              <th className="py-2 pr-3">Category</th>
              <th className="py-2 pr-3">Treatment</th>
              <th className="py-2 pr-3">Active</th>
              <th className="py-2"> </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--nova-border)]">
            {rules.map((rule) => (
              <tr key={rule.id}>
                <td className="py-2 pr-3 tabular-nums">{rule.priority}</td>
                <td className="py-2 pr-3 font-mono text-xs">{rule.matchPattern}</td>
                <td className="py-2 pr-3">
                  {rule.label ?? labels[rule.categoryKey ?? ""] ?? rule.categoryKey ?? "—"}
                </td>
                <td className="py-2 pr-3">
                  <Meta>{rule.treatment}</Meta>
                </td>
                <td className="py-2 pr-3">{rule.isActive ? "Yes" : "No"}</td>
                <td className="py-2">
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={saving}
                    onClick={() => void removeRule(rule.id)}
                  >
                    Remove
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 border-t border-[var(--nova-border)] pt-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Label>Match pattern (regex)</Label>
          <Input
            value={draft.matchPattern}
            onChange={(e) => setDraft((d) => ({ ...d, matchPattern: e.target.value }))}
            placeholder="e.g. SANA.?LIFE"
          />
        </div>
        <div>
          <Label>Category</Label>
          <Select
            value={draft.categoryKey}
            onChange={(e) => setDraft((d) => ({ ...d, categoryKey: e.target.value }))}
          >
            {CATEGORIES.map((key) => (
              <option key={key} value={key}>
                {labels[key] ?? key}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Treatment</Label>
          <Select
            value={draft.treatment}
            onChange={(e) => setDraft((d) => ({ ...d, treatment: e.target.value }))}
          >
            {TREATMENTS.map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Priority (lower first)</Label>
          <Input
            type="number"
            value={draft.priority}
            onChange={(e) => setDraft((d) => ({ ...d, priority: Number(e.target.value) }))}
          />
        </div>
      </div>
      <Button
        type="button"
        disabled={saving || !draft.matchPattern.trim()}
        onClick={() =>
          void saveRule({
            matchPattern: draft.matchPattern.trim(),
            treatment: draft.treatment,
            categoryKey: draft.categoryKey,
            label: draft.label || labels[draft.categoryKey] || draft.categoryKey,
            priority: draft.priority,
          }).then(() =>
            setDraft({
              matchPattern: "",
              treatment: "BUSINESS_EXPENSE",
              categoryKey: "BUSINESS_EXPENSE",
              label: "",
              priority: 50,
            }),
          )
        }
      >
        Add rule
      </Button>
    </Card>
  );
}
