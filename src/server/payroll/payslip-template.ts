export const DEFAULT_TEMPLATE_CSS = `
@page { size: A4; margin: 10mm; }
body {
  font-family: "Segoe UI", Arial, sans-serif;
  font-size: 10px;
  color: #111;
  margin: 0;
}
.sheet { width: 100%; }
.brand {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 6px;
}
.logo { max-width: 90px; max-height: 70px; object-fit: contain; }
.gstin { font-size: 11px; font-weight: 700; }
.address { font-size: 10px; margin-top: 2px; }
.company-name { font-size: 15px; font-weight: 700; margin-bottom: 2px; }
.title-block { text-align: center; margin: 8px 0 10px; }
.title-block .period { font-size: 12px; font-weight: 700; }
.title-block .slip-title { font-size: 14px; font-weight: 700; letter-spacing: 0.02em; }
.title-block .form-rule { font-size: 10px; margin-top: 2px; }
.emp-grid {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 8px;
}
.emp-grid th, .emp-grid td {
  border: 1px solid #333;
  padding: 3px 5px;
  vertical-align: top;
  text-align: left;
}
.emp-grid th { width: 18%; background: #f5f5f5; font-weight: 600; }
.section-head {
  background: #e8e8e8;
  font-weight: 700;
  text-align: center;
  border: 1px solid #333;
  padding: 4px;
}
.tri {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}
.tri th, .tri td {
  border: 1px solid #333;
  padding: 2px 4px;
  vertical-align: top;
}
.tri thead th { background: #f3f3f3; font-weight: 700; }
.col-work { width: 18%; }
.col-earn { width: 52%; }
.col-ded { width: 30%; }
.right { text-align: right; }
.totals { font-weight: 700; }
.net-row {
  margin-top: 10px;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 12px;
}
.words { font-weight: 600; flex: 1; }
.net-box {
  border: 1px solid #333;
  padding: 6px 10px;
  font-weight: 700;
  white-space: nowrap;
}
.disclaimer {
  margin-top: 10px;
  font-size: 9px;
  font-style: italic;
  text-align: center;
}
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

/** Form IV-B earning rows shown on every slip (zeros when absent), Parth Virani reference order. */
export const FORM_IVB_EARNING_ROWS: ReadonlyArray<{ code: string; label: string; aliases: string[] }> = [
  { code: "BASIC", label: "Consol.Basic", aliases: ["basic", "consolidated", "consolbasic"] },
  { code: "DA", label: "DA", aliases: ["da", "dearness"] },
  { code: "HRA", label: "HRA", aliases: ["hra"] },
  { code: "CONVEYANCE", label: "CONV", aliases: ["conv", "conveyance", "transport"] },
  { code: "MEDICAL", label: "MEDI. ALL", aliases: ["medical", "mediall", "medi"] },
  { code: "SPECIAL", label: "SP. ALL", aliases: ["special", "spall"] },
  { code: "TRAVEL", label: "TRAVEL. ALL", aliases: ["travel", "trav", "travelall"] },
  { code: "OTHER_ALLOWANCE", label: "OTHER ALL", aliases: ["other", "otherall", "otherallowance"] },
  { code: "BONUS", label: "BONUS", aliases: ["bonus", "incentive"] },
  { code: "LEAVE_WAGES", label: "LEAVE WAGES", aliases: ["leavewages", "leave"] },
];

/** Form IV-B deduction rows shown on every slip (zeros when absent). */
export const FORM_IVB_DEDUCTION_ROWS: ReadonlyArray<{ code: string; label: string; aliases: string[] }> = [
  { code: "PF", label: "P.F", aliases: ["pf", "providentfund", "epf"] },
  { code: "ESI", label: "ESI", aliases: ["esi", "esic"] },
  { code: "PT", label: "P.T.", aliases: ["pt", "professionaltax"] },
  { code: "TDS", label: "I.T.", aliases: ["tds", "it", "incometax"] },
  { code: "LWF", label: "L.W.F", aliases: ["lwf", "labourwelfare"] },
  { code: "ADVANCE", label: "Advance", aliases: ["advance"] },
  { code: "LOAN", label: "Loan", aliases: ["loan"] },
  { code: "OTHER_DEDUCTION", label: "Oth.Ded / Deposit", aliases: ["otherdeduction", "othded", "deposit"] },
  { code: "CANTEEN", label: "Canteen/Food", aliases: ["canteen", "food"] },
  { code: "OVERTIME", label: "Overtime", aliases: ["overtime", "ot"] },
];

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

function money(n: number) {
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function moneyOrZero(n: number | null | undefined) {
  return money(typeof n === "number" && Number.isFinite(n) ? n : 0);
}

function canonical(value: string) {
  return value.replace(/[^a-zA-Z0-9]+/g, "").toLowerCase();
}

function displayOr(value: string | null | undefined, emptyLabel: string) {
  const trimmed = (value ?? "").trim();
  return trimmed ? trimmed : emptyLabel;
}

function formatPeriodLabel(month: number, year: number) {
  const name = MONTH_NAMES[Math.max(1, Math.min(12, month)) - 1] ?? String(month);
  return `${name}-${year}`;
}

function formatDoj(value: string | null | undefined): string {
  if (!value?.trim()) return "NOT AVAILABLE";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value.trim().toUpperCase();
  const day = d.getUTCDate();
  const suffix =
    day % 10 === 1 && day !== 11
      ? "ST"
      : day % 10 === 2 && day !== 12
        ? "ND"
        : day % 10 === 3 && day !== 13
          ? "RD"
          : "TH";
  const month = MONTH_NAMES[d.getUTCMonth()] ?? "";
  return `${day}${suffix} ${month} ${d.getUTCFullYear()}`.toUpperCase();
}

function findEarning(
  rows: PayslipRenderData["earnings"],
  codes: string[],
): { actual: number; payable: number } | null {
  const wanted = new Set(codes.map(canonical));
  for (const row of rows) {
    if (wanted.has(canonical(row.code)) || wanted.has(canonical(row.label))) {
      return { actual: row.actual, payable: row.payable };
    }
  }
  return null;
}

function findDeduction(rows: PayslipRenderData["deductions"], codes: string[]): number | null {
  const wanted = new Set(codes.map(canonical));
  for (const row of rows) {
    if (wanted.has(canonical(row.code)) || wanted.has(canonical(row.label))) {
      return row.amount;
    }
  }
  return null;
}

function buildFormIvbEarnings(data: PayslipRenderData) {
  const used = new Set<string>();
  const rows: Array<{ label: string; actual: number; payable: number }> = [];

  for (const def of FORM_IVB_EARNING_ROWS) {
    const hit = findEarning(data.earnings, [def.code, def.label, ...def.aliases]);
    if (hit) {
      for (const e of data.earnings) {
        if (
          canonical(e.code) === canonical(def.code) ||
          def.aliases.some((a) => canonical(a) === canonical(e.code) || canonical(a) === canonical(e.label)) ||
          canonical(e.label) === canonical(def.label)
        ) {
          used.add(`${e.code}|${e.label}`);
        }
      }
    }
    rows.push({
      label: def.label,
      actual: hit?.actual ?? 0,
      payable: hit?.payable ?? 0,
    });
  }

  for (const e of data.earnings) {
    const key = `${e.code}|${e.label}`;
    if (used.has(key)) continue;
    if (FORM_IVB_EARNING_ROWS.some((d) => canonical(d.code) === canonical(e.code))) continue;
    // OVERTIME is a deduction column on Form IV-B; skip if coded as earning.
    if (canonical(e.code) === "overtime") continue;
    rows.push({ label: e.label || e.code, actual: e.actual, payable: e.payable });
  }

  return rows;
}

function buildFormIvbDeductions(data: PayslipRenderData) {
  const used = new Set<string>();
  const rows: Array<{ label: string; amount: number }> = [];

  for (const def of FORM_IVB_DEDUCTION_ROWS) {
    const hit = findDeduction(data.deductions, [def.code, def.label, ...def.aliases]);
    if (hit != null) {
      for (const d of data.deductions) {
        if (
          canonical(d.code) === canonical(def.code) ||
          def.aliases.some((a) => canonical(a) === canonical(d.code) || canonical(a) === canonical(d.label)) ||
          canonical(d.label) === canonical(def.label)
        ) {
          used.add(`${d.code}|${d.label}`);
        }
      }
    }
    // OVERTIME may arrive as an earning line on some structures.
    const overtimeFromEarnings =
      def.code === "OVERTIME"
        ? findEarning(data.earnings, ["OVERTIME", "OT", "overtime"])
        : null;
    rows.push({
      label: def.label,
      amount: hit ?? overtimeFromEarnings?.payable ?? 0,
    });
  }

  for (const d of data.deductions) {
    const key = `${d.code}|${d.label}`;
    if (used.has(key)) continue;
    if (FORM_IVB_DEDUCTION_ROWS.some((def) => canonical(def.code) === canonical(d.code))) continue;
    rows.push({ label: d.label || d.code, amount: d.amount });
  }

  return rows;
}

function buildTriColumnTable(data: PayslipRenderData): string {
  const working = [
    { label: "WD", value: data.working.wd },
    { label: "WO", value: data.working.wo },
    { label: "PH", value: data.working.ph },
    { label: "PD", value: data.working.pd },
    { label: "CL", value: data.working.cl },
    { label: "PL", value: data.working.pl },
    { label: "SL", value: data.working.sl },
    { label: "LWP", value: data.working.lwp },
  ];
  const earnings = buildFormIvbEarnings(data);
  const deductions = buildFormIvbDeductions(data);
  const rowCount = Math.max(working.length, earnings.length, deductions.length);
  const grossActual = data.earnings.reduce((sum, e) => sum + (Number.isFinite(e.actual) ? e.actual : 0), 0);
  const grossPayable = data.grossEarnings;
  const workingTotal =
    (data.working.wd ?? 0) ||
    working.reduce((sum, row) => sum + (typeof row.value === "number" ? row.value : 0), 0);

  const bodyRows: string[] = [];
  for (let i = 0; i < rowCount; i += 1) {
    const w = working[i];
    const e = earnings[i];
    const d = deductions[i];
    bodyRows.push(`<tr>
      <td>${w ? escapeHtml(w.label) : ""}</td>
      <td class="right">${w ? moneyOrZero(w.value) : ""}</td>
      <td>${e ? escapeHtml(e.label) : ""}</td>
      <td class="right">${e ? money(e.actual) : ""}</td>
      <td class="right">${e ? money(e.payable) : ""}</td>
      <td>${d ? escapeHtml(d.label) : ""}</td>
      <td class="right">${d ? money(d.amount) : ""}</td>
    </tr>`);
  }

  return `<table class="tri">
    <thead>
      <tr>
        <th colspan="2" class="section-head col-work">WORKING DETAILS</th>
        <th colspan="3" class="section-head col-earn">EARNING DETAILS</th>
        <th colspan="2" class="section-head col-ded">DEDUCTION DETAILS</th>
      </tr>
      <tr>
        <th></th><th class="right"> </th>
        <th>Earnings</th><th class="right">Actual</th><th class="right">Payable</th>
        <th>Deduction</th><th class="right">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${bodyRows.join("")}
      <tr class="totals">
        <td>TOTAL</td>
        <td class="right">${moneyOrZero(workingTotal)}</td>
        <td>Gross Income</td>
        <td class="right">${money(grossActual)}</td>
        <td class="right">${money(grossPayable)}</td>
        <td>Gross Ded.</td>
        <td class="right">${money(data.grossDeductions)}</td>
      </tr>
    </tbody>
  </table>`;
}

function buildEmployeeBlock(data: PayslipRenderData): string {
  return `<table class="emp-grid">
    <tr>
      <th>Emp.Id</th><td>${escapeHtml(data.employeeCode)}</td>
      <th>Emp. Name</th><td>${escapeHtml(data.employeeName.toUpperCase())}</td>
    </tr>
    <tr>
      <th>Designation</th><td>${escapeHtml(displayOr(data.designation, "NOT AVAILABLE").toUpperCase())}</td>
      <th>Department</th><td>${escapeHtml(displayOr(data.department, "NOT AVAILABLE").toUpperCase())}</td>
    </tr>
    <tr>
      <th>Location</th><td>${escapeHtml(displayOr(data.location, "NOT AVAILABLE").toUpperCase())}</td>
      <th>D.O.J</th><td>${escapeHtml(formatDoj(data.doj))}</td>
    </tr>
    <tr>
      <th>P.F. No.</th><td>${escapeHtml(displayOr(data.pfNumber, "NOT APPLICABLE").toUpperCase())}</td>
      <th>UAN No.</th><td>${escapeHtml(displayOr(data.uan, "NOT APPLICABLE").toUpperCase())}</td>
    </tr>
    <tr>
      <th>ESI No.</th><td>${escapeHtml(displayOr(data.esiNumber, "NOT APPLICABLE").toUpperCase())}</td>
      <th>Bank</th><td>${escapeHtml(displayOr(data.bankName, "NOT AVAILABLE").toUpperCase())}</td>
    </tr>
    <tr>
      <th>A/c No</th><td colspan="3">${escapeHtml(displayOr(data.accountNumber, "NOT AVAILABLE"))}</td>
    </tr>
  </table>`;
}

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function createDefaultTemplateBody(): string {
  return `<main class="sheet">
  <header class="brand">{{companyLogo}}<div><div class="company-name">{{companyName}}</div><div class="gstin">GSTIN : {{companyGstin}}</div><div class="address">{{companyAddress}}</div></div></header>
  <div class="title-block">
    <div class="period">Salary for the month of :- {{periodLabel}}</div>
    <div class="slip-title">Salary Slip</div>
    <div class="form-rule">Form IV B [ Rule 26(2) (b) ]</div>
  </div>
  {{employeeAndAttendance}}
  {{earnings}}
  <div class="net-row">
    <div class="words">{{amountInWords}}</div>
    <div class="net-box">Net Amount&nbsp;&nbsp;Rs. {{netAmount}}</div>
  </div>
  <p class="disclaimer">This is computer generated statement hence does not require a signature.</p>
