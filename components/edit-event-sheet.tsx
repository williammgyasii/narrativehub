"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
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
import type { Event } from "@/lib/db/schema";

export function EditEventSheet({ event }: { event: Event }) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            size="sm"
            variant="outline"
            className="border-white/10 text-zinc-300 hover:border-gold/30 hover:text-gold"
          >
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            Edit
          </Button>
        }
      />
      <SheetContent
        side="right"
        className="border-white/10 bg-surface sm:max-w-xl w-full flex flex-col overflow-y-auto"
      >
        <SheetHeader className="border-b border-white/10 pb-4">
          <SheetTitle className="font-heading text-xl text-white">
            Edit Event
          </SheetTitle>
          <SheetDescription className="text-zinc-400">
            Update details for {event.title}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 p-4">
          <EventForm event={event} onSuccess={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
