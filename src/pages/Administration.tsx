import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Users, 
  ShieldCheck, 
  Plus, 
  Search, 
  ArrowRight,
  UserPlus,
  Lock,
  Globe,
  MapPin,
  Mail,
  BadgeCheck,
  AlertCircle,
  Key,
  RefreshCw,
  Trash2,
  Edit,
  AtSign,
  Phone,
  ChevronRight,
  Building
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useUnit, Unit } from '../lib/useUnit';
import { Button } from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  password?: string;
  role: 'admin' | 'user';
  unit_id: string;
  unit_name?: string;
  status: 'Ativo' | 'Inativo';
  last_login?: string;
}

export default function Administration() {
  const { currentUnit, isMaster, units, changeUnit, refreshUnits } = useUnit();
  const [activeTab, setActiveTab] = useState<'units' | 'users'>('units');
  const [dbUsers, setDbUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; type: 'unit' | 'user'; name: string } | null>(null);
  
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  
  const [unitForm, setUnitForm] = useState({ 
    name: '', 
    city: '', 
    state: '', 
    company_name: '', 
    responsible_name: '', 
    phone: '', 
    email: '',
    parent_id: ''
  });

  const [userForm, setUserForm] = useState({ 
    full_name: '', 
    email: '', 
    password: '',
    role: 'user' as 'admin' | 'user', 
    unit_id: '',
    status: 'Ativo' as 'Ativo' | 'Inativo'
  });

  const toast = useToast();

  useEffect(() => {
    fetchUsers();
  }, [activeTab]);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/users?unitId=${isMaster ? 'master' : currentUnit.id}`);
      if (res.ok) {
        const data = await res.json();
        setDbUsers(data);
      }
    } catch (error) {
      toast.error("Falha ao carregar usuários");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingUnit ? `/api/units/${editingUnit.id}` : '/api/units';
    const method = editingUnit ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(unitForm)
      });

      if (res.ok) {
        toast.success(`Unidade ${editingUnit ? 'atualizada' : 'criada'} com sucesso!`);
        setShowUnitModal(false);
        setEditingUnit(null);
        setUnitForm({ name: '', city: '', state: '', company_name: '', responsible_name: '', phone: '', email: '', parent_id: '' });
        refreshUnits();
      } else {
        toast.error("Erro ao salvar unidade");
      }
    } catch (error) {
      toast.error("Conexão falhou");
    }
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
    const method = editingUser ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userForm)
      });

      if (res.ok) {
        toast.success(`Acesso ${editingUser ? 'atualizado' : 'concedido'} com sucesso!`);
        setShowUserModal(false);
        setEditingUser(null);
        setUserForm({ full_name: '', email: '', password: '', role: 'user', unit_id: '', status: 'Ativo' });
        fetchUsers();
      } else {
        toast.error("Erro ao salvar acesso");
      }
    } catch (error) {
      toast.error("Conexão falhou");
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      const res = await fetch(`/api/${deleteConfirm.type}s/${deleteConfirm.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success(`${deleteConfirm.type === 'unit' ? 'Unidade' : 'Acesso'} removido.`);
        setDeleteConfirm(null);
        if (deleteConfirm.type === 'unit') refreshUnits();
        else fetchUsers();
      }
    } catch (error) {
      toast.error("Operação falhou");
    }
  };

  const openEditUnit = (unit: Unit) => {
    setEditingUnit(unit);
    setUnitForm({
      name: unit.name,
      city: unit.city || '',
      state: unit.state || '',
      company_name: unit.company_name || '',
      responsible_name: unit.responsible_name || '',
      phone: unit.phone || '',
      email: unit.email || '',
      parent_id: unit.parent_id || ''
    });
    setShowUnitModal(true);
  };

  const openEditUser = (user: UserProfile) => {
    setEditingUser(user);
    setUserForm({
      full_name: user.full_name,
      email: user.email,
      password: '', // Non-editable password usually
      role: user.role,
      unit_id: user.unit_id,
      status: user.status
    });
    setShowUserModal(true);
  };

  const filteredUnits = units.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredUsers = dbUsers.filter(u => u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) || u.email.toLowerCase().includes(searchQuery.toLowerCase()));

  // Hierarchical helper
  const getSubUnits = (parentId: string) => units.filter(u => u.parent_id === parentId);
  const masterUnits = units.filter(u => !u.parent_id || u.is_master);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 bg-develoi-navy/10 text-develoi-navy text-[10px] font-bold uppercase tracking-widest rounded-md">Configurações</span>
            <div className="w-1 h-1 bg-zinc-300 rounded-full" />
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Recruitment Hub Hub</span>
          </div>
          <h1 className="text-4xl font-bold text-zinc-900 tracking-tight">Administração</h1>
          <p className="text-zinc-500 font-medium mt-1">Gerencie a hierarquia de unidades e controle de acessos da plataforma.</p>
        </div>

        <div className="flex items-center gap-3">
          {activeTab === 'units' ? (
            <Button onClick={() => setShowUnitModal(true)} className="rounded-2xl" disabled={!isMaster}>
              <Plus size={18} className="mr-2" /> Nova Unidade
            </Button>
          ) : (
            <Button onClick={() => setShowUserModal(true)} className="rounded-2xl">
              <UserPlus size={18} className="mr-2" /> Novo Acesso
            </Button>
          )}
        </div>
      </div>

      <div className="flex gap-1 p-1 bg-zinc-100/80 rounded-2xl w-fit">
        <button onClick={() => setActiveTab('units')} className={cn("flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all", activeTab === 'units' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500")}>
          <Building2 size={14} /> Unidades
        </button>
        <button onClick={() => setActiveTab('users')} className={cn("flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all", activeTab === 'users' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500")}>
          <Users size={14} /> Acessos
        </button>
      </div>

      <div className="relative w-full md:w-96">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
        <input 
          type="text" 
          placeholder="Pesquisar..." 
          className="w-full pl-12 pr-4 py-3 bg-white border border-zinc-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-develoi-navy/20 transition-all shadow-sm"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {activeTab === 'units' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUnits.length === 0 && (
            <div className="col-span-full p-20 text-center bg-white rounded-[40px] border border-dashed border-zinc-200">
               <Building size={48} className="mx-auto text-zinc-200 mb-4" />
               <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Nenhuma unidade cadastrada</p>
            </div>
          )}
          {filteredUnits.map((unit) => (
            <div key={unit.id} className="group bg-white border border-zinc-200 rounded-[32px] p-8 hover:shadow-xl transition-all relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-develoi-navy/5 rounded-full -mr-12 -mt-12 transition-all group-hover:bg-develoi-navy/10" />
              
              <div className="flex justify-between items-start mb-6">
                <div className={cn("p-3 rounded-2xl", unit.is_master ? "bg-develoi-navy text-white" : "bg-develoi-navy/5 text-develoi-navy")}>
                  {unit.is_master ? <Globe size={24} /> : (unit.parent_id ? <ChevronRight size={24} /> : <Building2 size={24} />)}
                </div>
                <div className="flex items-center gap-1">
                   <button onClick={() => openEditUnit(unit)} className="p-2 text-zinc-300 hover:text-zinc-900"><Edit size={18} /></button>
                   {!unit.is_master && <button onClick={() => setDeleteConfirm({ id: unit.id, type: 'unit', name: unit.name })} className="p-2 text-zinc-300 hover:text-red-500"><Trash2 size={18} /></button>}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-zinc-900 tracking-tight flex items-center gap-2">
                  {unit.name}
                  {unit.is_master ? <BadgeCheck size={16} className="text-develoi-gold" /> : null}
                </h3>
                <div className="flex items-center gap-1.5 text-zinc-400 text-xs font-bold mb-4">
                  <MapPin size={12} />
                  <span>{unit.location}</span>
                </div>

                <div className="space-y-3 pt-6 border-t border-zinc-50">
                   <div className="flex items-center gap-3">
                      <Building size={14} className="text-zinc-300" />
                      <p className="text-[10px] font-bold text-zinc-600 truncate">{unit.company_name || 'Razão Social não informada'}</p>
                   </div>
                   <div className="flex items-center gap-3">
                      <Users size={14} className="text-zinc-300" />
                      <p className="text-[10px] font-bold text-zinc-600">{unit.responsible_name || 'Responsável não informado'}</p>
                   </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-zinc-50 flex items-center justify-between">
                <div className="text-[9px] font-black text-zinc-300 uppercase tracking-widest leading-none">
                  {unit.parent_id ? `Filial de: ${units.find(u => u.id === unit.parent_id)?.name}` : 'Unidade Matriz'}
                </div>
                <button onClick={() => changeUnit(unit)} className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-develoi-gold transition-colors">
                  Acessar Hub <ArrowRight size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-zinc-200 rounded-[40px] overflow-hidden shadow-sm">
           <table className="w-full">
              <thead>
                 <tr className="text-left border-b border-zinc-100 uppercase text-[9px] tracking-[0.2em] text-zinc-400">
                    <th className="px-8 py-5">Colaborador</th>
                    <th className="px-8 py-5">Nível</th>
                    <th className="px-8 py-5">Unidade</th>
                    <th className="px-8 py-5">Ações</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                 {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-zinc-50/50 transition-colors">
                       <td className="px-8 py-5">
                          <div className="flex items-center gap-4">
                             <div className="w-10 h-10 rounded-2xl bg-zinc-100 flex items-center justify-center text-xs font-bold text-zinc-600 overflow-hidden shadow-sm border border-zinc-200 uppercase">
                                {user.full_name.substring(0, 2)}
                             </div>
                             <div>
                                <p className="text-sm font-bold text-zinc-900">{user.full_name}</p>
                                <p className="text-[10px] font-bold text-zinc-400">{user.email}</p>
                             </div>
                          </div>
                       </td>
                       <td className="px-8 py-5">
                          <span className={cn("px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest", user.role === 'admin' ? "bg-develoi-navy text-white" : "bg-zinc-100 text-zinc-500")}>
                             {user.role === 'admin' ? 'Administrador' : 'Recrutador'}
                          </span>
                       </td>
                       <td className="px-8 py-5 text-sm font-bold text-zinc-600">
                          {user.unit_name || 'Admin Master'}
                       </td>
                       <td className="px-8 py-5 text-right space-x-2">
                          <button onClick={() => openEditUser(user)} className="p-2 text-zinc-300 hover:text-zinc-900"><Edit size={16} /></button>
                          <button onClick={() => setDeleteConfirm({ id: user.id, type: 'user', name: user.full_name })} className="p-2 text-zinc-300 hover:text-red-500"><Trash2 size={16} /></button>
                       </td>
                    </tr>
                 ))}
              </tbody>
           </table>
        </div>
      )}

      {/* Modals */}
      {showUnitModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] w-full max-w-2xl p-10 shadow-2xl animate-in zoom-in-95 duration-300">
            <h2 className="text-2xl font-bold text-zinc-900 tracking-tight mb-2">{editingUnit ? 'Editar Unidade' : 'Cadastrar Unidade'}</h2>
            <p className="text-sm text-zinc-500 font-medium mb-10">Cadastre unidades Matriz e Filiais para organizar sua operação.</p>
            
            <form onSubmit={handleUnitSubmit} className="grid md:grid-cols-2 gap-6">
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Nome de Exibição</label>
                <input required type="text" placeholder="Ex: Develoi - Filial Sul" className="w-full px-5 py-3.5 bg-zinc-50 border border-zinc-200 rounded-2xl text-sm font-bold outline-none focus:border-develoi-gold" value={unitForm.name} onChange={e => setUnitForm({...unitForm, name: e.target.value})} />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Unidade Pai (Opcional)</label>
                <select className="w-full px-5 py-3.5 bg-zinc-50 border border-zinc-200 rounded-2xl text-sm font-bold outline-none" value={unitForm.parent_id} onChange={e => setUnitForm({...unitForm, parent_id: e.target.value})}>
                   <option value="">Nenhuma (Unidade Matriz)</option>
                   {units.filter(u => !u.parent_id).map(u => (
                     <option key={u.id} value={u.id}>{u.name}</option>
                   ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Razão Social / Nome de Empresa</label>
                <input type="text" placeholder="Razão Social" className="w-full px-5 py-3.5 bg-zinc-50 border border-zinc-200 rounded-2xl text-sm font-bold outline-none" value={unitForm.company_name} onChange={e => setUnitForm({...unitForm, company_name: e.target.value})} />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Responsável</label>
                <input type="text" placeholder="Nome Completo" className="w-full px-5 py-3.5 bg-zinc-50 border border-zinc-200 rounded-2xl text-sm font-bold outline-none" value={unitForm.responsible_name} onChange={e => setUnitForm({...unitForm, responsible_name: e.target.value})} />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Telefone / WhatsApp</label>
                <input type="text" placeholder="(00) 00000-0000" className="w-full px-5 py-3.5 bg-zinc-50 border border-zinc-200 rounded-2xl text-sm font-bold outline-none" value={unitForm.phone} onChange={e => setUnitForm({...unitForm, phone: e.target.value})} />
              </div>

              <div className="flex gap-3 pt-6 md:col-span-2">
                <Button type="button" variant="ghost" onClick={() => { setShowUnitModal(false); setEditingUnit(null); }} className="flex-1 rounded-2xl">Cancelar</Button>
                <Button type="submit" className="flex-1 rounded-2xl bg-zinc-900 text-white font-black uppercase text-[10px] tracking-widest">Salvar Unidade</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showUserModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-sm animate-in fade-in duration-300">
           <div className="bg-white rounded-[40px] w-full max-w-md p-10 shadow-2xl">
              <h2 className="text-2xl font-bold text-zinc-900 tracking-tight mb-2">{editingUser ? 'Editar Acesso' : 'Conceder Acesso'}</h2>
              <form onSubmit={handleUserSubmit} className="space-y-6">
                 <div className="space-y-1.5">
                   <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Nome Completo</label>
                   <input required type="text" className="w-full px-5 py-3.5 bg-zinc-50 border border-zinc-200 rounded-2xl text-sm font-bold outline-none" value={userForm.full_name} onChange={e => setUserForm({...userForm, full_name: e.target.value})} />
                 </div>
                 <div className="space-y-1.5">
                   <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">E-mail de Acesso</label>
                   <input required type="email" className="w-full px-5 py-3.5 bg-zinc-50 border border-zinc-200 rounded-2xl text-sm font-bold outline-none" value={userForm.email} onChange={e => setUserForm({...userForm, email: e.target.value})} />
                 </div>
                 {!editingUser && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Senha Inicial</label>
                      <input required type="password" placeholder="admin" className="w-full px-5 py-3.5 bg-zinc-50 border border-zinc-200 rounded-2xl text-sm font-bold outline-none" value={userForm.password} onChange={e => setUserForm({...userForm, password: e.target.value})} />
                    </div>
                 )}
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Função</label>
                       <select className="w-full px-5 py-3.5 bg-zinc-50 border border-zinc-200 rounded-2xl text-sm font-bold outline-none" value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value as any})}>
                          <option value="user">Recrutador</option>
                          <option value="admin">Administrador</option>
                       </select>
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Unidade</label>
                       <select required className="w-full px-5 py-3.5 bg-zinc-50 border border-zinc-200 rounded-2xl text-sm font-bold outline-none" value={userForm.unit_id} onChange={e => setUserForm({...userForm, unit_id: e.target.value})}>
                          <option value="">Selecione...</option>
                          {units.map(u => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                          ))}
                       </select>
                    </div>
                 </div>
                 <div className="flex gap-3 pt-4">
                    <Button type="button" variant="ghost" onClick={() => { setShowUserModal(false); setEditingUser(null); }} className="flex-1 rounded-2xl">Cancelar</Button>
                    <Button type="submit" className="flex-1 rounded-2xl bg-zinc-900 text-white font-black uppercase text-[10px] tracking-widest">Salvar Acesso</Button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] w-full max-w-sm p-10 shadow-2xl text-center">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-3xl flex items-center justify-center mb-6 mx-auto shadow-sm">
               <Trash2 size={32} />
            </div>
            <h2 className="text-2xl font-bold text-zinc-900 tracking-tight mb-2">Excluir {deleteConfirm.type === 'unit' ? 'Unidade' : 'Acesso'}?</h2>
            <p className="text-sm text-zinc-500 font-medium mb-8">Deseja remover <span className="text-red-600 font-bold">{deleteConfirm.name}</span> permanentemente?</p>
            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => setDeleteConfirm(null)} className="flex-1 rounded-2xl">Cancelar</Button>
              <Button onClick={handleDelete} variant="destructive" className="flex-1 rounded-2xl shadow-lg shadow-red-600/20">Remover</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
