import { AlertBanner } from "@/components/industrial";
import { t } from "@/i18n";
import { TDS_DISCLAIMER } from "@/server/tds/tds-engine";
import { TdsCalculatorForm } from "@/app/admin/tds/calculator-form";

export default async function CompanyTdsPage() {
  return (
    <div>
      <AlertBanner tone="warning">
        <p className="font-semibold">{t("en", "tds.disclaimer")}</p>
        <p className="mt-1 opacity-90">{TDS_DISCLAIMER}</p>
      </AlertBanner>
      <div className="mt-6">
        <TdsCalculatorForm />
      </div>
    </div>
  );
}
