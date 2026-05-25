import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Mail,
  Phone,
  Building2,
  CalendarDays,
  Trash2,
  Globe,
  Clock,
  Send,
  Eye,
  MessageSquare,
  MapPin,
  ExternalLink,
  Inbox,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LeadTypeBadge } from "@/components/lead-type-badge";
import { LeadStatusSelect } from "@/components/lead-status-select";
import { QuickComposeDialog } from "@/components/quick-compose-dialog";
import { BookEventSheet } from "@/components/book-event-sheet";
import { LeadForm } from "@/components/lead-form";
import { getLeadById } from "@/lib/queries/leads";
import {
  getOutreachByLeadId,
  getConversationByLeadId,
} from "@/lib/queries/outreach";
import { getEventsByLeadId } from "@/lib/queries/events";
import { deleteLead } from "@/lib/actions/leads";
import { formatDate, formatRelativeDate } from "@/lib/format";

const statusColors: Record<string, string> = {
  draft: "border-zinc-500/20 bg-zinc-500/10 text-zinc-400",
  sent: "border-blue-500/20 bg-blue-500/10 text-blue-400",
  opened: "border-amber-500/20 bg-amber-500/10 text-amber-400",
  replied: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
  bounced: "border-red-500/20 bg-red-500/10 text-red-400",
};

const statusIcons: Record<string, typeof Send> = {
  draft: Clock,
  sent: Send,
  opened: Eye,
  replied: MessageSquare,
};

const sourceLabels: Record<string, string> = {
  manual: "Manual",
  google_places: "Google Places",
  eventbrite: "Eventbrite",
  hunter: "Hunter.io",
  reddit: "Reddit",
  theknot: "The Knot",
  referral: "Referral",
  website: "Website",
  social_media: "Social Media",
};

