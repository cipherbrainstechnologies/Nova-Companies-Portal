import { requirePageUser } from "@/server/auth/page-guard";
import { AdminShell } from "@/components/admin-shell";
import { Card } from "@/components/ui";
import { Meta } from "@/components/industrial";
import { t } from "@/i18n";
import { TDS_DISCLAIMER } from "@/server/tds/tds-engine";
import { TdsCalculatorForm } from "./calculator-form";

export default async function TdsPage() {
  await requirePageUser(["SUPER_ADMIN", "OPERATIONS_MANAGER"]);
  return (
    <AdminShell title={t("en", "admin.tds")} kicker="TAX / PROJECTION">
      <Card className="bg-[var(--bg-alt)]">
        <Meta className="block text-[var(--accent)]">{'/// '} {t("en", "tds.disclaimer")}</Meta>
        <Meta className="mt-2 block normal-case tracking-[0.04em] text-[var(--muted)]">
          {TDS_DISCLAIMER}
        </Meta>
      </Card>
      <div className="mt-6">
        <TdsCalculatorForm />
      </div>
    </AdminShell>
  );
}
