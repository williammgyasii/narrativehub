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
  Plus,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Loader2,
  ExternalLink,
  DollarSign,
  Heart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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

interface VendorResult {
  name: string;
  location: string;
  website?: string;
  phone?: string;
  email?: string;
  rating?: number;
  reviewCount?: number;
  priceTier?: string;
  category: string;
  platform: string;
  profileUrl: string;
  bio?: string;
}

const vendorCategories = [
  { label: "Wedding Venues", value: "wedding-reception-venues", leadType: "wedding" },
  { label: "Wedding Planners", value: "wedding-planners", leadType: "wedding" },
  { label: "Day-of Coordinators", value: "day-of-wedding-coordinators", leadType: "wedding" },
  { label: "Florists", value: "wedding-florists", leadType: "wedding" },
  { label: "Caterers", value: "wedding-caterers", leadType: "corporate" },
  { label: "DJs & Bands", value: "wedding-bands-djs", leadType: "corporate" },
];

const locations = [
  { label: "Baltimore, MD", value: "baltimore-md" },
  { label: "Columbia, MD", value: "columbia-md" },
  { label: "Washington, DC", value: "washington-dc" },
  { label: "Annapolis, MD", value: "annapolis-md" },
  { label: "Frederick, MD", value: "frederick-md" },
  { label: "Silver Spring, MD", value: "silver-spring-md" },
  { label: "Towson, MD", value: "towson-md" },
  { label: "Rockville, MD", value: "rockville-md" },
];

const columnHelper = createColumnHelper<VendorResult>();

