import React from "react";
import { cn } from "@/src/lib/utils";
import { FolderOpen } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon = <FolderOpen size={48} />,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 px-6 text-center animate-in fade-in zoom-in-95 duration-500",
        className
      )}
    >
      <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-zinc-50 text-zinc-300">
        <span className="shrink-0">{icon}</span>
      </div>
      <h3 className="mb-2 text-lg font-black tracking-tight text-zinc-900">{title}</h3>
      {description && (
        <p className="mb-6 max-w-[280px] text-sm leading-relaxed text-zinc-500 font-medium">
          {description}
        </p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}
