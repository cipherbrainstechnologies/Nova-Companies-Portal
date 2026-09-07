/**
 * Back-compatible entry point for statement match suggestion generation.
 *
 * The implementation now lives with the rest of the reconciliation pipeline in
 * `reconciliation-automation.ts`; this module is kept so existing importers keep working.
 */
export { generateStatementMatchSuggestions } from "@/server/payroll/reconciliation-automation";
