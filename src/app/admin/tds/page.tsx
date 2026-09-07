import { requirePageUser } from "@/server/auth/page-guard";
import { AdminShell } from "@/components/admin-shell";
import { AlertBanner } from "@/components/industrial";
import { t } from "@/i18n";
import { TDS_DISCLAIMER } from "@/server/tds/tds-engine";
import { TdsCalculatorForm } from "./calculator-form";

export default async function TdsPage() {
  const user = await requirePageUser(["SUPER_ADMIN", "OPERATIONS_MANAGER"]);
  return (
    <AdminShell
      title={t("en", "admin.tds")}
      description="Project estimated TDS from monthly taxable components. Results are estimates — not filed returns."
      userName={user.email ?? user.phone}
      userRole={user.globalRole}
    >
      <AlertBanner tone="warning">
        <p className="font-semibold">{t("en", "tds.disclaimer")}</p>
        <p className="mt-1 opacity-90">{TDS_DISCLAIMER}</p>
      </AlertBanner>
      <div className="mt-6">
        <TdsCalculatorForm />
      </div>
    </AdminShell>
  );
}
