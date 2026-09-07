"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type FeedbackComment = {
  id: string;
  variant: string;
  selector: string;
  label: string;
  text: string;
};

function closestVariant(el: Element | null): string {
  let cur: Element | null = el;
  while (cur) {
    const v = cur.getAttribute("data-variant");
    if (v) return v;
    cur = cur.parentElement;
  }
  return "?";
}

function describeElement(el: Element): { selector: string; label: string } {
  const testId = el.getAttribute("data-testid");
  if (testId) {
    return {
      selector: `[data-testid='${testId}']`,
      label: `${el.tagName.toLowerCase()} [data-testid=${testId}]`,
    };
  }
  const id = el.id ? `#${el.id}` : "";
  const cls =
    typeof el.className === "string" && el.className.trim()
      ? `.${el.className.trim().split(/\s+/).slice(0, 2).join(".")}`
      : "";
  const text = (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 48);
  const tag = el.tagName.toLowerCase();
  return {
    selector: `${tag}${id}${cls}`.slice(0, 120) || tag,
    label: text ? `${tag} with "${text}"` : tag,
  };
}

export function FeedbackOverlay({ targetName }: { targetName: string }) {
  const [armed, setArmed] = useState(false);
  const [draftEl, setDraftEl] = useState<Element | null>(null);
  const [draftText, setDraftText] = useState("");
  const [comments, setComments] = useState<FeedbackComment[]>([]);
  const [overall, setOverall] = useState("");
  const [copied, setCopied] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!armed) return;
    const prev = document.body.style.cursor;
    document.body.style.cursor = "crosshair";
    return () => {
      document.body.style.cursor = prev;
    };
  }, [armed]);

  const onCaptureClick = useCallback(
    (e: MouseEvent) => {
      if (!armed) return;
      const t = e.target as Element | null;
      if (!t) return;
      if (t.closest("[data-feedback-ui]")) return;
      e.preventDefault();
      e.stopPropagation();
      setDraftEl(t);
      setPos({ x: e.clientX, y: e.clientY });
      setDraftText("");
      setArmed(false);
    },
    [armed],
  );

  useEffect(() => {
    if (!armed) return;
    document.addEventListener("click", onCaptureClick, true);
    return () => document.removeEventListener("click", onCaptureClick, true);
  }, [armed, onCaptureClick]);

  const markdown = useMemo(() => {
    const byVariant: Record<string, FeedbackComment[]> = {};
    for (const c of comments) {
      (byVariant[c.variant] ||= []).push(c);
    }
    const lines = [
      "## Design Lab Feedback",
      "",
      `**Target:** ${targetName}`,
      `**Comments:** ${comments.length}`,
      "",
    ];
    for (const letter of Object.keys(byVariant).sort()) {
      lines.push(`### Variant ${letter}`);
      byVariant[letter].forEach((c, i) => {
        lines.push(`${i + 1}. **${c.label}** (\`${c.selector}\`)`);
        lines.push(`   "${c.text}"`);
        lines.push("");
      });
    }
    lines.push("### Overall Direction");
    lines.push(overall.trim() || "(required — fill before submit)");
    lines.push("");
    return lines.join("\n");
  }, [comments, overall, targetName]);

  function saveDraft() {
    if (!draftEl || !draftText.trim()) return;
    const { selector, label } = describeElement(draftEl);
    setComments((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${prev.length}`,
        variant: closestVariant(draftEl),
        selector,
        label,
        text: draftText.trim(),
      },
    ]);
    setDraftEl(null);
    setPos(null);
    setDraftText("");
  }

  async function submitAll() {
    if (!overall.trim()) {
      alert("Overall Direction is required before submit.");
      return;
    }
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback: select via prompt
      window.prompt("Copy feedback:", markdown);
    }
  }

  return (
    <div data-feedback-ui className="pointer-events-none fixed inset-0 z-[9999]">
      <div className="pointer-events-auto absolute bottom-4 right-4 flex max-w-sm flex-col gap-2">
        <div className="rounded-2xl border border-stone-200 bg-white/95 p-3 shadow-xl backdrop-blur">
          <div className="text-xs font-semibold uppercase tracking-wide text-stone-500">
            Design Lab Feedback
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-stone-500">
            Click Add Feedback, then click any element in a variant. Fill Overall Direction, then
            Submit to copy markdown for chat.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setArmed((v) => !v)}
              className={`min-h-10 rounded-full px-3 text-xs font-semibold ${
                armed ? "bg-rose-600 text-white" : "bg-stone-900 text-white"
              }`}
            >
              {armed ? "Cancel pick…" : "Add Feedback"}
            </button>
            <button
              type="button"
              onClick={submitAll}
              className="min-h-10 rounded-full bg-[#635bff] px-3 text-xs font-semibold text-white"
            >
              {copied ? "Copied!" : "Submit All Feedback"}
            </button>
          </div>
          <label className="mt-3 block text-[11px] font-medium text-stone-700">
            Overall Direction (required)
            <textarea
              value={overall}
              onChange={(e) => setOverall(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-xl border border-stone-200 px-2 py-1.5 text-xs text-stone-800"
              placeholder="e.g. Go with B structure, A CTAs…"
            />
          </label>
          {comments.length > 0 ? (
            <ul className="mt-2 max-h-28 space-y-1 overflow-auto text-[11px] text-stone-600">
              {comments.map((c) => (
                <li key={c.id}>
                  <span className="font-semibold text-stone-800">V{c.variant}</span>: {c.text}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      {draftEl && pos ? (
        <div
          data-feedback-ui
          className="pointer-events-auto absolute z-[10000] w-72 rounded-2xl border border-stone-200 bg-white p-3 shadow-2xl"
          style={{
            left: Math.min(pos.x, window.innerWidth - 300),
            top: Math.min(pos.y, window.innerHeight - 180),
          }}
        >
          <div className="text-xs font-semibold text-stone-800">
            Variant {closestVariant(draftEl)} · {describeElement(draftEl).label}
          </div>
          <textarea
            autoFocus
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            rows={3}
            className="mt-2 w-full rounded-xl border border-stone-200 px-2 py-1.5 text-xs"
            placeholder="What should change?"
          />
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              className="rounded-full px-3 py-1.5 text-xs text-stone-600"
              onClick={() => {
                setDraftEl(null);
                setPos(null);
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded-full bg-stone-900 px-3 py-1.5 text-xs font-semibold text-white"
              onClick={saveDraft}
            >
              Save
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
