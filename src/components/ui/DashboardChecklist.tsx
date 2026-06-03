import { CheckCircle2, Circle, ClipboardList, Plus, Trash2 } from "lucide-react";
import type { RefObject } from "react";
import { cn } from "@/src/lib/utils";
import { Button, IconButton } from "./Button";
import { Input } from "./Input";
import { PanelCard } from "./PanelCard";

interface CheckItem {
  id: string;
  text: string;
  done: boolean;
}

interface DashboardChecklistProps {
  items: CheckItem[];
  inputValue: string;
  inputRef: RefObject<HTMLInputElement | null>;
  onInputChange: (value: string) => void;
  onAdd: () => void;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onClearDone: () => void;
}

export function DashboardChecklist({
  items,
  inputValue,
  inputRef,
  onInputChange,
  onAdd,
  onToggle,
  onRemove,
  onClearDone,
}: DashboardChecklistProps) {
  const doneCount = items.filter((item) => item.done).length;
  const progress = items.length > 0 ? (doneCount / items.length) * 100 : 0;

  return (
    <PanelCard
      title="Checklist"
      icon={ClipboardList}
      action={
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black tabular-nums text-zinc-400">
            {doneCount}/{items.length}
          </span>
          {items.some((item) => item.done) && (
            <Button
              type="button"
              onClick={onClearDone}
              variant="ghost"
              size="xs"
              className="min-w-0 rounded-lg border-0 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-zinc-300 hover:bg-rose-50 hover:text-rose-400"
            >
              Limpar feitos
            </Button>
          )}
        </div>
      }
    >
      {items.length > 0 && (
        <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
          <div className="h-full rounded-full bg-develoi-navy transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      )}

      <div className="mb-3 max-h-64 space-y-0.5 overflow-y-auto">
        {items.length === 0 ? (
          <p className="py-6 text-center text-[10px] font-bold uppercase tracking-widest text-zinc-300">
            Nenhuma tarefa ainda
          </p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="group flex items-center gap-2.5 rounded-xl px-2 py-2 transition-all hover:bg-zinc-50">
              <IconButton
                type="button"
                onClick={() => onToggle(item.id)}
                variant="ghost"
                size="xs"
                className="h-5 w-5 rounded-full border-0 p-0 transition-transform active:scale-90"
                aria-label={item.done ? `Desmarcar ${item.text}` : `Concluir ${item.text}`}
                title={item.done ? `Desmarcar ${item.text}` : `Concluir ${item.text}`}
              >
                {item.done ? (
                  <CheckCircle2 size={16} className="text-emerald-500" />
                ) : (
                  <Circle size={16} className="text-zinc-300 transition-colors group-hover:text-develoi-navy" />
                )}
              </IconButton>

              <span
                className={cn(
                  "flex-1 text-[11px] font-semibold leading-snug transition-colors",
                  item.done ? "text-zinc-300 line-through" : "text-zinc-700"
                )}
              >
                {item.text}
              </span>

              <IconButton
                type="button"
                onClick={() => onRemove(item.id)}
                variant="ghost"
                size="xs"
                className="h-6 w-6 shrink-0 rounded-lg border-0 p-0 text-zinc-300 opacity-0 transition-all hover:bg-rose-50 hover:text-rose-400 group-hover:opacity-100"
                aria-label={`Remover tarefa ${item.text}`}
                title={`Remover tarefa ${item.text}`}
              >
                <Trash2 size={12} />
              </IconButton>
            </div>
          ))
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-zinc-50 pt-3">
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={(event) => onInputChange(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && onAdd()}
          placeholder="Nova tarefa..."
          className="h-9 flex-1 rounded-xl border-zinc-100 bg-zinc-50 px-3 py-2 text-[11px] font-semibold text-zinc-700 placeholder:text-zinc-300 focus:border-develoi-navy"
        />
        <IconButton
          type="button"
          onClick={onAdd}
          disabled={!inputValue.trim()}
          variant="primary"
          size="sm"
          className="h-8 w-8 shrink-0 rounded-xl border-0 bg-develoi-navy text-white hover:bg-[#0a1e3a] hover:text-white"
          aria-label="Adicionar tarefa"
          title="Adicionar tarefa"
        >
          <Plus size={14} />
        </IconButton>
      </div>
    </PanelCard>
  );
}
