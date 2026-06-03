import React, { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  Brain,
  Briefcase,
  Calendar,
  Camera,
  Coffee,
  CreditCard,
  Facebook,
  FileText,
  Film,
  Gift,
  Globe,
  Github,
  Headphones,
  Heart,
  Image,
  Instagram,
  Linkedin,
  Mail,
  MessageCircle,
  Mic,
  Monitor,
  Music,
  Phone,
  RefreshCw,
  Shield,
  ShoppingCart,
  Star,
  Target,
  Twitter,
  User,
  Youtube,
  Zap,
} from "lucide-react";
import {
  AuroraAIAdvisor,
  Button,
  DashboardCharts,
  DashboardChecklist,
  DashboardHeader,
  DashboardQuickLinks,
  DashboardStats,
  Input,
  IconButton,
  Modal,
  PageWrapper,
  PendingApprovalsAlert,
  RecentImports,
  RecentJobs,
  RecommendedTalents,
  RecruitmentFunnel,
  SmartAlerts,
  UnitSummaryTable,
} from "@/src/components/ui";
import { getTenantId } from "@/src/lib/auth";
import { useUnit } from "@/src/lib/useUnit";
import { cn } from "@/src/lib/utils";

const PERIOD_OPTIONS = [
  { value: "7d", label: "7 dias" },
  { value: "30d", label: "1 mês" },
  { value: "90d", label: "3 meses" },
  { value: "180d", label: "6 meses" },
  { value: "365d", label: "1 ano" },
] as const;

type PeriodValue = (typeof PERIOD_OPTIONS)[number]["value"];
type CheckItem = { id: string; text: string; done: boolean };
type QuickLink = { id: string; name: string; url: string; icon: string; color: string };

type DashboardStatsData = {
  active_jobs: number;
  total_candidates: number;
  new_candidates: number;
  compatible_candidates: number;
  tool_responses: number;
};

type DashboardAlert = {
  type: "danger" | "success";
  title: string;
  message: string;
  action?: string;
  href?: string;
};

type DashboardData = {
  stats: DashboardStatsData;
  funnel: Array<{ status: string; count: number }>;
  recentJobs: Array<{
    id: string;
    title: string;
    city: string;
    state: string;
    status: string;
    candidates_count: number;
    compatible_count: number;
  }>;
  recommendations: Array<{
    id: string;
    full_name: string;
    job_title: string;
    compatibility_score: number;
  }>;
  recentImports: Array<{
    id: string;
    name: string;
    total_files: number;
    processed_files: number;
  }>;
  charts: {
    compatibilityMedia: Array<{ name: string; value: number }>;
    discDistribution: Array<{ name: string; value: number }>;
  };
  alerts: DashboardAlert[];
  unitSummary: Array<{
    id: string;
    name: string;
    active_jobs: number;
    total_candidates: number;
    hires: number;
  }>;
  error?: string;
};

const QUICK_ICONS: Record<string, React.ElementType> = {
  Globe,
  Facebook,
  Instagram,
  Linkedin,
  Twitter,
  Youtube,
  Github,
  Mail,
  Phone,
  MessageCircle,
  Calendar,
  Briefcase,
  Monitor,
  BookOpen,
  Coffee,
  Heart,
  Star,
  Shield,
  Music,
  Camera,
  Image,
  Mic,
  Headphones,
  Film,
  ShoppingCart,
  CreditCard,
  Gift,
  User,
  Zap,
  FileText,
  Brain,
  Target,
};

const QUICK_COLORS = [
  "#6366F1",
  "#3B82F6",
  "#0EA5E9",
  "#06B6D4",
  "#14B8A6",
  "#10B981",
  "#22C55E",
  "#84CC16",
  "#EAB308",
  "#F59E0B",
  "#F97316",
  "#EF4444",
  "#EC4899",
  "#A855F7",
  "#8B5CF6",
  "#07152B",
  "#C5A04D",
  "#374151",
  "#64748B",
];

function getScopedStorageKey(prefix: string) {
  try {
    const user = JSON.parse(localStorage.getItem("auth_user") || "{}");
    return `${prefix}_${user.id || "guest"}`;
  } catch {
    return `${prefix}_guest`;
  }
}

function normalizeDashboardData(payload: any): DashboardData {
  const alerts = Array.isArray(payload?.alerts)
    ? payload.alerts.map((alert: any) => ({
        ...alert,
        href: alert.type === "danger" ? "/vagas" : "/candidatos",
      }))
    : [];

  return {
    stats: payload?.stats ?? {
      active_jobs: 0,
      total_candidates: 0,
      new_candidates: 0,
      compatible_candidates: 0,
      tool_responses: 0,
    },
    funnel: payload?.funnel ?? [],
    recentJobs: payload?.recentJobs ?? [],
    recommendations: payload?.recommendations ?? [],
    recentImports: payload?.recentImports ?? [],
    charts: {
      compatibilityMedia: payload?.charts?.compatibilityMedia ?? [],
      discDistribution: payload?.charts?.discDistribution ?? [],
    },
    alerts,
    unitSummary: payload?.unitSummary ?? [],
    error: payload?.error,
  };
}

