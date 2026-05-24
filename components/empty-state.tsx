import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  children?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  children,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 py-16 text-center",
        className
      )}
    >
      <Icon className="mb-3 h-10 w-10 text-zinc-700" />
      <p className="text-sm font-medium text-zinc-400">{title}</p>
      <p className="mt-1 max-w-xs text-xs text-zinc-600">{description}</p>
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
