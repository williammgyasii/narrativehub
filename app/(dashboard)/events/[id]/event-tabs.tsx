"use client";

import { useState, useTransition, useRef, useCallback } from "react";
import Link from "next/link";
import {
  FileText,
  ImageIcon,
  Camera,
  DollarSign,
  Sparkles,
  Loader2,
  Plus,
  X,
  LinkIcon,
  StickyNote,
  Upload,
  User,
  Mail,
  Phone,
  ExternalLink,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { GearChecklist } from "@/components/gear-checklist";
import { PaymentStatusSelect } from "@/components/payment-status-select";
import { QuickComposeDialog } from "@/components/quick-compose-dialog";
import {
  updateEventDescription,
  updateClientRequests,
  updateMoodboard,
  updatePaymentLog,
} from "@/lib/actions/events";
import { formatCurrency } from "@/lib/format";
import { toast } from "sonner";

interface MoodboardItem {
  type: "image" | "url" | "note";
  content: string;
  caption?: string;
}

interface PaymentLogEntry {
  date: string;
  label: string;
  amount?: number;
}

interface GearSuggestion {
  item: string;
  category: string;
  priority: "essential" | "nice-to-have";
}

interface LeadInfo {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  businessName: string | null;
  leadType: string;
}

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  ownership: "owned" | "rented" | "wishlist";
  rentalPricePerDay: number | null;
}

interface GearItem {
  item: string;
  checked: boolean;
  rentalCost?: number;
  gearItemId?: string;
}

interface EventTabsProps {
  eventId: string;
  eventTitle: string;
  eventType: string | null;
  location: string | null;
  packagePrice: number;
  paymentStatus: string;
  initialDescription: string | null;
  initialClientRequests: string | null;
  initialMoodboard: MoodboardItem[];
  initialPaymentLog: PaymentLogEntry[];
  initialGearChecklist: GearItem[];
  inventoryItems: InventoryItem[];
  lead: LeadInfo | null;
  notes: string | null;
}

export function EventTabs({
  eventId,
  eventTitle,
  eventType,
  location,
  packagePrice,
  paymentStatus,
  initialDescription,
  initialClientRequests,
  initialMoodboard,
  initialPaymentLog,
  initialGearChecklist,
  inventoryItems,
  lead,
  notes,
}: EventTabsProps) {
  return (
    <Tabs defaultValue="details">
      <TabsList variant="line" className="w-full justify-start border-b border-white/10 rounded-none h-auto pb-0 overflow-x-auto no-scrollbar">
        <TabsTrigger value="details" className="gap-1.5 text-xs sm:text-sm px-3 sm:px-4 py-2 whitespace-nowrap">
          <FileText className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Details</span>
        </TabsTrigger>
        <TabsTrigger value="moodboard" className="gap-1.5 text-xs sm:text-sm px-3 sm:px-4 py-2 whitespace-nowrap">
          <ImageIcon className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Moodboard</span>
        </TabsTrigger>
        <TabsTrigger value="gear" className="gap-1.5 text-xs sm:text-sm px-3 sm:px-4 py-2 whitespace-nowrap">
          <Camera className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Gear</span>
        </TabsTrigger>
        <TabsTrigger value="payment" className="gap-1.5 text-xs sm:text-sm px-3 sm:px-4 py-2 whitespace-nowrap">
          <DollarSign className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Payment</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="details" className="pt-6">
        <DetailsTab
          eventId={eventId}
          eventTitle={eventTitle}
          eventType={eventType}
          location={location}
          initialDescription={initialDescription}
          initialClientRequests={initialClientRequests}
          lead={lead}
          notes={notes}
        />
      </TabsContent>

      <TabsContent value="moodboard" className="pt-6">
        <MoodboardTab eventId={eventId} initialMoodboard={initialMoodboard} />
      </TabsContent>

      <TabsContent value="gear" className="pt-6">
        <GearTab
          eventId={eventId}
          eventType={eventType}
          initialGearChecklist={initialGearChecklist}
          inventoryItems={inventoryItems}
        />
      </TabsContent>

      <TabsContent value="payment" className="pt-6">
        <PaymentTab
          eventId={eventId}
          packagePrice={packagePrice}
          paymentStatus={paymentStatus}
          initialPaymentLog={initialPaymentLog}
        />
      </TabsContent>
    </Tabs>
  );
}

// ─── Details Tab ──────────────────────────────────────

