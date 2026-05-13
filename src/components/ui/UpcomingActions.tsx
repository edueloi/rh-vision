import React from "react";
import { Zap } from "lucide-react";

export function UpcomingActions() {
  const actions = [
    "Revisar candidatos Caminhoneiro",
    "Confirmar 10 duplicidades em 'Lote Abril'",
    "Enviar DISC para 15 candidatos novos",
    "Atualizar requisitos da vaga CTO"
  ];

  return (
    <div className="p-6 bg-white dark:bg-[#0d1b3e]/40 dark:backdrop-blur-sm border border-zinc-200 dark:border-white/10 rounded-[32px]">
      <div className="flex items-center gap-2 mb-4">
        <Zap size={14} className="text-amber-500 dark:text-develoi-gold" />
        <h4 className="text-[10px] font-bold text-zinc-900 dark:text-white uppercase tracking-widest">Próximas Ações</h4>
      </div>
      <ul className="space-y-3">
        {actions.map((todo, i) => (
          <li key={i} className="flex items-start gap-2 group cursor-pointer">
            <div className="w-4 h-4 rounded border border-zinc-200 dark:border-white/20 mt-0.5 flex items-center justify-center group-hover:border-zinc-900 dark:group-hover:border-develoi-gold transition-all shrink-0">
              <Check size={10} className="text-zinc-900 dark:text-develoi-gold opacity-0 group-hover:opacity-100" />
            </div>
            <span className="text-[11px] font-medium text-zinc-600 dark:text-white/60 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">
              {todo}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Check({ className, size = 16 }: { className?: string, size?: number }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="4" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
