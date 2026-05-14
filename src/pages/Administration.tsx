import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Building,
  Building2,
  Edit,
  Globe,
  Mail,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { getAuthHeaders, getAuthUser, getTenantId } from "@/src/lib/auth";
import { formatPhoneBr } from "@/src/lib/masks";
import { useUnit, Unit } from "@/src/lib/useUnit";
import {
  ACCESS_PERMISSION_KEYS,
  ACCESS_PERMISSION_LABELS,
  ACCESS_PROFILE_LABELS,
  AccessProfile,
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
  EmptyState,
  FormRow,
  IconButton,
  Input,
  Modal,
  PageWrapper,
  PanelCard,
  SectionTitle,
  Select,
  StatCard,
  StatGrid,
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
    setUserForm({
      ...initialUserForm,
      unit_id: isMaster ? "" : currentUnit.id,
    });
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
    setUserForm({
      full_name: user.full_name,
      email: user.email,
      password: "",
      role: user.role,
      unit_id: user.unit_id,
      status: user.status,
      access_profile: user.access_profile || getDefaultAccessProfile(user.role),
    });
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

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          ...userForm,
          tenant_id: tenantId,
          access_profile: accessProfile,
          permissions_json: JSON.parse(stringifyAccessPermissions(permissions, accessProfile)),
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

  const subtitle =
    activeTab === "units"
      ? `${currentUnit.name} · ${filteredUnits.length} unidades visíveis`
      : `${currentUnit.name} · ${filteredUsers.length} acessos visíveis`;

  return (
    <PageWrapper className="min-h-screen bg-zinc-50/60">
      <div className="space-y-10 px-4 py-10 sm:px-6 lg:px-8">
        <SectionTitle
          title="Administração"
          subtitle={subtitle}
          icon={<Building2 size={22} />}
          actions={
            <div className="flex items-center gap-3">
              <IconButton
                variant="outline"
                className="bg-white"
                onClick={refreshEverything}
                aria-label="Atualizar administração"
              >
                <RefreshCw size={16} />
              </IconButton>

              {activeTab === "units" ? (
                <Button
                  onClick={openCreateUnit}
                  disabled={!isMaster}
                  variant="secondary"
                  iconLeft={<Plus size={16} />}
                >
                  Nova unidade
                </Button>
              ) : (
                <Button
                  onClick={openCreateUser}
                  variant="secondary"
                  iconLeft={<UserPlus size={16} />}
                >
                  Novo acesso
                </Button>
              )}
            </div>
          }
        />

        <StatGrid cols={4}>
          <StatCard title="Unidades totais" value={totalUnits} icon={Building2} color="default" />
          <StatCard title="Matrizes" value={masterUnits} icon={Globe} color="gold" />
          <StatCard title="Filiais" value={branchUnits} icon={Building} color="info" />
          <StatCard title="Usuários ativos" value={activeUsers} icon={Users} color="success" />
        </StatGrid>

        <div className="grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
          <ContentCard className="space-y-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end">
              <Input
                label={activeTab === "units" ? "Pesquisar unidade" : "Pesquisar acesso"}
                type="text"
                placeholder={
                  activeTab === "units" ? "Nome da unidade..." : "Nome, e-mail ou unidade..."
                }
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                icon={<Search size={16} />}
              />

              <div className="flex gap-2 xl:ml-auto">
                <Button
                  variant={activeTab === "units" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTab("units")}
                >
                  Unidades
                </Button>
                <Button
                  variant={activeTab === "users" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTab("users")}
                >
                  Acessos
                </Button>
              </div>
            </div>
          </ContentCard>

          <PanelCard
            title="Leitura rápida"
            description="Visão operacional da estrutura atual do tenant."
            icon={Shield}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <ContentCard padding="sm" className="border-zinc-100 bg-zinc-50/80">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">
                  Escopo atual
                </p>
                <p className="mt-2 text-sm font-black tracking-tight text-zinc-900">
                  {isMaster ? "Visão da matriz" : currentUnit.name}
                </p>
              </ContentCard>

              <ContentCard padding="sm" className="border-zinc-100 bg-zinc-50/80">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">
                  Admins
                </p>
                <p className="mt-2 text-sm font-black tracking-tight text-zinc-900">
                  {adminUsers} acessos administrativos
                </p>
              </ContentCard>

              <ContentCard padding="sm" className="border-zinc-100 bg-zinc-50/80 sm:col-span-2">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">
                  Observação
                </p>
                <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                  {isMaster
                    ? "A matriz pode criar unidades, ajustar hierarquia e operar acessos em todo o tenant."
                    : "Você está operando fora da matriz. A criação de novas unidades fica restrita ao nível master."}
                </p>
              </ContentCard>
            </div>
          </PanelCard>
        </div>

        {activeTab === "units" ? (
          <PanelCard
            title="Estrutura de unidades"
            description="Gerencie matriz, filiais e o ponto de entrada operacional de cada hub."
            icon={Building2}
          >
            {filteredUnits.length === 0 ? (
              <EmptyState
                title="Nenhuma unidade cadastrada"
                description="Cadastre a primeira unidade para iniciar a estrutura organizacional."
                icon={<Building size={42} />}
                action={
                  isMaster ? (
                    <Button onClick={openCreateUnit} variant="secondary">
                      Criar unidade
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
                {filteredUnits.map((unit) => {
                  const isMasterUnit = isProtectedUnit(unit);
                  const isCurrentUnit = currentUnit.id === unit.id;
                  const parentUnit = units.find((current) => current.id === unit.parent_id);

                  return (
                    <ContentCard
                      key={unit.id}
                      className="flex h-full flex-col gap-5 border-zinc-200/80 transition-all hover:border-develoi-navy/20 hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div
                            className={
                              isMasterUnit
                                ? "flex h-12 w-12 items-center justify-center rounded-2xl border border-develoi-gold/20 bg-develoi-gold/10 text-develoi-gold"
                                : "flex h-12 w-12 items-center justify-center rounded-2xl border border-develoi-navy/10 bg-develoi-navy/5 text-develoi-navy"
                            }
                          >
                            {isMasterUnit ? <Globe size={20} /> : <Building2 size={20} />}
                          </div>

                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-base font-black tracking-tight text-zinc-900">
                                {unit.name}
                              </h3>
                              {isMasterUnit && (
                                <Badge color="gold" pill icon={<BadgeCheck size={12} />}>
                                  Matriz
                                </Badge>
                              )}
                              {isCurrentUnit && (
                                <Badge color="primary" pill>
                                  Em uso
                                </Badge>
                              )}
                            </div>

                            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500">
                              <MapPin size={12} />
                              <span>{getUnitLocation(unit)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <IconButton
                            variant="outline"
                            size="sm"
                            onClick={() => openEditUnit(unit)}
                            aria-label="Editar unidade"
                          >
                            <Edit size={14} />
                          </IconButton>

                          {!isProtectedUnit(unit) && (
                            <IconButton
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:bg-red-50 hover:text-red-700"
                              onClick={() =>
                                setDeleteConfirm({ id: unit.id, type: "unit", name: unit.name })
                              }
                              aria-label="Excluir unidade"
                            >
                              <Trash2 size={14} />
                            </IconButton>
                          )}
                        </div>
                      </div>

                      <div className="grid gap-3">
                        <ContentCard padding="sm" className="border-zinc-100 bg-zinc-50/80">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">
                            Empresa
                          </p>
                          <p className="mt-2 text-sm font-semibold text-zinc-700">
                            {unit.company_name || "Razão social não informada"}
                          </p>
                        </ContentCard>

                        <ContentCard padding="sm" className="border-zinc-100 bg-zinc-50/80">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">
                            Responsável
                          </p>
                          <p className="mt-2 text-sm font-semibold text-zinc-700">
                            {unit.responsible_name || "Responsável não informado"}
                          </p>
                        </ContentCard>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <ContentCard padding="sm" className="border-zinc-100 bg-zinc-50/80">
                            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500">
                              <Phone size={12} />
                              <span>{unit.phone || "Telefone não informado"}</span>
                            </div>
                          </ContentCard>

                          <ContentCard padding="sm" className="border-zinc-100 bg-zinc-50/80">
                            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500">
                              <Mail size={12} />
                              <span className="truncate">{unit.email || "E-mail não informado"}</span>
                            </div>
                          </ContentCard>
                        </div>
                      </div>

                      <div className="mt-auto flex items-center justify-between gap-3 border-t border-zinc-100 pt-5">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">
                          {parentUnit ? `Filial de ${parentUnit.name}` : "Unidade raiz"}
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          iconRight={<ArrowRight size={12} />}
                          onClick={() => changeUnit(unit)}
                        >
                          Acessar hub
                        </Button>
                      </div>
                    </ContentCard>
                  );
                })}
              </div>
            )}
          </PanelCard>
        ) : (
          <PanelCard
            title="Gestão de acessos"
            description="Cadastre administradores e recrutadores por unidade com perfil previsível e leitura rápida."
            icon={Users}
          >
            {usersLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="flex items-center gap-3 rounded-full border border-zinc-200 bg-zinc-50 px-5 py-4 text-sm font-semibold text-zinc-600">
                  <RefreshCw size={16} className="animate-spin text-develoi-navy" />
                  Carregando acessos...
                </div>
              </div>
            ) : filteredUsers.length === 0 ? (
              <EmptyState
                title="Nenhum acesso encontrado"
                description="Crie usuários administrativos ou recrutadores para esta operação."
                icon={<Users size={42} />}
                action={
                  <Button onClick={openCreateUser} variant="secondary">
                    Novo acesso
                  </Button>
                }
              />
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {filteredUsers.map((user) => {
                  const accessProfile = user.access_profile || getDefaultAccessProfile(user.role);
                  const isSelfUser = user.id === authUser?.id;
                  const isSeedAdmin = user.id === `admin-${tenantId}`;
                  const isProtectedAccess = isProtectedUser(user);
                  const enabledModules = ACCESS_PERMISSION_KEYS.filter((permission) => {
                    if (permission === "super_admin") {
                      return false;
                    }
                    return getPermissionPreset(accessProfile)[permission];
                  });

                  return (
                    <ContentCard
                      key={user.id}
                      className="flex h-full flex-col gap-5 border-zinc-200/80 transition-all hover:border-develoi-navy/20 hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-zinc-100 bg-zinc-50 text-sm font-black uppercase text-zinc-700">
                            {user.full_name
                              .split(" ")
                              .map((part) => part[0])
                              .slice(0, 2)
                              .join("")}
                          </div>

                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-base font-black tracking-tight text-zinc-900">
                                {user.full_name}
                              </h3>
                              <Badge color={user.status === "Ativo" ? "success" : "danger"} pill dot>
                                {user.status}
                              </Badge>
                              {isSelfUser && (
                                <Badge color="primary" pill>
                                  Seu usuário
                                </Badge>
                              )}
                              {isSeedAdmin && (
                                <Badge color="gold" pill>
                                  Admin inicial
                                </Badge>
                              )}
                            </div>

                            <p className="text-sm text-zinc-500">{user.email}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <IconButton
                            variant="outline"
                            size="sm"
                            onClick={() => openEditUser(user)}
                            aria-label="Editar acesso"
                          >
                            <Edit size={14} />
                          </IconButton>

                          {!isProtectedAccess && (
                            <IconButton
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:bg-red-50 hover:text-red-700"
                              onClick={() =>
                                setDeleteConfirm({ id: user.id, type: "user", name: user.full_name })
                              }
                              aria-label="Excluir acesso"
                            >
                              <Trash2 size={14} />
                            </IconButton>
                          )}
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <ContentCard padding="sm" className="border-zinc-100 bg-zinc-50/80">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">
                            Papel
                          </p>
                          <p className="mt-2 text-sm font-semibold text-zinc-700">
                            {user.role === "admin" ? "Administrador" : "Recrutador"}
                          </p>
                        </ContentCard>

                        <ContentCard padding="sm" className="border-zinc-100 bg-zinc-50/80">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">
                            Unidade
                          </p>
                          <p className="mt-2 text-sm font-semibold text-zinc-700">
                            {user.unit_name || "Admin master"}
                          </p>
                        </ContentCard>
                      </div>

                      <ContentCard padding="sm" className="space-y-3 border-zinc-100 bg-zinc-50/80">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge color={user.role === "admin" ? "primary" : "default"} pill>
                            {ACCESS_PROFILE_LABELS[accessProfile]}
                          </Badge>
                          {isProtectedAccess && (
                            <Badge color="default" pill>
                              Exclusão bloqueada
                            </Badge>
                          )}
                          <Badge color="default" pill>
                            Último acesso: {formatLastLogin(user.last_login)}
                          </Badge>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {enabledModules.slice(0, 5).map((permission) => (
                            <Badge key={permission} color="default" size="sm" pill>
                              {ACCESS_PERMISSION_LABELS[permission]}
                            </Badge>
                          ))}
                          {enabledModules.length > 5 && (
                            <Badge color="default" size="sm" pill>
                              +{enabledModules.length - 5} módulos
                            </Badge>
                          )}
                        </div>
                      </ContentCard>
                    </ContentCard>
                  );
                })}
              </div>
            )}
          </PanelCard>
        )}
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
                onChange={(event) =>
                  setUserForm({
                    ...userForm,
                    access_profile: event.target.value as AccessProfile,
                  })
                }
              >
                <option value="rh-operacao">{ACCESS_PROFILE_LABELS["rh-operacao"]}</option>
                <option value="executivo-leitura">
                  {ACCESS_PROFILE_LABELS["executivo-leitura"]}
                </option>
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

          <PanelCard
            title="Preview de permissões"
            description="Resumo do que este perfil libera na navegação."
            icon={Shield}
          >
            <div className="flex flex-wrap gap-2">
              {enabledPermissions.map((permission) => (
                <Badge key={permission} color="default" pill>
                  {ACCESS_PERMISSION_LABELS[permission]}
                </Badge>
              ))}
            </div>
          </PanelCard>
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
