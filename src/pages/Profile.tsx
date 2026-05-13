import React, { useState, useRef } from "react";
import { User, Mail, ShieldCheck, Camera, Save, X, Trash2, Upload } from "lucide-react";
import { 
  Badge, 
  Button, 
  ContentCard, 
  FormRow, 
  IconButton, 
  Input, 
  PageWrapper, 
  PanelCard, 
  SectionTitle,
  useToast 
} from "@/src/components/ui";
import { cn } from "@/src/lib/utils";

export default function Profile() {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Load initial user from localStorage
  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const [user, setUser] = useState(storedUser);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    full_name: user.full_name || "",
    email: user.email || "",
  });

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error("Falha ao atualizar perfil");

      const updatedUser = { ...user, ...formData };
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setIsEditing(false);
      toast.success("Perfil atualizado com sucesso!");
    } catch (error) {
      toast.error("Erro ao salvar alterações.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const body = new FormData();
    body.append("file", file);

    try {
      const res = await fetch(`/api/users/${user.id}/photo`, {
        method: "POST",
        body,
      });

      if (!res.ok) throw new Error("Falha ao fazer upload da foto");

      const data = await res.json();
      const updatedUser = { ...user, photo_url: data.photo_url };
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      toast.success("Foto de perfil atualizada!");
    } catch (error) {
      toast.error("Erro ao carregar foto.");
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const handlePhotoRemove = async () => {
    if (!confirm("Deseja realmente remover sua foto de perfil?")) return;

    setUploading(true);
    try {
      const res = await fetch(`/api/users/${user.id}/photo`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Falha ao remover foto");

      const updatedUser = { ...user, photo_url: null };
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      toast.success("Foto removida.");
    } catch (error) {
      toast.error("Erro ao remover foto.");
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <PageWrapper>
      <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <SectionTitle
            title="Meu Perfil"
            subtitle="Gerencie suas informações pessoais e credenciais de acesso ao sistema."
            icon={<User size={24} />}
            className="mb-0"
          />
          
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button 
                  variant="ghost" 
                  iconLeft={<X size={16} />} 
                  onClick={() => {
                    setIsEditing(false);
                    setFormData({ full_name: user.full_name, email: user.email });
                  }}
                >
                  Cancelar
                </Button>
                <Button 
                  variant="secondary" 
                  iconLeft={<Save size={16} />} 
                  loading={loading}
                  onClick={handleSave}
                >
                  Salvar Alterações
                </Button>
              </>
            ) : (
              <Button 
                variant="outline" 
                iconLeft={<Camera size={16} />} 
                onClick={() => setIsEditing(true)}
              >
                Editar Perfil
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[300px,minmax(0,1fr)]">
          {/* Sidebar / Photo */}
          <div className="space-y-6">
            <PanelCard className="text-center">
              <div className="relative mx-auto mb-6 block h-32 w-32">
                <div className="h-full w-full overflow-hidden rounded-full border-4 border-zinc-50 bg-zinc-100 shadow-inner dark:border-white/5 dark:bg-white/5">
                  {user.photo_url ? (
                    <img 
                      src={user.photo_url} 
                      alt="Avatar" 
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-zinc-300 dark:text-white/20">
                      <User size={64} />
                    </div>
                  )}
                </div>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                />
                
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="absolute -bottom-1 -right-1 flex h-10 w-10 items-center justify-center rounded-full border-4 border-white bg-develoi-gold text-white shadow-lg transition-transform hover:scale-110 disabled:opacity-50 dark:border-[#0d1b3e]"
                >
                  {uploading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <Camera size={18} />
                  )}
                </button>
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-black text-zinc-900 dark:text-white">
                  {user.full_name || "Usuário"}
                </h3>
                <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                  {user.role || "Membro"}
                </p>
              </div>

              <div className="mt-6 flex flex-col gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  fullWidth 
                  iconLeft={<Upload size={14} />}
                  onClick={() => fileInputRef.current?.click()}
                  loading={uploading}
                >
                  Trocar Foto
                </Button>
                {user.photo_url && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    fullWidth 
                    className="text-red-500 hover:bg-red-50 hover:text-red-600"
                    iconLeft={<Trash2 size={14} />}
                    onClick={handlePhotoRemove}
                  >
                    Remover Foto
                  </Button>
                )}
              </div>
            </PanelCard>

            <ContentCard className="bg-develoi-navy/5 border-develoi-navy/10">
              <div className="flex items-start gap-3">
                <ShieldCheck size={18} className="mt-0.5 text-develoi-navy" />
                <div className="space-y-1">
                  <p className="text-xs font-black uppercase tracking-widest text-develoi-navy">Status da Conta</p>
                  <p className="text-sm font-bold text-zinc-900 dark:text-white">Verificada e Ativa</p>
                  <p className="text-[11px] leading-relaxed text-zinc-500">Seu perfil está vinculado à unidade {user.unit_name || "Matriz"}.</p>
                </div>
              </div>
            </ContentCard>
          </div>

          {/* Main Form */}
          <div className="space-y-6">
            <PanelCard 
              title="Informações Básicas" 
              description="Estes dados são usados para identificação em relatórios e logs do sistema."
            >
              <FormRow cols={2}>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase tracking-widest text-zinc-400">Nome Completo</label>
                  <Input
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    disabled={!isEditing}
                    placeholder="Seu nome completo"
                    iconLeft={<User size={16} />}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase tracking-widest text-zinc-400">E-mail Corporativo</label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    disabled={!isEditing}
                    placeholder="seu.email@empresa.com"
                    iconLeft={<Mail size={16} />}
                  />
                </div>
              </FormRow>
            </PanelCard>

            <PanelCard 
              title="Acesso e Segurança" 
              description="Nível de permissão e cargo ocupado no Recruitment Hub."
            >
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase tracking-widest text-zinc-400">Perfil de Acesso</label>
                  <div className="flex items-center gap-3 rounded-2xl border border-zinc-100 bg-zinc-50/50 p-4 dark:border-white/5 dark:bg-white/5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm dark:bg-[#1a2b4b]">
                      <ShieldCheck className="text-develoi-navy" size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-zinc-900 dark:text-white">
                        {user.access_profile || "Operação RH"}
                      </p>
                      <Badge color="gold" size="sm" pill className="mt-1">
                        Sincronizado
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase tracking-widest text-zinc-400">Cargo / Função</label>
                  <div className="flex items-center gap-3 rounded-2xl border border-zinc-100 bg-zinc-50/50 p-4 dark:border-white/5 dark:bg-white/5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm dark:bg-[#1a2b4b]">
                      <Briefcase className="text-develoi-navy" size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-zinc-900 dark:text-white">
                        {user.role || "Recrutador"}
                      </p>
                      <p className="text-[10px] font-medium text-zinc-500">Unidade: {user.unit_id || "Geral"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </PanelCard>

            {isEditing && (
              <div className="flex justify-end gap-3 rounded-[32px] bg-zinc-900 p-6 shadow-xl shadow-black/10">
                <div className="mr-auto hidden sm:block">
                  <p className="text-sm font-bold text-white">Alterações não salvas</p>
                  <p className="text-xs text-white/50">Clique em salvar para persistir os dados no servidor.</p>
                </div>
                <Button 
                  variant="ghost" 
                  className="text-white hover:bg-white/10" 
                  onClick={() => setIsEditing(false)}
                >
                  Descartar
                </Button>
                <Button 
                  variant="secondary" 
                  loading={loading}
                  onClick={handleSave}
                >
                  Salvar Perfil
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
