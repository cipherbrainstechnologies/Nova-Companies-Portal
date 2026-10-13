import { requirePageUser } from "@/server/auth/page-guard";
import { ensureLegalTemplateLibrary } from "@/server/client/legal-document-service";
import { prisma } from "@/server/db";
import { AdminShell } from "@/components/admin-shell";
import { Card } from "@/components/ui";
import { TemplateActions } from "./template-actions";

export default async function LegalTemplatesPage() {
  await requirePageUser(["SUPER_ADMIN", "OPERATIONS_MANAGER"]);
  await ensureLegalTemplateLibrary();
  const templates = await prisma.legalTemplate.findMany({
    orderBy: [{ code: "asc" }, { version: "desc" }],
    include: { _count: { select: { documents: true } } },
  });

  return (
    <AdminShell title="Legal templates" description="Versioned client-agreement drafts. Only an approved version can be sent for signature.">
      <div className="space-y-4">
        {templates.map((template) => {
          const flags = Array.isArray(template.legalFlags) ? (template.legalFlags as string[]) : [];
          const variables = Array.isArray(template.requiredVariables) ? (template.requiredVariables as string[]) : [];
          return (
            <Card key={template.id} className="space-y-2 p-4">
              <h2 className="font-semibold">
                {template.name} · v{template.version}
              </h2>
              <p className="text-sm">Status {template.status} · Used by {template._count.documents} generated document(s)</p>
              <p className="text-sm">Required variables: {variables.join(", ")}</p>
              <ul className="list-disc pl-5 text-sm">
                {flags.map((flag) => (
                  <li key={flag}>{flag}</li>
                ))}
              </ul>
              <TemplateActions templateId={template.id} code={template.code} body={template.bodyMarkdown} status={template.status} />
            </Card>
          );
        })}
      </div>
    </AdminShell>
  );
}
