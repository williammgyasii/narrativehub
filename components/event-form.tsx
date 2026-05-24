"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createEvent, updateEvent } from "@/lib/actions/events";
import type { Event } from "@/lib/db/schema";

interface EventFormProps {
  event?: Event;
  defaultLeadId?: string;
  onSuccess?: () => void;
}

export function EventForm({ event, defaultLeadId, onSuccess }: EventFormProps) {
  const action = event
    ? async (_prev: unknown, formData: FormData) => {
        const result = await updateEvent(event.id, formData);
        if (!result?.error) onSuccess?.();
        return result;
      }
    : createEvent;

  const [state, formAction, isPending] = useActionState(action, null);

  const defaultDate = event?.eventDate
    ? new Date(event.eventDate).toISOString().slice(0, 16)
    : "";

  const defaultPrice = event?.packagePrice
    ? (event.packagePrice / 100).toFixed(2)
    : "";

  return (
    <form action={formAction} className="space-y-4">
      {(defaultLeadId || event?.leadId) && (
        <input
          type="hidden"
          name="leadId"
          value={defaultLeadId || event?.leadId || ""}
        />
      )}

      <div className="space-y-2">
        <label htmlFor="title" className="text-sm font-medium text-zinc-300">
          Event Title *
        </label>
        <Input
          id="title"
          name="title"
          defaultValue={event?.title ?? ""}
          placeholder="Johnson Wedding Reception"
          required
          className="border-white/10 bg-white/5 text-white placeholder:text-zinc-600"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-300">
            Event Type
          </label>
          <Select
            name="eventType"
            defaultValue={event?.eventType ?? "wedding"}
          >
            <SelectTrigger className="border-white/10 bg-white/5 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-white/10 bg-surface-hover">
              <SelectItem value="wedding">Wedding</SelectItem>
              <SelectItem value="corporate">Corporate Event</SelectItem>
              <SelectItem value="real_estate">Real Estate Listing</SelectItem>
              <SelectItem value="architectural">Architectural Shoot</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label
            htmlFor="eventDate"
            className="text-sm font-medium text-zinc-300"
          >
            Date & Time *
          </label>
          <Input
            id="eventDate"
            name="eventDate"
            type="datetime-local"
            defaultValue={defaultDate}
            required
            className="border-white/10 bg-white/5 text-white"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="location"
          className="text-sm font-medium text-zinc-300"
        >
          Location
        </label>
        <Input
          id="location"
          name="location"
          defaultValue={event?.location ?? ""}
          placeholder="Belmont Manor, Elkridge, MD"
          className="border-white/10 bg-white/5 text-white placeholder:text-zinc-600"
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="packagePrice"
          className="text-sm font-medium text-zinc-300"
        >
          Package Price ($)
        </label>
        <Input
          id="packagePrice"
          name="packagePrice"
          type="number"
          step="0.01"
          min="0"
          defaultValue={defaultPrice}
          placeholder="2500.00"
          className="border-white/10 bg-white/5 text-white placeholder:text-zinc-600"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="notes" className="text-sm font-medium text-zinc-300">
          Notes
        </label>
        <Textarea
          id="notes"
          name="notes"
          defaultValue={event?.notes ?? ""}
          placeholder="Special requests, timeline details, etc."
          rows={3}
          className="border-white/10 bg-white/5 text-white placeholder:text-zinc-600"
        />
      </div>

      <div className="flex justify-end pt-2">
        <Button
          type="submit"
          disabled={isPending}
          className="bg-gold text-black hover:bg-gold-light"
        >
          {isPending
            ? event
              ? "Saving..."
              : "Creating..."
            : event
              ? "Save Changes"
              : "Create Event"}
        </Button>
      </div>
    </form>
  );
}
