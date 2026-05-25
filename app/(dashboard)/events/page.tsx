import Link from "next/link";
import { Plus, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { EventsTable } from "./events-table";
import { getEvents } from "@/lib/queries/events";

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
        <EventsTable events={allEvents} />
      )}
    </div>
  );
}
