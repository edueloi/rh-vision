import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Upload, FileText, CheckCircle2, AlertCircle, X, Loader2, Plus, Users,
  Download, Search, ArrowLeft, Settings, Brain, Target, Shield, Wand2,
  Sparkles, Clock, Database, Copy, Eye, MoreVertical, Zap, Briefcase,
  ChevronRight, RefreshCw, FileSpreadsheet, Layers, Trash2, Check,
  Star, LayoutDashboard, FolderOpen, Cpu, TrendingUp, Filter,
} from "lucide-react";
import {
  PanelCard, Badge, useToast, StatCard, EmptyState, StatGrid,
  SectionTitle, Button, IconButton, Select, Input, Modal
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
  max_files_per_batch: 30,
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
  useEffect(() => {
    if (view !== "details" || !selectedBatch) return;
    if (selectedBatch.status !== "processing" && selectedBatch.status !== "uploaded") return;
    const allDone = selectedBatch.total_files > 0 && selectedBatch.processed_files >= selectedBatch.total_files;

    // Dispara notificação uma única vez quando conclui
    if (allDone && prevProcessedRef.current !== selectedBatch.processed_files) {
      prevProcessedRef.current = selectedBatch.processed_files;
      const errors = selectedBatch.error_files || 0;
      pushNotif({
        type: errors > 0 ? "warning" : "success",
        title: `Lote "${selectedBatch.name}" concluído`,
        message: `${selectedBatch.created_candidates} candidatos gerados${errors > 0 ? `, ${errors} com falha` : " com sucesso"}.`,
      });
      toast.success(`✓ Lote "${selectedBatch.name}" processado — ${selectedBatch.created_candidates} candidatos gerados.`);
    }

    if (allDone) return;
    prevProcessedRef.current = selectedBatch.processed_files;
    const id = setInterval(() => openBatchDetails(selectedBatch), 3500);
    return () => clearInterval(id);
  }, [view, selectedBatch]);

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
    <div className="space-y-8">
      {/* Stats row */}
      <StatGrid cols={2} className="md:grid-cols-3 xl:grid-cols-6">
        <StatCard title="Arquivos" value={stats?.total_files || 0} icon={FileText} delay={0} />
        <StatCard title="Processados" value={stats?.processed_files || 0} icon={Zap} color="info" delay={0.05} />
        <StatCard title="Candidatos" value={stats?.created_candidates || 0} icon={Users} color="success" delay={0.1} />
        <StatCard title="Duplicados" value={stats?.duplicate_files || 0} icon={Copy} color="warning" delay={0.15} />
        <StatCard title="Erros" value={stats?.error_files || 0} icon={AlertCircle} color="danger" delay={0.2} />
        <StatCard title="Lotes" value={batches.length} icon={Layers} color="purple" delay={0.25} />
      </StatGrid>

      <div className="grid lg:grid-cols-12 gap-8">
        {/* Batch list */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-zinc-900 tracking-tighter uppercase">Lotes de Importação</h2>
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-0.5">Histórico de processamento estruturado por IA</p>
            </div>
          </div>

          <div className="space-y-4">
            {isLoading ? (
              [1, 2, 3].map(i => (
                <div key={i} className="h-28 bg-zinc-100/60 rounded-3xl animate-pulse" />
              ))
            ) : batches.length === 0 ? (
              <EmptyState
                title="Nenhum lote ainda"
                description="Clique em '+ Novo Lote' para iniciar sua primeira importação em massa."
                icon={<Layers size={32} />}
              />
            ) : (
              <AnimatePresence>
                {batches.map((batch, idx) => (
                  <motion.div
                    key={batch.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    onClick={() => openBatchDetails(batch)}
                    className="group bg-white border border-zinc-100 rounded-3xl p-5 hover:border-develoi-navy hover:shadow-xl hover:shadow-zinc-200/40 transition-all cursor-pointer flex items-center gap-5"
                  >
                    {/* Icon */}
                    <div className="w-14 h-14 shrink-0 rounded-2xl bg-zinc-50 flex items-center justify-center text-zinc-400 group-hover:bg-develoi-navy group-hover:text-develoi-gold transition-all shadow-inner">
                      <Layers size={22} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h4 className="text-sm font-black text-zinc-900 group-hover:text-develoi-gold transition-colors tracking-tight truncate">{batch.name}</h4>
                        <Badge color={batchStatusColor(batch.status, batch.processed_files, batch.total_files)} size="sm">{batchStatusLabel(batch.status, batch.processed_files, batch.total_files)}</Badge>
                        {batch.job_title && (
                          <span className="hidden sm:flex items-center gap-1.5 text-[9px] font-black text-develoi-navy uppercase tracking-widest px-2.5 py-1 bg-develoi-navy/5 rounded-lg border border-develoi-navy/10">
                            <Briefcase size={10} /> {batch.job_title}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-[10px] font-bold text-zinc-400 flex items-center gap-1.5"><Clock size={11} />{new Date(batch.created_at).toLocaleDateString("pt-BR")}</span>
                        {(batch.status === "processing" || batch.status === "uploaded") && batch.processed_files < batch.total_files && (
                          <span className="flex items-center gap-1.5 text-[10px] font-black text-develoi-navy animate-pulse">
                            <Loader2 size={11} className="animate-spin" /> Processando...
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Counters */}
                    <div className="hidden sm:flex items-center gap-6 px-4 border-l border-zinc-100">
                      <div className="text-center">
                        <p className="text-base font-black text-zinc-900">{batch.total_files}</p>
                        <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Arquivos</p>
                      </div>
                      <div className="text-center">
                        <p className="text-base font-black text-emerald-600">{batch.created_candidates}</p>
                        <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Gerados</p>
                      </div>
                      <div className="text-center">
                        <p className="text-base font-black text-rose-500">{batch.error_files}</p>
                        <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Falhas</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <IconButton
                        onClick={e => { e.stopPropagation(); setDeleteConfirm({ id: batch.id, type: "batch", title: "Excluir este lote?" }); }}
                        variant="outline"
                        className="h-10 w-10 rounded-xl border-zinc-100 text-zinc-300 hover:text-rose-500 hover:bg-rose-50 hover:border-rose-100"
                      >
                        <Trash2 size={16} />
                      </IconButton>
                      <IconButton className="h-10 w-10 rounded-xl bg-zinc-50 group-hover:bg-develoi-gold group-hover:text-white transition-all">
                        <ChevronRight size={18} />
                      </IconButton>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          {/* CTA Nova Importação */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-develoi-navy rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl shadow-develoi-navy/20"
          >
            <div className="absolute top-0 right-0 w-48 h-48 bg-develoi-gold/15 rounded-full blur-3xl -mr-24 -mt-24" />
            <div className="relative z-10">
              <div className="w-12 h-12 bg-develoi-gold rounded-2xl flex items-center justify-center mb-5 shadow-lg shadow-develoi-gold/30">
                <Cpu size={22} className="text-white" />
              </div>
              <h3 className="text-lg font-black tracking-tight mb-1">Aurora Engine</h3>
              <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-6 leading-relaxed">
                IA generativa para extração e estruturação de currículos em tempo real
              </p>
              <Button
                onClick={() => setShowNewBatch(true)}
                className="w-full h-12 bg-develoi-gold text-white hover:bg-white hover:text-develoi-navy rounded-2xl shadow-xl shadow-develoi-gold/20 font-black text-xs uppercase tracking-widest"
                iconLeft={<Plus size={16} />}
              >
                Novo Lote de Importação
              </Button>
            </div>
          </motion.div>

          {/* Capacidade */}
          <PanelCard title="Capacidade do Plano" icon={Target} className="border-zinc-100">
            <div className="space-y-5">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Arquivos por Lote</span>
                  <span className="text-sm font-black text-develoi-navy">{capacity.max_files_per_batch}</span>
                </div>
                <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                  <div className="h-full bg-develoi-gold rounded-full" style={{ width: "60%" }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Tamanho Máx. / Arquivo</span>
                  <span className="text-sm font-black text-develoi-navy">{capacity.max_file_size_mb} MB</span>
                </div>
                <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: "40%" }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Total por Lote</span>
                  <span className="text-sm font-black text-develoi-navy">{capacity.max_total_size_mb} MB</span>
                </div>
                <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: "50%" }} />
                </div>
              </div>
              <div className="pt-2 border-t border-zinc-100">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Formatos aceitos:</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {capacity.supported_extensions.map(ext => (
                    <span key={ext} className="px-2 py-1 bg-zinc-50 border border-zinc-100 rounded-lg text-[9px] font-black text-zinc-500 uppercase">{ext}</span>
                  ))}
                </div>
              </div>
            </div>
          </PanelCard>

          {/* Métricas rápidas */}
          {stats && (
            <PanelCard title="Métricas Gerais" icon={TrendingUp} className="border-zinc-100">
              <div className="space-y-3">
                {[
                  { label: "Taxa de Sucesso", value: stats.total_files > 0 ? `${Math.round((stats.processed_files / stats.total_files) * 100)}%` : "—", color: "text-emerald-600" },
                  { label: "Total Processados", value: stats.processed_files || 0, color: "text-develoi-navy" },
                  { label: "Candidatos Gerados", value: stats.created_candidates || 0, color: "text-develoi-gold" },
                ].map(m => (
                  <div key={m.label} className="flex items-center justify-between py-2.5 border-b border-zinc-50 last:border-0">
                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{m.label}</span>
                    <span className={cn("text-base font-black tracking-tight", m.color)}>{m.value}</span>
                  </div>
                ))}
              </div>
            </PanelCard>
          )}
        </div>
      </div>
    </div>
  );

  // ─── Render: Details ─────────────────────────────────────────────────────────

  const renderDetails = () => {
    const allDone = (selectedBatch?.total_files || 0) > 0 && (selectedBatch?.processed_files || 0) >= (selectedBatch?.total_files || 0);
    const isProcessing = (selectedBatch?.status === "processing" || selectedBatch?.status === "uploaded") && !allDone;
    const canCommit = selectedBatch?.status === "completed" || (selectedBatch?.status === "processing" && allDone);

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Badge color={batchStatusColor(selectedBatch?.status || "", selectedBatch?.processed_files, selectedBatch?.total_files)} size="sm">{batchStatusLabel(selectedBatch?.status || "", selectedBatch?.processed_files, selectedBatch?.total_files)}</Badge>
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                {selectedBatch?.created_at ? new Date(selectedBatch.created_at).toLocaleString("pt-BR") : ""}
              </span>
            </div>
            <h2 className="text-2xl font-black text-zinc-900 tracking-tighter uppercase">{selectedBatch?.name}</h2>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" onClick={() => setView("dashboard")} className="h-11 px-5 rounded-2xl border-zinc-200" iconLeft={<ArrowLeft size={16} />}>
              Voltar
            </Button>
            <IconButton onClick={handleExportCSV} variant="outline" className="h-11 w-11 rounded-2xl border-zinc-200">
              <Download size={18} />
            </IconButton>
            <IconButton onClick={() => selectedBatch && openBatchDetails(selectedBatch)} className="h-11 w-11 rounded-2xl bg-zinc-900 text-white hover:bg-develoi-gold">
              <RefreshCw size={18} />
            </IconButton>
            {canCommit && (
              <div className="flex items-center gap-3 bg-white p-2 pl-5 rounded-2xl border border-zinc-100 shadow-xl shadow-zinc-200/40">
                <div>
                  <p className="text-[8px] font-black uppercase tracking-widest text-zinc-400 mb-0.5">Avaliação Automática</p>
                  <select
                    value={autoToolId}
                    onChange={e => setAutoToolId(e.target.value)}
                    className="bg-transparent text-[10px] font-black text-develoi-navy outline-none cursor-pointer"
                  >
                    <option value="none">Sem avaliação automática</option>
                    {availableTools.map(t => <option key={t.id} value={t.id}>Enviar {t.name}</option>)}
                  </select>
                </div>
                <div className="w-px h-10 bg-zinc-100" />
                <Button onClick={() => commitBatch(selectedBatch!.id)} className="h-11 px-6 bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-600/20" iconLeft={<CheckCircle2 size={16} />}>
                  Efetivar Lote
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <StatGrid cols={2} className="lg:grid-cols-4">
          <StatCard title="Processados" value={selectedBatch?.processed_files || 0} description={`de ${selectedBatch?.total_files || 0}`} icon={Zap} color="info" />
          <StatCard title="Novos Talentos" value={selectedBatch?.created_candidates || 0} icon={Users} color="success" />
          <StatCard title="Duplicados" value={selectedBatch?.duplicate_files || 0} icon={Copy} color="warning" />
          <StatCard title="Falhas" value={selectedBatch?.error_files || 0} icon={AlertCircle} color="danger" />
        </StatGrid>

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
      toast.loading(`Aurora IA processando "${nbForm.name}"... (${nbQueue.length} arquivo${nbQueue.length !== 1 ? "s" : ""})`);
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

  const FileDetailModal = () => (
    <AnimatePresence>
      {selectedFile && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedFile(null)} className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm" />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 24 }}
            className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col border border-zinc-100"
          >
            {/* Header */}
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-develoi-navy text-white rounded-2xl flex items-center justify-center shadow-lg shadow-develoi-navy/20">
                  <FileText size={22} />
                </div>
                <div>
                  <h3 className="text-base font-black text-zinc-900 truncate max-w-xs uppercase tracking-tight">{selectedFile.file_name}</h3>
                  <Badge color={selectedFile.status === "completed" || selectedFile.status === "committed" ? "success" : selectedFile.status === "error" ? "danger" : "warning"} size="sm">
                    {selectedFile.status}
                  </Badge>
                </div>
              </div>
              <button onClick={() => setSelectedFile(null)} className="p-3 bg-white border border-zinc-200 rounded-xl hover:bg-zinc-900 hover:text-white transition-all active:scale-90">
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {selectedFile.status === "error" && (
                <div className="p-5 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-4">
                  <AlertCircle size={20} className="text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-black text-rose-900 uppercase tracking-widest mb-1">Erro no Processamento</p>
                    <p className="text-sm font-bold text-rose-700/80 leading-relaxed">{selectedFile.error_message || "Erro inesperado. Recomenda-se reprocessamento."}</p>
                  </div>
                </div>
              )}

              {selectedFile.duplicate_status && selectedFile.duplicate_status !== "none" && (
                <div className="p-5 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-4">
                  <Copy size={20} className="text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-black text-amber-900 uppercase tracking-widest mb-1">Duplicidade Detectada</p>
                    <p className="text-sm font-bold text-amber-700/80 leading-relaxed">Este candidato já existe na base. Verifique os dados para confirmar ou ignorar.</p>
                  </div>
                </div>
              )}

              {selectedFile.parsed_data_json ? (() => {
                const parsed = JSON.parse(selectedFile.parsed_data_json);
                return (
                  <div className="space-y-6">
                    {/* Edit toggle */}
                    <div className="flex items-center justify-between">
                      <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Dados Estruturados pela Aurora</h4>
                      {isEditingFile ? (
                        <div className="flex gap-2">
                          <button onClick={() => { setIsEditingFile(false); setEditedFileData(null); }} className="px-3 py-1.5 bg-zinc-100 text-zinc-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-200">Cancelar</button>
                          <button onClick={handleSaveFileData} className="px-3 py-1.5 bg-develoi-gold text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-900">Salvar</button>
                        </div>
                      ) : (
                        <button onClick={() => { setIsEditingFile(true); setEditedFileData(parsed); }} className="px-3 py-1.5 border border-zinc-200 text-develoi-navy rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-50 flex items-center gap-1.5">
                          <Settings size={11} /> Editar
                        </button>
                      )}
                    </div>

                    <div className="grid sm:grid-cols-2 gap-3">
                      {isEditingFile && editedFileData ? (
                        [{ label: "Nome", key: "name" }, { label: "Email", key: "email" }, { label: "Telefone", key: "phone" }, { label: "Cidade", key: "city" }, { label: "Estado", key: "state" }, { label: "Cargo", key: "role" }, { label: "Exp. (anos)", key: "experience_years", type: "number" }].map(f => (
                          <div key={f.key} className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 focus-within:border-develoi-gold transition-colors">
                            <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1.5 block">{f.label}</label>
                            <input type={f.type || "text"} value={editedFileData[f.key] || ""} onChange={e => setEditedFileData({ ...editedFileData, [f.key]: f.type === "number" ? Number(e.target.value) : e.target.value })} className="w-full bg-transparent text-sm font-black text-zinc-900 outline-none" />
                          </div>
                        ))
                      ) : Object.entries(parsed).map(([k, v]: [string, any]) => {
                        if (typeof v === "object" && v !== null && !Array.isArray(v)) return null;
                        if (["skills", "summary", "strengths", "attention_points", "compatibility_score", "experiences_list", "education_list", "projects_list", "languages_list"].includes(k)) return null;
                        const dv = Array.isArray(v) ? v.join(", ") : v;
                        return (
                          <div key={k} className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 hover:border-develoi-gold/40 transition-colors group">
                            <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1 group-hover:text-develoi-gold">{k.replace(/_/g, " ")}</p>
                            <p className="text-sm font-black text-zinc-900 leading-snug">{dv?.toString() || "—"}</p>
                          </div>
                        );
                      })}
                    </div>

                    {parsed.skills && Array.isArray(parsed.skills) && parsed.skills.length > 0 && (
                      <div>
                        <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">Skills Identificadas</h4>
                        <div className="flex flex-wrap gap-2">
                          {parsed.skills.map((sk: string, i: number) => (
                            <span key={i} className="px-3 py-1.5 bg-develoi-navy/5 text-develoi-navy rounded-xl text-[10px] font-black uppercase tracking-widest border border-develoi-navy/10 flex items-center gap-1.5">
                              <Sparkles size={10} className="text-develoi-gold" />{sk}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {parsed.summary && (
                      <div className="p-6 bg-gradient-to-br from-develoi-navy to-zinc-900 rounded-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 opacity-10"><Brain size={80} className="text-develoi-gold" /></div>
                        <div className="relative z-10">
                          <div className="flex items-center gap-2 mb-3 text-develoi-gold">
                            <Brain size={16} className="animate-pulse" />
                            <span className="text-[9px] font-black uppercase tracking-[0.3em]">Análise Aurora</span>
                          </div>
                          <p className="text-sm font-medium text-zinc-300 leading-relaxed italic">"{parsed.summary}"</p>
                        </div>
                      </div>
                    )}

                    {/* AI job suggestions */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-black text-zinc-900 uppercase tracking-tight">Vagas Sugeridas</h4>
                        {isMatching && <span className="text-[9px] font-black text-develoi-gold uppercase tracking-widest animate-pulse flex items-center gap-1.5"><Sparkles size={11} className="animate-spin" /> Calculando...</span>}
                      </div>
                      {aiSuggestions.length > 0 ? (
                        <div className="space-y-3">
                          {aiSuggestions.map((s, i) => {
                            const job = availableJobs.find(j => j.id === s.job_id);
                            return (
                              <div key={i} className="p-4 border border-zinc-100 rounded-2xl hover:border-develoi-gold/40 transition-all group">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 bg-zinc-50 rounded-xl flex items-center justify-center text-zinc-400 group-hover:bg-develoi-gold group-hover:text-white transition-all">
                                      <Briefcase size={16} />
                                    </div>
                                    <div>
                                      <p className="text-sm font-black text-zinc-900 uppercase tracking-tight">{job?.title || "Vaga"}</p>
                                      <p className="text-[10px] text-zinc-400 font-bold">{job?.city}/{job?.state}</p>
                                    </div>
                                  </div>
                                  <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-xl">{s.score}% match</span>
                                </div>
                                {s.match_reason && <p className="mt-3 text-[11px] text-zinc-500 italic leading-relaxed border-l-2 border-develoi-gold/30 pl-3">"{s.match_reason}"</p>}
                              </div>
                            );
                          })}
                        </div>
                      ) : !isMatching && (
                        <div className="py-8 text-center bg-zinc-50/50 rounded-2xl border border-dashed border-zinc-200">
                          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Nenhuma vaga compatível no momento.</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })() : !selectedFile.error_message && (
                <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-40">
                  <Loader2 className="w-12 h-12 text-develoi-navy animate-spin" />
                  <p className="text-[11px] font-black text-zinc-900 uppercase tracking-widest">Aguardando Aurora Engine...</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-zinc-100 flex gap-3 bg-zinc-50/50">
              <button onClick={() => { reprocessFile(selectedFile.id); setSelectedFile(null); }} className="flex-1 py-3.5 bg-develoi-navy text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-develoi-gold transition-all flex items-center justify-center gap-2">
                <RefreshCw size={13} /> Reprocessar
              </button>
              <button onClick={() => setSelectedFile(null)} className="flex-1 py-3.5 bg-white border border-zinc-200 text-zinc-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:border-zinc-900 transition-all">
                Fechar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  // ─── Modal: Delete confirm ────────────────────────────────────────────────────

  const DeleteModal = () => (
    <AnimatePresence>
      {deleteConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDeleteConfirm(null)} className="absolute inset-0 bg-zinc-900/50 backdrop-blur-sm" />
          <motion.div initial={{ opacity: 0, scale: 0.9, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white rounded-3xl p-8 max-w-sm w-full relative z-10 shadow-2xl border border-zinc-100">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mb-5"><Trash2 size={28} /></div>
              <h3 className="text-lg font-black text-zinc-900 uppercase tracking-tighter mb-2">{deleteConfirm.title}</h3>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest leading-relaxed mb-8">Esta ação é irreversível e todos os dados vinculados serão removidos permanentemente.</p>
              <div className="grid grid-cols-2 gap-3 w-full">
                <button onClick={() => setDeleteConfirm(null)} className="py-4 bg-zinc-50 text-zinc-400 hover:text-zinc-900 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">Cancelar</button>
                <button onClick={confirmDelete} className="py-4 bg-rose-500 text-white hover:bg-rose-600 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-rose-500/20 transition-all">Excluir</button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  // ─── Root ─────────────────────────────────────────────────────────────────────

  return (
    <div className="w-full px-4 sm:px-6 py-6 space-y-8">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {view === "dashboard" ? (
          <>
            <SectionTitle
              title="Importar CVs"
              subtitle="Processamento em massa via Aurora IA — extração e estruturação automática"
              icon={<Layers size={22} />}
              className="mb-0"
            />
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={() => setView("dashboard")} className="h-11 px-5 rounded-2xl border-zinc-200" iconLeft={<LayoutDashboard size={16} />}>
                Painel
              </Button>
              <Button onClick={() => setShowNewBatch(true)} className="h-11 px-6 rounded-2xl shadow-xl shadow-develoi-gold/20" iconLeft={<Plus size={16} />} style={{ backgroundColor: "#C5A04D" }}>
                Novo Lote
              </Button>
            </div>
          </>
        ) : (
          <div onClick={() => setView("dashboard")} className="flex items-center gap-3 group cursor-pointer">
            <div className="h-11 w-11 rounded-2xl border-2 border-zinc-200 flex items-center justify-center text-zinc-500 group-hover:bg-zinc-900 group-hover:text-white group-hover:border-zinc-900 transition-all">
              <ArrowLeft size={18} />
            </div>
            <div className="text-left">
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Voltar ao Painel</p>
              <p className="text-sm font-black text-zinc-900 uppercase tracking-tight">Central de Importação</p>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={view}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          {view === "dashboard" && renderDashboard()}
          {view === "details" && renderDetails()}
        </motion.div>
      </AnimatePresence>

      {/* Modals */}
      {renderNewBatchModal()}
      <FileDetailModal />
      <DeleteModal />
    </div>
  );
}
