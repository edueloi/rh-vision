import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Building,
  Building2,
  CheckCircle2,
  ChevronRight,
  Edit,
  Globe,
  Mail,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";
import { cn } from "@/src/lib/utils";
import { getAuthHeaders, getAuthUser, getTenantId } from "@/src/lib/auth";
import { formatPhoneBr } from "@/src/lib/masks";
import { useUnit, Unit } from "@/src/lib/useUnit";
import {
  ACCESS_PERMISSION_KEYS,
  ACCESS_PERMISSION_LABELS,
  ACCESS_PROFILE_LABELS,
  ACCESS_PROFILE_DESCRIPTIONS,
  ACTION_PERMISSION_KEYS,
  ACTION_PERMISSION_LABELS,
  ACTION_PROFILE_PRESETS,
  AccessProfile,
  ActionPermissions,
  getDefaultAccessProfile,
  getPermissionPreset,
  stringifyAccessPermissions,
} from "@/src/lib/access";
import {
  Badge,
  Button,
  Combobox,
  ComboboxOption,
  ContentCard,
  FormRow,
  Input,
  Modal,
  PageWrapper,
  Select,
  useToast,
} from "@/src/components/ui";

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  password?: string;
  role: "admin" | "user";
  unit_id: string;
  unit_name?: string;
  status: "Ativo" | "Inativo";
  last_login?: string;
  access_profile?: AccessProfile;
}

const initialUnitForm = {
  name: "",
  country: "Brasil",
  city: "",
  state: "",
  company_name: "",
  responsible_name: "",
  phone: "",
  email: "",
  parent_id: "",
};

const initialUserForm = {
  full_name: "",
  email: "",
  password: "",
  role: "user" as "admin" | "user",
  unit_id: "",
  status: "Ativo" as "Ativo" | "Inativo",
  access_profile: "rh-operacao" as AccessProfile,
};

const DEFAULT_CUSTOM_ACTIONS: ActionPermissions = {
  can_create_jobs: false,
  can_edit_jobs: false,
  can_delete_jobs: false,
  can_approve_jobs: false,
  can_create_candidates: false,
  can_edit_candidates: false,
  can_delete_candidates: false,
  can_manage_users: false,
  can_manage_units: false,
};

const COUNTRY_OPTIONS: ComboboxOption[] = [
  "Brasil",
  "Argentina",
  "Bolívia",
  "Chile",
  "Colômbia",
  "Paraguai",
  "Peru",
  "Uruguai",
  "Venezuela",
  "México",
  "Estados Unidos",
  "Canadá",
  "Portugal",
  "Espanha",
  "França",
  "Alemanha",
  "Itália",
  "Reino Unido",
  "Japão",
  "China",
  "Austrália",
].map((country) => ({
  value: country,
  label: country,
}));

const STATE_OPTIONS: ComboboxOption[] = [
  ["AC", "Acre"],
  ["AL", "Alagoas"],
  ["AP", "Amapá"],
  ["AM", "Amazonas"],
  ["BA", "Bahia"],
  ["CE", "Ceará"],
  ["DF", "Distrito Federal"],
  ["ES", "Espírito Santo"],
  ["GO", "Goiás"],
  ["MA", "Maranhão"],
  ["MT", "Mato Grosso"],
  ["MS", "Mato Grosso do Sul"],
  ["MG", "Minas Gerais"],
  ["PA", "Pará"],
  ["PB", "Paraíba"],
  ["PR", "Paraná"],
  ["PE", "Pernambuco"],
  ["PI", "Piauí"],
  ["RJ", "Rio de Janeiro"],
  ["RN", "Rio Grande do Norte"],
  ["RS", "Rio Grande do Sul"],
  ["RO", "Rondônia"],
  ["RR", "Roraima"],
  ["SC", "Santa Catarina"],
  ["SP", "São Paulo"],
  ["SE", "Sergipe"],
  ["TO", "Tocantins"],
].map(([value, label]) => ({
  value,
  label: `${value} · ${label}`,
  subtitle: label,
}));

function getUnitLocation(unit: Unit) {
  return (
    unit.location ||
    [
      [unit.city, unit.state].filter(Boolean).join(", "),
      unit.country && unit.country !== "Brasil" ? unit.country : null,
    ]
      .filter(Boolean)
      .join(" · ") ||
    unit.country ||
    "Local não informado"
  );
}

