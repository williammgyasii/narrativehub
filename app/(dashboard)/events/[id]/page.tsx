import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  MapPin,
  CalendarDays,
  Clock,
  Trash2,
  DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EditEventSheet } from "@/components/edit-event-sheet";
import { getEventById } from "@/lib/queries/events";
import { getGearItems } from "@/lib/queries/gear";
import { deleteEvent } from "@/lib/actions/events";
import { formatCurrency, formatRelativeDate } from "@/lib/format";
import { EventTabs } from "./event-tabs";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [result, allGear] = await Promise.all([
    getEventById(id),
    getGearItems(),
  ]);

  if (!result) notFound();

  const { lead, ...event } = result;

  const inventoryItems = allGear.map((g) => ({
    id: g.id,
    name: g.name,
    category: g.category,
    ownership: g.ownership,
    rentalPricePerDay: g.rentalPricePerDay,
  }));

  const deleteAction = async () => {
    "use server";
    await deleteEvent(id);
  };

  const eventDate = new Date(event.eventDate);
  const isPast = eventDate < new Date();
  const dayOfWeek = eventDate.toLocaleDateString("en-US", { weekday: "long" });
  const formattedDate = eventDate.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const formattedTime = eventDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  const rentalTotal = (
    (event.gearChecklist as { rentalCost?: number }[]) || []
  ).reduce((sum, g) => sum + (g.rentalCost || 0), 0);

  const leadInfo = lead
    ? {
        id: lead.id,
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        businessName: lead.businessName,
        leadType: lead.leadType,
      }
    : null;

  return (
    <div className="space-y-6">
      {/* Back */}
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="text-zinc-400 hover:text-white"
      >
        <Link href="/events">
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back to Events
        </Link>
      </Button>

      {/* Hero Header */}
      <div className="rounded-xl border border-white/10 bg-surface p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3 sm:gap-4">
            <div
              className={`flex h-12 w-12 sm:h-16 sm:w-16 flex-col items-center justify-center rounded-xl shrink-0 ${isPast ? "bg-zinc-500/10 text-zinc-500" : "bg-gold/10 text-gold"}`}
            >
              <span className="text-[10px] sm:text-xs font-medium leading-none uppercase">
                {eventDate.toLocaleDateString("en-US", { month: "short" })}
              </span>
              <span className="text-lg sm:text-2xl font-bold leading-tight">
                {eventDate.getDate()}
              </span>
            </div>

            <div className="space-y-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <h1 className="font-heading text-lg sm:text-2xl font-bold tracking-tight text-white">
                  {event.title}
                </h1>
                {event.eventType && (
                  <Badge
                    variant="outline"
                    className="border-white/10 text-zinc-400 capitalize text-[10px] sm:text-xs"
                  >
                    {event.eventType.replace("_", " ")}
                  </Badge>
                )}
                {isPast && (
                  <Badge
                    variant="outline"
                    className="border-zinc-500/20 bg-zinc-500/10 text-zinc-500 text-[10px] sm:text-xs"
                  >
                    Past
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  <span className="hidden sm:inline">{dayOfWeek}, </span>{formattedDate}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  {formattedTime}
                </span>
                {event.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    <span className="truncate max-w-[150px] sm:max-w-none">{event.location}</span>
                  </span>
                )}
              </div>

              <p className="text-[10px] sm:text-xs text-zinc-600">
                {formatRelativeDate(event.eventDate)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start">
            <EditEventSheet event={event} />
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

        {/* Price summary row */}
        <div className="mt-4 flex flex-wrap items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/3 px-3 py-2">
            <DollarSign className="h-4 w-4 text-zinc-500" />
            <div>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
                Package
              </p>
              <p className="text-base sm:text-lg font-bold text-white leading-tight">
                {formatCurrency(event.packagePrice)}
              </p>
            </div>
          </div>

          {rentalTotal > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-blue-500/20 bg-blue-500/5 px-3 py-2">
              <div>
                <p className="text-[10px] text-blue-400 uppercase tracking-wider">
                  Gear Rentals
                </p>
                <p className="text-base sm:text-lg font-bold text-blue-300 leading-tight">
                  {formatCurrency(rentalTotal)}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <EventTabs
        eventId={event.id}
        eventTitle={event.title}
        eventType={event.eventType}
        location={event.location}
        packagePrice={event.packagePrice}
        paymentStatus={event.paymentStatus}
        initialDescription={event.description}
        initialClientRequests={event.clientRequests}
        initialMoodboard={
          (event.moodboard as { type: "image" | "url" | "note"; content: string; caption?: string }[]) || []
        }
        initialPaymentLog={
          (event.paymentLog as { date: string; label: string; amount?: number }[]) || []
        }
        initialGearChecklist={
          (event.gearChecklist as { item: string; checked: boolean; rentalCost?: number; gearItemId?: string }[]) || []
        }
        inventoryItems={inventoryItems}
        lead={leadInfo}
        notes={event.notes}
      />
    </div>
  );
}
