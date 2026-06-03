import React, { useState } from "react";
import { motion } from "motion/react";
import {
  ArrowRight, Lock, Mail, Sparkles, Brain,
  Users, Target, Zap, CheckCircle2, Eye, EyeOff,
} from "lucide-react";
import { useToast } from "../components/ui";

interface LoginProps {
  onLogin: (user: any) => void;
}

const FEATURES = [
  { icon: Brain,   label: "Aurora AI",         desc: "Triagem inteligente de candidatos com IA" },
  { icon: Target,  label: "Aderência Neural",   desc: "Matching preciso por função e perfil DISC" },
  { icon: Users,   label: "Banco de Talentos",  desc: "Gestão completa do pipeline de recrutamento" },
  { icon: Zap,     label: "Importação em Lote", desc: "Upload de CVs com extração automática" },
];

export default function Login({ onLogin }: LoginProps) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
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
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("auth_user", JSON.stringify(data));
        toast.success(`Bem-vindo, ${data.full_name}!`);
        onLogin(data);
      } else if (res.status === 403) {
        // Tenant expirado ou suspenso — mostrar mensagem clara
        if (data.code === 'TENANT_EXPIRED') {
          const expDate = data.expired_at ? new Date(data.expired_at).toLocaleDateString('pt-BR') : '';
          toast.error(`Acesso expirado${expDate ? ` em ${expDate}` : ''}. Entre em contato com o administrador.`, { duration: 8000 } as any);
        } else if (data.code === 'TENANT_SUSPENDED') {
          toast.error('Acesso suspenso. Entre em contato com o administrador.', { duration: 8000 } as any);
        } else {
          toast.error(data.error || 'Acesso negado.');
        }
      } else {
        toast.error("Credenciais inválidas.");
      }
    } catch {
      toast.error("Erro ao conectar com o servidor.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#060f1e]">

      {/* ── LEFT PANEL — Branding ─────────────────────────────────────── */}
      <div className="relative hidden overflow-hidden lg:flex lg:w-[52%] lg:flex-col lg:justify-between lg:p-12 xl:p-16">
        {/* Background blobs */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-develoi-gold/8 blur-3xl" />
          <div className="absolute -bottom-32 -right-16 h-80 w-80 rounded-full bg-sky-500/8 blur-3xl" />
          <div className="absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 rounded-full bg-violet-500/5 blur-3xl" />
        </div>

        {/* Subtle grid overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-white shadow-lg">
            <img src="/icon_logo_recruteia.png" alt="Triagem Smart" className="h-7 w-7 object-contain" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-develoi-gold/80">Triagem Smart</p>
            <p className="text-[9px] font-medium uppercase tracking-[0.16em] text-white/30">Recrutamento Inteligente</p>
          </div>
        </div>

        {/* Hero copy */}
        <div className="relative z-10 max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-develoi-gold/25 bg-develoi-gold/10 px-4 py-1.5">
              <Sparkles size={12} className="text-develoi-gold" />
              <span className="text-[11px] font-semibold text-develoi-gold">Powered by Aurora AI</span>
            </div>

            <h1 className="mb-4 text-[40px] font-black leading-[1.1] tracking-tight text-white xl:text-[48px]">
              Recrutamento<br />
              <span className="text-develoi-gold">mais inteligente.</span>
            </h1>

            <p className="mb-8 text-[14px] font-medium leading-relaxed text-white/50">
              Treine e escale seu processo seletivo com inteligência artificial
              que aprende com a sua operação.
            </p>

            {/* Feature list */}
            <div className="space-y-3">
              {FEATURES.map((f, i) => (
                <motion.div
                  key={f.label}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.1, duration: 0.4 }}
                  className="flex items-center gap-3"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 ring-1 ring-white/8">
                    <f.icon size={14} className="text-develoi-gold/80" />
                  </div>
                  <div>
                    <span className="text-[12px] font-semibold text-white/80">{f.label}</span>
                    <span className="text-[12px] text-white/35"> — {f.desc}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Bottom attribution */}
        <div className="relative z-10">
          <p className="text-[10px] font-medium text-white/20">
            © {new Date().getFullYear()} Triagem Smart · Todos os direitos reservados
          </p>
        </div>
      </div>

      {/* ── RIGHT PANEL — Form ────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col items-center justify-center bg-[#f8fafc] p-6 sm:p-10 lg:p-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="w-full max-w-sm"
        >
          {/* Mobile logo */}
          <div className="mb-8 flex flex-col items-center gap-3 lg:hidden">
            <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-develoi-navy shadow-lg">
              <img src="/icon_logo_recruteia.png" alt="Triagem Smart" className="h-9 w-9 object-contain" />
            </div>
            <div className="text-center">
              <h1 className="text-[22px] font-black tracking-tight text-zinc-900">
                Triagem <span className="text-develoi-gold">Smart</span>
              </h1>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-400">
                Recrutamento Inteligente
              </p>
            </div>
          </div>

          {/* Form header */}
          <div className="mb-8">
            <h2 className="text-[22px] font-black tracking-tight text-zinc-900">
              Bem-vindo de volta
            </h2>
            <p className="mt-1 text-[13px] font-medium text-zinc-500">
              Entre com suas credenciais para acessar a plataforma.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                E-mail
              </label>
              <div className="relative">
                <Mail size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  autoFocus
                  autoComplete="username"
                  className="h-12 w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-4 text-[13px] font-medium text-zinc-900 outline-none transition-all placeholder:text-zinc-400 focus:border-develoi-navy/50 focus:ring-2 focus:ring-develoi-navy/10"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                Senha
              </label>
              <div className="relative">
                <Lock size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="h-12 w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-10 text-[13px] font-medium text-zinc-900 outline-none transition-all placeholder:text-zinc-400 focus:border-develoi-navy/50 focus:ring-2 focus:ring-develoi-navy/10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  title={showPw ? "Ocultar senha" : "Mostrar senha"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 transition-colors hover:text-zinc-600"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading || !email || !password}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-develoi-navy text-[13px] font-bold text-white shadow-lg shadow-develoi-navy/20 transition-all hover:bg-[#0a1e3a] hover:shadow-develoi-navy/30 disabled:opacity-50"
            >
              {isLoading ? (
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <>
                  Entrar na plataforma
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 border-t border-zinc-200" />
            <span className="text-[10px] font-medium text-zinc-400">SEGURANÇA</span>
            <div className="flex-1 border-t border-zinc-200" />
          </div>

          {/* Security badges */}
          <div className="flex flex-col gap-2">
            {[
              { icon: CheckCircle2, text: "Conexão criptografada SSL/TLS", color: "text-emerald-500" },
              { icon: Sparkles,     text: "Protegido pela Aurora AI Engine", color: "text-develoi-gold" },
            ].map((b) => (
              <div key={b.text} className="flex items-center gap-2.5">
                <b.icon size={13} className={b.color} />
                <span className="text-[11px] font-medium text-zinc-500">{b.text}</span>
              </div>
            ))}
          </div>

          {/* Footer */}
          <p className="mt-8 text-center text-[10px] font-medium text-zinc-400">
            © {new Date().getFullYear()} Triagem Smart · Todos os direitos reservados
          </p>
        </motion.div>
      </div>

    </div>
  );
}
