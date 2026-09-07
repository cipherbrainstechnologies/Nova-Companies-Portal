import { redirect } from "next/navigation";
import { requirePageUser } from "@/server/auth/page-guard";
import { employeeFacade } from "@/server/facades/employee-facade";

export default async function EmployeeDetailRedirectPage({
  params,
  searchParams,
}: {
  params: Promise<{ employeeId: string }>;
  searchParams: Promise<{ companyId?: string }>;
}) {
  await requirePageUser(["SUPER_ADMIN", "OPERATIONS_MANAGER"]);
  const { employeeId } = await params;
  const sp = await searchParams;
  const employee = await employeeFacade.getById(employeeId, sp.companyId);
  redirect(`/admin/companies/${employee.companyId}/employees/${employee.id}`);
}
