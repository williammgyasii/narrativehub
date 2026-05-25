"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import {
  Mail,
  Send,
  Save,
  AlertTriangle,
  Sparkles,
  Loader2,
  User,
  Building2,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Bot,
  Pencil,
  RotateCcw,
} from "lucide-react";
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
import { cn } from "@/lib/utils";

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

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function mergeTemplate(template: string, lead: LeadInfo): string {
  return template
    .replace(/\{\{name\}\}/g, lead.name)
    .replace(/\{\{business\}\}/g, lead.businessName || "your company")
    .replace(/\{\{lead_type\}\}/g, lead.leadType.replace("_", " "))
    .replace(/\{\{email\}\}/g, lead.email || "");
}

const STEP_LABELS = ["AI Draft", "Edit Email", "Send"] as const;

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-1">
      {STEP_LABELS.map((label, i) => (
        <div key={label} className="flex items-center gap-1">
          <div
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-all",
              i < current && "bg-green-500/20 text-green-400",
              i === current && "bg-gold/20 text-gold ring-1 ring-gold/30",
              i > current && "bg-white/5 text-zinc-600"
            )}
          >
            {i < current ? (
              <CheckCircle2 className="h-3.5 w-3.5" />
            ) : (
              i + 1
            )}
          </div>
          <span
            className={cn(
              "text-[11px] font-medium hidden sm:inline",
              i === current ? "text-zinc-300" : "text-zinc-600"
            )}
          >
            {label}
          </span>
          {i < STEP_LABELS.length - 1 && (
            <div className={cn(
              "h-px w-4 sm:w-6 mx-1",
              i < current ? "bg-green-500/30" : "bg-white/10"
            )} />
          )}
        </div>
      ))}
    </div>
  );
}

