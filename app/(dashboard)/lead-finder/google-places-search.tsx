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
  Star,
  MapPin,
  Globe,
  Phone,
  Plus,
  Check,
  AlertTriangle,
  Building,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ContactResults } from "@/components/contact-results";
import { saveAsLead } from "@/lib/actions/lead-finder";
import { toast } from "sonner";

interface PlaceResult {
  placeId: string;
  name: string;
  address: string;
  phone?: string;
  website?: string;
  rating?: number;
  reviewCount?: number;
}

const presetSearches = [
  { label: "Wedding Venues", query: "wedding venue", leadType: "wedding" as const },
  { label: "Event Venues", query: "event venue banquet hall", leadType: "corporate" as const },
  { label: "Real Estate Brokerages", query: "real estate brokerage agency", leadType: "real_estate" as const },
  { label: "Architecture Firms", query: "architecture firm", leadType: "architectural" as const },
  { label: "Wedding Planners", query: "wedding planner coordinator", leadType: "wedding" as const },
  { label: "Interior Design", query: "interior design studio", leadType: "architectural" as const },
];

const ALL_DMV = "all-dmv";

const locations = [
  { label: "All DMV", value: ALL_DMV, radius: "" },
  { label: "Columbia, MD (25mi)", value: "39.2037,-76.8610", radius: "40000" },
  { label: "Baltimore, MD (15mi)", value: "39.2904,-76.6122", radius: "24000" },
  { label: "Washington, DC (15mi)", value: "38.9072,-77.0369", radius: "24000" },
  { label: "Northern VA (15mi)", value: "38.8816,-77.1711", radius: "24000" },
  { label: "Annapolis, MD (10mi)", value: "38.9784,-76.4922", radius: "16000" },
];

const dmvLocations = locations.filter((l) => l.value !== ALL_DMV);

const columnHelper = createColumnHelper<PlaceResult>();

