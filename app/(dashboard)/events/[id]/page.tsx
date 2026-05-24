import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  MapPin,
  CalendarDays,
  DollarSign,
  User,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { EventForm } from "@/components/event-form";
import { GearChecklist } from "@/components/gear-checklist";
import { PaymentStatusSelect } from "@/components/payment-status-select";
import { getEventById } from "@/lib/queries/events";
import { getGearItems } from "@/lib/queries/gear";
import { deleteEvent } from "@/lib/actions/events";
import { formatDate, formatCurrency } from "@/lib/format";

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

  return (
    <div className="space-y-6">
      <div>
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="mb-4 text-zinc-400 hover:text-white"
        >
          <Link href="/events">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back to Events
          </Link>
        </Button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-heading text-3xl font-bold tracking-tight text-white">
              {event.title}
            </h1>
            <div className="mt-2 flex items-center gap-4 text-sm text-zinc-400">
              <span className="flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4" />
                {formatDate(event.eventDate)}
              </span>
              {event.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {event.location}
                </span>
              )}
            </div>
          </div>
          <form action={deleteAction}>
            <Button
              type="submit"
              variant="outline"
              size="sm"
              className="border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300"
            >
              <Trash2 className="mr-1.5 h-4 w-4" />
              Delete
            </Button>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Sidebar Info */}
        <div className="space-y-4 lg:col-span-1">
          {/* Payment */}
          <Card className="border-white/10 bg-surface">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-zinc-400">
                Payment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400">Package</span>
                <span className="font-heading text-xl font-bold text-white">
                  {formatCurrency(event.packagePrice)}
                </span>
              </div>
              <Separator className="bg-white/10" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400">Status</span>
                <PaymentStatusSelect
                  eventId={event.id}
                  currentStatus={event.paymentStatus}
                />
              </div>
            </CardContent>
          </Card>

          {/* Linked Lead */}
          {lead && (
            <Card className="border-white/10 bg-surface">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-zinc-400">
                  Client
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Link
                  href={`/leads/${lead.id}`}
                  className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-white/4"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gold/10">
                    <User className="h-4 w-4 text-gold" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">
                      {lead.name}
                    </p>
                    {lead.businessName && (
                      <p className="text-xs text-zinc-500">
                        {lead.businessName}
                      </p>
                    )}
                  </div>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Gear Checklist */}
          <GearChecklist
            eventId={event.id}
            checklist={
              (event.gearChecklist as {
                item: string;
                checked: boolean;
                rentalCost?: number;
                gearItemId?: string;
              }[]) || []
            }
            inventoryItems={inventoryItems}
          />
        </div>

        {/* Edit Form */}
        <Card className="border-white/10 bg-surface lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-zinc-400">
              Edit Event
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EventForm event={event} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
