"use client";

import {
  ExternalLink,
  Heart,
  Building2,
  Home,
  Landmark,
  Camera,
  Search,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const prospectingCategories = [
  {
    title: "Wedding",
    description: "Find venues, planners, and engaged couples in the DMV area",
    icon: Heart,
    color: "text-pink-400",
    bgColor: "bg-pink-400/10",
    links: [
      {
        label: "The Knot — DMV Venues",
        url: "https://www.theknot.com/marketplace/wedding-reception-venues-washington-dc",
        description: "Browse wedding venues looking for vendor partners",
      },
      {
        label: "WeddingWire — DC Vendors",
        url: "https://www.weddingwire.com/c/dc-district-of-columbia/wedding-photographers/11-vendors.html",
        description: "Scope the competition and find venue contacts",
      },
      {
        label: "#DCwedding on Instagram",
        url: "https://www.instagram.com/explore/tags/dcwedding/",
        description: "Find engaged couples and local wedding vendors",
      },
      {
        label: "#DMVbride on Instagram",
        url: "https://www.instagram.com/explore/tags/dmvbride/",
        description: "Connect with brides planning DMV weddings",
      },
      {
        label: "#MarylandWedding on Instagram",
        url: "https://www.instagram.com/explore/tags/marylandwedding/",
        description: "Maryland-specific wedding content and venues",
      },
      {
        label: "Thumbtack — DC Photographers",
        url: "https://www.thumbtack.com/dc/washington/wedding-photographers/",
        description: "See pricing benchmarks and lead flow",
      },
    ],
  },
  {
    title: "Corporate Events",
    description: "Discover conferences, galas, and corporate event planners",
    icon: Building2,
    color: "text-blue-400",
    bgColor: "bg-blue-400/10",
    links: [
      {
        label: "Eventbrite — DC Events",
        url: "https://www.eventbrite.com/d/dc--washington/events/",
        description: "Browse upcoming corporate and networking events",
      },
      {
        label: "Eventbrite — Baltimore Events",
        url: "https://www.eventbrite.com/d/md--baltimore/events/",
        description: "Find Baltimore-area corporate events",
      },
      {
        label: "DC Chamber of Commerce",
        url: "https://www.dcchamber.org/events",
        description: "Chamber events often need photographers",
      },
      {
        label: "LinkedIn Events — DC",
        url: "https://www.linkedin.com/search/results/events/?keywords=washington%20dc",
        description: "Professional networking events and conferences",
      },
      {
        label: "#DCevents on Instagram",
        url: "https://www.instagram.com/explore/tags/dcevents/",
        description: "Local event organizers and venue managers",
      },
      {
        label: "Greater Baltimore Committee",
        url: "https://gbc.org/events/",
        description: "Baltimore business community events",
      },
    ],
  },
  {
    title: "Real Estate",
    description: "Find agents, brokerages, and property listings needing photos",
    icon: Home,
    color: "text-emerald-400",
    bgColor: "bg-emerald-400/10",
    links: [
      {
        label: "Zillow — Columbia, MD",
        url: "https://www.zillow.com/columbia-md/",
        description: "Active listings — agents with bad photos need you",
      },
      {
        label: "Zillow — Agent Finder DC",
        url: "https://www.zillow.com/professionals/real-estate-agent-reviews/washington-dc/",
        description: "Find top agents who might need a photographer",
      },
      {
        label: "Realtor.com — Maryland",
        url: "https://www.realtor.com/realestateagents/maryland",
        description: "Browse Maryland real estate agent profiles",
      },
      {
        label: "#DMVrealestate on Instagram",
        url: "https://www.instagram.com/explore/tags/dmvrealestate/",
        description: "Connect with local real estate professionals",
      },
      {
        label: "#ColumbiaMaryland on Instagram",
        url: "https://www.instagram.com/explore/tags/columbiamd/",
        description: "Local community and real estate content",
      },
      {
        label: "Bright MLS",
        url: "https://www.brightmls.com/",
        description: "Mid-Atlantic MLS — see listing quality in your area",
      },
    ],
  },
  {
    title: "Architectural",
    description: "Connect with architecture firms, designers, and developers",
    icon: Landmark,
    color: "text-amber-400",
    bgColor: "bg-amber-400/10",
    links: [
      {
        label: "AIA DC Chapter",
        url: "https://aiadc.com/",
        description: "Local AIA chapter with firm directory",
      },
      {
        label: "AIA Baltimore",
        url: "https://aiabalt.com/",
        description: "Baltimore architecture community and events",
      },
      {
        label: "Houzz — DC Architects",
        url: "https://www.houzz.com/professionals/architect/dc",
        description: "Find architecture and design firms",
      },
      {
        label: "#DCarchitecture on Instagram",
        url: "https://www.instagram.com/explore/tags/dcarchitecture/",
        description: "DC architectural projects and firms",
      },
      {
        label: "Architect Magazine — Firms",
        url: "https://www.architectmagazine.com/firms",
        description: "National directory of architecture firms",
      },
      {
        label: "Interior Design — DC",
        url: "https://www.houzz.com/professionals/interior-designer/washington-dc",
        description: "Interior designers who need project photography",
      },
    ],
  },
];

export function ManualProspecting() {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-dashed border-white/10 bg-white/2 p-4">
        <div className="flex items-start gap-3">
          <Search className="mt-0.5 h-5 w-5 shrink-0 text-zinc-500" />
          <div>
            <p className="text-sm font-medium text-zinc-200">
              Evening Prospecting Links
            </p>
            <p className="mt-0.5 text-xs text-zinc-500">
              Curated links for your prospecting sessions. Open in new tabs,
              find potential clients, then come back and add them as leads.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {prospectingCategories.map((category) => (
          <Card key={category.title} className="border-white/10 bg-surface">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2.5">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg",
                    category.bgColor
                  )}
                >
                  <category.icon className={cn("h-4 w-4", category.color)} />
                </div>
                <div>
                  <CardTitle className="text-base text-white">
                    {category.title}
                  </CardTitle>
                  <p className="text-xs text-zinc-500">
                    {category.description}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-1 pt-0">
              {category.links.map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-start gap-2.5 rounded-md px-2 py-2 transition-colors hover:bg-white/4"
                >
                  {link.url.includes("instagram.com") ? (
                    <Camera className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-600 group-hover:text-pink-400" />
                  ) : (
                    <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-600 group-hover:text-zinc-400" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-300 group-hover:text-white">
                      {link.label}
                    </p>
                    <p className="text-xs text-zinc-600 group-hover:text-zinc-500">
                      {link.description}
                    </p>
                  </div>
                </a>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