function DetailsTab({
  eventId,
  eventTitle,
  eventType,
  location,
  initialDescription,
  initialClientRequests,
  lead,
  notes,
}: {
  eventId: string;
  eventTitle: string;
  eventType: string | null;
  location: string | null;
  initialDescription: string | null;
  initialClientRequests: string | null;
  lead: LeadInfo | null;
  notes: string | null;
}) {
  const [description, setDescription] = useState(initialDescription || "");
  const [clientRequests, setClientRequests] = useState(initialClientRequests || "");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSavingDesc, startSavingDesc] = useTransition();
  const [isSavingReqs, startSavingReqs] = useTransition();
  const descTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const reqsTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const saveDescription = useCallback(
    (value: string) => {
      clearTimeout(descTimer.current);
      descTimer.current = setTimeout(() => {
        startSavingDesc(async () => {
          await updateEventDescription(eventId, value);
        });
      }, 800);
    },
    [eventId]
  );

  const saveClientRequests = useCallback(
    (value: string) => {
      clearTimeout(reqsTimer.current);
      reqsTimer.current = setTimeout(() => {
        startSavingReqs(async () => {
          await updateClientRequests(eventId, value);
        });
      }, 800);
    },
    [eventId]
  );

  async function handleAiDescription() {
    setIsGenerating(true);
    try {
      const res = await fetch("/api/ai/generate-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: eventTitle,
          eventType,
          location,
          clientName: lead?.name,
        }),
      });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
      } else {
        setDescription(data.description);
        saveDescription(data.description);
        toast.success("Description generated");
      }
    } catch {
      toast.error("Failed to generate description");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        {/* Client */}
        <Card className="border-white/10 bg-surface">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-zinc-400">
              Client
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lead ? (
              <div className="space-y-3">
                <Link
                  href={`/leads/${lead.id}`}
                  className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/2 p-3 hover:border-gold/20 hover:bg-gold/5 transition-colors"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold/10 shrink-0">
                    <User className="h-4 w-4 text-gold" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate">
                      {lead.name}
                    </p>
                    {lead.businessName && (
                      <p className="text-xs text-zinc-500 truncate">
                        {lead.businessName}
                      </p>
                    )}
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-zinc-600 shrink-0" />
                </Link>
                <div className="flex flex-wrap gap-2">
                  {lead.email && (
                    <QuickComposeDialog
                      lead={lead}
                      trigger={
                        <Button size="sm" variant="outline" className="flex-1 border-white/10 text-zinc-400 hover:border-gold/30 hover:text-gold text-xs">
                          <Mail className="mr-1 h-3 w-3" /> Email
                        </Button>
                      }
                    />
                  )}
                  {lead.phone && (
                    <Button render={<a href={`tel:${lead.phone}`} />} size="sm" variant="outline" className="flex-1 border-white/10 text-zinc-400 hover:text-white text-xs">
                      <Phone className="mr-1 h-3 w-3" /> Call
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center py-4 text-center">
                <User className="mb-2 h-6 w-6 text-zinc-700" />
                <p className="text-sm text-zinc-500">No client linked</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notes */}
        {notes && (
          <Card className="border-white/10 bg-surface">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-zinc-400">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm text-zinc-300 leading-relaxed">{notes}</p>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="space-y-6">
        {/* Event Description */}
        <Card className="border-white/10 bg-surface">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-zinc-400">
                Shoot Description
              </CardTitle>
              <div className="flex items-center gap-2">
                {isSavingDesc && (
                  <span className="text-[10px] text-zinc-600">Saving...</span>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAiDescription}
                  disabled={isGenerating}
                  className="h-7 border-purple-500/30 text-purple-400 hover:bg-purple-500/10 text-xs"
                >
                  {isGenerating ? (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  ) : (
                    <Sparkles className="mr-1 h-3 w-3" />
                  )}
                  AI Assist
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Textarea
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                saveDescription(e.target.value);
              }}
              placeholder="Describe the shoot — key moments, deliverables, style..."
              rows={5}
              className="border-white/10 bg-white/5 text-white placeholder:text-zinc-600 resize-none"
            />
          </CardContent>
        </Card>

        {/* Client Requests */}
        <Card className="border-white/10 bg-surface">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-zinc-400">
                Client Requests
              </CardTitle>
              {isSavingReqs && (
                <span className="text-[10px] text-zinc-600">Saving...</span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <Textarea
              value={clientRequests}
              onChange={(e) => {
                setClientRequests(e.target.value);
                saveClientRequests(e.target.value);
              }}
              placeholder="Shot list, must-haves, special moments, preferences..."
              rows={5}
              className="border-white/10 bg-white/5 text-white placeholder:text-zinc-600 resize-none"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Moodboard Tab ──────────────────────────────────

function MoodboardTab({
  eventId,
  initialMoodboard,
}: {
  eventId: string;
  initialMoodboard: MoodboardItem[];
}) {
  const [items, setItems] = useState<MoodboardItem[]>(initialMoodboard);
  const [showAdd, setShowAdd] = useState<"image" | "url" | "note" | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [noteInput, setNoteInput] = useState("");
  const [captionInput, setCaptionInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function save(updated: MoodboardItem[]) {
    setItems(updated);
    startTransition(async () => {
      await updateMoodboard(eventId, updated);
    });
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be under 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      save([...items, { type: "image", content: base64, caption: captionInput.trim() || undefined }]);
      setCaptionInput("");
      setShowAdd(null);
      toast.success("Image added");
    };
    reader.readAsDataURL(file);
    if (fileRef.current) fileRef.current.value = "";
  }

  function addUrl() {
    if (!urlInput.trim()) return;
    save([...items, { type: "url", content: urlInput.trim(), caption: captionInput.trim() || undefined }]);
    setUrlInput("");
    setCaptionInput("");
    setShowAdd(null);
    toast.success("Link added");
  }

  function addNote() {
    if (!noteInput.trim()) return;
    save([...items, { type: "note", content: noteInput.trim() }]);
    setNoteInput("");
    setShowAdd(null);
    toast.success("Note added");
  }

  function removeItem(index: number) {
    save(items.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-4">
      {/* Add buttons */}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowAdd(showAdd === "image" ? null : "image")}
          className="border-white/10 text-zinc-400 hover:text-white"
        >
          <Upload className="mr-1.5 h-3.5 w-3.5" /> Upload Image
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowAdd(showAdd === "url" ? null : "url")}
          className="border-white/10 text-zinc-400 hover:text-white"
        >
          <LinkIcon className="mr-1.5 h-3.5 w-3.5" /> Add Link
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowAdd(showAdd === "note" ? null : "note")}
          className="border-white/10 text-zinc-400 hover:text-white"
        >
          <StickyNote className="mr-1.5 h-3.5 w-3.5" /> Add Note
        </Button>
      </div>

      {/* Add form */}
      {showAdd === "image" && (
        <Card className="border-white/10 bg-surface">
          <CardContent className="p-4 space-y-3">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="text-sm text-zinc-400 file:mr-3 file:rounded-md file:border-0 file:bg-gold/10 file:px-3 file:py-1.5 file:text-sm file:text-gold hover:file:bg-gold/20"
            />
            <Input
              value={captionInput}
              onChange={(e) => setCaptionInput(e.target.value)}
              placeholder="Caption (optional)"
              className="border-white/10 bg-white/5 text-white placeholder:text-zinc-600"
            />
            <p className="text-[11px] text-zinc-600">Max 2MB per image</p>
          </CardContent>
        </Card>
      )}

      {showAdd === "url" && (
        <Card className="border-white/10 bg-surface">
          <CardContent className="p-4 space-y-3">
            <Input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://pinterest.com/pin/... or any URL"
              className="border-white/10 bg-white/5 text-white placeholder:text-zinc-600"
            />
            <Input
              value={captionInput}
              onChange={(e) => setCaptionInput(e.target.value)}
              placeholder="Caption (optional)"
              className="border-white/10 bg-white/5 text-white placeholder:text-zinc-600"
            />
            <Button size="sm" onClick={addUrl} disabled={!urlInput.trim()} className="bg-gold text-black hover:bg-gold-light">
              <Plus className="mr-1 h-3.5 w-3.5" /> Add Link
            </Button>
          </CardContent>
        </Card>
      )}

      {showAdd === "note" && (
        <Card className="border-white/10 bg-surface">
          <CardContent className="p-4 space-y-3">
            <Textarea
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              placeholder="Color palette, vibe, style keywords, references..."
              rows={3}
              className="border-white/10 bg-white/5 text-white placeholder:text-zinc-600"
            />
            <Button size="sm" onClick={addNote} disabled={!noteInput.trim()} className="bg-gold text-black hover:bg-gold-light">
              <Plus className="mr-1 h-3.5 w-3.5" /> Add Note
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Grid */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-center">
          <ImageIcon className="mb-3 h-10 w-10 text-zinc-700" />
          <p className="text-sm text-zinc-500">No moodboard items yet</p>
          <p className="mt-1 text-xs text-zinc-600">
            Upload images, paste links, or add style notes
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item, i) => (
            <div
              key={i}
              className="group relative rounded-lg border border-white/10 bg-surface overflow-hidden"
            >
              <button
                onClick={() => removeItem(i)}
                className="absolute top-2 right-2 z-10 rounded-full bg-black/60 p-1.5 sm:p-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:bg-red-500/80"
              >
                <X className="h-3 w-3 text-white" />
              </button>

              {item.type === "image" && (
                <div className="aspect-square">
                  <img
                    src={item.content}
                    alt={item.caption || "Moodboard"}
                    className="h-full w-full object-cover"
                  />
                </div>
              )}

              {item.type === "url" && (
                <a
                  href={item.content}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex aspect-square flex-col items-center justify-center gap-2 p-4 hover:bg-white/3 transition-colors"
                >
                  <LinkIcon className="h-8 w-8 text-gold" />
                  <span className="text-xs text-zinc-400 text-center line-clamp-2 break-all">
                    {item.content.replace(/^https?:\/\/(www\.)?/, "").slice(0, 50)}
                  </span>
                </a>
              )}

              {item.type === "note" && (
                <div className="flex aspect-square flex-col justify-center p-4 bg-amber-500/5">
                  <StickyNote className="mb-2 h-5 w-5 text-amber-400" />
                  <p className="text-xs text-zinc-300 line-clamp-5 leading-relaxed">
                    {item.content}
                  </p>
                </div>
              )}

              {item.caption && (
                <div className="border-t border-white/5 px-3 py-2">
                  <p className="text-[11px] text-zinc-500 truncate">
                    {item.caption}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Gear Tab ─────────────────────────────────────────

function GearTab({
  eventId,
  eventType,
  initialGearChecklist,
  inventoryItems,
}: {
  eventId: string;
  eventType: string | null;
  initialGearChecklist: GearItem[];
  inventoryItems: InventoryItem[];
}) {
  const [suggestions, setSuggestions] = useState<GearSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [addedItems, setAddedItems] = useState<Set<string>>(new Set());

  async function handleSuggestGear() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/ai/suggest-gear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventType }),
      });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
      } else {
        setSuggestions(data.suggestions || []);
        toast.success(`${data.suggestions?.length || 0} items suggested`);
      }
    } catch {
      toast.error("Failed to get suggestions");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* AI Suggestions */}
      <Card className="border-white/10 bg-surface">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-zinc-400">
              AI Gear Suggestions
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={handleSuggestGear}
              disabled={isLoading}
              className="h-7 border-purple-500/30 text-purple-400 hover:bg-purple-500/10 text-xs"
            >
              {isLoading ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="mr-1 h-3 w-3" />
              )}
              {suggestions.length > 0 ? "Regenerate" : "Suggest Gear"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {suggestions.length === 0 ? (
            <p className="text-xs text-zinc-600 py-2">
              Get AI-powered gear recommendations based on your{" "}
              {eventType?.replace("_", " ") || "event"} shoot type.
            </p>
          ) : (
            <div className="space-y-1.5">
              {suggestions.map((s, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 rounded-md px-3 py-2 ${
                    addedItems.has(s.item) ? "opacity-40" : "hover:bg-white/3"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-200">{s.item}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-white/10 text-zinc-500 capitalize">
                        {s.category}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`text-[9px] px-1.5 py-0 h-4 ${
                          s.priority === "essential"
                            ? "border-gold/20 bg-gold/10 text-gold"
                            : "border-white/10 text-zinc-500"
                        }`}
                      >
                        {s.priority}
                      </Badge>
                    </div>
                  </div>
                  {addedItems.has(s.item) ? (
                    <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-[10px]">
                      <Check className="mr-1 h-2.5 w-2.5" /> Added
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-zinc-400 hover:text-gold"
                      onClick={() => {
                        setAddedItems((prev) => new Set(prev).add(s.item));
                        toast.success(`${s.item} added to checklist`);
                      }}
                    >
                      <Plus className="mr-1 h-3 w-3" /> Add
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Existing Gear Checklist */}
      <GearChecklist
        eventId={eventId}
        checklist={[
          ...initialGearChecklist,
          ...[...addedItems]
            .filter((item) => !initialGearChecklist.some((g) => g.item === item))
            .map((item) => ({ item, checked: false })),
        ]}
        inventoryItems={inventoryItems}
      />
    </div>
  );
}

// ─── Payment Tab ──────────────────────────────────────

function PaymentTab({
  eventId,
  packagePrice,
  paymentStatus,
  initialPaymentLog,
}: {
  eventId: string;
  packagePrice: number;
  paymentStatus: string;
  initialPaymentLog: PaymentLogEntry[];
}) {
  const [log, setLog] = useState<PaymentLogEntry[]>(initialPaymentLog);
  const [newLabel, setNewLabel] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newDate, setNewDate] = useState(new Date().toISOString().split("T")[0]);
  const [isPending, startTransition] = useTransition();

  const totalPaid = log.reduce((sum, e) => sum + (e.amount || 0), 0);
  const remaining = packagePrice - totalPaid;

  function addEntry() {
    if (!newLabel.trim()) return;
    const entry: PaymentLogEntry = {
      date: newDate,
      label: newLabel.trim(),
      amount: newAmount ? Math.round(parseFloat(newAmount) * 100) : undefined,
    };
    const updated = [...log, entry];
    setLog(updated);
    startTransition(async () => {
      await updatePaymentLog(eventId, updated);
    });
    setNewLabel("");
    setNewAmount("");
    toast.success("Payment entry added");
  }

  function removeEntry(index: number) {
    const updated = log.filter((_, i) => i !== index);
    setLog(updated);
    startTransition(async () => {
      await updatePaymentLog(eventId, updated);
    });
  }

  const paymentStyles: Record<string, string> = {
    unpaid: "border-red-500/30 bg-red-500/10 text-red-400",
    deposit: "border-amber-500/30 bg-amber-500/10 text-amber-400",
    paid: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Summary */}
      <Card className="border-white/10 bg-surface">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-zinc-400">
            Payment Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Package Price</span>
              <span className="text-lg font-bold text-white">
                {formatCurrency(packagePrice)}
              </span>
            </div>
            {totalPaid > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400">Total Received</span>
                <span className="text-lg font-bold text-emerald-400">
                  {formatCurrency(totalPaid)}
                </span>
              </div>
            )}
            {remaining > 0 && totalPaid > 0 && (
              <div className="flex items-center justify-between border-t border-white/10 pt-3">
                <span className="text-sm text-zinc-400">Remaining</span>
                <span className="text-lg font-bold text-amber-400">
                  {formatCurrency(remaining)}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-white/10">
            <span className="text-sm text-zinc-400">Status</span>
            <PaymentStatusSelect
              eventId={eventId}
              currentStatus={paymentStatus}
            />
          </div>
        </CardContent>
      </Card>

      {/* Payment Log */}
      <Card className="border-white/10 bg-surface">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-zinc-400">
            Payment Timeline
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {log.length === 0 && (
            <p className="text-xs text-zinc-600 py-2">
              No payment entries yet. Add deposits, invoices, or payments below.
            </p>
          )}

          {log.map((entry, i) => (
            <div
              key={i}
              className="group flex items-center gap-3 rounded-md border border-white/5 bg-white/2 px-3 py-2"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-zinc-200">{entry.label}</p>
                <p className="text-[11px] text-zinc-600">
                  {new Date(entry.date + "T00:00:00").toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
              {entry.amount != null && (
                <span className="text-sm font-medium text-emerald-400">
                  +{formatCurrency(entry.amount)}
                </span>
              )}
              <button
                onClick={() => removeEntry(i)}
                className="text-zinc-600 sm:opacity-0 sm:group-hover:opacity-100 hover:text-red-400 transition-all"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}

          {/* Add entry */}
          <div className="space-y-2 pt-2 border-t border-white/10">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="e.g. Deposit"
                className="h-9 sm:h-8 border-white/10 bg-white/5 text-sm text-white placeholder:text-zinc-600"
              />
              <Input
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                type="number"
                step="0.01"
                placeholder="Amount"
                className="h-9 sm:h-8 border-white/10 bg-white/5 text-sm text-white placeholder:text-zinc-600"
              />
              <Input
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                type="date"
                className="h-9 sm:h-8 border-white/10 bg-white/5 text-sm text-white"
              />
            </div>
            <Button
              size="sm"
              onClick={addEntry}
              disabled={!newLabel.trim() || isPending}
              className="w-full h-8 bg-gold/20 text-gold hover:bg-gold/30"
            >
              <Plus className="mr-1 h-3.5 w-3.5" /> Add Entry
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
