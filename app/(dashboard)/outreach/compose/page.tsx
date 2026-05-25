import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DomainSetupBanner } from "@/components/domain-setup-banner";
import { getLeads } from "@/lib/queries/leads";
import { getTemplates } from "@/lib/queries/outreach";
import { db } from "@/lib/db";
import { outreach } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getAuthUserOrNull } from "@/lib/auth/server";
import { ComposeMultiStep } from "./compose-form";

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
          render={<Link href="/outreach" />}
          variant="ghost"
          size="sm"
          className="mb-4 text-zinc-400 hover:text-white"
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back to Outreach
        </Button>
        <h1 className="font-heading text-3xl font-bold tracking-tight text-white">
          Compose Outreach
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Draft, refine with AI, and send a personalized email.
        </p>
      </div>

      <DomainSetupBanner />

      <ComposeMultiStep
        leads={leadsWithEmail}
        templates={templates}
        defaultLeadId={draftLeadId || params.leadId}
        defaultSubject={defaultSubject}
        defaultBody={defaultBody}
        draftId={params.draftId}
      />
    </div>
  );
}
