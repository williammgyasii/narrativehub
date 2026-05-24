import Link from "next/link";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { getLeads, getLeadStats } from "@/lib/queries/leads";
import { AddLeadDialog } from "./add-lead-dialog";
import { LeadsTable } from "./leads-table";

export default async function LeadsPage() {
  const allLeads = await getLeads();
  const stats = await getLeadStats();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leads"
        description={`${stats.total} total leads in your pipeline`}
      >
        <AddLeadDialog />
      </PageHeader>

      {/* Pipeline Stats */}
      {stats.total > 0 && (
        <div className="flex gap-2">
          {(
            [
              ["new", "New"],
              ["contacted", "Contacted"],
              ["responded", "Responded"],
              ["booked", "Booked"],
              ["closed", "Closed"],
            ] as const
          ).map(([key, label]) => (
            <div
              key={key}
              className="rounded-lg border border-white/10 bg-surface px-3 py-2 text-center"
            >
              <p className="text-lg font-bold text-white">
                {stats.byStatus[key] || 0}
              </p>
              <p className="text-xs text-zinc-500">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Leads Table or Empty State */}
      {allLeads.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No leads yet"
          description="Add your first lead manually or discover new ones with Lead Finder."
        >
          <div className="flex gap-2">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="border-white/10 text-zinc-300 hover:bg-white/4"
            >
              <Link href="/lead-finder">Find Leads</Link>
            </Button>
          </div>
        </EmptyState>
      ) : (
        <LeadsTable data={allLeads} />
      )}
    </div>
  );
}
