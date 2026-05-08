import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Plus, 
  Building2, 
  Users, 
  Search, 
  Globe, 
  Trash2, 
  UserPlus,
  Key,
  Mail,
  Phone,
  ArrowRight,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface Tenant {
  id: string;
  name: string;
  document: string;
  created_at: string;
}

export default function SuperAdmin() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const [form, setForm] = useState({
    name: '',
    document: '',
    responsible_name: '',
    email: '',
    password: '',
    phone: ''
  });

  const toast = useToast();

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    try {
      const res = await fetch('/api/tenants');
      if (res.ok) {
        const data = await res.json();
        setTenants(data);
      }
    } catch (e) {
      toast.error('Erro ao carregar clientes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/tenants/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        toast.success("Novo cliente provisionado com sucesso!");
        setShowModal(false);
        setForm({ name: '', document: '', responsible_name: '', email: '', password: '', phone: '' });
        fetchTenants();
      } else {
        toast.error("Erro ao provisionar cliente");
      }
    } catch (e) {
      toast.error("Falha na conexão");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Deseja remover o cliente ${name} e todos os seus dados?`)) return;
    try {
      const res = await fetch(`/api/tenants/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success("Cliente removido.");
        fetchTenants();
      }
    } catch (e) {
      toast.error("Erro ao remover");
    }
  };

  const filteredTenants = tenants.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="min-h-screen bg-zinc-50 p-6 lg:p-12 animate-in fade-in duration-500">
      <div className="max-w-7xl mx-auto space-y-12">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 bg-zinc-900 text-white rounded-[40px] p-10 md:p-16 relative overflow-hidden shadow-2xl">
           <div className="absolute top-0 right-0 w-96 h-96 bg-develoi-gold/10 blur-[120px] rounded-full -mr-48 -mt-48" />
           <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                 <div className="p-3 bg-develoi-gold rounded-2xl text-white shadow-xl shadow-develoi-gold/20">
                    <ShieldCheck size={32} />
                 </div>
                 <div>
                    <h1 className="text-3xl font-black uppercase tracking-tighter">Super Admin</h1>
                    <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest leading-none">Controle de Instâncias Aurora AI</p>
                 </div>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Provisionamento de Clientes</h2>
              <p className="text-white/60 text-lg max-w-xl font-medium leading-relaxed">
                Central de comando para gerenciar novos tenants, definir acessos mestres e monitorar a expansão da plataforma.
              </p>
           </div>
           
           <div className="relative z-10">
              <button 
                onClick={() => setShowModal(true)}
                className="group px-10 py-5 bg-develoi-gold text-white font-black uppercase text-xs tracking-[0.3em] rounded-3xl hover:bg-white hover:text-develoi-navy transition-all flex items-center gap-4 shadow-2xl shadow-develoi-gold/10"
              >
                 Novo Cliente <Plus size={20} />
              </button>
           </div>
        </div>

        {/* Search & Stats */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
           <div className="relative w-full md:w-96">
              <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input 
                type="text" 
                placeholder="Buscar clientes..." 
                className="w-full pl-14 pr-6 py-4 bg-white border border-zinc-200 rounded-[28px] text-sm font-bold outline-none focus:ring-4 focus:ring-develoi-navy/5 transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
           </div>
           <div className="flex items-center gap-10 px-8 py-4 bg-white border border-zinc-200 rounded-[28px]">
              <div className="text-center">
                 <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Total de Tenants</p>
                 <p className="text-2xl font-black text-zinc-900">{tenants.length}</p>
              </div>
              <div className="w-px h-10 bg-zinc-100" />
              <div className="text-center">
                 <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Status Global</p>
                 <div className="flex items-center gap-2 justify-center">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <p className="text-sm font-bold text-zinc-900">Online</p>
                 </div>
              </div>
           </div>
        </div>

        {/* Clients Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
           {isLoading ? (
             <div className="col-span-full py-20 text-center">
                <div className="w-12 h-12 border-4 border-develoi-navy border-t-develoi-gold rounded-full animate-spin mx-auto" />
             </div>
           ) : filteredTenants.length === 0 ? (
             <div className="col-span-full p-20 text-center bg-white rounded-[60px] border border-dashed border-zinc-200">
                <Globe size={64} className="mx-auto text-zinc-200 mb-6" />
                <h3 className="text-2xl font-bold text-zinc-400">Nenhum cliente provisionado</h3>
                <p className="text-zinc-500 mt-2">Inicie um novo provisionamento para começar.</p>
             </div>
           ) : (
             filteredTenants.map((client) => (
               <motion.div 
                 layout
                 key={client.id}
                 className="group bg-white border border-zinc-200 rounded-[44px] p-10 hover:shadow-2xl transition-all relative overflow-hidden"
               >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-zinc-50 rounded-full -mr-16 -mt-16 group-hover:bg-develoi-gold/5 transition-colors" />
                  
                  <div className="flex justify-between items-start mb-10">
                     <div className="p-4 bg-zinc-900 text-white rounded-3xl group-hover:bg-develoi-navy transition-colors">
                        <Building2 size={28} />
                     </div>
                     <button 
                       onClick={() => handleDelete(client.id, client.name)}
                       className="p-3 text-zinc-200 hover:text-red-500 transition-colors"
                     >
                        <Trash2 size={20} />
                     </button>
                  </div>

                  <div>
                     <h3 className="text-2xl font-bold text-zinc-900 tracking-tight mb-2">{client.name}</h3>
                     <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                        <Globe size={12} />
                        <span>ID: {client.id}</span>
                     </div>
                  </div>

                  <div className="mt-10 pt-8 border-t border-zinc-100 flex items-center justify-between">
                     <div className="space-y-1">
                        <p className="text-[10px] font-black text-zinc-300 uppercase tracking-widest">Data Ativação</p>
                        <p className="text-sm font-bold text-zinc-600">{new Date(client.created_at).toLocaleDateString()}</p>
                     </div>
                     <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                        Ativo
                     </div>
                  </div>
               </motion.div>
             ))
           )}
        </div>
      </div>

      {/* Provisioning Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setShowModal(false)}
               className="absolute inset-0 bg-zinc-950/60 backdrop-blur-md"
             />
             <motion.div 
               initial={{ opacity: 0, y: 50, scale: 0.95 }}
               animate={{ opacity: 1, y: 0, scale: 1 }}
               exit={{ opacity: 0, y: 50, scale: 0.95 }}
               className="relative w-full max-w-2xl bg-white rounded-[60px] p-10 md:p-16 shadow-2xl overflow-hidden"
             >
                <div className="absolute top-0 right-0 w-64 h-64 bg-develoi-gold/5 blur-[80px] rounded-full -mr-32 -mt-32" />
                
                <div className="flex items-center gap-4 mb-10">
                   <div className="p-3 bg-zinc-900 text-white rounded-2xl">
                      <UserPlus size={24} />
                   </div>
                   <div>
                      <h2 className="text-3xl font-bold tracking-tight">Provisionar Cliente</h2>
                      <p className="text-sm text-zinc-500 font-medium">Crie uma nova instância completa do sistema.</p>
                   </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                   <div className="grid md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Nome da Empresa</label>
                         <input required type="text" placeholder="Ex: Corporação Acme" className="w-full px-6 py-4 bg-zinc-50 border border-zinc-200 rounded-3xl text-sm font-bold outline-none focus:border-develoi-gold transition-colors" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">CNPJ / Documento</label>
                         <input type="text" placeholder="00.000.000/0000-00" className="w-full px-6 py-4 bg-zinc-50 border border-zinc-200 rounded-3xl text-sm font-bold outline-none focus:border-develoi-gold transition-colors" value={form.document} onChange={e => setForm({...form, document: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Responsável Mestre</label>
                         <input required type="text" placeholder="Nome do Admin" className="w-full px-6 py-4 bg-zinc-50 border border-zinc-200 rounded-3xl text-sm font-bold outline-none focus:border-develoi-gold transition-colors" value={form.responsible_name} onChange={e => setForm({...form, responsible_name: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">E-mail de Acesso</label>
                         <input required type="email" placeholder="admin@empresa.com" className="w-full px-6 py-4 bg-zinc-50 border border-zinc-200 rounded-3xl text-sm font-bold outline-none focus:border-develoi-gold transition-colors" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Senha Inicial</label>
                         <input required type="password" placeholder="••••••••" className="w-full px-6 py-4 bg-zinc-50 border border-zinc-200 rounded-3xl text-sm font-bold outline-none focus:border-develoi-gold transition-colors" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Telefone Contato</label>
                         <input type="text" placeholder="(00) 00000-0000" className="w-full px-6 py-4 bg-zinc-50 border border-zinc-200 rounded-3xl text-sm font-bold outline-none focus:border-develoi-gold transition-colors" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
                      </div>
                   </div>

                   <div className="flex gap-4 pt-6">
                      <Button type="button" variant="ghost" onClick={() => setShowModal(false)} className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest rounded-3xl">Cancelar</Button>
                      <Button type="submit" className="flex-1 py-4 bg-zinc-900 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-3xl shadow-xl shadow-zinc-900/10 transition-all hover:translate-y-[-2px]">
                         Finalizar Provisionamento
                      </Button>
                   </div>
                </form>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
