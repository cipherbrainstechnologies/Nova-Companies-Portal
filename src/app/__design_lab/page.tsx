"use client";

import { LabShell } from "../../../.claude-design/lab/components/LabShell";
import { VariantC } from "../../../.claude-design/lab/variants/VariantC";
import { VariantD } from "../../../.claude-design/lab/variants/VariantD";
import { VariantF } from "../../../.claude-design/lab/variants/VariantF";
import { FeedbackOverlay } from "./FeedbackOverlay";

/**
 * Temporary Design Lab — synthesis pass.
 * F = C spacious premium + D progressive portal gate.
 */
export default function DesignLabPage() {
  return (
    <div className="design-lab-root min-h-screen bg-stone-100 text-stone-900 normal-case tracking-normal">
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .design-lab-root, .design-lab-root * {
          text-transform: none !important;
          letter-spacing: normal !important;
        }
        .design-lab-root .rounded-full { border-radius: 9999px !important; }
        .design-lab-root .rounded-xl { border-radius: 0.75rem !important; }
        .design-lab-root .rounded-2xl { border-radius: 1rem !important; }
        .design-lab-root .rounded-lg { border-radius: 0.5rem !important; }
      `,
        }}
      />

      <header className="border-b border-stone-200 bg-white px-4 py-5 md:px-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-rose-700">
          Design Lab · Synthesis
        </p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight md:text-2xl">
          Variant F — spacious premium + progressive gate
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-stone-600">
          Combined from your picks: <strong>C</strong> (calm centered hero, airy features) and{" "}
          <strong>D</strong> (portal pick → ready → continue). C and D kept below for comparison.
        </p>
      </header>

      <main className="mx-auto flex max-w-[1400px] flex-col gap-6 p-4 md:p-6">
        <div data-variant="F">
          <LabShell
            letter="F"
            title="Synthesized direction"
            why="Centered premium hero from C; portal chooser + optimistic continue from D; stone Continue (not purple) to stay calmer."
            notes="Primary candidate for landing — also the pattern for employee/admin gate entry."
          >
            <VariantF />
          </LabShell>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div data-variant="C">
            <LabShell
              letter="C"
              title="Spacious premium (source)"
              why="Original airy hero for comparison."
              notes="Single Log in — no inline portal picker."
            >
              <VariantC />
            </LabShell>
          </div>
          <div data-variant="D">
            <LabShell
              letter="D"
              title="Progressive gate (source)"
              why="Original interaction model for comparison."
              notes="Denser intro; purple Continue accent."
            >
              <VariantD />
            </LabShell>
          </div>
        </div>
      </main>

      <FeedbackOverlay targetName="LandingPage" />
    </div>
  );
}
