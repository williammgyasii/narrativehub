import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusConfig = {
  new: { label: "New", className: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  contacted: { label: "Contacted", className: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  responded: { label: "Responded", className: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  booked: { label: "Booked", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  closed: { label: "Closed", className: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" },
} as const;

export function LeadStatusBadge({
  status,
  className,
}: {
  status: keyof typeof statusConfig;
  className?: string;
}) {
  const config = statusConfig[status];
  return (
    <Badge
      variant="outline"
      className={cn("text-xs font-medium", config.className, className)}
    >
      {config.label}
    </Badge>
  );
}
