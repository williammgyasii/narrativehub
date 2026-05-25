import Link from "next/link";
import {
  Users,
  CalendarDays,
  DollarSign,
  Mail,
  Plus,
  Search,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/stat-card";
import { ProspectingLinks } from "@/components/prospecting-links";
import { FollowUpReminders } from "@/components/follow-up-reminders";
import { RedditSummary } from "@/components/reddit-summary";
import { LeadTypeBadge } from "@/components/lead-type-badge";
import { LeadStatusBadge } from "@/components/lead-status-badge";
import { getLeadStats, getRecentLeads } from "@/lib/queries/leads";
import { getUpcomingEvents } from "@/lib/queries/events";
import { getRedditLeads, getNewRedditLeadsCount } from "@/lib/queries/reddit";
import { formatDate, formatCurrency, formatRelativeDate } from "@/lib/format";

export default async function DashboardPage() {
  const [stats, recentLeads, upcomingEvents, redditLeads, redditNewCount] =
    await Promise.all([
      getLeadStats(),
      getRecentLeads(5),
      getUpcomingEvents(5),
      getRedditLeads("new"),
      getNewRedditLeadsCount(),
    ]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Your photography business at a glance.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="border-white/10 bg-transparent text-zinc-300 hover:bg-white/4 hover:text-white"
          >
            <Link href="/lead-finder">
              <Search className="mr-1.5 h-4 w-4" />
              Find Leads
            </Link>
          </Button>
          <Button
            asChild
            size="sm"
            className="bg-gold text-black hover:bg-gold-light"
          >
            <Link href="/leads?new=true">
              <Plus className="mr-1.5 h-4 w-4" />
              Add Lead
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Leads"
          value={stats.total}
          subtitle={`${stats.byStatus["booked"] || 0} booked`}
          icon={Users}
        />
        <StatCard
          title="Upcoming Events"
          value={upcomingEvents.length}
          subtitle="Next 30 days"
          icon={CalendarDays}
        />
        <StatCard
          title="Pipeline"
          value={stats.byStatus["new"] || 0}
          subtitle="New leads to contact"
          icon={Mail}
        />
        <StatCard
          title="Responded"
          value={stats.byStatus["responded"] || 0}
          subtitle="Waiting for booking"
          icon={DollarSign}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Upcoming Events */}
          <Card className="border-white/10 bg-surface">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="font-heading text-lg text-white">
                Upcoming Events
              </CardTitle>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="text-zinc-400 hover:text-gold"
              >
                <Link href="/events">
                  View all
                  <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {upcomingEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <CalendarDays className="mb-3 h-10 w-10 text-zinc-700" />
                  <p className="text-sm text-zinc-500">No upcoming events</p>
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="mt-4 border-white/10 text-zinc-300 hover:bg-white/4"
                  >
                    <Link href="/events/new">Schedule an Event</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {upcomingEvents.map((event) => (
                    <Link
                      key={event.id}
                      href={`/events/${event.id}`}
                      className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-white/4"
                    >
                      <div className="flex h-10 w-10 flex-col items-center justify-center rounded-lg bg-gold/10 text-gold">
                        <span className="text-[10px] font-medium leading-none">
                          {new Date(event.eventDate).toLocaleDateString(
                            "en-US",
                            { month: "short" }
                          )}
                        </span>
                        <span className="text-sm font-bold leading-none">
                          {new Date(event.eventDate).getDate()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {event.title}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {event.location || "No location"}
                        </p>
                      </div>
                      <span className="text-xs text-zinc-500">
                        {formatRelativeDate(event.eventDate)}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Leads */}
          <Card className="border-white/10 bg-surface">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="font-heading text-lg text-white">
                Recent Leads
              </CardTitle>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="text-zinc-400 hover:text-gold"
              >
                <Link href="/leads">
                  View all
                  <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {recentLeads.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Users className="mb-3 h-10 w-10 text-zinc-700" />
                  <p className="text-sm text-zinc-500">No leads yet</p>
                  <Button
                    asChild
                    size="sm"
                    className="mt-4 bg-gold text-black hover:bg-gold-light"
                  >
                    <Link href="/lead-finder">
                      <Search className="mr-1.5 h-4 w-4" />
                      Find Leads
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentLeads.map((lead) => (
                    <Link
                      key={lead.id}
                      href={`/leads/${lead.id}`}
                      className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-white/4"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-white truncate">
                            {lead.name}
                          </p>
                          <LeadTypeBadge type={lead.leadType} />
                        </div>
                        <p className="text-xs text-zinc-500 truncate">
                          {lead.businessName || lead.email || "No details"}
                        </p>
                      </div>
                      <LeadStatusBadge status={lead.status} />
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Reddit Summary */}
          <RedditSummary
            leads={redditLeads}
            newCount={redditNewCount}
          />

          {/* Follow-up Reminders */}
          <FollowUpReminders limit={3} />

          {/* Quick Actions */}
          <Card className="border-white/10 bg-surface">
            <CardHeader className="pb-3">
              <CardTitle className="font-heading text-lg text-white">
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              <Button
                asChild
                variant="outline"
                className="h-auto flex-col gap-2 border-white/10 py-4 text-zinc-300 hover:border-gold/30 hover:bg-gold/5 hover:text-gold"
              >
                <Link href="/leads?new=true">
                  <Plus className="h-5 w-5" />
                  <span className="text-xs">Add Lead</span>
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-auto flex-col gap-2 border-white/10 py-4 text-zinc-300 hover:border-gold/30 hover:bg-gold/5 hover:text-gold"
              >
                <Link href="/events/new">
                  <CalendarDays className="h-5 w-5" />
                  <span className="text-xs">New Event</span>
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-auto flex-col gap-2 border-white/10 py-4 text-zinc-300 hover:border-gold/30 hover:bg-gold/5 hover:text-gold"
              >
                <Link href="/outreach/compose">
                  <Mail className="h-5 w-5" />
                  <span className="text-xs">Outreach</span>
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-auto flex-col gap-2 border-white/10 py-4 text-zinc-300 hover:border-gold/30 hover:bg-gold/5 hover:text-gold"
              >
                <Link href="/lead-finder">
                  <Search className="h-5 w-5" />
                  <span className="text-xs">Find Leads</span>
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Prospecting Links */}
          <ProspectingLinks />
        </div>
      </div>
    </div>
  );
}
