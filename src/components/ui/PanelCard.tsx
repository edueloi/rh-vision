import React from "react";
import { cn } from "@/src/lib/utils";

interface PanelCardProps extends React.HTMLAttributes<HTMLElement> {
  key?: React.Key;
  title?: string;
  description?: string;
  icon?: React.ElementType;
  action?: React.ReactNode;
  contentClassName?: string;
  headerClassName?: string;
  iconWrapClassName?: string;
  iconClassName?: string;
  children?: React.ReactNode;
  className?: string;
  padding?: boolean;
  color?: string;
}

export function PanelCard({
  title,
  description,
  icon: Icon,
  action,
  children,
  className,
  contentClassName,
  headerClassName,
  iconWrapClassName,
  iconClassName,
  padding = true,
  color,
  ...props
}: PanelCardProps) {
  const hasHeader = !!(title || Icon || action);

  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm",
        className
      )}
      style={color ? { borderTopColor: color, borderTopWidth: "3px" } : {}}
      {...props}
    >
      {hasHeader && (
        <div
          className={cn(
            "flex items-center justify-between gap-3 border-b border-zinc-100 px-4 py-3.5 sm:px-5 sm:py-4",
            headerClassName
          )}
        >
          <div className="flex min-w-0 items-center gap-3">
            {Icon && (
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-develoi-navy/5",
                  iconWrapClassName
                )}
              >
                <Icon size={15} className={cn("text-develoi-navy", iconClassName)} />
              </div>
            )}
            {(title || description) && (
              <div className="min-w-0">
                {title && (
                  <h3 className="text-[13px] font-bold tracking-tight text-zinc-900 leading-none">{title}</h3>
                )}
                {description && (
                  <p className="mt-0.5 text-[11px] text-zinc-400">{description}</p>
                )}
              </div>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={cn(padding ? "p-4 sm:p-5" : "p-0", contentClassName)}>{children}</div>
    </section>
  );
}
