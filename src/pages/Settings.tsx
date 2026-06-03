import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Settings2, Trash2, Clock, Loader2, Save,
  ShieldAlert, Users, FileUp, CheckCircle2,
  AlertTriangle, Info,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { PageWrapper, useToast } from "@/src/components/ui";
import { Switch } from "@/src/components/ui/Switch";
import { cn } from "@/src/lib/utils";
import { getTenantId } from "@/src/lib/auth";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TenantSettings {
  auto_delete_enabled: boolean;
  auto_delete_interval: string;
  auto_delete_target: string;
}

const DEFAULT: TenantSettings = {
  auto_delete_enabled: false,
  auto_delete_interval: "6_months",
  auto_delete_target: "candidates",
};

const INTERVALS: { value: string; label: string }[] = [
  { value: "1_week",   label: "1 semana"  },
  { value: "2_weeks",  label: "2 semanas" },
  { value: "1_month",  label: "1 mês"     },
  { value: "2_months", label: "2 meses"   },
  { value: "3_months", label: "3 meses"   },
  { value: "6_months", label: "6 meses"   },
  { value: "1_year",   label: "1 ano"     },
  { value: "2_years",  label: "2 anos"    },
];

const TARGETS: { value: string; label: string; icon: React.ElementType; description: string }[] = [
  {
    value: "candidates",
    label: "Candidatos",
    icon: Users,
    description: "Remove candidatos e todos os seus dados (currículos, análises, DISC) cadastrados há mais tempo que o intervalo definido.",
  },
  {
    value: "import_batches",
    label: "Lotes de importação",
    icon: FileUp,
    description: "Remove lotes de importação concluídos e os arquivos associados após o intervalo definido.",
  },
];

// Helpers para converter entre string ("candidates" | "import_batches" | "both")
// e o conjunto de checkboxes selecionados
function targetToSet(target: string): Set<string> {
  if (target === "both") return new Set(["candidates", "import_batches"]);
  if (target === "candidates") return new Set(["candidates"]);
  if (target === "import_batches") return new Set(["import_batches"]);
  return new Set();
}

