import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertTriangle,
  BadgeCheck,
  Building2,
  CalendarClock,
  Clock3,
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
  Switch,
  useToast,
} from "../components/ui";
import { formatCpfOrCnpj, formatPhoneBr } from "../lib/masks";
import {
  ACCESS_PERMISSION_KEYS,
  ACCESS_PERMISSION_LABELS,
  ACCESS_PROFILE_LABELS,
  AccessPermissionKey,
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

const initialAccessForm = {
  tenant_id: "",
  full_name: "",
  email: "",
  password: "",
  role: "user",
  status: "Ativo",
  access_profile: "rh-operacao" as AccessProfile,
  permissions: getPermissionPreset("rh-operacao"),
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
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [tenantAccesses, setTenantAccesses] = useState<TenantAccess[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showTenantModal, setShowTenantModal] = useState(false);
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccessLoading, setIsAccessLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Tenant | null>(null);
  const [tenantForm, setTenantForm] = useState(initialTenantForm);
  const [accessForm, setAccessForm] = useState(initialAccessForm);
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
    } else {
      setTenantAccesses([]);
    }
  }, [selectedTenantId]);

  const fetchTenants = async () => {
    try {
      const res = await fetch("/api/tenants");
      if (!res.ok) {
        throw new Error();
      }

      const data = await res.json();
      setTenants(data);
    } catch {
      toast.error("Erro ao carregar clientes.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTenantAccesses = async (tenantId: string) => {
    setIsAccessLoading(true);
    try {
      const res = await fetch(`/api/tenants/${tenantId}/accesses`);
      if (!res.ok) {
        throw new Error();
      }

      const data = await res.json();
      setTenantAccesses(data);
    } catch {
      toast.error("Erro ao carregar acessos do cliente.");
    } finally {
      setIsAccessLoading(false);
    }
  };

  const closeTenantModal = () => {
    setShowTenantModal(false);
    setTenantForm(initialTenantForm);
  };

  const closeAccessModal = () => {
    setShowAccessModal(false);
    setAccessForm(initialAccessForm);
  };

  const closeContractModal = () => {
    setShowContractModal(false);
    setContractForm(initialContractForm);
  };

  const openAccessModal = () => {
    const fallbackProfile = isAccessProfile(selectedTenant?.access_profile)
      ? selectedTenant.access_profile
      : "rh-operacao";

    setAccessForm({
      ...initialAccessForm,
      tenant_id: selectedTenant?.id || tenants[0]?.id || "",
      access_profile: fallbackProfile,
      permissions: getPermissionPreset(fallbackProfile),
    });
    setShowAccessModal(true);
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

  const updateAccessField = (field: keyof typeof initialAccessForm, value: string) => {
    setAccessForm((current) => ({ ...current, [field]: value as never }));
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

  const handleAccessProfileChange = (profile: string) => {
    const accessProfile = profile as AccessProfile;
    setAccessForm((current) => ({
      ...current,
      access_profile: accessProfile,
      permissions:
        accessProfile === "custom"
          ? current.permissions
          : getPermissionPreset(accessProfile),
    }));
  };

  const toggleAccessPermission = (key: AccessPermissionKey) => {
    setAccessForm((current) => ({
      ...current,
      access_profile: "custom",
      permissions: {
        ...current.permissions,
        [key]: !current.permissions[key],
      },
    }));
  };

  const handleTenantSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      const res = await fetch("/api/tenants/provision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

  const handleAccessSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!accessForm.tenant_id) {
      toast.error("Selecione um cliente.");
      return;
    }

    try {
      const res = await fetch(`/api/tenants/${accessForm.tenant_id}/accesses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...accessForm,
          permissions_json: accessForm.permissions,
        }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(payload.error || "Erro ao criar acesso.");
        return;
      }

      toast.success("Novo acesso provisionado.");
      closeAccessModal();
      await fetchTenants();
      if (accessForm.tenant_id === selectedTenantId) {
        await fetchTenantAccesses(accessForm.tenant_id);
      }
    } catch {
      toast.error("Erro ao criar acesso.");
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
        headers: { "Content-Type": "application/json" },
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
      const res = await fetch(`/api/tenants/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error();
      }

      toast.success("Cliente removido.");
      setDeleteTarget(null);
      await fetchTenants();
    } catch {
      toast.error("Erro ao remover cliente.");
    }
  };

  return (
    <div className="w-full animate-in fade-in duration-500">
      <div className="space-y-8">
        <PanelCard
          className="overflow-hidden rounded-[40px] border-zinc-900 bg-zinc-900 text-white shadow-2xl"
          contentClassName="p-8 md:p-10 xl:p-12"
        >
          <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="rounded-3xl bg-develoi-gold p-4 text-white shadow-xl shadow-develoi-gold/20">
                  <ShieldCheck size={34} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.35em] text-develoi-gold/80">
                    Root Command
                  </p>
                  <h1 className="text-4xl font-black tracking-tight text-white md:text-5xl">
                    Governança de Clientes
                  </h1>
                </div>
              </div>

              <div className="max-w-4xl space-y-4">
                <p className="text-lg font-semibold leading-relaxed text-white/70">
                  Painel central para criar novos clientes, provisionar acessos, controlar validade
                  contratual, acompanhar ocupação de usuários e definir o perfil de acesso padrão
                  de cada operação.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Badge color="warning" pill>
                    Contratos
                  </Badge>
                  <Badge color="info" pill>
                    Acessos
                  </Badge>
                  <Badge color="success" pill>
                    Governança
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 xl:min-w-[280px]">
              <Button
                onClick={() => setShowTenantModal(true)}
                iconLeft={<Plus size={16} />}
                className="h-12 rounded-2xl border-[#d3a843] bg-[#d3a843] px-6 text-[11px] font-black uppercase tracking-[0.18em] text-white hover:border-[#e0ba65] hover:bg-[#e0ba65]"
              >
                Novo Cliente
              </Button>
              <Button
                onClick={openAccessModal}
                variant="outline"
                iconLeft={<KeyRound size={16} />}
                className="h-12 rounded-2xl border-white/20 bg-white/5 px-6 text-[11px] font-black uppercase tracking-[0.18em] text-white hover:bg-white hover:text-zinc-900"
              >
                Novo Acesso
              </Button>
            </div>
          </div>
        </PanelCard>

        <section id="superadmin-overview" className="scroll-mt-28 space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-zinc-400">
                Visão Geral
              </p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-zinc-900">
                Indicadores da operação root
              </h2>
            </div>
            <p className="text-sm font-semibold text-zinc-500">
              Leitura rápida de clientes, contratos e capacidade.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Clientes ativos"
            value={totals.activeTenants}
            icon={Building2}
            color="navy"
            description="Operações habilitadas"
          />
          <StatCard
            title="Vencendo em 30 dias"
            value={totals.expiringTenants}
            icon={AlertTriangle}
            color="warning"
            description="Renovar antes do bloqueio"
          />
          <StatCard
            title="Acessos provisionados"
            value={totals.totalAccesses}
            icon={Users}
            color="info"
            description="Usuários distribuídos"
          />
          <StatCard
            title="Capacidade contratada"
            value={totals.contractedCapacity}
            icon={BadgeCheck}
            color="success"
            description="Limite total de acessos"
          />
        </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.95fr)]">
          <section id="superadmin-clientes" className="scroll-mt-28 space-y-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-zinc-400">
                  Clientes
                </p>
                <h2 className="mt-1 text-2xl font-black tracking-tight text-zinc-900">
                  Pipeline de contratos e tenants
                </h2>
              </div>
              <p className="text-sm font-semibold text-zinc-500">
                Filtre, selecione e abra a governança detalhada de cada cliente.
              </p>
            </div>
            <PanelCard
              title="Pipeline de Clientes"
              description="Filtre contratos, selecione um cliente e acompanhe o consumo de acessos."
              icon={Search}
              className="rounded-[36px]"
              contentClassName="space-y-4 p-6"
            >
              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por nome ou ID do cliente..."
                  icon={<Search size={16} />}
                  className="h-12 rounded-2xl bg-zinc-50 pl-10 text-sm font-bold"
                />
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-12 rounded-2xl bg-zinc-50 text-sm font-bold"
                >
                  <option value="all">Todos os contratos</option>
                  <option value="ativo">Ativos</option>
                  <option value="suspenso">Suspensos</option>
                  <option value="expiring">Vencendo em 30 dias</option>
                  <option value="expired">Expirados</option>
                </Select>
              </div>
            </PanelCard>

            {isLoading ? (
              <PanelCard className="rounded-[36px]" padding={false}>
                <div className="flex items-center justify-center py-24">
                  <div className="h-12 w-12 animate-spin rounded-full border-4 border-develoi-navy/10 border-t-develoi-navy" />
                </div>
              </PanelCard>
            ) : filteredTenants.length === 0 ? (
              <PanelCard className="rounded-[36px] border-dashed" padding={false}>
                <EmptyState
                  title="Nenhum cliente encontrado"
                  description="Crie um novo contrato ou ajuste o filtro para localizar um cliente."
                  icon={<Globe size={56} />}
                  action={
                    <Button
                      onClick={() => setShowTenantModal(true)}
                      iconLeft={<Plus size={14} />}
                      className="rounded-2xl"
                    >
                      Provisionar Cliente
                    </Button>
                  }
                />
              </PanelCard>
            ) : (
              <div className="grid gap-5 md:grid-cols-2">
                {filteredTenants.map((tenant, index) => {
                  const contractBadge = getContractBadge(tenant);
                  const selected = tenant.id === selectedTenantId;
                  const daysUntilExpiration = getDaysUntil(tenant.expires_at);

                  return (
                    <motion.button
                      key={tenant.id}
                      layout
                      type="button"
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03, duration: 0.24 }}
                      onClick={() => setSelectedTenantId(tenant.id)}
                      className={`text-left transition-all ${
                        selected ? "scale-[1.01]" : "hover:-translate-y-1"
                      }`}
                    >
                      <PanelCard
                        title={tenant.name}
                        description={`ID: ${tenant.id}`}
                        icon={Building2}
                        action={
                          <IconButton
                            onClick={(event) => {
                              event.stopPropagation();
                              setDeleteTarget(tenant);
                            }}
                            className="text-zinc-300 hover:text-red-500"
                          >
                            <Trash2 size={18} />
                          </IconButton>
                        }
                        className={`rounded-[32px] border transition-all ${
                          selected
                            ? "border-develoi-gold shadow-xl shadow-develoi-gold/10"
                            : "shadow-sm"
                        }`}
                        contentClassName="space-y-5 p-6"
                        color={selected ? "#c59b4d" : undefined}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge color={contractBadge.color} pill dot>
                            {contractBadge.label}
                          </Badge>
                          <Badge color="default" pill>
                            {tenant.plan_label || "Sem plano"}
                          </Badge>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="rounded-2xl bg-zinc-50 px-4 py-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                              Validade
                            </p>
                            <p className="mt-1 text-sm font-bold text-zinc-900">
                              {formatDate(tenant.expires_at)}
                            </p>
                            <p className="mt-1 text-[10px] font-semibold text-zinc-500">
                              {daysUntilExpiration === null
                                ? "Sem prazo definido"
                                : daysUntilExpiration >= 0
                                  ? `${daysUntilExpiration} dias restantes`
                                  : `${Math.abs(daysUntilExpiration)} dias vencido`}
                            </p>
                          </div>
                          <div className="rounded-2xl bg-zinc-50 px-4 py-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                              Ocupação
                            </p>
                            <p className="mt-1 text-sm font-bold text-zinc-900">
                              {tenant.total_users || 0}/{tenant.max_users || 0} acessos
                            </p>
                            <p className="mt-1 text-[10px] font-semibold text-zinc-500">
                              {tenant.admin_users || 0} com perfil administrativo
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-4 border-t border-zinc-100 pt-4">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                              Perfil padrão
                            </p>
                            <p className="mt-1 text-sm font-bold text-zinc-700">
                              {ACCESS_PROFILE_LABELS[
                                isAccessProfile(tenant.access_profile)
                                  ? tenant.access_profile
                                  : "rh-operacao"
                              ]}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                              Último acesso
                            </p>
                            <p className="mt-1 text-sm font-bold text-zinc-700">
                              {tenant.last_login ? formatDate(tenant.last_login) : "Sem login"}
                            </p>
                          </div>
                        </div>
                      </PanelCard>
                    </motion.button>
                  );
                })}
              </div>
            )}
          </section>

          <div className="space-y-6 self-start xl:sticky xl:top-6">
            {!selectedTenant ? (
              <PanelCard className="rounded-[36px] border-dashed" padding={false}>
                <EmptyState
                  title="Selecione um cliente"
                  description="Ao selecionar um tenant, você verá contrato, perfil padrão, acessos ativos e validade."
                  icon={<ShieldCheck size={52} />}
                />
              </PanelCard>
            ) : (
              <>
                <section id="superadmin-contratos" className="scroll-mt-28">
                  <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-zinc-400">
                        Contratos
                      </p>
                      <h2 className="mt-1 text-2xl font-black tracking-tight text-zinc-900">
                        Painel do cliente selecionado
                      </h2>
                    </div>
                    <p className="text-sm font-semibold text-zinc-500">
                      Validade, capacidade, perfil padrão e status contratual.
                    </p>
                  </div>
                  <PanelCard
                  title={selectedTenant.name}
                  description={`Contrato ${selectedTenant.plan_label || "sem definição"} • ${selectedTenant.id}`}
                  icon={ShieldCheck}
                  className="rounded-[36px] shadow-sm"
                  action={
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button
                        onClick={openAccessModal}
                        iconLeft={<UserPlus size={14} />}
                        className="rounded-2xl"
                      >
                        Novo Acesso
                      </Button>
                      <Button
                        onClick={openContractModal}
                        variant="outline"
                        iconLeft={<Settings2 size={14} />}
                        className="rounded-2xl"
                      >
                        Ajustar Contrato
                      </Button>
                    </div>
                  }
                  contentClassName="space-y-6 p-6"
                >
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl bg-zinc-50 px-4 py-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                        Validade final
                      </p>
                      <p className="mt-2 text-lg font-black text-zinc-900">
                        {formatDate(selectedTenant.expires_at)}
                      </p>
                      <p className="mt-1 text-[10px] font-semibold text-zinc-500">
                        Início em {formatDate(selectedTenant.starts_at || selectedTenant.created_at)}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-zinc-50 px-4 py-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                        Acessos contratados
                      </p>
                      <p className="mt-2 text-lg font-black text-zinc-900">
                        {selectedTenant.total_users || 0}/{selectedTenant.max_users || 0}
                      </p>
                      <p className="mt-1 text-[10px] font-semibold text-zinc-500">
                        {selectedTenant.active_users || 0} ativos agora
                      </p>
                    </div>
                    <div className="rounded-2xl bg-zinc-50 px-4 py-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                        Status do contrato
                      </p>
                      <div className="mt-2">
                        <Badge color={getContractBadge(selectedTenant).color} pill dot>
                          {getContractBadge(selectedTenant).label}
                        </Badge>
                      </div>
                      <p className="mt-2 text-[10px] font-semibold text-zinc-500">
                        Documento {selectedTenant.document || "não informado"}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
                    <div className="rounded-[28px] border border-zinc-200 bg-zinc-50/70 p-5">
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                        Perfil padrão para novos acessos
                      </p>
                      <p className="mt-2 text-lg font-black text-zinc-900">
                        {ACCESS_PROFILE_LABELS[
                          isAccessProfile(selectedTenant.access_profile)
                            ? selectedTenant.access_profile
                            : "rh-operacao"
                        ]}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {ACCESS_PERMISSION_KEYS.filter((key) =>
                          getPermissionPreset(
                            isAccessProfile(selectedTenant.access_profile)
                              ? selectedTenant.access_profile
                              : "rh-operacao"
                          )[key]
                        ).map((key) => (
                          <React.Fragment key={key}>
                            <Badge color="info" pill>
                              {ACCESS_PERMISSION_LABELS[key]}
                            </Badge>
                          </React.Fragment>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-[28px] border border-zinc-200 bg-zinc-50/70 p-5">
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                        Uso e governança
                      </p>
                      <div className="mt-4 space-y-3 text-sm font-semibold text-zinc-700">
                        <div className="flex items-center justify-between gap-4">
                          <span>Admins provisionados</span>
                          <span className="font-black text-zinc-900">{selectedTenant.admin_users || 0}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span>Último login</span>
                          <span className="font-black text-zinc-900">
                            {selectedTenant.last_login
                              ? formatDate(selectedTenant.last_login)
                              : "Sem acesso"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span>Validade contratada</span>
                          <span className="font-black text-zinc-900">
                            {selectedTenant.validity_days || 30} dias
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </PanelCard>
                </section>

                <section id="superadmin-acessos" className="scroll-mt-28">
                  <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-zinc-400">
                        Acessos
                      </p>
                      <h2 className="mt-1 text-2xl font-black tracking-tight text-zinc-900">
                        Usuários e permissões do cliente
                      </h2>
                    </div>
                    <p className="text-sm font-semibold text-zinc-500">
                      Controle de quem entra, perfil aplicado e módulos liberados.
                    </p>
                  </div>
                <PanelCard
                  title="Acessos do Cliente"
                  description="Controle de usuários, perfil aplicado e último uso do sistema."
                  icon={Users}
                  className="rounded-[36px]"
                  contentClassName="space-y-4 p-6"
                >
                  {isAccessLoading ? (
                    <div className="flex items-center justify-center py-16">
                      <div className="h-10 w-10 animate-spin rounded-full border-4 border-develoi-navy/10 border-t-develoi-navy" />
                    </div>
                  ) : tenantAccesses.length === 0 ? (
                    <EmptyState
                      title="Nenhum acesso provisionado"
                      description="Crie um novo acesso para começar a distribuir permissões desse cliente."
                      icon={<KeyRound size={46} />}
                      action={
                        <Button
                          onClick={openAccessModal}
                          iconLeft={<Plus size={14} />}
                          className="rounded-2xl"
                        >
                          Criar Acesso
                        </Button>
                      }
                    />
                  ) : (
                    <div className="space-y-3">
                      {tenantAccesses.map((access) => {
                        const permissions = normalizePermissions(
                          access.permissions_json,
                          access.access_profile || access.role
                        );

                        return (
                          <div
                            key={access.id}
                            className="rounded-[28px] border border-zinc-200 bg-zinc-50/70 px-4 py-4"
                          >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="space-y-2">
                                <div>
                                  <h3 className="text-base font-black text-zinc-900">
                                    {access.full_name}
                                  </h3>
                                  <p className="text-sm font-semibold text-zinc-500">{access.email}</p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <Badge color={access.status === "Ativo" ? "success" : "danger"} pill>
                                    {access.status}
                                  </Badge>
                                  <Badge color="default" pill>
                                    {access.role}
                                  </Badge>
                                  <Badge color="info" pill>
                                    {ACCESS_PROFILE_LABELS[
                                      isAccessProfile(access.access_profile)
                                        ? access.access_profile
                                        : "custom"
                                    ]}
                                  </Badge>
                                </div>
                              </div>

                              <div className="text-left sm:text-right">
                                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                                  Último uso
                                </p>
                                <p className="mt-1 text-sm font-bold text-zinc-800">
                                  {formatDateTime(access.last_login)}
                                </p>
                              </div>
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2">
                              {ACCESS_PERMISSION_KEYS.filter((key) => permissions[key]).map((key) => (
                                <React.Fragment key={key}>
                                  <Badge color="info" pill>
                                    {ACCESS_PERMISSION_LABELS[key]}
                                  </Badge>
                                </React.Fragment>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  </PanelCard>
                </section>
              </>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showTenantModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeTenantModal}
              className="absolute inset-0 bg-zinc-950/60 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.96 }}
              className="relative w-full max-w-4xl"
            >
              <PanelCard
                title="Provisionar Novo Cliente"
                description="Crie contrato, limite de acessos e o admin principal da nova operação."
                icon={UserPlus}
                className="rounded-[40px] shadow-2xl"
                contentClassName="p-8 pt-0 md:p-10 md:pt-0"
              >
                <form onSubmit={handleTenantSubmit} className="space-y-6">
                  <div className="grid gap-5 md:grid-cols-2">
                    <Input
                      label="Nome da Empresa"
                      value={tenantForm.name}
                      onChange={(e) => updateTenantField("name", e.target.value)}
                      placeholder="Ex: Corporação Acme"
                      required
                      className="h-11 rounded-2xl bg-zinc-50 text-sm font-bold"
                    />
                    <Input
                      label="CNPJ / Documento"
                      value={tenantForm.document}
                      onChange={(e) => updateTenantField("document", formatCpfOrCnpj(e.target.value))}
                      placeholder="00.000.000/0000-00"
                      inputMode="numeric"
                      maxLength={18}
                      className="h-11 rounded-2xl bg-zinc-50 text-sm font-bold"
                    />
                    <Input
                      label="Responsável Mestre"
                      value={tenantForm.responsible_name}
                      onChange={(e) => updateTenantField("responsible_name", e.target.value)}
                      placeholder="Nome do administrador"
                      required
                      className="h-11 rounded-2xl bg-zinc-50 text-sm font-bold"
                    />
                    <Input
                      label="E-mail do Acesso Principal"
                      type="email"
                      value={tenantForm.email}
                      onChange={(e) => updateTenantField("email", e.target.value)}
                      placeholder="admin@empresa.com"
                      required
                      className="h-11 rounded-2xl bg-zinc-50 text-sm font-bold"
                    />
                    <Input
                      label="Senha Inicial"
                      type="password"
                      value={tenantForm.password}
                      onChange={(e) => updateTenantField("password", e.target.value)}
                      showPasswordToggle
                      placeholder="••••••••"
                      required
                      className="h-11 rounded-2xl bg-zinc-50 text-sm font-bold"
                    />
                    <Input
                      label="Telefone de Contato"
                      value={tenantForm.phone}
                      onChange={(e) => updateTenantField("phone", formatPhoneBr(e.target.value))}
                      placeholder="(00) 00000-0000"
                      inputMode="tel"
                      maxLength={15}
                      className="h-11 rounded-2xl bg-zinc-50 text-sm font-bold"
                    />
                    <Select
                      label="Validade Inicial"
                      value={tenantForm.validity_days}
                      onChange={(e) => handleTenantValidityChange(e.target.value)}
                      className="h-11 rounded-2xl bg-zinc-50 text-sm font-bold"
                    >
                      {VALIDITY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                    <Input
                      label="Nome do Plano"
                      value={tenantForm.plan_label}
                      onChange={(e) => updateTenantField("plan_label", e.target.value)}
                      placeholder="Plano Anual"
                      className="h-11 rounded-2xl bg-zinc-50 text-sm font-bold"
                    />
                    <Input
                      label="Limite de Acessos"
                      type="number"
                      min={1}
                      value={tenantForm.max_users}
                      onChange={(e) => updateTenantField("max_users", e.target.value)}
                      className="h-11 rounded-2xl bg-zinc-50 text-sm font-bold"
                    />
                    <Select
                      label="Perfil Padrão de Novos Acessos"
                      value={tenantForm.access_profile}
                      onChange={(e) => updateTenantField("access_profile", e.target.value)}
                      className="h-11 rounded-2xl bg-zinc-50 text-sm font-bold"
                    >
                      <option value="rh-operacao">RH Operação</option>
                      <option value="executivo-leitura">Executivo Leitura</option>
                      <option value="admin-mestre">Admin Mestre</option>
                    </Select>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={closeTenantModal}
                      className="flex-1 rounded-2xl"
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" className="flex-1 rounded-2xl">
                      Finalizar Provisionamento
                    </Button>
                  </div>
                </form>
              </PanelCard>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAccessModal && (
          <div className="fixed inset-0 z-[110] overflow-y-auto p-4 md:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeAccessModal}
              className="absolute inset-0 bg-zinc-950/60 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.96 }}
              className="relative mx-auto my-4 w-full max-w-4xl"
            >
              <PanelCard
                title="Provisionar Novo Acesso"
                description="Defina a função, o perfil e os módulos liberados para esse usuário."
                icon={KeyRound}
                className="max-h-[88vh] rounded-[40px] shadow-2xl"
                contentClassName="p-6 pt-0 md:p-8 md:pt-0"
              >
                <form
                  onSubmit={handleAccessSubmit}
                  className="flex max-h-[calc(88vh-128px)] flex-col"
                >
                  <div className="space-y-5 overflow-y-auto pr-1">
                    <div className="grid gap-4 md:grid-cols-2">
                    <Select
                      label="Cliente"
                      value={accessForm.tenant_id}
                      onChange={(e) => updateAccessField("tenant_id", e.target.value)}
                      className="h-11 rounded-2xl bg-zinc-50 text-sm font-bold"
                    >
                      <option value="">Selecione um cliente</option>
                      {tenants.map((tenant) => (
                        <option key={tenant.id} value={tenant.id}>
                          {tenant.name}
                        </option>
                      ))}
                    </Select>
                    <Select
                      label="Função"
                      value={accessForm.role}
                      onChange={(e) => updateAccessField("role", e.target.value)}
                      className="h-11 rounded-2xl bg-zinc-50 text-sm font-bold"
                    >
                      <option value="admin">Admin</option>
                      <option value="user">Operação</option>
                      <option value="viewer">Leitura</option>
                    </Select>
                    <Input
                      label="Nome Completo"
                      value={accessForm.full_name}
                      onChange={(e) => updateAccessField("full_name", e.target.value)}
                      placeholder="Nome do usuário"
                      required
                      className="h-11 rounded-2xl bg-zinc-50 text-sm font-bold"
                    />
                    <Input
                      label="E-mail de Acesso"
                      type="email"
                      value={accessForm.email}
                      onChange={(e) => updateAccessField("email", e.target.value)}
                      placeholder="usuario@empresa.com"
                      required
                      className="h-11 rounded-2xl bg-zinc-50 text-sm font-bold"
                    />
                    <Input
                      label="Senha Inicial"
                      type="password"
                      value={accessForm.password}
                      onChange={(e) => updateAccessField("password", e.target.value)}
                      showPasswordToggle
                      placeholder="••••••••"
                      required
                      className="h-11 rounded-2xl bg-zinc-50 text-sm font-bold"
                    />
                    <Select
                      label="Status"
                      value={accessForm.status}
                      onChange={(e) => updateAccessField("status", e.target.value)}
                      className="h-11 rounded-2xl bg-zinc-50 text-sm font-bold"
                    >
                      {ACCESS_STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <PanelCard
                    title="Perfil e Permissões"
                    description="Escolha um perfil padrão ou ajuste os módulos manualmente."
                    icon={Settings2}
                    className="rounded-[28px] border-zinc-200 bg-zinc-50/70"
                    contentClassName="space-y-4 p-4"
                  >
                    <Select
                      label="Perfil de Acesso"
                      value={accessForm.access_profile}
                      onChange={(e) => handleAccessProfileChange(e.target.value)}
                      className="h-11 rounded-2xl bg-white text-sm font-bold"
                    >
                      {PROFILE_OPTIONS.map((profile) => (
                        <option key={profile} value={profile}>
                          {ACCESS_PROFILE_LABELS[profile]}
                        </option>
                      ))}
                    </Select>

                    <div className="grid gap-2.5 md:grid-cols-2">
                      {ACCESS_PERMISSION_KEYS.map((key) => (
                        <div
                          key={key}
                          className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-3 py-2.5"
                        >
                          <div className="pr-3">
                            <p className="text-sm font-bold text-zinc-900">
                              {ACCESS_PERMISSION_LABELS[key]}
                            </p>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
                              Módulo liberado
                            </p>
                          </div>
                          <Switch
                            checked={accessForm.permissions[key]}
                            onCheckedChange={() => toggleAccessPermission(key)}
                          />
                        </div>
                      ))}
                    </div>
                  </PanelCard>
                  </div>

                  <div className="mt-4 flex gap-3 border-t border-zinc-200 pt-4">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={closeAccessModal}
                      className="flex-1 rounded-2xl"
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" className="flex-1 rounded-2xl">
                      Criar Acesso
                    </Button>
                  </div>
                </form>
              </PanelCard>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showContractModal && selectedTenant && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 md:p-8">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeContractModal}
              className="absolute inset-0 bg-zinc-950/60 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.96 }}
              className="relative w-full max-w-3xl"
            >
              <PanelCard
                title={`Ajustar Contrato • ${selectedTenant.name}`}
                description="Renove validade, altere capacidade contratada e o perfil padrão de novos acessos."
                icon={CalendarClock}
                className="rounded-[40px] shadow-2xl"
                contentClassName="space-y-6 p-8 pt-0 md:p-10 md:pt-0"
              >
                <form onSubmit={handleContractSubmit} className="space-y-6">
                  <div className="grid gap-5 md:grid-cols-2">
                    <Select
                      label="Status do Contrato"
                      value={contractForm.status}
                      onChange={(e) => updateContractField("status", e.target.value)}
                      className="h-11 rounded-2xl bg-zinc-50 text-sm font-bold"
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </Select>
                    <Select
                      label="Validade"
                      value={contractForm.validity_days}
                      onChange={(e) => handleContractValidityChange(e.target.value)}
                      className="h-11 rounded-2xl bg-zinc-50 text-sm font-bold"
                    >
                      {VALIDITY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                    <Input
                      label="Nome do Plano"
                      value={contractForm.plan_label}
                      onChange={(e) => updateContractField("plan_label", e.target.value)}
                      className="h-11 rounded-2xl bg-zinc-50 text-sm font-bold"
                    />
                    <Input
                      label="Limite de Acessos"
                      type="number"
                      min={1}
                      value={contractForm.max_users}
                      onChange={(e) => updateContractField("max_users", e.target.value)}
                      className="h-11 rounded-2xl bg-zinc-50 text-sm font-bold"
                    />
                    <Select
                      label="Perfil Padrão de Novos Acessos"
                      value={contractForm.access_profile}
                      onChange={(e) =>
                        updateContractField("access_profile", e.target.value as AccessProfile)
                      }
                      className="h-11 rounded-2xl bg-zinc-50 text-sm font-bold md:col-span-2"
                    >
                      {PROFILE_OPTIONS.filter((profile) => profile !== "custom").map((profile) => (
                        <option key={profile} value={profile}>
                          {ACCESS_PROFILE_LABELS[profile]}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="rounded-[28px] border border-zinc-200 bg-zinc-50/70 p-5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                      Situação atual
                    </p>
                    <div className="mt-3 grid gap-3 md:grid-cols-3">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                          Início
                        </p>
                        <p className="mt-1 text-sm font-bold text-zinc-900">
                          {formatDate(selectedTenant.starts_at || selectedTenant.created_at)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                          Expira em
                        </p>
                        <p className="mt-1 text-sm font-bold text-zinc-900">
                          {formatDate(selectedTenant.expires_at)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                          Capacidade
                        </p>
                        <p className="mt-1 text-sm font-bold text-zinc-900">
                          {selectedTenant.total_users || 0}/{selectedTenant.max_users || 0}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={closeContractModal}
                      className="flex-1 rounded-2xl"
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" className="flex-1 rounded-2xl">
                      Salvar Contrato
                    </Button>
                  </div>
                </form>
              </PanelCard>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteTarget && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteTarget(null)}
              className="absolute inset-0 bg-zinc-950/50 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.96 }}
              className="relative w-full max-w-sm"
            >
              <PanelCard className="rounded-[36px] text-center shadow-2xl" contentClassName="p-10">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-red-100 text-red-600 shadow-sm">
                  <Trash2 size={30} />
                </div>
                <h2 className="mb-2 text-2xl font-bold tracking-tight text-zinc-900">
                  Excluir cliente?
                </h2>
                <p className="mb-8 text-sm font-medium leading-relaxed text-zinc-500">
                  Deseja remover <span className="font-bold text-red-600">{deleteTarget.name}</span>{" "}
                  e todos os dados relacionados?
                </p>
                <div className="flex gap-3">
                  <Button
                    variant="ghost"
                    onClick={() => setDeleteTarget(null)}
                    className="flex-1 rounded-2xl"
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="danger"
                    onClick={handleDelete}
                    className="flex-1 rounded-2xl shadow-lg shadow-red-600/20"
                  >
                    Remover
                  </Button>
                </div>
              </PanelCard>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
