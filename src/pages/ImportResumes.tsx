import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Upload, FileText, CheckCircle2, AlertCircle, X, Loader2, Plus, Users,
  Download, Search, ArrowLeft, Settings, Brain, Target, Shield,
  Sparkles, Clock, Database, Copy, Eye, MoreVertical, Zap, Briefcase,
  ChevronRight, RefreshCw, Layers, Trash2, Check, Mail, User,
  Star, Cpu, TrendingUp, Info, HelpCircle, PartyPopper,
} from "lucide-react";
import {
  PanelCard, Badge, useToast, StatCard, EmptyState, StatGrid,
  SectionTitle, Button, IconButton, Select, Input, Modal, PageWrapper
} from "@/src/components/ui";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/src/lib/utils";
import { getTenantId } from "@/src/lib/auth";
import { useUnit } from "@/src/lib/useUnit";
import { useNotifications } from "@/src/lib/notifications";
import { Job } from "@/src/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type ImportStatus = "pending" | "uploaded" | "processing" | "completed" | "failed" | "committed";

interface ImportBatch {
  id: number;
  name: string;
  job_id: number | null;
  job_title?: string;
  status: ImportStatus;
  total_files: number;
  processed_files: number;
  created_candidates: number;
  duplicate_files: number;
  error_files: number;
  created_at: string;
  import_type: string;
}

interface ImportFile {
  id: number;
  file_name: string;
  status: string;
  progress: number;
  compatibility_score?: number;
  duplicate_status?: string;
  file_size: number;
  parsed_data_json?: string;
  error_message?: string;
  ai_summary?: string;
}

interface ImportCapacity {
  max_files_per_batch: number;
  max_file_size_bytes: number;
  max_file_size_mb: number;
  max_total_size_bytes: number;
  max_total_size_mb: number;
  supported_extensions: string[];
}

