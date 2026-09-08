-- Persist preview-resolved company IDs so confirm uses the same employer match.
ALTER TABLE "EmployeeImportRow" ADD COLUMN "resolvedCompanyId" TEXT;
ALTER TABLE "EmployeeImportRow" ADD COLUMN "parsedJson" JSONB;

CREATE INDEX "EmployeeImportRow_resolvedCompanyId_idx" ON "EmployeeImportRow"("resolvedCompanyId");

ALTER TABLE "EmployeeImportRow"
ADD CONSTRAINT "EmployeeImportRow_resolvedCompanyId_fkey"
FOREIGN KEY ("resolvedCompanyId") REFERENCES "Company"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
