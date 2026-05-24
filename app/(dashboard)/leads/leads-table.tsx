"use client";

import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
  type RowSelectionState,
} from "@tanstack/react-table";
import {
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Mail,
  Phone,
  Trash2,
  ExternalLink,
  Loader2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LeadTypeBadge } from "@/components/lead-type-badge";
import { LeadStatusSelect } from "@/components/lead-status-select";
import { QuickComposeDialog } from "@/components/quick-compose-dialog";
import { deleteLead, bulkDeleteLeads, bulkUpdateLeadStatus } from "@/lib/actions/leads";
import { formatRelativeDate } from "@/lib/format";
import { toast } from "sonner";
import type { Lead } from "@/lib/db/schema";

const columnHelper = createColumnHelper<Lead>();

export function LeadsTable({ data }: { data: Lead[] }) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [isPending, startTransition] = useTransition();

  const filteredData = useMemo(() => {
    let filtered = data;
    if (statusFilter !== "all") {
      filtered = filtered.filter((l) => l.status === statusFilter);
    }
    if (typeFilter !== "all") {
      filtered = filtered.filter((l) => l.leadType === typeFilter);
    }
    return filtered;
  }, [data, statusFilter, typeFilter]);

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
            aria-label="Select all"
            className="border-zinc-600 data-[state=checked]:bg-gold data-[state=checked]:border-gold"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
            className="border-zinc-600 data-[state=checked]:bg-gold data-[state=checked]:border-gold"
          />
        ),
        enableSorting: false,
        enableHiding: false,
      }),
      columnHelper.accessor("name", {
        header: ({ column }) => (
          <button
            className="flex items-center gap-1"
            onClick={() => column.toggleSorting()}
          >
            Name
            <ArrowUpDown className="h-3 w-3 text-zinc-600" />
          </button>
        ),
        cell: (info) => (
          <div className="min-w-0">
            <Link
              href={`/leads/${info.row.original.id}`}
              className="font-medium text-white hover:text-gold transition-colors"
            >
              {info.getValue()}
            </Link>
            {info.row.original.businessName && (
              <p className="text-xs text-zinc-500 truncate">
                {info.row.original.businessName}
              </p>
            )}
          </div>
        ),
      }),
      columnHelper.accessor("email", {
        header: "Email",
        cell: (info) => {
          const email = info.getValue();
          if (!email) return <span className="text-zinc-700">—</span>;
          return (
            <span className="flex items-center gap-1 text-sm text-blue-400 truncate max-w-[200px]">
              <Mail className="h-3 w-3 shrink-0" />
              {email}
            </span>
          );
        },
      }),
      columnHelper.accessor("phone", {
        header: "Phone",
        cell: (info) => {
          const phone = info.getValue();
          if (!phone) return <span className="text-zinc-700">—</span>;
          return (
            <a
              href={`tel:${phone}`}
              className="flex items-center gap-1 text-sm text-zinc-400 hover:text-white transition-colors whitespace-nowrap"
            >
              <Phone className="h-3 w-3 shrink-0" />
              {phone}
            </a>
          );
        },
      }),
      columnHelper.accessor("leadType", {
        header: "Type",
        cell: (info) => (
          <LeadTypeBadge type={info.getValue() as "wedding" | "corporate" | "real_estate" | "architectural"} />
        ),
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: (info) => (
          <LeadStatusSelect
            leadId={info.row.original.id}
            currentStatus={info.getValue()}
          />
        ),
      }),
      columnHelper.accessor("source", {
        header: "Source",
        cell: (info) => {
          const source = info.getValue();
          if (!source) return <span className="text-zinc-700">—</span>;
          const sourceLabels: Record<string, string> = {
            manual: "Manual",
            google_places: "Google",
            eventbrite: "Eventbrite",
            hunter: "Hunter.io",
            reddit: "Reddit",
            theknot: "The Knot",
          };
          return (
            <span className="text-xs text-zinc-500 whitespace-nowrap">
              {sourceLabels[source] || source}
            </span>
          );
        },
      }),
      columnHelper.accessor("createdAt", {
        header: ({ column }) => (
          <button
            className="flex items-center gap-1"
            onClick={() => column.toggleSorting()}
          >
            Added
            <ArrowUpDown className="h-3 w-3 text-zinc-600" />
          </button>
        ),
        cell: (info) => (
          <span className="text-xs text-zinc-500 whitespace-nowrap">
            {formatRelativeDate(info.getValue())}
          </span>
        ),
      }),
      columnHelper.display({
        id: "actions",
        header: "",
        cell: (info) => {
          const lead = info.row.original;
          return (
            <div className="flex items-center gap-1">
              {lead.email && (
                <QuickComposeDialog
                  lead={{
                    id: lead.id,
                    name: lead.name,
                    email: lead.email,
                    businessName: lead.businessName,
                    leadType: lead.leadType,
                  }}
                />
              )}
              <Button
                asChild
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-zinc-500 hover:text-white"
              >
                <Link href={`/leads/${lead.id}`}>
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-zinc-600 hover:text-red-400"
                onClick={async () => {
                  if (!confirm(`Delete "${lead.name}"?`)) return;
                  await deleteLead(lead.id);
                  toast.success(`${lead.name} deleted`);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          );
        },
      }),
    ],
    []
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting, globalFilter, rowSelection },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    enableRowSelection: true,
    initialState: { pagination: { pageSize: 15 } },
  });

  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const selectedIds = selectedRows.map((r) => r.original.id);
  const selectedCount = selectedRows.length;

  function handleBulkStatusChange(status: string) {
    if (selectedCount === 0) return;
    startTransition(async () => {
      await bulkUpdateLeadStatus(
        selectedIds,
        status as "new" | "contacted" | "responded" | "booked" | "closed"
      );
      setRowSelection({});
      toast.success(`${selectedCount} lead${selectedCount > 1 ? "s" : ""} updated to ${status}`);
    });
  }

  function handleBulkDelete() {
    if (selectedCount === 0) return;
    if (!confirm(`Delete ${selectedCount} lead${selectedCount > 1 ? "s" : ""}? This cannot be undone.`)) return;
    startTransition(async () => {
      await bulkDeleteLeads(selectedIds);
      setRowSelection({});
      toast.success(`${selectedCount} lead${selectedCount > 1 ? "s" : ""} deleted`);
    });
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3">
        <Input
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          placeholder="Search leads..."
          className="max-w-xs border-white/10 bg-white/5 text-white placeholder:text-zinc-600"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px] border-white/10 bg-white/5 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-white/10 bg-surface-hover">
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="responded">Responded</SelectItem>
            <SelectItem value="booked">Booked</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
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
        {(statusFilter !== "all" || typeFilter !== "all" || globalFilter) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStatusFilter("all");
              setTypeFilter("all");
              setGlobalFilter("");
            }}
            className="text-xs text-zinc-400 hover:text-white"
          >
            Clear filters
          </Button>
        )}
        <div className="flex-1" />
        <span className="text-xs text-zinc-500">
          {filteredData.length} lead{filteredData.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Bulk Actions Bar */}
      {selectedCount > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-gold/20 bg-gold/5 px-4 py-2.5">
          <span className="text-sm font-medium text-gold">
            {selectedCount} selected
          </span>
          <div className="h-4 w-px bg-white/10" />
          <Select onValueChange={handleBulkStatusChange}>
            <SelectTrigger className="h-8 w-[150px] border-white/10 bg-white/5 text-xs text-white">
              <SelectValue placeholder="Change status" />
            </SelectTrigger>
            <SelectContent className="border-white/10 bg-surface-hover">
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="contacted">Contacted</SelectItem>
              <SelectItem value="responded">Responded</SelectItem>
              <SelectItem value="booked">Booked</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleBulkDelete}
            disabled={isPending}
            className="h-8 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
          >
            {isPending ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            )}
            Delete
          </Button>
          <div className="flex-1" />
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setRowSelection({})}
            className="h-8 text-xs text-zinc-400 hover:text-white"
          >
            <X className="mr-1 h-3 w-3" />
            Clear
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border border-white/10 overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr
                key={headerGroup.id}
                className="border-b border-white/10 bg-white/2"
              >
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 ${
                      header.id === "select" ? "w-10" : ""
                    }`}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-sm text-zinc-500"
                >
                  No leads match your filters
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className={`border-b border-white/5 transition-colors ${
                    row.getIsSelected()
                      ? "bg-gold/5"
                      : "hover:bg-white/2"
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
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-zinc-500">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount()}
            {" · "}
            {filteredData.length} total
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
  );
}
