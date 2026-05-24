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
import { createTemplate } from "@/lib/actions/outreach";

export function TemplateDialog() {
  const [open, setOpen] = useState(false);

  const wrappedAction = async (_prev: unknown, formData: FormData) => {
    const result = await createTemplate(formData);
    if (!result?.error) setOpen(false);
    return result;
  };

  const [state, formAction, isPending] = useActionState(wrappedAction, null);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-gold px-3 py-1.5 text-sm font-medium text-black transition-colors hover:bg-gold-light">
        <Plus className="h-4 w-4" />
        New Template
      </DialogTrigger>
      <DialogContent className="border-white/10 bg-[#111111] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl text-white">
            Create Email Template
          </DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">
                Template Name *
              </label>
              <Input
                name="name"
                placeholder="Venue Introduction"
                required
                className="border-white/10 bg-white/5 text-white placeholder:text-zinc-600"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">
                Lead Type *
              </label>
              <Select name="leadType" defaultValue="wedding">
                <SelectTrigger className="border-white/10 bg-white/5 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-[#1a1a1a]">
                  <SelectItem value="wedding">Wedding</SelectItem>
                  <SelectItem value="corporate">Corporate</SelectItem>
                  <SelectItem value="real_estate">Real Estate</SelectItem>
                  <SelectItem value="architectural">Architectural</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">
              Subject *
            </label>
            <Input
              name="subject"
              placeholder="Professional photography for {{business}}"
              required
              className="border-white/10 bg-white/5 text-white placeholder:text-zinc-600"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">
              Body *
            </label>
            <Textarea
              name="body"
              placeholder={`Hi {{name}},\n\nI'm a professional photographer based in the DMV area, specializing in {{lead_type}} photography...\n\nBest,\n[Your Name]`}
              rows={8}
              required
              className="border-white/10 bg-white/5 text-white placeholder:text-zinc-600"
            />
            <p className="text-xs text-zinc-600">
              Variables: {"{{name}}"}, {"{{business}}"}, {"{{lead_type}}"}
            </p>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              disabled={isPending}
              className="bg-gold text-black hover:bg-gold-light"
            >
              {isPending ? "Creating..." : "Create Template"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
