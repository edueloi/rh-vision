import React, { useEffect, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Building,
  Building2,
  ChevronRight,
  Edit,
  Globe,
  Mail,
  MapPin,
  Phone,
  Plus,
  Search,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { cn } from "../lib/utils";
import { getAuthHeaders, getTenantId } from "../lib/auth";
import { useUnit, Unit } from "../lib/useUnit";
import { ACCESS_PROFILE_LABELS, AccessProfile, getDefaultAccessProfile, getPermissionPreset, stringifyAccessPermissions } from "../lib/access";
import {
  Badge,
  Button,
  EmptyState,
  IconButton,
  Input,
  PanelCard,
  Select,
  useToast,
} from "../components/ui";

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
}

const initialUnitForm = {
  name: "",
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

export default function Administration() {
  const { currentUnit, isMaster, units, changeUnit, refreshUnits } = useUnit();
  const tenantId = getTenantId();
  const [activeTab, setActiveTab] = useState<"units" | "users">("units");
  const [dbUsers, setDbUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

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

  const toast = useToast();

  useEffect(() => {
    if (activeTab === "users") {
      fetchUsers();
      return;
    }
    setIsLoading(false);
  }, [activeTab, currentUnit.id, isMaster]);

  const fetchUsers = async () => {
    setIsLoading(true);

    try {
      const res = await fetch(`/api/users?tenantId=${tenantId}&unitId=${isMaster ? "master" : currentUnit.id}`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setDbUsers(data);
      } else {
        toast.error("Falha ao carregar usuários.");
      }
    } catch {
      toast.error("Falha ao carregar usuários.");
    } finally {
      setIsLoading(false);
    }
  };

  const resetUnitModal = () => {
    setShowUnitModal(false);
    setEditingUnit(null);
    setUnitForm(initialUnitForm);
  };

  const resetUserModal = () => {
    setShowUserModal(false);
    setEditingUser(null);
    setUserForm(initialUserForm);
  };

  const handleUnitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingUnit ? `/api/units/${editingUnit.id}` : "/api/units";
    const method = editingUnit ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ ...unitForm, tenant_id: tenantId }),
      });

      if (res.ok) {
        toast.success(`Unidade ${editingUnit ? "atualizada" : "criada"} com sucesso!`);
        resetUnitModal();
        await refreshUnits();
      } else {
        toast.error("Erro ao salvar unidade.");
      }
    } catch {
      toast.error("Falha de conexão ao salvar a unidade.");
    }
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingUser ? `/api/users/${editingUser.id}` : "/api/users";
    const method = editingUser ? "PUT" : "POST";

    const accessProfile: AccessProfile = userForm.role === "admin" ? "admin-mestre" : userForm.access_profile;
    const permissions = getPermissionPreset(accessProfile);
    permissions.super_admin = false;

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          ...userForm,
          tenant_id: tenantId,
          access_profile: accessProfile,
          permissions_json: JSON.parse(stringifyAccessPermissions(permissions, accessProfile)),
        }),
      });

      if (res.ok) {
        toast.success(`Acesso ${editingUser ? "atualizado" : "concedido"} com sucesso!`);
        resetUserModal();
        await fetchUsers();
      } else {
        toast.error("Erro ao salvar acesso.");
      }
    } catch {
      toast.error("Falha de conexão ao salvar o acesso.");
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) {
      return;
    }

    try {
      const res = await fetch(`/api/${deleteConfirm.type}s/${deleteConfirm.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (res.ok) {
        toast.success(
          `${deleteConfirm.type === "unit" ? "Unidade" : "Acesso"} removido com sucesso.`
        );
        setDeleteConfirm(null);

        if (deleteConfirm.type === "unit") {
          await refreshUnits();
        } else {
          await fetchUsers();
        }
      } else {
        toast.error("Erro ao remover o registro.");
      }
    } catch {
      toast.error("Falha ao executar a exclusão.");
    }
  };

  const openEditUnit = (unit: Unit) => {
    setEditingUnit(unit);
    setUnitForm({
      name: unit.name || "",
      city: unit.city || "",
      state: unit.state || "",
      company_name: unit.company_name || "",
      responsible_name: unit.responsible_name || "",
      phone: unit.phone || "",
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
      access_profile: (user as any).access_profile || getDefaultAccessProfile(user.role),
    });
    setShowUserModal(true);
  };

  const filteredUnits = units.filter((unit) =>
    unit.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredUsers = dbUsers.filter(
    (user) =>
      user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="animate-in fade-in duration-500 space-y-8">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Badge color="primary" size="md" pill>
              Configurações
            </Badge>
            <span className="h-1 w-1 rounded-full bg-zinc-300" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
              Recruitment Hub
            </span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900">Administração</h1>
          <p className="mt-1 font-medium text-zinc-500">
            Gerencie unidades, acessos e a hierarquia operacional da plataforma.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {activeTab === "units" ? (
            <Button
              onClick={() => setShowUnitModal(true)}
              disabled={!isMaster}
              size="lg"
              iconLeft={<Plus size={16} />}
              className="rounded-2xl"
            >
              Nova Unidade
            </Button>
          ) : (
            <Button
              onClick={() => setShowUserModal(true)}
              size="lg"
              iconLeft={<UserPlus size={16} />}
              className="rounded-2xl"
            >
              Novo Acesso
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex w-fit gap-1 rounded-2xl bg-zinc-100/80 p-1">
          <button
            type="button"
            onClick={() => setActiveTab("units")}
            className={cn(
              "flex items-center gap-2 rounded-xl px-6 py-2.5 text-xs font-black uppercase tracking-widest transition-all",
              activeTab === "units" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500"
            )}
          >
            <Building2 size={14} /> Unidades
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("users")}
            className={cn(
              "flex items-center gap-2 rounded-xl px-6 py-2.5 text-xs font-black uppercase tracking-widest transition-all",
              activeTab === "users" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500"
            )}
          >
            <Users size={14} /> Acessos
          </button>
        </div>

        <Input
          type="text"
          placeholder={activeTab === "units" ? "Pesquisar unidades..." : "Pesquisar acessos..."}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          icon={<Search size={18} />}
          containerClassName="w-full md:w-96"
          className="h-12 rounded-2xl bg-white pl-11 text-sm font-bold shadow-sm"
        />
      </div>

      {activeTab === "units" ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredUnits.length === 0 && (
            <PanelCard className="col-span-full rounded-[40px] border-dashed" padding={false}>
              <EmptyState
                title="Nenhuma unidade cadastrada"
                description="Cadastre a primeira unidade para iniciar a estrutura organizacional."
                icon={<Building size={48} />}
                action={
                  isMaster ? (
                    <Button
                      onClick={() => setShowUnitModal(true)}
                      iconLeft={<Plus size={14} />}
                      className="rounded-2xl"
                    >
                      Criar Unidade
                    </Button>
                  ) : undefined
                }
              />
            </PanelCard>
          )}

          {filteredUnits.map((unit) => {
            const isMasterUnit = Boolean(unit.is_master);
            const parentUnit = units.find((current) => current.id === unit.parent_id);
            const unitLocation =
              unit.location || [unit.city, unit.state].filter(Boolean).join(", ") || "Local não informado";

            return (
              <PanelCard
                key={unit.id}
                className="group relative rounded-[32px] shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl"
                contentClassName="p-8"
                padding={false}
                color={isMasterUnit ? "#c59b4d" : "#2a74ac"}
              >
                <div className="absolute right-0 top-0 h-24 w-24 -mr-12 -mt-12 rounded-full bg-develoi-navy/5 transition-all group-hover:bg-develoi-navy/10" />

                <div className="relative flex items-start justify-between gap-4">
                  <div
                    className={cn(
                      "flex h-14 w-14 items-center justify-center rounded-2xl",
                      isMasterUnit
                        ? "bg-develoi-navy text-white"
                        : unit.parent_id
                          ? "bg-develoi-navy/10 text-develoi-navy"
                          : "bg-zinc-100 text-zinc-700"
                    )}
                  >
                    {isMasterUnit ? (
                      <Globe size={24} />
                    ) : unit.parent_id ? (
                      <ChevronRight size={24} />
                    ) : (
                      <Building2 size={24} />
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <IconButton
                      onClick={() => openEditUnit(unit)}
                      className="text-zinc-300 hover:text-zinc-900"
                    >
                      <Edit size={18} />
                    </IconButton>
                    {!isMasterUnit && (
                      <IconButton
                        onClick={() =>
                          setDeleteConfirm({ id: unit.id, type: "unit", name: unit.name })
                        }
                        className="text-zinc-300 hover:text-red-500"
                      >
                        <Trash2 size={18} />
                      </IconButton>
                    )}
                  </div>
                </div>

                <div className="relative mt-6 space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-bold tracking-tight text-zinc-900">{unit.name}</h3>
                    {isMasterUnit && (
                      <Badge color="gold" pill icon={<BadgeCheck size={12} />}>
                        Matriz
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-400">
                    <MapPin size={12} />
                    <span>{unitLocation}</span>
                  </div>

                  <div className="space-y-3 border-t border-zinc-100 pt-6">
                    <div className="flex items-center gap-3">
                      <Building size={14} className="text-zinc-300" />
                      <p className="truncate text-[10px] font-bold text-zinc-600">
                        {unit.company_name || "Razão social não informada"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Users size={14} className="text-zinc-300" />
                      <p className="truncate text-[10px] font-bold text-zinc-600">
                        {unit.responsible_name || "Responsável não informado"}
                      </p>
                    </div>
                    {unit.phone && (
                      <div className="flex items-center gap-3">
                        <Phone size={14} className="text-zinc-300" />
                        <p className="truncate text-[10px] font-bold text-zinc-600">{unit.phone}</p>
                      </div>
                    )}
                    {unit.email && (
                      <div className="flex items-center gap-3">
                        <Mail size={14} className="text-zinc-300" />
                        <p className="truncate text-[10px] font-bold text-zinc-600">{unit.email}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="relative mt-8 flex items-center justify-between gap-4 border-t border-zinc-100 pt-6">
                  <div className="text-[9px] font-black uppercase tracking-widest text-zinc-300">
                    {parentUnit ? `Filial de: ${parentUnit.name}` : "Unidade Matriz"}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => changeUnit(unit)}
                    iconRight={<ArrowRight size={12} />}
                    className="rounded-2xl text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-develoi-gold"
                  >
                    Acessar Hub
                  </Button>
                </div>
              </PanelCard>
            );
          })}
        </div>
      ) : (
        <PanelCard className="rounded-[40px]" padding={false} contentClassName="overflow-hidden p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-24">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-develoi-navy/10 border-t-develoi-navy" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <EmptyState
              title="Nenhum acesso encontrado"
              description="Crie usuários administrativos ou recrutadores para esta operação."
              icon={<Users size={48} />}
              action={
                <Button
                  onClick={() => setShowUserModal(true)}
                  iconLeft={<UserPlus size={14} />}
                  className="rounded-2xl"
                >
                  Novo Acesso
                </Button>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px]">
                <thead>
                  <tr className="border-b border-zinc-100 text-left text-[9px] uppercase tracking-[0.2em] text-zinc-400">
                    <th className="px-8 py-5">Colaborador</th>
                    <th className="px-8 py-5">Perfil</th>
                    <th className="px-8 py-5">Unidade</th>
                    <th className="px-8 py-5">Status</th>
                    <th className="px-8 py-5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="transition-colors hover:bg-zinc-50/50">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100 text-xs font-bold uppercase text-zinc-600 shadow-sm">
                            {user.full_name.substring(0, 2)}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-zinc-900">{user.full_name}</p>
                            <p className="text-[10px] font-bold text-zinc-400">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <Badge color={user.role === "admin" ? "primary" : "default"} pill>
                          {user.role === "admin" ? "Administrador" : "Recrutador"}
                        </Badge>
                      </td>
                      <td className="px-8 py-5 text-sm font-bold text-zinc-600">
                        {user.unit_name || "Admin Master"}
                      </td>
                      <td className="px-8 py-5">
                        <Badge
                          color={user.status === "Ativo" ? "success" : "danger"}
                          pill
                          dot
                        >
                          {user.status}
                        </Badge>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex justify-end gap-2">
                          <IconButton
                            onClick={() => openEditUser(user)}
                            className="text-zinc-300 hover:text-zinc-900"
                          >
                            <Edit size={16} />
                          </IconButton>
                          <IconButton
                            onClick={() =>
                              setDeleteConfirm({ id: user.id, type: "user", name: user.full_name })
                            }
                            className="text-zinc-300 hover:text-red-500"
                          >
                            <Trash2 size={16} />
                          </IconButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </PanelCard>
      )}

      {showUnitModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-900/40 p-4 backdrop-blur-sm">
          <PanelCard
            title={editingUnit ? "Editar Unidade" : "Cadastrar Unidade"}
            description="Cadastre unidades matriz e filiais para organizar sua operação."
            className="w-full max-w-3xl rounded-[40px] shadow-2xl"
            contentClassName="p-8 pt-0 sm:p-10 sm:pt-0"
          >
            <form onSubmit={handleUnitSubmit} className="grid gap-5 md:grid-cols-2">
              <Input
                label="Nome de Exibição"
                value={unitForm.name}
                onChange={(e) => setUnitForm({ ...unitForm, name: e.target.value })}
                placeholder="Ex: Develoi - Filial Sul"
                required
                className="h-11 rounded-2xl bg-zinc-50 text-sm font-bold"
                containerClassName="md:col-span-2"
              />

              <Select
                label="Unidade Pai"
                value={unitForm.parent_id}
                onChange={(e) => setUnitForm({ ...unitForm, parent_id: e.target.value })}
                className="h-11 rounded-2xl bg-zinc-50 text-sm font-bold"
              >
                <option value="">Nenhuma (Unidade Matriz)</option>
                {units
                  .filter((unit) => !unit.parent_id)
                  .map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name}
                    </option>
                  ))}
              </Select>

              <Input
                label="Razão Social"
                value={unitForm.company_name}
                onChange={(e) => setUnitForm({ ...unitForm, company_name: e.target.value })}
                placeholder="Razão social ou nome da empresa"
                className="h-11 rounded-2xl bg-zinc-50 text-sm font-bold"
              />

              <Input
                label="Responsável"
                value={unitForm.responsible_name}
                onChange={(e) => setUnitForm({ ...unitForm, responsible_name: e.target.value })}
                placeholder="Nome completo"
                className="h-11 rounded-2xl bg-zinc-50 text-sm font-bold"
              />

              <Input
                label="E-mail"
                type="email"
                value={unitForm.email}
                onChange={(e) => setUnitForm({ ...unitForm, email: e.target.value })}
                placeholder="contato@empresa.com"
                className="h-11 rounded-2xl bg-zinc-50 text-sm font-bold"
              />

              <Input
                label="Telefone / WhatsApp"
                value={unitForm.phone}
                onChange={(e) => setUnitForm({ ...unitForm, phone: e.target.value })}
                placeholder="(00) 00000-0000"
                className="h-11 rounded-2xl bg-zinc-50 text-sm font-bold"
              />

              <Input
                label="Cidade"
                value={unitForm.city}
                onChange={(e) => setUnitForm({ ...unitForm, city: e.target.value })}
                placeholder="Cidade"
                className="h-11 rounded-2xl bg-zinc-50 text-sm font-bold"
              />

              <Input
                label="UF"
                value={unitForm.state}
                onChange={(e) => setUnitForm({ ...unitForm, state: e.target.value })}
                placeholder="SP"
                className="h-11 rounded-2xl bg-zinc-50 text-sm font-bold"
              />

              <div className="flex gap-3 pt-4 md:col-span-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={resetUnitModal}
                  className="flex-1 rounded-2xl"
                >
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1 rounded-2xl">
                  Salvar Unidade
                </Button>
              </div>
            </form>
          </PanelCard>
        </div>
      )}

      {showUserModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-900/40 p-4 backdrop-blur-sm">
          <PanelCard
            title={editingUser ? "Editar Acesso" : "Conceder Acesso"}
            description="Configure perfis administrativos e recrutadores por unidade."
            className="w-full max-w-xl rounded-[40px] shadow-2xl"
            contentClassName="p-8 pt-0 sm:p-10 sm:pt-0"
          >
            <form onSubmit={handleUserSubmit} className="space-y-5">
              <Input
                label="Nome Completo"
                value={userForm.full_name}
                onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })}
                required
                className="h-11 rounded-2xl bg-zinc-50 text-sm font-bold"
              />

              <Input
                label="E-mail de Acesso"
                type="email"
                value={userForm.email}
                onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                required
                className="h-11 rounded-2xl bg-zinc-50 text-sm font-bold"
              />

              {!editingUser && (
                <Input
                  label="Senha Inicial"
                  type="password"
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  placeholder="admin"
                  required
                  className="h-11 rounded-2xl bg-zinc-50 text-sm font-bold"
                />
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <Select
                  label="Função"
                  value={userForm.role}
                  onChange={(e) => {
                    const role = e.target.value as "admin" | "user";
                    setUserForm({
                      ...userForm,
                      role,
                      access_profile: role === "admin" ? "admin-mestre" : "rh-operacao",
                    });
                  }}
                  className="h-11 rounded-2xl bg-zinc-50 text-sm font-bold"
                >
                  <option value="user">Recrutador</option>
                  <option value="admin">Administrador</option>
                </Select>

                <Select
                  label="Status"
                  value={userForm.status}
                  onChange={(e) =>
                    setUserForm({
                      ...userForm,
                      status: e.target.value as "Ativo" | "Inativo",
                    })
                  }
                  className="h-11 rounded-2xl bg-zinc-50 text-sm font-bold"
                >
                  <option value="Ativo">Ativo</option>
                  <option value="Inativo">Inativo</option>
                </Select>
              </div>

              {userForm.role === "user" && (
                <Select
                  label="Perfil de Acesso"
                  value={userForm.access_profile}
                  onChange={(e) =>
                    setUserForm({ ...userForm, access_profile: e.target.value as AccessProfile })
                  }
                  className="h-11 rounded-2xl bg-zinc-50 text-sm font-bold"
                >
                  <option value="rh-operacao">{ACCESS_PROFILE_LABELS["rh-operacao"]}</option>
                  <option value="executivo-leitura">{ACCESS_PROFILE_LABELS["executivo-leitura"]}</option>
                </Select>
              )}

              <Select
                label="Unidade"
                value={userForm.unit_id}
                onChange={(e) => setUserForm({ ...userForm, unit_id: e.target.value })}
                required
                className="h-11 rounded-2xl bg-zinc-50 text-sm font-bold"
              >
                <option value="">Selecione...</option>
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name}
                  </option>
                ))}
              </Select>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={resetUserModal}
                  className="flex-1 rounded-2xl"
                >
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1 rounded-2xl">
                  Salvar Acesso
                </Button>
              </div>
            </form>
          </PanelCard>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-zinc-900/40 p-4 backdrop-blur-sm">
          <PanelCard
            className="w-full max-w-sm rounded-[40px] text-center shadow-2xl"
            contentClassName="p-10"
          >
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-red-100 text-red-600 shadow-sm">
              <Trash2 size={32} />
            </div>
            <h2 className="mb-2 text-2xl font-bold tracking-tight text-zinc-900">
              Excluir {deleteConfirm.type === "unit" ? "Unidade" : "Acesso"}?
            </h2>
            <p className="mb-8 text-sm font-medium text-zinc-500">
              Deseja remover{" "}
              <span className="font-bold text-red-600">{deleteConfirm.name}</span> permanentemente?
            </p>
            <div className="flex gap-3">
              <Button
                variant="ghost"
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 rounded-2xl"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleDelete}
                variant="danger"
                className="flex-1 rounded-2xl shadow-lg shadow-red-600/20"
              >
                Remover
              </Button>
            </div>
          </PanelCard>
        </div>
      )}
    </div>
  );
}
