"use client";

import { useState, useTransition } from "react";
import {
  User,
  Mail,
  ShieldCheck,
  Briefcase,
  Plus,
  Check,
  Loader2,
  Search,
  Eye,
  ExternalLink,
  Phone,
  SearchIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QuickComposeDialog } from "@/components/quick-compose-dialog";
import { saveAsLead } from "@/lib/actions/lead-finder";
import { toast } from "sonner";

interface EnrichedContact {
  email?: string;
  name?: string;
  position?: string;
  confidence: number;
  source: "hunter" | "website" | "apollo";
  apolloId?: string;
  hasEmail?: boolean;
  linkedinUrl?: string;
}

interface ContactResultsProps {
  businessName: string;
  businessAddress?: string;
  websiteUrl?: string;
  phone?: string;
  leadType: string;
  leadSource: string;
}

export function ContactResults({
  businessName,
  businessAddress,
  websiteUrl,
  phone,
  leadType,
  leadSource,
}: ContactResultsProps) {
  const [contacts, setContacts] = useState<EnrichedContact[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [savedEmails, setSavedEmails] = useState<Set<string>>(new Set());
  const [revealingIds, setRevealingIds] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  async function handleFindContacts() {
    setIsLoading(true);
    setHasSearched(true);

    try {
      const params = new URLSearchParams();
      if (websiteUrl) params.set("url", websiteUrl);
      params.set("companyName", businessName);
      if (businessAddress) params.set("location", businessAddress);

      const res = await fetch(`/api/enrich/contacts?${params.toString()}`);
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
        return;
      }
      setContacts(data.contacts || []);
      if (data.contacts?.length === 0) {
        toast.info(`No contacts found for ${businessName}`);
      }
    } catch {
      toast.error("Failed to find contacts");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRevealEmail(contact: EnrichedContact, index: number) {
    if (!contact.name) return;
    const parts = contact.name.split(" ");
    const firstName = parts[0] || "";
    const lastName = parts.slice(1).join(" ") || "";

    setRevealingIds((prev) => new Set(prev).add(contact.apolloId || String(index)));

    try {
      const res = await fetch("/api/enrich/reveal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          organizationName: businessName,
          domain: websiteUrl
            ? new URL(
                websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`
              ).hostname.replace(/^www\./, "")
            : undefined,
        }),
      });
      const data = await res.json();

      if (data.error) {
        toast.error(data.error);
      } else if (data.email) {
        setContacts((prev) =>
          prev.map((c, i) =>
            i === index
              ? { ...c, email: data.email, confidence: 90, hasEmail: true }
              : c
          )
        );
        toast.success(`Email found: ${data.email}`);
      }
    } catch {
      toast.error("Failed to reveal email");
    } finally {
      setRevealingIds((prev) => {
        const next = new Set(prev);
        next.delete(contact.apolloId || String(index));
        return next;
      });
    }
  }

  function handleSaveContact(contact: EnrichedContact) {
    startTransition(async () => {
      const name = contact.name || (contact.email ? contact.email.split("@")[0] : businessName);
      const result = await saveAsLead({
        name,
        email: contact.email,
        businessName,
        leadType: leadType as
          | "wedding"
          | "corporate"
          | "real_estate"
          | "architectural",
        source: leadSource,
        notes: `Found via ${contact.source === "hunter" ? "Hunter.io" : contact.source === "apollo" ? "Apollo.io" : "website scraping"}.\nBusiness: ${businessName}${businessAddress ? `\nAddress: ${businessAddress}` : ""}${contact.position ? `\nPosition: ${contact.position}` : ""}${websiteUrl ? `\nWebsite: ${websiteUrl}` : ""}${contact.linkedinUrl ? `\nLinkedIn: ${contact.linkedinUrl}` : ""}${contact.confidence ? `\nConfidence: ${contact.confidence}%` : ""}`,
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        setSavedEmails((prev) => new Set(prev).add(contact.email || contact.name || ""));
        toast.success(`${name} added to your leads`);
      }
    });
  }

  if (!hasSearched) {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={handleFindContacts}
        className="border-white/10 text-zinc-400 hover:border-blue-500/30 hover:text-blue-400"
      >
        <Search className="mr-1.5 h-3.5 w-3.5" />
        Find Contacts
      </Button>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-2 text-sm text-zinc-500">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Searching for contacts at {businessName}...
      </div>
    );
  }

  if (contacts.length === 0) {
    const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(`"${businessName}" ${businessAddress || ""} email contact`)}`;
    return (
      <div className="space-y-2 py-1">
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-600">No emails found automatically</span>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleFindContacts}
            className="h-6 px-2 text-xs text-zinc-500 hover:text-zinc-300"
          >
            Retry
          </Button>
        </div>
        <div className="flex items-center gap-2">
          {phone && (
            <a
              href={`tel:${phone}`}
              className="flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-400 hover:bg-emerald-500/15 transition-colors"
            >
              <Phone className="h-3.5 w-3.5" />
              Call {phone}
            </a>
          )}
          <a
            href={googleSearchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-md bg-blue-500/10 px-3 py-1.5 text-xs text-blue-400 hover:bg-blue-500/15 transition-colors"
          >
            <SearchIcon className="h-3.5 w-3.5" />
            Search Google for email
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5 py-1">
      {contacts.map((contact, index) => {
        const key = contact.email || contact.apolloId || `${contact.name}-${index}`;
        const isSaved = savedEmails.has(contact.email || contact.name || "");
        const isRevealing = revealingIds.has(contact.apolloId || String(index));
        const hasRevealedEmail = !!contact.email;
        const isApollo = contact.source === "apollo";

        const confidenceColor =
          contact.confidence >= 70
            ? "text-emerald-400"
            : contact.confidence >= 40
              ? "text-amber-400"
              : "text-red-400";

        const sourceBadge =
          contact.source === "hunter"
            ? "Hunter.io"
            : contact.source === "apollo"
              ? "Apollo"
              : "Website";

        return (
          <div
            key={key}
            className="flex items-center gap-3 rounded-md bg-white/2 px-3 py-2"
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-500/10">
              <User className="h-3.5 w-3.5 text-blue-400" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {contact.name && (
                  <span className="text-sm font-medium text-white">
                    {contact.name}
                  </span>
                )}
                {contact.email ? (
                  <span className="text-sm text-blue-400 truncate">
                    {contact.email}
                  </span>
                ) : isApollo ? (
                  <span className="text-xs text-zinc-600 italic">
                    Email hidden — click Reveal
                  </span>
                ) : null}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                {contact.position && (
                  <span className="flex items-center gap-1 text-xs text-zinc-500">
                    <Briefcase className="h-3 w-3" />
                    {contact.position}
                  </span>
                )}
                <span
                  className={`flex items-center gap-1 text-xs ${confidenceColor}`}
                >
                  <ShieldCheck className="h-3 w-3" />
                  {contact.confidence}%
                </span>
                <Badge
                  variant="outline"
                  className="h-4 border-white/10 px-1 text-[10px] text-zinc-500"
                >
                  {sourceBadge}
                </Badge>
                {contact.linkedinUrl && (
                  <a
                    href={contact.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-0.5 text-xs text-blue-500 hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {isApollo && !hasRevealedEmail && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isRevealing}
                  onClick={() => handleRevealEmail(contact, index)}
                  className="h-7 border-purple-500/30 px-2 text-xs text-purple-400 hover:bg-purple-500/10"
                >
                  {isRevealing ? (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  ) : (
                    <Eye className="mr-1 h-3 w-3" />
                  )}
                  {isRevealing ? "Revealing..." : "Reveal Email"}
                </Button>
              )}

              {isSaved ? (
                <span className="flex items-center gap-1 text-xs text-emerald-400">
                  <Check className="h-3.5 w-3.5" />
                  Saved
                </span>
              ) : (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isPending}
                    onClick={() => handleSaveContact(contact)}
                    className="h-7 border-white/10 px-2 text-xs text-zinc-400 hover:text-white"
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Save
                  </Button>
                  {hasRevealedEmail && contact.email && (
                    <QuickComposeDialog
                      lead={{
                        id: "",
                        name: contact.name || contact.email.split("@")[0],
                        email: contact.email,
                        businessName,
                        leadType,
                      }}
                      trigger={
                        <Button
                          size="sm"
                          className="h-7 bg-gold px-2 text-xs text-black hover:bg-gold-light"
                        >
                          <Mail className="mr-1 h-3 w-3" />
                          Email
                        </Button>
                      }
                    />
                  )}
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
