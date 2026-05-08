import React, { useState, useEffect } from "react";
import { 
  Users, 
  Briefcase, 
  LayoutDashboard, 
  Settings, 
  FileUp, 
  Menu, 
  X,
  Bell,
  Search,
  ChevronRight,
  Building2,
  ChevronDown,
  Globe,
  Brain,
  ShieldCheck
} from "lucide-react";
import { AnimatePresence } from "motion/react";
import { BrowserRouter } from "react-router-dom";
import { ToastProvider, useToast } from "./components/ui/Toast";
import Dashboard from "./pages/Dashboard";
import Jobs from "./pages/Jobs";
import Candidates from "./pages/Candidates";
import HRTools from "./pages/HRTools";
import Administration from "./pages/Administration";
import ImportResumes from "./pages/ImportResumes";
import PublicPortal from "./pages/PublicPortal";
import PublicToolResponse from "./pages/PublicToolResponse";
import AuroraAI from "./pages/AuroraAI";
import Login from "./pages/Login";
import Welcome from "./pages/Welcome";
import SuperAdmin from "./pages/SuperAdmin";
import { cn } from "./lib/utils";
import { useUnit, Unit } from "./lib/useUnit";

// ── App Core ─────────────────────────────────────────────────────────────────

function AppContent() {
  const [user, setUser] = useState<any>(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unitMenuOpen, setUnitMenuOpen] = useState(false);
  const { currentUnit, changeUnit, isMaster, units } = useUnit();
  const toast = useToast();

  const isSuperAdmin = user?.id === 'admin-root';

  useEffect(() => {
    const storedUser = localStorage.getItem('auth_user');
    const hasSeenWelcome = localStorage.getItem('has_seen_welcome');

    if (storedUser) {
      setUser(JSON.parse(storedUser));
      if (!hasSeenWelcome) {
        setShowWelcome(true);
      }
    }
    setIsInitializing(false);

    const handleSwitchTab = (e: any) => {
      if (typeof e.detail === 'string') {
        setActiveTab(e.detail);
      }
    };
    window.addEventListener('switchTab', handleSwitchTab);
    return () => window.removeEventListener('switchTab', handleSwitchTab);
  }, []);

  const isPortalMode = new URLSearchParams(window.location.search).get('mode') === 'portal';
  const isToolMode = window.location.pathname.startsWith('/public/tools/');

  if (isPortalMode) {
    return <PublicPortal />;
  }

  if (isToolMode) {
    return <PublicToolResponse />;
  }

  if (isInitializing) return null;

  if (!user) {
    return <Login onLogin={(u) => {
      setUser(u);
      if (u.id === 'admin-root') {
        setActiveTab('superadmin');
      }
      const hasWelcome = localStorage.getItem('has_seen_welcome');
      if (!hasWelcome) setShowWelcome(true);
    }} />;
  }

  if (showWelcome) {
    return <Welcome onComplete={() => {
      setShowWelcome(false);
      localStorage.setItem('has_seen_welcome', 'true');
    }} />;
  }

  const MENU_ITEMS = isSuperAdmin ? [
    { id: "superadmin", label: "Master Control", icon: ShieldCheck },
  ] : [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "nexusai",    label: "Aurora AI",  icon: Brain },
    { id: "jobs",      label: "Vagas",     icon: Briefcase },
    { id: "candidates", label: "Candidatos", icon: Users },
    { id: "import",     label: "Importar CVs", icon: FileUp },
    { id: "tools",      label: "Ferramentas", icon: Settings },
    ...(user?.role === 'admin' ? [{ id: "admin", label: "Administração", icon: ShieldCheck }] : []),
  ];

  const handleUnitChange = (unit: Unit) => {
    changeUnit(unit);
    setUnitMenuOpen(false);
    toast.info(`Alternado para unidade: ${unit.name}`);
  };

  const renderContent = () => {
    switch (activeTab) {
      case "superadmin": return <SuperAdmin />;
      case "dashboard": return <Dashboard />;
      case "nexusai":    return <AuroraAI />;
      case "jobs":      return <Jobs />;
      case "candidates": return <Candidates />;
      case "import":     return <ImportResumes />;
      case "tools":      return <HRTools />;
      case "admin":      return <Administration />;
      default:           return <Dashboard />;
    }
  };

  const activeLabel = MENU_ITEMS.find(i => i.id === activeTab)?.label;

  return (
    <div className="min-h-screen bg-zinc-50/50 flex">
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-develoi-navy/40 z-[40] lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={cn(
        "fixed inset-y-0 left-0 w-72 bg-white border-r border-zinc-200 z-[50] transition-transform duration-300 lg:sticky lg:translate-x-0 h-screen overflow-y-auto",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-8 h-full flex flex-col">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-develoi-navy rounded-2xl flex items-center justify-center text-white shadow-lg shadow-develoi-navy/20">
              <Brain size={22} strokeWidth={3} className="text-develoi-gold" />
            </div>
            <div>
              <h1 className="text-base font-bold text-develoi-navy tracking-tight leading-none uppercase">Develoi</h1>
              <p className="text-[9px] text-develoi-gold font-bold uppercase tracking-widest mt-0.5">Recruitment Hub</p>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden ml-auto p-2 text-zinc-400">
              <X size={20} />
            </button>
          </div>

          {!isSuperAdmin && (
            <div className="mb-8">
              <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-2 px-1 opacity-70">Unidade</p>
              <div className="relative">
                <button 
                  onClick={() => setUnitMenuOpen(!unitMenuOpen)}
                  className="w-full flex items-center justify-between p-3 bg-zinc-50/50 border border-zinc-100 rounded-2xl hover:border-develoi-gold transition-all font-bold text-xs text-zinc-700"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <Globe size={14} className="text-amber-500 shrink-0" />
                    <span className="truncate">{currentUnit.name}</span>
                  </div>
                  <ChevronDown size={14} className={cn("text-zinc-400 transition-transform", unitMenuOpen && "rotate-180")} />
                </button>
                
                <AnimatePresence>
                  {unitMenuOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-zinc-200 rounded-2xl shadow-xl z-10 overflow-hidden py-1">
                      {units.map((u) => (
                        <button 
                          key={u.id}
                          onClick={() => handleUnitChange(u)}
                          className={cn(
                            "w-full text-left px-4 py-2.5 text-xs font-bold hover:bg-zinc-50 transition-colors",
                            currentUnit.id === u.id ? "text-develoi-gold bg-amber-50/50" : "text-zinc-600"
                          )}
                        >
                          {u.name}
                        </button>
                      ))}
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}

          <nav className="flex-1 space-y-1.5">
            {MENU_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all duration-200 group text-left",
                    active 
                      ? "bg-develoi-navy text-white font-bold shadow-lg shadow-develoi-navy/10" 
                      : "text-zinc-500 hover:bg-zinc-50 font-medium"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon size={18} strokeWidth={active ? 2.5 : 2} className={cn("transition-colors", active ? "text-white" : "text-zinc-400 group-hover:text-zinc-900 focus:text-develoi-gold")} />
                    <span className="text-[10px] uppercase tracking-wider">{item.label}</span>
                  </div>
                  {active && <ChevronRight size={14} strokeWidth={3} className="text-white/40" />}
                </button>
              );
            })}
          </nav>

          <div className="mt-auto pt-8">
            <div className="bg-develoi-navy rounded-3xl p-5 text-white overflow-hidden relative border border-white/5">
              <div className="absolute top-0 right-0 w-24 h-24 bg-develoi-gold/10 rounded-full -mr-12 -mt-12" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-develoi-gold mb-1">Acesso Master</p>
              <p className="text-xs font-medium leading-relaxed mb-4 opacity-80">Você tem visão total de todas as unidades Develoi.</p>
              <button className="w-full py-2 bg-white text-develoi-navy text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-develoi-gold hover:text-white transition-colors cursor-pointer">
                Gerenciar Master
              </button>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 lg:h-20 bg-white border-b border-zinc-200 px-4 sm:px-10 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 text-zinc-500 hover:bg-zinc-100 rounded-xl">
              <Menu size={20} />
            </button>
            <div className="hidden sm:flex items-center gap-2 text-[10px] font-medium text-zinc-500 uppercase tracking-widest">
              {!isSuperAdmin && (
                <>
                  <Building2 size={10} className="text-develoi-gold" />
                  <span className="text-develoi-navy/60">{currentUnit.name}</span>
                  <ChevronRight size={10} strokeWidth={2} className="text-zinc-300" />
                </>
              )}
              <span className="text-develoi-navy font-bold">{activeLabel}</span>
            </div>
          </div>

            <div className="flex items-center gap-3 md:gap-6">
              <div className="relative hidden lg:block">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input 
                  type="text" 
                  placeholder="Pesquisar..." 
                  className="pl-9 pr-4 py-2 bg-zinc-100 border-none rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-develoi-gold/20 w-48 transition-all"
                />
              </div>

            <div className="flex items-center gap-4">
              <button className="relative p-2 text-zinc-400 hover:text-zinc-900 transition-colors">
                <Bell size={20} />
                <span className="absolute top-2 right-2 w-2 h-2 bg-develoi-gold rounded-full border-2 border-white" />
              </button>
              <div className="flex items-center gap-3 pl-4 border-l border-zinc-200">
                <div className="text-right hidden sm:block">
                  <p className="text-[10px] font-bold text-zinc-900 leading-none">{user?.full_name || 'Usuário'}</p>
                  <p className="text-[8px] font-medium text-zinc-400 uppercase tracking-widest mt-1">{user?.role === 'admin' ? 'Admin Master' : user?.unit_name || 'Recrutador'}</p>
                </div>
                <div 
                  onClick={() => {
                    localStorage.removeItem('auth_user');
                    setUser(null);
                  }}
                  className="w-10 h-10 rounded-2xl bg-zinc-100 border-2 border-white shadow-sm flex items-center justify-center font-black text-zinc-600 text-xs overflow-hidden cursor-pointer hover:border-red-100 transition-all group"
                >
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.full_name}`} alt="avatar" />
                  <div className="absolute inset-0 bg-red-500/0 group-hover:bg-red-500/10 transition-colors" />
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="p-6 sm:p-10 max-w-7xl w-full mx-auto">
          {isSuperAdmin && (
             <div className="mb-6 p-4 bg-develoi-navy text-white rounded-3xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <div className="p-2 bg-develoi-gold text-white rounded-xl">
                      <ShieldCheck size={16} />
                   </div>
                   <p className="text-xs font-bold uppercase tracking-widest">
                      Modo Root Admin: Provisionamento de Novas Instâncias
                   </p>
                </div>
             </div>
          )}

          {!isSuperAdmin && isMaster && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-100/50 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-develoi-gold text-white rounded-xl shrink-0 shadow-sm shadow-develoi-gold/20">
                  <Globe size={16} />
                </div>
                <p className="text-[10px] font-medium text-amber-900 leading-relaxed uppercase tracking-wider">
                  Visão Master: Você está visualizando dados consolidados de <span className="font-bold text-develoi-navy">todas as unidades Develoi</span>.
                </p>
              </div>
              <button className="text-[10px] font-bold uppercase tracking-wider text-develoi-gold hover:text-develoi-navy transition-colors whitespace-nowrap">Ver Relatórios</button>
            </div>
          )}

          {!isMaster && (
            <div className="mb-6 p-4 bg-develoi-navy text-white rounded-3xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-develoi-gold text-white rounded-xl">
                  <Building2 size={16} />
                </div>
                <p className="text-xs font-bold">
                  Sessão Ativa: <span className="text-develoi-gold font-black">{currentUnit.name}</span>. Você só vê candidatos e vagas desta localidade.
                </p>
              </div>
            </div>
          )}

          {renderContent()}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </BrowserRouter>
  );
}
