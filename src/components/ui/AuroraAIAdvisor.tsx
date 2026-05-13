import React from "react";
import { Sparkles, MessageSquare } from "lucide-react";
import { Link } from "react-router-dom";

export function AuroraAIAdvisor() {
  return (
    <div className="bg-develoi-navy dark:bg-[#0d1b3e] rounded-[32px] p-6 lg:p-8 text-white relative overflow-hidden shadow-2xl transition-all">
      <div className="absolute top-0 right-0 w-48 h-48 bg-develoi-blue/10 dark:bg-develoi-gold/5 rounded-full blur-3xl opacity-50 -mr-20 -mt-20" />
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center text-develoi-gold">
            <Sparkles size={20} />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-develoi-gold">Aurora AI Advisor</h3>
            <p className="text-[9px] font-bold text-white/40">ANÁLISE EM TEMPO REAL</p>
          </div>
        </div>
        
        <div className="space-y-6 mb-8">
          <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
            <p className="text-xs font-bold leading-relaxed italic opacity-90 text-white">
              "Sua taxa de conversão de <span className="text-develoi-gold">Pendente</span> para <span className="text-develoi-gold">Entrevista</span> aumentou 15% após a última triagem automática."
            </p>
          </div>
          <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
            <p className="text-xs font-bold leading-relaxed italic opacity-90 text-white">
              "A vaga <span className="text-develoi-gold">Analista Financeiro</span> está com excesso de candidatos abaixo de 60% de compatibilidade."
            </p>
          </div>
        </div>

        <Link 
          to="/auroraai" 
          className="w-full py-4 bg-white text-zinc-900 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-100 transition-all flex items-center justify-center gap-2 shadow-lg"
        >
          <MessageSquare size={16} /> Abrir Consultoria Completa
        </Link>
      </div>
    </div>
  );
}
