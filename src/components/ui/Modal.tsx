import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/src/lib/utils";
import { IconButton } from "./Button";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  closeOnOverlayClick?: boolean;
  className?: string;
}

const sizeMap = {
  sm: "max-w-lg",
  md: "max-w-2xl",
  lg: "max-w-4xl",
  xl: "max-w-6xl",
};

export function Modal({
  open,
  onClose,
  title,
  description,
  icon,
  children,
  footer,
  size = "md",
  closeOnOverlayClick = true,
  className,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = originalOverflow;
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-zinc-950/55 backdrop-blur-sm"
        onClick={() => {
          if (closeOnOverlayClick) {
            onClose();
          }
        }}
      />

      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative z-[121] flex max-h-[90vh] w-full flex-col overflow-hidden rounded-[28px] border border-zinc-200 bg-white shadow-2xl",
          sizeMap[size],
          className
        )}
      >
        {(title || description || icon) && (
          <div className="flex items-start justify-between gap-4 border-b border-zinc-100 px-5 py-5 sm:px-6">
            <div className="flex min-w-0 items-start gap-4">
              {icon && (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-develoi-navy/10 bg-develoi-navy/5 text-develoi-navy">
                  {icon}
                </div>
              )}

              <div className="min-w-0">
                {title && <h3 className="text-lg font-black tracking-tight text-zinc-900">{title}</h3>}
                {description && (
                  <p className="mt-1 text-sm leading-relaxed text-zinc-500">{description}</p>
                )}
              </div>
            </div>

            <IconButton variant="ghost" size="sm" onClick={onClose} aria-label="Fechar modal">
              <X size={16} />
            </IconButton>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>

        {footer && <div className="border-t border-zinc-100 px-5 py-4 sm:px-6">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}
