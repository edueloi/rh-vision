import React from 'react';
import { Search, ChevronDown, ListFilter, LayoutGrid, SlidersHorizontal, CalendarDays } from 'lucide-react';
import { cn } from "@/src/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// FilterLine Pattern
//
// Uma barra de filtros flexível, profissional e modular para dashboards.
// ─────────────────────────────────────────────────────────────────────────────

interface FilterSectionProps {
  children: React.ReactNode;
  className?: string;
}

export const FilterSection: React.FC<FilterSectionProps> = ({ children, className }) => (
  <div className={cn("flex flex-wrap items-center gap-3", className)}>
    {children}
  </div>
);

interface FilterGroupProps {
  label?: string;
  children: React.ReactNode;
  className?: string;
}

export const FilterGroup: React.FC<FilterGroupProps> = ({ label, children, className }) => (
  <div className={cn("inline-flex items-center gap-2", className)}>
    {label && (
      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 select-none">
        {label}
      </span>
    )}
    <div className="flex items-center gap-1.5 p-1 bg-white border border-zinc-200 rounded-xl shadow-sm">
      {children}
    </div>
  </div>
);

interface FilterItemProps {
  label: string;
  count?: number;
  active?: boolean;
  onClick?: () => void;
  icon?: React.ReactNode;
  variant?: 'pill' | 'button' | 'ghost';
  className?: string;
}

export const FilterItem: React.FC<FilterItemProps> = ({
  label,
  count,
  active,
  onClick,
  icon,
  variant = 'button',
  className,
}) => {
  const base = "inline-flex items-center gap-1.5 px-3 py-1.5 transition-all text-[11px] font-black uppercase tracking-widest select-none";
  
  const variants = {
    pill: cn(
      "rounded-full border",
      active ? "bg-zinc-900 border-zinc-900 text-white shadow-md shadow-zinc-200" : "bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300 hover:bg-zinc-50"
    ),
    button: cn(
      "rounded-lg",
      active ? "bg-amber-100 text-amber-700" : "text-zinc-500 hover:bg-zinc-50"
    ),
    ghost: cn(
      "rounded-lg",
      active ? "text-amber-600" : "text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50"
    ),
  };

  return (
    <button
      onClick={onClick}
      className={cn(base, variants[variant], className)}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{label}</span>
      {count !== undefined && (
        <span className={cn(
          "ml-0.5 px-1.5 rounded-md text-[9px] font-black",
          active ? "bg-zinc-800 text-white" : "bg-zinc-100 text-zinc-500"
        )}>
          {count}
        </span>
      )}
    </button>
  );
};

interface FilterSelectProps {
  label: string;
  value?: string;
  onClick?: () => void;
  icon?: React.ReactNode;
  className?: string;
}

export const FilterSelect: React.FC<FilterSelectProps> = ({
  label,
  value,
  onClick,
  icon,
  className,
}) => (
  <button
    onClick={onClick}
    className={cn(
      "inline-flex items-center gap-2 px-3 py-2 bg-white border border-zinc-200 rounded-xl transition-all shadow-sm",
      "hover:border-zinc-300 hover:bg-zinc-50",
      className
    )}
  >
    {icon && <span className="text-zinc-400">{icon}</span>}
    <div className="flex flex-col items-start leading-none gap-0.5">
      <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">{label}</span>
      <span className="text-[11px] font-black text-zinc-800">{value || 'Todos'}</span>
    </div>
    <ChevronDown size={14} className="ml-1 text-zinc-300" />
  </button>
);

interface FilterSearchProps {
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
}

export const FilterSearch: React.FC<FilterSearchProps> = ({
  placeholder = "Pesquisar...",
  value,
  onChange,
  className,
}) => (
  <div className={cn("relative group min-w-[200px]", className)}>
    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-amber-500 transition-colors pointer-events-none">
      <Search size={14} />
    </div>
    <input
      type="text"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={cn(
        "w-full h-10 pl-9 pr-4 bg-white border border-zinc-200 rounded-xl text-xs font-bold text-zinc-800 transition-all shadow-sm",
        "placeholder:text-zinc-400 placeholder:font-normal hover:border-zinc-300",
        "focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
      )}
    />
  </div>
);

interface SegmentedControlProps {
  options: { label: string; value: string; icon?: React.ReactNode }[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export const SegmentedControl: React.FC<SegmentedControlProps> = ({
  options,
  value,
  onChange,
  className,
}) => (
  <div className={cn("inline-flex p-1 bg-zinc-100/80 rounded-xl border border-zinc-200 shadow-inner", className)}>
    {options.map((opt) => (
      <button
        key={opt.value}
        onClick={() => onChange(opt.value)}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
          value === opt.value
            ? "bg-white text-zinc-900 shadow-sm"
            : "text-zinc-400 hover:text-zinc-600 hover:bg-white/50"
        )}
      >
        {opt.icon}
        {opt.label}
      </button>
    ))}
  </div>
);

interface FilterDateRangeProps {
  label: string;
  start?: string;
  end?: string;
  onClick?: () => void;
  className?: string;
}

export const FilterDateRange: React.FC<FilterDateRangeProps> = ({
  label,
  start,
  end,
  onClick,
  className,
}) => (
  <button
    onClick={onClick}
    className={cn(
      "inline-flex items-center gap-3 px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl transition-all shadow-sm",
      "hover:border-zinc-300 hover:bg-zinc-100",
      className
    )}
  >
    <div className="flex items-center gap-2">
      <CalendarDays size={14} className="text-zinc-400" />
      <div className="flex flex-col items-start leading-none gap-1">
        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">{label}</span>
        <div className="flex items-center gap-1.5 text-[10px] font-black text-zinc-800">
          <span>{start || '-'}</span>
          <span className="text-zinc-300 text-[8px]">●</span>
          <span>{end || '-'}</span>
        </div>
      </div>
    </div>
    <ChevronDown size={12} className="ml-1 text-zinc-300" />
  </button>
);
