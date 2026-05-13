import React, { useEffect, useRef, useState } from "react";
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

  useEffect(() => {
    if (!menuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const candidateCount = job.candidates_count ?? 0;
  const createdAt = new Date(job.created_at).toLocaleDateString("pt-BR");
  const location = job.city && job.state ? `${job.city}/${job.state}` : "Local não informado";

  if (variant === "list") {
    return (
      <motion.div layout initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}>
        <ContentCard className="group relative overflow-visible border-zinc-200/80 p-0 transition-all hover:border-develoi-gold/30 hover:shadow-lg hover:shadow-zinc-200/50">
          <div className="flex flex-col items-center gap-4 p-4 sm:flex-row sm:p-5">
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

            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <JobStatusBadge status={job.status} />
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">
                  {(job.department || "Geral").toUpperCase()} · {location.toUpperCase()}
                </p>
              </div>
              <h3 className="truncate text-base font-black tracking-tight text-zinc-900">
                {job.title}
              </h3>
            </div>

            <div className="flex shrink-0 items-center gap-6 px-4 text-zinc-400">
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
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onOpen(job)}
                className="hidden sm:flex"
              >
                Gerenciar
              </Button>
              <Button
                variant="outline"
                size="sm"
                iconLeft={<Edit size={14} />}
                onClick={() => onEdit(job)}
                className="hidden sm:flex"
              >
                Editar
              </Button>

              <div ref={menuRef} className="relative">
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
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.96 }}
                      className="absolute right-0 top-full z-50 mt-2 w-64 rounded-3xl border border-zinc-200 bg-white p-2 shadow-2xl shadow-zinc-900/10"
                    >
                      <div className="space-y-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          fullWidth
                          className="justify-start sm:hidden"
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
                          size="sm"
                          fullWidth
                          className="justify-start sm:hidden"
                          iconLeft={<Edit size={14} />}
                          onClick={() => {
                            onEdit(job);
                            setMenuOpen(false);
                          }}
                        >
                          Editar vaga
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          fullWidth
                          className="justify-start"
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
                          size="sm"
                          fullWidth
                          className="justify-start"
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
                            size="sm"
                            fullWidth
                            className="justify-start text-develoi-navy"
                            iconLeft={<Globe size={14} />}
                            onClick={() => {
                              const slug = `${job.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${job.id}`;
                              window.open(`/portal/vagas/${slug}`, '_blank');
                              setMenuOpen(false);
                            }}
                          >
                            Acessar portal da vaga
                          </Button>
                        )}

                        {job.status !== "Aberta" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            fullWidth
                            className="justify-start text-emerald-700 hover:text-emerald-800"
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
                            size="sm"
                            fullWidth
                            className="justify-start text-amber-700 hover:text-amber-800"
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
                            size="sm"
                            fullWidth
                            className="justify-start text-zinc-600"
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
                          size="sm"
                          fullWidth
                          className="justify-start text-red-600 hover:text-red-700"
                          iconLeft={<Trash2 size={14} />}
                          onClick={() => {
                            onDeleteRequest(job);
                            setMenuOpen(false);
                          }}
                        >
                          Excluir vaga
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </ContentCard>
      </motion.div>
    );
  }

  return (
    <motion.div layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <ContentCard className="relative h-full overflow-visible border-zinc-200/80 p-0">
        <div className="absolute right-0 top-0 h-28 w-28 -translate-y-6 translate-x-6 rounded-full bg-develoi-navy/5 blur-3xl transition-colors duration-500" />

        <div className="relative space-y-6 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div
                className={cn(
                  "flex h-14 w-14 shrink-0 items-center justify-center rounded-[22px] border transition-all",
                  job.is_public
                    ? "border-develoi-gold/20 bg-develoi-gold/5 text-develoi-gold"
                    : "border-zinc-200 bg-zinc-50 text-zinc-400"
                )}
              >
                {job.is_public ? <Globe size={24} /> : <Briefcase size={24} />}
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <JobStatusBadge status={job.status} />
                  {job.is_public && (
                    <span className="text-[10px] font-black uppercase tracking-[0.18em] text-develoi-gold">
                      Portal ativo
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="line-clamp-2 text-lg font-black tracking-tight text-zinc-900">
                    {job.title}
                  </h3>
                  <p className="mt-1 text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400">
                    {(job.department || "Geral").toUpperCase()} · {location.toUpperCase()}
                  </p>
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
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    className="absolute right-0 top-full z-20 mt-2 w-64 rounded-3xl border border-zinc-200 bg-white p-2 shadow-2xl shadow-zinc-900/10"
                  >
                    <div className="space-y-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        fullWidth
                        className="justify-start"
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
                        size="sm"
                        fullWidth
                        className="justify-start"
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
                          size="sm"
                          fullWidth
                          className="justify-start text-develoi-navy"
                          iconLeft={<Globe size={14} />}
                          onClick={() => {
                            const slug = `${job.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${job.id}`;
                            window.open(`/portal/vagas/${slug}`, '_blank');
                            setMenuOpen(false);
                          }}
                        >
                          Acessar portal da vaga
                        </Button>
                      )}

                      {job.status !== "Aberta" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          fullWidth
                          className="justify-start text-emerald-700 hover:text-emerald-800"
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
                          size="sm"
                          fullWidth
                          className="justify-start text-amber-700 hover:text-amber-800"
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
                          size="sm"
                          fullWidth
                          className="justify-start text-zinc-600"
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
                        size="sm"
                        fullWidth
                        className="justify-start text-red-600 hover:text-red-700"
                        iconLeft={<Trash2 size={14} />}
                        onClick={() => {
                          onDeleteRequest(job);
                          setMenuOpen(false);
                        }}
                      >
                        Excluir vaga
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <ContentCard padding="sm" className="border-zinc-100 bg-zinc-50/80">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400">
                Candidatos
              </p>
              <div className="mt-2 flex items-center gap-2 text-zinc-900">
                <Users size={15} className="text-develoi-navy" />
                <span className="text-lg font-black tracking-tight">{candidateCount}</span>
              </div>
            </ContentCard>

            <ContentCard padding="sm" className="border-zinc-100 bg-zinc-50/80">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400">
                Criada em
              </p>
              <div className="mt-2 flex items-center gap-2 text-zinc-900">
                <Calendar size={15} className="text-develoi-navy" />
                <span className="text-base font-black tracking-tight">{createdAt}</span>
              </div>
            </ContentCard>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="secondary"
              fullWidth
              onClick={() => onOpen(job)}
            >
              Gerenciar
            </Button>
            <Button
              variant="outline"
              iconLeft={<Edit size={14} />}
              onClick={() => onEdit(job)}
              className="sm:w-auto"
            >
              Editar
            </Button>
          </div>
        </div>
      </ContentCard>
    </motion.div>
  );
}
