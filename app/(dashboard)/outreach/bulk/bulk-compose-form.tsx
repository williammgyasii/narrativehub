"use client";

import { useState, useMemo, useTransition } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
} from "@tanstack/react-table";
import {
  Send,
  ChevronLeft,
  ChevronRight,
  Eye,
  Users,
  CheckCircle2,
  XCircle,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { sendBulkOutreach } from "@/lib/actions/outreach";
import type { Lead, OutreachTemplate } from "@/lib/db/schema";
import { toast } from "sonner";

const columnHelper = createColumnHelper<Lead>();

function mergePreview(
  template: string,
  lead: Lead
): string {
  return template
    .replace(/\{\{name\}\}/g, lead.name)
    .replace(/\{\{business\}\}/g, lead.businessName || "your company")
    .replace(/\{\{lead_type\}\}/g, lead.leadType.replace("_", " "))
    .replace(/\{\{email\}\}/g, lead.email || "");
}

type Step = "select" | "compose" | "preview" | "sending" | "done";

export function BulkComposeForm({
  leads,
  templates,
}: {
  leads: Lead[];
  templates: OutreachTemplate[];
}) {
  const [step, setStep] = useState<Step>("select");
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [globalFilter, setGlobalFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [sendResult, setSendResult] = useState<{
    sent: number;
    failed: number;
    errors: string[];
  } | null>(null);
  const [isSending, startSending] = useTransition();
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAiPrompt, setShowAiPrompt] = useState(false);

  const filteredLeads = useMemo(() => {
    if (typeFilter === "all") return leads;
    return leads.filter((l) => l.leadType === typeFilter);
  }, [leads, typeFilter]);

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(!!value)
            }
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
          />
        ),
      }),
      columnHelper.accessor("name", {
        header: "Name",
        cell: (info) => (
          <div>
            <p className="font-medium text-white">{info.getValue()}</p>
            {info.row.original.businessName && (
              <p className="text-xs text-zinc-500">
                {info.row.original.businessName}
              </p>
            )}
          </div>
        ),
      }),
      columnHelper.accessor("email", {
        header: "Email",
        cell: (info) => (
          <span className="text-sm text-blue-400">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("leadType", {
        header: "Type",
        cell: (info) => {
          const colors: Record<string, string> = {
            wedding: "border-pink-500/20 text-pink-400",
            corporate: "border-blue-500/20 text-blue-400",
            real_estate: "border-emerald-500/20 text-emerald-400",
            architectural: "border-purple-500/20 text-purple-400",
          };
          return (
            <Badge
              variant="outline"
              className={colors[info.getValue()] || ""}
            >
              {info.getValue().replace("_", " ")}
            </Badge>
          );
        },
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: (info) => (
          <span className="text-xs capitalize text-zinc-500">
            {info.getValue()}
          </span>
        ),
      }),
    ],
    []
  );

  const table = useReactTable({
    data: filteredLeads,
    columns,
    state: { rowSelection, globalFilter },
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getRowId: (row) => row.id,
    initialState: { pagination: { pageSize: 15 } },
  });

  const selectedLeadIds = Object.keys(rowSelection).filter(
    (id) => rowSelection[id]
  );
  const selectedLeads = leads.filter((l) => selectedLeadIds.includes(l.id));

  function applyTemplate(templateId: string) {
    setSelectedTemplateId(templateId);
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;
    setSubject(template.subject);
    setBody(template.body);
  }

  async function handleGenerate() {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);
    try {
      const res = await fetch("/api/ai/generate-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: aiPrompt + "\n\nIMPORTANT: Use {{name}} for the recipient's name and {{business}} for their company name as merge variables in the email.",
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
        toast.success("Email template generated — review and edit before sending");
      }
    } catch {
      toast.error("Failed to generate email");
    } finally {
      setIsGenerating(false);
    }
  }

  function handleSend() {
    startSending(async () => {
      setStep("sending");
      const result = await sendBulkOutreach({
        leadIds: selectedLeadIds,
        subjectTemplate: subject,
        bodyTemplate: body,
        templateId: selectedTemplateId || undefined,
      });
      setSendResult(result);
      setStep("done");
      if (result.sent > 0) {
        toast.success(`${result.sent} email${result.sent > 1 ? "s" : ""} sent`);
      }
      if (result.failed > 0) {
        toast.error(`${result.failed} email${result.failed > 1 ? "s" : ""} failed`);
      }
    });
  }

  if (step === "sending") {
    return (
      <Card className="border-white/10 bg-surface">
        <CardContent className="flex flex-col items-center justify-center py-20">
          <Loader2 className="mb-4 h-10 w-10 animate-spin text-gold" />
          <p className="text-lg font-medium text-white">
            Sending emails...
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            Sending to {selectedLeads.length} leads with throttling.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (step === "done" && sendResult) {
    return (
      <Card className="border-white/10 bg-surface">
        <CardContent className="py-12">
          <div className="flex flex-col items-center text-center">
            {sendResult.sent > 0 ? (
              <CheckCircle2 className="mb-4 h-12 w-12 text-emerald-400" />
            ) : (
              <XCircle className="mb-4 h-12 w-12 text-red-400" />
            )}
            <h2 className="text-xl font-bold text-white">
              Bulk Send Complete
            </h2>
            <div className="mt-4 flex gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-400">
                  {sendResult.sent}
                </p>
                <p className="text-xs text-zinc-500">Sent</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-400">
                  {sendResult.failed}
                </p>
                <p className="text-xs text-zinc-500">Failed</p>
              </div>
            </div>
            {sendResult.errors.length > 0 && (
              <div className="mt-6 w-full max-w-md space-y-1">
                <p className="text-sm font-medium text-zinc-400">Errors:</p>
                {sendResult.errors.map((err, i) => (
                  <p key={i} className="text-xs text-red-400">
                    {err}
                  </p>
                ))}
              </div>
            )}
            <Button
              className="mt-6 bg-gold text-black hover:bg-gold-light"
              onClick={() => {
                setStep("select");
                setRowSelection({});
                setSendResult(null);
              }}
            >
              Send More
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === "preview") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium text-white">
              Preview ({selectedLeads.length} emails)
            </h2>
            <p className="text-sm text-zinc-500">
              Review merged emails before sending
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setStep("compose")}
              className="border-white/10 text-zinc-400"
            >
              Back to Edit
            </Button>
            <Button
              onClick={handleSend}
              disabled={isSending}
              className="bg-gold text-black hover:bg-gold-light"
            >
              <Send className="mr-1.5 h-4 w-4" />
              Send All ({selectedLeads.length})
            </Button>
          </div>
        </div>

        <div className="max-h-[600px] space-y-3 overflow-y-auto pr-2">
          {selectedLeads.map((lead) => (
            <Card key={lead.id} className="border-white/10 bg-surface">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <span>
                    To: {lead.name} &lt;{lead.email}&gt;
                  </span>
                </div>
                <p className="mt-2 font-medium text-white">
                  {mergePreview(subject, lead)}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-400">
                  {mergePreview(body, lead)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (step === "compose") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium text-white">
              Compose Email ({selectedLeads.length} recipients)
            </h2>
            <p className="text-sm text-zinc-500">
              Use {"{{variables}}"} — they'll be replaced for each lead
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => setStep("select")}
            className="border-white/10 text-zinc-400"
          >
            Back to Selection
          </Button>
        </div>

        <Card className="border-white/10 bg-surface max-w-2xl">
          <CardContent className="space-y-4 p-6">
            <div className="flex flex-wrap gap-1.5">
              {selectedLeads.slice(0, 5).map((l) => (
                <Badge
                  key={l.id}
                  variant="outline"
                  className="border-white/10 text-zinc-400"
                >
                  {l.name}
                </Badge>
              ))}
              {selectedLeads.length > 5 && (
                <Badge
                  variant="outline"
                  className="border-white/10 text-zinc-500"
                >
                  +{selectedLeads.length - 5} more
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              {templates.length > 0 && (
                <Select
                  value={selectedTemplateId}
                  onValueChange={applyTemplate}
                >
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
                variant="outline"
                size="sm"
                onClick={() => setShowAiPrompt(!showAiPrompt)}
                className="shrink-0 border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
              >
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                AI Generate
              </Button>
            </div>

            {showAiPrompt && (
              <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-3 space-y-2">
                <p className="text-xs text-purple-300">
                  Describe the email — AI will use {"{{name}}"} and {"{{business}}"} merge variables automatically.
                </p>
                <div className="flex gap-2">
                  <Input
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                    placeholder='e.g. "Introduce photography services for corporate events"'
                    className="flex-1 border-purple-500/20 bg-white/5 text-white placeholder:text-zinc-600 text-sm"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleGenerate}
                    disabled={isGenerating || !aiPrompt.trim()}
                    className="bg-purple-600 text-white hover:bg-purple-500"
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

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">
                Subject *
              </label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Photography services for {{business}}"
                className="border-white/10 bg-white/5 text-white placeholder:text-zinc-600"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">
                Body *
              </label>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={`Hi {{name}},\n\nI'm a professional photographer based in the DMV area...\n\nBest,\n[Your Name]`}
                rows={10}
                className="border-white/10 bg-white/5 text-white placeholder:text-zinc-600"
              />
              <p className="text-xs text-zinc-600">
                Variables: {"{{name}}"}, {"{{business}}"}, {"{{lead_type}}"}
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setStep("preview")}
                disabled={!subject.trim() || !body.trim()}
                className="border-white/10 text-zinc-400"
              >
                <Eye className="mr-1.5 h-4 w-4" />
                Preview Emails
              </Button>
              <Button
                onClick={handleSend}
                disabled={isSending || !subject.trim() || !body.trim()}
                className="bg-gold text-black hover:bg-gold-light"
              >
                <Send className="mr-1.5 h-4 w-4" />
                Send All ({selectedLeads.length})
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step: select
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Input
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          placeholder="Search leads..."
          className="max-w-xs border-white/10 bg-white/5 text-white placeholder:text-zinc-600"
        />
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[160px] border-white/10 bg-white/5 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-white/10 bg-surface-hover">
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="wedding">Wedding</SelectItem>
            <SelectItem value="corporate">Corporate</SelectItem>
            <SelectItem value="real_estate">Real Estate</SelectItem>
            <SelectItem value="architectural">Architectural</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex-1" />
        {selectedLeadIds.length > 0 && (
          <Button
            onClick={() => setStep("compose")}
            className="bg-gold text-black hover:bg-gold-light"
          >
            <Users className="mr-1.5 h-4 w-4" />
            Compose for {selectedLeadIds.length} lead
            {selectedLeadIds.length > 1 ? "s" : ""}
          </Button>
        )}
      </div>

      {filteredLeads.length === 0 ? (
        <Card className="border-white/10 bg-surface">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="mb-3 h-10 w-10 text-zinc-700" />
            <p className="text-sm text-zinc-400">
              No leads with email addresses found.
            </p>
            <p className="mt-1 text-xs text-zinc-600">
              Add email addresses to your leads or discover new ones in Lead
              Finder.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="rounded-lg border border-white/10 overflow-hidden">
            <table className="w-full">
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr
                    key={headerGroup.id}
                    className="border-b border-white/10 bg-white/2"
                  >
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500"
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className={`border-b border-white/5 transition-colors hover:bg-white/2 ${
                      row.getIsSelected() ? "bg-gold/5" : ""
                    }`}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-500">
              {selectedLeadIds.length} of {filteredLeads.length} selected
              {" · "}Page {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount()}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="border-white/10 text-zinc-400"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="border-white/10 text-zinc-400"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
