import React, { forwardRef, useState } from "react";
import { cn } from "@/src/lib/utils";
import { Info, AlertCircle, CheckCircle2, ChevronDown } from "lucide-react";

// ── Common Shared Props ───────────────────────────────────────

interface CommonProps {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  fullWidth?: boolean;
  containerClassName?: string;
  icon?: React.ReactNode;
  addonRight?: React.ReactNode;
  addonLeft?: React.ReactNode;
  success?: boolean;
}

// ── Input ──────────────────────────────────────────────────

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    CommonProps {}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      className,
      required,
      fullWidth = true,
      containerClassName,
      icon,
      addonLeft,
      addonRight,
      success,
      ...props
    },
    ref
  ) => {
    return (
      <div className={cn("flex flex-col gap-1.5", fullWidth && "w-full", containerClassName)}>
        {label && (
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 select-none">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
        )}

        <div className="relative group">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center text-zinc-400 group-focus-within:text-[#2a74ac] transition-colors">
              {icon}
            </div>
          )}

          {addonLeft && (
            <div className="absolute left-0 top-0 bottom-0 flex items-center px-3 border-r border-zinc-200 bg-zinc-100/50 rounded-l-xl text-zinc-500 font-bold text-xs">
              {addonLeft}
            </div>
          )}

          <input
            ref={ref}
            className={cn(
              "flex h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-bold text-zinc-800 shadow-sm transition-all placeholder:text-zinc-400 placeholder:font-normal placeholder:italic",
              "hover:border-zinc-300",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/50 focus-visible:ring-offset-0 focus-visible:border-[#2a74ac]",
              "disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400",
              icon && "pl-10",
              addonLeft && "pl-14",
              addonRight && "pr-10",
              error && "border-red-500 focus-visible:ring-red-500/20 focus-visible:border-red-500",
              success && "border-emerald-500 focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500",
              className
            )}
            {...props}
          />

          {addonRight && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center text-zinc-400 group-focus-within:text-[#2a74ac] transition-colors">
              {addonRight}
            </div>
          )}

          {error && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center text-red-500 pointer-events-none">
              <AlertCircle size={15} />
            </div>
          )}

          {success && !error && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center text-emerald-500 pointer-events-none">
              <CheckCircle2 size={15} />
            </div>
          )}
        </div>

        {error && (
          <span className="text-[11px] font-semibold text-red-500 flex items-center gap-1">
            <AlertCircle size={12} />
            {error}
          </span>
        )}

        {hint && !error && (
          <span className="text-[11px] font-medium text-zinc-400 flex items-center gap-1">
            <Info size={12} />
            {hint}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

// ── Textarea ───────────────────────────────────────────────

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    CommonProps {
  rows?: number;
  maxChars?: number;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      error,
      hint,
      className,
      required,
      fullWidth = true,
      containerClassName,
      rows = 4,
      maxChars,
      value,
      ...props
    },
    ref
  ) => {
    const charCount = typeof value === "string" ? value.length : 0;

    return (
      <div className={cn("flex flex-col gap-1.5", fullWidth && "w-full", containerClassName)}>
        <div className="flex items-center justify-between">
          {label && (
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 select-none">
              {label} {required && <span className="text-red-500">*</span>}
            </label>
          )}
          {maxChars && (
            <span
              className={cn(
                "text-[10px] font-bold",
                charCount > maxChars ? "text-red-500" : "text-zinc-400"
              )}
            >
              {charCount}/{maxChars}
            </span>
          )}
        </div>

        <div className="relative group">
          <textarea
            ref={ref}
            rows={rows}
            className={cn(
              "flex w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-bold text-zinc-800 shadow-sm transition-all placeholder:text-zinc-400 placeholder:font-normal placeholder:italic",
              "hover:border-zinc-300 resize-none",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/50 focus-visible:ring-offset-0 focus-visible:border-[#2a74ac]",
              "disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400",
              error && "border-red-500 focus-visible:ring-red-500/20 focus-visible:border-red-500",
              className
            )}
            value={value}
            {...props}
          />
        </div>

        {error && (
          <span className="text-[11px] font-semibold text-red-500 flex items-center gap-1">
            <AlertCircle size={12} />
            {error}
          </span>
        )}

        {hint && !error && (
          <span className="text-[11px] font-medium text-zinc-400 flex items-center gap-1">
            <Info size={12} />
            {hint}
          </span>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";

// ── Select ─────────────────────────────────────────────────

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement>,
    CommonProps {}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      hint,
      className,
      required,
      fullWidth = true,
      containerClassName,
      icon,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <div className={cn("flex flex-col gap-1.5", fullWidth && "w-full", containerClassName)}>
        {label && (
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 select-none">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
        )}

        <div className="relative group">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center text-zinc-400 group-focus-within:text-[#2a74ac] transition-colors z-10 pointer-events-none">
              {icon}
            </div>
          )}

          <select
            ref={ref}
            className={cn(
              "flex h-10 w-full appearance-none rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 pr-10 text-xs font-bold text-zinc-800 shadow-sm transition-all",
              "hover:border-zinc-300",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/50 focus-visible:ring-offset-0 focus-visible:border-[#2a74ac]",
              "disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400",
              icon && "pl-10",
              error && "border-red-500 focus-visible:ring-red-500/20 focus-visible:border-red-500",
              className
            )}
            {...props}
          >
            {children}
          </select>

          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center text-zinc-400 group-focus-within:text-[#2a74ac] transition-colors pointer-events-none">
            <ChevronDown size={15} />
          </div>
        </div>

        {error && (
          <span className="text-[11px] font-semibold text-red-500 flex items-center gap-1">
            <AlertCircle size={12} />
            {error}
          </span>
        )}

        {hint && !error && (
          <span className="text-[11px] font-medium text-zinc-400 flex items-center gap-1">
            <Info size={12} />
            {hint}
          </span>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";
