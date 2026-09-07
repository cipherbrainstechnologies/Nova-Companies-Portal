export const DEFAULT_TEMPLATE_CSS = `
@page { size: A4; margin: 12mm; }
body { font-family: "Segoe UI", Arial, sans-serif; font-size: 10px; color: #111; }
.sheet { width: 100%; }
.header { display: flex; justify-content: space-between; border-bottom: 2px solid #111; padding-bottom: 6px; margin-bottom: 8px; }
.logo { max-width: 75px; max-height: 55px; object-fit: contain; margin-right: 8px; }
.company { display: flex; align-items: center; }
.company-name { font-size: 16px; font-weight: 700; }
.meta, table { width: 100%; border-collapse: collapse; margin-top: 6px; }
th, td { border: 1px solid #333; padding: 3px 5px; vertical-align: top; }
th { background: #f3f3f3; text-align: left; }
.right { text-align: right; }
.totals { font-weight: 700; }
.disclaimer { margin-top: 10px; font-size: 9px; font-style: italic; }
`;

export type PayslipRenderData = {
  companyName: string;
  companyGstin?: string | null;
  companyAddress?: string | null;
  logoUrl?: string | null;
  month: number;
  year: number;
  employeeCode: string;
  employeeName: string;
  designation?: string | null;
  department?: string | null;
  location?: string | null;
  doj?: string | null;
  pfNumber?: string | null;
  uan?: string | null;
  esiNumber?: string | null;
  bankName?: string | null;
  accountNumber?: string | null;
  working: {
    wd?: number | null;
    wo?: number | null;
    ph?: number | null;
    pd?: number | null;
    cl?: number | null;
    pl?: number | null;
    sl?: number | null;
    lwp?: number | null;
  };
  earnings: Array<{ code: string; label: string; actual: number; payable: number }>;
  deductions: Array<{ code: string; label: string; amount: number }>;
  grossEarnings: number;
  grossDeductions: number;
  netAmount: number;
  amountInWords: string;
};

function money(n: number) {
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function createDefaultTemplateBody(): string {
  return `<main class="sheet">
  <header class="header"><section class="company">{{companyLogo}}<div><div class="company-name">{{companyName}}</div><div>{{companyGstin}}</div><div>{{companyAddress}}</div></div></section><section><strong>FORM IV-B — PAY SLIP</strong><div>{{period}}</div></section></header>
  {{employeeAndAttendance}}
  {{earnings}}
  {{deductions}}
  <p><strong>Amount in words:</strong> {{amountInWords}}</p>
  <p class="disclaimer">This is a computer-generated payslip and does not require a signature.</p>
</main>`;
}

export function renderPayslipHtml(data: PayslipRenderData): string {
  const earningsRows = data.earnings
    .map(
      (e) =>
        `<tr><td>${e.label}</td><td class="right">${money(e.actual)}</td><td class="right">${money(e.payable)}</td></tr>`,
    )
    .join("");
  const deductionRows = data.deductions
    .map((d) => `<tr><td>${d.label}</td><td class="right" colspan="2">${money(d.amount)}</td></tr>`)
    .join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${DEFAULT_TEMPLATE_CSS}</style></head><body>
  <div class="sheet">
    <div class="header">
      <div class="company">
        ${data.logoUrl ? `<img class="logo" src="${escapeHtml(data.logoUrl)}" alt="Company logo"/>` : ""}
        <div>
        <div class="company-name">${escapeHtml(data.companyName)}</div>
        <div>GSTIN: ${escapeHtml(data.companyGstin ?? "Needs configuration")}</div>
        <div>${escapeHtml(data.companyAddress ?? "Needs configuration")}</div>
        </div>
      </div>
      <div>
        <div><strong>FORM IV-B — PAY SLIP</strong></div>
        <div>Period: ${String(data.month).padStart(2, "0")}/${data.year}</div>
      </div>
    </div>
    <table class="meta">
      <tr><th>Employee ID</th><td>${escapeHtml(data.employeeCode)}</td><th>Name</th><td>${escapeHtml(data.employeeName)}</td></tr>
      <tr><th>Designation</th><td>${escapeHtml(data.designation ?? "")}</td><th>Department</th><td>${escapeHtml(data.department ?? "")}</td></tr>
      <tr><th>Location</th><td>${escapeHtml(data.location ?? "")}</td><th>DOJ</th><td>${escapeHtml(data.doj ?? "")}</td></tr>
      <tr><th>PF / UAN / ESI</th><td colspan="3">${escapeHtml([data.pfNumber, data.uan, data.esiNumber].filter(Boolean).join(" / "))}</td></tr>
      <tr><th>Bank</th><td>${escapeHtml(data.bankName ?? "")}</td><th>Account</th><td>${escapeHtml(data.accountNumber ?? "")}</td></tr>
      <tr><th>WD/WO/PH/PD</th><td>${[data.working.wd, data.working.wo, data.working.ph, data.working.pd].map((v) => v ?? "-").join(" / ")}</td>
          <th>CL/PL/SL/LWP</th><td>${[data.working.cl, data.working.pl, data.working.sl, data.working.lwp].map((v) => v ?? "-").join(" / ")}</td></tr>
    </table>
    <table>
      <thead><tr><th>Earnings</th><th class="right">Actual</th><th class="right">Payable</th></tr></thead>
      <tbody>${earningsRows}
      <tr class="totals"><td>Gross income</td><td></td><td class="right">${money(data.grossEarnings)}</td></tr></tbody>
    </table>
    <table>
      <thead><tr><th>Deductions</th><th class="right" colspan="2">Amount</th></tr></thead>
      <tbody>${deductionRows}
      <tr class="totals"><td>Gross deductions</td><td class="right" colspan="2">${money(data.grossDeductions)}</td></tr>
      <tr class="totals"><td>Net amount</td><td class="right" colspan="2">${money(data.netAmount)}</td></tr></tbody>
    </table>
    <p><strong>Amount in words:</strong> ${escapeHtml(data.amountInWords)}</p>
    <p class="disclaimer">This is a computer generated statement; hence does not require a signature.</p>
  </div></body></html>`;
}

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
