import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  BadgeCheck,
  Brain,
  Briefcase,
  Building2,
  CalendarClock,
  ChevronRight,
  Globe,
  KeyRound,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import {
  Badge,
  Button,
  EmptyState,
  IconButton,
  Input,
  PanelCard,
  Select,
  StatCard,
  useToast,
} from "../components/ui";
import { getAuthHeaders } from "../lib/auth";
import { cn } from "../lib/utils";
import { formatCpfOrCnpj, formatPhoneBr } from "../lib/masks";
import {
  ACCESS_PERMISSION_KEYS,
  ACCESS_PERMISSION_LABELS,
  ACCESS_PROFILE_LABELS,
  AccessPermissions,
  AccessProfile,
  getPermissionPreset,
} from "../lib/access";

interface Tenant {
  id: string;
  name: string;
  document: string;
  created_at: string;
  updated_at?: string;
  status?: string;
  plan_label?: string;
  validity_days?: number;
  starts_at?: string | null;
  expires_at?: string | null;
  max_users?: number;
  access_profile?: string;
  total_users?: number;
  active_users?: number;
  admin_users?: number;
  last_login?: string | null;
  contract_status?: string;
}

interface TenantAccess {
  id: string;
  full_name: string;
  email: string;
  role: string;
  status: string;
  unit_name?: string | null;
  last_login?: string | null;
  access_profile?: string;
  permissions_json?: unknown;
}

const VALIDITY_OPTIONS = [
  { value: 30, label: "30 dias" },
  { value: 90, label: "90 dias" },
  { value: 180, label: "180 dias" },
  { value: 365, label: "1 ano" },
];

const PROFILE_OPTIONS: AccessProfile[] = [
  "admin-mestre",
  "rh-operacao",
  "executivo-leitura",
  "custom",
];

const STATUS_OPTIONS = ["Ativo", "Suspenso"];
const ACCESS_STATUS_OPTIONS = ["Ativo", "Bloqueado"];

const initialTenantForm = {
  name: "",
  document: "",
  responsible_name: "",
  email: "",
  password: "",
  phone: "",
  validity_days: "30",
  plan_label: "Trial 30 dias",
  max_users: "3",
  access_profile: "rh-operacao" as AccessProfile,
};

const initialContractForm = {
  validity_days: "30",
  plan_label: "Trial 30 dias",
  max_users: "3",
  access_profile: "rh-operacao" as AccessProfile,
  status: "Ativo",
};

function getPlanLabelForDays(days: number) {
  if (days >= 365) return "Plano Anual";
  if (days >= 180) return "Plano Semestral";
  if (days >= 90) return "Plano Trimestral";
  return "Trial 30 dias";
}

function formatDate(value?: string | null) {
  if (!value) {
    return "Não definido";
  }

  return new Date(value).toLocaleDateString("pt-BR");
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return "Sem registro";
  }

  return new Date(value).toLocaleString("pt-BR");
}

