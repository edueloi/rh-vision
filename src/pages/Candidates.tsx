import React, { useState, useEffect, useCallback } from "react";
import { 
  Users, 
  Search, 
  Filter, 
  Mail, 
  Phone, 
  ExternalLink, 
  Download, 
  Plus, 
  RefreshCcw, 
  MapPin, 
  Briefcase, 
  Sparkles,
  ChevronRight,
  MoreVertical
} from "lucide-react";
import { PanelCard, Pagination, useToast, Badge } from "@/src/components/ui";
import { Candidate } from "@/src/types";
import { useUnit } from "@/src/lib/useUnit";
import CandidateDetails from "./CandidateDetails";
import CandidateForm from "./CandidateForm";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/src/lib/utils";

export default function Candidates() {
  const { currentUnit } = useUnit();
  const toast = useToast();
  const [view, setView] = useState<'list' | 'create' | 'edit'>('list');
  const [selectedCandidateId, setSelectedCandidateId] = useState<number | null>(null);
  const [candidateDetails, setCandidateDetails] = useState<Candidate | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    source: ""
  });

  const fetchCandidates = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        tenantId: 'fadel',
        unitId: currentUnit.id,
        search: filters.search,
        status: filters.status,
        source: filters.source
      });
      const res = await fetch(`/api/candidates?${params}`);
      const data = await res.json();
      setCandidates(data);
    } catch (err) {
      toast.error("Erro ao carregar candidatos.");
    } finally {
      setLoading(false);
    }
  }, [currentUnit, filters, toast]);

  const fetchDetails = useCallback(async (id: number) => {
    try {
      const res = await fetch(`/api/candidates/${id}`);
      const data = await res.json();
      setCandidateDetails(data);
    } catch (err) {
      toast.error("Erro ao carregar detalhes.");
    }
  }, [toast]);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  useEffect(() => {
    if (selectedCandidateId) {
      fetchDetails(selectedCandidateId);
    } else {
      setCandidateDetails(null);
    }
  }, [selectedCandidateId, fetchDetails]);

  if (view === 'create' || view === 'edit') {
    return (
      <CandidateForm 
        candidate={view === 'edit' ? candidateDetails : null}
        onBack={() => setView('list')}
        onSuccess={() => { setView('list'); fetchCandidates(); }}
      />
    );
  }

  return (
    <div className="h-[calc(100vh-140px)] flex gap-6 overflow-hidden">
      {/* Coluna Esquerda: Listagem */}
      <div className={cn(
        "flex flex-col gap-6 transition-all duration-500",
        selectedCandidateId ? "w-1/2" : "w-full"
      )}>
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-black text-zinc-900 tracking-tight">Banco de Talentos</h2>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-1">
              {candidates.length} Currículos Encontrados
            </p>
          </div>
          <div className="flex gap-2">
             <button 
              onClick={fetchCandidates}
              className="p-2.5 bg-white border border-zinc-200 text-zinc-500 rounded-2xl hover:bg-zinc-50 transition-all active:rotate-180 shadow-sm"
            >
              <RefreshCcw size={16} />
            </button>
            <button 
              onClick={() => setView('create')}
              className="flex items-center gap-2 px-6 py-2.5 bg-fadel-navy hover:bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-fadel-navy/10"
            >
              <Plus size={16} /> Novo Talento
            </button>
          </div>
        </div>

        <PanelCard 
          padding={false}
          className="flex-1 overflow-hidden flex flex-col"
          headerClassName="border-b-0 hidden"
          title="Lista de Candidatos"
          icon={Users}
        >
          {/* List Toolbar */}
          <div className="p-4 border-b border-zinc-50 flex flex-wrap items-center gap-3 bg-zinc-50/30">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input 
                type="text" 
                placeholder="Nome, cargo ou skill..." 
                value={filters.search}
                onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
                className="w-full pl-9 pr-4 py-2 bg-white border border-zinc-100 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-zinc-900/10"
              />
            </div>
            <select 
              className="px-3 py-2 bg-white border border-zinc-100 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none"
              value={filters.status}
              onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))}
            >
              <option value="">Todos Status</option>
              {['Novo', 'Em análise', 'Compatível', 'Entrevista', 'Aprovado', 'Reprovado', 'Banco de talentos', 'Contratado'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-20">
              <div className="w-10 h-10 border-4 border-zinc-900 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Buscando na base...</p>
            </div>
          ) : candidates.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center p-20">
              <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center text-zinc-300">
                <Users size={32} />
              </div>
              <div>
                <p className="text-sm font-black text-zinc-900">Nenhum talento aqui</p>
                <p className="text-xs text-zinc-400 font-bold mt-1">Experimente mudar os filtros ou adicione um novo candidato.</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto no-scrollbar">
               <div className="divide-y divide-zinc-50">
                  {candidates.map((c) => (
                    <button 
                      key={c.id} 
                      onClick={() => setSelectedCandidateId(c.id)}
                      className={cn(
                        "w-full text-left p-5 flex items-center justify-between group hover:bg-zinc-50/50 transition-all border-l-4",
                        selectedCandidateId === c.id ? "border-zinc-900 bg-zinc-50/50" : "border-transparent"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white border border-zinc-100 rounded-2xl flex items-center justify-center font-black text-zinc-400 text-sm shadow-sm group-hover:scale-105 transition-transform">
                          {c.full_name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-black text-zinc-900 group-hover:text-zinc-600 transition-colors truncate">{c.full_name}</span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider truncate max-w-[120px]">{c.desired_position || "Não informado"}</span>
                            <span className="w-1 h-1 bg-zinc-200 rounded-full"></span>
                            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">{c.city || "N/A"}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-2">
                             <Badge color={
                               c.status === 'Novo' ? 'primary' :
                               c.status === 'Compatível' ? 'success' :
                               c.status === 'Entrevista' ? 'warning' :
                               c.status === 'Reprovado' ? 'danger' : 'info'
                             } size="sm">
                               {c.status}
                             </Badge>
                             <span className="text-[9px] font-black text-zinc-300 uppercase tracking-widest">{c.source}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <ChevronRight size={16} className={cn("text-zinc-200 group-hover:text-zinc-400 transition-colors", selectedCandidateId === c.id && "rotate-90 text-zinc-900")} />
                        {c.experience_years && (
                          <div className="px-2 py-1 bg-zinc-50 rounded-lg text-[9px] font-black text-zinc-400 uppercase tracking-widest">
                            {c.experience_years}a exp
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
               </div>
            </div>
          )}

          <div className="p-4 border-t border-zinc-50 bg-white">
            <Pagination total={candidates.length} page={1} pageSize={20} onPageChange={() => {}} onPageSizeChange={() => {}} className="border-t-0 p-0" />
          </div>
        </PanelCard>
      </div>

      {/* Coluna Direita: Detalhes Painel */}
      <div className={cn(
        "bg-white rounded-[40px] border border-zinc-100 overflow-hidden transition-all duration-500 shadow-2xl shadow-zinc-100/50",
        selectedCandidateId ? "w-1/2 opacity-100 translate-x-0" : "w-0 opacity-0 translate-x-12 invisible"
      )}>
        {candidateDetails ? (
          <CandidateDetails 
            candidate={candidateDetails} 
            onClose={() => setSelectedCandidateId(null)}
            onEdit={() => setView('edit')}
            onRefresh={fetchCandidates}
          />
        ) : (
          <div className="h-full flex items-center justify-center p-20 text-center">
             <div className="space-y-4">
                <div className="w-12 h-12 border-4 border-zinc-900 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Carregando Perfil...</p>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}

