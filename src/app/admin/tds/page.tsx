import { requirePageUser } from "@/server/auth/page-guard";
import { AdminShell } from "@/components/admin-shell";
import { Card } from "@/components/ui";
import { t } from "@/i18n";
import { TDS_DISCLAIMER } from "@/server/tds/tds-engine";
import { TdsCalculatorForm } from "./calculator-form";

export default async function TdsPage() {
  await requirePageUser(["SUPER_ADMIN", "OPERATIONS_MANAGER"]);
  return (
    <AdminShell title={t("en", "admin.tds")}>
      <Card>
        <p className="text-sm text-[var(--muted)]">{t("en", "tds.disclaimer")}</p>
        <p className="mt-2 text-xs text-[var(--muted)]">{TDS_DISCLAIMER}</p>
      </Card>
      <div className="mt-6">
        <TdsCalculatorForm />
      </div>
    </AdminShell>
  );
}
