"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card } from "@/components/ui";
import { AlertBanner } from "@/components/industrial";
import { MonthYearPicker } from "@/components/month-year-picker";
import { Modal } from "@/components/modal";
import { t } from "@/i18n";

export function CreatePayrollForm({ companyId }: { companyId: string }) {
  const router = useRouter();
  const now = new Date();
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function createRun() {
    const res = await fetch("/api/payroll/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId, year: Number(year), month: Number(month) }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? t("en", "common.failed"));
      setConfirmOpen(false);
      return;
    }
    const d = data.diagnostics;
    if (d) {
      setInfo(
        `${d.nextAction} (found ${d.employeesFound}, eligible ${d.eligibleEmployees}, lines ${d.linesCreated}, salary review ${d.salaryReviewRequired})`,
      );
    }
    setConfirmOpen(false);
    router.refresh();
  }

  return (
    <Card>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setError("");
          setConfirmOpen(true);
        }}
        className="flex flex-wrap items-end gap-3"
      >
        <MonthYearPicker
          year={year}
          month={month}
          onYearChange={setYear}
          onMonthChange={setMonth}
          idPrefix="payroll-run"
        />
        <Button type="submit">{t("en", "admin.createPayroll")}</Button>
      </form>
      {error ? (
        <div className="mt-3">
          <AlertBanner tone="danger">{error}</AlertBanner>
        </div>
      ) : null}
      {info ? (
        <div className="mt-3">
          <AlertBanner tone="success">{info}</AlertBanner>
        </div>
      ) : null}
      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Create payroll run?"
        description={`This creates a run for ${String(month).padStart(2, "0")}/${year} and populates eligible employee lines. Bank matching enriches payments afterward; issuing still requires explicit confirmation.`}
      >
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => setConfirmOpen(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void createRun()}>
            Confirm create
          </Button>
        </div>
      </Modal>
    </Card>
  );
}
