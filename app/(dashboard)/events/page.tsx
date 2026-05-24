import Link from "next/link";
import { Plus, CalendarDays, MapPin, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { getEvents } from "@/lib/queries/events";
import { formatDate, formatCurrency } from "@/lib/format";

const paymentBadge = {
  unpaid: "bg-red-500/10 text-red-400 border-red-500/20",
  deposit: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  paid: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
} as const;

export default async function EventsPage() {
  const allEvents = await getEvents();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Events"
        description="Your booked shoots and upcoming sessions."
      >
        <Button
          asChild
          size="sm"
          className="bg-gold text-black hover:bg-gold-light"
        >
          <Link href="/events/new">
            <Plus className="mr-1.5 h-4 w-4" />
            New Event
          </Link>
        </Button>
      </PageHeader>

      {allEvents.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No events scheduled"
          description="Create your first event when you book a shoot."
        >
          <Button
            asChild
            size="sm"
            className="bg-gold text-black hover:bg-gold-light"
          >
            <Link href="/events/new">
              <Plus className="mr-1.5 h-4 w-4" />
              Schedule Event
            </Link>
          </Button>
        </EmptyState>
      ) : (
        <div className="space-y-2">
          {allEvents.map((event) => (
            <Link key={event.id} href={`/events/${event.id}`}>
              <Card className="border-white/10 bg-surface transition-colors hover:bg-surface-hover">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-12 w-12 flex-col items-center justify-center rounded-lg bg-gold/10 text-gold">
                    <span className="text-xs font-medium leading-none">
                      {new Date(event.eventDate).toLocaleDateString("en-US", {
                        month: "short",
                      })}
                    </span>
                    <span className="text-lg font-bold leading-none">
                      {new Date(event.eventDate).getDate()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white">{event.title}</p>
                    <div className="mt-1 flex items-center gap-3 text-xs text-zinc-500">
                      {event.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {event.location}
                        </span>
                      )}
                      {event.eventType && <span>{event.eventType}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {event.packagePrice > 0 && (
                      <span className="text-sm font-medium text-zinc-300">
                        {formatCurrency(event.packagePrice)}
                      </span>
                    )}
                    <Badge
                      variant="outline"
                      className={paymentBadge[event.paymentStatus]}
                    >
                      {event.paymentStatus}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
