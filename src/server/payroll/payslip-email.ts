/**
 * Payslip notification template. Salary figures never leave the portal by email — the
 * message only announces availability and links back to the authenticated download.
 */

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
];

export const PAYSLIP_EMAIL_SUBJECT = "Your payslip is available";

export type PayslipEmailInput = {
  companyName: string;
  employeeName: string;
  month: number;
  year: number;
  portalUrl?: string;
  resend?: boolean;
};

export type PayslipEmailMessage = {
  subject: string;
  text: string;
  html: string;
};

export function formatSalaryPeriod(month: number, year: number): string {
  const name = MONTH_NAMES[month - 1] ?? `Month ${month}`;
  return `${name} ${year}`;
}

/**
 * Detects currency symbols and money-shaped numbers (grouped thousands or paise).
 * A bare year such as `2026` is not money and must not trip this guard.
 */
export function containsSalaryAmount(text: string): boolean {
  return /₹|\bINR\b|\bRs\.?\s*\d|\b\d{1,3}(?:,\d{2,3})+(?:\.\d{1,2})?\b|\b\d+\.\d{2}\b/i.test(text);
}

export function assertNoSalaryAmounts(text: string): void {
  if (containsSalaryAmount(text)) {
    throw new Error("Payslip notification emails must not contain salary amounts");
  }
}

export function buildPayslipAvailableEmail(input: PayslipEmailInput): PayslipEmailMessage {
  const period = formatSalaryPeriod(input.month, input.year);
  const portalUrl =
    input.portalUrl ??
    process.env.APP_URL ??
    (process.env.RAILWAY_PUBLIC_DOMAIN
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : "");
  const subject = input.resend
    ? `${PAYSLIP_EMAIL_SUBJECT} (resent)`
    : PAYSLIP_EMAIL_SUBJECT;

  const lines = [
    `Hello ${input.employeeName},`,
    "",
    `Your payslip for ${period} from ${input.companyName} is available in the Nova Salary Portal.`,
    portalUrl
      ? `Sign in to view and download it: ${portalUrl}/employee/payslips`
      : "Sign in to the portal to view and download it.",
    "",
    "For your security this message does not include any salary figures. Amounts are only visible on the payslip after you sign in.",
  ];
  const text = lines.join("\n");

  const html = [
    `<p>Hello ${escapeHtml(input.employeeName)},</p>`,
    `<p>Your payslip for ${escapeHtml(period)} from ${escapeHtml(input.companyName)} is available in the Nova Salary Portal.</p>`,
    portalUrl
      ? `<p><a href="${escapeHtml(portalUrl)}/employee/payslips">Sign in to view and download it</a></p>`
      : "<p>Sign in to the portal to view and download it.</p>",
    "<p>For your security this message does not include any salary figures. Amounts are only visible on the payslip after you sign in.</p>",
  ].join("");

  assertNoSalaryAmounts(text);
  return { subject, text, html };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
