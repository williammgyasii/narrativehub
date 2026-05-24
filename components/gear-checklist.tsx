"use client";

import { useState, useTransition, useMemo } from "react";
import { Plus, X, Camera, Package, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { updateGearChecklist } from "@/lib/actions/events";
import { formatCurrency } from "@/lib/format";
import { toast } from "sonner";

interface GearItem {
  item: string;
  checked: boolean;
  rentalCost?: number;
  gearItemId?: string;
}

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  ownership: "owned" | "rented" | "wishlist";
  rentalPricePerDay: number | null;
}

export function GearChecklist({
  eventId,
  checklist: initialChecklist,
  inventoryItems = [],
}: {
  eventId: string;
  checklist: GearItem[];
  inventoryItems?: InventoryItem[];
}) {
  const [checklist, setChecklist] = useState<GearItem[]>(initialChecklist);
  const [newItem, setNewItem] = useState("");
  const [isPending, startTransition] = useTransition();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const allocatedIds = useMemo(
    () => new Set(checklist.map((g) => g.gearItemId).filter(Boolean)),
    [checklist]
  );

  const availableInventory = useMemo(
    () =>
      inventoryItems
        .filter((item) => !allocatedIds.has(item.id))
        .filter(
          (item) =>
            !searchQuery ||
            item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.category.toLowerCase().includes(searchQuery.toLowerCase())
        ),
    [inventoryItems, allocatedIds, searchQuery]
  );

  const totalRentalCost = checklist.reduce(
    (sum, g) => sum + (g.rentalCost || 0),
    0
  );

  function save(updated: GearItem[]) {
    setChecklist(updated);
    startTransition(async () => {
      await updateGearChecklist(eventId, updated);
    });
  }

  function toggleItem(index: number) {
    const updated = [...checklist];
    updated[index] = { ...updated[index], checked: !updated[index].checked };
    save(updated);
  }

  function addCustomItem() {
    if (!newItem.trim()) return;
    save([...checklist, { item: newItem.trim(), checked: false }]);
    setNewItem("");
    toast.success("Gear item added");
  }

  function addFromInventory(inv: InventoryItem) {
    const gearEntry: GearItem = {
      item: inv.name,
      checked: false,
      gearItemId: inv.id,
      rentalCost:
        inv.ownership === "rented" ? (inv.rentalPricePerDay ?? 0) : undefined,
    };
    save([...checklist, gearEntry]);
    setPickerOpen(false);
    setSearchQuery("");
    toast.success(`${inv.name} allocated`);
  }

  function removeItem(index: number) {
    save(checklist.filter((_, i) => i !== index));
  }

  const ownershipColor: Record<string, string> = {
    owned: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    rented: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    wishlist: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  };

  return (
    <Card className="border-white/10 bg-surface">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-zinc-400">
            <Camera className="h-4 w-4" />
            Gear Checklist
          </CardTitle>
          {totalRentalCost > 0 && (
            <Badge
              variant="outline"
              className="border-blue-500/20 bg-blue-500/10 text-blue-400 text-[10px]"
            >
              Rentals: {formatCurrency(totalRentalCost)}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {checklist.length === 0 && (
          <p className="text-xs text-zinc-600 py-2">
            No gear allocated. Add from your inventory or type a custom item.
          </p>
        )}

        {checklist.map((gear, i) => {
          const invItem = gear.gearItemId
            ? inventoryItems.find((inv) => inv.id === gear.gearItemId)
            : null;

          return (
            <div
              key={gear.gearItemId || i}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-white/4"
            >
              <input
                type="checkbox"
                checked={gear.checked}
                onChange={() => toggleItem(i)}
                className="h-4 w-4 rounded border-white/20 bg-white/5 accent-gold"
              />
              <div className="flex-1 min-w-0">
                <span
                  className={`text-sm ${
                    gear.checked
                      ? "text-zinc-500 line-through"
                      : "text-zinc-200"
                  }`}
                >
                  {gear.item}
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {invItem && (
                    <Badge
                      variant="outline"
                      className={`text-[9px] px-1 py-0 h-4 ${ownershipColor[invItem.ownership] || ""}`}
                    >
                      {invItem.ownership}
                    </Badge>
                  )}
                  {gear.gearItemId && !invItem && (
                    <Badge
                      variant="outline"
                      className="text-[9px] px-1 py-0 h-4 border-gold/20 bg-gold/10 text-gold"
                    >
                      inventory
                    </Badge>
                  )}
                  {gear.rentalCost ? (
                    <span className="text-[10px] text-blue-400">
                      {formatCurrency(gear.rentalCost)}/day
                    </span>
                  ) : null}
                </div>
              </div>
              <button
                onClick={() => removeItem(i)}
                className="text-zinc-600 hover:text-red-400 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}

        {/* Add from inventory */}
        {inventoryItems.length > 0 && (
          <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full h-8 border-white/10 bg-white/2 text-zinc-400 hover:text-gold hover:border-gold/30 justify-start text-xs"
              >
                <Package className="mr-1.5 h-3.5 w-3.5" />
                Add from Inventory
                <ChevronDown className="ml-auto h-3 w-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-72 p-0 border-white/10 bg-surface"
              align="start"
            >
              <div className="p-2 border-b border-white/10">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search gear..."
                  className="h-7 border-white/10 bg-white/5 text-sm text-white placeholder:text-zinc-600"
                />
              </div>
              <div className="max-h-48 overflow-y-auto p-1">
                {availableInventory.length === 0 ? (
                  <p className="px-2 py-3 text-center text-xs text-zinc-600">
                    {inventoryItems.length === allocatedIds.size
                      ? "All gear is allocated"
                      : "No matches"}
                  </p>
                ) : (
                  availableInventory.map((inv) => (
                    <button
                      key={inv.id}
                      onClick={() => addFromInventory(inv)}
                      className="w-full text-left rounded-md px-2 py-1.5 hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-zinc-200">
                          {inv.name}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[9px] px-1 py-0 h-4 ml-2 ${ownershipColor[inv.ownership] || ""}`}
                        >
                          {inv.ownership}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-zinc-500 capitalize">
                          {inv.category}
                        </span>
                        {inv.rentalPricePerDay ? (
                          <span className="text-[10px] text-blue-400">
                            {formatCurrency(inv.rentalPricePerDay)}/day
                          </span>
                        ) : null}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Custom item input */}
        <div className="flex gap-2 pt-1">
          <Input
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e) =>
              e.key === "Enter" && (e.preventDefault(), addCustomItem())
            }
            placeholder="Add custom item..."
            className="h-8 border-white/10 bg-white/5 text-sm text-white placeholder:text-zinc-600"
          />
          <Button
            type="button"
            size="sm"
            onClick={addCustomItem}
            disabled={!newItem.trim() || isPending}
            className="h-8 bg-gold/20 text-gold hover:bg-gold/30"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
