import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Users,
  Search,
  Plus,
  RefreshCcw,
  Edit,
  Trash2,
  Upload,
  Eye,
  ClipboardCheck,
  MapPin,
  Briefcase,
  ArrowUpAZ,
  ArrowDownAZ,
  ArrowUpDown,
  CalendarArrowDown,
  CalendarArrowUp
} from "lucide-react";
import {
  useToast,
  Badge,
  Button,
  IconButton,
  Input,
  Select,
  Modal,
  PageWrapper,
  SectionTitle,
} from "@/src/components/ui";
import { getTenantId } from "@/src/lib/auth";
import { Candidate } from "@/src/types";
import { useUnit } from "@/src/lib/useUnit";
import CandidateForm from "./CandidateForm";
import { motion } from "motion/react";
import { cn } from "@/src/lib/utils";
import { useMatch, useNavigate } from "react-router-dom";
import { encodeId, decodeId } from "@/src/lib/hashid";

type SortField = 'name' | 'date';
type SortDir = 'asc' | 'desc';

const PREFS_KEY = (tenantId: string) => `rh_candidates_prefs_${tenantId}`;

function loadPrefs(tenantId: string) {
  try {
    const raw = localStorage.getItem(PREFS_KEY(tenantId));
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function savePrefs(tenantId: string, data: object) {
  try {
    localStorage.setItem(PREFS_KEY(tenantId), JSON.stringify(data));
  } catch {}
}

export default function Candidates() {
  const { currentUnit } = useUnit();
  const tenantId = getTenantId();
  const queryUnitId = currentUnit.is_master ? "master" : currentUnit.id;
  const toast = useToast();
  const navigate = useNavigate();
  const createMatch = useMatch("/candidatos/novo");
  const editMatch = useMatch("/candidatos/:candidateId/editar");
  const isCreateRoute = Boolean(createMatch);
  const isEditRoute = Boolean(editMatch);
  const routeCandidateId = decodeId(editMatch?.params.candidateId ?? '') || null;
  const [candidateForEdit, setCandidateForEdit] = useState<Candidate | null>(null);
  const [candidateEditLoading, setCandidateEditLoading] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Load prefs from localStorage on mount
  const savedPrefs = useMemo(() => loadPrefs(tenantId), [tenantId]);

  const [searchInput, setSearchInput] = useState(savedPrefs?.search ?? "");
  const [filters, setFilters] = useState({
    search: savedPrefs?.search ?? "",
    status: savedPrefs?.status ?? "",
    source: savedPrefs?.source ?? ""
  });
  const [sortField, setSortField] = useState<SortField>(savedPrefs?.sortField ?? 'name');
  const [sortDir, setSortDir] = useState<SortDir>(savedPrefs?.sortDir ?? 'asc');

  // Debounce search input — only update filters.search after 400ms idle
  useEffect(() => {
    const t = setTimeout(() => {
      setFilters(f => ({ ...f, search: searchInput }));
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Persist prefs whenever filters or sort change
  useEffect(() => {
    savePrefs(tenantId, { ...filters, search: searchInput, sortField, sortDir });
  }, [filters, searchInput, sortField, sortDir, tenantId]);

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
      if (!res.ok || !Array.isArray(data)) {
        setCandidates([]);
        toast.error(`Erro ao carregar candidatos.${data?.detail ? ` (${data.detail})` : ''}`);
        return;
      }
      setCandidates(data);
    } catch (err) {
      toast.error("Erro ao carregar candidatos.");
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  }, [filters, queryUnitId, tenantId, toast]);

  const fetchCandidateForEdit = useCallback(async (id: number) => {
    if (!id || id <= 0) return;
    setCandidateEditLoading(true);
    try {
      const res = await fetch(`/api/candidates/${id}`);
      if (!res.ok) throw new Error("Not found");
      const data = await res.json();
      setCandidateForEdit(data);
    } catch (err) {
      toast.error("Erro ao carregar candidato.");
      navigate("/candidatos", { replace: true });
    } finally {
      setCandidateEditLoading(false);
    }
  }, [navigate, toast]);

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      setLoading(true);
      await fetch(`/api/candidates/${deleteConfirmId}`, { method: 'DELETE' });
      toast.success("Candidato removido.");
      setDeleteConfirmId(null);
      fetchCandidates();
    } catch (err) {
      toast.error("Erro ao remover candidato.");
    } finally {
      setLoading(false);
    }
  };

  // Client-side sort on top of API results
  const sortedCandidates = useMemo(() => {
    const list = [...candidates];
    list.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'name') {
        cmp = a.full_name.localeCompare(b.full_name, 'pt-BR', { sensitivity: 'base' });
      } else {
        cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [candidates, sortField, sortDir]);

  const stats = useMemo(() => ({
    total: candidates.length,
    new: candidates.filter(c => c.status === 'Novo').length,
    interview: candidates.filter(c => c.status === 'Entrevista').length,
    approved: candidates.filter(c => c.status === 'Aprovado' || c.status === 'Contratado').length,
  }), [candidates]);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  useEffect(() => {
    if (isEditRoute && routeCandidateId) {
      fetchCandidateForEdit(routeCandidateId);
    }
  }, [isEditRoute, routeCandidateId, fetchCandidateForEdit]);

  if (isCreateRoute || isEditRoute) {
    if (isEditRoute && (candidateEditLoading || !candidateForEdit || Number(candidateForEdit.id) !== routeCandidateId)) {
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
        candidate={isEditRoute ? candidateForEdit : null}
        onBack={() => navigate(isEditRoute && routeCandidateId ? `/candidatos/${encodeId(routeCandidateId)}` : "/candidatos")}
        onSuccess={() => {
          navigate("/candidatos");
          fetchCandidates();
        }}
      />
    );
  }

  const statusColor = (status: string) => {
    if (status === 'Novo') return 'bg-amber-50 text-amber-700 border-amber-100';
    if (status === 'Compatível') return 'bg-green-50 text-green-700 border-green-100';
    if (status === 'Entrevista') return 'bg-blue-50 text-blue-700 border-blue-100';
    if (status === 'Aprovado' || status === 'Contratado') return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    if (status === 'Reprovado') return 'bg-red-50 text-red-700 border-red-100';
    return 'bg-zinc-50 text-zinc-600 border-zinc-100';
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown size={12} className="text-zinc-300" />;
    if (field === 'name') return sortDir === 'asc'
      ? <ArrowUpAZ size={12} className="text-develoi-navy" />
      : <ArrowDownAZ size={12} className="text-develoi-navy" />;
    return sortDir === 'asc'
      ? <CalendarArrowUp size={12} className="text-develoi-navy" />
      : <CalendarArrowDown size={12} className="text-develoi-navy" />;
  };

  return (
    <PageWrapper className="min-h-screen bg-zinc-50/60">
      <div className="space-y-8 px-3 py-5 sm:space-y-10 sm:px-5 sm:py-7 lg:space-y-12 lg:px-8 lg:py-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <SectionTitle
          title="Gestão de Talentos"
          subtitle={`${currentUnit.name} · ${candidates.length} candidatos encontrados`}
          icon={<Users size={22} />}
          className="mb-0"
        />
        <div className="flex items-center gap-2 shrink-0">
          <IconButton
            onClick={fetchCandidates}
            variant="outline"
            className="bg-white hover:bg-zinc-50 border-zinc-200"
            aria-label="Atualizar"
          >
            <RefreshCcw size={16} />
          </IconButton>
          <Button
            variant="outline"
            onClick={() => navigate("/importar-cvs")}
            iconLeft={<Upload size={14} />}
            className="text-xs"
          >
            Importar
          </Button>
          <Button
            onClick={() => navigate("/candidatos/novo")}
            iconLeft={<Plus size={14} />}
            className="text-xs"
          >
            Novo Talento
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-white border border-zinc-100 rounded-lg p-4 shadow-sm">
          <p className="text-[10px] font-bold text-zinc-500 uppercase mb-1">Total</p>
          <p className="text-2xl font-bold text-zinc-900">{stats.total}</p>
        </div>
        <div className="bg-white border border-zinc-100 rounded-lg p-4 shadow-sm">
          <p className="text-[10px] font-bold text-amber-600 uppercase mb-1">Novos</p>
          <p className="text-2xl font-bold text-amber-600">{stats.new}</p>
        </div>
        <div className="bg-white border border-zinc-100 rounded-lg p-4 shadow-sm">
          <p className="text-[10px] font-bold text-blue-600 uppercase mb-1">Entrevista</p>
          <p className="text-2xl font-bold text-blue-600">{stats.interview}</p>
        </div>
        <div className="bg-white border border-zinc-100 rounded-lg p-4 shadow-sm">
          <p className="text-[10px] font-bold text-green-600 uppercase mb-1">Aprovados</p>
          <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
        </div>
      </div>

      {/* Filters + Sort */}
      <div className="bg-white border border-zinc-100 rounded-xl p-4 mb-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-1">
            <Input
              icon={<Search size={14} />}
              placeholder="Nome, cargo, skill..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="h-10 rounded-lg bg-zinc-50 text-sm"
            />
          </div>
          <Select
            value={filters.status}
            onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))}
            className="h-10 rounded-lg bg-zinc-50 text-xs font-bold"
          >
            <option value="">Status: Todos</option>
            {['Novo', 'Em análise', 'Compatível', 'Entrevista', 'Aprovado', 'Reprovado', 'Banco de talentos', 'Contratado'].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
          <Select
            value={filters.source}
            onChange={(e) => setFilters(f => ({ ...f, source: e.target.value }))}
            className="h-10 rounded-lg bg-zinc-50 text-xs font-bold"
          >
            <option value="">Origem: Todas</option>
            <option value="Manual">Manual</option>
            <option value="Portal">Portal</option>
            <option value="LinkedIn">LinkedIn</option>
            <option value="Indicação">Indicação</option>
            <option value="Importação em Lote">Importação</option>
          </Select>

          {/* Sort controls */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-zinc-400 uppercase shrink-0">Ordem:</span>
            <button
              onClick={() => toggleSort('name')}
              className={cn(
                "flex items-center gap-1.5 px-3 h-10 rounded-lg text-[10px] font-bold border transition-all flex-1 justify-center",
                sortField === 'name'
                  ? "bg-develoi-navy/5 border-develoi-navy/20 text-develoi-navy"
                  : "bg-zinc-50 border-zinc-200 text-zinc-500 hover:border-zinc-300"
              )}
            >
              <SortIcon field="name" />
              Nome
            </button>
            <button
              onClick={() => toggleSort('date')}
              className={cn(
                "flex items-center gap-1.5 px-3 h-10 rounded-lg text-[10px] font-bold border transition-all flex-1 justify-center",
                sortField === 'date'
                  ? "bg-develoi-navy/5 border-develoi-navy/20 text-develoi-navy"
                  : "bg-zinc-50 border-zinc-200 text-zinc-500 hover:border-zinc-300"
              )}
            >
              <SortIcon field="date" />
              Data
            </button>
          </div>
        </div>
      </div>

      {/* Candidates List */}
      <div className="bg-white border border-zinc-100 rounded-xl shadow-sm overflow-hidden">
        {/* Table Header */}
        <div className="hidden md:grid grid-cols-[auto_1fr_auto_auto] items-center gap-4 px-5 py-2.5 border-b border-zinc-100 bg-zinc-50/60">
          <div className="w-8" />
          <button
            onClick={() => toggleSort('name')}
            className="flex items-center gap-1.5 text-[10px] font-black text-zinc-400 uppercase tracking-widest hover:text-zinc-600 transition-colors"
          >
            Candidato
            <SortIcon field="name" />
          </button>
          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest w-28 text-center">Status</p>
          <button
            onClick={() => toggleSort('date')}
            className="flex items-center gap-1.5 text-[10px] font-black text-zinc-400 uppercase tracking-widest w-36 justify-end hover:text-zinc-600 transition-colors"
          >
            <SortIcon field="date" />
            Data / Ações
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-4 py-20">
            <div className="w-10 h-10 border-4 border-develoi-navy border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-bold text-zinc-400 uppercase">Carregando...</p>
          </div>
        ) : sortedCandidates.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-16 px-6">
            <div className="w-14 h-14 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-400">
              <Users size={28} />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-zinc-900">Nenhum talento encontrado</p>
              <p className="text-xs text-zinc-500 mt-1">Altere os filtros ou cadastre um novo candidato</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-zinc-50">
            {sortedCandidates.map((c) => (
              <motion.div
                key={c.id}
                layout
                className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-4 px-5 py-3 hover:bg-zinc-50/60 transition-colors group"
              >
                {/* Avatar */}
                <div className="w-8 h-8 flex items-center justify-center rounded-lg font-bold text-[10px] bg-zinc-100 text-zinc-600 shrink-0">
                  {c.full_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                </div>

                {/* Info */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-zinc-900 text-sm truncate">{c.full_name}</span>
                    {c.experience_years && (
                      <span className="text-[9px] font-bold text-zinc-400 px-1.5 py-0.5 bg-zinc-100 rounded shrink-0">
                        {c.experience_years}a
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-0.5">
                    {c.desired_position && (
                      <span className="flex items-center gap-1">
                        <Briefcase size={10} />
                        {c.desired_position}
                      </span>
                    )}
                    {c.city && (
                      <>
                        <span className="w-0.5 h-0.5 bg-zinc-300 rounded-full" />
                        <span className="flex items-center gap-1">
                          <MapPin size={10} />
                          {c.city}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Status */}
                <div className="w-28 flex justify-center">
                  <Badge className={cn("text-[9px] font-bold", statusColor(c.status))}>
                    {c.status}
                  </Badge>
                </div>

                {/* Actions */}
                <div className="w-36 flex items-center justify-end gap-1">
                  <IconButton
                    onClick={() => navigate(`/candidatos/${encodeId(c.id)}`)}
                    variant="ghost"
                    className="h-7 w-7 text-zinc-400 hover:text-develoi-navy hover:bg-develoi-navy/5"
                    aria-label="Ver perfil"
                    title="Ver perfil completo"
                  >
                    <Eye size={14} />
                  </IconButton>
                  <IconButton
                    onClick={() => navigate(`/candidatos/${encodeId(c.id)}?tab=evaluations`)}
                    variant="ghost"
                    className="h-7 w-7 text-zinc-400 hover:text-purple-600 hover:bg-purple-50"
                    aria-label="Avaliações"
                    title="Avaliações"
                  >
                    <ClipboardCheck size={14} />
                  </IconButton>
                  <IconButton
                    onClick={() => navigate(`/candidatos/${encodeId(c.id)}/editar`)}
                    variant="ghost"
                    className="h-7 w-7 text-zinc-400 hover:text-blue-600 hover:bg-blue-50"
                    aria-label="Editar"
                    title="Editar candidato"
                  >
                    <Edit size={14} />
                  </IconButton>
                  <IconButton
                    onClick={() => setDeleteConfirmId(c.id)}
                    variant="ghost"
                    className="h-7 w-7 text-zinc-400 hover:text-red-500 hover:bg-red-50"
                    aria-label="Excluir"
                    title="Excluir candidato"
                  >
                    <Trash2 size={14} />
                  </IconButton>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        open={Boolean(deleteConfirmId)}
        onClose={() => setDeleteConfirmId(null)}
        size="sm"
        title="Excluir Candidato"
        description="Esta ação remove o talento permanentemente."
        icon={<Trash2 size={20} />}
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => setDeleteConfirmId(null)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={confirmDelete} loading={loading}>
              Remover
            </Button>
          </div>
        }
      >
        <p className="text-sm leading-relaxed text-zinc-600">
          Deseja realmente remover este candidato permanentemente?
        </p>
      </Modal>
      </div>
    </PageWrapper>
  );
}
