"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { LeadForm } from "@/components/lead-form";

export function AddLeadDialog({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-gold px-3 py-1.5 text-sm font-medium text-black transition-colors hover:bg-gold-light">
        <Plus className="h-4 w-4" />
        Add Lead
      </DialogTrigger>
      <DialogContent className="border-white/10 bg-[#111111] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl text-white">
            Add New Lead
          </DialogTitle>
        </DialogHeader>
        <LeadForm />
      </DialogContent>
    </Dialog>
  );
}
