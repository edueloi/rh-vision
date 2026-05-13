import React from "react";
import { Layers, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { PanelCard } from "@/src/components/ui";

interface ImportBatch {
  id: string;
  name: string;
  created_at: string;
  processed_files: number;
  total_files: number;
}

interface RecentImportsProps {
  imports: ImportBatch[];
}

export function RecentImports({ imports }: RecentImportsProps) {
  return (
    <PanelCard title="Importações Recentes" icon={Layers}>
      <div className="space-y-4">
        {imports.map((imp) => (
          <div 
            key={imp.id} 
            className="flex items-center justify-between group cursor-pointer" 
            onClick={() => window.location.href='/importar'}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-zinc-50 dark:bg-white/5 rounded-xl text-zinc-400 group-hover:bg-zinc-900 group-hover:text-white dark:group-hover:bg-develoi-gold dark:group-hover:text-develoi-navy transition-all">
                <FileText size={16} />
              </div>
              <div>
                <h5 className="text-[11px] font-bold text-zinc-800 dark:text-white/90 truncate max-w-[120px]">{imp.name}</h5>
                <p className="text-[8px] font-medium text-zinc-400 dark:text-white/30 uppercase tracking-widest">
                  {new Date(imp.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-zinc-900 dark:text-white">{imp.processed_files}/{imp.total_files}</p>
              <div className="w-16 h-1 bg-zinc-100 dark:bg-white/10 rounded-full mt-1 overflow-hidden">
                <div 
                  className="h-full bg-blue-500 dark:bg-develoi-gold transition-all" 
                  style={{ width: `${(imp.processed_files / imp.total_files) * 100}%` }} 
                />
              </div>
            </div>
          </div>
        ))}
        <Link 
          to="/importar" 
          className="block text-center text-[9px] font-bold text-blue-600 dark:text-develoi-gold uppercase tracking-widest hover:underline pt-2"
        >
          Gerenciar Importações
        </Link>
      </div>
    </PanelCard>
  );
}