const DEFAULT_CAPACITY: ImportCapacity = {
  max_files_per_batch: 500,
  max_file_size_bytes: 8 * 1024 * 1024,
  max_file_size_mb: 8,
  max_total_size_bytes: 96 * 1024 * 1024,
  max_total_size_mb: 96,
  supported_extensions: [".pdf", ".docx", ".txt", ".csv", ".xls", ".xlsx"],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtBytes(b: number) {
  if (b >= 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(1)} MB`;
  return `${(b / 1024).toFixed(1)} KB`;
}

function batchStatusLabel(s: string, processed?: number, total?: number) {
  if (s === "committed") return "Convertido";
  if (s === "completed") return "Concluído";
  if (s === "processing" || s === "uploaded") {
    if (total && total > 0 && (processed ?? 0) >= total) return "Concluído";
    return "Processando";
  }
  if (s === "failed") return "Com Falhas";
  return "Pendente";
}

function batchStatusColor(s: string, processed?: number, total?: number): "success" | "warning" | "danger" | "info" {
  if (s === "committed" || s === "completed") return "success";
  if (s === "processing" || s === "uploaded") {
    if (total && total > 0 && (processed ?? 0) >= total) return "success";
    return "info";
  }
  if (s === "failed") return "danger";
  return "warning";
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ImportResumes() {
  const { currentUnit } = useUnit();
  const tenantId = getTenantId();
  const queryUnitId = currentUnit.is_master ? "master" : currentUnit.id;
  const toast = useToast();
  const { push: pushNotif } = useNotifications();

  // Views
  type View = "dashboard" | "details";
  const [view, setView] = useState<View>("dashboard");

  // Data
  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [capacity, setCapacity] = useState<ImportCapacity>(DEFAULT_CAPACITY);
  const [availableJobs, setAvailableJobs] = useState<Job[]>([]);
  const [availableTools, setAvailableTools] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Selected batch / files
  const [selectedBatch, setSelectedBatch] = useState<ImportBatch | null>(null);
  const [batchFiles, setBatchFiles] = useState<ImportFile[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedFileIds, setSelectedFileIds] = useState<number[]>([]);
  const [autoToolId, setAutoToolId] = useState("none");

  // Modals
  const [showNewBatch, setShowNewBatch] = useState(false);
  const [selectedFile, setSelectedFile] = useState<ImportFile | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number | number[]; type: "batch" | "file" | "bulk"; title: string } | null>(null);
  const [isEditingFile, setIsEditingFile] = useState(false);
  const [editedFileData, setEditedFileData] = useState<any>(null);
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [isMatching, setIsMatching] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);

  // New batch modal state (hoisted to avoid remount on render)
  const [nbForm, setNbForm] = useState({ name: "", job_id: "", analysis_mode: "full", duplicate_strategy: "manual" });
  const [nbQueue, setNbQueue] = useState<{ file: File; progress: number; status: "pending" | "uploading" | "done" | "error" }[]>([]);
  const [nbDragging, setNbDragging] = useState(false);
  const [nbProcessing, setNbProcessing] = useState(false);
  const nbFileInputRef = useRef<HTMLInputElement>(null);

  // Add-to-batch modal state
  const [showAddFiles, setShowAddFiles] = useState(false);
  const [addQueue, setAddQueue] = useState<File[]>([]);
  const [addDragging, setAddDragging] = useState(false);
  const [addProcessing, setAddProcessing] = useState(false);
  const addFileInputRef = useRef<HTMLInputElement>(null);

  // ─── Fetch ──────────────────────────────────────────────────────────────────

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch(`/api/imports/dashboard?tenantId=${tenantId}`);
      const data = await res.json();
      setStats(data.stats);
    } catch { /* silent */ }
  }, [tenantId]);

  const fetchBatches = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/imports?tenantId=${tenantId}`);
      const data = await res.json();
      setBatches(Array.isArray(data) ? data : []);
    } catch { /* silent */ } finally { setIsLoading(false); }
  }, [tenantId]);

  const fetchCapacity = useCallback(async () => {
    try {
      const res = await fetch("/api/imports/capacity");
      if (!res.ok) return;
      const data = await res.json();
      setCapacity({
        max_files_per_batch: Number(data?.max_files_per_batch || DEFAULT_CAPACITY.max_files_per_batch),
        max_file_size_bytes: Number(data?.max_file_size_bytes || DEFAULT_CAPACITY.max_file_size_bytes),
        max_file_size_mb: Number(data?.max_file_size_mb || DEFAULT_CAPACITY.max_file_size_mb),
        max_total_size_bytes: Number(data?.max_total_size_bytes || DEFAULT_CAPACITY.max_total_size_bytes),
        max_total_size_mb: Number(data?.max_total_size_mb || DEFAULT_CAPACITY.max_total_size_mb),
        supported_extensions: Array.isArray(data?.supported_extensions) ? data.supported_extensions : DEFAULT_CAPACITY.supported_extensions,
      });
    } catch { /* silent */ }
  }, []);

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch(`/api/jobs?tenantId=${tenantId}&unitId=${queryUnitId}`);
      const data = await res.json();
      setAvailableJobs(Array.isArray(data) ? data : []);
    } catch { /* silent */ }
  }, [tenantId, queryUnitId]);

  const fetchTools = useCallback(async () => {
    try {
      const res = await fetch(`/api/hr-tools?tenantId=${tenantId}&unitId=${queryUnitId}`);
      const data = await res.json();
      setAvailableTools(Array.isArray(data) ? data : []);
    } catch { /* silent */ }
  }, [tenantId, queryUnitId]);

  useEffect(() => {
    fetchDashboard();
    fetchBatches();
    fetchCapacity();
    fetchJobs();
    fetchTools();
  }, [currentUnit]);

  // Auto-refresh while processing + notificação ao concluir
  const prevProcessedRef = useRef<number>(-1);
  const processingToastRef = useRef<string | number | null>(null);

  // Polling global: roda independente da view enquanto houver lote em processamento
  useEffect(() => {
    const hasProcessing = batches.some(b => b.status === "processing" || b.status === "uploaded");
    if (!hasProcessing) return;

    const id = setInterval(() => {
      fetchBatches();
      if (view === "details" && selectedBatch) openBatchDetails(selectedBatch);
    }, 3500);
    return () => clearInterval(id);
  }, [batches, view, selectedBatch]);

  // Notificação ao concluir + dismiss do toast de aguarde
  useEffect(() => {
    if (!selectedBatch) return;
    const allDone = selectedBatch.total_files > 0 && selectedBatch.processed_files >= selectedBatch.total_files;

    if (allDone && prevProcessedRef.current !== selectedBatch.processed_files) {
      prevProcessedRef.current = selectedBatch.processed_files;
      if (processingToastRef.current !== null) {
        toast.dismiss(String(processingToastRef.current));
        processingToastRef.current = null;
      }
      const errors = selectedBatch.error_files || 0;
      pushNotif({
        type: errors > 0 ? "warning" : "success",
        title: `Lote "${selectedBatch.name}" concluído`,
        message: `${selectedBatch.created_candidates} candidatos gerados${errors > 0 ? `, ${errors} com falha` : " com sucesso"}.`,
      });
      toast.success(`✓ Lote "${selectedBatch.name}" processado — ${selectedBatch.created_candidates} candidatos gerados.`);
    }
  }, [selectedBatch]);

  // Limpar toast de processamento ao sair da view de detalhes
  useEffect(() => {
    if (view !== "details" && processingToastRef.current !== null) {
      toast.dismiss(String(processingToastRef.current));
      processingToastRef.current = null;
    }
  }, [view]);

  // ─── Batch actions ──────────────────────────────────────────────────────────

  const openBatchDetails = async (batch: ImportBatch) => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/imports/${batch.id}`);
      const data = await res.json();
      setSelectedBatch(data);
      setBatchFiles(Array.isArray(data.files) ? data.files : []);
      setView("details");
    } catch { toast.error("Falha ao carregar lote."); }
    finally { setIsLoading(false); }
  };

  const commitBatch = async (batchId: number) => {
    try {
      const res = await fetch(`/api/imports/${batchId}/commit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autoToolId }),
      });
      if (res.ok) {
        toast.success("Candidatos gerados com sucesso!");
        fetchBatches();
        fetchDashboard();
        setView("dashboard");
      }
    } catch { toast.error("Erro ao finalizar importação."); }
  };

  // ─── File actions ────────────────────────────────────────────────────────────

  const reprocessFile = async (fileId: number) => {
    try {
      await fetch(`/api/imports/files/${fileId}/reprocess`, { method: "POST" });
      toast.success("Reprocessamento iniciado!");
      setMenuOpenId(null);
      if (selectedBatch) openBatchDetails(selectedBatch);
    } catch { toast.error("Erro ao reprocessar arquivo."); }
  };

  const handleSaveFileData = async () => {
    if (!selectedFile || !editedFileData) return;
    try {
      const res = await fetch(`/api/imports/files/${selectedFile.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parsed_data_json: JSON.stringify(editedFileData) }),
      });
      if (res.ok) {
        toast.success("Dados atualizados!");
        setBatchFiles(prev => prev.map(f => f.id === selectedFile.id ? { ...f, parsed_data_json: JSON.stringify(editedFileData) } : f));
        setSelectedFile({ ...selectedFile, parsed_data_json: JSON.stringify(editedFileData) });
        setIsEditingFile(false);
      } else { toast.error("Falha ao salvar alterações."); }
    } catch { toast.error("Erro de conexão."); }
  };

  const fetchAiSuggestions = async (file: ImportFile) => {
    if (!file.parsed_data_json) return;
    setIsMatching(true);
    setAiSuggestions([]);
    try {
      const res = await fetch("/api/ai/match-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateProfile: JSON.parse(file.parsed_data_json), tenantId }),
      });
      const data = await res.json();
      setAiSuggestions(data.suggestions || []);
    } catch { /* silent */ } finally { setIsMatching(false); }
  };

  const handleOpenFileDetails = (file: ImportFile) => {
    setSelectedFile(file);
    setIsEditingFile(false);
    setEditedFileData(null);
    fetchAiSuggestions(file);
  };

  // ─── Delete ──────────────────────────────────────────────────────────────────

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    const { id, type } = deleteConfirm;
    try {
      if (type === "batch") {
        const res = await fetch(`/api/imports/${id}`, { method: "DELETE" });
        if (res.ok) {
          toast.success("Lote excluído!");
          fetchBatches(); fetchDashboard();
          if (selectedBatch?.id === id) setView("dashboard");
        }
      } else if (type === "file") {
        await fetch(`/api/imports/files/${id}`, { method: "DELETE" });
        toast.success("Arquivo removido!");
        if (selectedBatch) openBatchDetails(selectedBatch);
      } else {
        await Promise.all((id as number[]).map(fid => fetch(`/api/imports/files/${fid}`, { method: "DELETE" })));
        toast.success("Arquivos removidos!");
        setSelectedFileIds([]);
        if (selectedBatch) openBatchDetails(selectedBatch);
      }
    } catch { toast.error("Erro ao excluir."); }
    finally { setDeleteConfirm(null); }
  };

  // ─── Export ──────────────────────────────────────────────────────────────────

  const handleExportCSV = () => {
    if (!batchFiles.length) return;
    const rows = batchFiles.map(f => {
      const p = f.parsed_data_json ? JSON.parse(f.parsed_data_json) : {};
      return [f.file_name, f.status, p.name || "-", p.email || "-", f.compatibility_score || "0", p.phone || "-", p.city || "-"].join(",");
    });
    const csv = ["Arquivo,Status,Candidato,Email,Score,Telefone,Cidade", ...rows].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `lote_${selectedBatch?.id}.csv`, style: "display:none" });
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    toast.success("CSV exportado!");
  };

  // ─── Filters ─────────────────────────────────────────────────────────────────

  const filteredFiles = batchFiles.filter(f => {
    const p = f.parsed_data_json ? JSON.parse(f.parsed_data_json) : {};
    const q = searchTerm.toLowerCase();
    const matchSearch = !q || f.file_name.toLowerCase().includes(q) || (p.name && p.name.toLowerCase().includes(q)) || (p.email && p.email.toLowerCase().includes(q));
    const matchStatus = filterStatus === "all" || f.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const toggleSelect = (id: number) => setSelectedFileIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  const selectAll = () => setSelectedFileIds(selectedFileIds.length === filteredFiles.length ? [] : filteredFiles.map(f => f.id));

  // ─── Render: Dashboard ───────────────────────────────────────────────────────

  const renderDashboard = () => (
    <div className="space-y-5">
      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {[
          { label: "Arquivos",   value: stats?.total_files || 0,         icon: FileText,     color: "text-develoi-navy", bg: "bg-develoi-navy/8",   bar: "bg-develoi-navy" },
          { label: "Processados",value: stats?.processed_files || 0,      icon: Zap,          color: "text-sky-600",      bg: "bg-sky-50",           bar: "bg-sky-500" },
          { label: "Candidatos", value: stats?.created_candidates || 0,   icon: Users,        color: "text-emerald-600",  bg: "bg-emerald-50",       bar: "bg-emerald-500" },
          { label: "Duplicados", value: stats?.duplicate_files || 0,      icon: Copy,         color: "text-amber-600",    bg: "bg-amber-50",         bar: "bg-amber-400" },
          { label: "Erros",      value: stats?.error_files || 0,          icon: AlertCircle,  color: "text-rose-600",     bg: "bg-rose-50",          bar: "bg-rose-500" },
          { label: "Lotes",      value: batches.length,                   icon: Layers,       color: "text-violet-600",   bg: "bg-violet-50",        bar: "bg-violet-500" },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
            className="group relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
            <div className={cn("absolute -right-4 -top-4 h-14 w-14 rounded-full blur-xl opacity-50", s.bg)} />
            <div className="relative z-10">
              <div className={cn("mb-2.5 flex h-8 w-8 items-center justify-center rounded-lg", s.bg)}>
                <s.icon size={15} className={s.color} />
              </div>
              <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400">{s.label}</p>
              <p className={cn("text-[26px] font-black leading-none tabular-nums", s.color)}>{s.value}</p>
              <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-zinc-100">
                <div className={cn("h-full rounded-full", s.bar)} style={{ width: s.value > 0 ? "70%" : "0%" }} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-12">
        {/* Batch list */}
        <div className="space-y-4 lg:col-span-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[15px] font-bold text-zinc-900">Lotes de Importação</h2>
              <p className="text-[11px] text-zinc-400">Histórico de processamento estruturado pela Aurora IA</p>
            </div>
            <button
              onClick={() => { fetchBatches(); fetchDashboard(); }}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-400 transition-colors hover:border-zinc-300 hover:bg-white hover:text-zinc-700"
              title="Atualizar"
            >
              <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
            </button>
          </div>

          <div className="space-y-3">
            {isLoading ? (
              [1, 2, 3].map(i => <div key={i} className="h-20 animate-pulse rounded-2xl bg-zinc-100" />)
            ) : batches.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-zinc-200 bg-white py-16 shadow-sm">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400">
                  <Layers size={24} />
                </div>
                <div className="text-center">
                  <p className="text-[14px] font-semibold text-zinc-700">Nenhum lote ainda</p>
                  <p className="mt-1 text-[12px] text-zinc-400">Clique em "Novo Lote" para importar candidatos em massa.</p>
                </div>
                <button onClick={() => setShowNewBatch(true)}
                  className="flex items-center gap-1.5 rounded-xl bg-develoi-navy px-4 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-[#0a1e3a]">
                  <Plus size={13} /> Novo Lote
                </button>
              </div>
            ) : (
              <AnimatePresence>
                {batches.map((batch, idx) => {
                  const isProcessing = (batch.status === "processing" || batch.status === "uploaded") && batch.processed_files < batch.total_files;
                  const pct = batch.total_files > 0 ? Math.round((batch.processed_files / batch.total_files) * 100) : 0;
                  return (
                    <motion.div
                      key={batch.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      onClick={() => openBatchDetails(batch)}
                      className="group cursor-pointer overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-develoi-navy/30 hover:shadow-md"
                    >
                      {/* Progress bar top */}
                      {isProcessing && (
                        <div className="h-0.5 w-full bg-zinc-100">
                          <motion.div
                            className="h-full bg-develoi-gold"
                            initial={{ width: "0%" }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.5 }}
                          />
                        </div>
                      )}

                      <div className="flex items-center gap-4 p-4">
                        {/* Icon */}
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-50 text-zinc-400 transition-colors group-hover:bg-develoi-navy/8 group-hover:text-develoi-navy">
                          <Layers size={18} />
                        </div>

                        {/* Info */}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="truncate text-[13px] font-bold text-zinc-900">{batch.name}</h4>
                            <span className={cn(
                              "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                              batchStatusColor(batch.status, batch.processed_files, batch.total_files) === "success"  ? "bg-emerald-50 text-emerald-700" :
                              batchStatusColor(batch.status, batch.processed_files, batch.total_files) === "info"     ? "bg-sky-50 text-sky-700" :
                              batchStatusColor(batch.status, batch.processed_files, batch.total_files) === "danger"   ? "bg-rose-50 text-rose-700" :
                              "bg-amber-50 text-amber-700"
                            )}>
                              {batchStatusLabel(batch.status, batch.processed_files, batch.total_files)}
                            </span>
                            {batch.job_title && (
                              <span className="hidden items-center gap-1 rounded-lg bg-develoi-navy/5 px-2 py-0.5 text-[10px] font-medium text-develoi-navy sm:flex">
                                <Briefcase size={9} /> {batch.job_title}
                              </span>
                            )}
                            {isProcessing && (
                              <span className="flex items-center gap-1 text-[10px] font-medium text-sky-600">
                                <Loader2 size={10} className="animate-spin" /> {pct}%
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[10px] text-zinc-400">
                            <span className="flex items-center gap-1"><Clock size={9} />{new Date(batch.created_at).toLocaleDateString("pt-BR")}</span>
                            <span className="h-0.5 w-0.5 rounded-full bg-zinc-300" />
                            <span>{batch.total_files} arquivo{batch.total_files !== 1 ? "s" : ""}</span>
                          </div>
                        </div>

                        {/* Counters */}
                        <div className="hidden shrink-0 items-center gap-5 border-l border-zinc-100 pl-4 sm:flex">
                          <div className="text-center">
                            <p className="text-[15px] font-black text-emerald-600 tabular-nums">{batch.created_candidates}</p>
                            <p className="text-[9px] font-medium text-zinc-400">gerados</p>
                          </div>
                          {batch.duplicate_files > 0 && (
                            <div className="text-center">
                              <p className="text-[15px] font-black text-amber-500 tabular-nums">{batch.duplicate_files}</p>
                              <p className="text-[9px] font-medium text-zinc-400">duplic.</p>
                            </div>
                          )}
                          {batch.error_files > 0 && (
                            <div className="text-center">
                              <p className="text-[15px] font-black text-rose-500 tabular-nums">{batch.error_files}</p>
                              <p className="text-[9px] font-medium text-zinc-400">falhas</p>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex shrink-0 items-center gap-1.5" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => setDeleteConfirm({ id: batch.id, type: "batch", title: "Excluir este lote?" })}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-300 transition-colors hover:bg-rose-50 hover:text-rose-500"
                          >
                            <Trash2 size={13} />
                          </button>
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-50 text-zinc-400 transition-colors group-hover:bg-develoi-navy group-hover:text-white">
                            <ChevronRight size={14} />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4 lg:col-span-4">
          {/* CTA Aurora Engine */}
          <div className="relative overflow-hidden rounded-2xl bg-develoi-navy p-5">
            <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-develoi-gold/12 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-8 -left-8 h-28 w-28 rounded-full bg-sky-500/10 blur-3xl" />
            <div className="relative z-10">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-develoi-gold/20 ring-1 ring-develoi-gold/30">
                  <Cpu size={17} className="text-develoi-gold" />
                </div>
                <div>
                  <p className="text-[13px] font-bold text-white">Aurora Engine</p>
                  <p className="text-[10px] font-medium text-white/40">IA para extração de currículos</p>
                </div>
              </div>
              <p className="mb-4 text-[11px] leading-relaxed text-white/50">
                Envie até <span className="font-semibold text-white/70">{capacity.max_files_per_batch} currículos</span> por lote. A IA extrai nome, e-mail, cargo, experiências e skills automaticamente.
              </p>
              <button
                onClick={() => setShowNewBatch(true)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-develoi-gold py-2.5 text-[12px] font-bold text-develoi-navy shadow-lg shadow-develoi-gold/20 transition-all hover:bg-[#d4a83a]"
              >
                <Plus size={14} /> Novo Lote de Importação
              </button>
            </div>
          </div>

          {/* Capacidade do plano */}
          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div className="flex items-center gap-2.5 border-b border-zinc-100 px-4 py-3.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-develoi-navy/8">
                <Target size={13} className="text-develoi-navy" />
              </div>
              <span className="text-[13px] font-bold text-zinc-900">Capacidade do Plano</span>
            </div>
            <div className="space-y-4 p-4">
              {[
                { label: "Arquivos por lote", value: `${capacity.max_files_per_batch}`,    bar: "bg-develoi-gold",  pct: 60 },
                { label: "Tamanho máx. / arquivo", value: `${capacity.max_file_size_mb} MB`, bar: "bg-emerald-500", pct: 40 },
                { label: "Total por lote", value: `${capacity.max_total_size_mb} MB`,       bar: "bg-sky-500",      pct: 50 },
              ].map(c => (
                <div key={c.label}>
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-400">{c.label}</span>
                    <span className="text-[13px] font-bold text-zinc-800">{c.value}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100">
                    <div className={cn("h-full rounded-full", c.bar)} style={{ width: `${c.pct}%` }} />
                  </div>
                </div>
              ))}
              <div className="border-t border-zinc-100 pt-3">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-400">Formatos aceitos</p>
                <div className="flex flex-wrap gap-1.5">
                  {capacity.supported_extensions.map(ext => (
                    <span key={ext} className="rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] font-semibold text-zinc-500 uppercase">{ext}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Métricas */}
          {stats && (
            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
              <div className="flex items-center gap-2.5 border-b border-zinc-100 px-4 py-3.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-develoi-navy/8">
                  <TrendingUp size={13} className="text-develoi-navy" />
                </div>
                <span className="text-[13px] font-bold text-zinc-900">Métricas Gerais</span>
              </div>
              <div className="divide-y divide-zinc-50 p-1">
                {[
                  { label: "Taxa de sucesso",   value: stats.total_files > 0 ? `${Math.round((stats.processed_files / stats.total_files) * 100)}%` : "—", color: "text-emerald-600" },
                  { label: "Total processados", value: stats.processed_files || 0, color: "text-develoi-navy" },
                  { label: "Candidatos gerados",value: stats.created_candidates || 0, color: "text-develoi-gold" },
                ].map(m => (
                  <div key={m.label} className="flex items-center justify-between px-3 py-3">
                    <span className="text-[11px] font-medium text-zinc-500">{m.label}</span>
                    <span className={cn("text-[16px] font-black tabular-nums", m.color)}>{m.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // ─── Modal: Como funciona ─────────────────────────────────────────────────────

  const [showHelp, setShowHelp] = useState(false);

  const HowItWorksButton = () => (
    <>
      <button
        type="button"
        onClick={() => setShowHelp(true)}
        className="flex h-8 items-center gap-1.5 rounded-lg border border-white/15 bg-white/8 px-3 text-[11px] font-medium text-white/70 transition-all hover:bg-white/12 hover:text-white"
      >
        <HelpCircle size={13} />
        <span className="hidden sm:inline">Como funciona?</span>
      </button>
      <Modal
        open={showHelp}
        onClose={() => setShowHelp(false)}
        title="Como funciona a importação em lote"
        description="Entenda cada etapa do processo Aurora IA"
        icon={<HelpCircle size={20} />}
        size="lg"
        footer={
          <Button variant="primary" fullWidth onClick={() => setShowHelp(false)}>
            Entendido!
          </Button>
        }
      >
        <div className="space-y-4 pt-1">
          {[
            {
              step: "1",
              color: "bg-develoi-navy",
              title: "Upload dos Currículos",
              desc: "Você enviou os arquivos PDF, DOCX ou TXT. A Aurora IA recebeu todos e iniciou o processamento paralelo.",
            },
            {
              step: "2",
              color: "bg-blue-600",
              title: "Extração e Estruturação pela IA",
              desc: "Para cada currículo, a IA extrai nome, e-mail, telefone, cargo, experiências, formação, skills e outros dados. Tudo é salvo como um perfil estruturado.",
            },
            {
              step: "3",
              color: "bg-amber-500",
              title: "Revisão dos Perfis",
              desc: "Agora é a sua vez! Clique no ícone de olho em cada candidato para visualizar e verificar os dados extraídos. Você pode editar campos incorretos antes de efetivar.",
            },
            {
              step: "4",
              color: "bg-emerald-600",
              title: "Efetivar o Lote",
              desc: "Ao clicar em \"Efetivar Lote\", todos os candidatos revisados são criados oficialmente no banco de talentos da plataforma, prontos para aparecer nas Matches e candidaturas.",
            },
          ].map(s => (
            <div key={s.step} className="flex gap-4">
              <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-white font-black text-sm", s.color)}>
                {s.step}
              </div>
              <div className="flex-1 pt-0.5">
                <p className="text-sm font-black text-zinc-900 mb-1">{s.title}</p>
                <p className="text-xs font-medium text-zinc-500 leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}

          <div className="mt-2 p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-3">
            <Info size={16} className="text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs font-medium text-amber-700 leading-relaxed">
              <span className="font-black">Atenção:</span> candidatos <strong>duplicados</strong> são sinalizados automaticamente. Você pode revisá-los antes de efetivar para evitar dados duplicados no banco.
            </p>
          </div>
        </div>
      </Modal>
    </>
  );

  // ─── Render: Details ─────────────────────────────────────────────────────────

  const renderDetails = () => {
    const allDone = (selectedBatch?.total_files || 0) > 0 && (selectedBatch?.processed_files || 0) >= (selectedBatch?.total_files || 0);
    const isProcessing = (selectedBatch?.status === "processing" || selectedBatch?.status === "uploaded") && !allDone;
    const canCommit = selectedBatch?.status === "completed" || (selectedBatch?.status === "processing" && allDone);

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
        {/* Actions bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2">
            <button onClick={handleExportCSV} title="Exportar CSV"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-400 transition-colors hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-700">
              <Download size={14} />
            </button>
            <button onClick={() => selectedBatch && openBatchDetails(selectedBatch)} title="Atualizar"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-400 transition-colors hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-700">
              <RefreshCw size={14} />
            </button>
            {selectedBatch?.status !== "processing" && (
              <button
                onClick={() => { setAddQueue([]); setShowAddFiles(true); }}
                className="flex h-8 items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-[12px] font-medium text-zinc-600 transition-colors hover:border-develoi-navy/30 hover:bg-white hover:text-develoi-navy"
              >
                <Plus size={13} /> Adicionar CVs
              </button>
            )}
          </div>

          {canCommit && (
            <div className="flex items-center gap-3">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-wider text-zinc-400">Avaliação automática</p>
                <select
                  value={autoToolId}
                  onChange={e => setAutoToolId(e.target.value)}
                  className="bg-transparent text-[11px] font-medium text-develoi-navy outline-none cursor-pointer"
                >
                  <option value="none">Sem avaliação</option>
                  {availableTools.map(t => <option key={t.id} value={t.id}>Enviar {t.name}</option>)}
                </select>
              </div>
              <button
                onClick={() => commitBatch(selectedBatch!.id)}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-[12px] font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
              >
                <CheckCircle2 size={14} /> Efetivar Lote
              </button>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: "Processados",   value: selectedBatch?.processed_files || 0,  sub: `de ${selectedBatch?.total_files || 0}`, color: "text-sky-600",     bg: "bg-sky-50",     bar: "bg-sky-500",     icon: Zap },
            { label: "Novos Talentos",value: selectedBatch?.created_candidates || 0, sub: "candidatos gerados",                   color: "text-emerald-600", bg: "bg-emerald-50", bar: "bg-emerald-500", icon: Users },
            { label: "Duplicados",    value: selectedBatch?.duplicate_files || 0,  sub: "identificados",                          color: "text-amber-600",   bg: "bg-amber-50",   bar: "bg-amber-400",   icon: Copy },
            { label: "Falhas",        value: selectedBatch?.error_files || 0,       sub: "com erro",                               color: "text-rose-600",    bg: "bg-rose-50",    bar: "bg-rose-500",    icon: AlertCircle },
          ].map((s, i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <div className={cn("mb-2.5 flex h-8 w-8 items-center justify-center rounded-lg", s.bg)}>
                <s.icon size={15} className={s.color} />
              </div>
              <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400">{s.label}</p>
              <p className={cn("text-[26px] font-black leading-none tabular-nums", s.color)}>{s.value}</p>
              {s.sub && <p className="mt-1 text-[10px] font-medium text-zinc-400">{s.sub}</p>}
            </div>
          ))}
        </div>

        {/* Banner: próximo passo → efetivar lote */}
        <AnimatePresence>
          {canCommit && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="relative overflow-hidden rounded-3xl bg-develoi-navy p-6 shadow-2xl shadow-develoi-navy/20"
            >
              <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "18px 18px" }} />
              <div className="absolute top-0 right-0 w-56 h-56 bg-develoi-gold/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
              <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-5">
                <div className="w-12 h-12 bg-develoi-gold rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-develoi-gold/30">
                  <PartyPopper size={22} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-black text-white tracking-tight">
                    Lote processado! Revise os currículos e efetive o lote.
                  </p>
                  <p className="text-[11px] text-white/60 font-medium mt-1 leading-relaxed">
                    {selectedBatch?.created_candidates} candidato{selectedBatch?.created_candidates !== 1 ? "s" : ""} aguardando confirmação.
                    Clique em <span className="text-develoi-gold font-black">Efetivar Lote</span> para criar os perfis no banco de talentos.
                    {selectedBatch?.error_files ? ` · ${selectedBatch.error_files} arquivo(s) com falha — reprocesse ou ignore.` : ""}
                  </p>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  <HowItWorksButton />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress bar when processing */}
        {isProcessing && (
          <div className="bg-develoi-navy/5 border border-develoi-navy/10 rounded-2xl px-6 py-4 flex items-center gap-4">
            <Loader2 size={18} className="animate-spin text-develoi-navy shrink-0" />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-black text-develoi-navy uppercase tracking-widest">Processando com Aurora IA...</span>
                <span className="text-[10px] font-black text-develoi-navy">
                  {selectedBatch?.processed_files}/{selectedBatch?.total_files}
                </span>
              </div>
              <div className="h-1.5 bg-develoi-navy/10 rounded-full overflow-hidden">
                <motion.div
                  animate={{ width: `${selectedBatch?.total_files ? (selectedBatch.processed_files / selectedBatch.total_files) * 100 : 0}%` }}
                  transition={{ duration: 0.8 }}
                  className="h-full bg-develoi-navy rounded-full"
                />
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <PanelCard
          padding={false}
          className="shadow-xl shadow-zinc-200/30 border-zinc-100"
          title="Arquivos do Lote"
          icon={Database}
          action={
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                <input
                  placeholder="Buscar candidato..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="h-9 pl-8 pr-3 w-44 rounded-xl bg-zinc-50 border border-zinc-100 text-xs font-bold text-zinc-700 placeholder:text-zinc-300 outline-none focus:border-develoi-navy/30 focus:bg-white transition-all"
                />
              </div>
              <div className="flex rounded-xl border border-zinc-100 overflow-hidden bg-zinc-50">
                {[
                  { value: "all", label: "Todos" },
                  { value: "completed", label: "Sucesso" },
                  { value: "error", label: "Falha" },
                  { value: "duplicate", label: "Duplic." },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setFilterStatus(opt.value)}
                    className={cn(
                      "h-9 px-3 text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                      filterStatus === opt.value
                        ? "bg-develoi-navy text-white"
                        : "text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          }
        >
          {/* Bulk bar */}
          <AnimatePresence>
            {selectedFileIds.length > 0 && (
              <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden bg-zinc-900">
                <div className="px-8 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">{selectedFileIds.length} selecionados</span>
                    <button onClick={selectAll} className="text-[10px] font-black text-develoi-gold uppercase tracking-widest hover:text-white">
                      {selectedFileIds.length === filteredFiles.length ? "Desmarcar tudo" : "Selecionar tudo"}
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button size="sm" onClick={() => { setDeleteConfirm({ id: selectedFileIds, type: "bulk", title: `Excluir ${selectedFileIds.length} arquivos?` }); }} className="h-9 px-5 bg-rose-500 text-white rounded-xl text-[9px]" iconLeft={<Trash2 size={13} />}>
                      Excluir
                    </Button>
                    <IconButton onClick={() => setSelectedFileIds([])} className="h-9 w-9 text-zinc-400 hover:text-white"><X size={16} /></IconButton>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-0">
              <thead>
                <tr className="bg-zinc-50/50">
                  <th className="px-6 py-4 border-b border-zinc-100 w-10">
                    <div
                      onClick={selectAll}
                      className={cn("w-5 h-5 rounded-md border-2 cursor-pointer flex items-center justify-center transition-all", selectedFileIds.length === filteredFiles.length && filteredFiles.length > 0 ? "bg-develoi-navy border-develoi-navy" : "border-zinc-200 bg-white")}
                    >
                      {selectedFileIds.length === filteredFiles.length && filteredFiles.length > 0 && <Check size={11} className="text-white" strokeWidth={4} />}
                    </div>
                  </th>
                  {["Arquivo", "Status", "Candidato", "Score", "Tags", ""].map((h, i) => (
                    <th key={i} className={cn("px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-100", i === 5 ? "text-right" : "text-left")}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredFiles.length === 0 ? (
                  <tr><td colSpan={7} className="py-24 text-center">
                    <div className="flex flex-col items-center gap-4 opacity-25">
                      <Database size={40} />
                      <p className="text-[11px] font-black uppercase tracking-widest">{searchTerm ? "Nenhum resultado" : "Nenhum arquivo no lote"}</p>
                    </div>
                  </td></tr>
                ) : filteredFiles.map(file => {
                  const p = file.parsed_data_json ? JSON.parse(file.parsed_data_json) : null;
                  const sel = selectedFileIds.includes(file.id);
                  return (
                    <tr key={file.id} className={cn("transition-all group", sel ? "bg-develoi-navy/5" : "hover:bg-zinc-50/50")}>
                      <td className="px-6 py-5">
                        <div onClick={() => toggleSelect(file.id)} className={cn("w-5 h-5 rounded-md border-2 cursor-pointer flex items-center justify-center transition-all", sel ? "bg-develoi-navy border-develoi-navy" : "border-zinc-200 bg-white group-hover:border-zinc-400")}>
                          {sel && <Check size={11} className="text-white" strokeWidth={4} />}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-11 h-11 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-400 group-hover:bg-zinc-900 group-hover:text-white transition-all shrink-0">
                            <FileText size={18} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-black text-zinc-800 truncate max-w-[200px] tracking-tight">{file.file_name}</p>
                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{fmtBytes(file.file_size)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        {file.status === "processing" ? (
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-develoi-navy/5 rounded-xl border border-develoi-navy/10 w-fit">
                            <div className="w-3 h-3 rounded-full border-2 border-develoi-navy border-t-transparent animate-spin" />
                            <span className="text-[9px] font-black text-develoi-navy uppercase tracking-widest">{file.progress || 0}%</span>
                          </div>
                        ) : file.status === "uploaded" || file.status === "pending" ? (
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-50 rounded-xl border border-zinc-100 w-fit">
                            <div className="w-3 h-3 rounded-full border-2 border-zinc-300 border-t-transparent animate-spin" />
                            <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Aguardando</span>
                          </div>
                        ) : file.status === "completed" || file.status === "committed" ? (
                          <Badge color="success" size="sm">Sucesso</Badge>
                        ) : file.status === "duplicate" ? (
                          <Badge color="warning" size="sm">Duplicado</Badge>
                        ) : file.status === "error" ? (
                          <Badge color="danger" size="sm">Falha</Badge>
                        ) : (
                          <Badge color="warning" size="sm">{file.status}</Badge>
                        )}
                      </td>
                      <td className="px-6 py-5">
                        {p ? (
                          <div>
                            <p className="text-sm font-black text-zinc-900 group-hover:text-develoi-gold transition-colors tracking-tight">{p.name || "—"}</p>
                            <p className="text-[10px] font-bold text-zinc-400 mt-0.5">{p.email || ""}</p>
                          </div>
                        ) : <div className="w-24 h-3 bg-zinc-100 rounded-full animate-pulse" />}
                      </td>
                      <td className="px-6 py-5">
                        {file.compatibility_score != null ? (
                          <div className="flex items-center gap-3">
                            <div className="w-20 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }} animate={{ width: `${file.compatibility_score}%` }} transition={{ duration: 0.8 }}
                                className={cn("h-full", file.compatibility_score >= 80 ? "bg-emerald-500" : file.compatibility_score >= 50 ? "bg-amber-400" : "bg-rose-400")}
                              />
                            </div>
                            <span className="text-[11px] font-black text-zinc-900">{file.compatibility_score}%</span>
                          </div>
                        ) : <span className="text-[10px] font-black text-zinc-300">N/A</span>}
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex gap-1.5 flex-wrap">
                          {file.duplicate_status && file.duplicate_status !== "none" && <Badge color="warning" size="sm">Duplicidade</Badge>}
                          {file.status === "error" && <Badge color="danger" size="sm">Erro IA</Badge>}
                          {p?.seniority && <Badge color="info" size="sm">{p.seniority}</Badge>}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <IconButton onClick={() => handleOpenFileDetails(file)} variant="outline" className="h-10 w-10 rounded-xl border-zinc-100 text-zinc-400 hover:text-develoi-navy">
                            <Eye size={16} />
                          </IconButton>
                          <div className="relative">
                            <IconButton
                              onClick={e => {
                                const r = e.currentTarget.getBoundingClientRect();
                                const menuH = 112;
                                const spaceBelow = window.innerHeight - r.bottom;
                                const openUp = spaceBelow < menuH + 16;
                                setMenuPosition({
                                  top: openUp ? r.top - menuH - 6 : r.bottom + 6,
                                  left: r.right - 208,
                                });
                                setMenuOpenId(menuOpenId === file.id ? null : file.id);
                              }}
                              className={cn("h-10 w-10 rounded-xl transition-all", menuOpenId === file.id ? "bg-zinc-900 text-white" : "bg-white border border-zinc-100 text-zinc-400 hover:text-zinc-900")}
                            >
                              <MoreVertical size={16} />
                            </IconButton>
                            {menuOpenId === file.id && menuPosition && createPortal(
                              <>
                                <div className="fixed inset-0 z-[160]" onClick={() => setMenuOpenId(null)} />
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  style={{ top: menuPosition.top, left: menuPosition.left }}
                                  className="fixed w-52 bg-white border border-zinc-100 rounded-2xl shadow-2xl z-[170] py-2 overflow-hidden"
                                >
                                  <button onClick={() => { reprocessFile(file.id); setMenuOpenId(null); }} className="w-full px-5 py-3.5 text-left text-[11px] font-black uppercase tracking-widest text-zinc-600 hover:bg-zinc-50 hover:text-develoi-navy flex items-center gap-3">
                                    <RefreshCw size={14} /> Reprocessar IA
                                  </button>
                                  <button onClick={() => { setDeleteConfirm({ id: file.id, type: "file", title: "Remover arquivo?" }); setMenuOpenId(null); }} className="w-full px-5 py-3.5 text-left text-[11px] font-black uppercase tracking-widest text-rose-500 hover:bg-rose-50 flex items-center gap-3">
                                    <Trash2 size={14} /> Remover
                                  </button>
                                </motion.div>
                              </>,
                              document.body
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </PanelCard>
      </motion.div>
    );
  };

  // ─── Modal: Novo Lote ────────────────────────────────────────────────────────

  const nbEnqueue = (files: File[]) => {
    const supported = new Set(capacity.supported_extensions.map(e => e.toLowerCase()));
    let blocked = 0;
    const next = [...nbQueue];
    for (const f of files) {
      const ext = `.${f.name.split(".").pop()?.toLowerCase() || ""}`;
      if (!supported.has(ext)) { blocked++; continue; }
      if (f.size > capacity.max_file_size_bytes) { toast.error(`${f.name} excede ${capacity.max_file_size_mb}MB`); continue; }
      if (next.length >= capacity.max_files_per_batch) { toast.info(`Limite de ${capacity.max_files_per_batch} arquivos atingido.`); break; }
      next.push({ file: f, progress: 0, status: "pending" });
    }
    if (blocked) toast.error(`${blocked} arquivo(s) com formato não suportado.`);
    setNbQueue(next);
  };

  const nbSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nbForm.name.trim()) { toast.error("Informe um nome para o lote."); return; }
    if (nbQueue.length === 0) { toast.error("Adicione pelo menos um arquivo."); return; }

    setNbProcessing(true);
    const loadId = toast.loading("Criando lote e enviando arquivos...");

    try {
      const batchRes = await fetch("/api/imports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...nbForm, tenant_id: tenantId, unit_id: currentUnit.id, import_type: "mixed" }),
      });
      if (!batchRes.ok) throw new Error("Falha ao criar lote");
      const batchData = await batchRes.json();
      const batchId = batchData.id;

      const uploadForm = new FormData();
      nbQueue.forEach(item => uploadForm.append("files", item.file));
      const uploadRes = await fetch(`/api/imports/${batchId}/files`, { method: "POST", body: uploadForm });
      if (!uploadRes.ok) throw new Error("Falha no upload");

      fetch(`/api/imports/${batchId}/start`, { method: "POST" });

      toast.dismiss(loadId);
      processingToastRef.current = toast.loading(`Aurora IA processando "${nbForm.name}"... (${nbQueue.length} arquivo${nbQueue.length !== 1 ? "s" : ""})`, 3000);
      pushNotif({
        type: "info",
        title: `Lote "${nbForm.name}" enviado`,
        message: `${nbQueue.length} arquivo${nbQueue.length !== 1 ? "s" : ""} enviado${nbQueue.length !== 1 ? "s" : ""} para processamento pela Aurora IA.`,
      });
      setShowNewBatch(false);
      setNbForm({ name: "", job_id: "", analysis_mode: "full", duplicate_strategy: "manual" });
      setNbQueue([]);
      fetchBatches();
      fetchDashboard();

      openBatchDetails({ ...batchData, status: "uploaded", total_files: nbQueue.length, processed_files: 0, created_candidates: 0, duplicate_files: 0, error_files: 0 });
    } catch (err: any) {
      toast.dismiss(loadId);
      toast.error(err.message || "Erro ao iniciar importação.");
    } finally {
      setNbProcessing(false);
    }
  };

  const nbTotalBytes = nbQueue.reduce((s, i) => s + i.file.size, 0);
  const nbUsagePct = Math.min((nbQueue.length / capacity.max_files_per_batch) * 100, 100);

  // ─── Add Files to Existing Batch ────────────────────────────────────────────

  const addEnqueue = (files: File[]) => {
    const supported = new Set(capacity.supported_extensions.map(e => e.toLowerCase()));
    const next = [...addQueue];
    for (const f of files) {
      const ext = `.${f.name.split(".").pop()?.toLowerCase() || ""}`;
      if (!supported.has(ext)) { toast.error(`${f.name}: formato não suportado`); continue; }
      if (f.size > capacity.max_file_size_bytes) { toast.error(`${f.name} excede ${capacity.max_file_size_mb}MB`); continue; }
      const alreadyIn = next.some(x => x.name === f.name && x.size === f.size);
      if (!alreadyIn) next.push(f);
    }
    setAddQueue(next);
  };

  const handleAddFilesSubmit = async () => {
    if (!selectedBatch || addQueue.length === 0) return;
    setAddProcessing(true);
    const loadId = toast.loading(`Enviando ${addQueue.length} arquivo(s)...`);
    try {
      const form = new FormData();
      addQueue.forEach(f => form.append("files", f));
      const res = await fetch(`/api/imports/${selectedBatch.id}/files`, { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha no upload");

      // restart processing for the new files
      fetch(`/api/imports/${selectedBatch.id}/start`, { method: "POST" });

      toast.dismiss(loadId);
      toast.success(`${addQueue.length} currículo(s) adicionado(s) e processamento reiniciado!`);
      setShowAddFiles(false);
      setAddQueue([]);
      openBatchDetails(selectedBatch);
    } catch (err: any) {
      toast.dismiss(loadId);
      toast.error(err.message || "Erro ao adicionar arquivos.");
    } finally {
      setAddProcessing(false);
    }
  };

  const renderAddFilesModal = () => (
    <Modal
      open={showAddFiles}
      onClose={() => !addProcessing && setShowAddFiles(false)}
      title="Adicionar CVs ao Lote"
      icon={<Plus size={20} />}
      description={`Adicione mais currículos ao lote "${selectedBatch?.name}". Eles serão processados pela Aurora IA.`}
    >
      <div className="space-y-5 pt-2">
        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setAddDragging(true); }}
          onDragLeave={() => setAddDragging(false)}
          onDrop={e => { e.preventDefault(); setAddDragging(false); addEnqueue(Array.from(e.dataTransfer.files)); }}
          onClick={() => addFileInputRef.current?.click()}
          className={cn(
            "border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all",
            addDragging ? "border-develoi-gold bg-develoi-gold/5 scale-[0.99]" : "border-zinc-200 hover:border-develoi-navy/40 hover:bg-zinc-50/50"
          )}
        >
          <input
            ref={addFileInputRef}
            type="file"
            multiple
            accept=".pdf,.docx,.txt,.csv,.xls,.xlsx"
            className="hidden"
            onChange={e => { if (e.target.files) addEnqueue(Array.from(e.target.files)); e.target.value = ""; }}
          />
          <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center transition-all", addDragging ? "bg-develoi-gold text-white" : "bg-zinc-100 text-zinc-400")}>
            <Upload size={26} />
          </div>
          <div className="text-center">
            <p className="text-sm font-black text-zinc-700 uppercase tracking-tight">Arraste os currículos aqui</p>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">ou clique para selecionar • PDF, DOCX, XLS, TXT</p>
          </div>
        </div>

        {/* File list */}
        {addQueue.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{addQueue.length} arquivo(s) selecionado(s)</span>
              <button onClick={() => setAddQueue([])} className="text-[10px] font-bold text-red-400 hover:text-red-600 uppercase tracking-widest">Limpar</button>
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
              {addQueue.map((f, i) => (
                <div key={i} className="flex items-center justify-between gap-3 p-2.5 bg-zinc-50 border border-zinc-100 rounded-xl">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileText size={14} className="text-zinc-400 shrink-0" />
                    <span className="text-xs font-bold text-zinc-700 truncate">{f.name}</span>
                    <span className="text-[10px] text-zinc-400 shrink-0">{fmtBytes(f.size)}</span>
                  </div>
                  <button onClick={() => setAddQueue(q => q.filter((_, idx) => idx !== i))} className="text-zinc-300 hover:text-red-500 transition-colors shrink-0">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <Button variant="ghost" fullWidth onClick={() => setShowAddFiles(false)} disabled={addProcessing}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            fullWidth
            onClick={handleAddFilesSubmit}
            loading={addProcessing}
            disabled={addQueue.length === 0}
            iconLeft={!addProcessing && <Zap size={16} />}
          >
            {addProcessing ? "Enviando..." : `Enviar ${addQueue.length > 0 ? addQueue.length : ""} CV(s)`}
          </Button>
        </div>
      </div>
    </Modal>
  );

  const renderNewBatchModal = () => (
    <Modal open={showNewBatch} onClose={() => !nbProcessing && setShowNewBatch(false)} title="Novo Lote de Importação" icon={<Layers size={22} />} description="Configure o lote e faça o upload dos currículos para processamento via Aurora IA.">
      <form onSubmit={nbSubmit} className="space-y-6 pt-2">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2 space-y-2">
            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Nome do Lote *</label>
            <Input
              required
              value={nbForm.name}
              onChange={e => setNbForm(p => ({ ...p, name: e.target.value }))}
              placeholder="Ex: Talentos Maio 2026"
              className="h-12 rounded-2xl bg-zinc-50 border-zinc-100 font-bold"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Vincular Vaga</label>
            <Select value={nbForm.job_id} onChange={e => setNbForm(p => ({ ...p, job_id: e.target.value }))} className="h-12 rounded-2xl bg-zinc-50 border-zinc-100 font-bold">
              <option value="">Banco Geral (sem vaga)</option>
              {availableJobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Modo de Análise</label>
            <Select value={nbForm.analysis_mode} onChange={e => setNbForm(p => ({ ...p, analysis_mode: e.target.value }))} className="h-12 rounded-2xl bg-zinc-50 border-zinc-100 font-bold">
              <option value="extraction">Extração Simples</option>
              <option value="creation">Full Parsing</option>
              <option value="full">Neural Match (Parsing + Score)</option>
            </Select>
          </div>
          <div className="sm:col-span-2 space-y-2">
            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Política de Duplicados</label>
            <Select value={nbForm.duplicate_strategy} onChange={e => setNbForm(p => ({ ...p, duplicate_strategy: e.target.value }))} className="h-12 rounded-2xl bg-zinc-50 border-zinc-100 font-bold">
              <option value="manual">Sinalizar para revisão</option>
              <option value="ignore">Ignorar (manter atual)</option>
              <option value="update">Merge (atualizar dados)</option>
            </Select>
          </div>
        </div>

        <div
          onDragOver={e => { e.preventDefault(); setNbDragging(true); }}
          onDragLeave={() => setNbDragging(false)}
          onDrop={e => { e.preventDefault(); setNbDragging(false); nbEnqueue(Array.from(e.dataTransfer.files)); }}
          onClick={() => nbFileInputRef.current?.click()}
          className={cn(
            "border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all",
            nbDragging ? "border-develoi-gold bg-develoi-gold/5 scale-[0.99]" : "border-zinc-200 hover:border-develoi-navy/40 hover:bg-zinc-50/50"
          )}
        >
          <input ref={nbFileInputRef} type="file" multiple accept=".pdf,.docx,.txt,.csv,.xls,.xlsx" className="hidden" onChange={e => { if (e.target.files) nbEnqueue(Array.from(e.target.files)); e.target.value = ""; }} />
          <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center transition-all", nbDragging ? "bg-develoi-gold text-white" : "bg-zinc-100 text-zinc-400")}>
            <Upload size={28} />
          </div>
          <div className="text-center">
            <p className="text-sm font-black text-zinc-700 uppercase tracking-tight">Arraste os currículos aqui</p>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">ou clique para selecionar • PDF, DOCX, XLS, TXT</p>
          </div>
        </div>

        <AnimatePresence>
          {nbQueue.length > 0 && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="space-y-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{nbQueue.length} arquivo(s) • {fmtBytes(nbTotalBytes)}</span>
                <span className="text-[10px] font-black text-zinc-500">{nbQueue.length}/{capacity.max_files_per_batch}</span>
              </div>
              <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden mb-4">
                <motion.div animate={{ width: `${nbUsagePct}%` }} className={cn("h-full rounded-full", nbUsagePct >= 90 ? "bg-rose-500" : nbUsagePct >= 70 ? "bg-amber-400" : "bg-emerald-500")} />
              </div>
              <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
                {nbQueue.map((item, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="flex items-center gap-3 p-3 bg-zinc-50 rounded-2xl border border-zinc-100 group">
                    <div className="w-9 h-9 rounded-xl bg-white border border-zinc-100 flex items-center justify-center text-zinc-400 shrink-0">
                      <FileText size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-zinc-800 truncate">{item.file.name}</p>
                      <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">{fmtBytes(item.file.size)}</p>
                    </div>
                    {item.status === "pending" && (
                      <button type="button" onClick={() => setNbQueue(prev => prev.filter((_, idx) => idx !== i))} className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg flex items-center justify-center text-zinc-300 hover:text-rose-500 hover:bg-rose-50 transition-all">
                        <X size={14} />
                      </button>
                    )}
                    {item.status === "done" && <Check size={16} className="text-emerald-500 shrink-0" />}
                    {item.status === "error" && <AlertCircle size={16} className="text-rose-500 shrink-0" />}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-start gap-3 p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
          <Shield size={16} className="text-develoi-gold shrink-0 mt-0.5" />
          <p className="text-[10px] font-bold text-zinc-500 leading-relaxed uppercase tracking-widest">
            Dados criptografados em repouso e em trânsito. Conformidade total com LGPD. A IA não usa seus dados para treinamento público.
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" onClick={() => setShowNewBatch(false)} className="flex-1 h-13 rounded-2xl border-zinc-200" disabled={nbProcessing}>
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={nbProcessing || nbQueue.length === 0}
            className="flex-1 h-13 rounded-2xl shadow-xl shadow-develoi-navy/20"
            iconLeft={nbProcessing ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} />}
          >
            {nbProcessing ? "Enviando..." : `Iniciar Processamento (${nbQueue.length} arquivo${nbQueue.length !== 1 ? "s" : ""})`}
          </Button>
        </div>
      </form>
    </Modal>
  );

  // ─── Modal: File detail ───────────────────────────────────────────────────────

  const FileDetailModal = () => {
    if (!selectedFile) return null;
    const parsed = selectedFile.parsed_data_json ? JSON.parse(selectedFile.parsed_data_json) : null;

    const statusLabel: Record<string, string> = {
      completed: "Concluído", committed: "Efetivado", error: "Falha",
      duplicate: "Duplicado", processing: "Processando", uploaded: "Aguardando", pending: "Pendente",
    };
    const statusColor: Record<string, "success"|"danger"|"warning"|"info"> = {
      completed: "success", committed: "success", error: "danger",
      duplicate: "warning", processing: "info", uploaded: "info", pending: "warning",
    };

    const FIELD_LABELS: Record<string, string> = {
      // Identificação
      name: "Nome", email: "E-mail", phone: "Telefone", cpf: "CPF",
      age: "Idade", gender: "Gênero", nationality: "Nacionalidade",
      birth_date: "Data de Nascimento",
      // Localização
      city: "Cidade", state: "Estado", location: "Localização", address: "Endereço",
      // Profissional
      role: "Cargo Atual", current_title: "Título Atual", current_company: "Empresa Atual",
      experience_years: "Experiência (anos)", seniority: "Senioridade",
      desired_position: "Cargo Desejado", objective: "Objetivo Profissional",
      // Contato/redes
      linkedin: "LinkedIn", portfolio: "Portfólio",
      // Remuneração
      desired_salary: "Pretensão Salarial",
      // Contratação
      work_model: "Modelo de Trabalho", contract_type: "Tipo de Contrato",
      availability: "Disponibilidade", cnh: "CNH",
      // Formação
      education: "Escolaridade", education_level: "Nível de Escolaridade",
      academic_education: "Formação Acadêmica",
      // Idiomas / certs
      languages: "Idiomas", certifications: "Certificações",
      courses_certifications: "Cursos e Certificações",
      // Outros
      highlights: "Destaques", soft_skills: "Soft Skills",
      professional_experiences: "Experiências Profissionais",
      objectives_list: "Objetivos",
    };

    // Campos que devem ser ocultados da grade (exibidos em seções próprias ou redundantes)
    const HIDDEN_FIELDS = new Set([
      "skills", "summary", "strengths", "attention_points", "compatibility_score",
      "recommendation", "experiences_list", "education_list", "projects_list",
      "languages_list", "certifications_list", "certifications",
      "soft_skills_list", "objectives_list", "soft_skills",
    ]);

    // Converte qualquer valor de campo para string legível
    function fieldToString(v: any): string | null {
      if (v === null || v === undefined || v === "") return null;
      if (typeof v === "number") return v === 0 ? null : String(v);
      if (typeof v === "string") return v || null;
      if (Array.isArray(v)) {
        if (v.length === 0) return null;
        // Array de objetos: tenta extrair campo textual comum
        if (typeof v[0] === "object" && v[0] !== null) {
          return v.map((item: any) =>
            item.name || item.title || item.course || item.institution ||
            item.description || item.value || Object.values(item).filter(x => typeof x === "string")[0] || ""
          ).filter(Boolean).join(" · ") || null;
        }
        return v.join(", ") || null;
      }
      if (typeof v === "object") {
        const vals = Object.values(v).filter(x => typeof x === "string" || typeof x === "number");
        return vals.join(" · ") || null;
      }
      return String(v) || null;
    }

    // Helper: seção de currículo com título e grid de campos
    const CvSection = ({ title, icon: Icon, color = "bg-develoi-navy", fields }: {
      title: string; icon: React.ElementType; color?: string;
      fields: { label: string; value: string | null; wide?: boolean }[];
    }) => {
      const visible = fields.filter(f => f.value);
      if (!visible.length) return null;
      return (
        <div>
          <div className="flex items-center gap-2.5 mb-3">
            <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center shrink-0", color)}>
              <Icon size={12} className="text-white" />
            </div>
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{title}</p>
            <div className="flex-1 h-px bg-zinc-100" />
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-3">
            {visible.map(f => (
              <div key={f.label} className={cn(f.wide ? "col-span-2" : "col-span-1")}>
                <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-0.5">{f.label}</p>
                <p className="text-sm font-semibold text-zinc-900 leading-snug">{f.value}</p>
              </div>
            ))}
          </div>
        </div>
      );
    };

    const initials = parsed?.name
      ? parsed.name.split(" ").slice(0, 2).map((n: string) => n[0]).join("").toUpperCase()
      : "?";

    return (
      <Modal
        open={!!selectedFile}
        onClose={() => setSelectedFile(null)}
        title={parsed?.name || selectedFile.file_name}
        description={[parsed?.role || parsed?.current_title, parsed?.current_company].filter(Boolean).join(" · ") || `${fmtBytes(selectedFile.file_size)} · Currículo importado`}
        icon={
          <div className="w-9 h-9 rounded-xl bg-develoi-navy flex items-center justify-center shrink-0">
            <span className="text-xs font-black text-develoi-gold">{initials}</span>
          </div>
        }
        size="lg"
        footer={
          <div className="flex gap-3 w-full">
            {isEditingFile ? (
              <>
                <Button variant="outline" fullWidth onClick={() => { setIsEditingFile(false); setEditedFileData(null); }}>Cancelar</Button>
                <Button variant="primary" fullWidth iconLeft={<Check size={14} />} onClick={handleSaveFileData}>Salvar Alterações</Button>
              </>
            ) : (
              <>
                <Button variant="outline" fullWidth iconLeft={<Settings size={14} />}
                  onClick={() => { setIsEditingFile(true); setEditedFileData(parsed); }}>
                  Editar Dados
                </Button>
                <Button variant="outline" fullWidth iconLeft={<RefreshCw size={14} />}
                  onClick={() => { reprocessFile(selectedFile.id); setSelectedFile(null); }}>
                  Reprocessar
                </Button>
                <Button variant="ghost" fullWidth onClick={() => setSelectedFile(null)}>
                  Fechar
                </Button>
              </>
            )}
          </div>
        }
      >
        <div className="space-y-5">
          {/* Status + score */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge color={statusColor[selectedFile.status] ?? "warning"} size="sm">
              {statusLabel[selectedFile.status] ?? selectedFile.status}
            </Badge>
            {selectedFile.compatibility_score != null && (
              <Badge color={selectedFile.compatibility_score >= 80 ? "success" : selectedFile.compatibility_score >= 50 ? "warning" : "danger"} size="sm">
                {selectedFile.compatibility_score}% compatibilidade
              </Badge>
            )}
            <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest ml-auto">{fmtBytes(selectedFile.file_size)}</span>
          </div>

          {/* Alertas */}
          {selectedFile.status === "error" && (
            <div className="flex items-start gap-3 p-4 bg-rose-50 border border-rose-100 rounded-2xl">
              <AlertCircle size={16} className="text-rose-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-black text-rose-700 uppercase tracking-widest mb-1">Erro no Processamento</p>
                <p className="text-xs font-medium text-rose-600 leading-relaxed">{selectedFile.error_message || "Erro inesperado. Recomenda-se reprocessamento."}</p>
              </div>
            </div>
          )}
          {selectedFile.duplicate_status && selectedFile.duplicate_status !== "none" && (
            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-100 rounded-2xl">
              <Copy size={16} className="text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-1">Duplicidade Detectada</p>
                <p className="text-xs font-medium text-amber-600 leading-relaxed">Este candidato já existe na base. Verifique os dados antes de efetivar.</p>
              </div>
            </div>
          )}

          {/* Aurora IA summary */}
          {parsed?.summary && (
            <div className="p-4 bg-develoi-navy rounded-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 opacity-10 pointer-events-none"><Brain size={72} className="text-develoi-gold" /></div>
              <div className="relative z-10 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-develoi-gold/20 flex items-center justify-center shrink-0">
                  <Sparkles size={14} className="text-develoi-gold" />
                </div>
                <div>
                  <p className="text-[9px] font-black text-develoi-gold uppercase tracking-[0.2em] mb-1.5">Análise Aurora IA</p>
                  <p className="text-xs font-medium text-zinc-300 leading-relaxed italic">"{parsed.summary}"</p>
                </div>
              </div>
            </div>
          )}

          {parsed ? (
            isEditingFile && editedFileData ? (
              /* ── MODO EDIÇÃO ── */
              <div className="space-y-2.5">
                {[
                  { label: "Nome", key: "name" }, { label: "E-mail", key: "email" },
                  { label: "Telefone", key: "phone" }, { label: "Cidade", key: "city" },
                  { label: "Estado", key: "state" }, { label: "Cargo", key: "role" },
                  { label: "Experiência (anos)", key: "experience_years", type: "number" },
                  { label: "Pretensão Salarial", key: "desired_salary" },
                ].map(f => (
                  <div key={f.key} className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200 focus-within:border-develoi-gold focus-within:bg-white transition-colors">
                    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1.5 block">{f.label}</label>
                    <input
                      type={f.type || "text"}
                      value={editedFileData[f.key] || ""}
                      onChange={e => setEditedFileData({ ...editedFileData, [f.key]: f.type === "number" ? Number(e.target.value) : e.target.value })}
                      className="w-full bg-transparent text-sm font-bold text-zinc-900 outline-none placeholder:text-zinc-300"
                      placeholder="—"
                    />
                  </div>
                ))}
              </div>
            ) : (
              /* ── MODO LEITURA: LAYOUT CURRÍCULO ── */
              <div className="space-y-6">
                <CvSection title="Identificação" icon={User}
                  fields={[
                    { label: "Nome Completo", value: parsed.name, wide: true },
                    { label: "Data de Nascimento", value: parsed.birth_date },
                    { label: "Idade", value: parsed.age ? `${parsed.age} anos` : null },
                    { label: "Gênero", value: parsed.gender },
                    { label: "Nacionalidade", value: parsed.nationality },
                    { label: "CPF", value: parsed.cpf },
                  ]}
                />
                <CvSection title="Contato & Localização" icon={Mail} color="bg-develoi-gold"
                  fields={[
                    { label: "E-mail", value: parsed.email },
                    { label: "Telefone", value: parsed.phone },
                    { label: "Cidade", value: parsed.city },
                    { label: "Estado", value: parsed.state },
                    { label: "Endereço", value: parsed.address, wide: true },
                    { label: "LinkedIn", value: parsed.linkedin, wide: true },
                  ]}
                />
                <CvSection title="Perfil Profissional" icon={Briefcase} color="bg-blue-600"
                  fields={[
                    { label: "Cargo Atual", value: parsed.role || parsed.current_title },
                    { label: "Empresa Atual", value: parsed.current_company },
                    { label: "Cargo Desejado", value: parsed.desired_position },
                    { label: "Senioridade", value: parsed.seniority },
                    { label: "Experiência", value: parsed.experience_years ? `${parsed.experience_years} anos` : null },
                    { label: "Pretensão Salarial", value: parsed.desired_salary ? `R$ ${parsed.desired_salary}` : null },
                    { label: "Modelo de Trabalho", value: parsed.work_model },
                    { label: "Tipo de Contrato", value: parsed.contract_type },
                    { label: "Disponibilidade", value: parsed.availability },
                    { label: "CNH", value: parsed.cnh },
                    { label: "Objetivo", value: parsed.objective, wide: true },
                    { label: "Destaques", value: parsed.highlights, wide: true },
                  ]}
                />
                <CvSection title="Formação & Certificações" icon={Star} color="bg-violet-600"
                  fields={[
                    { label: "Escolaridade", value: parsed.education_level || parsed.education },
                    { label: "Idiomas", value: parsed.languages },
                    { label: "Formação Acadêmica", value: fieldToString(parsed.academic_education), wide: true },
                    { label: "Cursos e Certificações", value: fieldToString(parsed.courses_certifications || parsed.certifications_list), wide: true },
                    { label: "Experiências Profissionais", value: fieldToString(parsed.professional_experiences), wide: true },
                  ]}
                />

                {/* Skills */}
                {parsed.skills && Array.isArray(parsed.skills) && parsed.skills.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className="w-6 h-6 rounded-lg bg-develoi-gold flex items-center justify-center shrink-0">
                        <Sparkles size={12} className="text-white" />
                      </div>
                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Skills Técnicas</p>
                      <div className="flex-1 h-px bg-zinc-100" />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(parsed.skills as string[]).map((sk, i) => (
                        <Badge key={i} color="primary" size="sm">{sk}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Soft Skills */}
                {parsed.soft_skills && Array.isArray(parsed.soft_skills) && parsed.soft_skills.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className="w-6 h-6 rounded-lg bg-emerald-500 flex items-center justify-center shrink-0">
                        <Star size={12} className="text-white" />
                      </div>
                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Soft Skills</p>
                      <div className="flex-1 h-px bg-zinc-100" />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(parsed.soft_skills as string[]).map((sk, i) => (
                        <Badge key={i} color="success" size="sm">{sk}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Vagas sugeridas */}
                <div>
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-6 h-6 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                      <Target size={12} className="text-white" />
                    </div>
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Vagas Sugeridas</p>
                    <div className="flex-1 h-px bg-zinc-100" />
                    {isMatching && (
                      <span className="flex items-center gap-1.5 text-[9px] font-black text-develoi-gold uppercase tracking-widest animate-pulse">
                        <Loader2 size={10} className="animate-spin" /> Calculando...
                      </span>
                    )}
                  </div>
                  {aiSuggestions.length > 0 ? (
                    <div className="space-y-2">
                      {aiSuggestions.map((s, i) => {
                        const job = availableJobs.find(j => j.id === s.job_id);
                        return (
                          <div key={i} className="flex items-center justify-between p-3 border border-zinc-100 rounded-xl hover:border-develoi-gold/40 transition-all group">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-zinc-50 rounded-xl flex items-center justify-center text-zinc-400 group-hover:bg-develoi-gold group-hover:text-white transition-all shrink-0">
                                <Briefcase size={14} />
                              </div>
                              <div>
                                <p className="text-xs font-black text-zinc-900">{job?.title || "Vaga"}</p>
                                <p className="text-[10px] text-zinc-400 font-medium">{job?.city || ""}{job?.state ? `/${job.state}` : ""}</p>
                              </div>
                            </div>
                            <Badge color={s.score >= 80 ? "success" : s.score >= 60 ? "warning" : "default"} size="sm">{s.score}% match</Badge>
                          </div>
                        );
                      })}
                    </div>
                  ) : !isMatching && (
                    <div className="py-6 text-center bg-zinc-50/50 rounded-xl border border-dashed border-zinc-200">
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Nenhuma vaga compatível.</p>
                    </div>
                  )}
                </div>
              </div>
            )
          ) : !selectedFile.error_message && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 opacity-40">
              <Loader2 className="w-10 h-10 text-develoi-navy animate-spin" />
              <p className="text-[11px] font-black text-zinc-900 uppercase tracking-widest">Aguardando Aurora Engine...</p>
            </div>
          )}
        </div>
      </Modal>
    );
  };

  // ─── Modal: Delete confirm ────────────────────────────────────────────────────

  const DeleteModal = () => (
    <Modal
      open={!!deleteConfirm}
      onClose={() => setDeleteConfirm(null)}
      title={deleteConfirm?.title ?? "Confirmar exclusão"}
      description="Esta ação é irreversível e todos os dados vinculados serão removidos permanentemente."
      icon={<Trash2 size={18} />}
      size="sm"
      footer={
        <div className="flex gap-3 w-full">
          <Button variant="outline" fullWidth onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
          <Button variant="danger" fullWidth iconLeft={<Trash2 size={14} />} onClick={confirmDelete}>Excluir</Button>
        </div>
      }
    >
      <></>
    </Modal>
  );

  // ─── Root ─────────────────────────────────────────────────────────────────────

  return (
    <PageWrapper className="min-h-screen bg-[#f8fafc]">
      <div className="space-y-5 px-4 pb-24 pt-5 sm:px-6">

        {/* ── PAGE HEADER ── */}
        {view === "dashboard" ? (
          <div className="relative overflow-hidden rounded-2xl bg-develoi-navy px-5 py-5 sm:px-7">
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-develoi-gold/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-12 left-1/3 h-36 w-36 rounded-full bg-sky-500/8 blur-3xl" />
            <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <Users size={11} className="text-develoi-gold/70" />
                  <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-white/40">Candidatos</span>
                </div>
                <h1 className="text-[22px] font-black leading-none tracking-tight text-white sm:text-[26px]">
                  Importar Lote de Candidatos
                </h1>
                <p className="mt-1.5 text-[11px] font-medium text-white/40">
                  Processamento em massa via Aurora IA — extração e estruturação automática
                </p>
              </div>
              <div className="flex items-center gap-2">
                <HowItWorksButton />
                <button
                  onClick={() => setShowNewBatch(true)}
                  className="flex h-8 items-center gap-1.5 rounded-lg bg-develoi-gold px-4 text-[11px] font-bold text-develoi-navy shadow-lg shadow-develoi-gold/20 transition-all hover:bg-[#d4a83a]"
                >
                  <Plus size={13} /> Novo Lote
                </button>
              </div>
            </div>

            {/* Stats strip */}
            {stats && (
              <div className="relative z-10 mt-4 flex flex-wrap items-center gap-4 border-t border-white/[0.06] pt-4">
                {[
                  { label: "Arquivos",    value: stats.total_files || 0,         color: "text-white" },
                  { label: "Candidatos",  value: stats.created_candidates || 0,  color: "text-emerald-400" },
                  { label: "Erros",       value: stats.error_files || 0,          color: stats.error_files > 0 ? "text-rose-300" : "text-white" },
                  { label: "Lotes",       value: batches.length,                  color: "text-white" },
                ].map((s, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    {i > 0 && <span className="h-3 w-px bg-white/10" />}
                    <span className={cn("text-[20px] font-black tabular-nums", s.color)}>{s.value}</span>
                    <span className="text-[10px] font-medium text-white/35">{s.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Details header */
          <div className="relative overflow-hidden rounded-2xl bg-develoi-navy px-5 py-5 sm:px-7">
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-develoi-gold/10 blur-3xl" />
            <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setView("dashboard")}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/15 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <ArrowLeft size={16} />
                </button>
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <Badge color={batchStatusColor(selectedBatch?.status || "", selectedBatch?.processed_files, selectedBatch?.total_files)} size="sm">
                      {batchStatusLabel(selectedBatch?.status || "", selectedBatch?.processed_files, selectedBatch?.total_files)}
                    </Badge>
                    <span className="text-[10px] text-white/30">
                      {selectedBatch?.created_at ? new Date(selectedBatch.created_at).toLocaleString("pt-BR") : ""}
                    </span>
                  </div>
                  <h1 className="text-[20px] font-black leading-none tracking-tight text-white sm:text-[24px]">
                    {selectedBatch?.name ?? "Detalhes do Lote"}
                  </h1>
                  <p className="mt-1 text-[11px] font-medium text-white/40">Revise e efetive os currículos processados</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {view === "dashboard" && renderDashboard()}
            {view === "details" && renderDetails()}
          </motion.div>
        </AnimatePresence>

        {/* Modals */}
        {renderNewBatchModal()}
        {renderAddFilesModal()}
        <FileDetailModal />
        <DeleteModal />
      </div>
    </PageWrapper>
  );
}
