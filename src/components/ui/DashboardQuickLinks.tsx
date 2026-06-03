import { Globe, Plus, X, Zap } from "lucide-react";
import type { ElementType } from "react";
import { Button, IconButton } from "./Button";
import { PanelCard } from "./PanelCard";

interface QuickLink {
  id: string;
  name: string;
  url: string;
  icon: string;
  color: string;
}

interface DashboardQuickLinksProps {
  links: QuickLink[];
  iconMap: Record<string, ElementType>;
  onAdd: () => void;
  onRemove: (id: string) => void;
}

export function DashboardQuickLinks({
  links,
  iconMap,
  onAdd,
  onRemove,
}: DashboardQuickLinksProps) {
  return (
    <PanelCard
      title="Acesso Rápido"
      icon={Zap}
      action={
        <IconButton
          type="button"
          variant="outline"
          size="sm"
          onClick={onAdd}
          className="rounded-xl border-zinc-200 text-zinc-400 hover:border-develoi-navy hover:bg-white hover:text-develoi-navy"
          aria-label="Adicionar atalho"
          title="Adicionar atalho"
        >
          <Plus size={14} />
        </IconButton>
      }
    >
      {links.length === 0 ? (
        <Button
          type="button"
          onClick={onAdd}
          variant="ghost"
          fullWidth
          className="flex h-auto min-w-0 flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-zinc-100 py-8 text-zinc-300 transition-all hover:border-develoi-navy/30 hover:bg-transparent hover:text-develoi-navy/50"
        >
          <Plus size={20} />
          <span className="text-[10px] font-black uppercase tracking-widest">Adicionar atalho</span>
        </Button>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {links.map((link) => {
            const Icon = iconMap[link.icon] || Globe;

            return (
              <div key={link.id} className="group relative">
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-2 rounded-2xl p-3 transition-all hover:bg-zinc-50"
                >
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-full shadow-md transition-transform group-hover:scale-110"
                    style={{ backgroundColor: link.color }}
                  >
                    <Icon size={22} className="text-white" />
                  </div>
                  <span className="w-full truncate text-center text-[9px] font-black uppercase tracking-wide text-zinc-600">
                    {link.name}
                  </span>
                </a>

                <IconButton
                  type="button"
                  onClick={() => onRemove(link.id)}
                  variant="ghost"
                  size="xs"
                  className="absolute -right-1.5 -top-1.5 h-5 w-5 rounded-full border border-zinc-200 bg-white text-zinc-400 opacity-0 shadow-sm transition-all hover:border-rose-300 hover:bg-white hover:text-rose-500 group-hover:opacity-100"
                  aria-label={`Remover atalho ${link.name}`}
                  title={`Remover atalho ${link.name}`}
                >
                  <X size={10} />
                </IconButton>
              </div>
            );
          })}

          <Button
            type="button"
            onClick={onAdd}
            variant="ghost"
            className="group flex h-auto min-w-0 flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-zinc-100 p-3 transition-all hover:border-develoi-navy/30 hover:bg-transparent"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-50 transition-all group-hover:bg-zinc-100">
              <Plus size={18} className="text-zinc-300 transition-colors group-hover:text-zinc-500" />
            </div>
            <span className="text-[9px] font-black uppercase tracking-wide text-zinc-300">Novo</span>
          </Button>
        </div>
      )}
    </PanelCard>
  );
}
