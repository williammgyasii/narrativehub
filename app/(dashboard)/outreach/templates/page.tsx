import Link from "next/link";
import { Plus, FileText, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { LeadTypeBadge } from "@/components/lead-type-badge";
import { getTemplates } from "@/lib/queries/outreach";
import { deleteTemplate } from "@/lib/actions/outreach";
import { TemplateDialog } from "./template-dialog";

export default async function TemplatesPage() {
  const templates = await getTemplates();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Email Templates"
        description="Reusable outreach templates for each shoot type."
      >
        <TemplateDialog />
      </PageHeader>

      {templates.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No templates yet"
          description="Create reusable email templates with variable placeholders like {{name}} and {{business}}."
        >
          <TemplateDialog />
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {templates.map((template) => {
            const deleteAction = async () => {
              "use server";
              await deleteTemplate(template.id);
            };

            return (
              <Card
                key={template.id}
                className="border-white/10 bg-surface"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base text-white">
                        {template.name}
                      </CardTitle>
                      <LeadTypeBadge type={template.leadType} />
                    </div>
                    <form action={deleteAction}>
                      <Button
                        type="submit"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-zinc-600 hover:text-red-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </form>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm font-medium text-zinc-300">
                    Subject: {template.subject}
                  </p>
                  <p className="line-clamp-3 text-xs text-zinc-500">
                    {template.body}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