export function WeddingPlatformsSearch() {
  const [category, setCategory] = useState(vendorCategories[0].value);
  const [location, setLocation] = useState(locations[0].value);
  const [results, setResults] = useState<VendorResult[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isPending, startTransition] = useTransition();

  const selectedCategory = vendorCategories.find((c) => c.value === category);

  function toggleExpanded(name: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  const columns = useMemo(
    () => [
      columnHelper.accessor("name", {
        header: "Vendor",
        cell: (info) => (
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium text-white">{info.getValue()}</p>
              {info.row.original.profileUrl && (
                <a
                  href={info.row.original.profileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zinc-600 hover:text-gold transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-zinc-500 truncate">
              <MapPin className="h-3 w-3 shrink-0" />
              {info.row.original.location || "—"}
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
              {count ? <span className="text-zinc-600">({count})</span> : null}
            </span>
          );
        },
      }),
      columnHelper.accessor("priceTier", {
        header: "Price",
        cell: (info) => {
          const tier = info.getValue();
          if (!tier) return <span className="text-zinc-600">—</span>;
          return (
            <span className="flex items-center gap-1 text-xs text-emerald-400">
              <DollarSign className="h-3 w-3" />
              {tier}
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
              className="flex items-center gap-1 text-xs text-gold hover:underline truncate max-w-[150px]"
            >
              <Globe className="h-3 w-3 shrink-0" />
              {new URL(url).hostname.replace("www.", "")}
            </a>
          );
        },
      }),
      columnHelper.display({
        id: "contacts",
        header: "Contacts",
        cell: (info) => {
          const row = info.row.original;
          const key = row.name;
          const isExpanded = expandedIds.has(key);
          return (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs text-zinc-400 hover:text-gold"
              onClick={() => toggleExpanded(key)}
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
          const row = info.row.original;
          const key = row.name;
          const isSaved = savedIds.has(key);

          function handleSave() {
            setSavedIds((prev) => new Set(prev).add(key));
            startTransition(async () => {
              try {
                await saveAsLead({
                  name: row.name,
                  businessName: row.name,
                  website: row.website || "",
                  phone: row.phone || "",
                  leadType: (selectedCategory?.leadType || "wedding") as "wedding" | "corporate" | "real_estate" | "architectural",
                  source: `theknot`,
                  address: row.location,
                });
                toast.success(`${row.name} saved as lead`);
              } catch {
                setSavedIds((prev) => {
                  const next = new Set(prev);
                  next.delete(key);
                  return next;
                });
                toast.error("Failed to save lead");
              }
            });
          }

          return isSaved ? (
            <span className="flex items-center gap-1 text-xs text-emerald-400">
              <Check className="h-3.5 w-3.5" />
              Saved
            </span>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs text-zinc-400 hover:text-gold"
              onClick={handleSave}
              disabled={isPending}
            >
              <Plus className="mr-1 h-3 w-3" />
              Save
            </Button>
          );
        },
      }),
    ],
    [savedIds, expandedIds, isPending, selectedCategory]
  );

  const table = useReactTable({
    data: results,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 15 } },
  });

  async function handleSearch() {
    setIsSearching(true);
    setHasSearched(true);
    setResults([]);
    setExpandedIds(new Set());

    try {
      const params = new URLSearchParams({
        category,
        location,
        maxItems: "30",
      });

      const res = await fetch(`/api/wedding-platforms/search?${params}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      setResults(data.vendors || []);

      if (data.vendors?.length > 0) {
        toast.success(`Found ${data.vendors.length} vendors`);
      } else {
        toast.info("No vendors found for this search");
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Search failed"
      );
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Search Controls */}
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-white/10 bg-surface p-4">
        <div className="flex-1 min-w-[180px]">
          <label className="mb-1.5 block text-xs text-zinc-500">
            Category
          </label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="border-white/10 bg-white/5 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {vendorCategories.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 min-w-[180px]">
          <label className="mb-1.5 block text-xs text-zinc-500">
            Location
          </label>
          <Select value={location} onValueChange={setLocation}>
            <SelectTrigger className="border-white/10 bg-white/5 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {locations.map((l) => (
                <SelectItem key={l.value} value={l.value}>
                  {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={handleSearch}
          disabled={isSearching}
          className="bg-gold text-black hover:bg-gold-light h-10"
        >
          {isSearching ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <Search className="mr-1.5 h-4 w-4" />
          )}
          {isSearching ? "Scanning The Knot..." : "Search The Knot"}
        </Button>
      </div>

      {/* Loading State */}
      {isSearching && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Loader2 className="mb-3 h-8 w-8 animate-spin text-gold" />
          <p className="text-sm text-zinc-400">
            Scanning The Knot for{" "}
            {selectedCategory?.label.toLowerCase() || "vendors"} in{" "}
            {locations.find((l) => l.value === location)?.label}...
          </p>
          <p className="mt-1 text-xs text-zinc-600">
            This may take 30-60 seconds
          </p>
        </div>
      )}

      {/* Results Table */}
      {!isSearching && results.length > 0 && (
        <div className="rounded-lg border border-white/10 bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                {table.getHeaderGroups().map((hg) => (
                  <tr key={hg.id} className="border-b border-white/10">
                    {hg.headers.map((h) => (
                      <th
                        key={h.id}
                        className="px-4 py-3 text-left text-xs font-medium text-zinc-500"
                      >
                        {flexRender(h.column.columnDef.header, h.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => {
                  const vendor = row.original;
                  const isExpanded = expandedIds.has(vendor.name);

                  return (
                    <Fragment key={row.id}>
                      <tr className="border-b border-white/5 hover:bg-white/2 transition-colors">
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
                        <tr className="bg-white/2">
                          <td colSpan={columns.length} className="px-4 py-3">
                            <ContactResults
                              businessName={vendor.name}
                              websiteUrl={vendor.website}
                              phone={vendor.phone}
                              businessAddress={vendor.location}
                              leadType={selectedCategory?.leadType || "wedding"}
                              leadSource="theknot"
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

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-white/10 px-4 py-3">
            <p className="text-xs text-zinc-500">
              {results.length} vendors from The Knot
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-7 border-white/10 text-zinc-400"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="text-xs text-zinc-500">
                Page {table.getState().pagination.pageIndex + 1} of{" "}
                {table.getPageCount()}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 border-white/10 text-zinc-400"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isSearching && hasSearched && results.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-white/10 bg-surface py-16 text-center">
          <Heart className="mb-3 h-10 w-10 text-zinc-700" />
          <p className="text-sm text-zinc-500">
            No vendors found for this search
          </p>
          <p className="mt-1 text-xs text-zinc-600">
            Try a different category or location
          </p>
        </div>
      )}

      {/* Pre-search info */}
      {!hasSearched && !isSearching && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-white/10 bg-surface py-16 text-center">
          <Heart className="mb-3 h-10 w-10 text-zinc-700" />
          <p className="text-sm text-zinc-400">
            Search The Knot for wedding vendors in Maryland
          </p>
          <p className="mt-1 text-xs text-zinc-600">
            Find venues, planners, and coordinators to partner with for referrals
          </p>
        </div>
      )}
    </div>
  );
}
