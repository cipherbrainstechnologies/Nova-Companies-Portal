export const EMPLOYEE_DOCUMENT_FOLDERS = [
  {
    id: "OFFER_AND_CONTRACT" as const,
    label: "Offer Letter and Contract",
  },
  {
    id: "KYC_AND_DOCUMENTS" as const,
    label: "KYC and Documents",
  },
  {
    id: "SALARY_SLIPS" as const,
    label: "Salary Slips",
  },
];

export type EmployeeDocumentFolderId = (typeof EMPLOYEE_DOCUMENT_FOLDERS)[number]["id"];
