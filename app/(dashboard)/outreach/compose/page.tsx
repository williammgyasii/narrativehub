import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ComposeForm } from "./compose-form";
import { DomainSetupBanner } from "@/components/domain-setup-banner";
import { getLeads } from "@/lib/queries/leads";
import { getTemplates } from "@/lib/queries/outreach";
import { db } from "@/lib/db";
import { outreach } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getAuthUserOrNull } from "@/lib/auth/server";

export default async function ComposePage({
  searchParams,
}: {
  searchParams: Promise<{ leadId?: string; draftId?: string }>;
}) {
  const params = await searchParams;
  const allLeads = await getLeads();
  const templates = await getTemplates();

  const leadsWithEmail = allLeads.filter((l) => l.email);

  let defaultSubject: string | undefined;
  let defaultBody: string | undefined;
  let draftLeadId: string | undefined;

  if (params.draftId) {
    const userId = await getAuthUserOrNull();
    if (userId) {
      const [draft] = await db
        .select()
        .from(outreach)
        .where(
          and(
            eq(outreach.id, params.draftId),
            eq(outreach.userId, userId),
            eq(outreach.status, "draft")
          )
        );
      if (draft) {
        defaultSubject = draft.subject;
        defaultBody = draft.body;
        draftLeadId = draft.leadId;
      }
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="mb-4 text-zinc-400 hover:text-white"
        >
          <Link href="/outreach">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back to Outreach
          </Link>
        </Button>
        <h1 className="font-heading text-3xl font-bold tracking-tight text-white">
          Compose Outreach
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Send a personalized email to a lead.
        </p>
      </div>

      <DomainSetupBanner />

      <Card className="border-white/10 bg-surface max-w-2xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-zinc-400">
            Email Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ComposeForm
            leads={leadsWithEmail}
            templates={templates}
            defaultLeadId={draftLeadId || params.leadId}
            defaultSubject={defaultSubject}
            defaultBody={defaultBody}
            draftId={params.draftId}
          />
        </CardContent>
      </Card>
    </div>
  );
}
