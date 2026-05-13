import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  MoreVertical,
  Edit,
  Trash2,
  UserPlus,
  Target,
  CheckCircle2,
  Clock,
  Upload,
  Layers,
  Database
} from "lucide-react";
import { 
  PanelCard, 
  Pagination, 
  useToast, 
  Badge,
  PageWrapper,
  SectionTitle,
  ContentCard,
  Button,
  IconButton,
  Drawer,
  StatGrid,
  StatCard,
  Input,
  Select
} from "@/src/components/ui";
import { getTenantId } from "@/src/lib/auth";
import { Candidate } from "@/src/types";
import { useUnit } from "@/src/lib/useUnit";
import CandidateDetails from "./CandidateDetails";
import CandidateForm from "./CandidateForm";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/src/lib/utils";
import { useMatch, useNavigate } from "react-router-dom";


export default function Candidates() {
  const { currentUnit } = useUnit();
  const tenantId = getTenantId();
  const queryUnitId = currentUnit.is_master ? "master" : currentUnit.id;
  const toast = useToast();
  const navigate = useNavigate();
  const createMatch = useMatch("/candidatos/novo");
  const editMatch = useMatch("/candidatos/:candidateId/editar");
  const detailsMatch = useMatch("/candidatos/:candidateId");
  const isCreateRoute = Boolean(createMatch);
  const isEditRoute = Boolean(editMatch);
  const routeCandidateId = Number(editMatch?.params.candidateId ?? detailsMatch?.params.candidateId ?? 0) || null;
  const selectedCandidateId = routeCandidateId;
  const [candidateDetails, setCandidateDetails] = useState<Candidate | null>(null);
  const [candidateLoading, setCandidateLoading] = useState(false);
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
        tenantId,
        unitId: queryUnitId,
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
  }, [filters, queryUnitId, tenantId, toast]);



  const fetchDetails = useCallback(async (id: number) => {
    setCandidateLoading(true);
    try {
      const res = await fetch(`/api/candidates/${id}`);
      if (!res.ok) {
        throw new Error("Candidate not found");
      }
      const data = await res.json();
      setCandidateDetails(data);
    } catch (err) {
      toast.error("Erro ao carregar detalhes.");
      navigate("/candidatos", { replace: true });
    } finally {
      setCandidateLoading(false);
    }
  }, [navigate, toast]);

  const deleteCandidate = async (id: number) => {
    if (!confirm("Deseja realmente remover este talento?")) return;
    try {
      await fetch(`/api/candidates/${id}`, { method: 'DELETE' });
      toast.success("Candidato removido.");
      navigate("/candidatos");
      fetchCandidates();
    } catch (err) {
      toast.error("Erro ao remover candidato.");
    }
  };

  const handleRefresh = useCallback(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  const stats = useMemo(() => {
    return {
      total: candidates.length,
      new: candidates.filter(c => c.status === 'Novo').length,
      interview: candidates.filter(c => c.status === 'Entrevista').length,
      approved: candidates.filter(c => c.status === 'Aprovado' || c.status === 'Contratado').length,
    };
  }, [candidates]);



  const getCandidateSourceLabel = useCallback((source?: string | null) => {
    if (!source) {
      return "Origem não informada";
    }

    if (source === "Importação em Massa" || source === "Importação em Lote") {
      return "Importação em Lote";
    }

    return source;
  }, []);

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

  if (isCreateRoute || isEditRoute) {
    if (isEditRoute && (candidateLoading || !candidateDetails || Number(candidateDetails.id) !== routeCandidateId)) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-develoi-navy border-t-transparent" />
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
            Carregando candidato...
          </p>
        </div>
      );
    }

    return (
      <CandidateForm 
        candidate={isEditRoute ? candidateDetails : null}
        onBack={() => navigate(isEditRoute && routeCandidateId ? `/candidatos/${routeCandidateId}` : "/candidatos")}
        onSuccess={() => {
          navigate("/candidatos");
          fetchCandidates();
        }}
      />
    );
  }

  return (
    <PageWrapper className="min-h-screen bg-zinc-50/60">
      <div className="px-8 py-8 w-full max-w-full mx-auto">
        <SectionTitle
          title="Gestão de Talentos"
          subtitle={`${candidates.length} currículos cadastrados na unidade`}
          icon={<Users size={24} />}
          className="mb-0"
          actions={
            <div className="flex items-center gap-3">
              <IconButton 
                onClick={handleRefresh}
                variant="outline"
                className="bg-white"
                aria-label="Atualizar lista"
              >
                <RefreshCcw size={16} />
              </IconButton>
              <Button
                variant="outline"
                onClick={() => navigate("/importar-cvs")}
                iconLeft={<Upload size={16} />}
              >
                Importação em Lote
              </Button>
              <Button 
                onClick={() => navigate("/candidatos/novo")}
                iconLeft={<Plus size={16} />}
              >
                Novo Talento
              </Button>
            </div>
          }
        />

        <StatGrid cols={4} className="my-8">
          <StatCard 
            title="Total de Talentos" 
            value={stats.total} 
            icon={Users} 
            color="default"
          />
          <StatCard 
            title="Novos (Lead)" 
            value={stats.new} 
            icon={UserPlus} 
            color="info"
          />
          <StatCard 
            title="Em Entrevista" 
            value={stats.interview} 
            icon={Clock} 
            color="warning"
          />
          <StatCard 
            title="Aprovados" 
            value={stats.approved} 
            icon={CheckCircle2} 
            color="success"
          />
        </StatGrid>



        <PanelCard 
          title="Listagem de Candidatos" 
          description="Filtre e gerencie o banco de talentos da sua unidade."
          icon={Users}
        >
          <div className="space-y-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="flex-1">
                <Input
                  icon={<Search size={14} />}
                  placeholder="Pesquisar por nome, cargo ou skill..."
                  value={filters.search}
                  onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                  className="h-12 rounded-2xl bg-zinc-50"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2 md:min-w-[420px]">
                <Select
                  value={filters.status}
                  onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
                  className="h-12 rounded-2xl bg-zinc-50 text-[10px] font-black uppercase tracking-widest"
                >
                  <option value="">Status: Todos</option>
                  {['Novo', 'Em análise', 'Compatível', 'Entrevista', 'Aprovado', 'Reprovado', 'Banco de talentos', 'Contratado'].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </Select>
                <Select
                  value={filters.source}
                  onChange={(e) => setFilters((f) => ({ ...f, source: e.target.value }))}
                  className="h-12 rounded-2xl bg-zinc-50 text-[10px] font-black uppercase tracking-widest"
                >
                  <option value="">Origem: Todas</option>
                  <option value="Manual">Manual</option>
                  <option value="Portal">Portal</option>
                  <option value="LinkedIn">LinkedIn</option>
                  <option value="Indicação">Indicação</option>
                  <option value="Importação">Importação</option>
                  <option value="Importação em Massa">Importação em Lote</option>
                  <option value="Importação em Lote">Importação em Lote</option>
                </Select>
              </div>
            </div>

            <div className="rounded-[32px] border border-zinc-100 overflow-hidden bg-white">
              {loading ? (
                <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
                  <div className="w-10 h-10 border-4 border-develoi-navy border-t-transparent rounded-full animate-spin" />
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Buscando na base...</p>
                </div>
              ) : candidates.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-6 py-24 text-center px-10">
                  <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center text-zinc-300">
                    <Users size={32} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-black text-zinc-900">Nenhum talento aqui</p>
                    <p className="text-xs text-zinc-400 font-medium">Experimente mudar os filtros ou adicione um novo candidato.</p>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-zinc-50">
                  {candidates.map((c) => (
                    <button 
                      key={c.id} 
                      onClick={() => navigate(`/candidatos/${c.id}`)}
                      className={cn(
                        "w-full text-left p-6 flex items-center justify-between group transition-all relative overflow-hidden",
                        selectedCandidateId === c.id ? "bg-zinc-50/80" : "hover:bg-zinc-50/40"
                      )}
                    >
                      {selectedCandidateId === c.id && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-develoi-navy" />
                      )}
                      
                      <div className="flex items-center gap-6 min-w-0">
                        <div className={cn(
                          "w-14 h-14 flex items-center justify-center rounded-2xl font-black text-sm transition-all shadow-sm border shrink-0",
                          selectedCandidateId === c.id 
                            ? "bg-develoi-navy text-white border-develoi-navy shadow-develoi-navy/20" 
                            : "bg-white text-zinc-400 border-zinc-100 group-hover:scale-105"
                        )}>
                          {c.full_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                        </div>
                        
                        <div className="flex flex-col min-w-0">
                          <span className="text-base font-black text-zinc-900 truncate group-hover:text-develoi-navy transition-colors tracking-tight">
                            {c.full_name}
                          </span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[11px] text-zinc-400 font-bold uppercase tracking-widest truncate">
                              {c.desired_position || "Cargo não informado"}
                            </span>
                            <span className="w-1 h-1 bg-zinc-200 rounded-full" />
                            <span className="text-[11px] text-zinc-400 font-bold uppercase tracking-widest">
                              {c.city || "Local não informado"}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-3">
                             <Badge color={
                               c.status === 'Novo' ? 'primary' :
                               c.status === 'Compatível' ? 'success' :
                               c.status === 'Entrevista' ? 'warning' :
                               c.status === 'Reprovado' ? 'danger' : 'info'
                             } size="sm">
                               {c.status}
                             </Badge>
                             <span className="text-[10px] font-black text-zinc-300 uppercase tracking-[0.15em]">
                               {getCandidateSourceLabel(c.source)}
                             </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-3 shrink-0 ml-4">
                        <ChevronRight size={20} className={cn(
                          "transition-all duration-300",
                          selectedCandidateId === c.id ? "rotate-90 text-develoi-navy scale-125" : "text-zinc-200 group-hover:text-zinc-400"
                        )} />
                        {c.experience_years && (
                          <div className="px-3 py-1 bg-zinc-50 border border-zinc-100 rounded-xl text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                            {c.experience_years} ANOS EXP
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-center pt-4">
              <Pagination 
                total={candidates.length} 
                page={1} 
                pageSize={20} 
                onPageChange={() => {}} 
                onPageSizeChange={() => {}} 
                className="border-t-0 p-0" 
              />
            </div>
          </div>
        </PanelCard>

        {/* Drawer de Detalhes */}
        <Drawer
          open={Boolean(selectedCandidateId)}
          onClose={() => navigate("/candidatos")}
          size="lg"
          title={candidateDetails?.full_name || "Perfil do Candidato"}
          description={candidateDetails?.status || "Carregando..."}
          icon={<Users size={24} />}
          actions={
            <div className="flex items-center gap-2">
              <IconButton 
                onClick={() => navigate(`/candidatos/${selectedCandidateId}/editar`)}
                variant="outline"
                className="bg-white"
                aria-label="Editar"
              >
                <Edit size={18} />
              </IconButton>
              <IconButton 
                onClick={() => selectedCandidateId && deleteCandidate(selectedCandidateId)}
                variant="outline"
                className="bg-white text-zinc-400 hover:text-red-500 hover:bg-red-50"
                aria-label="Excluir"
              >
                <Trash2 size={18} />
              </IconButton>
            </div>
          }
        >
          {candidateDetails ? (
            <CandidateDetails 
              candidate={candidateDetails} 
              onClose={() => navigate("/candidatos")}
              onEdit={() => navigate(`/candidatos/${candidateDetails.id}/editar`)}
              onRefresh={fetchCandidates}
              hideHeader={true}
            />
          ) : (
            <div className="h-full flex items-center justify-center p-20 text-center">
               <div className="space-y-4">
                  <div className="w-12 h-12 border-4 border-develoi-navy border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Carregando Perfil...</p>
               </div>
            </div>
          )}
        </Drawer>
      </div>
    </PageWrapper>
  );
}
