import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EventForm } from "@/components/event-form";

export default async function NewEventPage({
  searchParams,
}: {
  searchParams: Promise<{ leadId?: string }>;
}) {
  const params = await searchParams;

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
        <h1 className="font-heading text-3xl font-bold tracking-tight text-white">
          New Event
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Schedule a shoot and track all the details.
        </p>
      </div>

      <Card className="border-white/10 bg-surface max-w-2xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-zinc-400">
            Event Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EventForm defaultLeadId={params.leadId} />
        </CardContent>
      </Card>
    </div>
  );
}
