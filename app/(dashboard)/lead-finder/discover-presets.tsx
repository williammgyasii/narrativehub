"use client";

import { useState, useMemo, Fragment } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
} from "@tanstack/react-table";
import {
  Star,
  MapPin,
  Globe,
  Phone,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Loader2,
  Search,
  Heart,
  Building,
  Home,
  Landmark,
  ArrowLeft,
  Ban,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ContactResults } from "@/components/contact-results";
import { SaveLeadDialog } from "@/components/save-lead-dialog";
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

interface SubCategory {
  label: string;
  query: string;
  description: string;
}

interface Preset {
  id: string;
  label: string;
  description: string;
  icon: typeof Heart;
  leadType: string;
  color: string;
  subCategories: SubCategory[];
}

const presets: Preset[] = [
  {
    id: "weddings",
    label: "Weddings",
    description: "Find wedding industry partners for referrals and collaborations",
    icon: Heart,
    leadType: "wedding",
    color: "text-pink-400 bg-pink-500/10 border-pink-500/20",
    subCategories: [
      { label: "Venues", query: "wedding venue reception hall", description: "Banquet halls, estates, gardens" },
      { label: "Planners", query: "wedding planner coordinator", description: "Full-service & day-of coordinators" },
      { label: "Florists", query: "wedding florist flower shop", description: "Floral design & arrangements" },
      { label: "Caterers", query: "wedding catering service", description: "Food & beverage services" },
      { label: "DJs & Bands", query: "wedding DJ live band entertainment", description: "Music & entertainment" },
      { label: "Bakeries", query: "wedding cake bakery", description: "Cakes & desserts" },
      { label: "Bridal Shops", query: "bridal shop wedding dress boutique", description: "Gowns & attire" },
      { label: "Other Photographers", query: "wedding photographer photography studio", description: "Collaborate or second-shoot" },
    ],
  },
  {
    id: "corporate",
    label: "Corporate Events",
    description: "Corporate event organizers, conference venues, and businesses",
    icon: Building,
    leadType: "corporate",
    color: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    subCategories: [
      { label: "Conference Venues", query: "conference center event space", description: "Hotels, convention centers" },
      { label: "Event Planners", query: "corporate event planner organizer", description: "Corporate event management" },
      { label: "Hotels", query: "hotel conference meeting room", description: "Hotels with event spaces" },
      { label: "Caterers", query: "corporate catering service", description: "Business lunch & event catering" },
      { label: "PR Agencies", query: "public relations PR agency", description: "PR firms needing event coverage" },
      { label: "Marketing Agencies", query: "marketing agency branding firm", description: "Content & branding needs" },
    ],
  },
  {
    id: "real_estate",
    label: "Real Estate",
    description: "Brokerages, agents, and property managers needing listing photos",
    icon: Home,
    leadType: "real_estate",
    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    subCategories: [
      { label: "Brokerages", query: "real estate brokerage agency office", description: "RE/MAX, Keller Williams, etc." },
      { label: "Property Managers", query: "property management company", description: "Rental & commercial properties" },
      { label: "Home Builders", query: "home builder custom construction", description: "New construction listings" },
      { label: "Staging Companies", query: "home staging interior design", description: "Staging for listings" },
      { label: "Luxury Agents", query: "luxury real estate agent million dollar homes", description: "High-end market" },
    ],
  },
  {
    id: "architectural",
    label: "Architectural",
    description: "Architecture firms, interior designers, and construction companies",
    icon: Landmark,
    leadType: "architectural",
    color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    subCategories: [
      { label: "Architecture Firms", query: "architecture firm design studio", description: "Commercial & residential architects" },
      { label: "Interior Designers", query: "interior design firm studio", description: "Residential & commercial design" },
      { label: "Construction", query: "construction company general contractor", description: "Builders needing project documentation" },
      { label: "Landscape Architects", query: "landscape architecture design", description: "Outdoor & landscape design" },
      { label: "Design-Build Firms", query: "design build firm renovation", description: "Combined design + construction" },
    ],
  },
];

