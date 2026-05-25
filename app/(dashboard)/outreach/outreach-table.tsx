"use client";

import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
} from "@tanstack/react-table";
import {
  ChevronLeft,
  ChevronRight,
  Send,
  Trash2,
  FileEdit,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  sendDraft,
  deleteDraft,
  deleteOutreachEntry,
} from "@/lib/actions/outreach";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";

interface OutreachEntry {
  outreach: {
    id: string;
    leadId: string;
    subject: string;
    body: string;
    status: "draft" | "sent" | "opened" | "replied";
    sentAt: Date | null;
    createdAt: Date;
    resendId: string | null;
  };
  leadName: string | null;
  leadEmail: string | null;
  leadBusiness: string | null;
}

const statusStyles = {
  draft: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  sent: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  opened: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  replied: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
} as const;

const columnHelper = createColumnHelper<OutreachEntry>();

export function OutreachTable({ data }: { data: OutreachEntry[] }) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [isPending, startTransition] = useTransition();

  const filteredData = useMemo(() => {
    if (statusFilter === "all") return data;
    return data.filter((d) => d.outreach.status === statusFilter);
  }, [data, statusFilter]);

  function handleSendDraft(draftId: string, leadName: string) {
    startTransition(async () => {
      const result = await sendDraft(draftId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Email sent to ${leadName}`);
      }
    });
  }

  function handleDelete(id: string, status: string) {
    startTransition(async () => {
      const result =
        status === "draft"
          ? await deleteDraft(id)
          : await deleteOutreachEntry(id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Entry deleted");
      }
    });
  }

  const columns = useMemo(
    () => [
      columnHelper.accessor("outreach.subject", {
        header: "Subject",
        cell: (info) => (
          <div className="min-w-0">
            <p className="font-medium text-white truncate max-w-[300px]">
              {info.getValue()}
            </p>
            <p className="mt-0.5 text-xs text-zinc-500 truncate max-w-[300px]">
              {info.row.original.outreach.body.slice(0, 80)}...
            </p>
          </div>
        ),
      }),
      columnHelper.accessor("leadName", {
        header: "To",
        cell: (info) => {
          const entry = info.row.original;
          return (
            <Link
              href={`/leads/${entry.outreach.leadId}`}
              className="text-sm text-zinc-300 hover:text-gold transition-colors"
            >
              {entry.leadName || "Unknown"}
              {entry.leadEmail && (
                <span className="block text-xs text-zinc-600">
                  {entry.leadEmail}
                </span>
              )}
            </Link>
          );
        },
      }),
      columnHelper.accessor("outreach.status", {
        header: "Status",
        cell: (info) => (
          <Badge variant="outline" className={statusStyles[info.getValue()]}>
            {info.getValue()}
          </Badge>
        ),
      }),
      columnHelper.display({
        id: "date",
        header: "Date",
        cell: (info) => {
          const entry = info.row.original;
          return (
            <span className="text-xs text-zinc-500">
              {entry.outreach.sentAt
                ? formatDate(entry.outreach.sentAt)
                : formatDate(entry.outreach.createdAt)}
            </span>
          );
        },
      }),
      columnHelper.display({
        id: "actions",
        header: "",
        cell: (info) => {
          const entry = info.row.original;
          if (entry.outreach.status === "draft") {
            return (
              <div className="flex items-center gap-1">
                <Button
                  render={<Link href={`/outreach/compose?draftId=${entry.outreach.id}`} />}
                  size="sm"
                  variant="outline"
                  className="border-white/10 text-zinc-400 hover:text-white"
                >
                  <FileEdit className="mr-1 h-3 w-3" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  onClick={() =>
                    handleSendDraft(
                      entry.outreach.id,
                      entry.leadName || "lead"
                    )
                  }
                  disabled={isPending}
                  className="bg-gold text-black hover:bg-gold-light"
                >
                  <Send className="mr-1 h-3 w-3" />
                  Send
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    handleDelete(entry.outreach.id, entry.outreach.status)
                  }
                  disabled={isPending}
                  className="text-zinc-600 hover:text-red-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          }
          return (
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                handleDelete(entry.outreach.id, entry.outreach.status)
              }
              disabled={isPending}
              className="text-zinc-600 hover:text-red-400"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          );
        },
      }),
    ],
    [isPending]
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 15 } },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px] border-white/10 bg-white/5 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-white/10 bg-surface-hover">
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Drafts</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="opened">Opened</SelectItem>
            <SelectItem value="replied">Replied</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-zinc-500">
          {filteredData.length} email{filteredData.length !== 1 ? "s" : ""}
        </span>
      </div>

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

      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-zinc-500">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount()}
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
