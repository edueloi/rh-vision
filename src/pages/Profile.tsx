import React, { useState, useRef } from "react";
import {
  User, Mail, ShieldCheck, Camera, Trash2, Upload,
  Briefcase, Loader2, Building2, KeyRound, Lock
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Badge, Button, Input, Modal, PageWrapper, useToast } from "@/src/components/ui";
import { cn } from "@/src/lib/utils";

// ── Info row (read-only) ───────────────────────────────────────────────────────

function InfoRow({ icon: Icon, label, value, color = "text-zinc-500" }: {
  icon: React.ElementType; label: string; value: string; color?: string;
}) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-zinc-50 last:border-0">
      <div className="w-8 h-8 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center shrink-0">
        <Icon size={14} className={color} />
      </div>
      <div className="min-w-0">
        <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{label}</p>
        <p className="text-xs font-bold text-zinc-800 truncate">{value}</p>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Profile() {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const storedUser = JSON.parse(localStorage.getItem("auth_user") || "{}");
  const [user, setUser] = useState(storedUser);
  const [uploading, setUploading] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // Password form state
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
        const res = await fetch(`/api/users/${user.id}/photo`, { method: "POST", body });
        if (!res.ok) throw new Error();
        const data = await res.json();
        persist({ ...user, photo_url: data.photo_url || base64Url });
        toast.success("Foto atualizada com sucesso!");
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
    if (!pwForm.current) { toast.error("Informe a senha atual."); return; }
    if (pwForm.next.length < 6) { toast.error("A nova senha deve ter ao menos 6 caracteres."); return; }
    if (pwForm.next !== pwForm.confirm) { toast.error("As novas senhas não coincidem."); return; }
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

  return (
    <PageWrapper title="Meu Perfil" subtitle="Gerencie suas informações e credenciais de acesso">
      <div className="grid gap-5 lg:grid-cols-[300px,minmax(0,1fr)]">

        {/* ── LEFT COLUMN ── */}
        <div className="space-y-4">

          {/* Photo card */}
          <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
            {/* Banner */}
            <div className="h-20 bg-gradient-to-br from-develoi-navy via-develoi-navy to-develoi-gold/30 relative">
              <div
                className="absolute inset-0 opacity-[0.07]"
                style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "20px 20px" }}
              />
            </div>

            <div className="px-5 pb-5 -mt-10 flex flex-col items-center text-center">
              {/* Avatar */}
              <div className="relative mb-3">
                <div className="w-20 h-20 rounded-2xl border-4 border-white shadow-lg overflow-hidden bg-develoi-navy flex items-center justify-center">
                  {user.photo_url ? (
                    <img
                      src={user.photo_url}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                      onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  ) : (
                    <span className="text-xl font-black text-develoi-gold">{initials}</span>
                  )}
                  {uploading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Loader2 size={18} className="animate-spin text-white" />
                    </div>
                  )}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="absolute -bottom-1.5 -right-1.5 w-7 h-7 bg-develoi-gold rounded-xl flex items-center justify-center text-white shadow-md hover:bg-develoi-navy transition-colors disabled:opacity-50"
                >
                  <Camera size={12} />
                </button>
                <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
              </div>

              <h3 className="text-base font-black text-zinc-900 leading-tight">{user.full_name || "Usuário"}</h3>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5 mb-4">
                {user.access_profile || user.role || "Membro"}
              </p>

              <div className="w-full flex flex-col gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  fullWidth
                  iconLeft={<Upload size={12} />}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  Trocar foto
                </Button>
                {user.photo_url && (
                  <Button
                    variant="ghost"
                    size="sm"
                    fullWidth
                    iconLeft={<Trash2 size={12} />}
                    onClick={() => setShowRemoveModal(true)}
                    className="!text-rose-500 hover:!bg-rose-50"
                  >
                    Remover foto
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Account info */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-sm">
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Dados da Conta</p>
            <InfoRow icon={ShieldCheck} label="Status" value="Verificada e Ativa" color="text-emerald-500" />
            <InfoRow icon={Building2} label="Unidade" value={user.unit_name || "Matriz"} color="text-develoi-navy" />
            <InfoRow icon={KeyRound} label="Permissão" value={user.access_profile || "Operação RH"} color="text-develoi-gold" />
          </div>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="space-y-4">

          {/* Basic info — read only */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3 mb-5">
              <div>
                <p className="text-sm font-black text-zinc-900 uppercase tracking-wide">Informações Básicas</p>
                <p className="text-[10px] text-zinc-400 font-medium mt-0.5">Dados de identificação no sistema — apenas leitura.</p>
              </div>
              <Badge color="default" size="sm">Somente leitura</Badge>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { label: "Nome Completo", value: user.full_name || "—", icon: User },
                { label: "E-mail Corporativo", value: user.email || "—", icon: Mail },
              ].map(f => (
                <div key={f.label}>
                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block mb-1.5">{f.label}</label>
                  <div className="flex items-center gap-3 h-11 px-3.5 rounded-xl border border-zinc-100 bg-zinc-50 text-sm font-semibold text-zinc-600">
                    <f.icon size={14} className="text-zinc-300 shrink-0" />
                    <span className="truncate">{f.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Access & roles */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm">
            <div className="mb-5">
              <p className="text-sm font-black text-zinc-900 uppercase tracking-wide">Acesso e Funções</p>
              <p className="text-[10px] text-zinc-400 font-medium mt-0.5">Nível de permissão e cargo na plataforma.</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { icon: ShieldCheck, label: "Perfil de Acesso", value: user.access_profile || "Operação RH", sub: "Sincronizado" },
                { icon: Briefcase, label: "Cargo / Função", value: user.role || "Recrutador", sub: `Unidade: ${user.unit_name || user.unit_id || "Geral"}` },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-3 p-4 rounded-xl bg-zinc-50 border border-zinc-100">
                  <div className="w-10 h-10 rounded-xl bg-develoi-navy/8 flex items-center justify-center shrink-0">
                    <item.icon size={18} className="text-develoi-navy" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{item.label}</p>
                    <p className="text-sm font-black text-zinc-900 truncate">{item.value}</p>
                    <p className="text-[9px] text-zinc-400 font-medium mt-0.5">{item.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Security */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-black text-zinc-900 uppercase tracking-wide">Segurança</p>
                <p className="text-[10px] text-zinc-400 font-medium mt-0.5">Gerencie o acesso à sua conta.</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                iconLeft={<Lock size={13} />}
                onClick={() => { setPwForm({ current: "", next: "", confirm: "" }); setShowPasswordModal(true); }}
              >
                Alterar Senha
              </Button>
            </div>

            <div className="mt-4 flex items-center gap-3 p-3.5 bg-zinc-50 rounded-xl border border-zinc-100">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                <ShieldCheck size={14} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-zinc-700">Senha configurada</p>
                <p className="text-[10px] text-zinc-400 font-medium">Use o botão acima para redefinir sua senha de acesso.</p>
              </div>
            </div>
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
          <div className="flex justify-end gap-2 w-full">
            <Button variant="outline" size="sm" onClick={() => setShowRemoveModal(false)}>Cancelar</Button>
            <Button variant="danger" size="sm" iconLeft={<Trash2 size={13} />} onClick={handlePhotoRemove}>
              Remover
            </Button>
          </div>
        }
      >
        <></>
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
          <div className="flex justify-end gap-2 w-full">
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
        </div>
      </Modal>
    </PageWrapper>
  );
}
