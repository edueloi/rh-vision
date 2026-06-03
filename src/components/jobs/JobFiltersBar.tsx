import { LayoutGrid, List, RefreshCcw, Search, SlidersHorizontal, X } from "lucide-react";
import { Combobox, ComboboxOption } from "@/src/components/ui";
import { cn } from "@/src/lib/utils";

interface JobFiltersValue {
  search: string;
  status: string;
  workModel: string;
}

interface JobFiltersBarProps {
  filters: JobFiltersValue;
  onChange: (next: JobFiltersValue) => void;
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
  onRefresh: () => void;
  onImport: () => void;
  onCreate: () => void;
  canCreate?: boolean;
  className?: string;
}

const statusOptions: ComboboxOption[] = [
  { value: "",            label: "Todos os status",   group: "Status" },
  { value: "Aberta",      label: "Aberta",             group: "Status" },
  { value: "Rascunho",    label: "Rascunho",           group: "Status" },
  { value: "Em Aprovação",label: "Em Aprovação",       group: "Aprovação" },
  { value: "Pausada",     label: "Pausada",            group: "Status" },
  { value: "Encerrada",   label: "Encerrada",          group: "Status" },
];

const workModelOptions: ComboboxOption[] = [
  { value: "",             label: "Todos os modelos",  group: "Modelo" },
  { value: "Presencial",   label: "Presencial",        group: "Modelo" },
  { value: "Híbrido",      label: "Híbrido",           group: "Modelo" },
  { value: "Home Office",  label: "Home Office",       group: "Modelo" },
];

const STATUS_DOT: Record<string, string> = {
  Aberta:         "bg-emerald-500",
  Rascunho:       "bg-zinc-400",
  "Em Aprovação": "bg-amber-400",
  Pausada:        "bg-orange-400",
  Encerrada:      "bg-rose-500",
};

export function JobFiltersBar({
  filters, onChange, viewMode, onViewModeChange,
  onRefresh, canCreate = true, className,
}: JobFiltersBarProps) {
  const hasActiveFilters = !!(filters.search || filters.status || filters.workModel);
  const clearAll = () => onChange({ search: "", status: "", workModel: "" });

  return (
    <div className={cn(
      "flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-3 py-2.5 shadow-sm sm:gap-3 sm:px-4",
      className
    )}>
      {/* Search */}
      <div className="relative flex min-w-[160px] flex-1 items-center">
        <Search size={13} className="pointer-events-none absolute left-3 text-zinc-400" />
        <input
          type="text"
          placeholder="Pesquisar vaga, cidade…"
          value={filters.search}
          onChange={e => onChange({ ...filters, search: e.target.value })}
          className="h-8 w-full rounded-lg border border-zinc-200 bg-zinc-50 py-0 pl-8 pr-3 text-[12px] font-medium text-zinc-800 outline-none transition-all placeholder:text-zinc-400 focus:border-develoi-gold/50 focus:bg-white focus:ring-2 focus:ring-develoi-gold/15"
        />
        {filters.search && (
          <button
            onClick={() => onChange({ ...filters, search: "" })}
            className="absolute right-2 text-zinc-300 hover:text-zinc-500"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* Status combobox */}
      <div className="w-full sm:w-40">
        <Combobox
          options={statusOptions}
          value={filters.status}
          onChange={v => onChange({ ...filters, status: Array.isArray(v) ? v[0] || "" : v })}
          placeholder="Status"
          searchPlaceholder="Buscar status"
        />
      </div>

      {/* Work model combobox */}
      <div className="w-full sm:w-40">
        <Combobox
          options={workModelOptions}
          value={filters.workModel}
          onChange={v => onChange({ ...filters, workModel: Array.isArray(v) ? v[0] || "" : v })}
          placeholder="Modelo"
          searchPlaceholder="Buscar modelo"
        />
      </div>

      {/* Active filter pills */}
      {filters.status && (
        <span className="flex items-center gap-1.5 rounded-full bg-zinc-100 px-2.5 py-1 text-[10px] font-semibold text-zinc-700">
          <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT[filters.status] ?? "bg-zinc-400")} />
          {filters.status}
          <button onClick={() => onChange({ ...filters, status: "" })} className="text-zinc-400 hover:text-zinc-700">
            <X size={10} />
          </button>
        </span>
      )}
      {filters.workModel && (
        <span className="flex items-center gap-1.5 rounded-full bg-zinc-100 px-2.5 py-1 text-[10px] font-semibold text-zinc-700">
          {filters.workModel}
          <button onClick={() => onChange({ ...filters, workModel: "" })} className="text-zinc-400 hover:text-zinc-700">
            <X size={10} />
          </button>
        </span>
      )}
      {hasActiveFilters && (
        <button
          onClick={clearAll}
          className="text-[10px] font-semibold text-zinc-400 transition-colors hover:text-rose-500"
        >
          Limpar tudo
        </button>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* View mode toggle */}
      <div className="flex h-8 items-center gap-0.5 rounded-lg border border-zinc-200 bg-zinc-50 p-0.5">
        <button
          onClick={() => onViewModeChange("list")}
          title="Lista"
          className={cn(
            "flex h-6 w-7 items-center justify-center rounded-md transition-colors",
            viewMode === "list" ? "bg-white text-develoi-navy shadow-sm" : "text-zinc-400 hover:text-zinc-600"
          )}
        >
          <List size={13} />
        </button>
        <button
          onClick={() => onViewModeChange("grid")}
          title="Grade"
          className={cn(
            "flex h-6 w-7 items-center justify-center rounded-md transition-colors",
            viewMode === "grid" ? "bg-white text-develoi-navy shadow-sm" : "text-zinc-400 hover:text-zinc-600"
          )}
        >
          <LayoutGrid size={13} />
        </button>
      </div>

      {/* Refresh */}
      <button
        onClick={onRefresh}
        title="Atualizar"
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-400 transition-colors hover:border-zinc-300 hover:bg-white hover:text-zinc-700"
      >
        <RefreshCcw size={13} />
      </button>
    </div>
  );
}
