"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";

const prospectingLinks = [
  {
    category: "Wedding Leads",
    links: [
      { label: "#DCwedding on Instagram", url: "https://www.instagram.com/explore/tags/dcwedding/" },
      { label: "#DMVbride on Instagram", url: "https://www.instagram.com/explore/tags/dmvbride/" },
      { label: "#MarylandWedding", url: "https://www.instagram.com/explore/tags/marylandwedding/" },
      { label: "Thumbtack - DC Photographers", url: "https://www.thumbtack.com/dc/washington/wedding-photographers/" },
    ],
  },
  {
    category: "Real Estate",
    links: [
      { label: "#DMVrealestate on Instagram", url: "https://www.instagram.com/explore/tags/dmvrealestate/" },
      { label: "#ColumbiaMaryland homes", url: "https://www.instagram.com/explore/tags/columbiamd/" },
      { label: "Zillow - Columbia MD", url: "https://www.zillow.com/columbia-md/" },
    ],
  },
  {
    category: "Corporate Events",
    links: [
      { label: "Eventbrite - DC Events", url: "https://www.eventbrite.com/d/dc--washington/events/" },
      { label: "Eventbrite - Baltimore Events", url: "https://www.eventbrite.com/d/md--baltimore/events/" },
      { label: "#DCevents on Instagram", url: "https://www.instagram.com/explore/tags/dcevents/" },
    ],
  },
  {
    category: "Architectural",
    links: [
      { label: "AIA DC Chapter", url: "https://aiadc.com/" },
      { label: "#DCarchitecture on Instagram", url: "https://www.instagram.com/explore/tags/dcarchitecture/" },
    ],
  },
];

export function ProspectingLinks() {
  return (
    <Card className="border-white/10 bg-surface">
      <CardHeader className="pb-3">
        <CardTitle className="font-heading text-lg text-white">
          Evening Prospecting
        </CardTitle>
        <p className="text-xs text-zinc-500">
          Quick links for your prospecting sessions
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {prospectingLinks.map((group) => (
          <div key={group.category}>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              {group.category}
            </p>
            <div className="space-y-1">
              {group.links.map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-zinc-400 transition-colors hover:bg-white/4 hover:text-zinc-200"
                >
                  <ExternalLink className="h-3 w-3 shrink-0 text-zinc-600" />
                  <span className="truncate">{link.label}</span>
                </a>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
