import { PublicChrome } from "@/components/industrial";
import { PortalLoginForm } from "@/components/portal-login-form";
import { t } from "@/i18n";

export default function EmployeeLoginPage() {
  return (
    <PublicChrome brand={t("en", "brand")}>
      <PortalLoginForm portal="employee" />
    </PublicChrome>
  );
}
