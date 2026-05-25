"use client";

import { useState, useActionState } from "react";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { createEvent, updateEvent } from "@/lib/actions/events";
import type { Event } from "@/lib/db/schema";

interface EventFormProps {
  event?: Event;
  defaultLeadId?: string;
  onSuccess?: () => void;
}

function formatAmountDisplay(value: string): string {
  const digits = value.replace(/[^\d]/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("en-US");
}

function parseAmountToDecimal(display: string): string {
  const raw = display.replace(/,/g, "");
  return raw || "0";
}

const TIME_OPTIONS = [
  "6:00 AM", "6:30 AM",
  "7:00 AM", "7:30 AM",
  "8:00 AM", "8:30 AM",
  "9:00 AM", "9:30 AM",
  "10:00 AM", "10:30 AM",
  "11:00 AM", "11:30 AM",
  "12:00 PM", "12:30 PM",
  "1:00 PM", "1:30 PM",
  "2:00 PM", "2:30 PM",
  "3:00 PM", "3:30 PM",
  "4:00 PM", "4:30 PM",
  "5:00 PM", "5:30 PM",
  "6:00 PM", "6:30 PM",
  "7:00 PM", "7:30 PM",
  "8:00 PM", "8:30 PM",
  "9:00 PM", "9:30 PM",
  "10:00 PM", "10:30 PM",
  "11:00 PM", "11:30 PM",
];

function timeTo24h(time12: string): string {
  const [timePart, period] = time12.split(" ");
  const [hStr, mStr] = timePart.split(":");
  let h = parseInt(hStr, 10);
  if (period === "PM" && h !== 12) h += 12;
  if (period === "AM" && h === 12) h = 0;
  return `${h.toString().padStart(2, "0")}:${mStr}`;
}

function getDefaultTime(date?: Date): string {
  if (!date) return "10:00 AM";
  const h = date.getHours();
  const m = date.getMinutes();
  const pm = h >= 12;
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  const mRounded = m >= 30 ? "30" : "00";
  return `${h12}:${mRounded} ${pm ? "PM" : "AM"}`;
}

export function EventForm({ event, defaultLeadId, onSuccess }: EventFormProps) {
  const [eventType, setEventType] = useState(event?.eventType ?? "wedding");
  const [otherType, setOtherType] = useState(
    event?.eventType && !["wedding", "corporate", "real_estate", "architectural"].includes(event.eventType)
      ? event.eventType
      : ""
  );
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    event?.eventDate ? new Date(event.eventDate) : undefined
  );
  const [selectedTime, setSelectedTime] = useState(
    event?.eventDate ? getDefaultTime(new Date(event.eventDate)) : "10:00 AM"
  );
  const [priceDisplay, setPriceDisplay] = useState(
    event?.packagePrice ? formatAmountDisplay(String(event.packagePrice / 100)) : ""
  );
  const [calendarOpen, setCalendarOpen] = useState(false);

  const combinedDateTime = selectedDate
    ? (() => {
        const d = new Date(selectedDate);
        const [h, m] = timeTo24h(selectedTime).split(":");
        d.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
        return d.toISOString();
      })()
    : "";

  const resolvedEventType = eventType === "other" ? (otherType.trim() || "other") : eventType;

  const action = event
    ? async (_prev: unknown, formData: FormData) => {
        const result = await updateEvent(event.id, formData);
        if (!result?.error) onSuccess?.();
        return result;
      }
    : async (_prev: unknown, formData: FormData) => {
        return createEvent(formData);
      };

  const [state, formAction, isPending] = useActionState(action, null);

  return (
    <form action={formAction} className="space-y-4">
      {(defaultLeadId || event?.leadId) && (
        <input
          type="hidden"
          name="leadId"
          value={defaultLeadId || event?.leadId || ""}
        />
      )}
      <input type="hidden" name="eventDate" value={combinedDateTime} />
      <input type="hidden" name="packagePrice" value={parseAmountToDecimal(priceDisplay)} />
      <input type="hidden" name="eventType" value={resolvedEventType} />

      {/* Title */}
      <div className="space-y-1.5">
        <label htmlFor="title" className="text-xs font-medium text-zinc-500">
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

      {/* Event Type */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-zinc-500">Event Type</label>
        <Select
          value={eventType === "other" || !["wedding", "corporate", "real_estate", "architectural", "other"].includes(eventType) ? "other" : eventType}
          onValueChange={(v) => {
            setEventType(v);
            if (v !== "other") setOtherType("");
          }}
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
        {(eventType === "other" || !["wedding", "corporate", "real_estate", "architectural"].includes(eventType)) && (
          <Input
            value={otherType}
            onChange={(e) => setOtherType(e.target.value)}
            placeholder="e.g. Birthday Party, Graduation, etc."
            className="mt-2 border-white/10 bg-white/5 text-white placeholder:text-zinc-600"
          />
        )}
      </div>

      {/* Date & Time — separate fields */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-500">Date *</label>
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger
              className={cn(
                "flex h-9 w-full items-center rounded-md border px-3 text-sm transition-colors",
                "border-white/10 bg-white/5 hover:bg-white/8",
                selectedDate ? "text-white" : "text-zinc-500"
              )}
            >
              <CalendarIcon className="mr-2 h-3.5 w-3.5 text-zinc-500" />
              {selectedDate
                ? selectedDate.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "Pick a date"}
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 border-white/10 bg-surface" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(day) => {
                  setSelectedDate(day);
                  setCalendarOpen(false);
                }}
                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-500">Time *</label>
          <Select value={selectedTime} onValueChange={setSelectedTime}>
            <SelectTrigger className="border-white/10 bg-white/5 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-white/10 bg-surface-hover max-h-56">
              {TIME_OPTIONS.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Location */}
      <div className="space-y-1.5">
        <label htmlFor="location" className="text-xs font-medium text-zinc-500">
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

      {/* Package Price with live commas */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-zinc-500">
          Package Price
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">
            $
          </span>
          <Input
            value={priceDisplay}
            onChange={(e) => setPriceDisplay(formatAmountDisplay(e.target.value))}
            placeholder="2,500"
            className="border-white/10 bg-white/5 text-white placeholder:text-zinc-600 pl-7"
          />
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <label htmlFor="notes" className="text-xs font-medium text-zinc-500">
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
          disabled={isPending || !selectedDate}
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
