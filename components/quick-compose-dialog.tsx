"use client";

import { useState, useEffect, useTransition } from "react";
import { Mail, Send, Save, AlertTriangle, Sparkles, Loader2, User, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { sendOutreachDirect, saveDraft } from "@/lib/actions/outreach";
import { toast } from "sonner";

interface LeadInfo {
  id: string;
  name: string;
  email: string | null;
  businessName: string | null;
  leadType: string;
}

interface TemplateInfo {
  id: string;
  name: string;
  subject: string;
  body: string;
  leadType: string;
}

function mergeTemplate(template: string, lead: LeadInfo): string {
  return template
    .replace(/\{\{name\}\}/g, lead.name)
    .replace(/\{\{business\}\}/g, lead.businessName || "your company")
    .replace(/\{\{lead_type\}\}/g, lead.leadType.replace("_", " "))
    .replace(/\{\{email\}\}/g, lead.email || "");
}

export function QuickComposeDialog({
  lead,
  trigger,
}: {
  lead: LeadInfo;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<TemplateInfo[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [isSending, startSending] = useTransition();
  const [isSaving, startSaving] = useTransition();
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAiPrompt, setShowAiPrompt] = useState(false);

  useEffect(() => {
    if (open) {
      fetch("/api/outreach/templates")
        .then((r) => r.json())
        .then((data) => setTemplates(data.templates || []))
        .catch(() => {});
    }
  }, [open]);

  function applyTemplate(templateId: string) {
    setSelectedTemplateId(templateId);
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;
    setSubject(mergeTemplate(template.subject, lead));
    setBody(mergeTemplate(template.body, lead));
  }

  function handleSend() {
    startSending(async () => {
      const result = await sendOutreachDirect({
        leadId: lead.id,
        subject,
        body,
        templateId: selectedTemplateId || undefined,
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Email sent to ${lead.name}`);
        setOpen(false);
        setSubject("");
        setBody("");
        setSelectedTemplateId("");
      }
    });
  }

  function handleSaveDraft() {
    startSaving(async () => {
      const result = await saveDraft({
        leadId: lead.id,
        subject,
        body,
        templateId: selectedTemplateId || undefined,
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Draft saved");
        setOpen(false);
        setSubject("");
        setBody("");
        setSelectedTemplateId("");
      }
    });
  }

  async function handleGenerate() {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);
    try {
      const res = await fetch("/api/ai/generate-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: aiPrompt,
          leadName: lead.name,
          businessName: lead.businessName,
          leadType: lead.leadType,
        }),
      });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
      } else {
        setSubject(data.subject);
        setBody(data.body);
        setShowAiPrompt(false);
        setAiPrompt("");
        toast.success("Email generated — review and edit before sending");
      }
    } catch {
      toast.error("Failed to generate email");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          trigger || (
            <Button
              size="sm"
              variant="outline"
              className="border-white/10 text-zinc-400 hover:border-gold/30 hover:text-gold"
            >
              <Mail className="mr-1.5 h-3.5 w-3.5" />
              Email
            </Button>
          )
        }
      />
      <SheetContent
        side="right"
        className="border-white/10 bg-surface sm:max-w-xl w-full flex flex-col overflow-y-auto"
      >
        <SheetHeader className="border-b border-white/10 pb-4">
          <SheetTitle className="font-heading text-xl text-white">
            Compose Email
          </SheetTitle>
          <SheetDescription className="sr-only">
            Compose and send an email to {lead.name}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-5 p-4 overflow-y-auto">
          {/* Recipient */}
          <div className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/2 p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gold/10 text-gold shrink-0">
              <User className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{lead.name}</p>
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                {lead.email && <span>{lead.email}</span>}
                {lead.businessName && (
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {lead.businessName}
                  </span>
                )}
              </div>
            </div>
          </div>

          {!lead.email && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-sm text-amber-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              This lead has no email address. Add one first.
            </div>
          )}

          {/* Template + AI row */}
          <div className="flex items-center gap-2">
            {templates.length > 0 && (
              <Select value={selectedTemplateId} onValueChange={applyTemplate}>
                <SelectTrigger className="flex-1 border-white/10 bg-white/5 text-white">
                  <SelectValue placeholder="Choose a template..." />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-surface-hover">
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setShowAiPrompt(!showAiPrompt)}
              className="shrink-0 border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
            >
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              AI Generate
            </Button>
          </div>

          {/* AI Prompt */}
          {showAiPrompt && (
            <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-3 space-y-2">
              <p className="text-xs text-purple-300">
                Describe the email you want — AI will generate it using your
                profile, signed with your name and contact info.
              </p>
              {lead.leadType && (
                <p className="text-[11px] text-purple-400/70">
                  Context: {lead.leadType.replace("_", " ")} lead
                  {lead.businessName ? ` at ${lead.businessName}` : ""}
                </p>
              )}
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                  placeholder={
                    lead.leadType === "wedding"
                      ? 'e.g. "Pitch a venue partnership"'
                      : lead.leadType === "corporate"
                        ? 'e.g. "Offer headshot services"'
                        : lead.leadType === "real_estate"
                          ? 'e.g. "Offer listing photography"'
                          : 'e.g. "Introduce my services"'
                  }
                  className="flex-1 border-purple-500/20 bg-white/5 text-white placeholder:text-zinc-600 text-sm"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleGenerate}
                  disabled={isGenerating || !aiPrompt.trim()}
                  className="bg-purple-600 text-white hover:bg-purple-500 w-full sm:w-auto"
                >
                  {isGenerating ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    "Generate"
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Subject */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-500">Subject</label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject line..."
              className="border-white/10 bg-white/5 text-white placeholder:text-zinc-600"
            />
          </div>

          {/* Body */}
          <div className="space-y-1.5 flex-1">
            <label className="text-xs font-medium text-zinc-500">Message</label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your email here..."
              rows={8}
              className="border-white/10 bg-white/5 text-white placeholder:text-zinc-600 resize-none min-h-[160px] sm:min-h-[280px] sm:rows-[14]"
            />
            <p className="text-[11px] text-zinc-600">
              Variables: {"{{name}}"}, {"{{business}}"}, {"{{lead_type}}"}
            </p>
          </div>
        </div>

        {/* Footer */}
        <SheetFooter className="border-t border-white/10 pt-3">
          <div className="flex w-full flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveDraft}
              disabled={isSaving || !subject.trim() || !body.trim()}
              className="border-white/10 text-zinc-400"
            >
              <Save className="mr-1.5 h-3.5 w-3.5" />
              {isSaving ? "Saving..." : "Save Draft"}
            </Button>
            <Button
              size="sm"
              onClick={handleSend}
              disabled={
                isSending || !lead.email || !subject.trim() || !body.trim()
              }
              className="bg-gold text-black hover:bg-gold-light"
            >
              <Send className="mr-1.5 h-3.5 w-3.5" />
              {isSending ? "Sending..." : "Send Email"}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