export function QuickComposeDialog({
  lead,
  trigger,
}: {
  lead: LeadInfo;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [templates, setTemplates] = useState<TemplateInfo[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [isSending, startSending] = useTransition();
  const [isSaving, startSaving] = useTransition();
  const [sent, setSent] = useState(false);

  // AI Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      fetch("/api/outreach/templates")
        .then((r) => r.json())
        .then((data) => setTemplates(data.templates || []))
        .catch(() => {});
    }
  }, [open]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  function reset() {
    setStep(0);
    setSubject("");
    setBody("");
    setSelectedTemplateId("");
    setChatMessages([]);
    setChatInput("");
    setSent(false);
  }

  function handleClose(val: boolean) {
    setOpen(val);
    if (!val) setTimeout(reset, 300);
  }

  function applyTemplate(templateId: string | null) {
    if (!templateId) return;
    setSelectedTemplateId(templateId);
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;
    setSubject(mergeTemplate(template.subject, lead));
    setBody(mergeTemplate(template.body, lead));
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
          leadName: lead.name,
          businessName: lead.businessName,
          leadType: lead.leadType,
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
        setSent(true);
        setStep(2);
        toast.success(`Email sent to ${lead.name}`);
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
      }
    });
  }

  const canProceedToEdit = subject.trim() && body.trim();
  const canSend = lead.email && subject.trim() && body.trim();

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetTrigger
        render={
          (trigger as React.ReactElement) || (
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
        className="border-white/10 bg-surface sm:max-w-4xl w-full flex flex-col overflow-hidden p-0"
      >
        {/* Header */}
        <SheetHeader className="border-b border-white/10 px-6 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <SheetTitle className="font-heading text-lg text-white">
              Compose Email
            </SheetTitle>
            <StepIndicator current={step} />
          </div>
          <SheetDescription className="sr-only">
            Multi-step email composer for {lead.name}
          </SheetDescription>

          {/* Recipient pill */}
          <div className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/2 p-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gold/10 text-gold shrink-0">
              <User className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white truncate">
                {lead.name}
              </p>
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                {lead.email && <span>{lead.email}</span>}
                {lead.businessName && (
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {lead.businessName}
                  </span>
                )}
              </div>
            </div>
            <span className="text-[10px] uppercase tracking-wider text-zinc-600 bg-white/5 px-2 py-0.5 rounded">
              {lead.leadType.replace("_", " ")}
            </span>
          </div>
        </SheetHeader>

        {!lead.email && (
          <div className="mx-6 mt-4 flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-sm text-amber-400">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            This lead has no email address. Add one first.
          </div>
        )}

        {/* ──────────── STEP 0: AI Chat ──────────── */}
        {step === 0 && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {/* Intro message */}
              {chatMessages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center gap-4 py-8">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-500/10">
                    <Bot className="h-7 w-7 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-300">
                      AI Email Assistant
                    </p>
                    <p className="text-xs text-zinc-500 max-w-sm mt-1">
                      Tell me what kind of email you want to send to{" "}
                      <span className="text-zinc-400">{lead.name}</span>. I'll
                      draft a professional email using your profile and
                      signature.
                    </p>
                  </div>

                  {/* Quick prompt suggestions */}
                  <div className="flex flex-wrap gap-2 justify-center mt-2">
                    {lead.leadType === "wedding" && (
                      <>
                        <button
                          onClick={() => setChatInput("Pitch a venue partnership for wedding photography")}
                          className="text-[11px] px-3 py-1.5 rounded-full border border-purple-500/20 bg-purple-500/5 text-purple-300 hover:bg-purple-500/10 transition-colors"
                        >
                          Venue partnership pitch
                        </button>
                        <button
                          onClick={() => setChatInput("Offer styled shoot collaboration")}
                          className="text-[11px] px-3 py-1.5 rounded-full border border-purple-500/20 bg-purple-500/5 text-purple-300 hover:bg-purple-500/10 transition-colors"
                        >
                          Styled shoot collab
                        </button>
                      </>
                    )}
                    {lead.leadType === "corporate" && (
                      <>
                        <button
                          onClick={() => setChatInput("Offer corporate headshot and event photography services")}
                          className="text-[11px] px-3 py-1.5 rounded-full border border-purple-500/20 bg-purple-500/5 text-purple-300 hover:bg-purple-500/10 transition-colors"
                        >
                          Corporate headshot offer
                        </button>
                        <button
                          onClick={() => setChatInput("Pitch event coverage for their next conference")}
                          className="text-[11px] px-3 py-1.5 rounded-full border border-purple-500/20 bg-purple-500/5 text-purple-300 hover:bg-purple-500/10 transition-colors"
                        >
                          Conference coverage
                        </button>
                      </>
                    )}
                    {lead.leadType === "real_estate" && (
                      <>
                        <button
                          onClick={() => setChatInput("Offer real estate listing photography with fast turnaround")}
                          className="text-[11px] px-3 py-1.5 rounded-full border border-purple-500/20 bg-purple-500/5 text-purple-300 hover:bg-purple-500/10 transition-colors"
                        >
                          Listing photo offer
                        </button>
                        <button
                          onClick={() => setChatInput("Pitch drone aerial photography for luxury listings")}
                          className="text-[11px] px-3 py-1.5 rounded-full border border-purple-500/20 bg-purple-500/5 text-purple-300 hover:bg-purple-500/10 transition-colors"
                        >
                          Drone/aerial pitch
                        </button>
                      </>
                    )}
                    {lead.leadType === "architectural" && (
                      <>
                        <button
                          onClick={() => setChatInput("Offer architectural photography for their portfolio")}
                          className="text-[11px] px-3 py-1.5 rounded-full border border-purple-500/20 bg-purple-500/5 text-purple-300 hover:bg-purple-500/10 transition-colors"
                        >
                          Portfolio photography
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

                  {/* Template option */}
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

              {/* Chat messages */}
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
                      "max-w-[85%] rounded-xl px-4 py-2.5 text-sm leading-relaxed",
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

            {/* Chat input */}
            <div className="border-t border-white/10 px-6 py-4">
              <div className="flex gap-2">
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && !e.shiftKey && handleAiChat()
                  }
                  placeholder="Describe the email you want to send..."
                  disabled={isGenerating}
                  className="flex-1 border-white/10 bg-white/5 text-white placeholder:text-zinc-600"
                />
                <Button
                  onClick={handleAiChat}
                  disabled={isGenerating || !chatInput.trim()}
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

        {/* ──────────── STEP 1: Edit Email ──────────── */}
        {step === 1 && (
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            {/* Subject */}
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

            {/* Body */}
            <div className="space-y-1.5 flex-1">
              <label className="text-xs font-medium text-zinc-500">
                Message
              </label>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your email here..."
                rows={14}
                className="border-white/10 bg-white/5 text-white placeholder:text-zinc-600 resize-none min-h-[300px]"
              />
              <p className="text-[11px] text-zinc-600">
                Variables: {"{{name}}"}, {"{{business}}"}, {"{{lead_type}}"}
              </p>
            </div>

            {/* Template quick-switch */}
            {templates.length > 0 && (
              <div className="pt-2">
                <Select value={selectedTemplateId} onValueChange={applyTemplate}>
                  <SelectTrigger className="border-white/10 bg-white/5 text-white text-xs w-full">
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
              </div>
            )}
          </div>
        )}

        {/* ──────────── STEP 2: Send / Confirmation ──────────── */}
        {step === 2 && (
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {sent ? (
              <div className="flex flex-col items-center justify-center h-full text-center gap-4 py-12">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-green-500/10">
                  <CheckCircle2 className="h-8 w-8 text-green-400" />
                </div>
                <div>
                  <p className="text-lg font-heading font-medium text-white">
                    Email Sent!
                  </p>
                  <p className="text-sm text-zinc-500 mt-1">
                    Your email to{" "}
                    <span className="text-zinc-300">{lead.name}</span> has been
                    delivered via Resend.
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
                  <p className="text-sm text-zinc-300">{lead.email}</p>
                </div>
                <Button
                  variant="outline"
                  className="mt-4 border-white/10 text-zinc-400"
                  onClick={() => handleClose(false)}
                >
                  Close
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

                {/* Email preview */}
                <div className="rounded-lg border border-white/10 bg-white/2 overflow-hidden">
                  <div className="border-b border-white/5 px-4 py-2.5 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-zinc-600">
                        To
                      </p>
                      <p className="text-sm text-zinc-300">
                        {lead.name} &lt;{lead.email}&gt;
                      </p>
                    </div>
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
                    <div className="text-sm text-zinc-400 whitespace-pre-wrap leading-relaxed max-h-52 overflow-y-auto">
                      {body}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ──────────── Footer ──────────── */}
        {!sent && (
          <SheetFooter className="border-t border-white/10 px-6 py-3">
            <div className="flex w-full items-center justify-between">
              {/* Left side */}
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

              {/* Right side */}
              <div className="flex items-center gap-2">
                {step === 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSaveDraft}
                    disabled={
                      isSaving || !subject.trim() || !body.trim()
                    }
                    className="border-white/10 text-zinc-400"
                  >
                    <Save className="mr-1.5 h-3.5 w-3.5" />
                    {isSaving ? "Saving..." : "Save Draft"}
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
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
