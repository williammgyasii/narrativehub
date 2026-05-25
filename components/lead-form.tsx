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
import { createLead, updateLead } from "@/lib/actions/leads";
import type { Lead } from "@/lib/db/schema";

interface LeadFormProps {
  lead?: Lead;
  onSuccess?: () => void;
}

export function LeadForm({ lead, onSuccess }: LeadFormProps) {
  const action = lead
    ? async (_prev: unknown, formData: FormData) => {
        const result = await updateLead(lead.id, formData);
        if (!result?.error) onSuccess?.();
        return result;
      }
    : async (_prev: unknown, formData: FormData) => {
        return createLead(formData);
      };

  const [state, formAction, isPending] = useActionState(action, null);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="name" className="text-sm font-medium text-zinc-300">
          Contact Name *
        </label>
        <Input
          id="name"
          name="name"
          defaultValue={lead?.name ?? ""}
          placeholder="Jane Smith"
          required
          className="border-white/10 bg-white/5 text-white placeholder:text-zinc-600"
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="businessName"
          className="text-sm font-medium text-zinc-300"
        >
          Business Name
        </label>
        <Input
          id="businessName"
          name="businessName"
          defaultValue={lead?.businessName ?? ""}
          placeholder="Evergreen Estate Venue"
          className="border-white/10 bg-white/5 text-white placeholder:text-zinc-600"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <label
            htmlFor="email"
            className="text-sm font-medium text-zinc-300"
          >
            Email
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={lead?.email ?? ""}
            placeholder="jane@example.com"
            className="border-white/10 bg-white/5 text-white placeholder:text-zinc-600"
          />
        </div>
        <div className="space-y-2">
          <label
            htmlFor="phone"
            className="text-sm font-medium text-zinc-300"
          >
            Phone
          </label>
          <Input
            id="phone"
            name="phone"
            defaultValue={lead?.phone ?? ""}
            placeholder="(410) 555-0123"
            className="border-white/10 bg-white/5 text-white placeholder:text-zinc-600"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-300">
            Lead Type *
          </label>
          <Select name="leadType" defaultValue={lead?.leadType ?? "wedding"}>
            <SelectTrigger className="border-white/10 bg-white/5 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-white/10 bg-surface-hover">
              <SelectItem value="wedding">Wedding</SelectItem>
              <SelectItem value="corporate">Corporate</SelectItem>
              <SelectItem value="real_estate">Real Estate</SelectItem>
              <SelectItem value="architectural">Architectural</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-300">Source</label>
          <Select
            name="source"
            defaultValue={lead?.source ?? "manual"}
          >
            <SelectTrigger className="border-white/10 bg-white/5 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-white/10 bg-surface-hover">
              <SelectItem value="manual">Manual</SelectItem>
              <SelectItem value="google_places">Google Places</SelectItem>
              <SelectItem value="eventbrite">Eventbrite</SelectItem>
              <SelectItem value="referral">Referral</SelectItem>
              <SelectItem value="website">Website</SelectItem>
              <SelectItem value="social_media">Social Media</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="notes" className="text-sm font-medium text-zinc-300">
          Notes
        </label>
        <Textarea
          id="notes"
          name="notes"
          defaultValue={lead?.notes ?? ""}
          placeholder="Any details about this lead..."
          rows={3}
          className="border-white/10 bg-white/5 text-white placeholder:text-zinc-600"
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="submit"
          disabled={isPending}
          className="bg-gold text-black hover:bg-gold-light"
        >
          {isPending
            ? lead
              ? "Saving..."
              : "Adding..."
            : lead
              ? "Save Changes"
              : "Add Lead"}
        </Button>
      </div>
    </form>
  );
}
