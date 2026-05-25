import Link from "next/link";
import {
  MessageSquare,
  ArrowRight,
  ArrowUp,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { RedditLead } from "@/lib/db/schema";

function timeAgo(date: Date | string): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

interface RedditSummaryProps {
  leads: RedditLead[];
  newCount: number;
}

export function RedditSummary({ leads, newCount }: RedditSummaryProps) {
  return (
    <Card className="border-white/10 bg-surface">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <CardTitle className="font-heading text-lg text-white">
            Reddit
          </CardTitle>
          {newCount > 0 && (
            <Badge className="bg-gold/20 text-gold border-0 text-xs">
              {newCount} new
            </Badge>
          )}
        </div>
        <Button
          render={<Link href="/reddit" />}
          variant="ghost"
          size="sm"
          className="text-zinc-400 hover:text-gold"
        >
          View all
          <ArrowRight className="ml-1 h-3.5 w-3.5" />
        </Button>
      </CardHeader>
      <CardContent>
        {leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <MessageSquare className="mb-2 h-8 w-8 text-zinc-700" />
            <p className="text-xs text-zinc-500">No new Reddit opportunities</p>
            <Button
              render={<Link href="/reddit" />}
              variant="outline"
              size="sm"
              className="mt-3 border-white/10 text-zinc-400 hover:text-gold text-xs h-7"
            >
              Scan subreddits
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {leads.slice(0, 3).map((lead) => (
              <a
                key={lead.id}
                href={`https://reddit.com${lead.permalink}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-lg p-2 transition-colors hover:bg-white/4"
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <Badge
                    variant="outline"
                    className="shrink-0 border-orange-500/30 bg-orange-500/10 text-orange-400 text-[9px] px-1 py-0 h-4"
                  >
                    r/{lead.subreddit}
                  </Badge>
                  <span className="text-[10px] text-zinc-600 flex items-center gap-0.5">
                    <Clock className="h-2.5 w-2.5" />
                    {timeAgo(lead.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-zinc-200 line-clamp-1">
                  {lead.title}
                </p>
                <div className="mt-0.5 flex items-center gap-2 text-[10px] text-zinc-600">
                  <span>u/{lead.author}</span>
                  <span className="flex items-center gap-0.5">
                    <ArrowUp className="h-2.5 w-2.5" />
                    {lead.score}
                  </span>
                  <span className="flex items-center gap-0.5">
                    <MessageSquare className="h-2.5 w-2.5" />
                    {lead.numComments}
                  </span>
                </div>
              </a>
            ))}

            {leads.length > 3 && (
              <Link
                href="/reddit"
                className="block text-center text-xs text-zinc-500 hover:text-gold transition-colors pt-1"
              >
                + {leads.length - 3} more opportunities
              </Link>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
