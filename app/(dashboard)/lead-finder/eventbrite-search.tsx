"use client";

import { useState, useTransition, useMemo, Fragment } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
} from "@tanstack/react-table";
import {
  Search,
  CalendarDays,
  MapPin,
  User,
  Clock,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Loader2,
  Filter,
  Ban,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ContactResults } from "@/components/contact-results";
import { SaveLeadDialog } from "@/components/save-lead-dialog";
import { toast } from "sonner";

interface EventResult {
  id: string;
  name: string;
  description?: string;
  startDate: string;
  startTime?: string;
  endDate?: string;
  venueName?: string;
  venueAddress?: string;
  organizerName?: string;
  url: string;
}

const presetSearches = [
  "corporate gala",
  "fundraiser",
  "networking event",
  "conference",
  "awards ceremony",
  "charity event",
  "wedding expo",
  "product launch",
];

const locationOptions = [
  { label: "Washington, DC", value: "dc" },
  { label: "Baltimore, MD", value: "baltimore" },
  { label: "Columbia, MD", value: "columbia" },
  { label: "Arlington, VA", value: "arlington" },
  { label: "Alexandria, VA", value: "alexandria" },
  { label: "Bethesda, MD", value: "bethesda" },
  { label: "Annapolis, MD", value: "annapolis" },
];

type AvailabilityFilter = "all" | "my-availability";

function parseHour(timeStr: string): number | null {
  const m = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!m) return null;
  let hour = parseInt(m[1], 10);
  const ampm = m[3].toUpperCase();
  if (ampm === "PM" && hour !== 12) hour += 12;
  if (ampm === "AM" && hour === 12) hour = 0;
  return hour;
}

/**
 * Eventbrite dates come as date-only ("2026-07-11") with a separate startTime
 * like "12:30 PM". Parse the date parts directly to avoid timezone issues.
 */
function parseDateParts(dateStr: string): { year: number; month: number; day: number } | null {
  const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return { year: parseInt(m[1]), month: parseInt(m[2]) - 1, day: parseInt(m[3]) };
}

function isInMyAvailability(dateStr: string, startTime?: string): boolean {
  const parts = parseDateParts(dateStr);
  if (!parts) return true;
  const d = new Date(parts.year, parts.month, parts.day);
  const dayOfWeek = d.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  if (isWeekend) return true;

  if (startTime) {
    const hour = parseHour(startTime);
    if (hour !== null && hour >= 17) return true;
  }

  // No time info on a weekday — can't confirm availability
  return !startTime;
}

interface EventTimeInfo {
  dayOfWeek: string;
  date: string;
  time: string | null;
  isWeekend: boolean;
  isEvening: boolean;
}

function formatEventTime(dateStr: string, startTime?: string): EventTimeInfo | null {
  const parts = parseDateParts(dateStr);
  if (!parts) return null;
  const d = new Date(parts.year, parts.month, parts.day);
  const dayOfWeek = d.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  let isEvening = false;

  if (startTime) {
    const hour = parseHour(startTime);
    if (hour !== null) isEvening = hour >= 17;
  }

  return {
    dayOfWeek: d.toLocaleDateString("en-US", { weekday: "short" }),
    date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    time: startTime || null,
    isWeekend,
    isEvening,
  };
}

const columnHelper = createColumnHelper<EventResult>();

