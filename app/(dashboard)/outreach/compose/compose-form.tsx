"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
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
import {
  Send,
  Save,
  Sparkles,
  Loader2,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Bot,
  Pencil,
  User,
  Building2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function mergeTemplate(template: string, lead: Lead | undefined): string {
  if (!lead) return template;
  return template
    .replace(/\{\{name\}\}/g, lead.name)
    .replace(/\{\{business\}\}/g, lead.businessName || "your company")
    .replace(/\{\{lead_type\}\}/g, lead.leadType.replace("_", " "))
    .replace(/\{\{email\}\}/g, lead.email || "");
}

const STEP_LABELS = ["AI Draft", "Edit Email", "Send"] as const;

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {STEP_LABELS.map((label, i) => (
        <div key={label} className="flex items-center gap-1.5">
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-all",
              i < current && "bg-green-500/20 text-green-400",
              i === current && "bg-gold/20 text-gold ring-1 ring-gold/30",
              i > current && "bg-white/5 text-zinc-600"
            )}
          >
            {i < current ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
          </div>
          <span
            className={cn(
              "text-xs font-medium",
              i === current ? "text-zinc-300" : "text-zinc-600"
            )}
          >
            {label}
          </span>
          {i < STEP_LABELS.length - 1 && (
            <div
              className={cn(
                "h-px w-8 mx-2",
                i < current ? "bg-green-500/30" : "bg-white/10"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export function ComposeMultiStep({
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
  const router = useRouter();
  const [step, setStep] = useState(defaultSubject ? 1 : 0);
  const [selectedLeadId, setSelectedLeadId] = useState(defaultLeadId || "");
  const [subject, setSubject] = useState(defaultSubject || "");
  const [body, setBody] = useState(defaultBody || "");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [currentDraftId, setCurrentDraftId] = useState(draftId);
  const [isSaving, startSaving] = useTransition();
  const [isSending, startSending] = useTransition();
  const [sent, setSent] = useState(false);

  // AI Chat
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const selectedLead = leads.find((l) => l.id === selectedLeadId);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  function applyTemplate(templateId: string) {
    setSelectedTemplateId(templateId);
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;
    setSubject(mergeTemplate(template.subject, selectedLead));
    setBody(mergeTemplate(template.body, selectedLead));
  }

  async function handleAiChat() {
    if (!chatInput.trim()) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setIsGenerating(true);

    try {
      const res = await fetch("/api/ai/generate-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: userMsg,
          leadName: selectedLead?.name,
          businessName: selectedLead?.businessName,
          leadType: selectedLead?.leadType,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setChatMessages((prev) => [
          ...prev,
          { role: "assistant", content: `Error: ${data.error}` },
        ]);
      } else {
        setSubject(data.subject);
        setBody(data.body);
        setChatMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `Done! Here's what I've drafted:\n\n**Subject:** ${data.subject}\n\n---\n\n${data.body}\n\n---\n\nYou can refine it by telling me what to change, or move to the next step to edit directly.`,
          },
        ]);
      }
    } catch {
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Failed to generate — please try again." },
      ]);
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

  function handleSend() {
    startSending(async () => {
      const result = await saveDraft({
        leadId: selectedLeadId,
        subject,
        body,
        templateId: selectedTemplateId || undefined,
        draftId: currentDraftId,
      });

      const directResult = await (
        await import("@/lib/actions/outreach")
      ).sendOutreachDirect({
        leadId: selectedLeadId,
        subject,
        body,
        templateId: selectedTemplateId || undefined,
      });

      if (directResult.error) {
        toast.error(directResult.error);
      } else {
        setSent(true);
        toast.success(`Email sent to ${selectedLead?.name}`);
      }
    });
  }

  const canProceedToEdit = subject.trim() && body.trim();
  const canSend = selectedLeadId && selectedLead?.email && subject.trim() && body.trim();

  return (
    <div className="max-w-4xl">
      {/* Step indicator */}
      <div className="mb-6">
        <StepIndicator current={step} />
      </div>

      {/* Lead selector (always visible at top if no lead selected) */}
      {!sent && (
        <div className="mb-6 rounded-xl border border-white/10 bg-surface p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 space-y-1">
              <label className="text-xs font-medium text-zinc-500">
                To (Lead)
              </label>
              <Select
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
            </div>
            {selectedLead && (
              <div className="flex items-center gap-2 pt-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gold/10 text-gold shrink-0">
                  <User className="h-3.5 w-3.5" />
                </div>
                <div className="text-xs text-zinc-500">
                  <p className="text-zinc-300 font-medium">
                    {selectedLead.email}
                  </p>
                  {selectedLead.businessName && (
                    <p className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {selectedLead.businessName}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
          {leads.length === 0 && (
            <p className="text-xs text-zinc-500 mt-2">
              No leads with email addresses. Add emails to your leads first.
            </p>
          )}
        </div>
      )}

      {/* ──── Step 0: AI Chat ──── */}
      {step === 0 && (
        <div className="rounded-xl border border-white/10 bg-surface overflow-hidden">
          <div className="min-h-[400px] max-h-[500px] overflow-y-auto p-6 space-y-4">
            {chatMessages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-[340px] text-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-500/10">
                  <Bot className="h-7 w-7 text-purple-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-300">
                    AI Email Assistant
                  </p>
                  <p className="text-xs text-zinc-500 max-w-md mt-1">
                    {selectedLead
                      ? `Tell me what kind of email you want to send to ${selectedLead.name}. I'll draft a professional email using your profile and signature.`
                      : "Select a lead above, then describe the email you want. I'll draft it with your profile and signature."}
                  </p>
                </div>

                {selectedLead && (
                  <div className="flex flex-wrap gap-2 justify-center mt-2">
                    {selectedLead.leadType === "wedding" && (
                      <>
                        <button
                          onClick={() => setChatInput("Pitch a venue partnership for wedding photography")}
                          className="text-[11px] px-3 py-1.5 rounded-full border border-purple-500/20 bg-purple-500/5 text-purple-300 hover:bg-purple-500/10 transition-colors"
                        >
                          Venue partnership
                        </button>
                        <button
                          onClick={() => setChatInput("Offer styled shoot collaboration")}
                          className="text-[11px] px-3 py-1.5 rounded-full border border-purple-500/20 bg-purple-500/5 text-purple-300 hover:bg-purple-500/10 transition-colors"
                        >
                          Styled shoot
                        </button>
                      </>
                    )}
                    {selectedLead.leadType === "corporate" && (
                      <>
                        <button
                          onClick={() => setChatInput("Offer corporate headshot and event photography services")}
                          className="text-[11px] px-3 py-1.5 rounded-full border border-purple-500/20 bg-purple-500/5 text-purple-300 hover:bg-purple-500/10 transition-colors"
                        >
                          Corporate headshots
                        </button>
                        <button
                          onClick={() => setChatInput("Pitch event coverage for their next conference")}
                          className="text-[11px] px-3 py-1.5 rounded-full border border-purple-500/20 bg-purple-500/5 text-purple-300 hover:bg-purple-500/10 transition-colors"
                        >
                          Conference coverage
                        </button>
                      </>
                    )}
                    {selectedLead.leadType === "real_estate" && (
                      <>
                        <button
                          onClick={() => setChatInput("Offer real estate listing photography with fast turnaround")}
                          className="text-[11px] px-3 py-1.5 rounded-full border border-purple-500/20 bg-purple-500/5 text-purple-300 hover:bg-purple-500/10 transition-colors"
                        >
                          Listing photos
                        </button>
                        <button
                          onClick={() => setChatInput("Pitch drone aerial photography for luxury listings")}
                          className="text-[11px] px-3 py-1.5 rounded-full border border-purple-500/20 bg-purple-500/5 text-purple-300 hover:bg-purple-500/10 transition-colors"
                        >
                          Drone/aerial
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => setChatInput("Write a friendly introduction email for my photography services")}
                      className="text-[11px] px-3 py-1.5 rounded-full border border-purple-500/20 bg-purple-500/5 text-purple-300 hover:bg-purple-500/10 transition-colors"
                    >
                      General intro
                    </button>
                  </div>
                )}

                {templates.length > 0 && (
                  <div className="mt-4 w-full max-w-xs">
                    <p className="text-[11px] text-zinc-600 mb-1.5 text-center">
                      Or start from a template:
                    </p>
                    <Select
                      value={selectedTemplateId}
                      onValueChange={(id) => {
                        applyTemplate(id);
                        setStep(1);
                      }}
                    >
                      <SelectTrigger className="border-white/10 bg-white/5 text-white text-xs">
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
              </div>
            )}

            {chatMessages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "flex",
                  msg.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[80%] rounded-xl px-4 py-2.5 text-sm leading-relaxed",
                    msg.role === "user"
                      ? "bg-gold/15 text-zinc-200"
                      : "bg-white/5 text-zinc-300 border border-white/5"
                  )}
                >
                  {msg.role === "assistant" && (
                    <Bot className="h-3.5 w-3.5 text-purple-400 mb-1" />
                  )}
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}

            {isGenerating && (
              <div className="flex justify-start">
                <div className="bg-white/5 border border-white/5 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-zinc-500">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-400" />
                  Drafting your email...
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="border-t border-white/10 p-4">
            <div className="flex gap-2">
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && !e.shiftKey && handleAiChat()
                }
                placeholder={
                  selectedLead
                    ? "Describe the email you want to send..."
                    : "Select a lead first..."
                }
                disabled={isGenerating || !selectedLeadId}
                className="flex-1 border-white/10 bg-white/5 text-white placeholder:text-zinc-600"
              />
              <Button
                onClick={handleAiChat}
                disabled={isGenerating || !chatInput.trim() || !selectedLeadId}
                className="bg-purple-600 text-white hover:bg-purple-500 shrink-0"
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ──── Step 1: Edit Email ──── */}
      {step === 1 && (
        <div className="rounded-xl border border-white/10 bg-surface p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-500">
              Subject
            </label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject line..."
              className="border-white/10 bg-white/5 text-white placeholder:text-zinc-600"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-500">
              Message
            </label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your email here..."
              rows={16}
              className="border-white/10 bg-white/5 text-white placeholder:text-zinc-600 resize-none min-h-[350px]"
            />
            <p className="text-[11px] text-zinc-600">
              Variables: {"{{name}}"}, {"{{business}}"}, {"{{lead_type}}"}
            </p>
          </div>

          {templates.length > 0 && (
            <Select value={selectedTemplateId} onValueChange={applyTemplate}>
              <SelectTrigger className="border-white/10 bg-white/5 text-white text-xs w-full max-w-xs">
                <SelectValue placeholder="Switch to a template..." />
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
        </div>
      )}

      {/* ──── Step 2: Send / Confirmation ──── */}
      {step === 2 && (
        <div className="rounded-xl border border-white/10 bg-surface p-6">
          {sent ? (
            <div className="flex flex-col items-center text-center gap-4 py-12">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-green-500/10">
                <CheckCircle2 className="h-8 w-8 text-green-400" />
              </div>
              <div>
                <p className="text-lg font-heading font-medium text-white">
                  Email Sent!
                </p>
                <p className="text-sm text-zinc-500 mt-1">
                  Your email to{" "}
                  <span className="text-zinc-300">{selectedLead?.name}</span>{" "}
                  has been delivered via Resend.
                </p>
              </div>
              <div className="rounded-lg border border-white/5 bg-white/2 p-4 text-left w-full max-w-md mt-2">
                <p className="text-[11px] uppercase tracking-wider text-zinc-600 mb-1">
                  Subject
                </p>
                <p className="text-sm text-zinc-300 mb-3">{subject}</p>
                <p className="text-[11px] uppercase tracking-wider text-zinc-600 mb-1">
                  Sent to
                </p>
                <p className="text-sm text-zinc-300">{selectedLead?.email}</p>
              </div>
              <Button
                variant="outline"
                className="mt-4 border-white/10 text-zinc-400"
                onClick={() => router.push("/outreach")}
              >
                Back to Outreach
              </Button>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="text-center py-4">
                <Send className="h-8 w-8 text-gold mx-auto mb-3" />
                <p className="text-lg font-heading font-medium text-white">
                  Ready to Send?
                </p>
                <p className="text-sm text-zinc-500 mt-1">
                  Review the details below before sending.
                </p>
              </div>

              <div className="rounded-lg border border-white/10 bg-white/2 overflow-hidden">
                <div className="border-b border-white/5 px-4 py-2.5">
                  <p className="text-[11px] uppercase tracking-wider text-zinc-600">
                    To
                  </p>
                  <p className="text-sm text-zinc-300">
                    {selectedLead?.name} &lt;{selectedLead?.email}&gt;
                  </p>
                </div>
                <div className="border-b border-white/5 px-4 py-2.5">
                  <p className="text-[11px] uppercase tracking-wider text-zinc-600">
                    Subject
                  </p>
                  <p className="text-sm text-white font-medium">{subject}</p>
                </div>
                <div className="px-4 py-3">
                  <p className="text-[11px] uppercase tracking-wider text-zinc-600 mb-2">
                    Message
                  </p>
                  <div className="text-sm text-zinc-400 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
                    {body}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ──── Footer nav ──── */}
      {!sent && (
        <div className="mt-6 flex items-center justify-between">
          <div>
            {step === 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep(1)}
                className="border-white/10 text-zinc-400"
              >
                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                Skip to Editor
              </Button>
            )}
            {step > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep(step - 1)}
                className="border-white/10 text-zinc-400"
              >
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                Back
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {step === 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveDraft}
                disabled={
                  isSaving ||
                  !selectedLeadId ||
                  !subject.trim() ||
                  !body.trim()
                }
                className="border-white/10 text-zinc-400"
              >
                <Save className="mr-1.5 h-3.5 w-3.5" />
                {isSaving
                  ? "Saving..."
                  : currentDraftId
                    ? "Update Draft"
                    : "Save Draft"}
              </Button>
            )}

            {step === 0 && canProceedToEdit && (
              <Button
                size="sm"
                onClick={() => setStep(1)}
                className="bg-gold text-black hover:bg-gold-light"
              >
                Review Email
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            )}

            {step === 1 && (
              <Button
                size="sm"
                onClick={() => setStep(2)}
                disabled={!canSend}
                className="bg-gold text-black hover:bg-gold-light"
              >
                Review & Send
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            )}

            {step === 2 && !sent && (
              <Button
                size="sm"
                onClick={handleSend}
                disabled={isSending || !canSend}
                className="bg-green-600 text-white hover:bg-green-500"
              >
                <Send className="mr-1.5 h-3.5 w-3.5" />
                {isSending ? "Sending..." : "Send Now"}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
