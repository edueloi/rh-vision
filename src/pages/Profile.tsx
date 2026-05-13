import React, { useState } from "react";
import { User, Mail, ShieldCheck, Camera } from "lucide-react";
import { cn } from "../lib/utils";

export default function Profile() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-zinc-200 bg-white px-6 py-6 sm:px-10 dark:bg-develoi-navy dark:border-white/5">
        <h1 className="text-2xl font-black tracking-tight text-develoi-navy dark:text-white">
          Meu Perfil
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-white/40">
          Gerencie suas informações pessoais e foto de perfil.
        </p>
      </div>

      <div className="flex-1 overflow-auto bg-zinc-50 dark:bg-[#071325] p-6 sm:p-10">
        <div className="mx-auto max-w-3xl space-y-6">
          
          {/* Avatar Section */}
          <div className="flex items-center gap-6 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:bg-[#0d1b3e]/40 dark:border-white/10 dark:backdrop-blur-sm">
            <div className="relative group cursor-pointer">
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-zinc-50 bg-zinc-100 text-zinc-400 dark:border-white/10 dark:bg-white/5 dark:text-white/20">
                {user.photo_url ? (
                  <img src={user.photo_url} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  <User size={40} />
                )}
              </div>
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                <Camera className="text-white" size={24} />
              </div>
              <div className="absolute -bottom-2 -right-2 rounded-full border-4 border-white bg-develoi-gold p-1.5 text-white shadow-sm dark:border-[#0d1b3e]">
                <Camera size={14} />
              </div>
            </div>
            <div>
              <h2 className="text-xl font-bold text-develoi-navy dark:text-white">{user.full_name || "Seu Nome"}</h2>
              <p className="text-sm font-medium text-zinc-500 dark:text-white/40">{user.access_profile || "Operação"}</p>
              <div className="mt-3 flex gap-2">
                <button className="rounded-xl bg-develoi-navy px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-develoi-navy/90 dark:bg-develoi-gold dark:hover:bg-develoi-gold/90">
                  Alterar Foto
                </button>
                <button className="rounded-xl bg-zinc-100 px-4 py-2 text-xs font-bold text-zinc-600 transition-colors hover:bg-zinc-200 dark:bg-white/5 dark:text-white/60 dark:hover:bg-white/10">
                  Remover
                </button>
              </div>
            </div>
          </div>

          {/* Info Section */}
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:bg-[#0d1b3e]/40 dark:border-white/10 dark:backdrop-blur-sm">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-lg font-bold text-develoi-navy dark:text-white">Informações Pessoais</h3>
              <button 
                onClick={() => setIsEditing(!isEditing)}
                className="text-xs font-bold text-develoi-gold hover:text-develoi-gold/80"
              >
                {isEditing ? "Salvar" : "Editar"}
              </button>
            </div>
            
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-white/30">
                  Nome Completo
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-white/20" size={16} />
                  <input
                    type="text"
                    disabled={!isEditing}
                    defaultValue={user.full_name}
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2.5 pl-10 pr-4 text-sm font-medium text-develoi-navy outline-none focus:border-develoi-gold focus:ring-1 focus:ring-develoi-gold disabled:opacity-70 dark:bg-white/5 dark:border-white/10 dark:text-white dark:focus:border-develoi-gold"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-white/30">
                  E-mail
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-white/20" size={16} />
                  <input
                    type="email"
                    disabled={!isEditing}
                    defaultValue={user.email}
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2.5 pl-10 pr-4 text-sm font-medium text-develoi-navy outline-none focus:border-develoi-gold focus:ring-1 focus:ring-develoi-gold disabled:opacity-70 dark:bg-white/5 dark:border-white/10 dark:text-white dark:focus:border-develoi-gold"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-white/30">
                  Perfil de Acesso
                </label>
                <div className="relative">
                  <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-white/20" size={16} />
                  <input
                    type="text"
                    disabled
                    defaultValue={user.access_profile}
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-100 py-2.5 pl-10 pr-4 text-sm font-medium text-zinc-500 outline-none dark:bg-white/5 dark:border-white/10 dark:text-white/50"
                  />
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
