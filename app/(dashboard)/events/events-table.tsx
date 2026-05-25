"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowUpDown, MapPin, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/format";
import type { Event } from "@/lib/db/schema";

const paymentStyles: Record<string, string> = {
  unpaid: "border-red-500/20 bg-red-500/10 text-red-400",
  deposit: "border-amber-500/20 bg-amber-500/10 text-amber-400",
  paid: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
};

const typeLabels: Record<string, string> = {
  wedding: "Wedding",
  corporate: "Corporate",
  real_estate: "Real Estate",
  architectural: "Architectural",
  other: "Other",
};

export function EventsTable({ events }: { events: Event[] }) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "eventDate", desc: false },
  ]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const filteredData = useMemo(() => {
    let data = events;
    if (statusFilter !== "all") {
      data = data.filter((e) => e.paymentStatus === statusFilter);
    }
    if (typeFilter !== "all") {
      data = data.filter((e) => e.eventType === typeFilter);
    }
    return data;
  }, [events, statusFilter, typeFilter]);

  const columns = useMemo<ColumnDef<Event>[]>(
    () => [
      {
        accessorKey: "eventDate",
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="-ml-3 text-zinc-400 hover:text-white"
          >
            Date
            <ArrowUpDown className="ml-1 h-3 w-3" />
          </Button>
        ),
        cell: (info) => {
          const d = new Date(info.getValue() as string);
          const isPast = d < new Date();
          return (
            <div className="flex items-center gap-2.5">
              <div className={`flex h-10 w-10 flex-col items-center justify-center rounded-lg shrink-0 ${isPast ? "bg-zinc-500/10 text-zinc-500" : "bg-gold/10 text-gold"}`}>
                <span className="text-[10px] font-medium leading-none uppercase">
                  {d.toLocaleDateString("en-US", { month: "short" })}
                </span>
                <span className="text-sm font-bold leading-tight">
                  {d.getDate()}
                </span>
              </div>
              <div className="text-xs text-zinc-500">
                <div>{d.toLocaleDateString("en-US", { weekday: "short" })}</div>
                <div>
                  {d.toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </div>
          );
        },
        sortingFn: (rowA, rowB) =>
          new Date(rowA.original.eventDate).getTime() -
          new Date(rowB.original.eventDate).getTime(),
      },
      {
        accessorKey: "title",
        header: "Event",
        cell: (info) => {
          const event = info.row.original;
          return (
            <div className="min-w-0">
              <Link
                href={`/events/${event.id}`}
                className="font-medium text-white hover:text-gold transition-colors"
              >
                {event.title}
              </Link>
              {event.location && (
                <p className="mt-0.5 flex items-center gap-1 text-xs text-zinc-500 truncate">
                  <MapPin className="h-3 w-3 shrink-0" />
                  {event.location}
                </p>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "eventType",
        header: "Type",
        cell: (info) => {
          const type = info.getValue() as string | null;
          if (!type) return <span className="text-zinc-600">—</span>;
          return (
            <span className="text-sm text-zinc-300">
              {typeLabels[type] || type}
            </span>
          );
        },
      },
      {
        accessorKey: "packagePrice",
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="-ml-3 text-zinc-400 hover:text-white"
          >
            Price
            <ArrowUpDown className="ml-1 h-3 w-3" />
          </Button>
        ),
        cell: (info) => {
          const price = info.getValue() as number;
          if (!price) return <span className="text-zinc-600">—</span>;
          return (
            <span className="text-sm font-medium text-zinc-200 whitespace-nowrap">
              {formatCurrency(price)}
            </span>
          );
        },
      },
      {
        accessorKey: "paymentStatus",
        header: "Payment",
        cell: (info) => {
          const status = info.getValue() as string;
          return (
            <Badge
              variant="outline"
              className={`capitalize ${paymentStyles[status] || ""}`}
            >
              {status}
            </Badge>
          );
        },
      },
    ],
    []
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 15 } },
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <Input
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          placeholder="Search events..."
          className="w-full sm:w-64 border-white/10 bg-white/5 text-white placeholder:text-zinc-600"
        />
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40 border-white/10 bg-white/5 text-white">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent className="border-white/10 bg-surface-hover">
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="wedding">Wedding</SelectItem>
            <SelectItem value="corporate">Corporate</SelectItem>
            <SelectItem value="real_estate">Real Estate</SelectItem>
            <SelectItem value="architectural">Architectural</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 border-white/10 bg-white/5 text-white">
            <SelectValue placeholder="Payment" />
          </SelectTrigger>
          <SelectContent className="border-white/10 bg-surface-hover">
            <SelectItem value="all">All Payments</SelectItem>
            <SelectItem value="unpaid">Unpaid</SelectItem>
            <SelectItem value="deposit">Deposit</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-white/10 overflow-x-auto">
        <Table className="min-w-[700px]">
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="border-white/10 hover:bg-transparent">
                {hg.headers.map((header) => (
                  <TableHead key={header.id} className="text-zinc-500">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-zinc-500">
                  <CalendarDays className="mx-auto mb-2 h-6 w-6 text-zinc-700" />
                  No events found
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => {
                const isPast = new Date(row.original.eventDate) < new Date();
                return (
                  <TableRow
                    key={row.id}
                    className={`border-white/5 hover:bg-white/3 transition-colors cursor-pointer ${isPast ? "opacity-50" : ""}`}
                    onClick={() => {
                      window.location.href = `/events/${row.original.id}`;
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span>
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount()} ({filteredData.length} events)
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="h-7 w-7 p-0 border-white/10"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="h-7 w-7 p-0 border-white/10"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
