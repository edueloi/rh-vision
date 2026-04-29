import React, { useState } from 'react';
import { 
  Building2, 
  Users, 
  ShieldCheck, 
  Plus, 
  MoreVertical, 
  Search, 
  Filter,
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
  AtSign
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useUnit, FADEL_UNITS, Unit } from '../lib/useUnit';
import { Button } from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';

interface UserProfile {
  id: string;
  name: string;
  username: string;
  email: string; // E-mail corporativo principal
  recovery_email?: string; // E-mail pessoal/recuperação
  role: 'admin' | 'user';
  unit_id: string;
  status: 'active' | 'inactive';
  last_access: string;
}

const MOCK_USERS: UserProfile[] = [
  { id: '1', name: 'Eduardo Eloi', username: 'eduardo.eloi', email: 'edu@fadel.rh', recovery_email: 'edueloi.ee@gmail.com', role: 'admin', unit_id: 'master', status: 'active', last_access: 'Hoje, 10:30' },
  { id: '2', name: 'Ricardo Silva', username: 'ricardo.silva', email: 'ricardo@fadel.rh', role: 'admin', unit_id: 'tatui', status: 'active', last_access: 'Ontem, 16:45' },
  { id: '3', name: 'Ana Oliveira', username: 'ana.oliveira', email: 'ana@fadel.rh', role: 'user', unit_id: 'curitiba', status: 'active', last_access: 'Hoje, 09:12' },
  { id: '4', name: 'Marcos Souza', username: 'marcos.souza', email: 'marcos@fadel.rh', role: 'user', unit_id: 'rio', status: 'inactive', last_access: 'Há 5 dias' },
];

