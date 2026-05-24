"use client";

import { useState, useActionState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addExpense } from "@/lib/actions/expenses";

export function AddExpenseDialog() {
  const [open, setOpen] = useState(false);

  const wrappedAction = async (_prev: unknown, formData: FormData) => {
    const result = await addExpense(formData);
    if (!result?.error) setOpen(false);
    return result;
  };

  const [state, formAction, isPending] = useActionState(wrappedAction, null);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-gold px-3 py-1.5 text-sm font-medium text-black transition-colors hover:bg-gold-light">
        <Plus className="h-4 w-4" />
        Add Expense
      </DialogTrigger>
      <DialogContent className="border-white/10 bg-[#111111] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl text-white">
            Add Expense
          </DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">
              Category *
            </label>
            <Select name="category" defaultValue="gear_rental">
              <SelectTrigger className="border-white/10 bg-white/5 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-white/10 bg-[#1a1a1a]">
                <SelectItem value="gear_rental">Gear Rental</SelectItem>
                <SelectItem value="travel">Travel</SelectItem>
                <SelectItem value="software">Software</SelectItem>
                <SelectItem value="insurance">Insurance</SelectItem>
                <SelectItem value="marketing">Marketing</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">
              Description *
            </label>
            <Input
              name="description"
              placeholder="Sony 24-70mm f/2.8 rental"
              required
              className="border-white/10 bg-white/5 text-white placeholder:text-zinc-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">
                Amount ($) *
              </label>
              <Input
                name="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="75.00"
                required
                className="border-white/10 bg-white/5 text-white placeholder:text-zinc-600"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">
                Date *
              </label>
              <Input
                name="date"
                type="date"
                defaultValue={new Date().toISOString().slice(0, 10)}
                required
                className="border-white/10 bg-white/5 text-white"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              disabled={isPending}
              className="bg-gold text-black hover:bg-gold-light"
            >
              {isPending ? "Adding..." : "Add Expense"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