function extractFromNotes(notes: string) {
  const website = notes.match(/Website:\s*(https?:\/\/[^\s\n]+)/i)?.[1];
  const address = notes.match(/Address:\s*(.+)/i)?.[1];
  const facebook = notes.match(/Facebook:\s*(https?:\/\/[^\s\n]+)/i)?.[1];
  const instagram = notes.match(/Instagram:\s*(https?:\/\/[^\s\n]+)/i)?.[1];
  const eventbrite = notes.match(/Eventbrite:\s*(https?:\/\/[^\s\n]+)/i)?.[1];
  return { website, address, facebook, instagram, eventbrite };
}

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [lead, outreachHistory, linkedEvents, conversation] =
    await Promise.all([
      getLeadById(id),
      getOutreachByLeadId(id),
      getEventsByLeadId(id),
      getConversationByLeadId(id),
    ]);

  if (!lead) notFound();

  const deleteAction = async () => {
    "use server";
    await deleteLead(id);
  };

  const extracted = lead.notes ? extractFromNotes(lead.notes) : null;
  const cleanNotes = lead.notes
    ?.replace(/^(Address|Website|Facebook|Instagram|Twitter|Eventbrite):\s*.+$/gim, "")
    .replace(/\[Auto-enriched\].*$/gim, "")
    .trim();

  return (
    <div className="space-y-6">
      {/* Back */}
      <Button
        render={<Link href="/leads" />}
        variant="ghost"
        size="sm"
        className="text-zinc-400 hover:text-white"
      >
        <ArrowLeft className="mr-1.5 h-4 w-4" />
        Back to Leads
      </Button>

      {/* Hero Header */}
      <div className="rounded-xl border border-white/10 bg-surface p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <h1 className="font-heading text-lg sm:text-2xl font-bold tracking-tight text-white">
                {lead.name}
              </h1>
              <LeadTypeBadge type={lead.leadType} />
            </div>
            {lead.businessName && lead.businessName !== lead.name && (
              <p className="flex items-center gap-1.5 text-sm text-zinc-400">
                <Building2 className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{lead.businessName}</span>
              </p>
            )}
            {extracted?.address && (
              <p className="flex items-center gap-1.5 text-xs text-zinc-500">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{extracted.address}</span>
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 self-start">
            <LeadStatusSelect leadId={lead.id} currentStatus={lead.status} />
            <form action={deleteAction}>
              <Button
                type="submit"
                variant="outline"
                size="sm"
                className="border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300"
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                <span className="hidden sm:inline">Delete</span>
              </Button>
            </form>
          </div>
        </div>

        {/* Contact Row */}
        <div className="mt-3 sm:mt-4 flex flex-wrap items-center gap-2 sm:gap-3">
          {lead.email && (
            <a
              href={`mailto:${lead.email}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs sm:text-sm text-zinc-200 hover:border-gold/30 hover:text-gold transition-colors truncate max-w-full"
            >
              <Mail className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{lead.email}</span>
            </a>
          )}
          {lead.phone && (
            <a
              href={`tel:${lead.phone}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs sm:text-sm text-zinc-200 hover:border-gold/30 hover:text-gold transition-colors"
            >
              <Phone className="h-3.5 w-3.5 shrink-0" />
              {lead.phone}
            </a>
          )}
          {extracted?.website && (
            <a
              href={extracted.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs sm:text-sm text-zinc-200 hover:border-gold/30 hover:text-gold transition-colors truncate max-w-full"
            >
              <Globe className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{extracted.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}</span>
              <ExternalLink className="h-3 w-3 shrink-0" />
            </a>
          )}
          {extracted?.facebook && (
            <a href={extracted.facebook} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2.5 py-1 text-xs text-zinc-400 hover:text-white transition-colors">
              Facebook <ExternalLink className="h-2.5 w-2.5" />
            </a>
          )}
          {extracted?.instagram && (
            <a href={extracted.instagram} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2.5 py-1 text-xs text-zinc-400 hover:text-white transition-colors">
              Instagram <ExternalLink className="h-2.5 w-2.5" />
            </a>
          )}
          {extracted?.eventbrite && (
            <a href={extracted.eventbrite} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2.5 py-1 text-xs text-zinc-400 hover:text-white transition-colors">
              Eventbrite <ExternalLink className="h-2.5 w-2.5" />
            </a>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mt-3 sm:mt-4 flex flex-wrap gap-2">
          {lead.email && (
            <QuickComposeDialog
              lead={{
                id: lead.id,
                name: lead.name,
                email: lead.email,
                businessName: lead.businessName,
                leadType: lead.leadType,
              }}
              trigger={
                <Button size="sm" className="bg-gold text-black hover:bg-gold-light">
                  <Mail className="mr-1.5 h-3.5 w-3.5" />
                  Send Email
                </Button>
              }
            />
          )}
          <BookEventSheet leadId={lead.id} leadName={lead.name} />
        </div>

        {/* Meta */}
        <div className="mt-3 sm:mt-4 flex flex-wrap gap-3 sm:gap-4 text-[11px] sm:text-xs text-zinc-500">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Added {formatRelativeDate(lead.createdAt)}
          </span>
          <span>Source: {sourceLabels[lead.source || "manual"] || lead.source}</span>
          {lead.lastContactedAt && (
            <span>Last contacted {formatRelativeDate(lead.lastContactedAt)}</span>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column — Activity Timeline */}
        <div className="space-y-6 lg:col-span-2">
          {/* Conversation Timeline */}
          <Card className="border-white/10 bg-surface">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-zinc-400">
                  Conversation
                </CardTitle>
                <Badge variant="outline" className="border-white/10 text-zinc-500 text-xs">
                  {conversation.length} message{conversation.length !== 1 ? "s" : ""}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {conversation.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-center">
                  <Mail className="mb-2 h-8 w-8 text-zinc-700" />
                  <p className="text-sm text-zinc-500">No messages yet</p>
                  {lead.email && (
                    <p className="mt-1 text-xs text-zinc-600">
                      Send your first email to start the conversation
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {conversation.map((msg) => {
                    const isSent = msg.type === "sent";
                    const Icon = isSent ? Send : Inbox;
                    const colorClass = isSent
                      ? "border-blue-500/20 bg-blue-500/10 text-blue-400"
                      : "border-emerald-500/20 bg-emerald-500/10 text-emerald-400";

                    return (
                      <div
                        key={msg.id}
                        className={`flex items-start gap-3 rounded-lg border p-3 ${
                          isSent
                            ? "border-white/5 bg-white/2"
                            : "border-emerald-500/10 bg-emerald-500/5"
                        }`}
                      >
                        <div
                          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${colorClass}`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium text-white truncate">
                              {msg.subject || "(No subject)"}
                            </p>
                            <Badge
                              variant="outline"
                              className={`shrink-0 text-[10px] ${colorClass}`}
                            >
                              {isSent ? "Sent" : "Received"}
                            </Badge>
                          </div>
                          {msg.body && (
                            <p className="mt-0.5 text-xs text-zinc-500 line-clamp-2">
                              {msg.body.replace(/<[^>]+>/g, "").slice(0, 200)}
                            </p>
                          )}
                          <p className="mt-1 text-[11px] text-zinc-600">
                            {isSent ? "You" : msg.from} &middot;{" "}
                            {formatDate(msg.date)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Linked Events */}
          <Card className="border-white/10 bg-surface">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-zinc-400">
                  Linked Events
                </CardTitle>
                <Badge variant="outline" className="border-white/10 text-zinc-500 text-xs">
                  {linkedEvents.length} event{linkedEvents.length !== 1 ? "s" : ""}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {linkedEvents.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-center">
                  <CalendarDays className="mb-2 h-8 w-8 text-zinc-700" />
                  <p className="text-sm text-zinc-500">No events linked</p>
                  <p className="mt-1 text-xs text-zinc-600">
                    Book an event to associate it with this lead
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {linkedEvents.map((event) => (
                    <Link
                      key={event.id}
                      href={`/events/${event.id}`}
                      className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/2 p-3 hover:border-gold/20 hover:bg-gold/5 transition-colors"
                    >
                      <div className="flex h-10 w-10 flex-col items-center justify-center rounded-lg bg-gold/10 text-gold shrink-0">
                        <span className="text-[10px] font-medium leading-none uppercase">
                          {new Date(event.eventDate).toLocaleDateString("en-US", { month: "short" })}
                        </span>
                        <span className="text-sm font-bold leading-tight">
                          {new Date(event.eventDate).getDate()}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-white truncate">
                          {event.title}
                        </p>
                        {event.location && (
                          <p className="text-xs text-zinc-500 flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {event.location}
                          </p>
                        )}
                      </div>
                      <Badge
                        variant="outline"
                        className="shrink-0 border-white/10 text-zinc-400 text-xs"
                      >
                        {event.paymentStatus}
                      </Badge>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          {cleanNotes && (
            <Card className="border-white/10 bg-surface">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-zinc-400">
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm text-zinc-300 leading-relaxed">
                  {cleanNotes}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column — Edit Form */}
        <div className="lg:col-span-1">
          <Card className="border-white/10 bg-surface sticky top-8">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-zinc-400">
                Edit Lead
              </CardTitle>
            </CardHeader>
            <CardContent>
              <LeadForm lead={lead} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
