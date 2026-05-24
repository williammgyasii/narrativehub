"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export function LeadsFilterBar({
  currentStatus,
  currentType,
}: {
  currentStatus?: string;
  currentType?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`/leads?${params.toString()}`);
  }

  function clearFilters() {
    router.push("/leads");
  }

  const hasFilters = currentStatus || currentType;

  return (
    <div className="flex items-center gap-3">
      <Select
        value={currentStatus || "all"}
        onValueChange={(v) => updateFilter("status", v)}
      >
        <SelectTrigger className="w-[150px] border-white/10 bg-white/5 text-sm text-white">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent className="border-white/10 bg-[#1a1a1a]">
          <SelectItem value="all">All Statuses</SelectItem>
          <SelectItem value="new">New</SelectItem>
          <SelectItem value="contacted">Contacted</SelectItem>
          <SelectItem value="responded">Responded</SelectItem>
          <SelectItem value="booked">Booked</SelectItem>
          <SelectItem value="closed">Closed</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={currentType || "all"}
        onValueChange={(v) => updateFilter("type", v)}
      >
        <SelectTrigger className="w-[160px] border-white/10 bg-white/5 text-sm text-white">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent className="border-white/10 bg-[#1a1a1a]">
          <SelectItem value="all">All Types</SelectItem>
          <SelectItem value="wedding">Wedding</SelectItem>
          <SelectItem value="corporate">Corporate</SelectItem>
          <SelectItem value="real_estate">Real Estate</SelectItem>
          <SelectItem value="architectural">Architectural</SelectItem>
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="text-xs text-zinc-400 hover:text-white"
        >
          <X className="mr-1 h-3 w-3" />
          Clear
        </Button>
      )}
    </div>
  );
}