function getDaysUntil(dateValue?: string | null) {
  if (!dateValue) {
    return null;
  }

  const now = new Date();
  const target = new Date(dateValue);
  const diff = target.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getContractBadge(tenant: Tenant) {
  const days = getDaysUntil(tenant.expires_at);
  const status = tenant.contract_status || tenant.status || "Ativo";

  if (status === "Suspenso") {
    return { label: "Suspenso", color: "danger" as const };
  }

  if (days !== null && days < 0) {
    return { label: "Expirado", color: "danger" as const };
  }

  if (days !== null && days <= 30) {
    return { label: `Vence em ${days}d`, color: "warning" as const };
  }

  return { label: "Contrato ativo", color: "success" as const };
}

function isAccessProfile(value?: string | null): value is AccessProfile {
  return !!value && PROFILE_OPTIONS.includes(value as AccessProfile);
}

function normalizePermissions(value: unknown, fallbackProfile: string) {
  if (!value) {
    return getPermissionPreset(fallbackProfile);
  }

  if (typeof value === "string") {
    try {
      return normalizePermissions(JSON.parse(value), fallbackProfile);
    } catch {
      return getPermissionPreset(fallbackProfile);
    }
  }

  if (typeof value !== "object") {
    return getPermissionPreset(fallbackProfile);
  }

  const base = getPermissionPreset(fallbackProfile);
  for (const key of ACCESS_PERMISSION_KEYS) {
    if (key in (value as Record<string, unknown>)) {
      base[key] = Boolean((value as Record<string, unknown>)[key]);
    }
  }

  return base;
}

export default function SuperAdmin() {
  const location = useLocation();
  const navigate = useNavigate();

  // Derive active view from pathname
  type RootView = "overview" | "clientes" | "contratos" | "acessos";
  const activeView: RootView =
    location.pathname === "/super-admin/clientes"  ? "clientes"  :
    location.pathname === "/super-admin/contratos" ? "contratos" :
    location.pathname === "/super-admin/acessos"   ? "acessos"   : "overview";

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [tenantAccesses, setTenantAccesses] = useState<TenantAccess[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showTenantModal, setShowTenantModal] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);
  const [showLimitsModal, setShowLimitsModal] = useState(false);
  const [tenantUsage, setTenantUsage] = useState<any>(null);
  const [limitsForm, setLimitsForm] = useState({ max_jobs: 0, max_candidates: 0, max_ai_analyses_month: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isAccessLoading, setIsAccessLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Tenant | null>(null);
  const [tenantForm, setTenantForm] = useState(initialTenantForm);
  const [contractForm, setContractForm] = useState(initialContractForm);
  const toast = useToast();

  const selectedTenant = useMemo(
    () => tenants.find((tenant) => tenant.id === selectedTenantId) || null,
    [selectedTenantId, tenants]
  );

  const totals = useMemo(() => {
    const activeTenants = tenants.filter((tenant) => {
      const status = tenant.contract_status || tenant.status;
      return status !== "Expirado" && status !== "Suspenso";
    }).length;

    const expiringTenants = tenants.filter((tenant) => {
      const days = getDaysUntil(tenant.expires_at);
      return days !== null && days >= 0 && days <= 30;
    }).length;

    const totalAccesses = tenants.reduce((sum, tenant) => sum + Number(tenant.total_users || 0), 0);
    const contractedCapacity = tenants.reduce((sum, tenant) => sum + Number(tenant.max_users || 0), 0);

    return {
      activeTenants,
      expiringTenants,
      totalAccesses,
      contractedCapacity,
    };
  }, [tenants]);

  const filteredTenants = useMemo(() => {
    return tenants.filter((tenant) => {
      const matchesSearch =
        tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tenant.id.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) {
        return false;
      }

      if (statusFilter === "all") {
        return true;
      }

      if (statusFilter === "expiring") {
        const days = getDaysUntil(tenant.expires_at);
        return days !== null && days >= 0 && days <= 30;
      }

      if (statusFilter === "expired") {
        const days = getDaysUntil(tenant.expires_at);
        return days !== null && days < 0;
      }

      return (tenant.contract_status || tenant.status || "").toLowerCase() === statusFilter;
    });
  }, [searchQuery, statusFilter, tenants]);

  useEffect(() => {
    fetchTenants();
  }, []);

  useEffect(() => {
    if (!selectedTenantId && tenants.length > 0) {
      setSelectedTenantId(tenants[0].id);
      return;
    }

    if (selectedTenantId && !tenants.some((tenant) => tenant.id === selectedTenantId)) {
      setSelectedTenantId(tenants[0]?.id || null);
    }
  }, [selectedTenantId, tenants]);

  useEffect(() => {
    if (selectedTenantId) {
      fetchTenantAccesses(selectedTenantId);
      fetchTenantUsage(selectedTenantId);
    } else {
      setTenantAccesses([]);
      setTenantUsage(null);
    }
  }, [selectedTenantId]);

  const fetchTenantUsage = async (tenantId: string) => {
    try {
      const res = await fetch(`/api/tenants/${tenantId}/usage`, { headers: getAuthHeaders() });
      if (res.ok) setTenantUsage(await res.json());
    } catch { /* silent */ }
  };

  const openLimitsModal = () => {
    if (!selectedTenant) return;
    setLimitsForm({
      max_jobs:              Number((selectedTenant as any).max_jobs || 0),
      max_candidates:        Number((selectedTenant as any).max_candidates || 0),
      max_ai_analyses_month: Number((selectedTenant as any).max_ai_analyses_month || 0),
    });
    setShowLimitsModal(true);
  };

  const handleSaveLimits = async () => {
    if (!selectedTenant) return;
    try {
      await fetch(`/api/tenants/${selectedTenant.id}/limits`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(limitsForm),
      });
      toast.success('Limites atualizados com sucesso.');
      setShowLimitsModal(false);
      await fetchTenants();
    } catch {
      toast.error('Erro ao salvar limites.');
    }
  };

  const fetchTenants = async () => {
    try {
      const res = await fetch("/api/tenants", { headers: getAuthHeaders() });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || "Erro ao carregar clientes.");
      }

      const data = await res.json();
      setTenants(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao carregar clientes.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTenantAccesses = async (tenantId: string) => {
    setIsAccessLoading(true);
    try {
      const res = await fetch(`/api/tenants/${tenantId}/accesses`, { headers: getAuthHeaders() });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || "Erro ao carregar acessos do cliente.");
      }

      const data = await res.json();
      setTenantAccesses(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao carregar acessos do cliente.");
    } finally {
      setIsAccessLoading(false);
    }
  };

  const closeTenantModal = () => {
    setShowTenantModal(false);
    setTenantForm(initialTenantForm);
  };

  const closeContractModal = () => {
    setShowContractModal(false);
    setContractForm(initialContractForm);
  };

  const openContractModal = () => {
    if (!selectedTenant) {
      return;
    }

    setContractForm({
      validity_days: String(selectedTenant.validity_days || 30),
      plan_label: selectedTenant.plan_label || getPlanLabelForDays(Number(selectedTenant.validity_days || 30)),
      max_users: String(selectedTenant.max_users || 3),
      access_profile: isAccessProfile(selectedTenant.access_profile)
        ? selectedTenant.access_profile
        : "rh-operacao",
      status: selectedTenant.status || "Ativo",
    });
    setShowContractModal(true);
  };

  const updateTenantField = (field: keyof typeof initialTenantForm, value: string) => {
    setTenantForm((current) => ({ ...current, [field]: value }));
  };

  const updateContractField = (field: keyof typeof initialContractForm, value: string) => {
    setContractForm((current) => ({ ...current, [field]: value as never }));
  };

  const handleTenantValidityChange = (value: string) => {
    const days = Number(value);
    setTenantForm((current) => ({
      ...current,
      validity_days: value,
      plan_label:
        current.plan_label === "" ||
        current.plan_label === getPlanLabelForDays(Number(current.validity_days || 30))
          ? getPlanLabelForDays(days)
          : current.plan_label,
    }));
  };

  const handleContractValidityChange = (value: string) => {
    const days = Number(value);
    setContractForm((current) => ({
      ...current,
      validity_days: value,
      plan_label:
        current.plan_label === "" ||
        current.plan_label === getPlanLabelForDays(Number(current.validity_days || 30))
          ? getPlanLabelForDays(days)
          : current.plan_label,
    }));
  };

  const handleTenantSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      const res = await fetch("/api/tenants/provision", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          ...tenantForm,
          validity_days: Number(tenantForm.validity_days),
          max_users: Number(tenantForm.max_users),
        }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(payload.error || "Erro ao provisionar cliente.");
        return;
      }

      toast.success("Cliente provisionado com sucesso.");
      closeTenantModal();
      await fetchTenants();
      if (payload.tenantId) {
        setSelectedTenantId(payload.tenantId);
      }
    } catch {
      toast.error("Falha na conexão.");
    }
  };

  const handleContractSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedTenant) {
      return;
    }

    try {
      const res = await fetch(`/api/tenants/${selectedTenant.id}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          ...contractForm,
          validity_days: Number(contractForm.validity_days),
          max_users: Number(contractForm.max_users),
        }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(payload.error || "Erro ao atualizar contrato.");
        return;
      }

      toast.success("Contrato atualizado.");
      closeContractModal();
      await fetchTenants();
    } catch {
      toast.error("Erro ao atualizar contrato.");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    try {
      const res = await fetch(`/api/tenants/${deleteTarget.id}`, { method: "DELETE", headers: getAuthHeaders() });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || "Erro ao remover cliente.");
      }

      toast.success("Cliente removido.");
      setDeleteTarget(null);
      await fetchTenants();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao remover cliente.");
    }
  };

  return (
    <>
    <div className="min-h-screen bg-[#f8fafc]">
      <div className="space-y-5 px-4 pb-24 pt-5 sm:px-6">

        {/* ── PAGE HEADER ── */}
        <div id="superadmin-overview" className="relative overflow-hidden rounded-2xl bg-[#030d1c] px-5 py-6 sm:px-7">
          <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-develoi-gold/8 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 left-1/3 h-40 w-40 rounded-full bg-violet-500/6 blur-3xl" />

          <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <ShieldCheck size={12} className="text-develoi-gold/70" />
                <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/30">Root Command</span>
              </div>
              <h1 className="text-[22px] font-black leading-none tracking-tight text-white sm:text-[28px]">
                Governança de Clientes
              </h1>
              <p className="mt-1.5 text-[11px] font-medium text-white/40">
                Provisione clientes, controle contratos, acessos e validade da operação
              </p>
            </div>
            <button
              onClick={() => setShowTenantModal(true)}
              className="flex h-9 items-center gap-2 rounded-xl bg-develoi-gold px-5 text-[12px] font-bold text-develoi-navy shadow-lg shadow-develoi-gold/20 transition-all hover:bg-[#d4a83a]"
            >
              <Plus size={14} /> Novo Cliente
            </button>
          </div>

          {/* KPI strip */}
          <div className="relative z-10 mt-5 grid grid-cols-2 gap-3 border-t border-white/[0.06] pt-5 sm:grid-cols-4">
            {[
              { label: "Clientes ativos",      value: totals.activeTenants,       color: "text-white",        icon: Building2 },
              { label: "Vencendo em 30 dias",  value: totals.expiringTenants,     color: "text-amber-300",    icon: AlertTriangle },
              { label: "Acessos provisionados",value: totals.totalAccesses,       color: "text-sky-300",      icon: Users },
              { label: "Capacidade contratada",value: totals.contractedCapacity,  color: "text-emerald-400",  icon: BadgeCheck },
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl bg-white/[0.04] px-4 py-3 ring-1 ring-white/[0.06]">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.06]">
                  <s.icon size={14} className={s.color} />
                </div>
                <div>
                  <p className={`text-[20px] font-black tabular-nums leading-none ${s.color}`}>{s.value}</p>
                  <p className="mt-0.5 text-[9px] font-medium text-white/30">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── VIEWS ── */}
        {/* ─── OVERVIEW ─────────────────────────────────── */}
        {activeView === "overview" && (
          <div className="space-y-5">
            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
              <div className="flex items-center gap-2.5 border-b border-zinc-100 px-5 py-4">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-develoi-navy/8">
                  <Building2 size={13} className="text-develoi-navy" />
                </div>
                <span className="text-[13px] font-bold text-zinc-900">Resumo da operação root</span>
              </div>
              <div className="grid gap-0 divide-y divide-zinc-50 p-1">
                {[
                  { label: "Clientes ativos",       value: totals.activeTenants,      color: "text-develoi-navy" },
                  { label: "Vencendo em 30 dias",   value: totals.expiringTenants,    color: "text-amber-600" },
                  { label: "Acessos provisionados", value: totals.totalAccesses,      color: "text-sky-600" },
                  { label: "Capacidade contratada", value: totals.contractedCapacity, color: "text-emerald-600" },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between rounded-xl px-4 py-3">
                    <span className="text-[12px] font-medium text-zinc-500">{row.label}</span>
                    <span className={cn("text-[20px] font-black tabular-nums", row.color)}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick access cards */}
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { href: "/super-admin/clientes",  title: "Clientes",  desc: "Gerencie tenants e contratos", icon: Building2, color: "text-develoi-navy bg-develoi-navy/8" },
                { href: "/super-admin/contratos", title: "Contratos", desc: "Validade, planos e capacidade", icon: ShieldCheck, color: "text-develoi-gold bg-develoi-gold/10" },
                { href: "/super-admin/acessos",   title: "Acessos",   desc: "Usuários e permissões",         icon: Users,      color: "text-emerald-600 bg-emerald-50" },
              ].map(c => (
                <button key={c.href} onClick={() => navigate(c.href)}
                  className="group flex items-start gap-3 rounded-2xl border border-zinc-200 bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-develoi-navy/20 hover:shadow-md">
                  <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", c.color)}>
                    <c.icon size={18} />
                  </div>
                  <div>
                    <p className="text-[14px] font-bold text-zinc-900">{c.title}</p>
                    <p className="mt-0.5 text-[11px] text-zinc-400">{c.desc}</p>
                  </div>
                  <ChevronRight size={14} className="ml-auto mt-1 shrink-0 text-zinc-300 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-500" />
                </button>
              ))}
            </div>

            {/* Tenants list preview */}
            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
              <div className="flex items-center justify-between gap-3 border-b border-zinc-100 px-5 py-4">
                <span className="text-[13px] font-bold text-zinc-900">Clientes recentes</span>
                <button onClick={() => navigate("/super-admin/clientes")}
                  className="text-[11px] font-semibold text-develoi-navy transition-colors hover:text-develoi-navy/70">
                  Ver todos →
                </button>
              </div>
              <div className="divide-y divide-zinc-50">
                {tenants.slice(0, 5).map(t => {
                  const badge = getContractBadge(t);
                  return (
                    <div key={t.id} className="flex items-center gap-3 px-5 py-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-develoi-navy/8 text-develoi-navy">
                        <Building2 size={14} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12px] font-semibold text-zinc-900">{t.name}</p>
                        <p className="text-[10px] text-zinc-400">{t.plan_label || "Sem plano"} · {t.total_users || 0}/{t.max_users || 0} acessos</p>
                      </div>
                      <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                        badge.color === "success" ? "bg-emerald-50 text-emerald-700" :
                        badge.color === "warning" ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"
                      )}>{badge.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ─── CLIENTES + CONTRATOS ─────────────────────── */}
        {(activeView === "clientes" || activeView === "contratos") && (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(340px,0.9fr)]">

          {/* LEFT — tenant list */}
          <div className="space-y-4">
            {/* Filter bar */}
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-3 py-2.5 shadow-sm sm:gap-3 sm:px-4">
              <div className="relative flex min-w-[180px] flex-1 items-center">
                <Search size={13} className="pointer-events-none absolute left-3 text-zinc-400" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por nome ou ID…"
                  className="h-8 w-full rounded-lg border border-zinc-200 bg-zinc-50 pl-8 pr-3 text-[12px] font-medium text-zinc-800 outline-none transition-all placeholder:text-zinc-400 focus:border-develoi-gold/50 focus:bg-white focus:ring-2 focus:ring-develoi-gold/15"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-8 w-full cursor-pointer appearance-none rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-[12px] font-medium text-zinc-700 outline-none transition-all sm:w-44"
                style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 8L1 3h10z'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center", backgroundSize: "10px", paddingRight: "2rem" }}
              >
                <option value="all">Todos os contratos</option>
                <option value="ativo">Ativos</option>
                <option value="suspenso">Suspensos</option>
                <option value="expiring">Vencendo em 30d</option>
                <option value="expired">Expirados</option>
              </select>
            </div>

            {/* List */}
            {isLoading ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-zinc-200 bg-white py-20 shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-develoi-navy/5">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-develoi-navy/20 border-t-develoi-navy" />
                </div>
                <p className="text-[11px] font-medium text-zinc-400">Carregando clientes…</p>
              </div>
            ) : filteredTenants.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-zinc-200 bg-white py-16 shadow-sm">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400">
                  <Globe size={24} />
                </div>
                <div className="text-center">
                  <p className="text-[14px] font-semibold text-zinc-700">Nenhum cliente encontrado</p>
                  <p className="mt-1 text-[12px] text-zinc-400">Crie um novo contrato ou ajuste o filtro.</p>
                </div>
                <button onClick={() => setShowTenantModal(true)}
                  className="flex items-center gap-1.5 rounded-xl bg-develoi-navy px-4 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-[#0a1e3a]">
                  <Plus size={13} /> Provisionar Cliente
                </button>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {filteredTenants.map((tenant, index) => {
                  const contractBadge = getContractBadge(tenant);
                  const selected = tenant.id === selectedTenantId;
                  const days = getDaysUntil(tenant.expires_at);
                  const usagePct = tenant.max_users ? Math.min(100, Math.round(((tenant.total_users || 0) / tenant.max_users) * 100)) : 0;

                  return (
                    <motion.div
                      key={tenant.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03, duration: 0.2 }}
                      onClick={() => setSelectedTenantId(tenant.id)}
                      role="button" tabIndex={0}
                      onKeyDown={(e) => { if (e.key === "Enter") setSelectedTenantId(tenant.id); }}
                      className={cn(
                        "group cursor-pointer overflow-hidden rounded-2xl border bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md",
                        selected ? "border-develoi-gold/50 ring-2 ring-develoi-gold/20" : "border-zinc-200 hover:border-zinc-300"
                      )}
                    >
                      {/* Top band */}
                      <div className={cn("h-0.5",
                        contractBadge.color === "success" ? "bg-emerald-500" :
                        contractBadge.color === "warning" ? "bg-amber-400" : "bg-rose-500"
                      )} />

                      <div className="p-4">
                        {/* Header */}
                        <div className="mb-3 flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2.5 min-w-0">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-develoi-navy/8 text-develoi-navy">
                              <Building2 size={16} />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-[13px] font-bold text-zinc-900">{tenant.name}</p>
                              <p className="text-[10px] font-medium text-zinc-400">ID: {tenant.id}</p>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-1.5">
                            <span className={cn(
                              "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                              contractBadge.color === "success" ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" :
                              contractBadge.color === "warning" ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200" :
                              "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
                            )}>
                              {contractBadge.label}
                            </span>
                            <button
                              onClick={(e) => { e.stopPropagation(); setDeleteTarget(tenant); }}
                              className="flex h-6 w-6 items-center justify-center rounded-lg text-zinc-300 transition-colors hover:bg-rose-50 hover:text-rose-500"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>

                        {/* Plan badge */}
                        <span className="mb-3 inline-block rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-500">
                          {tenant.plan_label || "Sem plano"}
                        </span>

                        {/* Stats row */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="rounded-xl bg-zinc-50 px-3 py-2.5">
                            <p className="text-[9px] font-semibold uppercase tracking-wider text-zinc-400">Validade</p>
                            <p className="mt-0.5 text-[13px] font-bold text-zinc-900">{formatDate(tenant.expires_at)}</p>
                            <p className="text-[9px] text-zinc-400">
                              {days === null ? "Sem prazo" : days >= 0 ? `${days}d restantes` : `${Math.abs(days)}d vencido`}
                            </p>
                          </div>
                          <div className="rounded-xl bg-zinc-50 px-3 py-2.5">
                            <p className="text-[9px] font-semibold uppercase tracking-wider text-zinc-400">Ocupação</p>
                            <p className="mt-0.5 text-[13px] font-bold text-zinc-900">{tenant.total_users || 0}/{tenant.max_users || 0}</p>
                            <div className="mt-1 h-1 overflow-hidden rounded-full bg-zinc-200">
                              <div className={cn("h-full rounded-full", usagePct > 80 ? "bg-amber-400" : "bg-emerald-500")} style={{ width: `${usagePct}%` }} />
                            </div>
                          </div>
                        </div>

                        {/* Footer */}
                        <div className="mt-3 flex items-center justify-between border-t border-zinc-100 pt-2.5 text-[10px] text-zinc-400">
                          <span>{ACCESS_PROFILE_LABELS[isAccessProfile(tenant.access_profile) ? tenant.access_profile : "rh-operacao"]}</span>
                          <span>{tenant.last_login ? formatDate(tenant.last_login) : "Sem login"}</span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* RIGHT — tenant detail */}
          <div id="superadmin-contratos" className="space-y-4 self-start xl:sticky xl:top-6">
            {!selectedTenant ? (
              <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-zinc-200 bg-white py-20 shadow-sm">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400">
                  <ShieldCheck size={24} />
                </div>
                <div className="text-center">
                  <p className="text-[14px] font-semibold text-zinc-700">Selecione um cliente</p>
                  <p className="mt-1 text-[12px] text-zinc-400">Clique em um card ao lado para ver detalhes.</p>
                </div>
              </div>
            ) : (
              <>
                {/* Contract card */}
                <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
                  <div className="flex items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4">
                    <div className="min-w-0">
                      <h2 className="truncate text-[14px] font-bold text-zinc-900">{selectedTenant.name}</h2>
                      <p className="text-[11px] text-zinc-400">
                        {selectedTenant.plan_label || "Sem plano"} · {selectedTenant.id}
                      </p>
                    </div>
                    <button
                      onClick={openContractModal}
                      className="flex shrink-0 items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-[11px] font-semibold text-zinc-700 transition-colors hover:border-develoi-navy/30 hover:text-develoi-navy"
                    >
                      <Settings2 size={12} /> Ajustar
                    </button>
                  </div>

                  <div className="grid grid-cols-3 divide-x divide-zinc-100 p-0">
                    {[
                      { label: "Validade",          value: formatDate(selectedTenant.expires_at),    sub: `Início ${formatDate(selectedTenant.starts_at || selectedTenant.created_at)}` },
                      { label: "Acessos",           value: `${selectedTenant.total_users||0}/${selectedTenant.max_users||0}`, sub: `${selectedTenant.active_users||0} ativos` },
                      { label: "Status",            value: null,                                      sub: selectedTenant.document || "—", badge: getContractBadge(selectedTenant) },
                    ].map((s, i) => (
                      <div key={i} className="px-4 py-3.5">
                        <p className="mb-1 text-[9px] font-bold uppercase tracking-wider text-zinc-400">{s.label}</p>
                        {s.badge ? (
                          <span className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                            s.badge.color === "success" ? "bg-emerald-50 text-emerald-700" :
                            s.badge.color === "warning" ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"
                          )}>{s.badge.label}</span>
                        ) : (
                          <p className="text-[13px] font-bold text-zinc-900">{s.value}</p>
                        )}
                        <p className="mt-0.5 text-[9px] text-zinc-400">{s.sub}</p>
                      </div>
                    ))}
                  </div>

                  {/* Perfil padrão + permissões */}
                  <div className="border-t border-zinc-100 px-5 py-4">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400">Perfil padrão novos acessos</p>
                    <p className="mb-2.5 text-[13px] font-bold text-zinc-900">
                      {ACCESS_PROFILE_LABELS[isAccessProfile(selectedTenant.access_profile) ? selectedTenant.access_profile : "rh-operacao"]}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {ACCESS_PERMISSION_KEYS.filter(key =>
                        key !== "super_admin" &&
                        getPermissionPreset(isAccessProfile(selectedTenant.access_profile) ? selectedTenant.access_profile : "rh-operacao")[key]
                      ).map(key => (
                        <span key={key} className="rounded-md bg-develoi-navy/8 px-2 py-0.5 text-[10px] font-semibold text-develoi-navy">
                          {ACCESS_PERMISSION_LABELS[key]}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Governança metrics */}
                  <div className="border-t border-zinc-100 px-5 py-4">
                    <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-zinc-400">Uso e governança</p>
                    <div className="space-y-2">
                      {[
                        { label: "Admins provisionados", value: selectedTenant.admin_users || 0 },
                        { label: "Último login",         value: selectedTenant.last_login ? formatDate(selectedTenant.last_login) : "Sem acesso" },
                        { label: "Validade contratada",  value: `${selectedTenant.validity_days || 30} dias` },
                      ].map(row => (
                        <div key={row.label} className="flex items-center justify-between">
                          <span className="text-[11px] font-medium text-zinc-500">{row.label}</span>
                          <span className="text-[12px] font-bold text-zinc-800">{row.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Limites de uso */}
                  <div className="border-t border-zinc-100 px-5 py-4">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-[13px] font-bold text-zinc-900">Limites de uso</p>
                      <button
                        onClick={openLimitsModal}
                        className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-[11px] font-semibold text-zinc-700 transition-colors hover:border-develoi-navy/30 hover:text-develoi-navy"
                      >
                        <Settings2 size={12} /> Configurar
                      </button>
                    </div>
                    <div className="space-y-2.5">
                      {[
                        {
                          label: 'Vagas ativas',
                          current: tenantUsage?.jobs_active ?? '—',
                          max: Number((selectedTenant as any).max_jobs || 0),
                          color: 'bg-develoi-navy',
                        },
                        {
                          label: 'Candidatos',
                          current: tenantUsage?.candidates_total ?? '—',
                          max: Number((selectedTenant as any).max_candidates || 0),
                          color: 'bg-emerald-500',
                        },
                        {
                          label: `Análises IA (${tenantUsage?.year_month ?? 'mês atual'})`,
                          current: tenantUsage?.ai_analyses_month ?? '—',
                          max: Number((selectedTenant as any).max_ai_analyses_month || 0),
                          color: 'bg-develoi-gold',
                        },
                      ].map(item => {
                        const isUnlimited = item.max === 0;
                        const pct = (!isUnlimited && typeof item.current === 'number' && item.max > 0)
                          ? Math.min(100, Math.round((item.current / item.max) * 100))
                          : 0;
                        const isNearLimit = pct >= 80;
                        return (
                          <div key={item.label}>
                            <div className="mb-1 flex items-center justify-between">
                              <span className="text-[11px] font-medium text-zinc-500">{item.label}</span>
                              <span className={cn(
                                "text-[11px] font-bold tabular-nums",
                                isNearLimit ? "text-rose-600" : "text-zinc-800"
                              )}>
                                {item.current}{isUnlimited ? '' : `/${item.max}`}
                                {isUnlimited && <span className="ml-1 text-zinc-400 font-normal">(ilimitado)</span>}
                              </span>
                            </div>
                            {!isUnlimited && (
                              <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100">
                                <div
                                  className={cn("h-full rounded-full transition-all", isNearLimit ? "bg-rose-500" : item.color)}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Sync Shigueno toggle */}
                  <div className="border-t border-zinc-100 px-5 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[13px] font-semibold text-zinc-900">Sincronizar com Portal Shigueno</p>
                        <p className="mt-0.5 text-[11px] text-zinc-400">
                          Vagas publicadas deste cliente serão enviadas automaticamente para o portal Shigueno.
                        </p>
                      </div>
                      <button
                        onClick={async () => {
                          const current = !!(selectedTenant as any).sync_shigueno;
                          try {
                            await fetch(`/api/tenants/${selectedTenant.id}/sync-shigueno`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                              body: JSON.stringify({ sync_shigueno: !current }),
                            });
                            await fetchTenants();
                          } catch { /* silent */ }
                        }}
                        className={cn(
                          "relative flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 transition-colors",
                          (selectedTenant as any).sync_shigueno
                            ? "border-emerald-500 bg-emerald-500"
                            : "border-zinc-300 bg-zinc-200"
                        )}
                      >
                        <span className={cn(
                          "inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
                          (selectedTenant as any).sync_shigueno ? "translate-x-5" : "translate-x-0.5"
                        )} />
                      </button>
                    </div>
                    {(selectedTenant as any).sync_shigueno && (
                      <p className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-emerald-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Ativo — vagas deste cliente sincronizam com o portal
                      </p>
                    )}
                  </div>
                </div>

                {/* Acessos card */}
                <div id="superadmin-acessos" className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
                  <div className="flex items-center gap-2.5 border-b border-zinc-100 px-5 py-4">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-develoi-navy/8">
                      <Users size={13} className="text-develoi-navy" />
                    </div>
                    <div>
                      <span className="text-[13px] font-bold text-zinc-900">Acessos do cliente</span>
                      <p className="text-[10px] text-zinc-400">Perfis e módulos liberados</p>
                    </div>
                  </div>

                  {isAccessLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-develoi-navy/20 border-t-develoi-navy" />
                    </div>
                  ) : tenantAccesses.length === 0 ? (
                    <div className="flex flex-col items-center gap-2.5 py-12 text-center">
                      <KeyRound size={22} className="text-zinc-300" />
                      <p className="text-[12px] font-medium text-zinc-500">Nenhum acesso provisionado</p>
                      <p className="text-[11px] text-zinc-400">O admin pode criar usuários em Administração.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-zinc-50">
                      {tenantAccesses.map((access) => {
                        const permissions = normalizePermissions(access.permissions_json, access.access_profile || access.role);
                        const isActive = access.status === "Ativo";
                        return (
                          <div key={access.id} className="px-5 py-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                                  <p className="truncate text-[13px] font-semibold text-zinc-900">{access.full_name}</p>
                                  <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-bold", isActive ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600")}>
                                    {access.status}
                                  </span>
                                  <span className="rounded-md bg-develoi-navy/8 px-1.5 py-0.5 text-[9px] font-semibold text-develoi-navy">
                                    {ACCESS_PROFILE_LABELS[isAccessProfile(access.access_profile) ? access.access_profile : "custom"]}
                                  </span>
                                </div>
                                <p className="truncate text-[11px] text-zinc-400">{access.email}</p>
                              </div>
                              <div className="shrink-0 text-right">
                                <p className="text-[9px] text-zinc-400">Último uso</p>
                                <p className="text-[11px] font-semibold text-zinc-600">{formatDateTime(access.last_login)}</p>
                              </div>
                            </div>
                            <div className="mt-2.5 flex flex-wrap gap-1">
                              {ACCESS_PERMISSION_KEYS.filter(key => key !== "super_admin" && permissions[key]).map(key => (
                                <span key={key} className="rounded bg-zinc-100 px-1.5 py-0.5 text-[9px] font-semibold text-zinc-600">
                                  {ACCESS_PERMISSION_LABELS[key]}
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
        )} {/* end clientes/contratos */}

        {/* ─── ACESSOS ─────────────────────────────────── */}
        {activeView === "acessos" && (
          <div className="space-y-4">
            {/* Tenant selector */}
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-3 py-2.5 shadow-sm sm:gap-3 sm:px-4">
              <div className="relative flex min-w-[180px] flex-1 items-center">
                <Search size={13} className="pointer-events-none absolute left-3 text-zinc-400" />
                <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar cliente…"
                  className="h-8 w-full rounded-lg border border-zinc-200 bg-zinc-50 pl-8 pr-3 text-[12px] font-medium text-zinc-800 outline-none transition-all placeholder:text-zinc-400 focus:border-develoi-gold/50 focus:bg-white focus:ring-2 focus:ring-develoi-gold/15" />
              </div>
              {/* Tenant quick-select pills */}
              <div className="flex flex-wrap gap-1.5">
                {filteredTenants.slice(0, 6).map(t => (
                  <button key={t.id} onClick={() => setSelectedTenantId(t.id)}
                    className={cn("rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all",
                      selectedTenantId === t.id ? "bg-develoi-navy text-white shadow-sm" : "border border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100"
                    )}>
                    {t.name}
                  </button>
                ))}
              </div>
            </div>

            {!selectedTenant ? (
              <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-zinc-200 bg-white py-20 shadow-sm">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400">
                  <Users size={24} />
                </div>
                <div className="text-center">
                  <p className="text-[14px] font-semibold text-zinc-700">Selecione um cliente</p>
                  <p className="mt-1 text-[12px] text-zinc-400">Escolha um cliente acima para ver seus usuários e permissões.</p>
                </div>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
                <div className="flex items-center justify-between gap-3 border-b border-zinc-100 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-develoi-navy/8">
                      <Users size={14} className="text-develoi-navy" />
                    </div>
                    <div>
                      <span className="text-[14px] font-bold text-zinc-900">{selectedTenant.name}</span>
                      <p className="text-[11px] text-zinc-400">{tenantAccesses.length} acesso{tenantAccesses.length !== 1 ? "s" : ""} provisionado{tenantAccesses.length !== 1 ? "s" : ""}</p>
                    </div>
                  </div>
                </div>

                {isAccessLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-develoi-navy/20 border-t-develoi-navy" />
                  </div>
                ) : tenantAccesses.length === 0 ? (
                  <div className="flex flex-col items-center gap-2.5 py-14 text-center">
                    <KeyRound size={22} className="text-zinc-300" />
                    <p className="text-[12px] font-medium text-zinc-500">Nenhum acesso provisionado</p>
                    <p className="text-[11px] text-zinc-400">O admin pode criar usuários em Administração.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-50">
                    {tenantAccesses.map((access) => {
                      const permissions = normalizePermissions(access.permissions_json, access.access_profile || access.role);
                      const isActive = access.status === "Ativo";
                      return (
                        <div key={access.id} className="px-5 py-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                                <p className="truncate text-[13px] font-semibold text-zinc-900">{access.full_name}</p>
                                <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-bold", isActive ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600")}>
                                  {access.status}
                                </span>
                                <span className="rounded-md bg-develoi-navy/8 px-1.5 py-0.5 text-[9px] font-semibold text-develoi-navy">
                                  {ACCESS_PROFILE_LABELS[isAccessProfile(access.access_profile) ? access.access_profile : "custom"]}
                                </span>
                              </div>
                              <p className="truncate text-[11px] text-zinc-400">{access.email}</p>
                            </div>
                            <div className="shrink-0 text-right">
                              <p className="text-[9px] text-zinc-400">Último uso</p>
                              <p className="text-[11px] font-semibold text-zinc-600">{formatDateTime(access.last_login)}</p>
                            </div>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {ACCESS_PERMISSION_KEYS.filter(key => key !== "super_admin" && permissions[key]).map(key => (
                              <span key={key} className="rounded bg-zinc-100 px-1.5 py-0.5 text-[9px] font-semibold text-zinc-600">
                                {ACCESS_PERMISSION_LABELS[key]}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )} {/* end acessos */}

      </div>
    </div>

    <AnimatePresence>
        {showTenantModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={closeTenantModal} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.97 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl"
            >
              {/* Modal header navy */}
              <div className="relative overflow-hidden bg-develoi-navy px-6 py-5">
                <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-develoi-gold/10 blur-3xl" />
                <div className="relative z-10 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-develoi-gold/15 ring-1 ring-develoi-gold/25">
                      <UserPlus size={16} className="text-develoi-gold" />
                    </div>
                    <div>
                      <p className="text-[14px] font-bold text-white">Provisionar Novo Cliente</p>
                      <p className="text-[11px] text-white/40">Crie contrato, acessos e o admin principal</p>
                    </div>
                  </div>
                  <button onClick={closeTenantModal} className="flex h-7 w-7 items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-white/10 hover:text-white">
                    ✕
                  </button>
                </div>
              </div>

              <form onSubmit={handleTenantSubmit} className="p-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <Input label="Nome da Empresa" value={tenantForm.name} onChange={(e) => updateTenantField("name", e.target.value)} placeholder="Ex: Corporação Acme" required />
                  <Input label="CNPJ / Documento" value={tenantForm.document} onChange={(e) => updateTenantField("document", formatCpfOrCnpj(e.target.value))} placeholder="00.000.000/0000-00" inputMode="numeric" maxLength={18} />
                  <Input label="Responsável Mestre" value={tenantForm.responsible_name} onChange={(e) => updateTenantField("responsible_name", e.target.value)} placeholder="Nome do administrador" required />
                  <Input label="E-mail do Acesso Principal" type="email" value={tenantForm.email} onChange={(e) => updateTenantField("email", e.target.value)} placeholder="admin@empresa.com" required />
                  <Input label="Senha Inicial" type="password" value={tenantForm.password} onChange={(e) => updateTenantField("password", e.target.value)} showPasswordToggle placeholder="••••••••" required />
                  <Input label="Telefone de Contato" value={tenantForm.phone} onChange={(e) => updateTenantField("phone", formatPhoneBr(e.target.value))} placeholder="(00) 00000-0000" inputMode="tel" maxLength={15} />
                  <Select label="Validade Inicial" value={tenantForm.validity_days} onChange={(e) => handleTenantValidityChange(e.target.value)}>
                    {VALIDITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </Select>
                  <Input label="Nome do Plano" value={tenantForm.plan_label} onChange={(e) => updateTenantField("plan_label", e.target.value)} placeholder="Plano Anual" />
                  <Input label="Limite de Acessos" type="number" min={1} value={tenantForm.max_users} onChange={(e) => updateTenantField("max_users", e.target.value)} />
                  <Select label="Perfil Padrão de Novos Acessos" value={tenantForm.access_profile} onChange={(e) => updateTenantField("access_profile", e.target.value)}>
                    <option value="rh-operacao">RH Operação</option>
                    <option value="executivo-leitura">Executivo Leitura</option>
                    <option value="admin-mestre">Admin Mestre</option>
                  </Select>
                </div>

                <div className="mt-5 flex gap-3">
                  <button type="button" onClick={closeTenantModal}
                    className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50 py-2.5 text-[12px] font-semibold text-zinc-600 transition-colors hover:bg-zinc-100">
                    Cancelar
                  </button>
                  <button type="submit"
                    className="flex-1 rounded-xl bg-develoi-navy py-2.5 text-[12px] font-bold text-white shadow-sm transition-colors hover:bg-[#0a1e3a]">
                    Finalizar Provisionamento
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showContractModal && selectedTenant && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-8">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={closeContractModal} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl"
            >
              {/* Header */}
              <div className="relative overflow-hidden bg-develoi-navy px-6 py-5">
                <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-develoi-gold/10 blur-3xl" />
                <div className="relative z-10 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-develoi-gold/15 ring-1 ring-develoi-gold/25">
                      <CalendarClock size={16} className="text-develoi-gold" />
                    </div>
                    <div>
                      <p className="text-[14px] font-bold text-white">Ajustar Contrato</p>
                      <p className="text-[11px] text-white/40">{selectedTenant.name}</p>
                    </div>
                  </div>
                  <button onClick={closeContractModal} className="flex h-7 w-7 items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-white/10 hover:text-white">✕</button>
                </div>
              </div>

              <form onSubmit={handleContractSubmit} className="p-6 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Select label="Status do Contrato" value={contractForm.status} onChange={(e) => updateContractField("status", e.target.value)}>
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </Select>
                  <Select label="Validade" value={contractForm.validity_days} onChange={(e) => handleContractValidityChange(e.target.value)}>
                    {VALIDITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </Select>
                  <Input label="Nome do Plano" value={contractForm.plan_label} onChange={(e) => updateContractField("plan_label", e.target.value)} />
                  <Input label="Limite de Acessos" type="number" min={1} value={contractForm.max_users} onChange={(e) => updateContractField("max_users", e.target.value)} />
                  <div className="sm:col-span-2">
                    <Select label="Perfil Padrão de Novos Acessos" value={contractForm.access_profile} onChange={(e) => updateContractField("access_profile", e.target.value as AccessProfile)}>
                      {PROFILE_OPTIONS.filter(p => p !== "custom").map(p => <option key={p} value={p}>{ACCESS_PROFILE_LABELS[p]}</option>)}
                    </Select>
                  </div>
                </div>

                {/* Situação atual */}
                <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4">
                  <p className="mb-2.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400">Situação atual</p>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Início",     value: formatDate(selectedTenant.starts_at || selectedTenant.created_at) },
                      { label: "Expira em",  value: formatDate(selectedTenant.expires_at) },
                      { label: "Capacidade", value: `${selectedTenant.total_users||0}/${selectedTenant.max_users||0}` },
                    ].map(row => (
                      <div key={row.label}>
                        <p className="text-[9px] font-semibold uppercase tracking-wider text-zinc-400">{row.label}</p>
                        <p className="mt-0.5 text-[12px] font-bold text-zinc-800">{row.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={closeContractModal}
                    className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50 py-2.5 text-[12px] font-semibold text-zinc-600 transition-colors hover:bg-zinc-100">
                    Cancelar
                  </button>
                  <button type="submit"
                    className="flex-1 rounded-xl bg-develoi-navy py-2.5 text-[12px] font-bold text-white shadow-sm transition-colors hover:bg-[#0a1e3a]">
                    Salvar Contrato
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteTarget && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setDeleteTarget(null)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.18 }}
              className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl"
            >
              <div className="flex flex-col items-center gap-4 p-8 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 ring-1 ring-rose-200">
                  <Trash2 size={22} />
                </div>
                <div>
                  <h2 className="text-[16px] font-bold text-zinc-900">Excluir cliente?</h2>
                  <p className="mt-1.5 text-[13px] font-medium leading-relaxed text-zinc-500">
                    Deseja remover <span className="font-bold text-rose-600">{deleteTarget.name}</span> e todos os dados relacionados? Esta ação é irreversível.
                  </p>
                </div>
                <div className="flex w-full gap-3">
                  <button onClick={() => setDeleteTarget(null)}
                    className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50 py-2.5 text-[12px] font-semibold text-zinc-600 transition-colors hover:bg-zinc-100">
                    Cancelar
                  </button>
                  <button onClick={handleDelete}
                    className="flex-1 rounded-xl bg-rose-500 py-2.5 text-[12px] font-bold text-white shadow-sm transition-colors hover:bg-rose-600">
                    Remover
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Modal: Limites de uso ── */}
      <AnimatePresence>
        {showLimitsModal && selectedTenant && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 sm:p-8">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowLimitsModal(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-md overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl"
            >
              {/* Header navy */}
              <div className="relative overflow-hidden bg-develoi-navy px-6 py-5">
                <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-develoi-gold/10 blur-3xl" />
                <div className="relative z-10 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-develoi-gold/15 ring-1 ring-develoi-gold/25">
                      <ShieldCheck size={16} className="text-develoi-gold" />
                    </div>
                    <div>
                      <p className="text-[14px] font-bold text-white">Limites de uso</p>
                      <p className="text-[11px] text-white/40">{selectedTenant.name}</p>
                    </div>
                  </div>
                  <button onClick={() => setShowLimitsModal(false)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-white/10 hover:text-white">✕</button>
                </div>
              </div>

              <div className="p-6 space-y-5">
                <p className="text-[12px] text-zinc-500 leading-relaxed">
                  Defina os limites máximos para este cliente. <strong>0 = ilimitado</strong>.
                  Análises IA reiniciam todo mês automaticamente.
                </p>

                {[
                  { key: 'max_jobs' as const, label: 'Máximo de vagas ativas', desc: 'Vagas com status diferente de Encerrada', icon: Briefcase, current: tenantUsage?.jobs_active },
                  { key: 'max_candidates' as const, label: 'Máximo de candidatos', desc: 'Total no banco de talentos', icon: Users, current: tenantUsage?.candidates_total },
                  { key: 'max_ai_analyses_month' as const, label: 'Máximo de análises IA / mês', desc: `Análises de aderência geradas (renova em ${new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toLocaleDateString('pt-BR')})`, icon: Brain, current: tenantUsage?.ai_analyses_month },
                ].map(field => (
                  <div key={field.key}>
                    <div className="mb-1.5 flex items-center gap-2">
                      <field.icon size={14} className="text-develoi-navy" />
                      <label className="text-[12px] font-semibold text-zinc-800">{field.label}</label>
                    </div>
                    <p className="mb-1.5 text-[11px] text-zinc-400">{field.desc}</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        value={limitsForm[field.key]}
                        onChange={e => setLimitsForm(f => ({ ...f, [field.key]: Number(e.target.value) || 0 }))}
                        className="h-9 w-28 rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-[13px] font-semibold text-zinc-900 outline-none transition-all focus:border-develoi-gold/50 focus:bg-white focus:ring-2 focus:ring-develoi-gold/15"
                      />
                      <span className="text-[11px] text-zinc-400">
                        atual: <strong className="text-zinc-700">{field.current ?? '—'}</strong>
                        {limitsForm[field.key] === 0 && <span className="ml-2 text-emerald-600 font-medium">ilimitado</span>}
                      </span>
                    </div>
                  </div>
                ))}

                <div className="flex gap-3 pt-1">
                  <button onClick={() => setShowLimitsModal(false)}
                    className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50 py-2.5 text-[12px] font-semibold text-zinc-600 transition-colors hover:bg-zinc-100">
                    Cancelar
                  </button>
                  <button onClick={handleSaveLimits}
                    className="flex-1 rounded-xl bg-develoi-navy py-2.5 text-[12px] font-bold text-white shadow-sm transition-colors hover:bg-[#0a1e3a]">
                    Salvar limites
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
