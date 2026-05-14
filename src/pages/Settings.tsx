import React, { useCallback, useEffect, useRef, useState } from "react";
import { Settings2, Trash2, Clock, Loader2, Save, ShieldAlert, Users, FileUp } from "lucide-react";
import {
  PageWrapper,
  SectionTitle,
  PanelCard,
  Button,
  useToast,
} from "@/src/components/ui";
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

// ─── Interval options ─────────────────────────────────────────────────────────

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

const TARGETS: { value: string; label: string; icon: React.ReactNode; description: string }[] = [
  {
    value: "candidates",
    label: "Candidatos",
    icon: <Users size={16} />,
    description: "Remove candidatos e todos os seus dados (currículos, análises, DISC) cadastrados há mais tempo que o intervalo definido.",
  },
  {
    value: "import_batches",
    label: "Lotes de importação",
    icon: <FileUp size={16} />,
    description: "Remove lotes de importação concluídos e os arquivos associados a eles após o intervalo definido.",
  },
];

// ─── SegmentedPicker ──────────────────────────────────────────────────────────

function SegmentedPicker<T extends string>({
  options,
  value,
  onChange,
  disabled,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className={cn(
      "inline-flex rounded-full border border-zinc-200 bg-zinc-100 p-1 gap-0.5 flex-wrap",
      disabled && "opacity-50 pointer-events-none"
    )}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "rounded-full px-3.5 py-1.5 text-[11px] font-black tracking-[0.04em] transition-all duration-150 whitespace-nowrap",
            value === opt.value
              ? "bg-develoi-navy text-white shadow-sm"
              : "text-zinc-500 hover:text-zinc-800 hover:bg-white"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Settings() {
  const tenantId = getTenantId();
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const [settings, setSettings] = useState<TenantSettings>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/settings?tenantId=${tenantId}`);
      const data = await res.json();
      if (!res.ok) {
        console.error('[settings] HTTP', res.status, data);
        toastRef.current.error(data?.error ?? "Erro ao carregar configurações.");
        return;
      }
      setSettings({
        auto_delete_enabled: Boolean(data.auto_delete_enabled),
        auto_delete_interval: data.auto_delete_interval ?? DEFAULT.auto_delete_interval,
        auto_delete_target: data.auto_delete_target ?? DEFAULT.auto_delete_target,
      });
    } catch (err) {
      console.error('[settings] fetch error', err);
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

  return (
    <PageWrapper className="min-h-screen bg-zinc-50/60">
      <div className="space-y-8 px-3 py-5 sm:space-y-10 sm:px-5 sm:py-7 lg:space-y-12 lg:px-8 lg:py-10">
        <div className="flex items-start justify-between gap-4">
          <SectionTitle
            title="Configurações"
            subtitle="Gerencie as preferências e automações da plataforma"
            icon={<Settings2 size={22} />}
            className=""
          />
          <Button
            onClick={handleSave}
            disabled={!dirty || saving}
            className="shrink-0 flex items-center gap-2"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Salvar
          </Button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-4 py-24">
            <Loader2 size={28} className="animate-spin text-develoi-navy" />
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">
              Carregando configurações
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* ── Auto-limpeza ── */}
            <PanelCard
              title="Auto-limpeza do sistema"
              description="Remova automaticamente dados antigos para manter o sistema limpo e dentro da capacidade."
              icon={Trash2}
              className="overflow-visible rounded-[1.75rem] sm:rounded-[2rem]"
              headerClassName="px-4 py-4 sm:px-6 sm:py-5"
              contentClassName="p-4 sm:p-6"
            >
              <div className="space-y-6">
                {/* Toggle principal */}
                <div className="flex items-start justify-between gap-6 rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black text-zinc-800">Ativar auto-limpeza</p>
                    <p className="mt-1 text-[11px] text-zinc-400 leading-relaxed max-w-lg">
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

                {/* Aviso quando ativo */}
                {settings.auto_delete_enabled && (
                  <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                    <ShieldAlert size={16} className="mt-0.5 shrink-0 text-amber-500" />
                    <p className="text-[11px] font-medium text-amber-700 leading-relaxed">
                      <span className="font-black">Atenção:</span> A auto-limpeza remove dados de forma permanente.
                      Certifique-se de que o intervalo e o alvo estão corretos antes de salvar.
                    </p>
                  </div>
                )}

                {/* O que limpar */}
                <div className={cn(
                  "space-y-3 transition-opacity",
                  !settings.auto_delete_enabled && "opacity-40 pointer-events-none"
                )}>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400 flex items-center gap-2">
                    <Trash2 size={12} />
                    O que limpar
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {TARGETS.map((t) => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => update("auto_delete_target", t.value)}
                        className={cn(
                          "flex items-start gap-3 rounded-2xl border p-4 text-left transition-all duration-150",
                          settings.auto_delete_target === t.value
                            ? "border-develoi-navy/30 bg-develoi-navy/5 shadow-sm"
                            : "border-zinc-100 bg-white hover:border-zinc-200 hover:bg-zinc-50"
                        )}
                      >
                        <div className={cn(
                          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border transition-all",
                          settings.auto_delete_target === t.value
                            ? "border-develoi-navy/20 bg-develoi-navy/10 text-develoi-navy"
                            : "border-zinc-200 bg-zinc-50 text-zinc-400"
                        )}>
                          {t.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={cn(
                            "text-sm font-black",
                            settings.auto_delete_target === t.value ? "text-develoi-navy" : "text-zinc-700"
                          )}>
                            {t.label}
                          </p>
                          <p className="mt-1 text-[10px] leading-relaxed text-zinc-400">{t.description}</p>
                        </div>
                        <div className={cn(
                          "mt-1 h-4 w-4 shrink-0 rounded-full border-2 transition-all",
                          settings.auto_delete_target === t.value
                            ? "border-develoi-navy bg-develoi-navy"
                            : "border-zinc-300 bg-white"
                        )}>
                          {settings.auto_delete_target === t.value && (
                            <div className="mx-auto mt-[3px] h-1.5 w-1.5 rounded-full bg-white" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Intervalo */}
                <div className={cn(
                  "space-y-3 transition-opacity",
                  !settings.auto_delete_enabled && "opacity-40 pointer-events-none"
                )}>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400 flex items-center gap-2">
                    <Clock size={12} />
                    Limpar dados com mais de
                  </p>
                  <SegmentedPicker
                    options={INTERVALS}
                    value={settings.auto_delete_interval as any}
                    onChange={(v) => update("auto_delete_interval", v)}
                    disabled={!settings.auto_delete_enabled}
                  />
                  <p className="text-[11px] text-zinc-400">
                    {settings.auto_delete_target === "candidates"
                      ? "Candidatos criados ou atualizados há mais de "
                      : "Lotes concluídos há mais de "}
                    <span className="font-black text-zinc-600">
                      {INTERVALS.find((i) => i.value === settings.auto_delete_interval)?.label}
                    </span>
                    {" serão removidos automaticamente."}
                  </p>
                </div>

                {/* Resumo */}
                {settings.auto_delete_enabled && (
                  <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
                    <p className="text-[11px] font-black text-zinc-500 uppercase tracking-[0.16em] mb-2">
                      Resumo da regra ativa
                    </p>
                    <p className="text-sm font-medium text-zinc-700">
                      A cada execução, o sistema removerá{" "}
                      <span className="font-black text-develoi-navy">
                        {TARGETS.find((t) => t.value === settings.auto_delete_target)?.label.toLowerCase()}
                      </span>
                      {" com mais de "}
                      <span className="font-black text-develoi-navy">
                        {INTERVALS.find((i) => i.value === settings.auto_delete_interval)?.label}
                      </span>
                      {"."}
                    </p>
                  </div>
                )}
              </div>
            </PanelCard>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