export default function Dashboard() {
  const { currentUnit, units } = useUnit();
  const tenantId = getTenantId();
  const queryUnitId = currentUnit.is_master ? "master" : currentUnit.id;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<DashboardData | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<string>(queryUnitId);
  const [pendingApprovals, setPendingApprovals] = useState(0);

  const savedPeriod = (() => {
    try {
      return localStorage.getItem("dashboard_period_v2") as PeriodValue | null;
    } catch {
      return null;
    }
  })();

  const [period, setPeriod] = useState<PeriodValue>(savedPeriod ?? "30d");
  const checkInputRef = useRef<HTMLInputElement>(null);

  const checklistStorageKey = getScopedStorageKey("checklist");
  const quickLinksStorageKey = getScopedStorageKey("quicklinks");

  const [checkItems, setCheckItems] = useState<CheckItem[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(checklistStorageKey) || "[]");
    } catch {
      return [];
    }
  });
  const [checkInput, setCheckInput] = useState("");

  const [quickLinks, setQuickLinks] = useState<QuickLink[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(quickLinksStorageKey) || "[]");
    } catch {
      return [];
    }
  });
  const [quickModal, setQuickModal] = useState(false);
  const [quickForm, setQuickForm] = useState({
    name: "",
    url: "",
    icon: "Globe",
    color: "#3B82F6",
  });

  useEffect(() => {
    setSelectedUnit(queryUnitId);
  }, [queryUnitId]);

  const handlePeriodChange = (value: string) => {
    const nextPeriod = value as PeriodValue;
    setPeriod(nextPeriod);

    try {
      localStorage.setItem("dashboard_period_v2", nextPeriod);
    } catch {
      // Silencioso por depender do navegador.
    }
  };

  const saveChecklist = (items: CheckItem[]) => {
    setCheckItems(items);
    localStorage.setItem(checklistStorageKey, JSON.stringify(items));
  };

  const addCheckItem = () => {
    const text = checkInput.trim();
    if (!text) {
      return;
    }

    saveChecklist([...checkItems, { id: crypto.randomUUID(), text, done: false }]);
    setCheckInput("");
    checkInputRef.current?.focus();
  };

  const toggleCheckItem = (id: string) => {
    saveChecklist(checkItems.map((item) => (item.id === id ? { ...item, done: !item.done } : item)));
  };

  const removeCheckItem = (id: string) => {
    saveChecklist(checkItems.filter((item) => item.id !== id));
  };

  const clearDoneItems = () => {
    saveChecklist(checkItems.filter((item) => !item.done));
  };

  const saveQuickLinks = (items: QuickLink[]) => {
    setQuickLinks(items);
    localStorage.setItem(quickLinksStorageKey, JSON.stringify(items));
  };

  const addQuickLink = () => {
    const name = quickForm.name.trim();
    const url = quickForm.url.trim();

    if (!name || !url) {
      return;
    }

    const fullUrl = url.startsWith("http") ? url : `https://${url}`;
    saveQuickLinks([
      ...quickLinks,
      {
        id: crypto.randomUUID(),
        name,
        url: fullUrl,
        icon: quickForm.icon,
        color: quickForm.color,
      },
    ]);
    setQuickForm({ name: "", url: "", icon: "Globe", color: "#3B82F6" });
    setQuickModal(false);
  };

  const removeQuickLink = (id: string) => {
    saveQuickLinks(quickLinks.filter((link) => link.id !== id));
  };

  const fetchData = async (silent = false) => {
    try {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const params = new URLSearchParams({
        tenantId: String(tenantId),
        unitId: String(selectedUnit),
        period,
      });

      const response = await fetch(`/api/dashboard/overview?${params}`);
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || "Não foi possível buscar os dados.");
      }

      setData(normalizeDashboardData(payload));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível buscar os dados.";
      setData(normalizeDashboardData({ error: message }));
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchPendingApprovals = async () => {
    try {
      const params = new URLSearchParams({
        tenantId: String(tenantId),
        unitId: String(selectedUnit),
        status: "Em Aprovação",
      });
      const response = await fetch(`/api/jobs?${params}`);

      if (response.ok) {
        setPendingApprovals((await response.json()).length);
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    void fetchData();
  }, [selectedUnit, period]);

  useEffect(() => {
    void fetchPendingApprovals();
  }, [tenantId, selectedUnit]);

  if (loading && !data) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-develoi-navy/5">
          <RefreshCw className="h-5 w-5 animate-spin text-develoi-navy" />
        </div>
        <p className="text-[11px] font-medium text-zinc-400">Carregando dados…</p>
      </div>
    );
  }

  if (!data || data.error || !data.stats) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-400">
          <RefreshCw size={22} />
        </div>
        <div className="space-y-1 text-center">
          <h2 className="text-[14px] font-bold text-zinc-900">Erro ao carregar</h2>
          <p className="max-w-xs text-[12px] text-zinc-400">
            {data?.error || "Não foi possível buscar os dados."}
          </p>
        </div>
        <Button onClick={() => void fetchData()}>Tentar Novamente</Button>
      </div>
    );
  }

  const { stats, funnel, recentJobs, recommendations, recentImports, charts, unitSummary, alerts } = data;
  const selectedPeriodLabel =
    PERIOD_OPTIONS.find((option) => option.value === period)?.label ?? PERIOD_OPTIONS[1].label;

  return (
    <>
      <PageWrapper className="space-y-6 px-4 py-6 pb-20 sm:px-6">
        <DashboardHeader
          currentUnitName={currentUnit.name}
          period={period}
          periodLabel={selectedPeriodLabel}
          periodOptions={PERIOD_OPTIONS}
          onPeriodChange={handlePeriodChange}
          selectedUnit={selectedUnit}
          onSelectedUnitChange={setSelectedUnit}
          units={units}
          refreshing={refreshing}
          onRefresh={() => void fetchData(true)}
        />

        <PendingApprovalsAlert count={pendingApprovals} />
        <SmartAlerts alerts={alerts} />
        <DashboardStats stats={stats} />
        <RecruitmentFunnel funnel={funnel} />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <DashboardCharts
              compatibilityData={charts.compatibilityMedia}
              discData={charts.discDistribution}
            />
            <RecentJobs jobs={recentJobs} />
            <UnitSummaryTable summary={unitSummary} />
          </div>

          <div className="space-y-6">
            <DashboardQuickLinks
              links={quickLinks}
              iconMap={QUICK_ICONS}
              onAdd={() => setQuickModal(true)}
              onRemove={removeQuickLink}
            />
            <AuroraAIAdvisor
              newCandidates={stats.new_candidates}
              compatibleCandidates={stats.compatible_candidates}
            />
            <RecommendedTalents talents={recommendations} />
            <RecentImports imports={recentImports} />
            <DashboardChecklist
              items={checkItems}
              inputValue={checkInput}
              inputRef={checkInputRef}
              onInputChange={setCheckInput}
              onAdd={addCheckItem}
              onToggle={toggleCheckItem}
              onRemove={removeCheckItem}
              onClearDone={clearDoneItems}
            />
          </div>
        </div>
      </PageWrapper>

      <Modal
        open={quickModal}
        onClose={() => setQuickModal(false)}
        title="Novo Acesso Rápido"
        description="Adicione um atalho para acessar rapidamente sites e ferramentas."
        icon={<Zap size={20} />}
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button variant="outline" onClick={() => setQuickModal(false)}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              disabled={!quickForm.name.trim() || !quickForm.url.trim()}
              onClick={addQuickLink}
            >
              Salvar
            </Button>
          </div>
        }
      >
        <div className="space-y-5">
          <Input
            label="Nome do acesso"
            placeholder="Ex: Meu Site, Portal RH..."
            value={quickForm.name}
            onChange={(event) => setQuickForm((current) => ({ ...current, name: event.target.value }))}
            required
            autoFocus
          />

          <Input
            label="Link (URL)"
            placeholder="exemplo.com.br"
            value={quickForm.url}
            onChange={(event) => setQuickForm((current) => ({ ...current, url: event.target.value }))}
            onKeyDown={(event: React.KeyboardEvent) => event.key === "Enter" && addQuickLink()}
            required
          />

          <div>
            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
              Selecione o Ícone
            </p>
            <div className="grid max-h-32 grid-cols-10 gap-1.5 overflow-y-auto pr-1">
              {Object.entries(QUICK_ICONS).map(([key, Icon]) => (
                <IconButton
                  key={key}
                  type="button"
                  onClick={() => setQuickForm((current) => ({ ...current, icon: key }))}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-9 w-9 rounded-xl border-2 transition-all",
                    quickForm.icon === key
                      ? "border-develoi-navy bg-develoi-navy/5 text-develoi-navy"
                      : "border-zinc-100 text-zinc-400 hover:border-zinc-300"
                  )}
                >
                  <Icon size={15} />
                </IconButton>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
              Cor do círculo
            </p>
            <div className="flex flex-wrap gap-2">
              {QUICK_COLORS.map((color) => (
                <IconButton
                  key={color}
                  type="button"
                  onClick={() => setQuickForm((current) => ({ ...current, color }))}
                  variant="ghost"
                  size="xs"
                  className={cn(
                    "h-7 w-7 rounded-full border-0 transition-all hover:bg-transparent",
                    quickForm.color === color ? "scale-110 ring-2 ring-zinc-400 ring-offset-2" : "hover:scale-105"
                  )}
                  style={{ backgroundColor: color }}
                  aria-label={`Selecionar cor ${color}`}
                  title={`Selecionar cor ${color}`}
                />
              ))}
            </div>
          </div>

          {quickForm.name && (
            <div className="flex items-center gap-4 rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full shadow-md"
                style={{ backgroundColor: quickForm.color }}
              >
                {(() => {
                  const Icon = QUICK_ICONS[quickForm.icon] || Globe;
                  return <Icon size={22} className="text-white" />;
                })()}
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Preview</p>
                <p className="truncate text-sm font-black text-zinc-900">{quickForm.name}</p>
                {quickForm.url && <p className="truncate text-[10px] text-zinc-400">{quickForm.url}</p>}
              </div>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
