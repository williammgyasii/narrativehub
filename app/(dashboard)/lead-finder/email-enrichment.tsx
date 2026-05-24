"use client";

import { useState, useTransition, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
} from "@tanstack/react-table";
import {
  Search,
  Mail,
  User,
  Briefcase,
  ShieldCheck,
  Plus,
  Check,
  AlertTriangle,
  Globe,
  ChevronLeft,
  ChevronRight,
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
import { saveAsLead } from "@/lib/actions/lead-finder";
import { toast } from "sonner";

interface EmailResult {
  email: string;
  firstName?: string;
  lastName?: string;
  position?: string;
  confidence: number;
}

const columnHelper = createColumnHelper<EmailResult>();

export function EmailEnrichment() {
  const [domain, setDomain] = useState("");
  const [leadType, setLeadType] = useState<string>("corporate");
  const [results, setResults] = useState<EmailResult[]>([]);
  const [savedEmails, setSavedEmails] = useState<Set<string>>(new Set());
  const [isSearching, setIsSearching] = useState(false);
  const [notConfigured, setNotConfigured] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isPending, startTransition] = useTransition();

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: "contact",
        header: "Contact",
        cell: (info) => {
          const result = info.row.original;
          const fullName = [result.firstName, result.lastName]
            .filter(Boolean)
            .join(" ");
          return (
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold/10">
                <User className="h-4 w-4 text-gold" />
              </div>
              <div className="min-w-0">
                {fullName && (
                  <p className="font-medium text-white">{fullName}</p>
                )}
                <p className="text-sm text-blue-400 truncate">{result.email}</p>
              </div>
            </div>
          );
        },
      }),
      columnHelper.accessor("position", {
        header: "Position",
        cell: (info) => {
          const position = info.getValue();
          if (!position) return <span className="text-zinc-600">—</span>;
          return (
            <span className="flex items-center gap-1 text-sm text-zinc-400">
              <Briefcase className="h-3.5 w-3.5" />
              {position}
            </span>
          );
        },
      }),
      columnHelper.accessor("confidence", {
        header: "Confidence",
        cell: (info) => {
          const confidence = info.getValue();
          const color =
            confidence >= 80
              ? "text-emerald-400"
              : confidence >= 50
                ? "text-amber-400"
                : "text-red-400";
          return (
            <span className={`flex items-center gap-1 text-sm ${color}`}>
              <ShieldCheck className="h-3.5 w-3.5" />
              {confidence}%
            </span>
          );
        },
      }),
      columnHelper.display({
        id: "actions",
        header: "",
        cell: (info) => {
          const result = info.row.original;
          const isSaved = savedEmails.has(result.email);
          return (
            <Button
              size="sm"
              disabled={isSaved || isPending}
              onClick={() => handleSave(result)}
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
          );
        },
      }),
    ],
    [savedEmails, isPending]
  );

  const table = useReactTable({
    data: results,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  async function handleSearch() {
    const d = domain.trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    if (!d) return;

    setIsSearching(true);
    setHasSearched(true);
    try {
      const res = await fetch(
        `/api/hunter/search?domain=${encodeURIComponent(d)}`
      );
      const data = await res.json();

      if (data.notConfigured) {
        setNotConfigured(true);
        return;
      }

      if (data.error) {
        toast.error(data.error);
        return;
      }

      setResults(data.results || []);
      if (data.results?.length === 0) {
        toast.info("No email addresses found for this domain.");
      }
    } catch {
      toast.error("Failed to search. Please try again.");
    } finally {
      setIsSearching(false);
    }
  }

  function handleSave(result: EmailResult) {
    startTransition(async () => {
      const name =
        [result.firstName, result.lastName].filter(Boolean).join(" ") ||
        result.email.split("@")[0];

      const saveResult = await saveAsLead({
        name,
        email: result.email,
        businessName: domain
          .trim()
          .replace(/^https?:\/\//, "")
          .replace(/\/.*$/, ""),
        leadType: leadType as
          | "wedding"
          | "corporate"
          | "real_estate"
          | "architectural",
        source: "hunter_io",
        notes: `Found via Hunter.io\nEmail: ${result.email}${
          result.position ? `\nPosition: ${result.position}` : ""
        }\nConfidence: ${result.confidence}%`,
      });

      if (saveResult.error) {
        toast.error(saveResult.error);
      } else {
        setSavedEmails((prev) => new Set(prev).add(result.email));
        toast.success(`${name} added to your leads`);
      }
    });
  }

  if (notConfigured) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-amber-500/20 bg-amber-500/5 px-6 py-12 text-center">
        <AlertTriangle className="mb-3 h-8 w-8 text-amber-400" />
        <h3 className="text-lg font-medium text-white">
          Hunter.io API Key Required
        </h3>
        <p className="mt-2 max-w-md text-sm text-zinc-400">
          To find email addresses, add your Hunter.io API key to{" "}
          <code className="rounded bg-white/5 px-1.5 py-0.5 text-xs text-zinc-300">
            .env.local
          </code>
        </p>
        <p className="mt-1 text-xs text-zinc-600">
          Get a free key at{" "}
          <a
            href="https://hunter.io"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gold hover:underline"
          >
            hunter.io
          </a>{" "}
          (25 free searches/month)
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <Input
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Enter a website domain (e.g. grandhistoric.com)"
            className="border-white/10 bg-white/5 pl-9 text-white placeholder:text-zinc-600"
          />
        </div>
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
          onClick={handleSearch}
          disabled={isSearching || !domain.trim()}
          className="bg-gold text-black hover:bg-gold-light"
        >
          <Search className="mr-1.5 h-4 w-4" />
          {isSearching ? "Searching..." : "Find Emails"}
        </Button>
      </div>

      {/* Empty state */}
      {!hasSearched && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-white/10 px-6 py-16 text-center">
          <Mail className="mb-3 h-10 w-10 text-zinc-700" />
          <h3 className="text-base font-medium text-zinc-300">
            Find contact emails by domain
          </h3>
          <p className="mt-1 max-w-sm text-sm text-zinc-600">
            Enter a company website to discover email addresses of key contacts
            using Hunter.io.
          </p>
        </div>
      )}

      {/* Loading */}
      {isSearching && (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-lg border border-white/10 bg-surface p-4"
            >
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-white/5" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/3 rounded bg-white/5" />
                  <div className="h-3 w-1/2 rounded bg-white/5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Results Table */}
      {!isSearching && results.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-zinc-400">
            {results.length} email{results.length !== 1 ? "s" : ""} found
          </p>

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
                    className="border-b border-white/5 transition-colors hover:bg-white/2"
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

          {/* Pagination controls */}
          {table.getPageCount() > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-zinc-500">
                Page {table.getState().pagination.pageIndex + 1} of{" "}
                {table.getPageCount()}
                {" · "}
                {results.length} total results
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
          )}
        </div>
      )}

      {/* No results after search */}
      {!isSearching && hasSearched && results.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-white/10 px-6 py-12 text-center">
          <Mail className="mb-3 h-8 w-8 text-zinc-700" />
          <p className="text-sm text-zinc-400">
            No email addresses found for this domain.
          </p>
          <p className="mt-1 text-xs text-zinc-600">
            Try a different domain or check the spelling.
          </p>
        </div>
      )}
    </div>
  );
}
