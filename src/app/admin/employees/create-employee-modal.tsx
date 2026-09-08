"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { Modal } from "@/components/modal";
import { CreateEmployeeForm } from "./create-form";
import { t } from "@/i18n";

export function ModalTriggerCreateEmployee({ companyId }: { companyId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        {t("en", "admin.addEmployee")}
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t("en", "admin.addEmployee")}
        description="Creates the employee record, portal login, and optional starting salary structure."
        wide
      >
        <CreateEmployeeForm companyId={companyId} />
      </Modal>
    </>
  );
}
