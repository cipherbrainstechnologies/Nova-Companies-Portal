import type { ClientCapabilityAction, ClientCapabilityModule, ClientPortalRole } from "@prisma/client";

export type CapabilityKey = `${ClientCapabilityModule}:${ClientCapabilityAction}`;

const ALL_ACTIONS: ClientCapabilityAction[] = [
  "VIEW",
  "CREATE",
  "EDIT",
  "SUBMIT",
  "APPROVE",
  "DOWNLOAD",
  "INVITE",
  "MANAGE",
  "EXECUTE",
];

function caps(
  module: ClientCapabilityModule,
  actions: ClientCapabilityAction[],
): CapabilityKey[] {
  return actions.map((a) => `${module}:${a}` as CapabilityKey);
}

/** Default deny-by-default matrix; overrides may widen or narrow per membership. */
export const ROLE_CAPABILITY_MATRIX: Record<ClientPortalRole, CapabilityKey[]> = {
  OWNER_ADMIN: [
    ...caps("overview", ["VIEW", "MANAGE"]),
    ...caps("onboarding", ["VIEW", "EDIT", "SUBMIT", "DOWNLOAD"]),
    ...caps("team", ["VIEW", "CREATE", "EDIT", "SUBMIT", "DOWNLOAD"]),
    ...caps("payroll", ["VIEW", "SUBMIT", "APPROVE"]),
    ...caps("costs", ["VIEW", "DOWNLOAD"]),
    ...caps("invoices", ["VIEW", "DOWNLOAD", "APPROVE"]),
    ...caps("documents", ["VIEW", "DOWNLOAD", "EXECUTE"]),
    ...caps("approvals", ["VIEW", "APPROVE"]),
    ...caps("people", ["VIEW", "INVITE", "MANAGE"]),
    ...caps("settings", ["VIEW", "EDIT"]),
    ...caps("support", ["VIEW", "CREATE"]),
    ...caps("activity", ["VIEW", "DOWNLOAD"]),
    ...caps("leaveExpenses", ["VIEW", "CREATE", "APPROVE"]),
  ],
  HR_MANAGER: [
    ...caps("overview", ["VIEW"]),
    ...caps("onboarding", ["VIEW", "EDIT", "SUBMIT"]),
    ...caps("team", ["VIEW", "CREATE", "EDIT", "SUBMIT"]),
    ...caps("payroll", ["VIEW", "SUBMIT"]),
    ...caps("costs", ["VIEW"]),
    ...caps("documents", ["VIEW", "DOWNLOAD"]),
    ...caps("approvals", ["VIEW", "APPROVE"]),
    ...caps("people", ["VIEW"]),
    ...caps("settings", ["VIEW"]),
    ...caps("support", ["VIEW", "CREATE"]),
    ...caps("activity", ["VIEW"]),
    ...caps("leaveExpenses", ["VIEW", "CREATE", "APPROVE"]),
  ],
  FINANCE: [
    ...caps("overview", ["VIEW"]),
    ...caps("payroll", ["VIEW", "APPROVE"]),
    ...caps("costs", ["VIEW", "DOWNLOAD"]),
    ...caps("invoices", ["VIEW", "DOWNLOAD", "APPROVE"]),
    ...caps("approvals", ["VIEW", "APPROVE"]),
    ...caps("activity", ["VIEW"]),
  ],
  TEAM_MANAGER: [
    ...caps("overview", ["VIEW"]),
    ...caps("team", ["VIEW"]),
    ...caps("leaveExpenses", ["VIEW", "CREATE", "APPROVE"]),
    ...caps("approvals", ["VIEW", "APPROVE"]),
  ],
  READ_ONLY_AUDITOR: (
    [
      "overview:VIEW",
      "team:VIEW",
      "costs:VIEW",
      "invoices:VIEW",
      "documents:VIEW",
      "activity:VIEW",
      "costs:DOWNLOAD",
      "invoices:DOWNLOAD",
      "documents:DOWNLOAD",
      "activity:DOWNLOAD",
    ] as CapabilityKey[]
  ),
};

export function roleHasCapability(
  role: ClientPortalRole,
  module: ClientCapabilityModule,
  action: ClientCapabilityAction,
): boolean {
  const key = `${module}:${action}` as CapabilityKey;
  return ROLE_CAPABILITY_MATRIX[role].includes(key);
}
