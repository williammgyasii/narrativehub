import Link from "next/link";
import { Plus, Mail, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { DomainSetupBanner } from "@/components/domain-setup-banner";
import { FollowUpReminders } from "@/components/follow-up-reminders";
import { getOutreachLog, getOutreachStats } from "@/lib/queries/outreach";
import { OutreachTable } from "./outreach-table";

export default async function OutreachPage() {
  const [log, stats] = await Promise.all([
    getOutreachLog(),
    getOutreachStats(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Outreach"
        description="Cold emails sent and their status."
      >
        <div className="flex gap-2">
          <Button
            render={<Link href="/outreach/templates" />}
            variant="outline"
            size="sm"
            className="border-white/10 text-zinc-300 hover:bg-white/4"
          >
            Templates
          </Button>
          <Button
            render={<Link href="/outreach/bulk" />}
            variant="outline"
            size="sm"
            className="border-white/10 text-zinc-300 hover:bg-white/4"
          >
            <Users className="mr-1.5 h-4 w-4" />
            Bulk Send
          </Button>
          <Button
            render={<Link href="/outreach/compose" />}
            size="sm"
            className="bg-gold text-black hover:bg-gold-light"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Compose
          </Button>
        </div>
      </PageHeader>

      <DomainSetupBanner />

      {/* Stats */}
      {stats.total > 0 && (
        <div className="flex gap-2">
          {(
            [
              ["drafts", "Drafts", stats.drafts],
              ["sent", "Sent", stats.sent],
              ["opened", "Opened", stats.opened],
              ["replied", "Replied", stats.replied],
            ] as const
          ).map(([key, label, count]) => (
            <div
              key={key}
              className="rounded-lg border border-white/10 bg-surface px-3 py-2 text-center"
            >
              <p className="text-lg font-bold text-white">{count}</p>
              <p className="text-xs text-zinc-500">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Follow-up reminders */}
      <FollowUpReminders />

      {log.length === 0 ? (
        <EmptyState
          icon={Mail}
          title="No outreach yet"
          description="Compose personalized emails and send them to your leads."
        >
          <div className="flex gap-2">
            <Button
              render={<Link href="/outreach/templates" />}
              variant="outline"
              size="sm"
              className="border-white/10 text-zinc-300 hover:bg-white/4"
            >
              Create Templates
            </Button>
            <Button
              render={<Link href="/outreach/compose" />}
              size="sm"
              className="bg-gold text-black hover:bg-gold-light"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Compose Email
            </Button>
          </div>
        </EmptyState>
      ) : (
        <OutreachTable data={log} />
      )}
    </div>
  );
}