export function GooglePlacesSearch() {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState(ALL_DMV);
  const [leadType, setLeadType] = useState<string>("wedding");
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [notConfigured, setNotConfigured] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggleExpanded(placeId: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(placeId)) next.delete(placeId);
      else next.add(placeId);
      return next;
    });
  }

  const columns = useMemo(
    () => [
      columnHelper.accessor("name", {
        header: "Business",
        cell: (info) => (
          <div className="min-w-0">
            <p className="font-medium text-white">{info.getValue()}</p>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-zinc-500 truncate">
              <MapPin className="h-3 w-3 shrink-0" />
              {info.row.original.address}
            </p>
          </div>
        ),
      }),
      columnHelper.accessor("rating", {
        header: "Rating",
        cell: (info) => {
          const rating = info.getValue();
          const count = info.row.original.reviewCount;
          if (!rating) return <span className="text-zinc-600">—</span>;
          return (
            <span className="flex items-center gap-1 text-sm text-amber-400">
              <Star className="h-3.5 w-3.5 fill-amber-400" />
              {rating}
              {count && <span className="text-zinc-600">({count})</span>}
            </span>
          );
        },
      }),
      columnHelper.accessor("website", {
        header: "Website",
        cell: (info) => {
          const url = info.getValue();
          if (!url) return <span className="text-zinc-600">—</span>;
          return (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-blue-400 hover:underline"
            >
              <Globe className="h-3.5 w-3.5" />
              Visit
            </a>
          );
        },
      }),
      columnHelper.accessor("phone", {
        header: "Phone",
        cell: (info) => {
          const phone = info.getValue();
          if (!phone) return <span className="text-zinc-600">—</span>;
          return (
            <span className="flex items-center gap-1 text-sm text-zinc-400">
              <Phone className="h-3.5 w-3.5" />
              {phone}
            </span>
          );
        },
      }),
      columnHelper.display({
        id: "actions",
        header: "",
        cell: (info) => {
          const place = info.row.original;
          const isSaved = savedIds.has(place.placeId);
          const isExpanded = expandedIds.has(place.placeId);
          return (
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpanded(place.placeId);
                }}
                className="border-white/10 text-zinc-400 hover:border-blue-500/30 hover:text-blue-400"
              >
                <Search className="mr-1 h-3.5 w-3.5" />
                Contacts
                {isExpanded ? (
                  <ChevronUp className="ml-1 h-3 w-3" />
                ) : (
                  <ChevronDown className="ml-1 h-3 w-3" />
                )}
              </Button>
              <Button
                size="sm"
                disabled={isSaved || isPending}
                onClick={() => handleSave(place)}
                className={
                  isSaved
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-gold text-black hover:bg-gold-light"
                }
              >
                {isSaved ? (
                  <>
                    <Check className="mr-1 h-3.5 w-3.5" />
                    Saved
                  </>
                ) : (
                  <>
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Save
                  </>
                )}
              </Button>
            </div>
          );
        },
      }),
    ],
    [savedIds, isPending, expandedIds]
  );

  const table = useReactTable({
    data: results,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  async function handleSearch(searchQuery?: string, searchLeadType?: string) {
    const q = searchQuery || query;
    if (!q.trim()) return;

    setIsSearching(true);
    setHasSearched(true);
    setResults([]);
    setNextPageToken(null);
    setExpandedIds(new Set());

    try {
      if (location === ALL_DMV) {
        const allResults = new Map<string, PlaceResult>();

        for (const loc of dmvLocations) {
          const res = await fetch(
            `/api/places/search?q=${encodeURIComponent(q)}&location=${loc.value}&radius=${loc.radius}`
          );
          const data = await res.json();
          if (data.notConfigured) { setNotConfigured(true); return; }
          if (data.results) {
            for (const r of data.results as PlaceResult[]) {
              if (!allResults.has(r.placeId)) allResults.set(r.placeId, r);
            }
          }
        }

        const merged = Array.from(allResults.values());
        setResults(merged);
        if (searchLeadType) setLeadType(searchLeadType);
        if (merged.length === 0) {
          toast.info("No results found. Try a different search.");
        } else {
          toast.success(`Found ${merged.length} results across the DMV`);
        }
      } else {
        const loc = locations.find((l) => l.value === location) || locations[1];
        const res = await fetch(
          `/api/places/search?q=${encodeURIComponent(q)}&location=${loc.value}&radius=${loc.radius}`
        );
        const data = await res.json();

        if (data.notConfigured) { setNotConfigured(true); return; }
        if (data.error) { toast.error(data.error); return; }

        setResults(data.results || []);
        setNextPageToken(data.nextPageToken || null);
        if (searchLeadType) setLeadType(searchLeadType);
        if (data.results?.length === 0) {
          toast.info("No results found. Try a different search or location.");
        }
      }
    } catch {
      toast.error("Failed to search. Please try again.");
    } finally {
      setIsSearching(false);
    }
  }

  async function handleLoadMore() {
    if (!nextPageToken) return;
    setIsLoadingMore(true);
    try {
      await new Promise((r) => setTimeout(r, 2000));
      const res = await fetch(`/api/places/search?pageToken=${nextPageToken}`);
      const data = await res.json();
      if (data.error) { toast.error(data.error); return; }

      setResults((prev) => [...prev, ...(data.results || [])]);
      setNextPageToken(data.nextPageToken || null);
    } catch {
      toast.error("Failed to load more results.");
    } finally {
      setIsLoadingMore(false);
    }
  }

  function handleSave(place: PlaceResult) {
    startTransition(async () => {
      const result = await saveAsLead({
        name: place.name,
        businessName: place.name,
        phone: place.phone,
        leadType: leadType as "wedding" | "corporate" | "real_estate" | "architectural",
        source: "google_places",
        notes: `Found via Google Places. Address: ${place.address}${
          place.rating ? `. Rating: ${place.rating}/5 (${place.reviewCount} reviews)` : ""
        }${place.website ? `. Website: ${place.website}` : ""}`,
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        setSavedIds((prev) => new Set(prev).add(place.placeId));
        if (result.enrichedEmail) {
          toast.success(`${place.name} added with auto-found email: ${result.enrichedEmail}`);
        } else {
          toast.success(`${place.name} added to your leads`);
        }
      }
    });
  }

  if (notConfigured) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-amber-500/20 bg-amber-500/5 px-6 py-12 text-center">
        <AlertTriangle className="mb-3 h-8 w-8 text-amber-400" />
        <h3 className="text-lg font-medium text-white">Google Places API Key Required</h3>
        <p className="mt-2 max-w-md text-sm text-zinc-400">
          Add your Google Places API key to <code className="rounded bg-white/5 px-1.5 py-0.5 text-xs text-zinc-300">.env.local</code>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Preset Searches */}
      <div className="flex flex-wrap gap-2">
        {presetSearches.map((preset) => (
          <Button
            key={preset.query}
            variant="outline"
            size="sm"
            className="border-white/10 text-zinc-300 hover:border-gold/30 hover:bg-gold/5 hover:text-gold"
            onClick={() => {
              setQuery(preset.query);
              setLeadType(preset.leadType);
              handleSearch(preset.query, preset.leadType);
            }}
          >
            {preset.label}
          </Button>
        ))}
      </div>

      {/* Search Bar */}
      <div className="flex gap-3">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Search for businesses..."
          className="border-white/10 bg-white/5 text-white placeholder:text-zinc-600"
        />
        <Select value={location} onValueChange={setLocation}>
          <SelectTrigger className="w-[200px] border-white/10 bg-white/5 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-white/10 bg-surface-hover">
            {locations.map((loc) => (
              <SelectItem key={loc.value} value={loc.value}>{loc.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={leadType} onValueChange={setLeadType}>
          <SelectTrigger className="w-[160px] border-white/10 bg-white/5 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-white/10 bg-surface-hover">
            <SelectItem value="wedding">Wedding</SelectItem>
            <SelectItem value="corporate">Corporate</SelectItem>
            <SelectItem value="real_estate">Real Estate</SelectItem>
            <SelectItem value="architectural">Architectural</SelectItem>
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

      {/* Empty state */}
      {!hasSearched && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-white/10 px-6 py-16 text-center">
          <Building className="mb-3 h-10 w-10 text-zinc-700" />
          <h3 className="text-base font-medium text-zinc-300">Search for businesses in the DMV</h3>
          <p className="mt-1 max-w-sm text-sm text-zinc-600">
            Use the preset searches above or type your own query to find venues, brokerages, and firms near you.
          </p>
        </div>
      )}

      {/* Loading */}
      {isSearching && (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse rounded-lg border border-white/10 bg-surface p-4">
              <div className="flex items-center gap-4">
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/3 rounded bg-white/5" />
                  <div className="h-3 w-2/3 rounded bg-white/5" />
                </div>
                <div className="h-8 w-20 rounded bg-white/5" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Results Table */}
      {!isSearching && results.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-zinc-400">
            {results.length} result{results.length !== 1 ? "s" : ""} found
          </p>

          <div className="rounded-lg border border-white/10 overflow-hidden">
            <table className="w-full">
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id} className="border-b border-white/10 bg-white/2">
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500"
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => {
                  const place = row.original;
                  const isExpanded = expandedIds.has(place.placeId);
                  return (
                    <Fragment key={row.id}>
                      <tr
                        className="border-b border-white/5 transition-colors hover:bg-white/2"
                      >
                        {row.getVisibleCells().map((cell) => (
                          <td key={cell.id} className="px-4 py-3">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
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
                              businessName={place.name}
                              businessAddress={place.address}
                              websiteUrl={place.website}
                              phone={place.phone}
                              leadType={leadType}
                              leadSource="google_places"
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
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
              {" · "}{results.length} total results
            </p>
            <div className="flex items-center gap-2">
              {nextPageToken && (
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
                    "Load More Results"
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

      {/* No results */}
      {!isSearching && hasSearched && results.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-white/10 px-6 py-12 text-center">
          <Building className="mb-3 h-8 w-8 text-zinc-700" />
          <p className="text-sm text-zinc-400">No businesses found for this search.</p>
          <p className="mt-1 text-xs text-zinc-600">Try a different query or expand the search radius.</p>
        </div>
      )}
    </div>
  );
}
