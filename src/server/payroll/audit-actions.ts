/**
 * Canonical audit action names for the payroll automation pipeline. Every automated or
 * reviewed state change writes one of these so the audit log can be filtered by stage:
 * match → approve → issue → email.
 */
export const PAYROLL_AUDIT_ACTIONS = {
  matchSuggest: "reconciliation.match_suggest",
  matchAutoApply: "reconciliation.match_auto_apply",
  reviewApprove: "reconciliation.review_approve",
  reviewReject: "reconciliation.review_reject",
  reviewMap: "reconciliation.review_map",
  reviewIgnore: "reconciliation.review_ignore",
  reviewNonPayroll: "reconciliation.review_non_payroll",
  salaryStructureUpsert: "employee.salary_structure_upsert",
  payrollIssueApproved: "payroll.issue_approved_only",
  payslipEmailQueued: "payslip.email_queued",
  payslipEmailSent: "payslip.email_sent",
  payslipEmailFailed: "payslip.email_failed",
  payslipEmailResend: "payslip.email_resend",
} as const;

export type PayrollAuditAction =
  (typeof PAYROLL_AUDIT_ACTIONS)[keyof typeof PAYROLL_AUDIT_ACTIONS];

export const PAYROLL_AUDIT_STAGES = {
  match: [
    PAYROLL_AUDIT_ACTIONS.matchSuggest,
    PAYROLL_AUDIT_ACTIONS.matchAutoApply,
    PAYROLL_AUDIT_ACTIONS.reviewMap,
  ],
  approve: [
    PAYROLL_AUDIT_ACTIONS.reviewApprove,
    PAYROLL_AUDIT_ACTIONS.reviewReject,
    PAYROLL_AUDIT_ACTIONS.reviewIgnore,
    PAYROLL_AUDIT_ACTIONS.reviewNonPayroll,
  ],
  issue: [PAYROLL_AUDIT_ACTIONS.payrollIssueApproved],
  email: [
    PAYROLL_AUDIT_ACTIONS.payslipEmailQueued,
    PAYROLL_AUDIT_ACTIONS.payslipEmailSent,
    PAYROLL_AUDIT_ACTIONS.payslipEmailFailed,
    PAYROLL_AUDIT_ACTIONS.payslipEmailResend,
  ],
} as const satisfies Record<string, readonly PayrollAuditAction[]>;
