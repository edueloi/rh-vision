import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Users,
  Briefcase,
  LayoutDashboard,
  Settings,
  FileUp,
  Menu,
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
import AccessGuide from "./pages/AccessGuide";
import { cn } from "./lib/utils";
import { useUnit, Unit } from "./lib/useUnit";
import { getWelcomeStorageKey, isRootAdmin } from "./lib/auth";
import { usePreferences } from "./lib/usePreferences";
import { AccessPermissionKey, getPermissionsForUser } from "./lib/access";

type MenuItem = {
  path: string;
  label: string;
  helper?: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  permissionKey: AccessPermissionKey;
};

const ROOT_MENU_ITEMS: MenuItem[] = [
  { path: "/super-admin", label: "Master Control", helper: "Orquestração global", icon: ShieldCheck, permissionKey: "super_admin" },
];

const APP_MENU_ITEMS: MenuItem[] = [
  { path: "/dashboard", label: "Dashboard", helper: "Resumo, metas e indicadores", icon: LayoutDashboard, permissionKey: "dashboard" },
  { path: "/aurora-ai", label: "Aurora AI", helper: "Triagem, match e inteligência", icon: Brain, permissionKey: "aurora_ai" },
  { path: "/vagas", label: "Vagas", helper: "Requisições e pipeline", icon: Briefcase, permissionKey: "jobs" },
  { path: "/candidatos", label: "Candidatos", helper: "Banco de talentos", icon: Users, permissionKey: "candidates" },
  { path: "/importar-cvs", label: "Importar CVs", helper: "Upload e processamento", icon: FileUp, permissionKey: "imports" },
  { path: "/ferramentas", label: "Ferramentas", helper: "Avaliações e recursos", icon: Settings, permissionKey: "tools" },
  { path: "/administracao", label: "Administração", helper: "Usuários, unidades e acesso", icon: ShieldCheck, permissionKey: "administration" },
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
  const unitMenuRef = useRef<HTMLDivElement>(null);
  const { currentUnit, changeUnit, isMaster, units } = useUnit();
  const { theme } = usePreferences();
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

  useEffect(() => {
    if (!unitMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (unitMenuRef.current && !unitMenuRef.current.contains(e.target as Node)) {
        setUnitMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [unitMenuOpen]);

  const isSuperAdmin = isRootAdmin(user);
  const isAdminMestre = user?.access_profile === "admin-mestre" || user?.role === "admin";
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
  const activeLabel = activeItem?.label ?? (
    location.pathname === "/perfil"
      ? "Meu Perfil"
      : location.pathname === "/guia-de-acesso"
        ? "Guia de Acesso"
        : (menuItems[0]?.label || "Painel")
  );

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

        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.13); border-radius: 999px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.22); }

        @media (max-height: 720px) {
          .custom-scrollbar { padding-bottom: 0.5rem; }
        }
      `}</style>
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-[40] bg-develoi-navy/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={cn(
        "fixed inset-y-0 left-0 z-[50] flex h-[100dvh] w-[84vw] max-w-[18rem] flex-col overflow-hidden border-r border-white/[0.06] shadow-[22px_0_60px_rgba(3,8,20,0.24)] transition-transform duration-300 sm:w-72 lg:sticky lg:translate-x-0",
        isRootShell ? "bg-[#040e1f]" : theme === 'dark' ? "bg-[#071325]" : "bg-develoi-navy",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-x-0 top-0 h-52 bg-[radial-gradient(circle_at_top_left,rgba(197,160,77,0.22),transparent_58%)]" />
          <div className="absolute -left-10 top-28 h-44 w-44 rounded-full bg-develoi-gold/10 blur-3xl" />
          <div className="absolute -right-14 top-72 h-56 w-56 rounded-full bg-sky-400/5 blur-3xl" />
        </div>

        <div className="relative z-10 flex h-full flex-col">
          {/* Logo */}
          <div className="px-4 pb-3 pt-4 sm:px-5 sm:pb-5 sm:pt-6">
            {isRootShell ? (
              <div className="flex flex-1 items-center gap-3 rounded-[22px] border border-white/[0.07] bg-white/[0.04] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] sm:rounded-[24px] sm:px-3.5 sm:py-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-develoi-gold/20 bg-develoi-gold/15 shrink-0">
                  <Brain size={20} className="text-develoi-gold" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-white leading-none">Aurora Root</p>
                  <p className="mt-1 text-[10px] font-bold tracking-[0.16em] text-develoi-gold/75">Control Grid</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-1 items-center gap-3 rounded-[22px] border border-white/[0.07] bg-white/[0.04] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] sm:rounded-[24px] sm:px-3.5 sm:py-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white shadow-[0_10px_30px_rgba(255,255,255,0.14)] shrink-0 overflow-hidden sm:h-11 sm:w-11">
                  <img src="/icon_logo_recruteia.png" alt="Recrute IA" className="h-7 w-7 object-contain" />
                </div>
                <div className="min-w-0">
                  <p className="text-[15px] font-black leading-none tracking-tight text-white">Recrute <span className="text-develoi-gold">IA</span></p>
                  <p className="mt-1 truncate text-[9px] font-bold uppercase tracking-[0.3em] text-white/45">{user?.tenant_name || "Develoi"}</p>
                </div>
              </div>
            )}
          </div>

          {/* Nav */}
          <nav className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-3 pb-3 pt-1 sm:px-4 sm:pb-4">
            <p className="px-3 pb-3 text-[9px] font-black uppercase tracking-[0.32em] text-white/24">Menu</p>
            {isRootShell ? (
              <>
                <button
                  onClick={() => { navigate("/super-admin"); setSidebarOpen(false); }}
                  className="group flex w-full items-center gap-3 rounded-[24px] border border-white/[0.08] bg-white/[0.04] px-3.5 py-3 text-left text-white transition-all hover:bg-white/[0.06]"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-develoi-gold/20 bg-develoi-gold/16 text-develoi-gold shrink-0">
                    <ShieldCheck size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-black tracking-[0.06em] text-white">Central Root</p>
                    <p className="mt-1 hidden text-[9px] text-white/40 sm:block">{ROOT_MENU_ITEMS[0]?.helper}</p>
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.05] text-white/35">
                    <ChevronRight size={15} />
                  </div>
                </button>
                <div className="pt-4">
                  <p className="px-3 pb-2 text-[8px] font-black uppercase tracking-[0.32em] text-white/20">Seções</p>
                  <div className="space-y-1.5 sm:space-y-2">
                    {ROOT_SECTION_ITEMS.map(item => {
                      const Icon = item.icon;
                      const active = (location.hash || "#superadmin-overview") === item.href;
                      return (
                        <a
                          key={item.href}
                          href={item.href}
                          onClick={() => setSidebarOpen(false)}
                          className={cn(
                            "group flex w-full items-center gap-3 rounded-[22px] border px-3.5 py-3 transition-all duration-200",
                            active
                              ? "border-white/[0.08] bg-white/[0.07] text-white shadow-[0_14px_30px_rgba(0,0,0,0.16)]"
                              : "border-transparent text-white/58 hover:border-white/[0.08] hover:bg-white/[0.04] hover:text-white"
                          )}
                        >
                          <div className={cn(
                            "flex h-9 w-9 items-center justify-center rounded-2xl border shrink-0 transition-all sm:h-10 sm:w-10",
                            active
                              ? "border-develoi-gold/20 bg-develoi-gold/18 text-develoi-gold"
                              : "border-white/[0.05] bg-white/[0.04] text-white/45 group-hover:border-white/[0.1] group-hover:text-white"
                          )}>
                            <Icon size={15} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[11px] font-black tracking-[0.04em]">{item.label}</p>
                            <p className="mt-1 hidden truncate text-[9px] text-white/34 sm:block">{item.helper}</p>
                          </div>
                          <div className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-full transition-all",
                            active
                              ? "bg-white/[0.06] text-develoi-gold"
                              : "text-white/20 opacity-0 group-hover:opacity-100"
                          )}>
                            <ChevronRight size={15} />
                          </div>
                        </a>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-1.5 sm:space-y-2">
                {menuItems.map(item => {
                  const Icon = item.icon;
                  const active = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
                  return (
                    <button
                      key={item.path}
                      onClick={() => { navigate(item.path); setSidebarOpen(false); }}
                      className={cn(
                        "group flex w-full items-center gap-3 rounded-[22px] border px-3 py-2.5 text-left transition-all duration-200 sm:rounded-[24px] sm:px-3.5 sm:py-3",
                        active
                          ? "border-[#d7b25d]/55 bg-[linear-gradient(135deg,#d7b25d_0%,#c5963c_100%)] text-[#091829] shadow-[0_18px_38px_rgba(197,160,77,0.28)]"
                          : "border-transparent text-white/60 hover:border-white/[0.08] hover:bg-white/[0.05] hover:text-white"
                      )}
                    >
                      <div className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-2xl border shrink-0 transition-all sm:h-10 sm:w-10",
                        active
                          ? "border-white/35 bg-[#fff4d1]/80 text-[#091829]"
                          : "border-white/[0.05] bg-white/[0.04] text-white/48 group-hover:border-white/[0.1] group-hover:bg-white/[0.07] group-hover:text-white"
                      )}>
                        <Icon size={16} strokeWidth={active ? 2.4 : 2} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={cn(
                          "truncate text-[11px] font-black tracking-[0.06em]",
                          active ? "text-[#091829]" : "text-current"
                        )}>
                          {item.label}
                        </p>
                        <p className={cn(
                          "mt-1 hidden truncate text-[9px] sm:block",
                          active ? "text-[#523c12]/80" : "text-white/34"
                        )}>
                          {item.helper}
                        </p>
                      </div>
                      <div className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full transition-all",
                        active
                          ? "bg-[#091829]/10 text-[#091829]"
                          : "text-white/20 opacity-0 group-hover:opacity-100"
                      )}>
                        <ChevronRight size={15} />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </nav>

          {/* User card footer */}
          <div className="px-3 pb-3 pt-1 sm:px-4 sm:pb-4">
            <div className="flex items-center gap-3 rounded-[24px] border border-white/[0.07] bg-white/[0.05] px-3 py-2.5 shadow-[0_14px_30px_rgba(0,0,0,0.18)] sm:rounded-[26px] sm:px-3.5 sm:py-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-develoi-gold/20 bg-develoi-gold/18 shrink-0 text-[11px] font-black text-develoi-gold sm:h-10 sm:w-10">
                {(user?.full_name || "U").split(" ").slice(0, 2).map((n: string) => n[0]).join("").toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-black tracking-[0.03em] text-white">{user?.full_name || "Usuário"}</p>
                <p className="mt-1 truncate text-[9px] font-bold uppercase tracking-[0.24em] text-white/36">{user?.access_profile || user?.role || "Membro"}</p>
              </div>
              <button
                onClick={handleLogout}
                title="Sair"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.04] text-white/30 transition-colors hover:border-rose-400/20 hover:bg-rose-500/10 hover:text-rose-300 sm:h-9 sm:w-9"
              >
                <LogOut size={15} />
              </button>
            </div>
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

            <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
              {!isRootShell && isAdminMestre && (
                <div ref={unitMenuRef} className="relative">
                  <button
                    onClick={() => setUnitMenuOpen((v) => !v)}
                    className={cn(
                      "flex h-10 max-w-[3rem] items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-2.5 text-left shadow-sm transition-all hover:border-zinc-300 hover:bg-zinc-50 sm:max-w-[12rem] sm:px-3 lg:h-11 lg:max-w-[15rem] lg:px-3.5",
                      unitMenuOpen && "border-[#d4ba72]/60 bg-[#fbf5e6] shadow-[0_14px_28px_rgba(197,160,77,0.18)]"
                    )}
                    title={`Unidade ativa: ${currentUnit.name}`}
                  >
                    <div className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border transition-colors lg:h-8 lg:w-8",
                      unitMenuOpen
                        ? "border-[#d4ba72]/45 bg-white text-[#8f6d21]"
                        : "border-zinc-200 bg-[#f7f1e2] text-[#b3872b]"
                    )}>
                      <Building2 size={13} />
                    </div>
                    <div className="hidden min-w-0 flex-1 sm:block">
                      <p className="truncate text-[10px] font-black tracking-[0.05em] text-develoi-navy lg:text-[11px]">
                        {currentUnit.name}
                      </p>
                      <p className="mt-0.5 truncate text-[9px] font-medium text-zinc-400">
                        {(currentUnit.is_master === 1 || currentUnit.id === "master")
                          ? "Todas as unidades"
                          : (currentUnit.location || "Unidade ativa")}
                      </p>
                    </div>
                    <ChevronDown
                      size={14}
                      className={cn(
                        "hidden shrink-0 text-zinc-400 transition-transform duration-200 sm:block",
                        unitMenuOpen && "rotate-180 text-[#b3872b]"
                      )}
                    />
                  </button>

                  <AnimatePresence>
                    {unitMenuOpen && (
                      <div className="absolute right-0 top-full z-[120] mt-2 w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-[24px] border border-[#eadfbe] bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(249,245,235,0.97))] shadow-[0_24px_48px_rgba(15,23,42,0.18)]">
                        <div className="p-2">
                          <p className="px-3 py-2 text-[8px] font-black uppercase tracking-[0.28em] text-zinc-500">
                            Selecionar unidade
                          </p>
                          {units.map((unit) => {
                            const isActive = currentUnit.id === unit.id;
                            const isMasterUnit = unit.is_master === 1;

                            return (
                              <button
                                key={unit.id}
                                onClick={() => handleUnitChange(unit)}
                                className={cn(
                                  "flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-all",
                                  isActive
                                    ? "bg-[#f0e1b0] text-zinc-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]"
                                    : "text-zinc-600 hover:bg-white/85 hover:text-zinc-900"
                                )}
                              >
                                <div className={cn(
                                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border",
                                  isActive
                                    ? "border-[#d4ba72]/45 bg-white/70 text-[#8f6d21]"
                                    : "border-black/5 bg-black/[0.03] text-zinc-500"
                                )}>
                                  <Building2 size={12} />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-[10px] font-black tracking-[0.06em]">
                                    {unit.name}
                                  </p>
                                  {isMasterUnit ? (
                                    <p className={cn("mt-1 truncate text-[8px]", isActive ? "text-[#8f6d21]/85" : "text-zinc-500")}>
                                      Todas as unidades
                                    </p>
                                  ) : unit.location && unit.location !== "Todas" ? (
                                    <p className={cn("mt-1 truncate text-[8px]", isActive ? "text-zinc-700/80" : "text-zinc-500")}>
                                      {unit.location}
                                    </p>
                                  ) : null}
                                </div>
                                <div className={cn(
                                  "h-5 w-5 shrink-0 rounded-full border transition-all",
                                  isActive
                                    ? "border-[#d4ba72]/60 bg-white/75"
                                    : "border-zinc-300 bg-transparent"
                                )}>
                                  {isActive && <div className="mx-auto mt-[5px] h-2 w-2 rounded-full bg-[#b3872b]" />}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </AnimatePresence>
                </div>
              )}

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
                          <button onClick={() => { setUserMenuOpen(false); navigate('/guia-de-acesso'); }} className="w-full rounded-xl px-3 py-2 text-left text-[11px] font-bold text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-develoi-navy flex items-center gap-2.5">
                            <HelpCircle size={14} className="text-zinc-400" /> Guia de Acesso
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
            <Route path="/guia-de-acesso" element={<AccessGuide />} />
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