export function EventbriteSearch() {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("dc");
  const [results, setResults] = useState<EventResult[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [availFilter, setAvailFilter] = useState<AvailabilityFilter>("my-availability");

  function toggleExpanded(eventId: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) next.delete(eventId);
      else next.add(eventId);
      return next;
    });
  }

  const filteredResults = useMemo(() => {
    if (availFilter === "all") return results;
    return results.filter((e) => isInMyAvailability(e.startDate, e.startTime));
  }, [results, availFilter]);

  const hiddenCount = results.length - filteredResults.length;

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: "date",
        header: "When",
        cell: (info) => {
          const event = info.row.original;
          const t = formatEventTime(event.startDate, event.startTime);
          if (!t) return <span className="text-zinc-600">TBD</span>;
          return (
            <div className="flex flex-col items-center gap-0.5 shrink-0 min-w-[70px]">
              <div className="flex h-11 w-11 flex-col items-center justify-center rounded-lg bg-gold/10 text-gold">
                <span className="text-[10px] font-medium leading-none uppercase">
                  {t.date.split(" ")[0]}
                </span>
                <span className="text-base font-bold leading-tight">
                  {t.date.split(" ")[1]}
                </span>
              </div>
              <span className="text-[10px] font-medium text-zinc-400">
                {t.dayOfWeek}
              </span>
              {t.time ? (
                <span className="text-[10px] text-zinc-500 flex items-center gap-0.5">
                  <Clock className="h-2.5 w-2.5" />
                  {t.time}
                </span>
              ) : (
                <span className="text-[10px] text-zinc-600">Time TBD</span>
              )}
              {(t.isWeekend || t.isEvening) && (
                <Badge
                  variant="outline"
                  className="mt-0.5 text-[9px] px-1 py-0 border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                >
                  {t.isWeekend ? "Weekend" : "Evening"}
                </Badge>
              )}
            </div>
          );
        },
      }),
      columnHelper.accessor("name", {
        header: "Event",
        cell: (info) => (
          <div className="min-w-0">
            <p className="font-medium text-white">{info.getValue()}</p>
            <div className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
              {info.row.original.organizerName && (
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {info.row.original.organizerName}
                </span>
              )}
              {info.row.original.venueName && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {info.row.original.venueName}
                </span>
              )}
            </div>
            {info.row.original.description && (
              <p className="mt-1 text-xs text-zinc-600 line-clamp-1">
                {info.row.original.description}
              </p>
            )}
          </div>
        ),
      }),
      columnHelper.accessor("url", {
        header: "Link",
        cell: (info) => {
          const url = info.getValue();
          if (!url) return null;
          return (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-blue-400 hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              View
            </a>
          );
        },
      }),
      columnHelper.display({
        id: "contacts",
        header: "Contacts",
        cell: (info) => {
          const event = info.row.original;
          const isExpanded = expandedIds.has(event.id);
          return (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs text-zinc-400 hover:text-gold"
              onClick={(e) => {
                e.stopPropagation();
                toggleExpanded(event.id);
              }}
            >
              <Search className="mr-1 h-3 w-3" />
              Find Contacts
              {isExpanded ? (
                <ChevronUp className="ml-1 h-3 w-3" />
              ) : (
                <ChevronDown className="ml-1 h-3 w-3" />
              )}
            </Button>
          );
        },
      }),
      columnHelper.display({
        id: "actions",
        header: "",
        cell: (info) => {
          const event = info.row.original;
          const isSaved = savedIds.has(event.id);
          const isSkipped = skippedIds.has(event.id);

          if (isSaved) {
            return (
              <span className="flex items-center gap-1 text-xs text-emerald-400">
                <Check className="h-3.5 w-3.5" />
                Saved
              </span>
            );
          }

          if (isSkipped) {
            return (
              <span className="flex items-center gap-1 text-xs text-zinc-600">
                <Ban className="h-3.5 w-3.5" />
                Unreachable
              </span>
            );
          }

          return (
            <SaveLeadDialog
              placeId={`eb-${event.id}`}
              name={event.organizerName || event.name}
              address={event.venueAddress || event.venueName || "DMV Area"}
              leadType="corporate"
              source="eventbrite"
              eventbriteUrl={event.url}
              onSaved={() =>
                setSavedIds((prev) => new Set(prev).add(event.id))
              }
              onSkipped={() =>
                setSkippedIds((prev) => new Set(prev).add(event.id))
              }
            />
          );
        },
      }),
    ],
    [savedIds, skippedIds, expandedIds]
  );

  const table = useReactTable({
    data: filteredResults,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  async function handleSearch(searchQuery?: string) {
    const q = searchQuery || query;
    if (!q.trim()) return;

    setIsSearching(true);
    setHasSearched(true);
    setResults([]);
    setHasMore(false);
    setCurrentPage(1);
    setExpandedIds(new Set());

    try {
      const res = await fetch(
        `/api/eventbrite/search?q=${encodeURIComponent(q)}&location=${location}`
      );
      const data = await res.json();

      if (data.error) {
        toast.error(data.error);
        return;
      }

      setResults(data.events || []);
      setHasMore(data.hasMore || false);
      if (data.events?.length === 0) {
        toast.info("No events found. Try a different search term or location.");
      }
    } catch {
      toast.error("Failed to search. Please try again.");
    } finally {
      setIsSearching(false);
    }
  }

  async function handleLoadMore() {
    if (!hasMore) return;
    const nextPage = currentPage + 1;
    setIsLoadingMore(true);
    try {
      const res = await fetch(
        `/api/eventbrite/search?q=${encodeURIComponent(query)}&location=${location}&page=${nextPage}`
      );
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
        return;
      }

      setResults((prev) => [...prev, ...(data.events || [])]);
      setHasMore(data.hasMore || false);
      setCurrentPage(nextPage);
    } catch {
      toast.error("Failed to load more events.");
    } finally {
      setIsLoadingMore(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Preset Searches */}
      <div className="flex flex-wrap gap-2">
        {presetSearches.map((preset) => (
          <Button
            key={preset}
            variant="outline"
            size="sm"
            className="border-white/10 text-zinc-300 hover:border-gold/30 hover:bg-gold/5 hover:text-gold"
            onClick={() => {
              setQuery(preset);
              handleSearch(preset);
            }}
          >
            {preset}
          </Button>
        ))}
      </div>

      {/* Search Bar + Availability Filter */}
      <div className="flex gap-3">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Search upcoming events in the DMV..."
          className="flex-1 border-white/10 bg-white/5 text-white placeholder:text-zinc-600"
        />
        <Select value={location} onValueChange={setLocation}>
          <SelectTrigger className="w-[180px] border-white/10 bg-white/5 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-white/10 bg-surface-hover">
            {locationOptions.map((loc) => (
              <SelectItem key={loc.value} value={loc.value}>
                {loc.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          onClick={() => handleSearch()}
          disabled={isSearching || !query.trim()}
          className="bg-gold text-black hover:bg-gold-light"
        >
          <Search className="mr-1.5 h-4 w-4" />
          {isSearching ? "Searching..." : "Search"}
        </Button>
      </div>

      {/* Availability Toggle */}
      {hasSearched && results.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-zinc-500" />
            <span className="text-xs text-zinc-500">Availability:</span>
            <div className="flex rounded-lg border border-white/10 overflow-hidden">
              <button
                onClick={() => setAvailFilter("my-availability")}
                className={`px-3 py-1.5 text-xs transition-colors ${
                  availFilter === "my-availability"
                    ? "bg-gold/10 text-gold"
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                }`}
              >
                Evenings & Weekends
              </button>
              <button
                onClick={() => setAvailFilter("all")}
                className={`px-3 py-1.5 text-xs border-l border-white/10 transition-colors ${
                  availFilter === "all"
                    ? "bg-gold/10 text-gold"
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                }`}
              >
                All Events
              </button>
            </div>
            {availFilter === "my-availability" && hiddenCount > 0 && (
              <span className="text-xs text-zinc-600">
                ({hiddenCount} during work hours hidden)
              </span>
            )}
          </div>
          <Badge
            variant="outline"
            className="border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-xs"
          >
            {filteredResults.length} event{filteredResults.length !== 1 ? "s" : ""}
          </Badge>
        </div>
      )}

      {/* Empty state */}
      {!hasSearched && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-white/10 px-6 py-16 text-center">
          <CalendarDays className="mb-3 h-10 w-10 text-zinc-700" />
          <h3 className="text-base font-medium text-zinc-300">
            Discover corporate events
          </h3>
          <p className="mt-1 max-w-sm text-sm text-zinc-600">
            Search for galas, conferences, and networking events in the DMV.
            Only shows events on <span className="text-gold">evenings & weekends</span> by default to match your 9-5 schedule.
          </p>
        </div>
      )}

      {/* Loading */}
      {isSearching && (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-lg border border-white/10 bg-surface p-4"
            >
              <div className="flex items-center gap-4">
                <div className="h-11 w-11 rounded-lg bg-white/5" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/3 rounded bg-white/5" />
                  <div className="h-3 w-1/2 rounded bg-white/5" />
                </div>
                <div className="h-8 w-20 rounded bg-white/5" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Results Table */}
      {!isSearching && filteredResults.length > 0 && (
        <div className="space-y-3">
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
                {table.getRowModel().rows.map((row) => {
                  const event = row.original;
                  const isExpanded = expandedIds.has(event.id);
                  return (
                    <Fragment key={row.id}>
                      <tr className="border-b border-white/5 transition-colors hover:bg-white/2">
                        {row.getVisibleCells().map((cell) => (
                          <td key={cell.id} className="px-4 py-3">
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </td>
                        ))}
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td
                            colSpan={columns.length}
                            className="border-b border-white/5 bg-white/1 px-4 py-2"
                          >
                            <ContactResults
                              businessName={event.organizerName || event.venueName || event.name}
                              businessAddress={event.venueAddress}
                              leadType="corporate"
                              leadSource="eventbrite"
                            />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination controls */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-500">
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount()}
              {" · "}
              {filteredResults.length} results
            </p>
            <div className="flex items-center gap-2">
              {hasMore && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  className="border-gold/30 text-gold hover:bg-gold/10"
                >
                  {isLoadingMore ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    "Load More Events"
                  )}
                </Button>
              )}
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
        </div>
      )}

      {/* No results after search */}
      {!isSearching && hasSearched && filteredResults.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-white/10 px-6 py-12 text-center">
          <CalendarDays className="mb-3 h-8 w-8 text-zinc-700" />
          {results.length > 0 && hiddenCount > 0 ? (
            <>
              <p className="text-sm text-zinc-400">
                All {results.length} events are during work hours (Mon-Fri before 5pm).
              </p>
              <p className="mt-1 text-xs text-zinc-600">
                Switch to "All Events" to see them, or try a different search.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-zinc-400">
                No events found for this search.
              </p>
              <p className="mt-1 text-xs text-zinc-600">
                Try different keywords or a different location.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