function formatLastLogin(value?: string) {
  if (!value) {
    return "Nunca acessou";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Nunca acessou";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

export default function Administration() {
  const { currentUnit, isMaster, units, changeUnit, refreshUnits } = useUnit();
  const tenantId = getTenantId();
  const authUser = getAuthUser();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<"units" | "users">("units");
  const [dbUsers, setDbUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [usersLoading, setUsersLoading] = useState(true);
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: string;
    type: "unit" | "user";
    name: string;
  } | null>(null);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [unitForm, setUnitForm] = useState(initialUnitForm);
  const [userForm, setUserForm] = useState(initialUserForm);
  const [customActions, setCustomActions] = useState<ActionPermissions>(DEFAULT_CUSTOM_ACTIONS);

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);

    try {
      const response = await fetch(
        `/api/users?tenantId=${tenantId}&unitId=${isMaster ? "master" : currentUnit.id}`,
        { headers: getAuthHeaders() }
      );

      if (!response.ok) {
        throw new Error("Falha ao carregar usuários.");
      }

      const data = await response.json();
      setDbUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao carregar usuários.");
      setDbUsers([]);
    } finally {
      setUsersLoading(false);
    }
  }, [currentUnit.id, isMaster, tenantId, toast]);

  const refreshEverything = useCallback(async () => {
    await Promise.all([refreshUnits(), fetchUsers()]);
  }, [fetchUsers, refreshUnits]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const resetUnitModal = () => {
    setShowUnitModal(false);
    setEditingUnit(null);
    setUnitForm(initialUnitForm);
  };

  const resetUserModal = () => {
    setShowUserModal(false);
    setEditingUser(null);
    setUserForm({ ...initialUserForm, unit_id: isMaster ? "" : currentUnit.id });
    setCustomActions(DEFAULT_CUSTOM_ACTIONS);
  };

  const openCreateUnit = () => {
    setEditingUnit(null);
    setUnitForm(initialUnitForm);
    setShowUnitModal(true);
  };

  const openCreateUser = () => {
    setEditingUser(null);
    setUserForm({
      ...initialUserForm,
      unit_id: isMaster ? "" : currentUnit.id,
    });
    setShowUserModal(true);
  };

  const openEditUnit = (unit: Unit) => {
    setEditingUnit(unit);
    setUnitForm({
      name: unit.name || "",
      country: unit.country || "Brasil",
      city: unit.city || "",
      state: (unit.state || "").toUpperCase(),
      company_name: unit.company_name || "",
      responsible_name: unit.responsible_name || "",
      phone: formatPhoneBr(unit.phone || ""),
      email: unit.email || "",
      parent_id: unit.parent_id || "",
    });
    setShowUnitModal(true);
  };

  const openEditUser = (user: UserProfile) => {
    setEditingUser(user);
    const profile = (user.access_profile || getDefaultAccessProfile(user.role)) as AccessProfile;
    setUserForm({
      full_name: user.full_name,
      email: user.email,
      password: "",
      role: user.role,
      unit_id: user.unit_id,
      status: user.status,
      access_profile: profile,
    });
    // Pre-load action permissions from the profile preset
    setCustomActions({ ...(ACTION_PROFILE_PRESETS[profile] ?? DEFAULT_CUSTOM_ACTIONS) });
    setShowUserModal(true);
  };

  const handleUnitSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const url = editingUnit ? `/api/units/${editingUnit.id}` : "/api/units";
    const method = editingUnit ? "PUT" : "POST";

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ ...unitForm, tenant_id: tenantId }),
      });

      if (!response.ok) {
        throw new Error("Erro ao salvar unidade.");
      }

      toast.success(`Unidade ${editingUnit ? "atualizada" : "criada"} com sucesso.`);
      resetUnitModal();
      await refreshUnits();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao salvar unidade.");
    }
  };

  const handleUserSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const url = editingUser ? `/api/users/${editingUser.id}` : "/api/users";
    const method = editingUser ? "PUT" : "POST";
    const accessProfile: AccessProfile =
      userForm.role === "admin" ? "admin-mestre" : userForm.access_profile;
    const permissions = getPermissionPreset(accessProfile);
    permissions.super_admin = false;
    // For custom profile, use the UI-defined action permissions; otherwise use the preset
    const actionPerms = accessProfile === "custom"
      ? customActions
      : ACTION_PROFILE_PRESETS[accessProfile];

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          ...userForm,
          tenant_id: tenantId,
          access_profile: accessProfile,
          permissions_json: JSON.parse(stringifyAccessPermissions(permissions, accessProfile)),
          action_permissions_json: JSON.stringify(actionPerms),
        }),
      });

      if (!response.ok) {
        throw new Error("Erro ao salvar acesso.");
      }

      toast.success(`Acesso ${editingUser ? "atualizado" : "concedido"} com sucesso.`);
      resetUserModal();
      await fetchUsers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao salvar acesso.");
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) {
      return;
    }

    if (deleteConfirm.type === "user" && deleteConfirm.id === authUser?.id) {
      toast.error("Você não pode excluir o próprio usuário.");
      setDeleteConfirm(null);
      return;
    }

    if (deleteConfirm.type === "user" && deleteConfirm.id === `admin-${tenantId}`) {
      toast.error("O administrador inicial do tenant é protegido.");
      setDeleteConfirm(null);
      return;
    }

    if (deleteConfirm.type === "unit" && deleteConfirm.id === `master-${tenantId}`) {
      toast.error("A unidade matriz inicial é protegida.");
      setDeleteConfirm(null);
      return;
    }

    try {
      const response = await fetch(`/api/${deleteConfirm.type}s/${deleteConfirm.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error("Erro ao remover o registro.");
      }

      toast.success(
        `${deleteConfirm.type === "unit" ? "Unidade" : "Acesso"} removido com sucesso.`
      );
      const removedType = deleteConfirm.type;
      setDeleteConfirm(null);

      if (removedType === "unit") {
        await refreshUnits();
      } else {
        await fetchUsers();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao executar a exclusão.");
    }
  };

  const filteredUnits = useMemo(
    () =>
      units.filter((unit) => unit.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [searchQuery, units]
  );

  const filteredUsers = useMemo(
    () =>
      dbUsers.filter(
        (user) =>
          user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (user.unit_name || "").toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [dbUsers, searchQuery]
  );

  const isProtectedUnit = useCallback(
    (unit: Unit) => Boolean(unit.is_master) || unit.id === `master-${tenantId}`,
    [tenantId]
  );

  const isProtectedUser = useCallback(
    (user: UserProfile) => user.id === authUser?.id || user.id === `admin-${tenantId}`,
    [authUser?.id, tenantId]
  );

  const totalUnits = units.length;
  const masterUnits = units.filter((unit) => Boolean(unit.is_master)).length;
  const branchUnits = units.filter((unit) => !unit.is_master).length;
  const activeUsers = dbUsers.filter((user) => user.status === "Ativo").length;
  const adminUsers = dbUsers.filter((user) => user.role === "admin").length;
  const selectedUserProfile: AccessProfile =
    userForm.role === "admin" ? "admin-mestre" : userForm.access_profile;
  const selectedPermissions = getPermissionPreset(selectedUserProfile);
  selectedPermissions.super_admin = false;
  const enabledPermissions = ACCESS_PERMISSION_KEYS.filter(
    (permission) => permission !== "super_admin" && selectedPermissions[permission]
  );
  const previewActions = selectedUserProfile === "custom"
    ? customActions
    : ACTION_PROFILE_PRESETS[selectedUserProfile];

  const subtitle =
    activeTab === "units"
      ? `${currentUnit.name} · ${filteredUnits.length} unidades visíveis`
      : `${currentUnit.name} · ${filteredUsers.length} acessos visíveis`;

  return (
    <PageWrapper className="min-h-screen bg-[#f8fafc]">
      <div className="space-y-5 px-4 pb-24 pt-5 sm:px-6">

        {/* ── PAGE HEADER ── */}
        <div className="relative overflow-hidden rounded-2xl bg-develoi-navy px-5 py-5 sm:px-7">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-develoi-gold/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-12 left-1/3 h-36 w-36 rounded-full bg-sky-500/8 blur-3xl" />
          <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <Building2 size={11} className="text-develoi-gold/70" />
                <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-white/40">{currentUnit.name}</span>
              </div>
              <h1 className="text-[22px] font-black leading-none tracking-tight text-white sm:text-[26px]">
                Administração
              </h1>
              <p className="mt-1.5 text-[11px] font-medium text-white/40">{subtitle}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={refreshEverything} title="Atualizar"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-white/8 text-white/50 transition-all hover:bg-white/12 hover:text-white">
                <RefreshCw size={13} />
              </button>
              {activeTab === "units" ? (
                <button onClick={openCreateUnit} disabled={!isMaster}
                  className="flex h-8 items-center gap-1.5 rounded-lg bg-develoi-gold px-4 text-[11px] font-bold text-develoi-navy shadow-lg shadow-develoi-gold/20 transition-all hover:bg-[#d4a83a] disabled:opacity-40 disabled:cursor-not-allowed">
                  <Plus size={13} /> Nova unidade
                </button>
              ) : (
                <button onClick={openCreateUser}
                  className="flex h-8 items-center gap-1.5 rounded-lg bg-develoi-gold px-4 text-[11px] font-bold text-develoi-navy shadow-lg shadow-develoi-gold/20 transition-all hover:bg-[#d4a83a]">
                  <UserPlus size={13} /> Novo acesso
                </button>
              )}
            </div>
          </div>

          {/* Stats strip */}
          <div className="relative z-10 mt-4 flex flex-wrap items-center gap-4 border-t border-white/[0.06] pt-4">
            {[
              { label: "Unidades",       value: totalUnits,  color: "text-white" },
              { label: "Matrizes",       value: masterUnits, color: "text-develoi-gold" },
              { label: "Filiais",        value: branchUnits, color: "text-sky-300" },
              { label: "Usuários ativos",value: activeUsers, color: "text-emerald-400" },
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-2.5">
                {i > 0 && <span className="h-3 w-px bg-white/10" />}
                <span className={cn("text-[20px] font-black tabular-nums", s.color)}>{s.value}</span>
                <span className="text-[10px] font-medium text-white/35">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── KPI CARDS ── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Unidades",        value: totalUnits,  icon: Building2, color: "text-develoi-navy",  bg: "bg-develoi-navy/8",   bar: "bg-develoi-navy" },
            { label: "Matrizes",        value: masterUnits, icon: Globe,     color: "text-develoi-gold",  bg: "bg-develoi-gold/10",  bar: "bg-develoi-gold" },
            { label: "Filiais",         value: branchUnits, icon: Building,  color: "text-sky-600",        bg: "bg-sky-50",           bar: "bg-sky-500" },
            { label: "Usuários ativos", value: activeUsers, icon: Users,     color: "text-emerald-600",   bg: "bg-emerald-50",       bar: "bg-emerald-500" },
          ].map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                <div className={cn("absolute -right-4 -top-4 h-14 w-14 rounded-full blur-xl opacity-40", s.bg)} />
                <div className="relative z-10">
                  <div className={cn("mb-2.5 flex h-8 w-8 items-center justify-center rounded-lg", s.bg)}>
                    <Icon size={15} className={s.color} />
                  </div>
                  <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400">{s.label}</p>
                  <p className={cn("text-[26px] font-black leading-none tabular-nums", s.color)}>{s.value}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── TABS + FILTER BAR ── */}
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-3 py-2.5 shadow-sm sm:gap-3 sm:px-4">
          {/* Tab pills */}
          <div className="flex items-center gap-0.5 rounded-lg border border-zinc-200 bg-zinc-50 p-0.5">
            {(["units", "users"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setSearchQuery(""); }}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-[12px] font-semibold transition-all",
                  activeTab === tab ? "bg-develoi-navy text-white shadow-sm" : "text-zinc-500 hover:bg-white hover:text-zinc-800"
                )}
              >
                {tab === "units" ? <Building2 size={12} /> : <Users size={12} />}
                {tab === "units" ? `Unidades (${filteredUnits.length})` : `Acessos (${filteredUsers.length})`}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative flex min-w-[180px] flex-1 items-center">
            <Search size={13} className="pointer-events-none absolute left-3 text-zinc-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={activeTab === "units" ? "Buscar unidade…" : "Buscar por nome ou e-mail…"}
              className="h-8 w-full rounded-lg border border-zinc-200 bg-zinc-50 pl-8 pr-3 text-[12px] font-medium text-zinc-800 outline-none transition-all placeholder:text-zinc-400 focus:border-develoi-gold/50 focus:bg-white focus:ring-2 focus:ring-develoi-gold/15"
            />
          </div>
        </div>

        {/* ── CONTENT ── */}
        <div>

          {/* ── UNITS TAB ── */}
          {activeTab === "units" && (
            filteredUnits.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-zinc-200 bg-white py-20 shadow-sm">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400">
                  <Building size={24} />
                </div>
                <div className="text-center">
                  <p className="text-[14px] font-semibold text-zinc-700">Nenhuma unidade cadastrada</p>
                  <p className="mt-1 text-[12px] text-zinc-400">Cadastre a primeira unidade para iniciar a estrutura organizacional.</p>
                </div>
                {isMaster && (
                  <button onClick={openCreateUnit}
                    className="flex items-center gap-1.5 rounded-xl bg-develoi-navy px-4 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-[#0a1e3a]">
                    <Plus size={13} /> Criar unidade
                  </button>
                )}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filteredUnits.map((unit) => {
                  const isMasterUnit = isProtectedUnit(unit);
                  const isCurrentUnit = currentUnit.id === unit.id;
                  const parentUnit = units.find((u) => u.id === unit.parent_id);
                  return (
                    <div
                      key={unit.id}
                      className={cn(
                        "group relative flex flex-col gap-4 overflow-hidden rounded-2xl border bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md",
                        isCurrentUnit ? "border-develoi-navy/30 ring-2 ring-develoi-navy/10" : "border-zinc-200 hover:border-develoi-navy/20"
                      )}
                    >
                      {/* Top color band */}
                      <div className={cn("absolute left-0 right-0 top-0 h-0.5", isMasterUnit ? "bg-develoi-gold" : "bg-develoi-navy/20")} />

                      {/* Header row */}
                      <div className="flex items-start justify-between gap-3 pt-1">
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                            isMasterUnit ? "bg-develoi-gold/12 text-develoi-gold ring-1 ring-develoi-gold/25" : "bg-develoi-navy/8 text-develoi-navy"
                          )}>
                            {isMasterUnit ? <Globe size={17} /> : <Building2 size={17} />}
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <p className="text-[14px] font-bold leading-tight text-zinc-900">{unit.name}</p>
                              {isMasterUnit && (
                                <span className="rounded-full bg-develoi-gold/12 px-2 py-0.5 text-[9px] font-bold text-develoi-gold ring-1 ring-develoi-gold/20">Matriz</span>
                              )}
                              {isCurrentUnit && (
                                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700 ring-1 ring-emerald-200">Em uso</span>
                              )}
                            </div>
                            <div className="mt-0.5 flex items-center gap-1 text-[10px] font-medium text-zinc-400">
                              <MapPin size={9} /> {getUnitLocation(unit)}
                            </div>
                          </div>
                        </div>
                        {!isProtectedUnit(unit) && (
                          <div className="flex shrink-0 items-center gap-1">
                            <button onClick={() => openEditUnit(unit)}
                              className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200 text-zinc-400 transition-colors hover:border-develoi-navy/30 hover:text-develoi-navy"
                              title="Editar">
                              <Edit size={12} />
                            </button>
                            <button onClick={() => setDeleteConfirm({ id: unit.id, type: "unit", name: unit.name })}
                              className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200 text-zinc-400 transition-colors hover:border-rose-200 hover:text-rose-500"
                              title="Excluir">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Info grid */}
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { label: "Empresa",     value: unit.company_name,    icon: <Building2 size={9} /> },
                          { label: "Responsável", value: unit.responsible_name, icon: <Users size={9} /> },
                          { label: "Telefone",    value: unit.phone,            icon: <Phone size={9} /> },
                          { label: "E-mail",      value: unit.email,            icon: <Mail size={9} />, truncate: true },
                        ].map((row) => (
                          <div key={row.label} className="rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2.5">
                            <p className="mb-0.5 flex items-center gap-1 text-[8px] font-bold uppercase tracking-wider text-zinc-400">
                              {row.icon} {row.label}
                            </p>
                            <p className={cn("text-[11px] font-medium text-zinc-700", row.truncate && "truncate")}>
                              {row.value || <span className="italic text-zinc-300">—</span>}
                            </p>
                          </div>
                        ))}
                      </div>

                      {/* Footer */}
                      <div className="mt-auto flex items-center justify-between border-t border-zinc-100 pt-3">
                        <p className="text-[10px] font-medium text-zinc-400">
                          {parentUnit ? `Filial de ${parentUnit.name}` : "Unidade raiz"}
                        </p>
                        <button onClick={() => changeUnit(unit)}
                          className="flex items-center gap-1 text-[11px] font-semibold text-develoi-navy transition-colors hover:text-develoi-navy/70">
                          Acessar hub <ChevronRight size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* ── USERS TAB ── */}
          {activeTab === "users" && (
            usersLoading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-20">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-develoi-navy/5">
                  <RefreshCw size={18} className="animate-spin text-develoi-navy" />
                </div>
                <p className="text-[11px] font-medium text-zinc-400">Carregando acessos…</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-zinc-200 bg-white py-20 shadow-sm">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400">
                  <Users size={24} />
                </div>
                <div className="text-center">
                  <p className="text-[14px] font-semibold text-zinc-700">Nenhum acesso encontrado</p>
                  <p className="mt-1 text-[12px] text-zinc-400">Crie usuários para esta operação.</p>
                </div>
                <button onClick={openCreateUser}
                  className="flex items-center gap-1.5 rounded-xl bg-develoi-navy px-4 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-[#0a1e3a]">
                  <UserPlus size={13} /> Novo acesso
                </button>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
                {/* Table header */}
                <div className="grid grid-cols-[2.5rem_1fr_9rem_9rem_7rem_5.5rem] items-center border-b border-zinc-100 bg-zinc-50/80 px-4 py-2.5">
                  {["", "Usuário", "Perfil", "Unidade", "Status", ""].map((h, i) => (
                    <p key={i} className="text-[9px] font-bold uppercase tracking-[0.14em] text-zinc-400">{h}</p>
                  ))}
                </div>

                <div className="divide-y divide-zinc-50">
                  {filteredUsers.map((user) => {
                    const accessProfile = (user.access_profile || getDefaultAccessProfile(user.role)) as AccessProfile;
                    const isSelfUser = user.id === authUser?.id;
                    const isSeedAdmin = user.id === `admin-${tenantId}`;
                    const isProtectedAccess = isProtectedUser(user);
                    const isActive = user.status === "Ativo";

                    const profileClass: Record<AccessProfile, string> = {
                      "admin-mestre":      "bg-develoi-navy/8 text-develoi-navy ring-1 ring-develoi-navy/15",
                      "rh-operacao":       "bg-develoi-gold/10 text-amber-700 ring-1 ring-develoi-gold/20",
                      "executivo-leitura": "bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200",
                      "custom":            "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
                    };

                    return (
                      <div key={user.id} className="grid grid-cols-[2.5rem_1fr_9rem_9rem_7rem_5.5rem] items-center px-4 py-3 transition-colors hover:bg-zinc-50/60">
                        {/* Avatar */}
                        <div className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-xl text-[10px] font-black",
                          user.role === "admin" ? "bg-develoi-navy text-develoi-gold" : "bg-zinc-100 text-zinc-600"
                        )}>
                          {user.full_name.split(" ").map((p: string) => p[0]).slice(0, 2).join("").toUpperCase()}
                        </div>

                        {/* Name + email */}
                        <div className="min-w-0 pr-3">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className="truncate text-[12px] font-semibold text-zinc-900">{user.full_name}</p>
                            {isSelfUser && (
                              <span className="rounded-full bg-sky-50 px-1.5 py-0.5 text-[8px] font-bold text-sky-600 ring-1 ring-sky-200">Você</span>
                            )}
                            {isSeedAdmin && (
                              <span className="rounded-full bg-develoi-gold/10 px-1.5 py-0.5 text-[8px] font-bold text-amber-700 ring-1 ring-develoi-gold/20">Root</span>
                            )}
                          </div>
                          <p className="truncate text-[10px] font-medium text-zinc-400">{user.email}</p>
                          <p className="mt-0.5 text-[9px] font-medium text-zinc-300">{formatLastLogin(user.last_login)}</p>
                        </div>

                        {/* Profile badge */}
                        <div>
                          <span className={cn("inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold", profileClass[accessProfile])}>
                            {ACCESS_PROFILE_LABELS[accessProfile]}
                          </span>
                        </div>

                        {/* Unit */}
                        <p className="truncate pr-2 text-[11px] font-medium text-zinc-500">{user.unit_name || "—"}</p>

                        {/* Status */}
                        <div className="flex items-center gap-1.5">
                          <span className={cn(
                            "h-1.5 w-1.5 shrink-0 rounded-full",
                            isActive ? "bg-emerald-500" : "bg-rose-400"
                          )} />
                          <span className={cn("text-[11px] font-medium", isActive ? "text-emerald-700" : "text-rose-600")}>
                            {user.status}
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-1">
                          {!isProtectedAccess && (
                            <>
                              <button onClick={() => openEditUser(user)}
                                className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200 text-zinc-400 transition-colors hover:border-develoi-navy/30 hover:text-develoi-navy"
                                title="Editar">
                                <Edit size={12} />
                              </button>
                              <button onClick={() => setDeleteConfirm({ id: user.id, type: "user", name: user.full_name })}
                                className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200 text-zinc-400 transition-colors hover:border-rose-200 hover:text-rose-500"
                                title="Excluir">
                                <Trash2 size={12} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )
          )}
        </div>
      </div>

      <Modal
        open={showUnitModal}
        onClose={resetUnitModal}
        size="lg"
        title={editingUnit ? "Editar unidade" : "Cadastrar unidade"}
        description="Cadastre matriz e filiais para organizar a estrutura operacional do tenant."
        icon={<Building2 size={20} />}
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={resetUnitModal}>
              Cancelar
            </Button>
            <Button form="unit-form" type="submit" variant="secondary">
              Salvar unidade
            </Button>
          </div>
        }
      >
        <form id="unit-form" onSubmit={handleUnitSubmit} className="space-y-4">
          <FormRow cols={2}>
            <Input
              label="Nome de exibição"
              value={unitForm.name}
              onChange={(event) => setUnitForm({ ...unitForm, name: event.target.value })}
              placeholder="Ex: Matriz - São Paulo"
              required
              containerClassName="md:col-span-2"
            />

            <Select
              label="Unidade pai"
              value={unitForm.parent_id}
              onChange={(event) => setUnitForm({ ...unitForm, parent_id: event.target.value })}
            >
              <option value="">Nenhuma (Unidade matriz)</option>
              {units
                .filter((unit) => !unit.parent_id)
                .map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name}
                  </option>
                ))}
            </Select>

            <Input
              label="Razão social"
              value={unitForm.company_name}
              onChange={(event) => setUnitForm({ ...unitForm, company_name: event.target.value })}
              placeholder="Razão social ou nome da empresa"
            />

            <Input
              label="Responsável"
              value={unitForm.responsible_name}
              onChange={(event) =>
                setUnitForm({ ...unitForm, responsible_name: event.target.value })
              }
              placeholder="Nome completo"
            />

            <Input
              label="E-mail"
              type="email"
              value={unitForm.email}
              onChange={(event) => setUnitForm({ ...unitForm, email: event.target.value })}
              placeholder="contato@empresa.com"
            />

            <Input
              label="Telefone / WhatsApp"
              value={unitForm.phone}
              onChange={(event) =>
                setUnitForm({ ...unitForm, phone: formatPhoneBr(event.target.value) })
              }
              placeholder="(00) 00000-0000"
            />

            <div className="flex w-full flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 select-none">
                País
              </label>
              <Combobox
                options={COUNTRY_OPTIONS}
                value={unitForm.country}
                onChange={(value) =>
                  setUnitForm({ ...unitForm, country: String(value), state: "" })
                }
                placeholder="Selecione o país"
                searchPlaceholder="Buscar país"
                emptyMessage="Nenhum país encontrado."
                className="w-full"
              />
            </div>

            <Input
              label="Cidade"
              value={unitForm.city}
              onChange={(event) => setUnitForm({ ...unitForm, city: event.target.value })}
              placeholder="Cidade"
            />

            {unitForm.country === "Brasil" ? (
              <div className="flex w-full flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 select-none">
                  UF
                </label>
                <Combobox
                  options={STATE_OPTIONS}
                  value={unitForm.state}
                  onChange={(value) => setUnitForm({ ...unitForm, state: String(value) })}
                  placeholder="Selecione a UF"
                  searchPlaceholder="Buscar UF ou estado"
                  emptyMessage="Nenhuma UF encontrada."
                  className="w-full"
                />
              </div>
            ) : (
              <Input
                label="Estado / Província"
                value={unitForm.state}
                onChange={(event) => setUnitForm({ ...unitForm, state: event.target.value })}
                placeholder="Ex: Lisboa, Califórnia"
              />
            )}
          </FormRow>
        </form>
      </Modal>

      <Modal
        open={showUserModal}
        onClose={resetUserModal}
        size="lg"
        title={editingUser ? "Editar acesso" : "Conceder acesso"}
        description="Defina papel, unidade e perfil de permissão para o colaborador."
        icon={<Users size={20} />}
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={resetUserModal}>
              Cancelar
            </Button>
            <Button form="user-form" type="submit" variant="secondary">
              Salvar acesso
            </Button>
          </div>
        }
      >
        <form id="user-form" onSubmit={handleUserSubmit} className="space-y-5">
          <FormRow cols={2}>
            <Input
              label="Nome completo"
              value={userForm.full_name}
              onChange={(event) => setUserForm({ ...userForm, full_name: event.target.value })}
              required
              containerClassName="md:col-span-2"
            />

            <Input
              label="E-mail de acesso"
              type="email"
              value={userForm.email}
              onChange={(event) => setUserForm({ ...userForm, email: event.target.value })}
              required
            />

            {!editingUser ? (
              <Input
                label="Senha inicial"
                type="password"
                showPasswordToggle
                value={userForm.password}
                onChange={(event) => setUserForm({ ...userForm, password: event.target.value })}
                placeholder="admin"
                required
              />
            ) : (
              <ContentCard padding="sm" className="border-zinc-100 bg-zinc-50/80">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">
                  Senha
                </p>
                <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                  Para alterar senha no modo edição, use o fluxo específico de redefinição quando existir.
                </p>
              </ContentCard>
            )}
          </FormRow>

          <FormRow cols={2}>
            <Select
              label="Função"
              value={userForm.role}
              onChange={(event) => {
                const role = event.target.value as "admin" | "user";
                setUserForm({
                  ...userForm,
                  role,
                  access_profile: role === "admin" ? "admin-mestre" : "rh-operacao",
                });
              }}
            >
              <option value="user">Recrutador</option>
              <option value="admin">Administrador</option>
            </Select>

            <Select
              label="Status"
              value={userForm.status}
              onChange={(event) =>
                setUserForm({
                  ...userForm,
                  status: event.target.value as "Ativo" | "Inativo",
                })
              }
            >
              <option value="Ativo">Ativo</option>
              <option value="Inativo">Inativo</option>
            </Select>

            {userForm.role === "user" && (
              <Select
                label="Perfil de acesso"
                value={userForm.access_profile}
                onChange={(event) => {
                  const profile = event.target.value as AccessProfile;
                  setUserForm({ ...userForm, access_profile: profile });
                  // Pre-load action checkboxes with the chosen preset
                  setCustomActions({ ...(ACTION_PROFILE_PRESETS[profile] ?? DEFAULT_CUSTOM_ACTIONS) });
                }}
              >
                <option value="rh-operacao">{ACCESS_PROFILE_LABELS["rh-operacao"]}</option>
                <option value="executivo-leitura">{ACCESS_PROFILE_LABELS["executivo-leitura"]}</option>
                <option value="custom">{ACCESS_PROFILE_LABELS["custom"]}</option>
              </Select>
            )}

            <Select
              label="Unidade"
              value={userForm.unit_id}
              onChange={(event) => setUserForm({ ...userForm, unit_id: event.target.value })}
              required
            >
              <option value="">Selecione...</option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name}
                </option>
              ))}
            </Select>
          </FormRow>

          {/* ── Preview de permissões ── */}
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50/60 overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-200 bg-white flex items-center justify-between">
              <div>
                <p className="text-[11px] font-black text-zinc-800 uppercase tracking-widest">Preview de permissões</p>
                <p className="text-[10px] text-zinc-400 mt-0.5">{ACCESS_PROFILE_DESCRIPTIONS[selectedUserProfile]}</p>
              </div>
              <Badge color={selectedUserProfile === "admin-mestre" ? "primary" : selectedUserProfile === "executivo-leitura" ? "default" : "gold"} pill>
                {ACCESS_PROFILE_LABELS[selectedUserProfile]}
              </Badge>
            </div>

            <div className="p-4 space-y-4">
              {/* Módulos acessíveis */}
              <div>
                <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-2">Módulos visíveis</p>
                <div className="flex flex-wrap gap-1.5">
                  {enabledPermissions.length === 0 ? (
                    <span className="text-[10px] text-zinc-400 italic">Nenhum módulo liberado</span>
                  ) : enabledPermissions.map((p) => (
                    <span key={p} className="text-[10px] font-bold px-2 py-1 bg-develoi-navy/8 text-develoi-navy rounded-lg border border-develoi-navy/15">
                      {ACCESS_PERMISSION_LABELS[p]}
                    </span>
                  ))}
                </div>
              </div>

              {/* Ações permitidas */}
              <div>
                <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-2">O que pode fazer</p>
                {selectedUserProfile === "custom" ? (
                  <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    {ACTION_PERMISSION_KEYS.map((key) => (
                      <label key={key} className="flex items-center gap-2.5 px-3 py-2 rounded-xl border border-zinc-200 bg-white cursor-pointer hover:border-develoi-navy/30 transition-colors">
                        <input
                          type="checkbox"
                          checked={customActions[key]}
                          onChange={(e) => setCustomActions(prev => ({ ...prev, [key]: e.target.checked }))}
                          className="w-4 h-4 rounded accent-develoi-navy"
                        />
                        <span className="text-[11px] font-semibold text-zinc-700">{ACTION_PERMISSION_LABELS[key]}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                    {ACTION_PERMISSION_KEYS.map((key) => {
                      const allowed = previewActions[key];
                      return (
                        <div key={key} className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-[11px] font-semibold ${allowed ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-zinc-50 border-zinc-100 text-zinc-400"}`}>
                          <span className="text-[13px]">{allowed ? "✓" : "✗"}</span>
                          {ACTION_PERMISSION_LABELS[key]}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(deleteConfirm)}
        onClose={() => setDeleteConfirm(null)}
        size="sm"
        title={`Excluir ${deleteConfirm?.type === "unit" ? "unidade" : "acesso"}`}
        description="Esta ação remove o registro permanentemente."
        icon={<Trash2 size={20} />}
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Remover
            </Button>
          </div>
        }
      >
        <p className="text-sm leading-relaxed text-zinc-600">
          Deseja remover <span className="font-black text-zinc-900">{deleteConfirm?.name}</span>{" "}
          permanentemente?
        </p>
      </Modal>
    </PageWrapper>
  );
}
