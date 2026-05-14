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
  CalendarArrowUp,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
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
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/src/lib/utils";
import { useMatch, useNavigate } from "react-router-dom";
import { encodeId, decodeId } from "@/src/lib/hashid";
import { useUserPreferences } from "@/src/lib/useUserPreferences";

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

// Custom checkbox component
function Checkbox({ checked, indeterminate = false, onChange, className }: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onChange(); }}
      className={cn(
        "w-4 h-4 rounded flex items-center justify-center border transition-all shrink-0",
        checked || indeterminate
          ? "bg-develoi-navy border-develoi-navy"
          : "bg-white border-zinc-300 hover:border-zinc-400",
        className
      )}
      aria-checked={indeterminate ? "mixed" : checked}
    >
      {indeterminate ? (
        <span className="w-2 h-0.5 bg-white rounded-full block" />
      ) : checked ? (
        <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
          <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : null}
    </button>
  );
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
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [deleteBulkConfirm, setDeleteBulkConfirm] = useState(false);

  const savedPrefs = useMemo(() => loadPrefs(tenantId), [tenantId]);

  const [searchInput, setSearchInput] = useState(savedPrefs?.search ?? "");
  const [filters, setFilters] = useState({
    search: savedPrefs?.search ?? "",
    status: savedPrefs?.status ?? "",
    source: savedPrefs?.source ?? ""
  });
  const [sortField, setSortField] = useState<SortField>(savedPrefs?.sortField ?? 'name');
  const [sortDir, setSortDir] = useState<SortDir>(savedPrefs?.sortDir ?? 'asc');

  const PAGE_SIZE_OPTIONS = [5, 10, 20, 50, 100, 200] as const;
  const { get: getPref, set: setPref } = useUserPreferences();
  const [pageSize, setPageSize] = useState<number>(() => getPref<number>("candidates_pageSize", savedPrefs?.pageSize ?? 20));
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => {
      setFilters(f => ({ ...f, search: searchInput }));
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    savePrefs(tenantId, { ...filters, search: searchInput, sortField, sortDir });
  }, [filters, searchInput, sortField, sortDir, tenantId]);

  // Reset to page 1 when filters/sort change
  useEffect(() => { setCurrentPage(1); }, [filters, searchInput, sortField, sortDir]);

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

  const confirmBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    try {
      setLoading(true);
      await Promise.all([...selectedIds].map(id =>
        fetch(`/api/candidates/${id}`, { method: 'DELETE' })
      ));
      toast.success(`${selectedIds.size} candidato(s) removido(s).`);
      setSelectedIds(new Set());
      setDeleteBulkConfirm(false);
      fetchCandidates();
    } catch (err) {
      toast.error("Erro ao remover candidatos.");
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Client-side sort
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

  const totalPages = Math.max(1, Math.ceil(sortedCandidates.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pagedCandidates = sortedCandidates.slice((safePage - 1) * pageSize, safePage * pageSize);

  const allSelected = pagedCandidates.length > 0 && pagedCandidates.every(c => selectedIds.has(c.id));
  const someSelected = !allSelected && pagedCandidates.some(c => selectedIds.has(c.id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        pagedCandidates.forEach(c => next.delete(c.id));
        return next;
      });
    } else {
      setSelectedIds(prev => new Set([...prev, ...pagedCandidates.map(c => c.id)]));
    }
  };

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
      <div className="space-y-5 px-3 py-5 sm:space-y-6 sm:px-5 sm:py-7 lg:px-8 lg:py-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <SectionTitle
            title="Gestão de Talentos"
            subtitle={`${currentUnit.name} · ${candidates.length} candidatos encontrados`}
            icon={<Users size={22} />}
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

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total", value: stats.total, color: "text-zinc-900" },
            { label: "Novos", value: stats.new, color: "text-amber-600" },
            { label: "Entrevista", value: stats.interview, color: "text-blue-600" },
            { label: "Aprovados", value: stats.approved, color: "text-emerald-600" },
          ].map(s => (
            <div key={s.label} className="bg-white border border-zinc-100 rounded-xl p-4 shadow-sm">
              <p className={cn("text-[10px] font-black uppercase tracking-widest mb-1", s.color)}>{s.label}</p>
              <p className={cn("text-2xl font-black", s.color)}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white border border-zinc-100 rounded-xl p-4 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Input
              icon={<Search size={14} />}
              placeholder="Nome, cargo, skill..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="h-10 rounded-lg bg-zinc-50 text-sm"
            />
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

        {/* Bulk action bar */}
        <AnimatePresence>
          {selectedIds.size > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex items-center gap-3 bg-develoi-navy text-white rounded-xl px-4 py-2.5 shadow-lg shadow-develoi-navy/20"
            >
              <div className="flex-1">
                <span className="text-[11px] font-black uppercase tracking-wider">
                  {selectedIds.size} candidato{selectedIds.size > 1 ? 's' : ''} selecionado{selectedIds.size > 1 ? 's' : ''}
                </span>
              </div>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-[10px] font-bold text-white/60 hover:text-white transition-colors uppercase tracking-wider"
              >
                Limpar
              </button>
              <Button
                variant="danger"
                onClick={() => setDeleteBulkConfirm(true)}
                iconLeft={<Trash2 size={13} />}
                className="text-[10px] h-8 px-3"
              >
                Remover {selectedIds.size}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Candidates Table */}
        <div className="bg-white border border-zinc-100 rounded-xl shadow-sm overflow-hidden">

          {/* Table header */}
          <div className="grid grid-cols-[3rem_1fr_auto] md:grid-cols-[3rem_1fr_7rem_7rem_9rem] items-center border-b-2 border-zinc-200 bg-zinc-100 border-l-2 border-l-transparent">
            <div className="flex items-center justify-center py-2.5">
              <Checkbox checked={allSelected} indeterminate={someSelected} onChange={toggleSelectAll} />
            </div>
            <div className="px-4 py-2.5 border-l border-zinc-200">
              <button
                onClick={() => toggleSort('name')}
                className="flex items-center gap-1.5 text-[10px] font-black text-zinc-500 uppercase tracking-widest hover:text-zinc-700 transition-colors"
              >
                Candidato <SortIcon field="name" />
              </button>
            </div>
            <div className="hidden md:flex items-center justify-center px-4 py-2.5 border-l border-zinc-200">
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Status</p>
            </div>
            <div className="hidden md:flex items-center justify-center px-4 py-2.5 border-l border-zinc-200">
              <button
                onClick={() => toggleSort('date')}
                className="flex items-center gap-1.5 text-[10px] font-black text-zinc-500 uppercase tracking-widest hover:text-zinc-700 transition-colors"
              >
                <SortIcon field="date" /> Inclusão
              </button>
            </div>
            <div className="flex items-center justify-end px-4 py-2.5 border-l border-zinc-200">
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Ações</p>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center gap-4 py-20">
              <div className="w-10 h-10 border-4 border-develoi-navy border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-bold text-zinc-400 uppercase">Carregando...</p>
            </div>
          ) : pagedCandidates.length === 0 ? (
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
            <div>
              {pagedCandidates.map((c, idx) => {
                const isSelected = selectedIds.has(c.id);
                return (
                  <motion.div
                    key={c.id}
                    layout
                    className={cn(
                      "grid grid-cols-[3rem_1fr_auto] md:grid-cols-[3rem_1fr_7rem_7rem_9rem] items-center transition-colors duration-100 border-b border-zinc-200",
                      isSelected
                        ? "bg-amber-50 border-l-2 border-l-develoi-gold"
                        : idx % 2 === 0
                          ? "bg-white hover:bg-zinc-50 border-l-2 border-l-transparent"
                          : "bg-zinc-50 hover:bg-zinc-100 border-l-2 border-l-transparent"
                    )}
                  >
                    {/* Checkbox */}
                    <div className="flex items-center justify-center py-3 cursor-pointer" onClick={() => toggleSelect(c.id)}>
                      <Checkbox checked={isSelected} onChange={() => toggleSelect(c.id)} />
                    </div>

                    {/* Info */}
                    <div className="flex items-center gap-3 px-4 py-3 border-l border-zinc-200 min-w-0">
                      <div className={cn(
                        "w-8 h-8 flex items-center justify-center rounded-lg font-black text-[10px] shrink-0 transition-colors",
                        isSelected ? "bg-develoi-gold/20 text-develoi-navy" : "bg-zinc-200/70 text-zinc-600"
                      )}>
                        {c.full_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-zinc-900 text-sm">{c.full_name}</span>
                          {c.experience_years && (
                            <span className="text-[9px] font-bold text-zinc-400 px-1.5 py-0.5 bg-zinc-100 rounded shrink-0">
                              {c.experience_years}a
                            </span>
                          )}
                          <span className="md:hidden">
                            <Badge className={cn("text-[9px] font-bold", statusColor(c.status))}>
                              {c.status}
                            </Badge>
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-0.5 flex-wrap">
                          {c.desired_position && (
                            <span className="flex items-center gap-1">
                              <Briefcase size={10} />
                              {c.desired_position}
                            </span>
                          )}
                          {c.city && (
                            <>
                              <span className="w-0.5 h-0.5 bg-zinc-300 rounded-full shrink-0" />
                              <span className="flex items-center gap-1">
                                <MapPin size={10} />
                                {c.city}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Status desktop */}
                    <div className="hidden md:flex items-center justify-center px-4 py-3 border-l border-zinc-200">
                      <Badge className={cn("text-[9px] font-bold", statusColor(c.status))}>
                        {c.status}
                      </Badge>
                    </div>

                    {/* Data inclusão desktop */}
                    <div className="hidden md:flex flex-col items-center justify-center px-4 py-3 border-l border-zinc-200">
                      <span className="text-[11px] font-semibold text-zinc-700">
                        {new Date(c.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                      </span>
                      <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">
                        {new Date(c.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-0.5 px-2 py-3 border-l border-zinc-200" onClick={e => e.stopPropagation()}>
                      <IconButton
                        onClick={() => navigate(`/candidatos/${encodeId(c.id)}`)}
                        variant="ghost"
                        className="h-7 w-7 text-zinc-400 hover:text-develoi-navy hover:bg-develoi-navy/5"
                        aria-label="Ver perfil"
                        title="Ver perfil completo"
                      >
                        <Eye size={13} />
                      </IconButton>
                      <IconButton
                        onClick={() => navigate(`/candidatos/${encodeId(c.id)}?tab=evaluations`)}
                        variant="ghost"
                        className="h-7 w-7 text-zinc-400 hover:text-purple-600 hover:bg-purple-50"
                        aria-label="Avaliações"
                        title="Avaliações"
                      >
                        <ClipboardCheck size={13} />
                      </IconButton>
                      <IconButton
                        onClick={() => navigate(`/candidatos/${encodeId(c.id)}/editar`)}
                        variant="ghost"
                        className="h-7 w-7 text-zinc-400 hover:text-blue-600 hover:bg-blue-50"
                        aria-label="Editar"
                        title="Editar candidato"
                      >
                        <Edit size={13} />
                      </IconButton>
                      <IconButton
                        onClick={() => setDeleteConfirmId(c.id)}
                        variant="ghost"
                        className="h-7 w-7 text-zinc-400 hover:text-red-500 hover:bg-red-50"
                        aria-label="Excluir"
                        title="Excluir candidato"
                      >
                        <Trash2 size={13} />
                      </IconButton>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Pagination footer */}
          {!loading && sortedCandidates.length > 0 && (
            <div className="px-4 py-3 border-t border-zinc-200 bg-zinc-50 flex flex-wrap items-center justify-between gap-3">
              {/* Left: count + selected */}
              <div className="flex items-center gap-3">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  {sortedCandidates.length} candidato{sortedCandidates.length !== 1 ? 's' : ''}
                  {' '}· pág. {safePage}/{totalPages}
                </p>
                {selectedIds.size > 0 && (
                  <span className="text-[10px] font-black text-develoi-navy uppercase tracking-wider bg-develoi-navy/8 px-2 py-0.5 rounded-full">
                    {selectedIds.size} selecionado{selectedIds.size !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {/* Right: nav + page size */}
              <div className="flex items-center gap-2">
                {/* Page nav */}
                <div className="flex items-center gap-0.5">
                  <button onClick={() => setCurrentPage(1)} disabled={safePage === 1}
                    className="h-7 w-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                    <ChevronsLeft size={13} />
                  </button>
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safePage === 1}
                    className="h-7 w-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                    <ChevronLeft size={13} />
                  </button>

                  {/* Page number pills */}
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                    .reduce<(number | '...')[]>((acc, p, i, arr) => {
                      if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push('...');
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((p, i) => p === '...' ? (
                      <span key={`dots-${i}`} className="w-7 text-center text-[10px] font-bold text-zinc-400">…</span>
                    ) : (
                      <button key={p} onClick={() => setCurrentPage(p as number)}
                        className={cn(
                          "h-7 min-w-[1.75rem] px-1 rounded-lg text-[10px] font-black transition-all",
                          safePage === p
                            ? "bg-develoi-navy text-white shadow-sm"
                            : "text-zinc-500 hover:bg-zinc-200"
                        )}>
                        {p}
                      </button>
                    ))
                  }

                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
                    className="h-7 w-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                    <ChevronRight size={13} />
                  </button>
                  <button onClick={() => setCurrentPage(totalPages)} disabled={safePage === totalPages}
                    className="h-7 w-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                    <ChevronsRight size={13} />
                  </button>
                </div>

                {/* Page size selector */}
                <select
                  value={pageSize}
                  onChange={e => { const n = Number(e.target.value); setPageSize(n); setPref("candidates_pageSize", n); setCurrentPage(1); }}
                  className="h-7 appearance-none rounded-lg border border-zinc-200 bg-white text-[10px] font-black text-zinc-600 pl-2.5 pr-6 outline-none cursor-pointer hover:border-zinc-300 transition-colors"
                  title="Itens por página"
                >
                  {PAGE_SIZE_OPTIONS.map(n => (
                    <option key={n} value={n}>{n} / pág.</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Delete single modal */}
        <Modal
          open={Boolean(deleteConfirmId)}
          onClose={() => setDeleteConfirmId(null)}
          size="sm"
          title="Excluir Candidato"
          description="Esta ação remove o talento permanentemente."
          icon={<Trash2 size={20} />}
          footer={
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button variant="ghost" onClick={() => setDeleteConfirmId(null)}>Cancelar</Button>
              <Button variant="danger" onClick={confirmDelete} loading={loading}>Remover</Button>
            </div>
          }
        >
          <p className="text-sm leading-relaxed text-zinc-600">
            Deseja realmente remover este candidato permanentemente?
          </p>
        </Modal>

        {/* Delete bulk modal */}
        <Modal
          open={deleteBulkConfirm}
          onClose={() => setDeleteBulkConfirm(false)}
          size="sm"
          title="Remover Selecionados"
          description={`${selectedIds.size} candidato(s) serão removidos permanentemente.`}
          icon={<Trash2 size={20} />}
          footer={
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button variant="ghost" onClick={() => setDeleteBulkConfirm(false)}>Cancelar</Button>
              <Button variant="danger" onClick={confirmBulkDelete} loading={loading}>
                Remover {selectedIds.size}
              </Button>
            </div>
          }
        >
          <p className="text-sm leading-relaxed text-zinc-600">
            Tem certeza que deseja remover <strong>{selectedIds.size} candidato{selectedIds.size !== 1 ? 's' : ''}</strong> permanentemente? Esta ação não pode ser desfeita.
          </p>
        </Modal>

      </div>
    </PageWrapper>
  );
}
