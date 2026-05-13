import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/src/lib/utils";
import { IconButton } from "./Button";
import { motion, AnimatePresence } from "motion/react";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  closeOnOverlayClick?: boolean;
  className?: string;
}

const sizeMap = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-3xl",
  xl: "max-w-5xl",
  full: "max-w-full",
};

export function Drawer({
  open,
  onClose,
  title,
  description,
  icon,
  actions,
  children,
  footer,
  size = "md",
  closeOnOverlayClick = true,
  className,
}: DrawerProps) {
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

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[150] flex justify-end">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm"
            onClick={() => {
              if (closeOnOverlayClick) {
                onClose();
              }
            }}
          />

          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            role="dialog"
            aria-modal="true"
            className={cn(
              "relative z-[151] flex h-full w-full flex-col overflow-hidden bg-white shadow-2xl border-l border-zinc-100",
              sizeMap[size],
              className
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-4 border-b border-zinc-100 px-6 py-6 sm:px-8">
              <div className="flex items-center gap-4 min-w-0">
                {icon && (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-develoi-navy/10 bg-develoi-navy/5 text-develoi-navy shadow-sm">
                    {icon}
                  </div>
                )}
                <div className="min-w-0">
                  {title && <h3 className="text-xl font-black tracking-tight text-zinc-900 truncate">{title}</h3>}
                  {description && (
                    <p className="mt-0.5 text-xs font-bold uppercase tracking-widest text-zinc-400 truncate">
                      {description}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {actions}
                <div className="w-px h-8 bg-zinc-200 mx-1" />
                <IconButton 
                  variant="ghost" 
                  size="md" 
                  onClick={onClose} 
                  aria-label="Fechar painel"
                  className="rounded-2xl hover:bg-zinc-100"
                >
                  <X size={24} />
                </IconButton>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto no-scrollbar">
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div className="border-t border-zinc-100 px-6 py-5 sm:px-8 bg-zinc-50/50">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
