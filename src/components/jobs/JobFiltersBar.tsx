import { LayoutGrid, Layers, List, Plus, RefreshCcw, Search } from "lucide-react";
import { Button, Combobox, ComboboxOption, ContentCard, Input } from "@/src/components/ui";
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
  className?: string;
}

const statusOptions: ComboboxOption[] = [
  { value: "", label: "Todos os status", group: "Status" },
  { value: "Aberta", label: "Aberta", group: "Status" },
  { value: "Rascunho", label: "Rascunho", group: "Status" },
  { value: "Pausada", label: "Pausada", group: "Status" },
  { value: "Encerrada", label: "Encerrada", group: "Status" },
];

const workModelOptions: ComboboxOption[] = [
  { value: "", label: "Todos os modelos", group: "Modelo de trabalho" },
  { value: "Presencial", label: "Presencial", group: "Modelo de trabalho" },
  { value: "Híbrido", label: "Híbrido", group: "Modelo de trabalho" },
  { value: "Home Office", label: "Home Office", group: "Modelo de trabalho" },
];

export function JobFiltersBar({
  filters,
  onChange,
  viewMode,
  onViewModeChange,
  onRefresh,
  onImport,
  onCreate,
  className,
}: JobFiltersBarProps) {
  return (
    <ContentCard className={cn("space-y-5 sm:space-y-6", className)}>
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="min-w-0">
            <p className="text-sm font-black tracking-tight text-zinc-900 sm:text-[15px]">Filtros da listagem</p>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">
              Refine a busca por status, modelo e texto livre
            </p>
          </div>

          <div className="hidden h-8 w-px bg-zinc-100 lg:block" />

          <div className="grid grid-cols-2 items-center gap-1 rounded-2xl border border-zinc-200 bg-zinc-50 p-1 sm:inline-grid">
            <button
              onClick={() => onViewModeChange("grid")}
              className={cn(
                "flex h-9 min-w-[4.25rem] items-center justify-center gap-1 rounded-xl px-3 transition-all",
                viewMode === "grid"
                  ? "bg-white text-develoi-navy shadow-sm ring-1 ring-zinc-200"
                  : "text-zinc-400 hover:text-zinc-600"
              )}
              title="Visualização em Grade"
            >
              <LayoutGrid size={14} />
              <span className="text-[10px] font-black uppercase tracking-[0.14em]">Grade</span>
            </button>
            <button
              onClick={() => onViewModeChange("list")}
              className={cn(
                "flex h-9 min-w-[4.25rem] items-center justify-center gap-1 rounded-xl px-3 transition-all",
                viewMode === "list"
                  ? "bg-white text-develoi-navy shadow-sm ring-1 ring-zinc-200"
                  : "text-zinc-400 hover:text-zinc-600"
              )}
              title="Visualização em Lista"
            >
              <List size={14} />
              <span className="text-[10px] font-black uppercase tracking-[0.14em]">Lista</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            iconLeft={<RefreshCcw size={14} />}
            onClick={onRefresh}
          >
            Atualizar
          </Button>
          <Button
            variant="outline"
            size="sm"
            iconLeft={<Layers size={14} />}
            onClick={onImport}
          >
            Importar vaga
          </Button>
          <Button
            variant="secondary"
            size="sm"
            iconLeft={<Plus size={14} />}
            onClick={onCreate}
          >
            Nova vaga
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <Input
          label="Pesquisar"
          icon={<Search size={15} />}
          placeholder="Título, cidade ou departamento"
          value={filters.search}
          onChange={(event) => onChange({ ...filters, search: event.target.value })}
          containerClassName="md:col-span-2 xl:col-span-1"
        />

        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
            Status
          </label>
          <Combobox
            options={statusOptions}
            value={filters.status}
            onChange={(value) => onChange({ ...filters, status: Array.isArray(value) ? value[0] || "" : value })}
            placeholder="Todos os status"
            searchPlaceholder="Buscar status"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
            Modelo de trabalho
          </label>
          <Combobox
            options={workModelOptions}
            value={filters.workModel}
            onChange={(value) => onChange({ ...filters, workModel: Array.isArray(value) ? value[0] || "" : value })}
            placeholder="Todos os modelos"
            searchPlaceholder="Buscar modelo"
          />
        </div>
      </div>
    </ContentCard>
  );
}
