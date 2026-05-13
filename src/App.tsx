import React, { useEffect, useMemo, useRef, useState } from "react";
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
  ShieldCheck,
  LogOut,
  User,
  HelpCircle,
  Moon,
  Sun,
} from "lucide-react";
import { AnimatePresence } from "motion/react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { ToastProvider, useToast } from "./components/ui/Toast";
import { NotificationsProvider, useNotifications } from "./lib/notifications";
import Dashboard from "./pages/Dashboard";
import Jobs from "./pages/Jobs";
import Candidates from "./pages/Candidates";
import CandidateDetailsPage from "./pages/CandidateDetails";
import HRTools from "./pages/HRTools";
import Administration from "./pages/Administration";
import ImportResumes from "./pages/ImportResumes";
import PublicPortal from "./pages/PublicPortal";
import PublicToolResponse from "./pages/PublicToolResponse";
import AuroraAI from "./pages/AuroraAI";
import Login from "./pages/Login";
import Welcome from "./pages/Welcome";
import SuperAdmin from "./pages/SuperAdmin";
import Profile from "./pages/Profile";
import { cn } from "./lib/utils";
import { useUnit, Unit } from "./lib/useUnit";
import { getWelcomeStorageKey, isRootAdmin } from "./lib/auth";
import { usePreferences } from "./lib/usePreferences";
import { AccessPermissionKey, getPermissionsForUser } from "./lib/access";

type MenuItem = {
  path: string;
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  permissionKey: AccessPermissionKey;
};

const ROOT_MENU_ITEMS: MenuItem[] = [
  { path: "/super-admin", label: "Master Control", icon: ShieldCheck, permissionKey: "super_admin" },
];

const APP_MENU_ITEMS: MenuItem[] = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard, permissionKey: "dashboard" },
  { path: "/aurora-ai", label: "Aurora AI", icon: Brain, permissionKey: "aurora_ai" },
  { path: "/vagas", label: "Vagas", icon: Briefcase, permissionKey: "jobs" },
  { path: "/candidatos", label: "Candidatos", icon: Users, permissionKey: "candidates" },
  { path: "/importar-cvs", label: "Importar CVs", icon: FileUp, permissionKey: "imports" },
  { path: "/ferramentas", label: "Ferramentas", icon: Settings, permissionKey: "tools" },
  { path: "/administracao", label: "Administração", icon: ShieldCheck, permissionKey: "administration" },
];

const ROOT_SECTION_ITEMS = [
  { href: "#superadmin-overview", label: "Visão Geral", icon: LayoutDashboard, helper: "Indicadores root" },
  { href: "#superadmin-clientes", label: "Clientes", icon: Building2, helper: "Pipeline e tenants" },
  { href: "#superadmin-contratos", label: "Contratos", icon: ShieldCheck, helper: "Planos e validade" },
  { href: "#superadmin-acessos", label: "Acessos", icon: Users, helper: "Perfis e permissões" },
];

const LEGACY_TAB_TO_PATH: Record<string, string> = {
  superadmin: "/super-admin",
  dashboard: "/dashboard",
  nexusai: "/aurora-ai",
  jobs: "/vagas",
  candidates: "/candidatos",
  import: "/importar-cvs",
  tools: "/ferramentas",
  admin: "/administracao",
};

function getDefaultPath(user: any) {
  const permissions = getPermissionsForUser(user);

  if (isRootAdmin(user) && permissions.super_admin) {
    return "/super-admin";
  }

  return APP_MENU_ITEMS.find((item) => permissions[item.permissionKey])?.path || "/dashboard";
}

function getActiveMenuItem(pathname: string, items: MenuItem[]) {
  return items.reduce<MenuItem | null>((best, item) => {
    const matches = pathname === item.path || pathname.startsWith(`${item.path}/`);

    if (!matches) {
      return best;
    }

    if (!best || item.path.length > best.path.length) {
      return item;
    }

    return best;
  }, null);
}

