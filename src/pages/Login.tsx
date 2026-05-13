import React, { useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, Lock, ShieldCheck, Sparkles, User } from "lucide-react";
import { Button, Input, PanelCard, useToast } from "../components/ui";

interface LoginProps {
  onLogin: (user: any) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        const user = await res.json();
        localStorage.setItem("auth_user", JSON.stringify(user));
        toast.success(`Bem-vindo, ${user.full_name}!`);
        onLogin(user);
      } else {
        toast.error("Credenciais inválidas. Tente admin / admin");
      }
    } catch {
      toast.error("Erro ao conectar com o servidor.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-50 p-6">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-10%] top-[-10%] h-[50%] w-[50%] rounded-full bg-develoi-gold/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] h-[50%] w-[50%] rounded-full bg-develoi-navy/5 blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="mb-10 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-zinc-900 text-develoi-gold shadow-2xl">
            <ShieldCheck size={32} />
          </div>
          <h1 className="mb-2 text-3xl font-black uppercase tracking-tighter text-zinc-900">
            Recruitment Hub
          </h1>
          <p className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-develoi-gold">
            <Sparkles size={12} /> Powered by Aurora AI
          </p>
        </div>

        <PanelCard
          className="rounded-[40px] border-zinc-100 shadow-2xl shadow-zinc-200/50"
          contentClassName="p-10"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="Acesso Administrativo"
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="E-mail ou Usuário"
              icon={<User size={18} />}
              required
              className="h-14 rounded-2xl border-zinc-100 bg-zinc-50 pl-12 pr-4 text-sm font-bold focus-visible:border-develoi-gold focus-visible:ring-develoi-gold/20 focus-visible:bg-white"
            />

            <Input
              label="Senha de Segurança"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              icon={<Lock size={18} />}
              required
              className="h-14 rounded-2xl border-zinc-100 bg-zinc-50 pl-12 pr-4 text-sm font-bold focus-visible:border-develoi-gold focus-visible:ring-develoi-gold/20 focus-visible:bg-white"
            />

            <Button
              type="submit"
              loading={isLoading}
              fullWidth
              size="lg"
              iconRight={<ArrowRight size={16} />}
              className="h-14 rounded-2xl border-zinc-900 bg-zinc-900 text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-zinc-900/10 hover:border-develoi-navy hover:bg-develoi-navy"
            >
              Entrar no Dashboard
            </Button>
          </form>

          <div className="mt-10 border-t border-zinc-50 pt-8 text-center">
            <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">
              Protegido pela Tecnologia Aurora AI &copy; 2024
            </p>
          </div>
        </PanelCard>
      </motion.div>
    </div>
  );
}
