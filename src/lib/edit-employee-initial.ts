export type EditEmployeeInitial = {
  firstName: string;
  lastName: string;
  displayName: string;
  designation: string;
  department: string;
  location: string;
  dateOfJoining: string;
  pan: string;
  pfNumber: string;
  uan: string;
  esiNumber: string;
  personalEmail: string;
  officialEmail: string;
  primaryPhone: string;
  alternatePhone: string;
  bankName: string;
  accountNumber: string;
  ifsc: string;
  accountHolderName: string;
};

function toDateInput(value: string | Date | null | undefined): string {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

/** Server-safe mapper — do not put this in a "use client" module. */
export function editEmployeeInitialFrom(employee: {
  firstName: string;
  lastName: string;
  displayName?: string | null;
  designation?: string | null;
  department?: string | null;
  location?: string | null;
  dateOfJoining?: Date | string | null;
  pan?: string | null;
  pfNumber?: string | null;
  uan?: string | null;
  esiNumber?: string | null;
  contact?: {
    personalEmail?: string | null;
    officialEmail?: string | null;
    primaryPhone?: string | null;
    alternatePhone?: string | null;
  } | null;
  bankAccount?: {
    bankName?: string | null;
    accountNumber?: string | null;
    ifsc?: string | null;
    accountHolderName?: string | null;
  } | null;
}): EditEmployeeInitial {
  return {
    firstName: employee.firstName,
    lastName: employee.lastName,
    displayName: employee.displayName ?? "",
    designation: employee.designation ?? "",
    department: employee.department ?? "",
    location: employee.location ?? "",
    dateOfJoining: toDateInput(employee.dateOfJoining),
    pan: employee.pan ?? "",
    pfNumber: employee.pfNumber ?? "",
    uan: employee.uan ?? "",
    esiNumber: employee.esiNumber ?? "",
    personalEmail: employee.contact?.personalEmail ?? "",
    officialEmail: employee.contact?.officialEmail ?? "",
    primaryPhone: employee.contact?.primaryPhone ?? "",
    alternatePhone: employee.contact?.alternatePhone ?? "",
    bankName: employee.bankAccount?.bankName ?? "",
    accountNumber: employee.bankAccount?.accountNumber ?? "",
    ifsc: employee.bankAccount?.ifsc ?? "",
    accountHolderName: employee.bankAccount?.accountHolderName ?? "",
  };
}
