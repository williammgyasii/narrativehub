import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getLeads } from "@/lib/queries/leads";
import { getTemplates } from "@/lib/queries/outreach";
import { BulkComposeForm } from "./bulk-compose-form";

export default async function BulkOutreachPage() {
  const allLeads = await getLeads();
  const templates = await getTemplates();

  const leadsWithEmail = allLeads.filter((l) => l.email);

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
          Bulk Outreach
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Send personalized emails to multiple leads at once.
        </p>
      </div>

      <BulkComposeForm leads={leadsWithEmail} templates={templates} />
    </div>
  );
}
