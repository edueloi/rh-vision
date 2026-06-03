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
  PanelLeftClose,
  Sparkles,
  ChevronsRight,
  ShieldAlert,
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
import { Badge, Button, IconButton } from "./components/ui";
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
import PublicJobPage from "./pages/PublicJobPage";
import AuroraAI from "./pages/AuroraAI";
import Disc from "./pages/Disc";
import Login from "./pages/Login";
import Welcome from "./pages/Welcome";
import SuperAdmin from "./pages/SuperAdmin";
import Profile from "./pages/Profile";
import AccessGuide from "./pages/AccessGuide";
import SettingsPage from "./pages/Settings";
import Approvals from "./pages/Approvals";
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

type MenuSection = {
  title: string;
  items: string[];
};

const ROOT_MENU_ITEMS: MenuItem[] = [
  { path: "/super-admin", label: "Master Control", helper: "Orquestração global", icon: ShieldCheck, permissionKey: "super_admin" },
];

const APP_MENU_ITEMS: MenuItem[] = [
  { path: "/dashboard", label: "Dashboard", helper: "Resumo, metas e indicadores", icon: LayoutDashboard, permissionKey: "dashboard" },
  { path: "/aderencia", label: "Aderência", helper: "Triagem, aderência e inteligência", icon: Brain, permissionKey: "aurora_ai" },
  { path: "/vagas", label: "Vagas", helper: "Requisições e pipeline", icon: Briefcase, permissionKey: "jobs" },
  { path: "/aprovacoes", label: "Aprovações", helper: "Workflow de aprovação de vagas", icon: ShieldAlert, permissionKey: "jobs" },
  { path: "/candidatos", label: "Candidatos", helper: "Banco de talentos", icon: Users, permissionKey: "candidates" },
  { path: "/importar-cvs", label: "Importar em Lote", helper: "Importar candidatos em lote via IA", icon: FileUp, permissionKey: "imports" },
  { path: "/ferramentas", label: "Ferramentas", helper: "Avaliações e recursos", icon: Settings, permissionKey: "tools" },
  { path: "/disc", label: "DISC", helper: "Perfis comportamentais e análises", icon: Brain, permissionKey: "tools" },
  { path: "/administracao", label: "Administração", helper: "Usuários, unidades e acesso", icon: ShieldCheck, permissionKey: "administration" },
  { path: "/configuracoes", label: "Configurações", helper: "Automações e preferências", icon: Settings, permissionKey: "administration" },
];

const APP_MENU_SECTIONS: MenuSection[] = [
  { title: "Operação", items: ["/dashboard", "/aderencia", "/vagas", "/aprovacoes", "/candidatos", "/importar-cvs"] },
  { title: "Pipeline & Dados", items: ["/ferramentas", "/disc"] },
  { title: "Administração", items: ["/administracao", "/configuracoes"] },
];

const ROOT_SECTION_ITEMS = [
  { href: "/super-admin",           label: "Visão Geral", icon: LayoutDashboard, helper: "Indicadores root" },
  { href: "/super-admin/clientes",  label: "Clientes",    icon: Building2,       helper: "Pipeline e tenants" },
  { href: "/super-admin/contratos", label: "Contratos",   icon: ShieldCheck,     helper: "Planos e validade" },
  { href: "/super-admin/acessos",   label: "Acessos",     icon: Users,           helper: "Perfis e permissões" },
];

const LEGACY_TAB_TO_PATH: Record<string, string> = {
  superadmin: "/super-admin",
  dashboard: "/dashboard",
  nexusai: "/aderencia",
  jobs: "/vagas",
  candidates: "/candidatos",
  import: "/importar-cvs",
  tools: "/ferramentas",
  admin: "/administracao",
};

