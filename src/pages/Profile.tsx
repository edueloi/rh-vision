import React, { useState, useRef } from "react";
import { User, Mail, ShieldCheck, Camera, Save, X, Trash2, Upload, Briefcase, Loader2, Building2, KeyRound } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Badge, Button, Modal, useToast } from "@/src/components/ui";
import { cn } from "@/src/lib/utils";

export default function Profile() {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const storedUser = JSON.parse(localStorage.getItem("auth_user") || "{}");
  const [user, setUser] = useState(storedUser);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    full_name: user.full_name || "",
    email: user.email || "",
  });

  const persist = (updated: any) => {
    setUser(updated);
    localStorage.setItem("auth_user", JSON.stringify(updated));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error();
      persist({ ...user, ...formData });
      setIsEditing(false);
      toast.success("Perfil atualizado com sucesso!");
    } catch {
      toast.error("Erro ao salvar alterações.");
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const body = new FormData();
    body.append("file", file);
    try {
      const res = await fetch(`/api/users/${user.id}/photo`, { method: "POST", body });
      if (!res.ok) throw new Error();
      const data = await res.json();
      persist({ ...user, photo_url: data.photo_url });
      toast.success("Foto atualizada!");
    } catch {
      toast.error("Erro ao carregar foto.");
    } finally {
      setUploading(false);
    }
  };

  const [showRemoveModal, setShowRemoveModal] = useState(false);

  const handlePhotoRemove = async () => {
    setShowRemoveModal(false);
    setUploading(true);
    try {
      const res = await fetch(`/api/users/${user.id}/photo`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      persist({ ...user, photo_url: null });
      toast.success("Foto removida.");
    } catch {
      toast.error("Erro ao remover foto.");
    } finally {
      setUploading(false);
    }
  };

  const initials = (user.full_name || "U")
    .split(" ")
    .slice(0, 2)
    .map((n: string) => n[0])
    .join("")
    .toUpperCase();

  return (
    <div className="w-full px-4 sm:px-6 py-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-zinc-900 tracking-tighter uppercase">Meu Perfil</h1>
          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-0.5">
            Gerencie suas informações pessoais e credenciais de acesso
          </p>
        </div>
        <div className="flex gap-2">
          <AnimatePresence mode="wait">
            {isEditing ? (
              <motion.div key="editing" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="flex gap-2">
                <button
                  onClick={() => { setIsEditing(false); setFormData({ full_name: user.full_name, email: user.email }); }}
                  className="h-11 px-5 rounded-2xl border-2 border-zinc-200 text-zinc-500 text-xs font-black uppercase tracking-widest hover:border-zinc-900 hover:text-zinc-900 transition-all flex items-center gap-2"
                >
                  <X size={15} /> Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="h-11 px-6 rounded-2xl bg-develoi-navy text-white text-xs font-black uppercase tracking-widest hover:bg-develoi-gold transition-all flex items-center gap-2 shadow-xl shadow-develoi-navy/20 disabled:opacity-60"
                >
                  {loading ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                  Salvar
                </button>
              </motion.div>
            ) : (
              <motion.button
                key="view"
                initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
                onClick={() => setIsEditing(true)}
                className="h-11 px-6 rounded-2xl border-2 border-zinc-200 text-zinc-700 text-xs font-black uppercase tracking-widest hover:border-develoi-navy hover:text-develoi-navy transition-all flex items-center gap-2"
              >
                <Camera size={15} /> Editar Perfil
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px,minmax(0,1fr)]">
        {/* Left column */}
        <div className="space-y-5">
          {/* Photo card */}
          <div className="bg-white rounded-3xl border border-zinc-100 shadow-xl shadow-zinc-100/60 overflow-hidden">
            {/* Banner */}
            <div className="h-24 bg-gradient-to-br from-develoi-navy via-develoi-navy to-develoi-gold/40 relative">
              <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 30% 50%, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
            </div>

            <div className="px-6 pb-6 -mt-12 text-center">
              <div className="relative inline-block">
                <div className="w-24 h-24 rounded-2xl border-4 border-white shadow-xl overflow-hidden bg-develoi-navy flex items-center justify-center">
                  {user.photo_url ? (
                    <img src={user.photo_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl font-black text-develoi-gold">{initials}</span>
                  )}
                  {uploading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Loader2 size={20} className="animate-spin text-white" />
                    </div>
                  )}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="absolute -bottom-2 -right-2 w-8 h-8 bg-develoi-gold rounded-xl flex items-center justify-center text-white shadow-lg hover:bg-develoi-navy transition-all disabled:opacity-50"
                >
                  <Camera size={14} />
                </button>
                <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
              </div>

              <div className="mt-4 mb-5">
                <h3 className="text-lg font-black text-zinc-900 tracking-tight">{user.full_name || "Usuário"}</h3>
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-0.5">{user.access_profile || user.role || "Membro"}</p>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full h-10 rounded-2xl border-2 border-zinc-100 text-zinc-500 text-[10px] font-black uppercase tracking-widest hover:border-develoi-navy hover:text-develoi-navy transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Upload size={13} /> Trocar Foto
                </button>
                {user.photo_url && (
                  <button
                    onClick={() => setShowRemoveModal(true)}
                    className="w-full h-10 rounded-2xl text-rose-400 text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 transition-all flex items-center justify-center gap-2"
                  >
                    <Trash2 size={13} /> Remover Foto
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Account info */}
          <div className="bg-white rounded-3xl border border-zinc-100 p-5 space-y-4">
            <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Dados da Conta</p>
            {[
              { icon: ShieldCheck, label: "Status", value: "Verificada e Ativa", color: "text-emerald-600" },
              { icon: Building2, label: "Unidade", value: user.unit_name || "Matriz", color: "text-develoi-navy" },
              { icon: KeyRound, label: "Permissão", value: user.access_profile || "Operação RH", color: "text-develoi-gold" },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-3 py-2.5 border-b border-zinc-50 last:border-0">
                <div className="w-8 h-8 rounded-xl bg-zinc-50 flex items-center justify-center shrink-0">
                  <item.icon size={15} className={item.color} />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{item.label}</p>
                  <p className="text-xs font-black text-zinc-800 truncate">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Basic info */}
          <div className="bg-white rounded-3xl border border-zinc-100 shadow-xl shadow-zinc-100/60 p-6">
            <div className="mb-6">
              <p className="text-xs font-black text-zinc-900 uppercase tracking-widest">Informações Básicas</p>
              <p className="text-[10px] text-zinc-400 font-bold mt-0.5">Dados usados para identificação em relatórios e logs do sistema.</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { label: "Nome Completo", key: "full_name", icon: User, placeholder: "Seu nome completo", type: "text" },
                { label: "E-mail Corporativo", key: "email", icon: Mail, placeholder: "seu.email@empresa.com", type: "email" },
              ].map(field => (
                <div key={field.key} className={cn("space-y-2", !isEditing && "opacity-70")}>
                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block">{field.label}</label>
                  <div className={cn(
                    "flex items-center gap-3 rounded-2xl border-2 px-4 h-12 transition-all",
                    isEditing ? "border-develoi-navy/20 bg-zinc-50 focus-within:border-develoi-navy focus-within:bg-white" : "border-zinc-100 bg-zinc-50/50"
                  )}>
                    <field.icon size={15} className="text-zinc-300 shrink-0" />
                    <input
                      type={field.type}
                      value={formData[field.key as keyof typeof formData]}
                      onChange={e => setFormData(p => ({ ...p, [field.key]: e.target.value }))}
                      disabled={!isEditing}
                      placeholder={field.placeholder}
                      className="flex-1 bg-transparent text-sm font-bold text-zinc-800 placeholder:text-zinc-300 outline-none disabled:cursor-default"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Access & Security */}
          <div className="bg-white rounded-3xl border border-zinc-100 p-6">
            <div className="mb-6">
              <p className="text-xs font-black text-zinc-900 uppercase tracking-widest">Acesso e Segurança</p>
              <p className="text-[10px] text-zinc-400 font-bold mt-0.5">Nível de permissão e cargo ocupado no Recrute IA.</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="rounded-2xl border-2 border-zinc-100 bg-zinc-50/50 p-4 flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-develoi-navy/5 flex items-center justify-center shrink-0">
                  <ShieldCheck size={20} className="text-develoi-navy" />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">Perfil de Acesso</p>
                  <p className="text-sm font-black text-zinc-900 truncate">{user.access_profile || "Operação RH"}</p>
                  <span className="inline-flex items-center mt-1 px-2 py-0.5 bg-develoi-gold/10 text-develoi-gold rounded-lg text-[9px] font-black uppercase tracking-widest">Sincronizado</span>
                </div>
              </div>
              <div className="rounded-2xl border-2 border-zinc-100 bg-zinc-50/50 p-4 flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-develoi-navy/5 flex items-center justify-center shrink-0">
                  <Briefcase size={20} className="text-develoi-navy" />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">Cargo / Função</p>
                  <p className="text-sm font-black text-zinc-900 truncate">{user.role || "Recrutador"}</p>
                  <p className="text-[9px] font-bold text-zinc-400 mt-0.5">Unidade: {user.unit_name || user.unit_id || "Geral"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Save bar */}
          <AnimatePresence>
            {isEditing && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 16 }}
                className="flex items-center justify-between gap-4 rounded-3xl bg-zinc-900 px-6 py-5 shadow-2xl shadow-zinc-900/20"
              >
                <div className="hidden sm:block">
                  <p className="text-sm font-black text-white">Alterações não salvas</p>
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Clique em salvar para aplicar</p>
                </div>
                <div className="flex gap-3 ml-auto">
                  <button
                    onClick={() => { setIsEditing(false); setFormData({ full_name: user.full_name, email: user.email }); }}
                    className="h-11 px-5 rounded-2xl text-white/60 text-[10px] font-black uppercase tracking-widest hover:text-white hover:bg-white/10 transition-all"
                  >
                    Descartar
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={loading}
                    className="h-11 px-7 rounded-2xl bg-develoi-gold text-white text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-develoi-navy transition-all flex items-center gap-2 shadow-xl shadow-develoi-gold/30 disabled:opacity-60"
                  >
                    {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    Salvar Perfil
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <Modal
        open={showRemoveModal}
        onClose={() => setShowRemoveModal(false)}
        title="Remover Foto de Perfil"
        description="Tem certeza que deseja remover sua foto de perfil? Uma imagem com as suas iniciais será gerada automaticamente."
        icon={<Trash2 size={20} />}
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <Button variant="outline" onClick={() => setShowRemoveModal(false)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handlePhotoRemove} iconLeft={<Trash2 size={16} />}>
              Remover Foto
            </Button>
          </div>
        }
      />
    </div>
  );
}
