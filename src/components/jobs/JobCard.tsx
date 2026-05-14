import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Briefcase,
  Calendar,
  Edit,
  Globe,
  Layers,
  MoreHorizontal,
  PauseCircle,
  PlayCircle,
  Trash2,
  Users,
  XCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button, ContentCard, IconButton } from "@/src/components/ui";
import { Job } from "@/src/types";
import { cn } from "@/src/lib/utils";
import { JobStatusBadge } from "./JobStatusBadge";

interface JobCardProps {
  job: Job;
  variant?: "grid" | "list";
  onOpen: (job: Job) => void;
  onEdit: (job: Job) => void;
  onDuplicate: (job: Job) => void;
  onTogglePublication: (job: Job) => void;
  onStatusChange: (job: Job, status: string) => void;
  onDeleteRequest: (job: Job) => void;
}

export function JobCard({
  job,
  variant = "grid",
  onOpen,
  onEdit,
  onDuplicate,
  onTogglePublication,
  onStatusChange,
  onDeleteRequest,
}: JobCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const desktopMenuPanelRef = useRef<HTMLDivElement>(null);
  const mobileMenuPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedTrigger = menuRef.current?.contains(target);
      const clickedDesktopPanel = desktopMenuPanelRef.current?.contains(target);
      const clickedMobilePanel = mobileMenuPanelRef.current?.contains(target);

      if (!clickedTrigger && !clickedDesktopPanel && !clickedMobilePanel) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const candidateCount = job.candidates_count ?? 0;
  const createdAt = new Date(job.created_at).toLocaleDateString("pt-BR");
  const location = job.city && job.state ? `${job.city}/${job.state}` : "Local não informado";
  const portalSlug = `${job.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${job.id}`;

  const handleOpenPortal = () => {
    window.open(`/portal/vagas/${portalSlug}`, "_blank");
    setMenuOpen(false);
  };

  const renderActionMenu = (options?: { showPrimaryActions?: boolean; sheet?: boolean }) => {
    const showPrimaryActions = options?.showPrimaryActions ?? false;
    const sheet = options?.sheet ?? false;
    const actionSize = sheet ? "md" : "sm";
    const actionClassName = cn(
      "justify-start",
      sheet && "h-11 rounded-2xl px-4 text-[12px] font-bold"
    );

    return (
      <div className={cn("space-y-1", sheet && "space-y-2")}>
        {showPrimaryActions && (
          <>
            <Button
              variant="ghost"
              size={actionSize}
              fullWidth
              className={actionClassName}
              iconLeft={<Briefcase size={14} />}
              onClick={() => {
                onOpen(job);
                setMenuOpen(false);
              }}
            >
              Gerenciar vaga
            </Button>
            <Button
              variant="ghost"
              size={actionSize}
              fullWidth
              className={actionClassName}
              iconLeft={<Edit size={14} />}
              onClick={() => {
                onEdit(job);
                setMenuOpen(false);
              }}
            >
              Editar vaga
            </Button>
            <div className={cn("my-2 h-px bg-zinc-100", sheet && "my-1")} />
          </>
        )}

        <Button
          variant="ghost"
          size={actionSize}
          fullWidth
          className={actionClassName}
          iconLeft={<Layers size={14} />}
          onClick={() => {
            onDuplicate(job);
            setMenuOpen(false);
          }}
        >
          Duplicar vaga
        </Button>

        <Button
          variant="ghost"
          size={actionSize}
          fullWidth
          className={actionClassName}
          iconLeft={<Globe size={14} />}
          onClick={() => {
            onTogglePublication(job);
            setMenuOpen(false);
          }}
        >
          {job.is_public ? "Remover do portal" : "Publicar no portal"}
        </Button>

        {job.is_public && (
          <Button
            variant="ghost"
            size={actionSize}
            fullWidth
            className={cn(actionClassName, "text-develoi-navy")}
            iconLeft={<Globe size={14} />}
            onClick={handleOpenPortal}
          >
            Acessar portal da vaga
          </Button>
        )}

        {job.status !== "Aberta" && (
          <Button
            variant="ghost"
            size={actionSize}
            fullWidth
            className={cn(actionClassName, "text-emerald-700 hover:text-emerald-800")}
            iconLeft={<PlayCircle size={14} />}
            onClick={() => {
              onStatusChange(job, "Aberta");
              setMenuOpen(false);
            }}
          >
            Ativar vaga
          </Button>
        )}

        {job.status === "Aberta" && (
          <Button
            variant="ghost"
            size={actionSize}
            fullWidth
            className={cn(actionClassName, "text-amber-700 hover:text-amber-800")}
            iconLeft={<PauseCircle size={14} />}
            onClick={() => {
              onStatusChange(job, "Pausada");
              setMenuOpen(false);
            }}
          >
            Pausar vaga
          </Button>
        )}

        {job.status !== "Encerrada" && (
          <Button
            variant="ghost"
            size={actionSize}
            fullWidth
            className={cn(actionClassName, "text-zinc-600")}
            iconLeft={<XCircle size={14} />}
            onClick={() => {
              onStatusChange(job, "Encerrada");
              setMenuOpen(false);
            }}
          >
            Encerrar vaga
          </Button>
        )}

        <div className="my-2 h-px bg-zinc-100" />

        <Button
          variant="ghost"
          size={actionSize}
          fullWidth
          className={cn(actionClassName, "text-red-600 hover:text-red-700")}
          iconLeft={<Trash2 size={14} />}
          onClick={() => {
            onDeleteRequest(job);
            setMenuOpen(false);
          }}
        >
          Excluir vaga
        </Button>
      </div>
    );
  };

  const mobileActionSheet =
    menuOpen && typeof document !== "undefined"
      ? createPortal(
          <>
            <button
              type="button"
              aria-label="Fechar ações da vaga"
              className="fixed inset-0 z-[70] bg-zinc-950/25 backdrop-blur-[2px] sm:hidden"
              onClick={() => setMenuOpen(false)}
            />
            <motion.div
              ref={mobileMenuPanelRef}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              className="fixed inset-x-3 bottom-3 z-[71] rounded-[28px] border border-zinc-200 bg-white p-3 shadow-[0_24px_60px_rgba(15,23,42,0.24)] sm:hidden"
              role="dialog"
              aria-modal="true"
            >
              <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-zinc-200" />
              <div className="mb-3 px-1">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                  Ações da vaga
                </p>
                <p className="mt-1 line-clamp-2 text-sm font-black tracking-tight text-zinc-900">
                  {job.title}
                </p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-400">
                  {(job.department || "Geral").toUpperCase()} · {location.toUpperCase()}
                </p>
              </div>
              {renderActionMenu({ showPrimaryActions: true, sheet: true })}
            </motion.div>
          </>,
          document.body
        )
      : null;

  if (variant === "list") {
    return (
      <>
        <motion.div layout initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}>
          <ContentCard className="group relative overflow-visible border-zinc-200/80 p-0 transition-all hover:border-develoi-gold/30 hover:shadow-lg hover:shadow-zinc-200/50">
            <div className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center">
              <div className="flex min-w-0 flex-1 items-start gap-3 sm:gap-4">
                <div
                  className={cn(
                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border transition-all",
                    job.is_public
                      ? "border-develoi-gold/20 bg-develoi-gold/5 text-develoi-gold"
                      : "border-zinc-200 bg-zinc-50 text-zinc-400"
                  )}
                >
                  {job.is_public ? <Globe size={20} /> : <Briefcase size={20} />}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <JobStatusBadge status={job.status} />
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">
                      {(job.department || "Geral").toUpperCase()} · {location.toUpperCase()}
                    </p>
                  </div>
                  <h3 className="mt-2 line-clamp-2 text-base font-black tracking-tight text-zinc-900">
                    {job.title}
                  </h3>

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-400 sm:hidden">
                    <span className="inline-flex items-center gap-1 rounded-full bg-zinc-50 px-2.5 py-1 text-zinc-600">
                      <Users size={12} className="text-develoi-navy" />
                      {candidateCount} candidatos
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-zinc-50 px-2.5 py-1 text-zinc-600">
                      <Calendar size={12} className="text-develoi-navy" />
                      {createdAt}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-2xl bg-zinc-50/80 px-3 py-2.5 text-zinc-400 sm:px-4 lg:bg-transparent lg:px-0 lg:py-0">
                <div className="hidden flex-col items-center gap-1 xl:flex">
                  <p className="text-[8px] font-black uppercase tracking-[0.2em]">Candidatos</p>
                  <div className="flex items-center gap-1.5 text-zinc-900">
                    <Users size={12} className="text-develoi-navy" />
                    <span className="text-sm font-black">{candidateCount}</span>
                  </div>
                </div>
                <div className="hidden flex-col items-center gap-1 sm:flex">
                  <p className="text-[8px] font-black uppercase tracking-[0.2em]">Criada em</p>
                  <div className="flex items-center gap-1.5 text-zinc-900">
                    <Calendar size={12} className="text-develoi-navy" />
                    <span className="text-sm font-black">{createdAt}</span>
                  </div>
                </div>

                <div className="flex w-full items-center gap-2 sm:w-auto">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onOpen(job)}
                    className="flex-1 sm:flex-none"
                  >
                    Gerenciar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    iconLeft={<Edit size={14} />}
                    onClick={() => onEdit(job)}
                    className="flex-1 sm:flex-none"
                  >
                    Editar
                  </Button>

                  <div ref={menuRef} className="relative shrink-0">
                    <IconButton
                      variant={menuOpen ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => setMenuOpen((current) => !current)}
                      aria-label="Abrir ações da vaga"
                    >
                      <MoreHorizontal size={16} />
                    </IconButton>

                    <AnimatePresence>
                      {menuOpen && (
                        <motion.div
                          ref={desktopMenuPanelRef}
                          initial={{ opacity: 0, y: 8, scale: 0.96 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 8, scale: 0.96 }}
                          className="absolute right-0 top-full z-50 mt-2 hidden w-64 rounded-3xl border border-zinc-200 bg-white p-2 shadow-2xl shadow-zinc-900/10 sm:block"
                        >
                          {renderActionMenu()}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </div>
          </ContentCard>
        </motion.div>
        <AnimatePresence>{mobileActionSheet}</AnimatePresence>
      </>
    );
  }

  return (
    <>
      <motion.div layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <ContentCard className="relative h-full overflow-visible border-zinc-200/80 p-0">
          <div className="absolute right-0 top-0 h-24 w-24 -translate-y-6 translate-x-5 rounded-full bg-develoi-navy/5 blur-3xl transition-colors duration-500 sm:h-28 sm:w-28 sm:translate-x-6" />

          <div className="relative space-y-4 p-4 sm:space-y-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-start gap-3 sm:gap-4">
                <div
                  className={cn(
                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-[20px] border transition-all sm:h-14 sm:w-14 sm:rounded-[22px]",
                    job.is_public
                      ? "border-develoi-gold/20 bg-develoi-gold/5 text-develoi-gold"
                      : "border-zinc-200 bg-zinc-50 text-zinc-400"
                  )}
                >
                  {job.is_public ? <Globe size={20} className="sm:hidden" /> : <Briefcase size={20} className="sm:hidden" />}
                  {job.is_public ? <Globe size={24} className="hidden sm:block" /> : <Briefcase size={24} className="hidden sm:block" />}
                </div>

                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <JobStatusBadge status={job.status} />
                    {job.is_public && (
                      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-develoi-gold">
                        Portal ativo
                      </span>
                    )}
                  </div>

                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400 sm:text-[11px]">
                      {(job.department || "Geral").toUpperCase()} · {location.toUpperCase()}
                    </p>
                    <h3 className="mt-1 line-clamp-2 text-base font-black tracking-tight text-zinc-900 sm:text-lg">
                      {job.title}
                    </h3>
                  </div>
                </div>
              </div>

              <div ref={menuRef} className="relative shrink-0">
                <IconButton
                  variant={menuOpen ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setMenuOpen((current) => !current)}
                  aria-label="Abrir ações da vaga"
                >
                  <MoreHorizontal size={16} />
                </IconButton>

                <AnimatePresence>
                  {menuOpen && (
                    <motion.div
                      ref={desktopMenuPanelRef}
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.96 }}
                      className="absolute right-0 top-full z-20 mt-2 hidden w-64 rounded-3xl border border-zinc-200 bg-white p-2 shadow-2xl shadow-zinc-900/10 sm:block"
                    >
                      {renderActionMenu()}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
              <ContentCard padding="sm" className="border-zinc-100 bg-zinc-50/80">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400">
                  Candidatos
                </p>
                <div className="mt-2 flex items-center gap-2 text-zinc-900">
                  <Users size={15} className="text-develoi-navy" />
                  <span className="text-base font-black tracking-tight sm:text-lg">{candidateCount}</span>
                </div>
              </ContentCard>

              <ContentCard padding="sm" className="border-zinc-100 bg-zinc-50/80">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400">
                  Criada em
                </p>
                <div className="mt-2 flex items-center gap-2 text-zinc-900">
                  <Calendar size={15} className="text-develoi-navy" />
                  <span className="text-sm font-black tracking-tight sm:text-base">{createdAt}</span>
                </div>
              </ContentCard>
            </div>

            <div className="flex flex-col gap-2 min-[420px]:flex-row">
              <Button
                variant="secondary"
                fullWidth
                onClick={() => onOpen(job)}
                className="min-[420px]:flex-1"
              >
                Gerenciar
              </Button>
              <Button
                variant="outline"
                iconLeft={<Edit size={14} />}
                onClick={() => onEdit(job)}
                className="min-[420px]:flex-1 sm:w-auto"
                fullWidth
              >
                Editar
              </Button>
            </div>
          </div>
        </ContentCard>
      </motion.div>
      <AnimatePresence>{mobileActionSheet}</AnimatePresence>
    </>
  );
}
