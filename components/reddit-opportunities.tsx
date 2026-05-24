"use client";

import { useState, useTransition } from "react";
import {
  MessageSquare,
  ArrowUpRight,
  Loader2,
  RefreshCw,
  X,
  UserPlus,
  ArrowUp,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  dismissRedditLead,
  saveRedditLeadAsLead,
  triggerRedditScan,
} from "@/lib/actions/reddit";
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

interface RedditOpportunitiesProps {
  leads: RedditLead[];
  newCount: number;
}

export function RedditOpportunities({
  leads,
  newCount,
}: RedditOpportunitiesProps) {
  const [isPending, startTransition] = useTransition();
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  const visibleLeads = leads.filter((l) => !hiddenIds.has(l.id));

  function handleScan() {
    setScanning(true);
    setScanResult(null);
    startTransition(async () => {
      try {
        const result = await triggerRedditScan();
        setScanResult(
          `Found ${result.newFound} new post${result.newFound !== 1 ? "s" : ""} (scanned ${result.scanned})`
        );
      } catch {
        setScanResult("Scan failed. Try again.");
      } finally {
        setScanning(false);
      }
    });
  }

  function handleDismiss(id: string) {
    setHiddenIds((prev) => new Set(prev).add(id));
    startTransition(async () => {
      await dismissRedditLead(id);
    });
  }

  function handleSave(id: string) {
    setSavedIds((prev) => new Set(prev).add(id));
    startTransition(async () => {
      await saveRedditLeadAsLead(id);
    });
  }

  return (
    <Card className="border-white/10 bg-surface">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <CardTitle className="font-heading text-lg text-white">
            Reddit Opportunities
          </CardTitle>
          {newCount > 0 && (
            <Badge className="bg-gold/20 text-gold border-0 text-xs">
              {newCount} new
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-zinc-400 hover:text-gold"
          onClick={handleScan}
          disabled={scanning || isPending}
        >
          {scanning ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          )}
          {scanning ? "Scanning..." : "Scan Now"}
        </Button>
      </CardHeader>
      <CardContent>
        {scanResult && (
          <div className="mb-3 rounded-lg bg-gold/10 px-3 py-2 text-xs text-gold">
            {scanResult}
          </div>
        )}

        {visibleLeads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <MessageSquare className="mb-3 h-10 w-10 text-zinc-700" />
            <p className="text-sm text-zinc-500">No Reddit leads yet</p>
            <p className="mt-1 text-xs text-zinc-600">
              Click &quot;Scan Now&quot; to search DMV subreddits
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleLeads.slice(0, 8).map((lead) => (
              <div
                key={lead.id}
                className="group rounded-lg border border-white/5 bg-white/2 p-3 transition-colors hover:border-white/10"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge
                        variant="outline"
                        className="shrink-0 border-orange-500/30 bg-orange-500/10 text-orange-400 text-[10px] px-1.5"
                      >
                        r/{lead.subreddit}
                      </Badge>
                      <span className="text-[10px] text-zinc-600 flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" />
                        {timeAgo(lead.createdAt)}
                      </span>
                    </div>
                    <a
                      href={`https://reddit.com${lead.permalink}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-white hover:text-gold transition-colors line-clamp-2"
                    >
                      {lead.title}
                    </a>
                    <div className="mt-1 flex items-center gap-3 text-[10px] text-zinc-500">
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
                  </div>
                </div>

                <div className="mt-2 flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs text-zinc-400 hover:text-gold hover:bg-gold/10"
                    onClick={() => handleSave(lead.id)}
                    disabled={savedIds.has(lead.id) || isPending}
                  >
                    {savedIds.has(lead.id) ? (
                      <>Saved</>
                    ) : (
                      <>
                        <UserPlus className="mr-1 h-3 w-3" />
                        Save as Lead
                      </>
                    )}
                  </Button>
                  <a
                    href={`https://reddit.com${lead.permalink}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs text-zinc-400 hover:text-white hover:bg-white/5"
                    >
                      <ArrowUpRight className="mr-1 h-3 w-3" />
                      Open
                    </Button>
                  </a>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs text-zinc-400 hover:text-red-400 hover:bg-red-500/10 ml-auto"
                    onClick={() => handleDismiss(lead.id)}
                    disabled={isPending}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}

            {visibleLeads.length > 8 && (
              <p className="text-center text-xs text-zinc-600">
                + {visibleLeads.length - 8} more opportunities
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