</main>`;
}

export function samplePayslipRenderData(overrides?: Partial<PayslipRenderData>): PayslipRenderData {
  return {
    companyName: "Sample Company Pvt Ltd",
    companyGstin: "27AAAAA0000A1Z5",
    companyAddress: "Sample address, India",
    month: 8,
    year: 2026,
    employeeCode: "EMP-0001",
    employeeName: "Sample Employee",
    designation: "Staff",
    department: "Operations",
    location: "India",
    doj: "2024-01-15",
    pfNumber: null,
    uan: null,
    esiNumber: null,
    bankName: null,
    accountNumber: null,
    working: { wd: 26, wo: 4, ph: 0, pd: 26, cl: 0, pl: 0, sl: 0, lwp: 0 },
    earnings: [
      { code: "BASIC", label: "Consol.Basic", actual: 17500, payable: 17500 },
      { code: "HRA", label: "HRA", actual: 8750, payable: 8750 },
    ],
    deductions: [{ code: "PT", label: "P.T.", amount: 200 }],
    grossEarnings: 26250,
    grossDeductions: 200,
    netAmount: 26050,
    amountInWords: "Rupees Twenty Six Thousand Fifty Only",
    ...overrides,
  };
}

function buildEarningsTable(data: PayslipRenderData): string {
  // Custom templates that still use {{earnings}} / {{deductions}} get the Form IV-B tri-column block.
  return buildTriColumnTable(data);
}

function buildDeductionsTable(_data: PayslipRenderData): string {
  return "";
}

function buildEmployeeAndAttendance(data: PayslipRenderData): string {
  return buildEmployeeBlock(data);
}

function placeholderMap(data: PayslipRenderData): Record<string, string> {
  const period = `${String(data.month).padStart(2, "0")}/${data.year}`;
  const periodLabel = formatPeriodLabel(data.month, data.year);
  return {
    companyLogo: data.logoUrl ? `<img class="logo" src="${escapeHtml(data.logoUrl)}" alt="Company logo"/>` : "",
    companyName: escapeHtml(data.companyName),
    companyGstin: escapeHtml(displayOr(data.companyGstin, "Needs configuration")),
    companyAddress: escapeHtml(displayOr(data.companyAddress, "Needs configuration")),
    period: escapeHtml(period),
    periodLabel: escapeHtml(periodLabel),
    month: String(data.month),
    year: String(data.year),
    employeeCode: escapeHtml(data.employeeCode),
    employeeName: escapeHtml(data.employeeName),
    designation: escapeHtml(data.designation ?? ""),
    department: escapeHtml(data.department ?? ""),
    location: escapeHtml(data.location ?? ""),
    doj: escapeHtml(data.doj ?? ""),
    pfNumber: escapeHtml(data.pfNumber ?? ""),
    uan: escapeHtml(data.uan ?? ""),
    esiNumber: escapeHtml(data.esiNumber ?? ""),
    bankName: escapeHtml(data.bankName ?? ""),
    accountNumber: escapeHtml(data.accountNumber ?? ""),
    wd: String(data.working.wd ?? ""),
    wo: String(data.working.wo ?? ""),
    ph: String(data.working.ph ?? ""),
    pd: String(data.working.pd ?? ""),
    cl: String(data.working.cl ?? ""),
    pl: String(data.working.pl ?? ""),
    sl: String(data.working.sl ?? ""),
    lwp: String(data.working.lwp ?? ""),
    employeeAndAttendance: buildEmployeeAndAttendance(data),
    earnings: buildEarningsTable(data),
    deductions: buildDeductionsTable(data),
    grossEarnings: money(data.grossEarnings),
    grossDeductions: money(data.grossDeductions),
    netAmount: money(data.netAmount),
    amountInWords: escapeHtml(data.amountInWords),
  };
}

function applyPlaceholders(htmlBody: string, data: PayslipRenderData): string {
  const map = placeholderMap(data);
  return htmlBody.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) => {
    if (Object.prototype.hasOwnProperty.call(map, key)) {
      return map[key] ?? "";
    }
    return "";
  });
}

function wrapHtmlDocument(bodyHtml: string, cssBody?: string | null): string {
  const rawCss = (cssBody && cssBody.trim()) || DEFAULT_TEMPLATE_CSS;
  const css = rawCss.replace(/<\/style/gi, "<\\/style");
  const trimmed = bodyHtml.trim().replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");
  if (/^<!DOCTYPE/i.test(trimmed) || /^<html[\s>]/i.test(trimmed)) {
    if (css && !/<style[\s>]/i.test(trimmed)) {
      return trimmed.replace(/<\/head>/i, `<style>${css}</style></head>`);
    }
    return trimmed;
  }
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${css}</style></head><body>${trimmed}</body></html>`;
}

