"use client";

import { useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updatePaymentStatus } from "@/lib/actions/events";
import { toast } from "sonner";

export function PaymentStatusSelect({
  eventId,
  currentStatus,
}: {
  eventId: string;
  currentStatus: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleChange(value: string) {
    startTransition(async () => {
      await updatePaymentStatus(
        eventId,
        value as "unpaid" | "deposit" | "paid"
      );
      toast.success(`Payment status updated to ${value}`);
    });
  }

  return (
    <Select
      defaultValue={currentStatus}
      onValueChange={handleChange}
      disabled={isPending}
    >
      <SelectTrigger className="w-[120px] border-white/10 bg-white/5 text-sm text-white">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="border-white/10 bg-[#1a1a1a]">
        <SelectItem value="unpaid">Unpaid</SelectItem>
        <SelectItem value="deposit">Deposit</SelectItem>
        <SelectItem value="paid">Paid</SelectItem>
      </SelectContent>
    </Select>
  );
}
