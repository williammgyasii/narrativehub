"use client";

import { useState, useActionState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { sendOutreach, saveDraft } from "@/lib/actions/outreach";
import type { Lead, OutreachTemplate } from "@/lib/db/schema";
import { Send, Save, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

function mergeTemplate(template: string, lead: Lead | undefined): string {
  if (!lead) return template;
  return template
    .replace(/\{\{name\}\}/g, lead.name)
    .replace(/\{\{business\}\}/g, lead.businessName || "your company")
    .replace(/\{\{lead_type\}\}/g, lead.leadType.replace("_", " "))
    .replace(/\{\{email\}\}/g, lead.email || "");
}

export function ComposeForm({
  leads,
  templates,
  defaultLeadId,
  defaultSubject,
  defaultBody,
  draftId,
}: {
  leads: Lead[];
  templates: OutreachTemplate[];
  defaultLeadId?: string;
  defaultSubject?: string;
  defaultBody?: string;
  draftId?: string;
}) {
  const [selectedLeadId, setSelectedLeadId] = useState(defaultLeadId || "");
  const [subject, setSubject] = useState(defaultSubject || "");
  const [body, setBody] = useState(defaultBody || "");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [currentDraftId, setCurrentDraftId] = useState(draftId);
  const [isSaving, startSaving] = useTransition();
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAiPrompt, setShowAiPrompt] = useState(false);

  const selectedLead = leads.find((l) => l.id === selectedLeadId);

  function applyTemplate(templateId: string) {
    setSelectedTemplateId(templateId);
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;
    setSubject(mergeTemplate(template.subject, selectedLead));
    setBody(mergeTemplate(template.body, selectedLead));
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
          leadName: selectedLead?.name,
          businessName: selectedLead?.businessName,
          leadType: selectedLead?.leadType,
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

  function handleSaveDraft() {
    startSaving(async () => {
      const result = await saveDraft({
        leadId: selectedLeadId,
        subject,
        body,
        templateId: selectedTemplateId || undefined,
        draftId: currentDraftId,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        setCurrentDraftId(result.draftId);
        toast.success("Draft saved");
      }
    });
  }

  const [state, formAction, isPending] = useActionState(sendOutreach, null);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="templateId" value={selectedTemplateId} />

      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-300">
          To (Lead) *
        </label>
        <Select
          name="leadId"
          value={selectedLeadId}
          onValueChange={setSelectedLeadId}
        >
          <SelectTrigger className="border-white/10 bg-white/5 text-white">
            <SelectValue placeholder="Select a lead..." />
          </SelectTrigger>
          <SelectContent className="border-white/10 bg-surface-hover">
            {leads.map((lead) => (
              <SelectItem key={lead.id} value={lead.id}>
                {lead.name}{" "}
                {lead.businessName ? `(${lead.businessName})` : ""} —{" "}
                {lead.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {leads.length === 0 && (
          <p className="text-xs text-zinc-500">
            No leads with email addresses. Add emails to your leads first.
          </p>
        )}
      </div>

      <div className="flex items-center gap-2">
        {templates.length > 0 && (
          <div className="flex-1 space-y-2">
            <label className="text-sm font-medium text-zinc-300">
              Template (optional)
            </label>
            <Select value={selectedTemplateId} onValueChange={applyTemplate}>
              <SelectTrigger className="border-white/10 bg-white/5 text-white">
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
          </div>
        )}
        <div className={templates.length > 0 ? "self-end" : ""}>
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowAiPrompt(!showAiPrompt)}
            className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
          >
            <Sparkles className="mr-1.5 h-4 w-4" />
            AI Generate
          </Button>
        </div>
      </div>

      {showAiPrompt && (
        <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-4 space-y-2">
          <p className="text-xs text-purple-300">
            Describe the email you want — AI will generate subject and body for you to review and edit.
          </p>
          <div className="flex gap-2">
            <Input
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
              placeholder='e.g. "Pitch my photography services for their corporate events"'
              className="flex-1 border-purple-500/20 bg-white/5 text-white placeholder:text-zinc-600"
            />
            <Button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating || !aiPrompt.trim()}
              className="bg-purple-600 text-white hover:bg-purple-500"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                "Generate"
              )}
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-300">Subject *</label>
        <Input
          name="subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Photography services for {{business}}"
          required
          className="border-white/10 bg-white/5 text-white placeholder:text-zinc-600"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-300">Body *</label>
        <Textarea
          name="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write your email here..."
          rows={10}
          required
          className="border-white/10 bg-white/5 text-white placeholder:text-zinc-600"
        />
        <p className="text-xs text-zinc-600">
          Variables: {"{{name}}"}, {"{{business}}"}, {"{{lead_type}}"}
        </p>
      </div>

      {state?.error && (
        <p className="text-sm text-red-400">{state.error as string}</p>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleSaveDraft}
          disabled={isSaving || !selectedLeadId || !subject.trim() || !body.trim()}
          className="border-white/10 text-zinc-400"
        >
          <Save className="mr-1.5 h-4 w-4" />
          {isSaving ? "Saving..." : currentDraftId ? "Update Draft" : "Save Draft"}
        </Button>
        <Button
          type="submit"
          disabled={isPending || !selectedLeadId}
          className="bg-gold text-black hover:bg-gold-light"
        >
          <Send className="mr-1.5 h-4 w-4" />
          {isPending ? "Sending..." : "Send Email"}
        </Button>
      </div>
    </form>
  );
}
