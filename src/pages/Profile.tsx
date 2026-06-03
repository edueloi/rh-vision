import React, { useState, useRef } from "react";
import {
  User, Mail, ShieldCheck, Camera, Trash2, Upload,
  Briefcase, Loader2, Building2, KeyRound, Lock,
  CheckCircle2, Clock, Sparkles, ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Badge, Button, Input, Modal, PageWrapper, useToast } from "@/src/components/ui";
import { cn } from "@/src/lib/utils";

// ─── Profile label helpers ────────────────────────────────────────────────────

const PROFILE_LABELS: Record<string, string> = {
  "admin-mestre":      "Admin Mestre",
  "rh-operacao":       "RH Operação",
  "executivo-leitura": "Executivo Leitura",
  "custom":            "Perfil Customizado",
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  user:  "Recrutador",
};

// ─── Section card wrapper ─────────────────────────────────────────────────────

function SectionCard({ title, description, action, children }: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4">
        <div>
          <h3 className="text-[13px] font-bold text-zinc-900">{title}</h3>
          {description && <p className="mt-0.5 text-[11px] text-zinc-400">{description}</p>}
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ─── Read-only field ──────────────────────────────────────────────────────────

function ReadField({ label, value, icon: Icon }: { label: string; value: string; icon: React.ElementType }) {
  return (
    <div>
      <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">{label}</label>
      <div className="flex h-10 items-center gap-2.5 rounded-xl border border-zinc-200 bg-zinc-50 px-3.5">
        <Icon size={14} className="shrink-0 text-zinc-400" />
        <span className="truncate text-[13px] font-medium text-zinc-700">{value || "—"}</span>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Profile() {
  const toast      = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const storedUser = JSON.parse(localStorage.getItem("auth_user") || "{}");
  const [user, setUser]     = useState(storedUser);
  const [uploading, setUploading] = useState(false);
  const [showRemoveModal, setShowRemoveModal]     = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [pwLoading, setPwLoading] = useState(false);

  const persist = (updated: any) => {
    setUser(updated);
    localStorage.setItem("auth_user", JSON.stringify(updated));
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64Url = ev.target?.result as string;
      const body = new FormData();
      body.append("file", file);
      try {
        const res  = await fetch(`/api/users/${user.id}/photo`, { method: "POST", body });
        const data = await res.json();
        persist({ ...user, photo_url: data.photo_url || base64Url });
        toast.success("Foto atualizada!");
      } catch {
        persist({ ...user, photo_url: base64Url });
        toast.success("Foto atualizada!");
      } finally {
        setUploading(false);
        e.target.value = "";
      }
    };
    reader.onerror = () => { toast.error("Erro ao ler arquivo."); setUploading(false); };
    reader.readAsDataURL(file);
  };

  const handlePhotoRemove = async () => {
    setShowRemoveModal(false);
    setUploading(true);
    try {
      await fetch(`/api/users/${user.id}/photo`, { method: "DELETE" });
      persist({ ...user, photo_url: null });
      toast.success("Foto removida.");
    } catch {
      toast.error("Erro ao remover foto.");
    } finally {
      setUploading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!pwForm.current)                              { toast.error("Informe a senha atual."); return; }
    if (pwForm.next.length < 6)                       { toast.error("A nova senha deve ter ao menos 6 caracteres."); return; }
    if (pwForm.next !== pwForm.confirm)               { toast.error("As novas senhas não coincidem."); return; }
    setPwLoading(true);
    try {
      const res = await fetch(`/api/users/${user.id}/password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_password: pwForm.current, new_password: pwForm.next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao alterar senha.");
      setPwForm({ current: "", next: "", confirm: "" });
      setShowPasswordModal(false);
      toast.success("Senha alterada com sucesso!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao alterar senha.");
    } finally {
      setPwLoading(false);
    }
  };

  const initials = (user.full_name || "U")
    .split(" ").slice(0, 2).map((n: string) => n[0]).join("").toUpperCase();

  const profileLabel = PROFILE_LABELS[user.access_profile] || user.access_profile || "Operação RH";
  const roleLabel    = ROLE_LABELS[user.role] || user.role || "Membro";

  return (
    <PageWrapper className="min-h-screen bg-[#f8fafc]">
      <div className="space-y-5 px-4 pb-24 pt-5 sm:px-6">

        {/* ── PAGE HEADER ── */}
        <div className="relative overflow-hidden rounded-2xl bg-develoi-navy px-5 py-6 sm:px-7">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-develoi-gold/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-12 left-1/4 h-36 w-36 rounded-full bg-sky-500/8 blur-3xl" />

          <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-6">
            {/* Avatar grande */}
            <div className="relative shrink-0">
              <div className="h-20 w-20 overflow-hidden rounded-2xl border-4 border-white/15 bg-develoi-gold/20 shadow-xl">
                {user.photo_url ? (
                  <img src={user.photo_url} alt="Avatar" className="h-full w-full object-cover"
                    onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-[26px] font-black text-develoi-gold">
                    {initials}
                  </span>
                )}
                {uploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <Loader2 size={20} className="animate-spin text-white" />
                  </div>
                )}
              </div>
              {/* Camera button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute -bottom-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-xl bg-develoi-gold text-develoi-navy shadow-lg transition-all hover:scale-105 disabled:opacity-50"
              >
                <Camera size={13} />
              </button>
              <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
            </div>

            {/* Identity */}
            <div className="min-w-0 flex-1">
              <h1 className="text-[22px] font-black leading-none tracking-tight text-white sm:text-[26px]">
                {user.full_name || "Usuário"}
              </h1>
              <p className="mt-1 text-[12px] font-medium text-white/50">{user.email}</p>
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1.5 rounded-full bg-develoi-gold/15 px-3 py-1 text-[11px] font-semibold text-develoi-gold ring-1 ring-develoi-gold/25">
                  <ShieldCheck size={11} /> {profileLabel}
                </span>
                <span className="rounded-full bg-white/8 px-3 py-1 text-[11px] font-medium text-white/60 ring-1 ring-white/10">
                  {roleLabel}
                </span>
                <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-3 py-1 text-[11px] font-medium text-emerald-300 ring-1 ring-emerald-400/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Ativo
                </span>
              </div>
            </div>

            {/* Quick actions */}
            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex h-8 items-center gap-1.5 rounded-lg border border-white/15 bg-white/8 px-3 text-[11px] font-medium text-white/70 transition-all hover:bg-white/12 hover:text-white disabled:opacity-50"
              >
                <Upload size={12} /> Trocar foto
              </button>
              {user.photo_url && (
                <button
                  onClick={() => setShowRemoveModal(true)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/40 transition-colors hover:border-rose-400/30 hover:bg-rose-500/15 hover:text-rose-300"
                  title="Remover foto"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── GRID ── */}
        <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">

          {/* Left column */}
          <div className="space-y-4">

            {/* Status card */}
            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
              <div className="border-b border-zinc-100 px-4 py-3.5">
                <h3 className="text-[13px] font-bold text-zinc-900">Status da conta</h3>
              </div>
              <div className="divide-y divide-zinc-50 p-1">
                {[
                  {
                    icon: CheckCircle2, label: "Conta verificada",
                    value: "Ativa e segura",
                    iconCls: "bg-emerald-50 text-emerald-600",
                  },
                  {
                    icon: Building2, label: "Unidade",
                    value: user.unit_name || "Matriz",
                    iconCls: "bg-develoi-navy/8 text-develoi-navy",
                  },
                  {
                    icon: ShieldCheck, label: "Perfil de acesso",
                    value: profileLabel,
                    iconCls: "bg-develoi-gold/10 text-develoi-gold",
                  },
                  {
                    icon: Briefcase, label: "Função",
                    value: roleLabel,
                    iconCls: "bg-violet-50 text-violet-600",
                  },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3 rounded-xl px-3 py-3">
                    <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", item.iconCls)}>
                      <item.icon size={14} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">{item.label}</p>
                      <p className="truncate text-[12px] font-semibold text-zinc-800">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick links */}
            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
              <div className="border-b border-zinc-100 px-4 py-3.5">
                <h3 className="text-[13px] font-bold text-zinc-900">Ações rápidas</h3>
              </div>
              <div className="p-1">
                {[
                  {
                    label: "Alterar senha",
                    desc: "Atualizar credencial de acesso",
                    icon: KeyRound,
                    onClick: () => { setPwForm({ current: "", next: "", confirm: "" }); setShowPasswordModal(true); },
                    accent: "text-develoi-navy",
                    bg: "bg-develoi-navy/8",
                  },
                  {
                    label: "Trocar foto de perfil",
                    desc: "PNG, JPG até 5 MB",
                    icon: Camera,
                    onClick: () => fileInputRef.current?.click(),
                    accent: "text-develoi-gold",
                    bg: "bg-develoi-gold/10",
                  },
                ].map((a) => (
                  <button
                    key={a.label}
                    onClick={a.onClick}
                    className="group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-zinc-50"
                  >
                    <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", a.bg)}>
                      <a.icon size={14} className={a.accent} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-semibold text-zinc-800">{a.label}</p>
                      <p className="text-[10px] text-zinc-400">{a.desc}</p>
                    </div>
                    <ChevronRight size={13} className="shrink-0 text-zinc-300 transition-transform group-hover:translate-x-0.5" />
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Right column */}
          <div className="space-y-4">

            {/* Basic info */}
            <SectionCard
              title="Informações básicas"
              description="Dados de identificação no sistema — gerenciados pelo administrador."
              action={
                <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[10px] font-semibold text-zinc-500 ring-1 ring-zinc-200">
                  Somente leitura
                </span>
              }
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <ReadField label="Nome Completo"       value={user.full_name || "—"} icon={User} />
                <ReadField label="E-mail Corporativo"  value={user.email || "—"}     icon={Mail} />
              </div>
            </SectionCard>

            {/* Access & roles */}
            <SectionCard
              title="Acesso e permissões"
              description="Nível de permissão e módulos disponíveis na plataforma."
            >
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  {
                    icon: ShieldCheck,
                    label: "Perfil de Acesso",
                    value: profileLabel,
                    sub: "Sincronizado com o sistema",
                    bg: "bg-develoi-navy/8",
                    iconCls: "text-develoi-navy",
                  },
                  {
                    icon: Briefcase,
                    label: "Função",
                    value: roleLabel,
                    sub: `Unidade: ${user.unit_name || user.unit_id || "Geral"}`,
                    bg: "bg-violet-50",
                    iconCls: "text-violet-600",
                  },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3 rounded-xl border border-zinc-100 bg-zinc-50 p-4">
                    <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", item.bg)}>
                      <item.icon size={18} className={item.iconCls} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">{item.label}</p>
                      <p className="truncate text-[14px] font-bold text-zinc-900">{item.value}</p>
                      <p className="mt-0.5 text-[10px] text-zinc-400">{item.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>

            {/* Security */}
            <SectionCard
              title="Segurança"
              description="Gerencie o acesso e credenciais da sua conta."
              action={
                <button
                  onClick={() => { setPwForm({ current: "", next: "", confirm: "" }); setShowPasswordModal(true); }}
                  className="flex h-8 items-center gap-1.5 rounded-lg bg-develoi-navy px-3.5 text-[11px] font-semibold text-white transition-colors hover:bg-[#0a1e3a]"
                >
                  <Lock size={12} /> Alterar senha
                </button>
              }
            >
              <div className="space-y-3">
                {/* Senha configurada */}
                <div className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-3.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100">
                    <ShieldCheck size={15} className="text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-emerald-800">Senha configurada</p>
                    <p className="text-[11px] text-emerald-700/70">Acesso protegido por credenciais verificadas.</p>
                  </div>
                </div>

                {/* Dicas de segurança */}
                <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4">
                  <div className="mb-2.5 flex items-center gap-2">
                    <Sparkles size={12} className="text-develoi-gold" />
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">Boas práticas</p>
                  </div>
                  <ul className="space-y-1.5">
                    {[
                      "Use ao menos 8 caracteres com letras e números",
                      "Não reutilize senhas de outros serviços",
                      "Troque sua senha periodicamente",
                    ].map((tip, i) => (
                      <li key={i} className="flex items-start gap-2 text-[11px] font-medium text-zinc-600">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-zinc-400" />
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </SectionCard>

          </div>
        </div>
      </div>

      {/* ── MODAL: Remove photo ── */}
      <Modal
        open={showRemoveModal}
        onClose={() => setShowRemoveModal(false)}
        title="Remover foto de perfil"
        description="Sua foto será removida e as iniciais serão exibidas no lugar."
        icon={<Trash2 size={18} />}
        size="sm"
        footer={
          <div className="flex w-full justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowRemoveModal(false)}>Cancelar</Button>
            <Button variant="danger" size="sm" iconLeft={<Trash2 size={13} />} onClick={handlePhotoRemove}>
              Remover
            </Button>
          </div>
        }
      >
        <p className="text-[13px] leading-relaxed text-zinc-600">
          As iniciais do seu nome serão exibidas no lugar da foto em todo o sistema.
        </p>
      </Modal>

      {/* ── MODAL: Change password ── */}
      <Modal
        open={showPasswordModal}
        onClose={() => { if (!pwLoading) setShowPasswordModal(false); }}
        title="Alterar senha"
        description="Digite sua senha atual e escolha uma nova com no mínimo 6 caracteres."
        icon={<KeyRound size={18} />}
        size="sm"
        footer={
          <div className="flex w-full justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowPasswordModal(false)} disabled={pwLoading}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              size="sm"
              iconLeft={<KeyRound size={13} />}
              loading={pwLoading}
              disabled={!pwForm.current || !pwForm.next || !pwForm.confirm}
              onClick={handleChangePassword}
            >
              Salvar senha
            </Button>
          </div>
        }
      >
        <div className="space-y-3 pt-1">
          <Input
            label="Senha atual"
            type="password"
            placeholder="••••••••"
            showPasswordToggle
            value={pwForm.current}
            onChange={e => setPwForm(p => ({ ...p, current: e.target.value }))}
            icon={<Lock size={13} />}
            required
            disabled={pwLoading}
          />
          <Input
            label="Nova senha"
            type="password"
            placeholder="Mínimo 6 caracteres"
            showPasswordToggle
            value={pwForm.next}
            onChange={e => setPwForm(p => ({ ...p, next: e.target.value }))}
            icon={<Lock size={13} />}
            hint={pwForm.next && pwForm.next.length < 6 ? "Mínimo 6 caracteres" : undefined}
            error={pwForm.next && pwForm.confirm && pwForm.next !== pwForm.confirm ? "As senhas não coincidem" : undefined}
            required
            disabled={pwLoading}
          />
          <Input
            label="Confirmar nova senha"
            type="password"
            placeholder="Repita a nova senha"
            showPasswordToggle
            value={pwForm.confirm}
            onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))}
            icon={<Lock size={13} />}
            error={pwForm.confirm && pwForm.next !== pwForm.confirm ? "As senhas não coincidem" : undefined}
            success={!!(pwForm.confirm && pwForm.next === pwForm.confirm && pwForm.confirm.length >= 6)}
            required
            disabled={pwLoading}
          />

          {/* Password strength hint */}
          {pwForm.next.length > 0 && (
            <div className="flex gap-1 pt-1">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className={cn(
                  "h-1 flex-1 rounded-full transition-all",
                  pwForm.next.length >= i * 3
                    ? i <= 2 ? "bg-amber-400" : "bg-emerald-500"
                    : "bg-zinc-200"
                )} />
              ))}
            </div>
          )}
        </div>
      </Modal>
    </PageWrapper>
  );
}
