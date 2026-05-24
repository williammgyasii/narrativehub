"use client";

import { useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateLeadStatus } from "@/lib/actions/leads";
import { toast } from "sonner";

const statuses = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "responded", label: "Responded" },
  { value: "booked", label: "Booked" },
  { value: "closed", label: "Closed" },
] as const;

export function LeadStatusSelect({
  leadId,
  currentStatus,
}: {
  leadId: string;
  currentStatus: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleChange(newStatus: string) {
    startTransition(async () => {
      await updateLeadStatus(
        leadId,
        newStatus as "new" | "contacted" | "responded" | "booked" | "closed"
      );
      toast.success(`Status updated to ${newStatus}`);
    });
  }

  return (
    <Select
      defaultValue={currentStatus}
      onValueChange={handleChange}
      disabled={isPending}
    >
      <SelectTrigger className="w-[140px] border-white/10 bg-white/5 text-sm text-white">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="border-white/10 bg-[#1a1a1a]">
        {statuses.map((s) => (
          <SelectItem key={s.value} value={s.value}>
            {s.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