function AppContent() {
  const [user, setUser] = useState<any>(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unitMenuOpen, setUnitMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const { currentUnit, changeUnit, isMaster, units } = useUnit();
  const { theme, toggleTheme } = usePreferences();
  const toast = useToast();
  const { notifications, unreadCount, markAllRead, clear } = useNotifications();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!notifOpen) return;
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [notifOpen]);

  const isSuperAdmin = isRootAdmin(user);
  const isRootShell = isSuperAdmin && location.pathname.startsWith("/super-admin");
  const permissions = useMemo(() => getPermissionsForUser(user), [user]);
  const legacyPortalMode = new URLSearchParams(location.search).get("mode") === "portal";
  const isPortalRoute = location.pathname === "/portal" || location.pathname.startsWith("/portal/");
  const isToolRoute = location.pathname.startsWith("/public/tools/");
  const defaultPath = useMemo(() => getDefaultPath(user), [user]);

  const menuItems = useMemo(() => {
    const source = isSuperAdmin ? ROOT_MENU_ITEMS : APP_MENU_ITEMS;
    return source.filter((item) => permissions[item.permissionKey]);
  }, [isSuperAdmin, permissions]);

  const activeItem = useMemo(
    () => getActiveMenuItem(location.pathname, menuItems),
    [location.pathname, menuItems]
  );
  const activeRootSection = useMemo(() => {
    if (!isRootShell) {
      return null;
    }

    const currentHash = location.hash || "#superadmin-overview";
    return ROOT_SECTION_ITEMS.find((item) => item.href === currentHash) || ROOT_SECTION_ITEMS[0];
  }, [isRootShell, location.hash]);
  const activeLabel = activeItem?.label ?? (location.pathname === '/perfil' ? 'Meu Perfil' : (menuItems[0]?.label || "Painel"));

  useEffect(() => {
    let nextTitle = "Recrute IA | Plataforma de Recrutamento";

    if (location.pathname === "/login") {
      nextTitle = "Recrute IA | Login";
    } else if (location.pathname === "/welcome") {
      nextTitle = "Recrute IA | Boas-vindas";
    } else if (isRootShell) {
      nextTitle = `Recrute IA | Super Admin${activeRootSection ? ` • ${activeRootSection.label}` : ""}`;
    } else if (isPortalRoute) {
      nextTitle = "Recrute IA | Portal Público";
    } else if (isToolRoute) {
      nextTitle = "Recrute IA | Ferramenta Pública";
    } else if (activeLabel) {
      nextTitle = `Recrute IA | ${activeLabel}`;
    }

    document.title = nextTitle;
  }, [
    activeItem,
    activeLabel,
    activeRootSection,
    isPortalRoute,
    isRootShell,
    isToolRoute,
    location.pathname,
  ]);

  useEffect(() => {
    const storedUser = localStorage.getItem("auth_user");

    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);

        const hasSeenWelcome = localStorage.getItem(getWelcomeStorageKey(parsedUser.id));
        if (!hasSeenWelcome) {
          setShowWelcome(true);
        }
      } catch {
        localStorage.removeItem("auth_user");
      }
    }

    setIsInitializing(false);
  }, []);

  useEffect(() => {
    const handleSwitchTab = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      const nextPath = typeof detail === "string" ? LEGACY_TAB_TO_PATH[detail] : undefined;

      if (nextPath) {
        navigate(nextPath);
      }
    };

    window.addEventListener("switchTab", handleSwitchTab);
    return () => window.removeEventListener("switchTab", handleSwitchTab);
  }, [navigate]);

  const handleUnitChange = (unit: Unit) => {
    changeUnit(unit);
    setUnitMenuOpen(false);
    toast.info(`Alternado para unidade: ${unit.name}`);
  };

  const handleLogin = (loggedUser: any) => {
    setUser(loggedUser);

    const hasSeenWelcome = localStorage.getItem(getWelcomeStorageKey(loggedUser.id));
    if (!hasSeenWelcome) {
      setShowWelcome(true);
      navigate("/welcome", { replace: true });
      return;
    }

    navigate(getDefaultPath(loggedUser), { replace: true });
  };

  const handleLogout = () => {
    localStorage.removeItem("auth_user");
    setUser(null);
    setShowWelcome(false);
    setSidebarOpen(false);
    navigate("/login", { replace: true });
  };

  if (legacyPortalMode && !isPortalRoute) {
    return <Navigate to="/portal" replace />;
  }

  if (isPortalRoute) {
    return <PublicPortal />;
  }

  if (isToolRoute) {
    return <PublicToolResponse />;
  }

  if (isInitializing) {
    return null;
  }

  if (!user) {
    if (location.pathname !== "/login") {
      return <Navigate to="/login" replace />;
    }

    return <Login onLogin={handleLogin} />;
  }

  if (showWelcome) {
    if (location.pathname !== "/welcome") {
      return <Navigate to="/welcome" replace />;
    }

    return (
      <Welcome
        onComplete={() => {
          setShowWelcome(false);
          if (user?.id) {
            localStorage.setItem(getWelcomeStorageKey(user.id), "true");
          }
          navigate(defaultPath, { replace: true });
        }}
      />
    );
  }

  if (location.pathname === "/" || location.pathname === "/login" || location.pathname === "/welcome") {
    return <Navigate to={defaultPath} replace />;
  }

  const guard = (allowed: boolean, element: React.ReactNode) =>
    allowed ? element : <Navigate to={defaultPath} replace />;

  return (
    <div className={cn(
      "flex min-h-screen transition-colors duration-300",
      theme === 'dark' ? "bg-[#071325] text-white" : "bg-zinc-50/50 text-zinc-900"
    )}>
      {/* Global Scale Filter */}
      <style>{`
        html { font-size: 14.4px; } 
        @media (min-width: 1536px) { html { font-size: 16px; } }
      `}</style>
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-[40] bg-develoi-navy/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={cn(
        "fixed inset-y-0 left-0 z-[50] flex h-screen w-64 flex-col transition-transform duration-300 lg:sticky lg:translate-x-0",
        isRootShell ? "bg-[#040e1f]" : theme === 'dark' ? "bg-[#071325]" : "bg-develoi-navy",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-5">
          {isRootShell ? (
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-develoi-gold/15 border border-develoi-gold/20">
                <Brain size={18} className="text-develoi-gold" />
              </div>
              <div>
                <p className="text-[11px] font-black text-white uppercase tracking-widest leading-none">Aurora Root</p>
                <p className="text-[9px] text-develoi-gold/70 font-bold uppercase tracking-widest mt-0.5">Control Grid</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <img src="/icon_logo_recruteia.png" alt="Recrute IA" className="h-9 w-9 object-contain shrink-0" />
              <div>
                <p className="text-[13px] font-black text-white leading-none tracking-tight">Recrute <span className="text-develoi-gold">IA</span></p>
                <p className="text-[9px] text-white/30 font-bold uppercase tracking-widest mt-0.5 truncate max-w-[110px]">{user?.tenant_name || "Plataforma"}</p>
              </div>
            </div>
          )}
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1.5 text-white/40 hover:text-white rounded-lg">
            <X size={18} />
          </button>
        </div>

        {/* Unit selector */}
        {!isRootShell && (
          <div className="px-4 mb-2">
            <div className="relative">
              <button
                onClick={() => setUnitMenuOpen(v => !v)}
                className="flex w-full items-center gap-2.5 rounded-xl bg-white/5 border border-white/8 px-3 py-2.5 text-left hover:bg-white/10 transition-all"
              >
                <div className="w-6 h-6 rounded-lg bg-develoi-gold/20 flex items-center justify-center shrink-0">
                  <Building2 size={11} className="text-develoi-gold" />
                </div>
                <span className="flex-1 text-[10px] font-bold text-white/80 truncate uppercase tracking-wide">{currentUnit.name}</span>
                <ChevronDown size={12} className={cn("text-white/30 transition-transform shrink-0", unitMenuOpen && "rotate-180")} />
              </button>
              <AnimatePresence>
                {unitMenuOpen && (
                  <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-xl border border-white/10 bg-[#0d1f3c] shadow-2xl overflow-hidden">
                    {units.map(unit => (
                      <button
                        key={unit.id}
                        onClick={() => handleUnitChange(unit)}
                        className={cn(
                          "w-full px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide transition-colors",
                          currentUnit.id === unit.id ? "bg-develoi-gold/15 text-develoi-gold" : "text-white/50 hover:bg-white/5 hover:text-white"
                        )}
                      >
                        {unit.name}
                      </button>
                    ))}
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
          <p className="px-2 mb-2 text-[8px] font-black text-white/20 uppercase tracking-[0.25em]">Menu</p>
          {isRootShell ? (
            <>
              <button
                onClick={() => { navigate("/super-admin"); setSidebarOpen(false); }}
                className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all bg-white/10 text-white"
              >
                <div className="w-8 h-8 rounded-lg bg-develoi-gold/20 flex items-center justify-center shrink-0">
                  <ShieldCheck size={15} className="text-develoi-gold" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest">Central Root</span>
              </button>
              <div className="pt-3">
                <p className="px-2 mb-2 text-[8px] font-black text-white/20 uppercase tracking-[0.25em]">Seções</p>
                {ROOT_SECTION_ITEMS.map(item => {
                  const Icon = item.icon;
                  const active = (location.hash || "#superadmin-overview") === item.href;
                  return (
                    <a key={item.href} href={item.href} onClick={() => setSidebarOpen(false)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 transition-all",
                        active ? "bg-develoi-gold/15 text-white" : "text-white/40 hover:bg-white/5 hover:text-white"
                      )}
                    >
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border", active ? "bg-develoi-gold/20 border-develoi-gold/20 text-develoi-gold" : "bg-white/5 border-white/8 text-white/40")}>
                        <Icon size={14} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-wider leading-none">{item.label}</p>
                        <p className="text-[9px] text-white/30 mt-0.5">{item.helper}</p>
                      </div>
                    </a>
                  );
                })}
              </div>
            </>
          ) : (
            menuItems.map(item => {
              const Icon = item.icon;
              const active = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
              return (
                <button
                  key={item.path}
                  onClick={() => { navigate(item.path); setSidebarOpen(false); }}
                  className={cn(
                    "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-150",
                    active ? "bg-develoi-gold text-white shadow-lg shadow-develoi-gold/25" : "text-white/40 hover:bg-white/6 hover:text-white"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all",
                    active ? "bg-white/20" : "bg-white/5 group-hover:bg-white/10"
                  )}>
                    <Icon size={15} strokeWidth={active ? 2.5 : 2} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
                  {active && <div className="ml-auto w-1 h-4 rounded-full bg-white/40" />}
                </button>
              );
            })
          )}
        </nav>

        {/* User card footer */}
        <div className="p-3 border-t border-white/5">
          <div className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5">
            <div className="w-8 h-8 rounded-lg bg-develoi-gold/20 border border-develoi-gold/20 flex items-center justify-center shrink-0 text-[11px] font-black text-develoi-gold">
              {(user?.full_name || "U").split(" ").slice(0, 2).map((n: string) => n[0]).join("").toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black text-white truncate leading-none">{user?.full_name || "Usuário"}</p>
              <p className="text-[9px] text-white/30 font-bold uppercase tracking-widest mt-0.5 truncate">{user?.access_profile || user?.role || "Membro"}</p>
            </div>
            <button onClick={handleLogout} title="Sair" className="p-1.5 text-white/20 hover:text-rose-400 transition-colors rounded-lg hover:bg-rose-500/10 shrink-0">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <header
          className={cn(
            "sticky top-0 z-30 flex items-center justify-between shadow-sm transition-all duration-300",
            isRootShell
              ? "h-20 border-b border-[#102647] bg-[#071325]/95 px-4 text-white backdrop-blur sm:px-8"
              : theme === 'dark'
                ? "h-16 border-b border-white/5 bg-develoi-navy px-4 sm:px-10 lg:h-20 text-white"
                : "h-16 border-b border-zinc-200 bg-white px-4 sm:px-10 lg:h-20 text-zinc-900"
          )}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className={cn(
                "rounded-xl p-2 lg:hidden transition-colors",
                theme === 'dark' || isRootShell ? "text-white/70 hover:bg-white/5" : "text-zinc-500 hover:bg-zinc-100"
              )}
            >
              <Menu size={20} />
            </button>
            {isRootShell ? (
              <div className="hidden sm:block">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-develoi-gold/80">
                  Root Operations
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <h2 className="text-lg font-black tracking-tight text-white">Super Admin Control</h2>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/60">
                    {activeRootSection?.label || "Master Control"}
                  </span>
                </div>
              </div>
            ) : (
              <div className={cn(
                "hidden items-center gap-2 text-[10px] font-medium uppercase tracking-widest sm:flex transition-colors",
                theme === 'dark' ? "text-white/50" : "text-zinc-400"
              )}>
                {!isSuperAdmin && (
                  <>
                    <Building2 size={10} className="text-develoi-gold" />
                    <span className={theme === 'dark' ? "text-white/80" : "text-zinc-600"}>{currentUnit.name}</span>
                    <ChevronRight size={10} strokeWidth={2} className={theme === 'dark' ? "text-white/30" : "text-zinc-300"} />
                  </>
                )}
                <span className={cn(
                  "font-bold transition-colors",
                  theme === 'dark' ? "text-white" : "text-develoi-navy"
                )}>{activeLabel}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 md:gap-6">
            {isRootShell && (
              <div className="hidden xl:flex items-center gap-2">
                {ROOT_SECTION_ITEMS.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "rounded-full border px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em] transition-colors",
                      (location.hash || "#superadmin-overview") === item.href
                        ? "border-develoi-gold/30 bg-develoi-gold/12 text-develoi-gold"
                        : "border-white/10 bg-white/5 text-white/62 hover:bg-white/8 hover:text-white"
                    )}
                  >
                    {item.label}
                  </a>
                ))}
              </div>
            )}

            <div className="flex items-center gap-4">
              {/* Notification Bell */}
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => { setNotifOpen(o => !o); if (!notifOpen) markAllRead(); }}
                  className={cn(
                    "relative p-2 transition-colors",
                    theme === 'dark' ? "text-white/60 hover:text-white" : "text-zinc-400 hover:text-develoi-navy"
                  )}
                >
                  <Bell size={20} />
                  {unreadCount > 0 && (
                    <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-develoi-gold text-[9px] font-black text-white border-2 border-white">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-zinc-100 z-[200] overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 bg-zinc-50/50">
                      <span className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">Notificações</span>
                      {notifications.length > 0 && (
                        <button onClick={clear} className="text-[9px] font-black text-zinc-400 uppercase tracking-widest hover:text-rose-500 transition-colors">
                          Limpar
                        </button>
                      )}
                    </div>

                    {/* List */}
                    <div className="max-h-80 overflow-y-auto divide-y divide-zinc-50">
                      {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 gap-2 opacity-40">
                          <Bell size={28} className="text-zinc-300" />
                          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Nenhuma notificação</p>
                        </div>
                      ) : notifications.map(n => (
                        <div key={n.id} className="flex items-start gap-3 px-4 py-3 hover:bg-zinc-50 transition-colors">
                          <div className={cn(
                            "mt-0.5 w-2 h-2 rounded-full shrink-0",
                            n.type === "success" ? "bg-emerald-500" :
                            n.type === "error" ? "bg-rose-500" :
                            n.type === "warning" ? "bg-amber-400" : "bg-develoi-navy"
                          )} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-black text-zinc-800 leading-snug">{n.title}</p>
                            <p className="text-[10px] font-medium text-zinc-400 mt-0.5 leading-relaxed">{n.message}</p>
                            <p className="text-[9px] font-bold text-zinc-300 mt-1 uppercase tracking-widest">
                              {n.at.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className={cn(
                "flex items-center gap-3 pl-4 border-l transition-colors",
                theme === 'dark' ? "border-white/10" : "border-zinc-200"
              )}>
                <div className="hidden text-right sm:block">
                  <p className={cn(
                    "text-[10px] font-bold leading-none transition-colors",
                    theme === 'dark' ? "text-white" : "text-develoi-navy"
                  )}>
                    {user?.full_name || "Usuário"}
                  </p>
                  <p className={cn(
                    "mt-1 text-[8px] font-medium uppercase tracking-widest transition-colors",
                    theme === 'dark' ? "text-white/60" : "text-zinc-400"
                  )}>
                    {isSuperAdmin ? "Root Admin" : user?.access_profile || user?.role || "Operação"}
                  </p>
                </div>
                <div className="relative">
                  <div
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className={cn(
                      "group relative flex h-10 w-10 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border text-xs font-black shadow-sm transition-all hover:border-develoi-gold",
                      theme === 'dark' ? "border-white/20 bg-white/5" : "border-zinc-200 bg-zinc-50"
                    )}
                  >
                    {user?.photo_url ? (
                      <img src={user.photo_url} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className={cn("text-[11px] font-black", theme === 'dark' ? "text-develoi-gold" : "text-develoi-navy")}>
                        {(user?.full_name || "U").split(" ").slice(0, 2).map((n: string) => n[0]).join("").toUpperCase()}
                      </span>
                    )}
                    <div className="absolute inset-0 bg-white/0 transition-colors group-hover:bg-white/10" />
                  </div>

                  <AnimatePresence>
                    {userMenuOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                        <div className="absolute right-0 top-14 z-50 w-52 rounded-2xl border border-zinc-100 bg-white p-2 shadow-xl animate-in fade-in slide-in-from-top-2">
                          <div className="mb-2 border-b border-zinc-100 px-3 pb-3 pt-2 text-left">
                            <p className="text-xs font-bold text-develoi-navy truncate">{user?.full_name || "Usuário"}</p>
                            <p className="text-[9px] font-semibold text-zinc-400 uppercase tracking-wider mt-0.5 truncate">{user?.email || "contato@empresa.com"}</p>
                          </div>
                          <button onClick={() => { setUserMenuOpen(false); navigate('/perfil'); }} className="w-full rounded-xl px-3 py-2 text-left text-[11px] font-bold text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-develoi-navy flex items-center gap-2.5">
                            <User size={14} className="text-zinc-400" /> Meu Perfil
                          </button>
                          <button className="w-full rounded-xl px-3 py-2 text-left text-[11px] font-bold text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-develoi-navy flex items-center gap-2.5">
                            <Settings size={14} className="text-zinc-400" /> Configurações
                          </button>
                          <button className="w-full rounded-xl px-3 py-2 text-left text-[11px] font-bold text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-develoi-navy flex items-center gap-2.5">
                            <HelpCircle size={14} className="text-zinc-400" /> Suporte
                          </button>
                          <button 
                            onClick={toggleTheme}
                            className="w-full rounded-xl px-3 py-2 text-left text-[11px] font-bold text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-develoi-navy flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2.5">
                              {theme === 'light' ? <Moon size={14} className="text-zinc-400" /> : <Sun size={14} className="text-zinc-400" />}
                              Modo {theme === 'light' ? 'Escuro' : 'Claro'}
                            </div>
                            <div className={cn(
                              "w-8 h-4 rounded-full relative transition-colors",
                              theme === 'dark' ? "bg-develoi-gold" : "bg-zinc-200"
                            )}>
                              <div className={cn(
                                "absolute top-1 w-2 h-2 rounded-full bg-white transition-all",
                                theme === 'dark' ? "right-1" : "left-1"
                              )} />
                            </div>
                          </button>
                          <div className="my-1 border-t border-zinc-100" />
                          <button onClick={handleLogout} className="w-full rounded-xl px-3 py-2.5 text-left text-[11px] font-bold text-red-600 transition-colors hover:bg-red-50 flex items-center gap-2.5">
                            <LogOut size={14} className="text-red-400" /> Sair da Plataforma
                          </button>
                        </div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="w-full flex-1 flex flex-col min-h-0">
          {isSuperAdmin && (
            <div className="mb-6 flex items-center justify-between rounded-3xl bg-develoi-navy p-4 text-white">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-develoi-gold p-2 text-white">
                  <ShieldCheck size={16} />
                </div>
                <p className="text-xs font-bold uppercase tracking-widest">
                  Modo Root Admin: Governança de clientes, contratos e acessos
                </p>
              </div>
            </div>
          )}



          {!isSuperAdmin && !isMaster && (
            <div className="mb-6 flex items-center justify-between rounded-3xl bg-develoi-navy p-4 text-white">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-develoi-gold p-2 text-white">
                  <Building2 size={16} />
                </div>
                <p className="text-xs font-bold">
                  Sessão Ativa:{" "}
                  <span className="font-black text-develoi-gold">{currentUnit.name}</span>. Você só
                  vê candidatos e vagas desta localidade.
                </p>
              </div>
            </div>
          )}

          <Routes>
            <Route path="/dashboard" element={guard(permissions.dashboard, <Dashboard />)} />
            <Route path="/aurora-ai" element={guard(permissions.aurora_ai, <AuroraAI />)} />
            <Route path="/vagas/*" element={guard(permissions.jobs, <Jobs />)} />
            <Route path="/candidatos" element={guard(permissions.candidates, <Candidates />)} />
            <Route path="/candidatos/novo" element={guard(permissions.candidates, <Candidates />)} />
            <Route path="/candidatos/:candidateId/editar" element={guard(permissions.candidates, <Candidates />)} />
            <Route path="/candidatos/:candidateId" element={guard(permissions.candidates, <CandidateDetailsPage />)} />
            <Route path="/importar-cvs" element={guard(permissions.imports, <ImportResumes />)} />
            <Route path="/ferramentas" element={guard(permissions.tools, <HRTools />)} />
            <Route
              path="/administracao"
              element={guard(permissions.administration, <Administration />)}
            />
            <Route
              path="/super-admin"
              element={guard(isSuperAdmin && permissions.super_admin, <SuperAdmin />)}
            />
            <Route path="/perfil" element={<Profile />} />
            <Route path="*" element={<Navigate to={defaultPath} replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <NotificationsProvider>
          <AppContent />
        </NotificationsProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
