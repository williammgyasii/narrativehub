import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const typeConfig = {
  wedding: { label: "Wedding", className: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
  corporate: { label: "Corporate", className: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  real_estate: { label: "Real Estate", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  architectural: { label: "Architectural", className: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
} as const;

export function LeadTypeBadge({
  type,
  className,
}: {
  type: keyof typeof typeConfig;
  className?: string;
}) {
  const config = typeConfig[type];
  return (
    <Badge
      variant="outline"
      className={cn("text-xs font-medium", config.className, className)}
    >
      {config.label}
    </Badge>
  );
}