function setToTarget(selected: Set<string>): string {
  const hasCandidates = selected.has("candidates");
  const hasBatches    = selected.has("import_batches");
  if (hasCandidates && hasBatches) return "both";
  if (hasCandidates) return "candidates";
  if (hasBatches)    return "import_batches";
  return "";
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function SettingSection({ title, description, icon: Icon, children }: {
  title: string;
  description?: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-zinc-100 px-5 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-develoi-navy/8">
          <Icon size={15} className="text-develoi-navy" />
        </div>
        <div>
          <h3 className="text-[13px] font-bold text-zinc-900">{title}</h3>
          {description && <p className="text-[11px] text-zinc-400">{description}</p>}
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Settings() {
  const tenantId = getTenantId();
  const toast    = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const [settings, setSettings] = useState<TenantSettings>(DEFAULT);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [dirty, setDirty]       = useState(false);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`/api/settings?tenantId=${tenantId}`);
      const data = await res.json();
      if (!res.ok) { toastRef.current.error(data?.error ?? "Erro ao carregar configurações."); return; }
      setSettings({
        auto_delete_enabled:  Boolean(data.auto_delete_enabled),
        auto_delete_interval: data.auto_delete_interval ?? DEFAULT.auto_delete_interval,
        auto_delete_target:   data.auto_delete_target   ?? DEFAULT.auto_delete_target,
      });
    } catch {
      toastRef.current.error("Erro ao carregar configurações.");
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const update = <K extends keyof TenantSettings>(key: K, value: TenantSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const handleSave = async () => {
    // Validar: se ativo, precisa ter pelo menos um alvo
    if (settings.auto_delete_enabled && !settings.auto_delete_target) {
      toast.error("Selecione pelo menos um alvo para a auto-limpeza.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/settings?tenantId=${tenantId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error();
      setDirty(false);
      toast.success("Configurações salvas com sucesso.");
    } catch {
      toast.error("Erro ao salvar configurações.");
    } finally {
      setSaving(false);
    }
  };

  const activeIntervalLabel = INTERVALS.find(i => i.value === settings.auto_delete_interval)?.label;

  // Label do alvo para o resumo
  const activeTargetLabel = (() => {
    const t = settings.auto_delete_target;
    if (t === "both")           return "candidatos e lotes de importação";
    if (t === "candidates")     return "candidatos";
    if (t === "import_batches") return "lotes de importação";
    return null;
  })();

  return (
    <PageWrapper className="min-h-screen bg-[#f8fafc]">
      <div className="space-y-5 px-4 pb-24 pt-5 sm:px-6">

        {/* ── PAGE HEADER ── */}
        <div className="relative overflow-hidden rounded-2xl bg-develoi-navy px-5 py-5 sm:px-7">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-develoi-gold/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-12 left-1/3 h-36 w-36 rounded-full bg-sky-500/8 blur-3xl" />
          <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-[22px] font-black leading-none tracking-tight text-white sm:text-[26px]">
                Configurações
              </h1>
              <p className="mt-1.5 text-[11px] font-medium text-white/40">
                Preferências, automações e comportamento da plataforma
              </p>
            </div>

            {/* Save button */}
            <AnimatePresence>
              {dirty && !loading && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={handleSave}
                  disabled={saving}
                  className="flex h-9 items-center gap-2 rounded-xl bg-develoi-gold px-5 text-[12px] font-bold text-develoi-navy shadow-lg shadow-develoi-gold/20 transition-all hover:bg-[#d4a83a] disabled:opacity-60"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  {saving ? "Salvando…" : "Salvar alterações"}
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* Status strip */}
          <div className="relative z-10 mt-4 flex items-center gap-3 border-t border-white/[0.06] pt-4">
            <div className={cn(
              "flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-medium transition-all",
              dirty
                ? "bg-amber-500/20 text-amber-300 ring-1 ring-amber-400/30"
                : "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/20"
            )}>
              <span className={cn("h-1.5 w-1.5 rounded-full", dirty ? "bg-amber-400 animate-pulse" : "bg-emerald-400")} />
              {dirty ? "Alterações não salvas" : "Configurações sincronizadas"}
            </div>
          </div>
        </div>

        {/* ── LOADING ── */}
        {loading && (
          <div className="flex flex-col items-center justify-center gap-3 py-20">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-develoi-navy/5">
              <Loader2 size={20} className="animate-spin text-develoi-navy" />
            </div>
            <p className="text-[11px] font-medium text-zinc-400">Carregando configurações…</p>
          </div>
        )}

        {/* ── SETTINGS CONTENT ── */}
        {!loading && (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">

            {/* Main settings column */}
            <div className="space-y-5">

              {/* Auto-limpeza */}
              <SettingSection
                title="Auto-limpeza do sistema"
                description="Remova automaticamente dados antigos para manter o sistema limpo."
                icon={Trash2}
              >
                <div className="space-y-5">

                  {/* Toggle principal */}
                  <div className={cn(
                    "flex items-start justify-between gap-4 rounded-xl border p-4 transition-all",
                    settings.auto_delete_enabled
                      ? "border-rose-200/80 bg-rose-50/60"
                      : "border-zinc-200 bg-zinc-50"
                  )}>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-[13px] font-bold text-zinc-900">Ativar auto-limpeza</p>
                        {settings.auto_delete_enabled && (
                          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[9px] font-bold text-rose-700 ring-1 ring-rose-200">
                            ATIVO
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] leading-relaxed text-zinc-500 max-w-lg">
                        Quando ativada, o sistema irá remover automaticamente os dados selecionados
                        com base no intervalo configurado. Essa ação é permanente e irreversível.
                      </p>
                    </div>
                    <Switch
                      checked={settings.auto_delete_enabled}
                      onCheckedChange={(v) => update("auto_delete_enabled", v)}
                      size="md"
                    />
                  </div>

                  {/* Warning quando ativo */}
                  <AnimatePresence>
                    {settings.auto_delete_enabled && (
                      <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4"
                      >
                        <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-500" />
                        <p className="text-[12px] font-medium leading-relaxed text-amber-800">
                          <span className="font-bold">Atenção:</span> A auto-limpeza remove dados de forma permanente.
                          Certifique-se de que o intervalo e o alvo estão corretos antes de salvar.
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* O que limpar */}
                  <div className={cn("space-y-3 transition-opacity duration-200", !settings.auto_delete_enabled && "pointer-events-none opacity-35")}>
                    <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">
                      <Trash2 size={11} /> O que limpar
                      <span className="ml-1 rounded-full bg-zinc-100 px-2 py-0.5 text-[9px] font-semibold text-zinc-500">
                        Selecione um ou mais
                      </span>
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {TARGETS.map((t) => {
                        const selected = targetToSet(settings.auto_delete_target);
                        const isChecked = selected.has(t.value);
                        const Icon = t.icon;

                        const toggle = () => {
                          const next = new Set(selected);
                          if (isChecked) next.delete(t.value);
                          else next.add(t.value);
                          update("auto_delete_target", setToTarget(next));
                        };

                        return (
                          <button
                            key={t.value}
                            type="button"
                            onClick={toggle}
                            className={cn(
                              "flex items-start gap-3 rounded-xl border p-4 text-left transition-all",
                              isChecked
                                ? "border-develoi-navy/30 bg-develoi-navy/5 ring-1 ring-develoi-navy/10"
                                : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50"
                            )}
                          >
                            <div className={cn(
                              "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all",
                              isChecked ? "bg-develoi-navy/10 text-develoi-navy" : "bg-zinc-100 text-zinc-400"
                            )}>
                              <Icon size={16} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className={cn("text-[13px] font-semibold", isChecked ? "text-develoi-navy" : "text-zinc-800")}>
                                {t.label}
                              </p>
                              <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-400">{t.description}</p>
                            </div>
                            {/* Checkbox square */}
                            <div className={cn(
                              "mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-all",
                              isChecked ? "border-develoi-navy bg-develoi-navy" : "border-zinc-300 bg-white"
                            )}>
                              {isChecked && (
                                <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                                  <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Seleção ambos — destaque */}
                    {settings.auto_delete_target === "both" && settings.auto_delete_enabled && (
                      <div className="flex items-start gap-2.5 rounded-xl border border-rose-200/80 bg-rose-50/60 px-4 py-3">
                        <AlertTriangle size={14} className="mt-0.5 shrink-0 text-rose-500" />
                        <p className="text-[11px] font-medium text-rose-800">
                          Ambos selecionados — candidatos <strong>e</strong> lotes de importação serão removidos conforme o intervalo definido.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Intervalo */}
                  <div className={cn("space-y-3 transition-opacity duration-200", !settings.auto_delete_enabled && "pointer-events-none opacity-35")}>
                    <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">
                      <Clock size={11} /> Limpar dados com mais de
                    </p>
                    {/* Pills grid */}
                    <div className="flex flex-wrap gap-1.5">
                      {INTERVALS.map((opt) => {
                        const isSelected = settings.auto_delete_interval === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => update("auto_delete_interval", opt.value)}
                            className={cn(
                              "rounded-lg px-3.5 py-2 text-[12px] font-semibold transition-all",
                              isSelected
                                ? "bg-develoi-navy text-white shadow-sm"
                                : "border border-zinc-200 bg-white text-zinc-600 hover:border-develoi-navy/30 hover:bg-zinc-50"
                            )}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                    {settings.auto_delete_enabled && activeIntervalLabel && activeTargetLabel && (
                      <p className="text-[11px] text-zinc-500">
                        <span className="font-semibold capitalize text-zinc-700">{activeTargetLabel}</span>
                        {" com mais de "}
                        <span className="font-semibold text-zinc-800">{activeIntervalLabel}</span>
                        {" serão removidos automaticamente."}
                      </p>
                    )}
                  </div>
                </div>
              </SettingSection>

            </div>

            {/* Sidebar */}
            <div className="space-y-4">

              {/* Resumo da regra */}
              <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
                <div className="flex items-center gap-2.5 border-b border-zinc-100 px-4 py-3.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-develoi-navy/8">
                    <Info size={13} className="text-develoi-navy" />
                  </div>
                  <span className="text-[13px] font-bold text-zinc-900">Resumo da regra</span>
                </div>
                <div className="p-4">
                  {settings.auto_delete_enabled ? (
                    <div className="space-y-3">
                      {!settings.auto_delete_target ? (
                        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
                          <AlertTriangle size={13} className="mt-0.5 shrink-0 text-amber-500" />
                          <p className="text-[11px] font-medium text-amber-800">
                            Nenhum alvo selecionado. Escolha ao menos um item para limpar.
                          </p>
                        </div>
                      ) : (
                        <div className="rounded-xl border border-develoi-navy/15 bg-develoi-navy/5 p-3.5">
                          <p className="text-[12px] font-medium leading-relaxed text-zinc-700">
                            A cada execução, o sistema removerá{" "}
                            <span className="font-bold text-develoi-navy">{activeTargetLabel}</span>
                            {" com mais de "}
                            <span className="font-bold text-develoi-navy">{activeIntervalLabel}</span>.
                          </p>
                        </div>
                      )}
                      <div className="space-y-2">
                        {[
                          { label: "Alvo",
                            value: settings.auto_delete_target === "both"
                              ? "Candidatos + Lotes"
                              : TARGETS.find(t => t.value === settings.auto_delete_target)?.label || "Nenhum"
                          },
                          { label: "Intervalo", value: activeIntervalLabel || "—" },
                          { label: "Status",    value: "Ativo" },
                        ].map(row => (
                          <div key={row.label} className="flex items-center justify-between">
                            <span className="text-[11px] font-medium text-zinc-400">{row.label}</span>
                            <span className={cn(
                              "text-[11px] font-semibold",
                              row.label === "Status" ? "text-rose-600" : "text-zinc-800"
                            )}>{row.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2.5 py-5 text-center">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-400">
                        <Trash2 size={18} />
                      </div>
                      <p className="text-[12px] font-medium text-zinc-500">Auto-limpeza inativa</p>
                      <p className="text-[11px] text-zinc-400">Ative a regra ao lado para ver o resumo aqui.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Dicas de uso */}
              <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
                <div className="flex items-center gap-2.5 border-b border-zinc-100 px-4 py-3.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-develoi-gold/10">
                    <CheckCircle2 size={13} className="text-develoi-gold" />
                  </div>
                  <span className="text-[13px] font-bold text-zinc-900">Boas práticas</span>
                </div>
                <div className="divide-y divide-zinc-50 p-1">
                  {[
                    "Use intervalos longos (6 meses+) para candidatos do banco de talentos.",
                    "Remova lotes de importação antigos para liberar espaço de armazenamento.",
                    "Sempre salve as configurações antes de sair da página.",
                    "A auto-limpeza não pode ser revertida — faça backups antes de ativar.",
                  ].map((tip, i) => (
                    <div key={i} className="flex items-start gap-2.5 rounded-xl px-3 py-3">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-develoi-gold" />
                      <p className="text-[11px] font-medium leading-relaxed text-zinc-600">{tip}</p>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </PageWrapper>
  );
}
