import React, { useEffect, useMemo, useState } from "react";
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
import { getWelcomeStorageKey, isRootAdmin } from "./lib/auth";
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
  const { currentUnit, changeUnit, isMaster, units } = useUnit();
  const toast = useToast();
  const location = useLocation();
  const navigate = useNavigate();

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
  const activeLabel = activeItem?.label ?? (menuItems[0]?.label || "Painel");

  useEffect(() => {
    let nextTitle = "RH Vision | Aurora Recruitment Hub";

    if (location.pathname === "/login") {
      nextTitle = "RH Vision | Login";
    } else if (location.pathname === "/welcome") {
      nextTitle = "RH Vision | Boas-vindas";
    } else if (isRootShell) {
      nextTitle = `RH Vision | Super Admin${activeRootSection ? ` • ${activeRootSection.label}` : ""}`;
    } else if (isPortalRoute) {
      nextTitle = "RH Vision | Portal Público";
    } else if (isToolRoute) {
      nextTitle = "RH Vision | Ferramenta Pública";
    } else if (activeLabel) {
      nextTitle = `RH Vision | ${activeLabel}`;
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
    <div className="flex min-h-screen bg-zinc-50/50">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-[40] bg-develoi-navy/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-[50] h-screen w-72 overflow-y-auto transition-transform duration-300 lg:sticky lg:translate-x-0",
          isRootShell
            ? "border-r border-[#102647] bg-[#071325] text-white"
            : "border-r border-zinc-200 bg-white",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col p-8">
          <div className="mb-10 flex items-center gap-3">
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-2xl text-white shadow-lg",
                isRootShell
                  ? "bg-white/10 shadow-black/20"
                  : "bg-develoi-navy shadow-develoi-navy/20"
              )}
            >
              <Brain size={22} strokeWidth={3} className="text-develoi-gold" />
            </div>
            <div>
              <h1
                className={cn(
                  "text-base font-bold uppercase leading-none tracking-tight",
                  isRootShell ? "text-white" : "text-develoi-navy"
                )}
              >
                {isRootShell ? "Aurora Root" : "Develoi"}
              </h1>
              <p className="mt-0.5 text-[9px] font-bold uppercase tracking-widest text-develoi-gold">
                {isRootShell ? "Control Grid" : "Recruitment Hub"}
              </p>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className={cn("ml-auto p-2 lg:hidden", isRootShell ? "text-white/60" : "text-zinc-400")}
            >
              <X size={20} />
            </button>
          </div>

          {!isRootShell && (
            <div className="mb-8">
              <p className="mb-2 px-1 text-[9px] font-bold uppercase tracking-widest text-zinc-400 opacity-70">
                Unidade
              </p>
              <div className="relative">
                <button
                  onClick={() => setUnitMenuOpen((current) => !current)}
                  className="flex w-full items-center justify-between rounded-2xl border border-zinc-100 bg-zinc-50/50 p-3 text-xs font-bold text-zinc-700 transition-all hover:border-develoi-gold"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <Globe size={14} className="shrink-0 text-amber-500" />
                    <span className="truncate">{currentUnit.name}</span>
                  </div>
                  <ChevronDown
                    size={14}
                    className={cn("text-zinc-400 transition-transform", unitMenuOpen && "rotate-180")}
                  />
                </button>

                <AnimatePresence>
                  {unitMenuOpen && (
                    <div className="absolute left-0 right-0 top-full z-10 mt-2 overflow-hidden rounded-2xl border border-zinc-200 bg-white py-1 shadow-xl">
                      {units.map((unit) => (
                        <button
                          key={unit.id}
                          onClick={() => handleUnitChange(unit)}
                          className={cn(
                            "w-full px-4 py-2.5 text-left text-xs font-bold transition-colors hover:bg-zinc-50",
                            currentUnit.id === unit.id
                              ? "bg-amber-50/50 text-develoi-gold"
                              : "text-zinc-600"
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

          {isRootShell && (
            <div className="mb-8 rounded-[28px] border border-white/10 bg-white/5 p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-develoi-gold">
                Root Layer
              </p>
              <h2 className="mt-3 text-xl font-black tracking-tight text-white">Super Admin Shell</h2>
              <p className="mt-2 text-sm font-medium leading-relaxed text-white/65">
                Ambiente exclusivo para contratos, clientes, acessos e permissões globais.
              </p>
            </div>
          )}

          <nav className="flex-1 space-y-1.5">
            {isRootShell ? (
              <>
                <button
                  onClick={() => {
                    navigate("/super-admin");
                    setSidebarOpen(false);
                  }}
                  className="group flex w-full items-center justify-between rounded-2xl bg-white px-4 py-3 text-left font-bold text-[#071325] shadow-lg shadow-black/10"
                >
                  <div className="flex items-center gap-3">
                    <ShieldCheck size={18} strokeWidth={2.5} className="text-develoi-gold" />
                    <span className="text-[10px] uppercase tracking-[0.18em]">Central Root</span>
                  </div>
                  <ChevronRight size={14} strokeWidth={3} className="text-[#071325]/30" />
                </button>

                <div className="pt-4">
                  <p className="mb-3 px-1 text-[9px] font-bold uppercase tracking-[0.22em] text-white/35">
                    Navegação
                  </p>
                  <div className="space-y-2">
                    {ROOT_SECTION_ITEMS.map((item) => {
                      const Icon = item.icon;
                      const active = (location.hash || "#superadmin-overview") === item.href;

                      return (
                        <a
                          key={item.href}
                          href={item.href}
                          onClick={() => setSidebarOpen(false)}
                          className={cn(
                            "group flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition-all duration-200",
                            active
                              ? "border-develoi-gold/30 bg-develoi-gold/12 text-white"
                              : "border-white/6 bg-white/[0.03] text-white/72 hover:border-white/12 hover:bg-white/[0.05]"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                "flex h-9 w-9 items-center justify-center rounded-xl border transition-colors",
                                active
                                  ? "border-develoi-gold/20 bg-develoi-gold/15 text-develoi-gold"
                                  : "border-white/10 bg-white/[0.04] text-white/60"
                              )}
                            >
                              <Icon size={16} strokeWidth={2.3} />
                            </div>
                            <div>
                              <p className="text-[11px] font-black uppercase tracking-[0.16em]">
                                {item.label}
                              </p>
                              <p className="mt-1 text-[11px] font-semibold text-white/45">
                                {item.helper}
                              </p>
                            </div>
                          </div>
                          {active && <ChevronRight size={14} strokeWidth={3} className="text-develoi-gold/70" />}
                        </a>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              menuItems.map((item) => {
                const Icon = item.icon;
                const active =
                  location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);

                return (
                  <button
                    key={item.path}
                    onClick={() => {
                      navigate(item.path);
                      setSidebarOpen(false);
                    }}
                    className={cn(
                      "group flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left transition-all duration-200",
                      active
                        ? "bg-develoi-navy font-bold text-white shadow-lg shadow-develoi-navy/10"
                        : "font-medium text-zinc-500 hover:bg-zinc-50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        size={18}
                        strokeWidth={active ? 2.5 : 2}
                        className={cn(
                          "transition-colors",
                          active
                            ? "text-white"
                            : "text-zinc-400 group-hover:text-zinc-900 focus:text-develoi-gold"
                        )}
                      />
                      <span className="text-[10px] uppercase tracking-wider">{item.label}</span>
                    </div>
                    {active && <ChevronRight size={14} strokeWidth={3} className="text-white/40" />}
                  </button>
                );
              })
            )}
          </nav>

          <div className="mt-auto pt-8">
            {isRootShell ? (
              <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-5 text-white">
                <div className="absolute right-0 top-0 -mr-12 -mt-12 h-24 w-24 rounded-full bg-develoi-gold/10" />
                <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-develoi-gold">
                  Root Session
                </p>
                <p className="mb-4 text-xs font-medium leading-relaxed text-white/72">
                  Shell dedicado para governança global da plataforma, sem misturar navegação operacional.
                </p>
                <button
                  onClick={handleLogout}
                  className="w-full rounded-xl border border-white/10 bg-white py-2 text-[10px] font-bold uppercase tracking-widest text-[#071325] transition-colors hover:border-develoi-gold hover:bg-develoi-gold hover:text-white"
                >
                  Encerrar Sessão
                </button>
              </div>
            ) : (
              <div className="relative overflow-hidden rounded-3xl border border-white/5 bg-develoi-navy p-5 text-white">
              <div className="absolute right-0 top-0 -mr-12 -mt-12 h-24 w-24 rounded-full bg-develoi-gold/10" />
              <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-develoi-gold">
                Acesso Master
              </p>
              <p className="mb-4 text-xs font-medium leading-relaxed opacity-80">
                Você tem visão total de todas as unidades Develoi.
              </p>
              <button className="w-full rounded-xl bg-white py-2 text-[10px] font-bold uppercase tracking-widest text-develoi-navy transition-colors hover:bg-develoi-gold hover:text-white">
                Gerenciar Master
              </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <header
          className={cn(
            "sticky top-0 z-30 flex items-center justify-between",
            isRootShell
              ? "h-20 border-b border-[#102647] bg-[#071325]/95 px-4 text-white backdrop-blur sm:px-8"
              : "h-16 border-b border-zinc-200 bg-white px-4 sm:px-10 lg:h-20"
          )}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className={cn(
                "rounded-xl p-2 lg:hidden",
                isRootShell ? "text-white/70 hover:bg-white/5" : "text-zinc-500 hover:bg-zinc-100"
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
              <div className="hidden items-center gap-2 text-[10px] font-medium uppercase tracking-widest text-zinc-500 sm:flex">
                {!isSuperAdmin && (
                  <>
                    <Building2 size={10} className="text-develoi-gold" />
                    <span className="text-develoi-navy/60">{currentUnit.name}</span>
                    <ChevronRight size={10} strokeWidth={2} className="text-zinc-300" />
                  </>
                )}
                <span className="font-bold text-develoi-navy">{activeLabel}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 md:gap-6">
            {isRootShell ? (
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
            ) : (
              <div className="relative hidden lg:block">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                />
                <input
                  type="text"
                  placeholder="Pesquisar..."
                  className="w-48 rounded-xl border-none bg-zinc-100 py-2 pl-9 pr-4 text-xs font-bold outline-none transition-all focus:ring-2 focus:ring-develoi-gold/20"
                />
              </div>
            )}

            <div className="flex items-center gap-4">
              <button
                className={cn(
                  "relative p-2 transition-colors",
                  isRootShell ? "text-white/55 hover:text-white" : "text-zinc-400 hover:text-zinc-900"
                )}
              >
                <Bell size={20} />
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-white bg-develoi-gold" />
              </button>
              <div
                className={cn(
                  "flex items-center gap-3 pl-4",
                  isRootShell ? "border-l border-white/10" : "border-l border-zinc-200"
                )}
              >
                <div className="hidden text-right sm:block">
                  <p
                    className={cn(
                      "text-[10px] font-bold leading-none",
                      isRootShell ? "text-white" : "text-zinc-900"
                    )}
                  >
                    {user?.full_name || "Usuário"}
                  </p>
                  <p
                    className={cn(
                      "mt-1 text-[8px] font-medium uppercase tracking-widest",
                      isRootShell ? "text-white/45" : "text-zinc-400"
                    )}
                  >
                    {isSuperAdmin ? "Root Admin" : user?.access_profile || user?.role || "Operação"}
                  </p>
                </div>
                <div
                  onClick={handleLogout}
                  className={cn(
                    "group relative flex h-10 w-10 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 text-xs font-black shadow-sm transition-all",
                    isRootShell
                      ? "border-white/10 bg-white/10 text-white hover:border-red-200/40"
                      : "border-white bg-zinc-100 text-zinc-600 hover:border-red-100"
                  )}
                >
                  <img
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.full_name}`}
                    alt="avatar"
                  />
                  <div className="absolute inset-0 bg-red-500/0 transition-colors group-hover:bg-red-500/10" />
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="w-full px-6 py-6 sm:px-8 sm:py-8 xl:px-10">
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

          {!isSuperAdmin && isMaster && (
            <div className="mb-6 flex flex-col items-center justify-between gap-4 rounded-3xl border border-amber-100/50 bg-amber-50 p-4 sm:flex-row">
              <div className="flex items-center gap-3">
                <div className="shrink-0 rounded-xl bg-develoi-gold p-2 text-white shadow-sm shadow-develoi-gold/20">
                  <Globe size={16} />
                </div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-amber-900 leading-relaxed">
                  Visão Master: Você está visualizando dados consolidados de{" "}
                  <span className="font-bold text-develoi-navy">todas as unidades Develoi</span>.
                </p>
              </div>
              <button className="whitespace-nowrap text-[10px] font-bold uppercase tracking-wider text-develoi-gold transition-colors hover:text-develoi-navy">
                Ver Relatórios
              </button>
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
            <Route path="/candidatos/*" element={guard(permissions.candidates, <Candidates />)} />
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
        <AppContent />
      </ToastProvider>
    </BrowserRouter>
  );
}
