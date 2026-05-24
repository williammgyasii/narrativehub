"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import {
  Plus,
  Loader2,
  Ban,
  Mail,
  Phone,
  Globe,
  ExternalLink,
  ClipboardPaste,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  saveAsLead,
  markPlaceUnreachable,
} from "@/lib/actions/lead-finder";
import { toast } from "sonner";

interface OrganizerInfo {
  name: string;
  website?: string;
  facebook?: string;
  twitter?: string;
  instagram?: string;
  description?: string;
}

function extractContactInfo(text: string) {
  const emails = text.match(
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
  );

  // Match various phone formats: (xxx) xxx-xxxx, xxx-xxx-xxxx, xxx.xxx.xxxx, +1xxxxxxxxxx, etc.
  const phonePatterns = text.match(
    /(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/g
  );
  // Filter out numbers that are too short or look like zip codes / years
  const phones = phonePatterns?.filter((p) => {
    const digits = p.replace(/\D/g, "");
    return digits.length >= 10;
  });

  const urls = text.match(
    /https?:\/\/[^\s,<>"']+/gi
  );
  // Also catch "www.something.com" without http
  const wwwUrls = text.match(
    /(?:^|\s)(www\.[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}[^\s,<>"']*)/gim
  );

  let website = urls?.[0];
  if (!website && wwwUrls?.[0]) {
    website = "https://" + wwwUrls[0].trim();
  }
  // Derive website from email domain if no URL found
  if (!website && emails?.[0]) {
    const domain = emails[0].split("@")[1];
    if (domain && !domain.match(/gmail|yahoo|hotmail|outlook|aol|icloud/i)) {
      website = "https://" + domain;
    }
  }

  return {
    email: emails?.[0] || "",
    phone: phones?.[0] || "",
    website: website || "",
  };
}

interface SaveLeadDialogProps {
  placeId: string;
  name: string;
  address: string;
  phone?: string;
  website?: string;
  leadType: string;
  source: string;
  eventbriteUrl?: string;
  onSaved?: () => void;
  onSkipped?: () => void;
}

export function SaveLeadDialog({
  placeId,
  name,
  address,
  phone: existingPhone,
  website: existingWebsite,
  leadType,
  source,
  eventbriteUrl,
  onSaved,
  onSkipped,
}: SaveLeadDialogProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState(existingPhone || "");
  const [website, setWebsite] = useState(existingWebsite || "");
  const [isPending, startTransition] = useTransition();
  const [pasteText, setPasteText] = useState("");
  const [extracted, setExtracted] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [organizerInfo, setOrganizerInfo] = useState<OrganizerInfo | null>(null);
  const [hasLookedUp, setHasLookedUp] = useState(false);

  const handlePasteExtract = useCallback((text: string) => {
    setPasteText(text);
    if (!text.trim()) return;

    const info = extractContactInfo(text);
    if (info.email) setEmail(info.email);
    if (info.phone) setPhone(info.phone);
    if (info.website) setWebsite(info.website);

    if (info.email || info.phone || info.website) {
      setExtracted(true);
      setTimeout(() => setExtracted(false), 2000);
    }
  }, []);

  useEffect(() => {
    if (!open || !eventbriteUrl || hasLookedUp) return;

    setIsLookingUp(true);
    fetch(`/api/eventbrite/organizer?url=${encodeURIComponent(eventbriteUrl)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.organizer) {
          setOrganizerInfo(data.organizer);
          if (data.organizer.website && !website) {
            setWebsite(data.organizer.website);
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        setIsLookingUp(false);
        setHasLookedUp(true);
      });
  }, [open, eventbriteUrl, hasLookedUp, website]);

  const hasAnyContact = email || phone || website;

  function handleSave() {
    if (!hasAnyContact) {
      toast.error("Add at least one way to contact them");
      return;
    }

    startTransition(async () => {
      try {
        const socialNotes = [
          organizerInfo?.facebook && `Facebook: ${organizerInfo.facebook}`,
          organizerInfo?.twitter && `Twitter: ${organizerInfo.twitter}`,
          organizerInfo?.instagram && `Instagram: ${organizerInfo.instagram}`,
          eventbriteUrl && `Eventbrite: ${eventbriteUrl}`,
        ]
          .filter(Boolean)
          .join("\n");

        await saveAsLead({
          name,
          businessName: name,
          email: email || undefined,
          phone: phone || undefined,
          website: website || undefined,
          address,
          leadType: leadType as "wedding" | "corporate" | "real_estate" | "architectural",
          source,
          notes: socialNotes || undefined,
        });
        toast.success(`${name} saved as lead`);
        setOpen(false);
        onSaved?.();
      } catch {
        toast.error("Failed to save lead");
      }
    });
  }

  function handleSkip() {
    startTransition(async () => {
      try {
        await markPlaceUnreachable(placeId, name);
        toast.info(`${name} marked as unreachable`);
        setOpen(false);
        onSkipped?.();
      } catch {
        toast.error("Failed to mark as unreachable");
      }
    });
  }

  const socials = [
    organizerInfo?.facebook && { label: "Facebook", url: organizerInfo.facebook },
    organizerInfo?.twitter && { label: "Twitter", url: organizerInfo.twitter },
    organizerInfo?.instagram && { label: "Instagram", url: organizerInfo.instagram },
  ].filter(Boolean) as { label: string; url: string }[];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-xs text-zinc-400 hover:text-gold"
        >
          <Plus className="mr-1 h-3 w-3" />
          Save
        </Button>
      </DialogTrigger>
      <DialogContent className="border-white/10 bg-surface sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">{name}</DialogTitle>
          <DialogDescription className="text-zinc-500">
            {address}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          {/* Auto-lookup status for Eventbrite */}
          {eventbriteUrl && isLookingUp && (
            <div className="flex items-center gap-2 rounded-md border border-white/5 bg-white/2 px-3 py-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-gold" />
              <span className="text-xs text-zinc-400">
                Looking up organizer details from Eventbrite...
              </span>
            </div>
          )}

          {/* Organizer info found */}
          {organizerInfo && !isLookingUp && (
            <div className="rounded-md border border-white/5 bg-white/2 px-3 py-2 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-300">
                  Organizer found
                </span>
                <Badge
                  variant="outline"
                  className="text-[10px] border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                >
                  Auto-detected
                </Badge>
              </div>
              {organizerInfo.website && (
                <a
                  href={organizerInfo.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-gold hover:underline"
                >
                  <Globe className="h-3 w-3" />
                  {organizerInfo.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
                  <ExternalLink className="h-2.5 w-2.5" />
                </a>
              )}
              {socials.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {socials.map((s) => (
                    <a
                      key={s.label}
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-zinc-400 hover:text-white hover:border-white/20 transition-colors"
                    >
                      <ExternalLink className="h-2.5 w-2.5" />
                      {s.label}
                    </a>
                  ))}
                </div>
              )}
              {organizerInfo.description && (
                <p className="text-[11px] text-zinc-600 line-clamp-2">
                  {organizerInfo.description}
                </p>
              )}
            </div>
          )}

          {/* No organizer found from Eventbrite */}
          {eventbriteUrl && hasLookedUp && !organizerInfo && (
            <div className="rounded-md border border-white/5 bg-white/2 px-3 py-2">
              <span className="text-xs text-zinc-500">
                No organizer details found on the event page. Try Googling the event name.
              </span>
            </div>
          )}

          {/* Smart Paste Box */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-medium text-zinc-300">
                <ClipboardPaste className="h-3 w-3" />
                Paste contact info
              </label>
              {extracted && (
                <Badge
                  variant="outline"
                  className="text-[10px] border-emerald-500/20 bg-emerald-500/10 text-emerald-400 animate-in fade-in"
                >
                  <Sparkles className="mr-1 h-2.5 w-2.5" />
                  Extracted!
                </Badge>
              )}
            </div>
            <Textarea
              value={pasteText}
              onChange={(e) => handlePasteExtract(e.target.value)}
              placeholder={"Paste anything — address block, email signature, contact page text...\nWe'll pull out the email, phone, and website automatically."}
              rows={3}
              className="resize-none border-white/10 bg-white/5 text-sm text-white placeholder:text-zinc-600 focus:border-gold/30"
            />
          </div>

          <div className="relative flex items-center gap-3">
            <div className="flex-1 border-t border-white/10" />
            <span className="text-[10px] text-zinc-600 uppercase tracking-wider">or fill manually</span>
            <div className="flex-1 border-t border-white/10" />
          </div>

          <div className="space-y-2">
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-500" />
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                type="email"
                className="h-9 pl-9 border-white/10 bg-white/5 text-sm text-white placeholder:text-zinc-600"
              />
            </div>
            <div className="relative">
              <Phone className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-500" />
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone number"
                type="tel"
                className="h-9 pl-9 border-white/10 bg-white/5 text-sm text-white placeholder:text-zinc-600"
              />
            </div>
            <div className="relative">
              <Globe className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-500" />
              <Input
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="Website URL"
                type="url"
                className="h-9 pl-9 border-white/10 bg-white/5 text-sm text-white placeholder:text-zinc-600"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button
              onClick={handleSave}
              disabled={!hasAnyContact || isPending}
              className="flex-1 bg-gold text-black hover:bg-gold-light h-9 text-sm"
            >
              {isPending ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="mr-1.5 h-3.5 w-3.5" />
              )}
              Save as Lead
            </Button>
            <Button
              variant="outline"
              onClick={handleSkip}
              disabled={isPending}
              className="border-white/10 text-zinc-400 hover:text-red-400 hover:border-red-500/20 hover:bg-red-500/5 h-9 text-sm"
            >
              <Ban className="mr-1.5 h-3.5 w-3.5" />
              Can&apos;t Reach
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
