"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { upsertProfile } from "@/lib/actions/profile";
import type { PhotographerProfile } from "@/lib/db/schema";
import { useEffect, useRef } from "react";

export function ProfileForm({
  profile,
}: {
  profile?: PhotographerProfile | null;
}) {
  const prevState = useRef<unknown>(null);

  const action = async (_prev: unknown, formData: FormData) => {
    return upsertProfile(formData);
  };

  const [state, formAction, isPending] = useActionState(action, null);

  useEffect(() => {
    if (state && state !== prevState.current) {
      prevState.current = state;
      if ("success" in state && state.success) {
        toast.success("Profile saved");
      } else if ("error" in state && state.error) {
        toast.error(state.error as string);
      }
    }
  }, [state]);

  return (
    <form action={formAction} className="space-y-6">
      {/* Identity */}
      <div>
        <h3 className="text-sm font-medium text-zinc-300 mb-3">Your Info</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="name" className="text-xs text-zinc-500">
              Full Name *
            </label>
            <Input
              id="name"
              name="name"
              defaultValue={profile?.name ?? ""}
              placeholder="William Gyasi"
              required
              className="border-white/10 bg-white/5 text-white placeholder:text-zinc-600"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-xs text-zinc-500">
              Email *
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={profile?.email ?? ""}
              placeholder="you@example.com"
              required
              className="border-white/10 bg-white/5 text-white placeholder:text-zinc-600"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="phone" className="text-xs text-zinc-500">
              Phone
            </label>
            <Input
              id="phone"
              name="phone"
              defaultValue={profile?.phone ?? ""}
              placeholder="(443) 762-2773"
              className="border-white/10 bg-white/5 text-white placeholder:text-zinc-600"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="location" className="text-xs text-zinc-500">
              Location
            </label>
            <Input
              id="location"
              name="location"
              defaultValue={profile?.location ?? ""}
              placeholder="Columbia, Maryland"
              className="border-white/10 bg-white/5 text-white placeholder:text-zinc-600"
            />
          </div>
        </div>
      </div>

      {/* Business */}
      <div>
        <h3 className="text-sm font-medium text-zinc-300 mb-3">Business</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="businessName" className="text-xs text-zinc-500">
              Business Name
            </label>
            <Input
              id="businessName"
              name="businessName"
              defaultValue={profile?.businessName ?? ""}
              placeholder="Kay Creatives"
              className="border-white/10 bg-white/5 text-white placeholder:text-zinc-600"
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="yearsExperience"
              className="text-xs text-zinc-500"
            >
              Years of Experience
            </label>
            <Input
              id="yearsExperience"
              name="yearsExperience"
              type="number"
              defaultValue={profile?.yearsExperience ?? ""}
              placeholder="5"
              className="border-white/10 bg-white/5 text-white placeholder:text-zinc-600"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label htmlFor="specialties" className="text-xs text-zinc-500">
              Specialties
            </label>
            <Input
              id="specialties"
              name="specialties"
              defaultValue={profile?.specialties ?? ""}
              placeholder="Weddings, Corporate Events, Real Estate, Architecture"
              className="border-white/10 bg-white/5 text-white placeholder:text-zinc-600"
            />
          </div>
        </div>
      </div>

      {/* Online Presence */}
      <div>
        <h3 className="text-sm font-medium text-zinc-300 mb-3">
          Online Presence
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="website" className="text-xs text-zinc-500">
              Website
            </label>
            <Input
              id="website"
              name="website"
              defaultValue={profile?.website ?? ""}
              placeholder="https://yoursite.com"
              className="border-white/10 bg-white/5 text-white placeholder:text-zinc-600"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="portfolioUrl" className="text-xs text-zinc-500">
              Portfolio URL
            </label>
            <Input
              id="portfolioUrl"
              name="portfolioUrl"
              defaultValue={profile?.portfolioUrl ?? ""}
              placeholder="https://portfolio.yoursite.com"
              className="border-white/10 bg-white/5 text-white placeholder:text-zinc-600"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label htmlFor="instagram" className="text-xs text-zinc-500">
              Instagram
            </label>
            <Input
              id="instagram"
              name="instagram"
              defaultValue={profile?.instagram ?? ""}
              placeholder="@yourstudio"
              className="border-white/10 bg-white/5 text-white placeholder:text-zinc-600"
            />
          </div>
        </div>
      </div>

      {/* Bio */}
      <div className="space-y-1.5">
        <label htmlFor="bio" className="text-xs text-zinc-500">
          Short Bio
        </label>
        <Textarea
          id="bio"
          name="bio"
          defaultValue={profile?.bio ?? ""}
          placeholder="A brief description of you and your photography style..."
          rows={3}
          className="border-white/10 bg-white/5 text-white placeholder:text-zinc-600"
        />
        <p className="text-[11px] text-zinc-600">
          Used in AI-generated emails to personalize your outreach
        </p>
      </div>

      <div className="flex justify-end pt-2">
        <Button
          type="submit"
          disabled={isPending}
          className="bg-gold text-black hover:bg-gold-light"
        >
          {isPending ? "Saving..." : "Save Profile"}
        </Button>
      </div>
    </form>
  );
}