const dmvLocations = [
  { value: "39.2037,-76.8610", radius: "40000" },
  { value: "39.2904,-76.6122", radius: "24000" },
  { value: "38.9072,-77.0369", radius: "24000" },
  { value: "38.8816,-77.1711", radius: "24000" },
  { value: "38.9784,-76.4922", radius: "16000" },
];

const columnHelper = createColumnHelper<PlaceResult>();

interface DiscoverPresetsProps {
  initialSkippedIds?: string[];
}

export function DiscoverPresets({ initialSkippedIds = [] }: DiscoverPresetsProps) {
  const [selectedPreset, setSelectedPreset] = useState<Preset | null>(null);
  const [activeCategory, setActiveCategory] = useState<SubCategory | null>(null);
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set(initialSkippedIds));
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

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
              {count ? <span className="text-zinc-600">({count})</span> : null}
            </span>
          );
        },
      }),
      columnHelper.accessor("phone", {
        header: "Phone",
        cell: (info) => {
          const phone = info.getValue();
          if (!phone) return <span className="text-zinc-600">—</span>;
          return (
            <a
              href={`tel:${phone}`}
              className="flex items-center gap-1 text-xs text-zinc-300 hover:text-gold"
            >
              <Phone className="h-3 w-3 shrink-0" />
              {phone}
            </a>
          );
        },
      }),
      columnHelper.accessor("website", {
        header: "Website",
        cell: (info) => {
          const url = info.getValue();
          if (!url) return <span className="text-zinc-600">—</span>;
          try {
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
          } catch {
            return <span className="text-zinc-600">—</span>;
          }
        },
      }),
      columnHelper.display({
        id: "contacts",
        header: "Contacts",
        cell: (info) => {
          const row = info.row.original;
          const isExpanded = expandedIds.has(row.placeId);
          return (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs text-zinc-400 hover:text-gold"
              onClick={() => toggleExpanded(row.placeId)}
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
          const isSaved = savedIds.has(row.placeId);
          const isSkipped = skippedIds.has(row.placeId);

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
              placeId={row.placeId}
              name={row.name}
              address={row.address}
              phone={row.phone}
              website={row.website}
              leadType={selectedPreset?.leadType || "wedding"}
              source="google_places"
              onSaved={() =>
                setSavedIds((prev) => new Set(prev).add(row.placeId))
              }
              onSkipped={() =>
                setSkippedIds((prev) => new Set(prev).add(row.placeId))
              }
            />
          );
        },
      }),
    ],
    [savedIds, skippedIds, expandedIds, selectedPreset]
  );

  const table = useReactTable({
    data: results,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 15 } },
  });

  async function handleCategorySearch(preset: Preset, cat: SubCategory) {
    setSelectedPreset(preset);
    setActiveCategory(cat);
    setIsSearching(true);
    setHasSearched(true);
    setResults([]);
    setExpandedIds(new Set());

    try {
      const allResults = new Map<string, PlaceResult>();

      for (const loc of dmvLocations) {
        const res = await fetch(
          `/api/places/search?q=${encodeURIComponent(cat.query)}&location=${loc.value}&radius=${loc.radius}`
        );
        const data = await res.json();
        if (data.results) {
          for (const r of data.results as PlaceResult[]) {
            if (!allResults.has(r.placeId)) allResults.set(r.placeId, r);
          }
        }
      }

      const merged = Array.from(allResults.values());
      setResults(merged);

      if (merged.length > 0) {
        toast.success(
          `Found ${merged.length} ${cat.label.toLowerCase()} across the DMV`
        );
      } else {
        toast.info("No results found for this category");
      }
    } catch {
      toast.error("Search failed. Please try again.");
    } finally {
      setIsSearching(false);
    }
  }

  function handleBack() {
    if (hasSearched) {
      setHasSearched(false);
      setResults([]);
      setActiveCategory(null);
    } else {
      setSelectedPreset(null);
      setActiveCategory(null);
    }
  }

  // --- Preset selection grid ---
  if (!selectedPreset) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-zinc-400">
          Choose a shoot type to find potential clients and referral partners in the DMV area.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {presets.map((preset) => {
            const Icon = preset.icon;
            return (
              <button
                key={preset.id}
                onClick={() => setSelectedPreset(preset)}
                className="group rounded-lg border border-white/10 bg-surface p-5 text-left transition-all hover:border-white/20 hover:bg-white/2"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg border ${preset.color}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-heading font-semibold text-white group-hover:text-gold transition-colors">
                      {preset.label}
                    </h3>
                    <p className="text-xs text-zinc-500">
                      {preset.subCategories.length} categories
                    </p>
                  </div>
                </div>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  {preset.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // --- Sub-category selection ---
  if (!hasSearched) {
    const Icon = selectedPreset.icon;
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="text-zinc-400 hover:text-white"
            onClick={handleBack}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-lg border ${selectedPreset.color}`}
            >
              <Icon className="h-4 w-4" />
            </div>
            <h2 className="font-heading text-lg font-semibold text-white">
              {selectedPreset.label}
            </h2>
          </div>
        </div>

        <p className="text-sm text-zinc-400">
          Who do you want to reach? Click a category to search the entire DMV area.
        </p>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {selectedPreset.subCategories.map((cat) => (
            <button
              key={cat.label}
              onClick={() =>
                handleCategorySearch(selectedPreset, cat)
              }
              className="group flex items-center gap-3 rounded-lg border border-white/10 bg-surface p-4 text-left transition-all hover:border-gold/30 hover:bg-gold/5"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 group-hover:bg-gold/10 transition-colors">
                <Search className="h-4 w-4 text-zinc-500 group-hover:text-gold transition-colors" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-200 group-hover:text-gold transition-colors">
                  {cat.label}
                </p>
                <p className="text-[11px] text-zinc-600 truncate">
                  {cat.description}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // --- Results view ---
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          className="text-zinc-400 hover:text-white"
          onClick={handleBack}
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={`${selectedPreset.color} text-xs`}
          >
            {selectedPreset.label}
          </Badge>
          <span className="text-zinc-600">/</span>
          <span className="text-sm font-medium text-white">
            {activeCategory?.label}
          </span>
        </div>
        {!isSearching && results.length > 0 && (
          <Badge
            variant="outline"
            className="ml-auto border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-xs"
          >
            {results.length} found
          </Badge>
        )}
      </div>

      {/* Loading */}
      {isSearching && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Loader2 className="mb-3 h-8 w-8 animate-spin text-gold" />
          <p className="text-sm text-zinc-400">
            Searching for {activeCategory?.label.toLowerCase()} across the DMV...
          </p>
          <p className="mt-1 text-xs text-zinc-600">
            Scanning all 5 DMV locations and deduplicating
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
                        {flexRender(
                          h.column.columnDef.header,
                          h.getContext()
                        )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => {
                  const place = row.original;
                  const isExpanded = expandedIds.has(place.placeId);
                  const isUnreachable = skippedIds.has(place.placeId);

                  return (
                    <Fragment key={row.id}>
                      <tr className={`border-b border-white/5 transition-colors ${isUnreachable ? "opacity-40" : "hover:bg-white/2"}`}>
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
                              businessName={place.name}
                              websiteUrl={place.website}
                              phone={place.phone}
                              businessAddress={place.address}
                              leadType={selectedPreset.leadType}
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

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-white/10 px-4 py-3">
            <p className="text-xs text-zinc-500">
              {results.length} results across the DMV
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

      {/* Empty */}
      {!isSearching && hasSearched && results.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-white/10 bg-surface py-16 text-center">
          <Search className="mb-3 h-10 w-10 text-zinc-700" />
          <p className="text-sm text-zinc-500">
            No {activeCategory?.label.toLowerCase()} found in the DMV
          </p>
          <p className="mt-1 text-xs text-zinc-600">
            Try a different category
          </p>
        </div>
      )}
    </div>
  );
}
