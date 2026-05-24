"use client";

import { useState, useActionState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { addGearItem } from "@/lib/actions/gear";

export function AddGearDialog() {
  const [open, setOpen] = useState(false);

  const wrappedAction = async (_prev: unknown, formData: FormData) => {
    const result = await addGearItem(formData);
    if (!result?.error) setOpen(false);
    return result;
  };

  const [state, formAction, isPending] = useActionState(wrappedAction, null);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-gold px-3 py-1.5 text-sm font-medium text-black transition-colors hover:bg-gold-light">
        <Plus className="h-4 w-4" />
        Add Gear
      </DialogTrigger>
      <DialogContent className="border-white/10 bg-[#111111] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl text-white">
            Add Gear Item
          </DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">
              Name *
            </label>
            <Input
              name="name"
              placeholder="Sony A7IV"
              required
              className="border-white/10 bg-white/5 text-white placeholder:text-zinc-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">
                Category *
              </label>
              <Select name="category" defaultValue="camera">
                <SelectTrigger className="border-white/10 bg-white/5 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-[#1a1a1a]">
                  <SelectItem value="camera">Camera</SelectItem>
                  <SelectItem value="lens">Lens</SelectItem>
                  <SelectItem value="lighting">Lighting</SelectItem>
                  <SelectItem value="audio">Audio</SelectItem>
                  <SelectItem value="stabilizer">Stabilizer</SelectItem>
                  <SelectItem value="accessory">Accessory</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">
                Status *
              </label>
              <Select name="ownership" defaultValue="wishlist">
                <SelectTrigger className="border-white/10 bg-white/5 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-[#1a1a1a]">
                  <SelectItem value="owned">Owned</SelectItem>
                  <SelectItem value="rented">Rented</SelectItem>
                  <SelectItem value="wishlist">Wishlist</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">
                Purchase Price ($)
              </label>
              <Input
                name="purchasePrice"
                type="number"
                step="0.01"
                min="0"
                placeholder="2498.00"
                className="border-white/10 bg-white/5 text-white placeholder:text-zinc-600"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">
                Rental $/day
              </label>
              <Input
                name="rentalPricePerDay"
                type="number"
                step="0.01"
                min="0"
                placeholder="75.00"
                className="border-white/10 bg-white/5 text-white placeholder:text-zinc-600"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Notes</label>
            <Textarea
              name="notes"
              placeholder="Any notes about this gear..."
              rows={2}
              className="border-white/10 bg-white/5 text-white placeholder:text-zinc-600"
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              disabled={isPending}
              className="bg-gold text-black hover:bg-gold-light"
            >
              {isPending ? "Adding..." : "Add Item"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