export default function Administration() {
  const { currentUnit, isMaster, units } = useUnit();
  const [activeTab, setActiveTab] = useState<'units' | 'users'>('units');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; type: 'unit' | 'user'; name: string } | null>(null);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [newUnit, setNewUnit] = useState({ name: '', location: '' });
  const [newUser, setNewUser] = useState({ 
    name: '', 
    username: '',
    email: '', 
    recovery_email: '',
    initial_password: '',
    role: 'user' as 'admin' | 'user', 
    unit_id: '' 
  });

  const toast = useToast();

  const handleDelete = () => {
    if (!deleteConfirm) return;
    
    // Simulação de exclusão
    toast.success(`${deleteConfirm.type === 'unit' ? 'Unidade' : 'Acesso'} excluído com sucesso!`);
    setDeleteConfirm(null);
  };

  // Helper to format username (no spaces, lowercase)
  const formatUsername = (val: string) => {
    return val.toLowerCase().replace(/\s+/g, '.');
  };

  // Initialize newUser unit_id when modal opens
  const openUserModal = () => {
    setNewUser(prev => ({ ...prev, unit_id: isMaster ? 'master' : currentUnit.id }));
    setShowUserModal(true);
  };

  const handleCreateUnit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUnit) {
      toast.success(`Unidade ${newUnit.name} atualizada com sucesso!`);
    } else {
      toast.success(`Unidade ${newUnit.name} cadastrada com sucesso!`);
    }
    setShowUnitModal(false);
    setNewUnit({ name: '', location: '' });
    setEditingUnit(null);
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      toast.success(`Acesso de ${newUser.name} atualizado com sucesso!`);
    } else {
      toast.success(`Acesso de ${newUser.name} criado com sucesso!`);
    }
    setShowUserModal(false);
    setEditingUser(null);
    setNewUser({ 
      name: '', 
      username: '',
      email: '', 
      recovery_email: '',
      initial_password: '',
      role: 'user', 
      unit_id: '' 
    });
  };

  const openEditUser = (user: UserProfile) => {
    setEditingUser(user);
    setNewUser({
      name: user.name,
      username: user.username,
      email: user.email,
      recovery_email: user.recovery_email || '',
      initial_password: '••••••••', // Placeholder
      role: user.role,
      unit_id: user.unit_id
    });
    setShowUserModal(true);
  };

  const openEditUnit = (unit: Unit) => {
    setEditingUnit(unit);
    setNewUnit({
      name: unit.name,
      location: unit.location
    });
    setShowUnitModal(true);
  };

  // Filtragem baseada na unidade atual
  const filteredUnits = isMaster 
    ? units.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : units.filter(u => u.id === currentUnit.id && u.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const filteredUsers = isMaster
    ? MOCK_USERS.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.email.toLowerCase().includes(searchQuery.toLowerCase()))
    : MOCK_USERS.filter(u => u.unit_id === currentUnit.id && (u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.email.toLowerCase().includes(searchQuery.toLowerCase())));

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-widest rounded-md">Configurações</span>
            <div className="w-1 h-1 bg-zinc-300 rounded-full" />
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Painel de Controle</span>
          </div>
          <h1 className="text-4xl font-black text-zinc-900 tracking-tight">Administração</h1>
          <p className="text-zinc-500 font-medium mt-1">Gerencie unidades, acessos e permissões da plataforma.</p>
        </div>

        <div className="flex items-center gap-3">
          {activeTab === 'units' ? (
            <Button 
              onClick={() => setShowUnitModal(true)}
              className="rounded-2xl" 
              disabled={!isMaster}
              title={!isMaster ? "Apenas Administradores Master podem criar unidades" : ""}
            >
              <Plus size={18} className="mr-2" />
              Nova Unidade
            </Button>
          ) : (
            <Button 
              onClick={openUserModal}
              className="rounded-2xl"
            >
              <UserPlus size={18} className="mr-2" />
              Novo Acesso
            </Button>
          )}
        </div>
      </div>

      {/* Tabs Layout */}
      <div className="flex gap-1 p-1 bg-zinc-100/80 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('units')}
          className={cn(
            "flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
            activeTab === 'units' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
          )}
        >
          <Building2 size={14} />
          Unidades
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={cn(
            "flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
            activeTab === 'users' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
          )}
        >
          <Users size={14} />
          Acessos & Permissões
        </button>
      </div>

      {/* Search & Stats */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input 
            type="text" 
            placeholder={activeTab === 'units' ? "Buscar por unidade..." : "Buscar por nome ou e-mail..."}
            className="w-full pl-12 pr-4 py-3 bg-white border border-zinc-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-amber-400/20 transition-all shadow-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-4 text-xs font-bold text-zinc-400 bg-zinc-100/50 px-4 py-2 rounded-xl">
           <div className="flex items-center gap-2 border-r border-zinc-200 pr-4">
              <span className="text-zinc-900">{activeTab === 'units' ? filteredUnits.length : filteredUsers.length}</span>
              <span>Registrados na {isMaster ? 'Rede' : 'Unidade'}</span>
           </div>
           <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
              <span className="text-zinc-900">{activeTab === 'units' ? filteredUnits.length : filteredUsers.filter(u => u.status === 'active').length}</span>
              <span>Ativos</span>
           </div>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'units' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUnits.map((unit) => (
            <div 
              key={unit.id}
              className="group bg-white border border-zinc-200 rounded-[32px] p-8 hover:shadow-xl hover:shadow-zinc-200/50 transition-all relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-400/5 rounded-full -mr-12 -mt-12 transition-all group-hover:bg-amber-400/10" />
              
              <div className="flex justify-between items-start mb-6">
                <div className={cn(
                  "p-3 rounded-2xl",
                  unit.id === 'master' ? "bg-zinc-900 text-amber-400" : "bg-amber-50 text-amber-600"
                )}>
                  {unit.id === 'master' ? <Globe size={24} /> : <Building2 size={24} />}
                </div>
                <div className="flex items-center gap-1">
                   <button 
                    onClick={() => openEditUnit(unit)}
                    className={cn(
                      "p-2 text-zinc-300 hover:text-zinc-900 transition-colors",
                      unit.id === 'master' && "hidden"
                    )}
                   >
                     <Edit size={18} />
                   </button>
                   <button 
                    onClick={() => setDeleteConfirm({ id: unit.id, type: 'unit', name: unit.name })}
                    className={cn(
                      "p-2 text-zinc-300 hover:text-red-500 transition-colors",
                      unit.id === 'master' && "hidden"
                    )}
                   >
                     <Trash2 size={18} />
                   </button>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-black text-zinc-900 tracking-tight">{unit.name}</h3>
                  {unit.id === 'master' && <BadgeCheck size={16} className="text-blue-500" />}
                </div>
                <div className="flex items-center gap-1.5 text-zinc-400 text-xs font-bold mb-6">
                  <MapPin size={12} />
                  <span>{unit.location}</span>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-6 border-t border-zinc-50">
                   <div>
                      <p className="text-[8px] font-black text-zinc-300 uppercase tracking-widest mb-1">Candidatos</p>
                      <p className="text-sm font-black text-zinc-900">1.2k</p>
                   </div>
                   <div>
                      <p className="text-[8px] font-black text-zinc-300 uppercase tracking-widest mb-1">Usuários</p>
                      <p className="text-sm font-black text-zinc-900">
                        {MOCK_USERS.filter(u => u.unit_id === unit.id).length}
                      </p>
                   </div>
                </div>
              </div>

              <div className="mt-8 flex items-center justify-between">
                <div className="flex -space-x-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-zinc-100 flex items-center justify-center text-[10px] font-black text-zinc-400 overflow-hidden">
                       <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${unit.id}${i}`} alt="user" />
                    </div>
                  ))}
                </div>
                <button className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-amber-600 transition-colors">
                  Gerenciar
                  <ArrowRight size={12} />
                </button>
              </div>
            </div>
          ))}

          {isMaster && (
            <button 
              onClick={() => setShowUnitModal(true)}
              className="border-2 border-dashed border-zinc-200 rounded-[32px] p-8 flex flex-col items-center justify-center gap-4 text-zinc-400 hover:border-amber-400 hover:text-amber-600 transition-all hover:bg-amber-50/30"
            >
               <div className="p-4 bg-zinc-50 rounded-2xl">
                 <Plus size={32} />
               </div>
               <div className="text-center">
                  <p className="text-sm font-black uppercase tracking-widest">Adicionar Unidade</p>
                  <p className="text-xs font-medium mt-1">Expanda sua rede Fadel</p>
               </div>
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white border border-zinc-200 rounded-[40px] overflow-hidden shadow-sm">
           <div className="overflow-x-auto">
              <table className="w-full">
                 <thead>
                    <tr className="text-left border-b border-zinc-100">
                       <th className="px-8 py-5 text-[9px] font-black text-zinc-400 uppercase tracking-widest">Colaborador</th>
                       <th className="px-8 py-5 text-[9px] font-black text-zinc-400 uppercase tracking-widest">Nível de Acesso</th>
                       <th className="px-8 py-5 text-[9px] font-black text-zinc-400 uppercase tracking-widest">Unidade</th>
                       <th className="px-8 py-5 text-[9px] font-black text-zinc-400 uppercase tracking-widest">Status</th>
                       <th className="px-8 py-5 text-[9px] font-black text-zinc-400 uppercase tracking-widest text-right">Ações</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-zinc-50">
                    {filteredUsers.map((user) => (
                       <tr key={user.id} className="hover:bg-zinc-50/50 transition-colors group">
                          <td className="px-8 py-5">
                             <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-2xl bg-zinc-100 flex items-center justify-center text-xs font-black text-zinc-600 overflow-hidden shadow-sm border border-zinc-200 group-hover:border-amber-300 transition-all">
                                   <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} alt="avatar" />
                                </div>
                                <div>
                                   <p className="text-sm font-black text-zinc-900 tracking-tight">{user.name}</p>
                                   <div className="flex flex-col">
                                      <div className="flex items-center gap-1.5 text-amber-600 text-[10px] font-black uppercase tracking-widest mt-0.5">
                                         <AtSign size={10} />
                                         {user.username}
                                         <span className="ml-1 px-1.5 py-0.5 bg-amber-50 text-[8px] rounded border border-amber-100">Login</span>
                                      </div>
                                      <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] font-bold mt-0.5">
                                         <Mail size={10} />
                                         {user.recovery_email || user.email}
                                         <span className="ml-1 px-1.5 py-0.5 bg-zinc-50 text-[8px] rounded border border-zinc-100 uppercase tracking-tighter">Recuperação</span>
                                      </div>
                                   </div>
                                </div>
                             </div>
                          </td>
                          <td className="px-8 py-5">
                             <div className="flex items-center gap-2">
                                {user.role === 'admin' ? (
                                   <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-700 rounded-lg text-[9px] font-black uppercase tracking-widest">
                                      <ShieldCheck size={12} />
                                      Administrador
                                   </div>
                                ) : (
                                   <div className="flex items-center gap-1.5 px-3 py-1 bg-zinc-100 text-zinc-600 rounded-lg text-[9px] font-black uppercase tracking-widest">
                                      <Lock size={12} />
                                      Consulta
                                   </div>
                                )}
                             </div>
                          </td>
                          <td className="px-8 py-5">
                             <div className="flex items-center gap-2 text-xs font-bold text-zinc-600">
                                <Building2 size={14} className="text-zinc-400" />
                                {units.find(u => u.id === user.unit_id)?.name}
                             </div>
                          </td>
                          <td className="px-8 py-5">
                             <div className="flex flex-col gap-1">
                                <div className={cn(
                                   "w-fit px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest",
                                   user.status === 'active' ? "bg-green-100 text-green-700" : "bg-zinc-100 text-zinc-400"
                                )}>
                                   {user.status === 'active' ? 'Ativo' : 'Inativo'}
                                </div>
                                <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">Visto: {user.last_access}</p>
                             </div>
                          </td>
                          <td className="px-8 py-5 text-right">
                             <div className="flex items-center justify-end gap-2">
                                <button 
                                  title="Resetar Senha"
                                  onClick={() => setShowResetModal(user.id)}
                                  className="p-2 text-zinc-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all"
                                >
                                   <RefreshCw size={16} />
                                </button>
                                <button 
                                  title="Editar"
                                  onClick={() => openEditUser(user)}
                                  className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl transition-all"
                                >
                                   <Edit size={16} />
                                </button>
                                <button 
                                  title="Excluir"
                                  onClick={() => setDeleteConfirm({ id: user.id, type: 'user', name: user.name })}
                                  className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                >
                                   <Trash2 size={16} />
                                </button>
                             </div>
                          </td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>

           {filteredUsers.length === 0 && (
             <div className="p-20 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-zinc-50 rounded-3xl flex items-center justify-center text-zinc-300 mb-4">
                   <Users size={32} />
                </div>
                <h3 className="text-lg font-black text-zinc-900 tracking-tight">Nenhum acesso encontrado</h3>
                <p className="text-sm text-zinc-500 font-medium mt-1 max-w-xs mx-auto">
                   Tente ajustar sua busca ou mude os filtros para encontrar o que procura.
                </p>
             </div>
           )}
        </div>
      )}

      {/* Permissions Disclaimer */}
      {!isMaster && (
        <div className="p-6 bg-amber-50 border border-amber-100 rounded-[32px] flex items-start gap-4">
           <div className="p-2 bg-amber-400 text-amber-950 rounded-xl">
              <AlertCircle size={20} />
           </div>
           <div>
              <h4 className="text-sm font-black text-amber-900 uppercase tracking-widest">Restrição de Unidade</h4>
              <p className="text-xs font-bold text-amber-800/80 mt-1 leading-relaxed">
                 Como você está na unidade <span className="font-black underline">{currentUnit.name}</span>, você só tem permissão para visualizar e gerenciar acessos vinculados exclusivamente a esta localidade. A criação de novas unidades e o gerenciamento global são exclusivos da <span className="font-black">Unidade Master</span>.
              </p>
           </div>
        </div>
      )}

      {/* Modals */}
      {showUnitModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95 duration-300">
            <h2 className="text-2xl font-black text-zinc-900 tracking-tight mb-2">
              {editingUnit ? 'Editar Unidade' : 'Cadastrar Unidade'}
            </h2>
            <p className="text-sm text-zinc-500 font-medium mb-8">
              {editingUnit ? `Atualize as informações de ${editingUnit.name}.` : 'Crie uma nova localidade para a rede Fadel.'}
            </p>
            
            <form onSubmit={handleCreateUnit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Nome da Unidade</label>
                <input 
                  required
                  type="text" 
                  placeholder="Ex: Fadel - Sorocaba"
                  className="w-full px-5 py-3.5 bg-zinc-50 border border-zinc-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-amber-400 transition-all"
                  value={newUnit.name}
                  onChange={e => setNewUnit({...newUnit, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Localização (Cidade, UF)</label>
                <input 
                  required
                  type="text" 
                  placeholder="Ex: Sorocaba, SP"
                  className="w-full px-5 py-3.5 bg-zinc-50 border border-zinc-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-amber-400 transition-all"
                  value={newUnit.location}
                  onChange={e => setNewUnit({...newUnit, location: e.target.value})}
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button type="button" variant="ghost" onClick={() => { setShowUnitModal(false); setEditingUnit(null); }} className="flex-1 rounded-2xl">Cancelar</Button>
                <Button type="submit" className="flex-1 rounded-2xl group">
                  {editingUnit ? 'Salvar Alterações' : 'Criar Unidade'}
                  <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showUserModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95 duration-300">
            <h2 className="text-2xl font-black text-zinc-900 tracking-tight mb-2">
              {editingUser ? 'Editar Acesso' : 'Criar Novo Acesso'}
            </h2>
            <p className="text-sm text-zinc-500 font-medium mb-8">
              {editingUser ? `Gerencie as permissões de ${editingUser.name}.` : 'Defina quem pode acessar os dados da unidade.'}
            </p>
            
            <form onSubmit={handleCreateUser} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Nome Completo</label>
                <input 
                  required
                  type="text" 
                  placeholder="Nome do colaborador"
                  className="w-full px-5 py-3.5 bg-zinc-50 border border-zinc-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-amber-400 transition-all"
                  value={newUser.name}
                  onChange={e => {
                    const name = e.target.value;
                    setNewUser({
                      ...newUser, 
                      name,
                      username: formatUsername(name)
                    });
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-amber-600 ml-1">Login (Acesso eduardo.santos)</label>
                  <input 
                    type="text" 
                    placeholder="exemplo.login"
                    className="w-full px-5 py-3.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl text-sm font-black outline-none cursor-not-allowed"
                    value={newUser.username}
                    readOnly
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">E-mail Corporativo</label>
                  <input 
                    required
                    type="email" 
                    placeholder="colaborador@fadel.rh"
                    className="w-full px-5 py-3.5 bg-zinc-50 border border-zinc-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-amber-400 transition-all shadow-sm"
                    value={newUser.email}
                    onChange={e => setNewUser({...newUser, email: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">E-mail de Recuperação</label>
                  <input 
                    type="email" 
                    placeholder="pessoal@gmail.com"
                    className="w-full px-5 py-3.5 bg-zinc-50 border border-zinc-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-amber-400 transition-all"
                    value={newUser.recovery_email}
                    onChange={e => setNewUser({...newUser, recovery_email: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Senha Inicial</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input 
                      required
                      type="password" 
                      placeholder="Senha forte"
                      className="w-full pl-12 pr-5 py-3.5 bg-zinc-50 border border-zinc-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-amber-400 transition-all"
                      value={newUser.initial_password}
                      onChange={e => setNewUser({...newUser, initial_password: e.target.value})}
                    />
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Nível</label>
                  <select 
                    className="w-full px-5 py-3.5 bg-zinc-50 border border-zinc-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-amber-400 transition-all appearance-none"
                    value={newUser.role}
                    onChange={e => setNewUser({...newUser, role: e.target.value as 'admin' | 'user'})}
                  >
                    <option value="user">Consulta</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Unidade</label>
                  <select 
                    disabled={!isMaster}
                    className="w-full px-5 py-3.5 bg-zinc-50 border border-zinc-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-amber-400 transition-all appearance-none disabled:opacity-60"
                    value={newUser.unit_id}
                    onChange={e => setNewUser({...newUser, unit_id: e.target.value})}
                  >
                    {units.map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button type="button" variant="ghost" onClick={() => { setShowUserModal(false); setEditingUser(null); }} className="flex-1 rounded-2xl">Cancelar</Button>
                <Button type="submit" className="flex-1 rounded-2xl group">
                  {editingUser ? 'Salvar Alterações' : 'Conceder Acesso'}
                  <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showResetModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] w-full max-w-sm p-8 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-3xl flex items-center justify-center mb-6">
               <RefreshCw size={32} />
            </div>
            <h2 className="text-2xl font-black text-zinc-900 tracking-tight mb-2">Resetar Senha</h2>
            <p className="text-sm text-zinc-500 font-medium mb-8">
              Defina uma nova senha temporária para o acesso de <span className="text-zinc-900 font-black">{filteredUsers.find(u => u.id === showResetModal)?.name}</span>.
            </p>
            
            <form onSubmit={(e) => { e.preventDefault(); setShowResetModal(null); }} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Nova Senha Temporária</label>
                <div className="relative">
                  <Key size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input 
                    required
                    type="password" 
                    placeholder="Digite a nova senha"
                    className="w-full pl-12 pr-5 py-3.5 bg-zinc-50 border border-zinc-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-amber-400 transition-all"
                  />
                </div>
              </div>
              
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="ghost" onClick={() => setShowResetModal(null)} className="flex-1 rounded-2xl">Cancelar</Button>
                <Button type="submit" className="flex-1 rounded-2xl">Confirmar</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] w-full max-w-sm p-8 shadow-2xl animate-in zoom-in-95 duration-300 text-center">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-3xl flex items-center justify-center mb-6 mx-auto">
               <Trash2 size={32} />
            </div>
            <h2 className="text-2xl font-black text-zinc-900 tracking-tight mb-2">Excluir {deleteConfirm.type === 'unit' ? 'Unidade' : 'Acesso'}?</h2>
            <p className="text-sm text-zinc-500 font-medium mb-8">
              Você tem certeza que deseja excluir <span className="text-zinc-900 font-black">{deleteConfirm.name}</span>? Esta ação não pode ser desfeita.
            </p>
            
            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => setDeleteConfirm(null)} className="flex-1 rounded-2xl">Cancelar</Button>
              <Button onClick={handleDelete} variant="destructive" className="flex-1 rounded-2xl bg-red-600 hover:bg-red-700">Confirmar Exclusão</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