function SidebarTooltip({ label, helper, children }: { label: string; helper?: string; children: React.ReactNode }) {
  const [rect, setRect] = React.useState<DOMRect | null>(null);
  const ref = React.useRef<HTMLDivElement>(null);

  const show = () => {
    if (ref.current) setRect(ref.current.getBoundingClientRect());
  };
  const hide = () => setRect(null);

  return (
    <div ref={ref} onMouseEnter={show} onMouseLeave={hide}>
      {children}
      {rect && label && (
        <div
          className="fixed z-[9999] pointer-events-none"
          style={{
            top: rect.top + rect.height / 2,
            left: rect.right + 10,
            transform: "translateY(-50%)",
          }}
        >
          {/* Seta */}
          <div
            className="absolute left-0 top-1/2 -translate-x-full -translate-y-1/2 border-[6px] border-transparent"
            style={{ borderRightColor: "#0c1e38" }}
          />
          {/* Balão */}
          <div className="bg-[#0c1e38] rounded-xl shadow-2xl border border-white/10 px-3 py-2.5 min-w-[110px]">
            <p className="text-[11px] font-black text-white whitespace-nowrap leading-none">{label}</p>
            {helper && (
              <p className="text-[9px] font-medium text-white/50 whitespace-nowrap mt-1 leading-none">{helper}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

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
  const { theme, sidebarCollapsed, toggleSidebar } = usePreferences();
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
  const isPublicJobRoute = location.pathname.startsWith("/vaga/");
  const defaultPath = useMemo(() => getDefaultPath(user), [user]);

  const menuItems = useMemo(() => {
    const source = isSuperAdmin ? ROOT_MENU_ITEMS : APP_MENU_ITEMS;
    return source.filter((item) => permissions[item.permissionKey]);
  }, [isSuperAdmin, permissions]);
  const appMenuSections = useMemo(
    () =>
      APP_MENU_SECTIONS
        .map((section) => ({
          title: section.title,
          items: section.items
            .map((path) => menuItems.find((item) => item.path === path))
            .filter((item): item is MenuItem => Boolean(item)),
        }))
        .filter((section) => section.items.length > 0),
    [menuItems]
  );

  const activeItem = useMemo(
    () => getActiveMenuItem(location.pathname, menuItems),
    [location.pathname, menuItems]
  );
  const activeRootSection = useMemo(() => {
    if (!isRootShell) return null;
    return ROOT_SECTION_ITEMS.find((item) => item.href === location.pathname) || ROOT_SECTION_ITEMS[0];
  }, [isRootShell, location.pathname]);
  const activeLabel = activeItem?.label ?? (
    location.pathname === "/perfil"
      ? "Meu Perfil"
      : location.pathname === "/guia-de-acesso"
        ? "Guia de Acesso"
        : (menuItems[0]?.label || "Painel")
  );

  useEffect(() => {
    let nextTitle = "Triagem Smart | RH Inteligente";

    if (location.pathname === "/login") {
      nextTitle = "Triagem Smart | Login";
    } else if (location.pathname === "/welcome") {
      nextTitle = "Triagem Smart | Boas-vindas";
    } else if (isRootShell) {
      nextTitle = `Triagem Smart | Super Admin${activeRootSection ? ` • ${activeRootSection.label}` : ""}`;
    } else if (isPortalRoute) {
      nextTitle = "Triagem Smart | Portal Público";
    } else if (isToolRoute) {
      nextTitle = "Triagem Smart | Ferramenta Pública";
    } else if (activeLabel) {
      nextTitle = `Triagem Smart | ${activeLabel}`;
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

  if (isPublicJobRoute) {
    return <PublicJobPage />;
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
      {/* Global Scale */}
      <style>{`
        html { font-size: 14.4px; }
        @media (min-width: 1536px) { html { font-size: 16px; } }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 999px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.22); }
      `}</style>
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-[40] bg-develoi-navy/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── SIDEBAR ──────────────────────────────────────────── */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-[50] flex h-[100dvh] flex-col overflow-hidden sidebar-transition",
        "border-r border-white/[0.05]",
        "lg:sticky lg:translate-x-0",
        sidebarCollapsed
          ? "w-[84vw] max-w-[18rem] sm:w-72 lg:w-[68px] lg:min-w-[68px] lg:max-w-[68px]"
          : "w-[84vw] max-w-[18rem] sm:w-72 lg:w-[260px] lg:min-w-[260px] lg:max-w-[260px]",
        isRootShell ? "bg-[#030d1c]" : "bg-[#060f1e]",
        sidebarOpen ? "translate-x-0" : "-translate-x-full",
        sidebarCollapsed && "sidebar-collapsed"
      )}>
        {/* Ambient glow — topo esquerdo */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -left-20 h-64 w-64 rounded-full bg-develoi-gold/[0.06] blur-3xl" />
          <div className="absolute bottom-0 right-0 h-48 w-48 rounded-full bg-sky-500/[0.03] blur-3xl" />
        </div>

        <div className="relative z-10 flex h-full flex-col">

          {/* ── LOGO ── */}
          <div className={cn(
            "flex items-center gap-3 px-4 py-4 transition-all duration-200",
            sidebarCollapsed && "lg:justify-center lg:px-0 lg:py-4"
          )}>
            {isRootShell ? (
              <>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-develoi-gold/15 ring-1 ring-develoi-gold/25">
                  <Brain size={17} className="text-develoi-gold" />
                </div>
                <div className="sidebar-content-fade min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white">Aurora Root</p>
                  <p className="text-[9px] font-semibold tracking-[0.15em] text-develoi-gold/60">Control Grid</p>
                </div>
              </>
            ) : (
              <>
                <div className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white shadow-md overflow-hidden transition-all",
                  sidebarCollapsed && "lg:h-9 lg:w-9"
                )}>
                  <img src="/icon_logo_recruteia.png" alt="Triagem Smart" className="h-6 w-6 object-contain" />
                </div>
                <div className="sidebar-content-fade min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-develoi-gold/80">Triagem Smart</p>
                  <p className="truncate text-[14px] font-black leading-tight text-white">
                    {user?.tenant_name || currentUnit.name || "Operação RH"}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Linha separadora */}
          <div className="mx-3 border-t border-white/[0.06]" />

          {/* ── NAV ── */}
          <nav className={cn(
            "custom-scrollbar min-h-0 flex-1 overflow-y-auto px-2 py-3 transition-all duration-200",
            sidebarCollapsed && "lg:px-2"
          )}>
            {isRootShell ? (
              <div className="space-y-1">
                {/* Destaque root */}
                <button
                  onClick={() => { navigate("/super-admin"); setSidebarOpen(false); }}
                  className="group flex w-full items-center gap-3 rounded-xl bg-develoi-gold/10 px-3 py-2.5 ring-1 ring-develoi-gold/20 transition-all hover:bg-develoi-gold/16"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-develoi-gold/20 text-develoi-gold">
                    <ShieldCheck size={15} />
                  </div>
                  <div className="min-w-0 flex-1 text-left sidebar-content-fade">
                    <p className="text-[12px] font-bold text-white">Central Root</p>
                    <p className="text-[10px] text-white/40">{ROOT_MENU_ITEMS[0]?.helper}</p>
                  </div>
                  <ChevronRight size={13} className="shrink-0 text-white/30 transition-transform group-hover:translate-x-0.5" />
                </button>

                <p className="px-3 pt-3 pb-1 text-[9px] font-black uppercase tracking-[0.28em] text-white/20 sidebar-content-fade">
                  Seções
                </p>

                {ROOT_SECTION_ITEMS.map(item => {
                  const Icon = item.icon;
                  const active = location.pathname === item.href;
                  return (
                    <button
                      key={item.href}
                      type="button"
                      onClick={() => { navigate(item.href); setSidebarOpen(false); }}
                      className={cn(
                        "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-150",
                        active
                          ? "bg-develoi-gold text-[#060f1e] shadow-[0_4px_16px_rgba(197,160,77,0.25)]"
                          : "text-white/50 hover:bg-white/[0.05] hover:text-white"
                      )}
                    >
                      <div className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all",
                        active ? "bg-[#060f1e]/15 text-[#060f1e]" : "text-white/35 group-hover:text-white/60"
                      )}>
                        <Icon size={14} />
                      </div>
                      <div className="min-w-0 flex-1 sidebar-content-fade">
                        <p className="text-[12px] font-semibold">{item.label}</p>
                      </div>
                      {active && <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#060f1e]/40" />}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className={cn("space-y-4", sidebarCollapsed && "lg:space-y-2")}>
                {appMenuSections.map((section) => (
                  <div key={section.title}>
                    <p className={cn(
                      "px-3 pb-1.5 text-[9px] font-black uppercase tracking-[0.3em] text-white/20 sidebar-content-fade"
                    )}>
                      {section.title}
                    </p>
                    <div className="space-y-0.5">
                      {section.items.map((item) => {
                        const Icon = item.icon;
                        const active = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
                        const btn = (
                          <button
                            key={item.path}
                            type="button"
                            onClick={() => { navigate(item.path); setSidebarOpen(false); }}
                            className={cn(
                              "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-150",
                              sidebarCollapsed && "lg:justify-center lg:px-0 lg:py-3",
                              active
                                ? "bg-develoi-gold text-[#060f1e] shadow-[0_4px_16px_rgba(197,160,77,0.25)]"
                                : "text-white/50 hover:bg-white/[0.05] hover:text-white"
                            )}
                          >
                            <span className={cn(
                              "sidebar-icon-ring flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all",
                              sidebarCollapsed && "lg:h-8 lg:w-8",
                              active
                                ? "bg-[#060f1e]/15 text-[#060f1e]"
                                : "text-white/40 group-hover:text-white/80"
                            )}>
                              <Icon size={16} strokeWidth={active ? 2.2 : 1.8} />
                            </span>
                            <span className="truncate text-[13px] font-semibold sidebar-content-fade">
                              {item.label}
                            </span>
                          </button>
                        );

                        return sidebarCollapsed ? (
                          <SidebarTooltip key={item.path} label={item.label} helper={item.helper}>
                            {btn}
                          </SidebarTooltip>
                        ) : (
                          <React.Fragment key={item.path}>{btn}</React.Fragment>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </nav>

          {/* Linha separadora */}
          <div className="mx-3 border-t border-white/[0.06]" />

          {/* ── FOOTER: atalhos + user card ── */}
          <div className={cn(
            "space-y-1 px-2 py-3 transition-all duration-200",
            sidebarCollapsed && "lg:px-2"
          )}>
            {/* Botão recolher — desktop only */}
            <div className="hidden lg:block">
              <SidebarTooltip label={sidebarCollapsed ? "Expandir menu" : ""} helper={sidebarCollapsed ? "Clique para expandir" : ""}>
                <button
                  type="button"
                  onClick={toggleSidebar}
                  className={cn(
                    "group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-white/35 transition-all hover:bg-white/[0.04] hover:text-white/70",
                    sidebarCollapsed && "lg:justify-center lg:px-0 lg:py-2.5"
                  )}
                >
                  <span className={cn(
                    "sidebar-icon-ring flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-develoi-gold/50 transition-all group-hover:text-develoi-gold",
                    sidebarCollapsed && "lg:h-8 lg:w-8"
                  )}>
                    {sidebarCollapsed ? <ChevronsRight size={15} strokeWidth={2} /> : <PanelLeftClose size={15} strokeWidth={1.8} />}
                  </span>
                  <span className="truncate text-[12px] font-medium sidebar-content-fade">
                    {sidebarCollapsed ? "Expandir" : "Recolher menu"}
                  </span>
                </button>
              </SidebarTooltip>
            </div>

            {/* Links perfil / super-admin */}
            {!isRootShell && (
              <>
                {isSuperAdmin && (
                  <SidebarTooltip label={sidebarCollapsed ? "Super Admin" : ""} helper={sidebarCollapsed ? "Central root" : ""}>
                    <button
                      type="button"
                      onClick={() => { navigate("/super-admin"); setSidebarOpen(false); }}
                      className={cn(
                        "group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-develoi-gold/70 transition-all hover:bg-white/[0.04] hover:text-develoi-gold",
                        sidebarCollapsed && "lg:justify-center lg:px-0 lg:py-2.5"
                      )}
                    >
                      <span className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-develoi-gold/10 text-develoi-gold/60 transition-all group-hover:bg-develoi-gold/18 group-hover:text-develoi-gold",
                        sidebarCollapsed && "lg:h-8 lg:w-8"
                      )}>
                        <ShieldCheck size={14} />
                      </span>
                      <span className="truncate text-[12px] font-semibold sidebar-content-fade">Super Admin</span>
                    </button>
                  </SidebarTooltip>
                )}
                <SidebarTooltip label={sidebarCollapsed ? "Meu Perfil" : ""} helper={sidebarCollapsed ? "Abrir perfil" : ""}>
                  <button
                    type="button"
                    onClick={() => { navigate("/perfil"); setSidebarOpen(false); }}
                    className={cn(
                      "group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-white/40 transition-all hover:bg-white/[0.04] hover:text-white/70",
                      sidebarCollapsed && "lg:justify-center lg:px-0 lg:py-2.5"
                    )}
                  >
                    <span className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-white/35 transition-all group-hover:bg-white/[0.07] group-hover:text-white/70",
                      sidebarCollapsed && "lg:h-8 lg:w-8"
                    )}>
                      <User size={14} />
                    </span>
                    <span className="truncate text-[12px] font-semibold sidebar-content-fade">Meu Perfil</span>
                  </button>
                </SidebarTooltip>
              </>
            )}

            {/* User card */}
            <div className={cn(
              "mt-1 flex items-center gap-3 rounded-xl bg-white/[0.04] px-3 py-2.5 ring-1 ring-white/[0.06] transition-all duration-200",
              sidebarCollapsed && "lg:flex-col lg:gap-1.5 lg:px-1 lg:py-2 lg:ring-0 lg:bg-transparent"
            )}>
              <div className="relative shrink-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-develoi-gold/18 text-[11px] font-black text-develoi-gold">
                  {(user?.full_name || "U").split(" ").slice(0, 2).map((n: string) => n[0]).join("").toUpperCase()}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#060f1e] bg-emerald-400" />
              </div>
              <div className="sidebar-content-fade min-w-0 flex-1">
                <p className="truncate text-[12px] font-semibold text-white">{user?.full_name || "Usuário"}</p>
                <p className="truncate text-[10px] text-white/35">
                  {isSuperAdmin ? "Root Admin" : user?.access_profile || user?.role || "Membro"}
                </p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                title="Sair"
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white/25 transition-all hover:bg-rose-500/15 hover:text-rose-400",
                  sidebarCollapsed && "lg:h-8 lg:w-8"
                )}
              >
                <LogOut size={13} />
              </button>
            </div>
          </div>

        </div>
      </aside>

      {/* ── MAIN CONTENT ─────────────────────────────────────── */}
      <main className="flex min-w-0 flex-1 flex-col">

        {/* ── HEADER ── */}
        <header className={cn(
          "sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b px-4 transition-all duration-300 sm:px-6 lg:h-16",
          isRootShell
            ? "border-white/[0.05] bg-[#060f1e]/95 text-white backdrop-blur-sm"
            : theme === 'dark'
              ? "border-white/[0.05] bg-[#060f1e]/95 text-white backdrop-blur-sm"
              : "border-zinc-200/80 bg-white/95 text-zinc-900 backdrop-blur-sm"
        )}>

          {/* Esquerda: menu burger + breadcrumb */}
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors lg:hidden",
                theme === 'dark' || isRootShell
                  ? "text-white/60 hover:bg-white/[0.06] hover:text-white"
                  : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
              )}
            >
              <Menu size={18} />
            </button>

            {isRootShell ? (
              <div className="hidden items-center gap-2 sm:flex">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-develoi-gold/70">Root</span>
                <ChevronRight size={10} className="text-white/20" />
                <span className="text-[13px] font-semibold text-white">{activeRootSection?.label || "Master Control"}</span>
              </div>
            ) : (
              <div className="hidden min-w-0 items-center gap-1.5 sm:flex">
                {!isSuperAdmin && (
                  <>
                    <Building2 size={11} className="shrink-0 text-develoi-gold/70" />
                    <span className={cn(
                      "text-[12px] font-medium",
                      theme === 'dark' ? "text-white/50" : "text-zinc-400"
                    )}>{currentUnit.name}</span>
                    <ChevronRight size={10} className={cn("shrink-0", theme === 'dark' ? "text-white/20" : "text-zinc-300")} />
                  </>
                )}
                <span className={cn(
                  "truncate text-[13px] font-semibold",
                  theme === 'dark' ? "text-white" : "text-zinc-800"
                )}>{activeLabel}</span>
              </div>
            )}
          </div>

          {/* Direita: root tabs + unit selector + notif + user */}
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">

            {/* Root section tabs — xl only */}
            {isRootShell && (
              <div className="hidden xl:flex items-center gap-1">
                {ROOT_SECTION_ITEMS.map((item) => (
                  <button
                    key={item.href}
                    type="button"
                    onClick={() => navigate(item.href)}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-colors",
                      location.pathname === item.href
                        ? "bg-develoi-gold/15 text-develoi-gold"
                        : "text-white/50 hover:bg-white/[0.05] hover:text-white"
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}

            {/* Unit selector */}
            {!isRootShell && isAdminMestre && (
              <div ref={unitMenuRef} className="relative">
                <button
                  onClick={() => setUnitMenuOpen((v) => !v)}
                  className={cn(
                    "flex h-8 items-center gap-2 rounded-lg border px-2.5 text-left transition-all sm:px-3",
                    unitMenuOpen
                      ? "border-develoi-gold/40 bg-develoi-gold/8 text-develoi-navy"
                      : theme === 'dark'
                        ? "border-white/[0.08] bg-white/[0.04] text-white/70 hover:border-white/[0.12] hover:text-white"
                        : "border-zinc-200 bg-zinc-50 text-zinc-600 hover:border-zinc-300 hover:bg-white"
                  )}
                  title={`Unidade: ${currentUnit.name}`}
                >
                  <Building2 size={13} className={unitMenuOpen ? "text-develoi-gold" : "text-current opacity-60"} />
                  <span className="hidden max-w-[9rem] truncate text-[12px] font-medium sm:block">
                    {currentUnit.name}
                  </span>
                  <ChevronDown
                    size={12}
                    className={cn("hidden shrink-0 opacity-50 transition-transform duration-200 sm:block", unitMenuOpen && "rotate-180")}
                  />
                </button>

                <AnimatePresence>
                  {unitMenuOpen && (
                    <div className="absolute right-0 top-full z-[120] mt-1.5 w-[min(20rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl">
                      <div className="p-1.5">
                        <p className="px-3 py-2 text-[9px] font-black uppercase tracking-[0.25em] text-zinc-400">
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
                                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all",
                                isActive
                                  ? "bg-develoi-gold/10 text-zinc-900"
                                  : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                              )}
                            >
                              <div className={cn(
                                "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border",
                                isActive ? "border-develoi-gold/30 bg-develoi-gold/10 text-develoi-gold" : "border-zinc-200 bg-zinc-50 text-zinc-400"
                              )}>
                                <Building2 size={12} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-[12px] font-semibold">{unit.name}</p>
                                <p className="truncate text-[10px] text-zinc-400">
                                  {isMasterUnit ? "Todas as unidades" : (unit.location || "Unidade ativa")}
                                </p>
                              </div>
                              {isActive && <div className="h-2 w-2 shrink-0 rounded-full bg-develoi-gold" />}
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
                  "relative flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                  theme === 'dark' || isRootShell
                    ? "text-white/50 hover:bg-white/[0.06] hover:text-white"
                    : "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                )}
              >
                <Bell size={17} />
                {unreadCount > 0 && (
                  <span className="absolute right-1 top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-develoi-gold text-[8px] font-black text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className={cn(
                  "absolute right-0 top-full z-[200] mt-1.5 w-80 overflow-hidden rounded-xl border shadow-xl",
                  theme === 'dark' || isRootShell
                    ? "border-white/[0.08] bg-[#0c1b30]"
                    : "border-zinc-200 bg-white"
                )}>
                  <div className={cn(
                    "flex items-center justify-between px-4 py-2.5 border-b",
                    theme === 'dark' || isRootShell ? "border-white/[0.06]" : "border-zinc-100"
                  )}>
                    <span className={cn(
                      "text-[11px] font-bold uppercase tracking-wider",
                      theme === 'dark' || isRootShell ? "text-white/60" : "text-zinc-500"
                    )}>Notificações</span>
                    {notifications.length > 0 && (
                      <button onClick={clear} className="text-[10px] font-semibold text-zinc-400 transition-colors hover:text-rose-500">
                        Limpar
                      </button>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center gap-2 py-10 opacity-40">
                        <Bell size={24} className="text-zinc-300" />
                        <p className="text-[11px] font-semibold text-zinc-400">Nenhuma notificação</p>
                      </div>
                    ) : notifications.map(n => (
                      <div key={n.id} className={cn(
                        "flex items-start gap-3 px-4 py-3 transition-colors",
                        theme === 'dark' || isRootShell ? "hover:bg-white/[0.04]" : "hover:bg-zinc-50"
                      )}>
                        <div className={cn(
                          "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                          n.type === "success" ? "bg-emerald-500" :
                          n.type === "error" ? "bg-rose-500" :
                          n.type === "warning" ? "bg-amber-400" : "bg-develoi-gold"
                        )} />
                        <div className="min-w-0 flex-1">
                          <p className={cn("text-[12px] font-semibold leading-snug", theme === 'dark' || isRootShell ? "text-white" : "text-zinc-800")}>{n.title}</p>
                          <p className={cn("mt-0.5 text-[11px] leading-relaxed", theme === 'dark' || isRootShell ? "text-white/45" : "text-zinc-500")}>{n.message}</p>
                          <p className={cn("mt-1 text-[10px]", theme === 'dark' || isRootShell ? "text-white/25" : "text-zinc-300")}>
                            {n.at.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className={cn("h-5 w-px", theme === 'dark' || isRootShell ? "bg-white/[0.08]" : "bg-zinc-200")} />

            {/* User button */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className={cn(
                  "flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg text-[11px] font-black ring-1 transition-all",
                  theme === 'dark' || isRootShell
                    ? "bg-develoi-gold/15 text-develoi-gold ring-develoi-gold/20 hover:ring-develoi-gold/40"
                    : "bg-develoi-navy/10 text-develoi-navy ring-develoi-navy/15 hover:ring-develoi-navy/30"
                )}
              >
                {user?.photo_url ? (
                  <img src={user.photo_url} alt="avatar" className="h-full w-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                ) : (
                  (user?.full_name || "U").split(" ").slice(0, 2).map((n: string) => n[0]).join("").toUpperCase()
                )}
              </button>

              <AnimatePresence>
                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                    <div className="absolute right-0 top-11 z-50 w-52 overflow-hidden rounded-xl border border-zinc-100 bg-white shadow-xl">
                      <div className="border-b border-zinc-100 px-4 py-3">
                        <p className="truncate text-[13px] font-semibold text-zinc-800">{user?.full_name || "Usuário"}</p>
                        <p className="truncate text-[11px] text-zinc-400">{user?.email || "contato@empresa.com"}</p>
                      </div>
                      <div className="p-1">
                        <button onClick={() => { setUserMenuOpen(false); navigate('/perfil'); }} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[12px] font-medium text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900">
                          <User size={13} className="text-zinc-400" /> Meu Perfil
                        </button>
                        <button onClick={() => { setUserMenuOpen(false); navigate('/configuracoes'); }} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[12px] font-medium text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900">
                          <Settings size={13} className="text-zinc-400" /> Configurações
                        </button>
                        <button onClick={() => { setUserMenuOpen(false); navigate('/guia-de-acesso'); }} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[12px] font-medium text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900">
                          <HelpCircle size={13} className="text-zinc-400" /> Guia de Acesso
                        </button>
                        <div className="my-1 border-t border-zinc-100" />
                        <button onClick={handleLogout} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-[12px] font-semibold text-rose-600 transition-colors hover:bg-rose-50">
                          <LogOut size={13} className="text-rose-400" /> Sair da Plataforma
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </AnimatePresence>
            </div>

          </div>
        </header>

        <div className="w-full flex-1 flex flex-col min-h-0">
          {isSuperAdmin && !isRootShell && (
            <div className="mx-4 mt-4 flex items-center gap-2.5 rounded-xl border border-develoi-gold/20 bg-develoi-gold/8 px-4 py-2.5 sm:mx-6">
              <ShieldCheck size={14} className="shrink-0 text-develoi-gold" />
              <p className="text-[12px] font-medium text-develoi-gold/80">
                Modo Root Admin — Governança de clientes, contratos e acessos
              </p>
            </div>
          )}

          {!isSuperAdmin && !isMaster && (
            <div className={cn(
              "mx-4 mt-4 flex items-start gap-2.5 rounded-xl border px-4 py-2.5 sm:mx-6",
              theme === 'dark'
                ? "border-white/[0.06] bg-white/[0.03]"
                : "border-amber-100 bg-amber-50"
            )}>
              <Building2 size={14} className="mt-0.5 shrink-0 text-amber-500" />
              <div>
                <p className={cn("text-[12px] font-medium", theme === 'dark' ? "text-white/50" : "text-amber-800")}>
                  Você está na unidade{" "}
                  <span className={cn("font-bold", theme === 'dark' ? "text-white/80" : "text-amber-900")}>{currentUnit.name}</span>
                  {" "}— visualizando apenas candidatos e vagas desta unidade.
                </p>
                <p className={cn("mt-0.5 text-[11px]", theme === 'dark' ? "text-white/30" : "text-amber-600/70")}>
                  Para ver todos os dados da operação, selecione a unidade Matriz no seletor acima.
                </p>
              </div>
            </div>
          )}

          <Routes>
            <Route path="/dashboard" element={guard(permissions.dashboard, <Dashboard />)} />
            <Route path="/aurora-ai/*" element={<Navigate to="/aderencia" replace />} />
            <Route path="/aderencia/*" element={guard(permissions.aurora_ai, <AuroraAI />)} />
            <Route path="/vagas/*" element={guard(permissions.jobs, <Jobs />)} />
            <Route path="/aprovacoes" element={guard(permissions.jobs, <Approvals />)} />
            <Route path="/candidatos" element={guard(permissions.candidates, <Candidates />)} />
            <Route path="/candidatos/novo" element={guard(permissions.candidates, <Candidates />)} />
            <Route path="/candidatos/:candidateId/editar" element={guard(permissions.candidates, <Candidates />)} />
            <Route path="/candidatos/:candidateId" element={guard(permissions.candidates, <CandidateDetailsPage />)} />
            <Route path="/importar-cvs" element={guard(permissions.imports, <ImportResumes />)} />
            <Route path="/ferramentas" element={guard(permissions.tools, <HRTools />)} />
            <Route path="/disc" element={guard(permissions.tools, <Disc />)} />
            <Route
              path="/administracao"
              element={guard(permissions.administration, <Administration />)}
            />
            <Route path="/super-admin"           element={guard(isSuperAdmin && permissions.super_admin, <SuperAdmin />)} />
            <Route path="/super-admin/clientes"  element={guard(isSuperAdmin && permissions.super_admin, <SuperAdmin />)} />
            <Route path="/super-admin/contratos" element={guard(isSuperAdmin && permissions.super_admin, <SuperAdmin />)} />
            <Route path="/super-admin/acessos"   element={guard(isSuperAdmin && permissions.super_admin, <SuperAdmin />)} />
            <Route path="/configuracoes" element={guard(permissions.administration, <SettingsPage />)} />
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
