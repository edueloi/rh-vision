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
import NexusAI from "./pages/NexusAI";
import { cn } from "./lib/utils";
import { useUnit, Unit } from "./lib/useUnit";

// ── App Core ─────────────────────────────────────────────────────────────────

function AppContent() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unitMenuOpen, setUnitMenuOpen] = useState(false);
  const { currentUnit, changeUnit, isMaster, units } = useUnit();
  const toast = useToast();

  const isPortalMode = new URLSearchParams(window.location.search).get('mode') === 'portal';
  const isToolMode = window.location.pathname.startsWith('/public/tools/');

  if (isPortalMode) {
    return <PublicPortal />;
  }

  if (isToolMode) {
    return <PublicToolResponse />;
  }

  const MENU_ITEMS = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "nexusai",    label: "Nexus AI",  icon: Brain },
    { id: "jobs",      label: "Vagas",     icon: Briefcase },
    { id: "candidates", label: "Candidatos", icon: Users },
    { id: "import",     label: "Importar CVs", icon: FileUp },
    { id: "tools",      label: "Ferramentas", icon: Settings },
    { id: "admin",      label: "Administração", icon: ShieldCheck },
  ];

  const handleUnitChange = (unit: Unit) => {
    changeUnit(unit);
    setUnitMenuOpen(false);
    toast.info(`Alternado para unidade: ${unit.name}`);
  };

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard": return <Dashboard />;
      case "nexusai":    return <NexusAI />;
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
      {/* Sidebar Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-[40] lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 w-72 bg-white border-r border-zinc-200 z-[50] transition-transform duration-300 lg:sticky lg:translate-x-0 h-screen overflow-y-auto",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-8 h-full flex flex-col">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-fadel-navy rounded-2xl flex items-center justify-center text-white shadow-lg shadow-fadel-navy/20">
              <Building2 size={22} strokeWidth={3} />
            </div>
            <div>
              <h1 className="text-lg font-black text-zinc-900 tracking-tighter leading-none">FADEL RH</h1>
              <p className="text-[10px] text-fadel-red font-black uppercase tracking-widest mt-0.5">Recrutamento Central</p>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden ml-auto p-2 text-zinc-400">
              <X size={20} />
            </button>
          </div>

          {/* Unit Switcher Sidebar */}
          <div className="mb-8">
            <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-2 px-1">Seletor de Unidade</p>
            <div className="relative">
              <button 
                onClick={() => setUnitMenuOpen(!unitMenuOpen)}
                className="w-full flex items-center justify-between p-3 bg-zinc-50 border border-zinc-100 rounded-2xl hover:border-amber-300 transition-all font-bold text-xs text-zinc-700"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <Globe size={14} className="text-amber-500 shrink-0" />
                  <span className="truncate">{currentUnit.name}</span>
                </div>
                <ChevronDown size={14} className={cn("transition-transform", unitMenuOpen && "rotate-180")} />
              </button>
              
              {unitMenuOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-zinc-200 rounded-2xl shadow-xl z-10 overflow-hidden py-1">
                  {units.map(u => (
                    <button 
                      key={u.id}
                      onClick={() => handleUnitChange(u)}
                      className={cn(
                        "w-full text-left px-4 py-2.5 text-xs font-bold hover:bg-zinc-50 transition-colors",
                        currentUnit.id === u.id ? "text-fadel-red bg-red-50/50" : "text-zinc-600"
                      )}
                    >
                      {u.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <nav className="flex-1 space-y-1.5">
            {MENU_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all duration-200 group text-left",
                    active 
                      ? "bg-fadel-navy text-white font-black shadow-lg shadow-fadel-navy/10" 
                      : "text-zinc-500 hover:bg-zinc-50 font-bold"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon size={18} strokeWidth={active ? 2.5 : 2} className={cn("transition-colors", active ? "text-white" : "text-zinc-400 group-hover:text-zinc-900")} />
                    <span className="text-[11px] uppercase tracking-widest">{item.label}</span>
                  </div>
                  {active && <ChevronRight size={14} strokeWidth={3} className="text-white/40" />}
                </button>
              );
            })}
          </nav>

          <div className="mt-auto pt-8">
            <div className="bg-fadel-navy rounded-3xl p-5 text-white overflow-hidden relative">
              <div className="absolute top-0 right-0 w-24 h-24 bg-fadel-red/20 rounded-full -mr-12 -mt-12" />
              <p className="text-[10px] font-black uppercase tracking-widest text-fadel-red mb-1">Acesso Master</p>
              <p className="text-xs font-bold leading-relaxed mb-4 opacity-80">Você tem visão total de todas as unidades Fadel.</p>
              <button className="w-full py-2 bg-white text-fadel-navy text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-fadel-red hover:text-white transition-colors">
                Gerenciar Master
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-20 bg-white border-b border-zinc-200 px-6 sm:px-10 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 -ml-2 text-zinc-400">
              <Menu size={24} />
            </button>
            <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-widest">
              <Building2 size={12} className="text-amber-500" />
              <span className="text-zinc-900">{currentUnit.name}</span>
              <ChevronRight size={12} strokeWidth={3} className="text-zinc-200" />
              <span className="text-zinc-900">{activeLabel}</span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative hidden md:block">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input 
                type="text" 
                placeholder="Pesquisar na unidade..." 
                className="pl-10 pr-4 py-2 bg-zinc-100 border-none rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-amber-400/20 w-48 lg:w-64 transition-all"
              />
            </div>

            <div className="flex items-center gap-4">
              <button className="relative p-2 text-zinc-400 hover:text-zinc-900 transition-colors">
                <Bell size={20} />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
              </button>
              <div className="flex items-center gap-3 pl-4 border-l border-zinc-200">
                <div className="text-right hidden sm:block">
                  <p className="text-[10px] font-black text-zinc-900 leading-none">Eduardo Eloi</p>
                   <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Admin Master</p>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-zinc-100 border-2 border-white shadow-sm flex items-center justify-center font-black text-zinc-600 text-xs overflow-hidden cursor-pointer hover:border-amber-400 transition-all">
                  <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="avatar" />
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Area */}
        <div className="p-6 sm:p-10 max-w-7xl w-full mx-auto">
          {/* Unidade Alert para Master */}
          {isMaster && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-3xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500 text-white rounded-xl">
                  <Globe size={16} />
                </div>
                <p className="text-xs font-bold text-blue-900">
                  Visão Master: Você está visualizando dados consolidados de <span className="font-black">todas as unidades Fadel</span>.
                </p>
              </div>
              <button className="text-[10px] font-black uppercase text-blue-600 hover:underline">Ver Relatórios</button>
            </div>
          )}

          {!isMaster && (
             <div className="mb-6 p-4 bg-fadel-navy text-white rounded-3xl flex items-center justify-between">
               <div className="flex items-center gap-3">
                 <div className="p-2 bg-fadel-red text-white rounded-xl">
                   <Building2 size={16} />
                 </div>
                 <p className="text-xs font-bold">
                   Sessão Ativa: <span className="text-fadel-blue font-black">{currentUnit.name}</span>. Você só vê candidatos e vagas desta localidade.
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
