"use client";

import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { EventForm } from "@/components/event-form";

export function BookEventSheet({
  leadId,
  leadName,
  trigger,
}: {
  leadId: string;
  leadName: string;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          trigger || (
            <Button
              size="sm"
              variant="outline"
              className="border-white/10 text-zinc-300 hover:border-gold/30 hover:text-gold"
            >
              <CalendarDays className="mr-1.5 h-3.5 w-3.5" />
              Book Event
            </Button>
          )
        }
      />
      <SheetContent
        side="right"
        className="border-white/10 bg-surface sm:max-w-xl w-full flex flex-col overflow-y-auto"
      >
        <SheetHeader className="border-b border-white/10 pb-4">
          <SheetTitle className="font-heading text-xl text-white">
            Book Event
          </SheetTitle>
          <SheetDescription className="text-zinc-400">
            Schedule a shoot with {leadName}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 p-4">
          <EventForm
            defaultLeadId={leadId}
            onSuccess={() => setOpen(false)}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