/** Renders custom template HTML with known placeholders; falls back to default layout when body is empty. */
export function renderPayslipHtmlFromTemplate(
  htmlBody: string | null | undefined,
  cssBody: string | null | undefined,
  data: PayslipRenderData,
): string {
  if (!htmlBody?.trim()) {
    return renderPayslipHtml(data);
  }
  return wrapHtmlDocument(applyPlaceholders(htmlBody, data), cssBody);
}

export function renderPayslipHtml(data: PayslipRenderData): string {
  const periodLabel = formatPeriodLabel(data.month, data.year);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${DEFAULT_TEMPLATE_CSS}</style></head><body>
  <div class="sheet">
    <div class="brand">
      ${data.logoUrl ? `<img class="logo" src="${escapeHtml(data.logoUrl)}" alt="Company logo"/>` : ""}
      <div>
        <div class="company-name">${escapeHtml(data.companyName)}</div>
        <div class="gstin">GSTIN : ${escapeHtml(displayOr(data.companyGstin, "Needs configuration"))}</div>
        <div class="address">${escapeHtml(displayOr(data.companyAddress, "Needs configuration"))}</div>
      </div>
    </div>
    <div class="title-block">
      <div class="period">Salary for the month of :- ${escapeHtml(periodLabel)}</div>
      <div class="slip-title">Salary Slip</div>
      <div class="form-rule">Form IV B [ Rule 26(2) (b) ]</div>
    </div>
    ${buildEmployeeBlock(data)}
    ${buildTriColumnTable(data)}
    <div class="net-row">
      <div class="words">${escapeHtml(data.amountInWords)}</div>
      <div class="net-box">Net Amount&nbsp;&nbsp;Rs. ${money(data.netAmount)}</div>
    </div>
    <p class="disclaimer">This is computer generated statement hence does not require a signature.</p>
  </div></body></html>`;
}
