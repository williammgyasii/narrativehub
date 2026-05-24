import Link from "next/link";
import { Clock, Mail, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getFollowUpReminders } from "@/lib/queries/outreach";
import { formatRelativeDate } from "@/lib/format";

export async function FollowUpReminders({ limit }: { limit?: number }) {
  const reminders = await getFollowUpReminders(5);
  const display = limit ? reminders.slice(0, limit) : reminders;

  if (display.length === 0) return null;

  return (
    <Card className="border-white/10 bg-surface">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 font-heading text-lg text-white">
          <Clock className="h-4 w-4 text-amber-400" />
          Follow-up Needed
        </CardTitle>
        {reminders.length > (limit || Infinity) && (
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="text-zinc-400 hover:text-gold"
          >
            <Link href="/outreach">
              View all
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {display.map((entry) => {
          const daysSince = entry.outreach.sentAt
            ? Math.floor(
                (Date.now() - new Date(entry.outreach.sentAt).getTime()) /
                  (1000 * 60 * 60 * 24)
              )
            : 0;

          return (
            <div
              key={entry.outreach.id}
              className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-white/4"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {entry.leadName || "Unknown"}
                </p>
                <p className="text-xs text-zinc-500 truncate">
                  &quot;{entry.outreach.subject}&quot; — sent{" "}
                  {entry.outreach.sentAt
                    ? formatRelativeDate(entry.outreach.sentAt)
                    : "unknown"}
                </p>
              </div>
              <Badge
                variant="outline"
                className="border-amber-500/20 text-amber-400 shrink-0"
              >
                {daysSince}d ago
              </Badge>
              {entry.leadEmail && (
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="border-white/10 text-zinc-400 hover:border-gold/30 hover:text-gold shrink-0"
                >
                  <Link
                    href={`/outreach/compose?leadId=${entry.leadId}`}
                  >
                    <Mail className="mr-1 h-3 w-3" />
                    Follow up
                  </Link>
                </Button>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
