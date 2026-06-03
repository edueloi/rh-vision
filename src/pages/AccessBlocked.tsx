import React from 'react';
import { motion } from 'motion/react';
import { ShieldX, Clock, Mail, ArrowRight, AlertTriangle } from 'lucide-react';

interface AccessBlockedProps {
  code: 'TENANT_EXPIRED' | 'TENANT_SUSPENDED';
  expiredAt?: string;
  onLogout: () => void;
}

export default function AccessBlocked({ code, expiredAt, onLogout }: AccessBlockedProps) {
  const isExpired = code === 'TENANT_EXPIRED';
  const expDate = expiredAt ? new Date(expiredAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-[#060f1e] p-6">
      {/* Background blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.15, 0.25, 0.15] }}
          transition={{ duration: 8, repeat: Infinity }}
          className="absolute -right-32 -top-32 h-80 w-80 rounded-full bg-rose-500/12 blur-3xl"
        />
        <motion.div
          animate={{ scale: [1.1, 1, 1.1], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 10, repeat: Infinity }}
          className="absolute -bottom-32 -left-20 h-72 w-72 rounded-full bg-amber-500/8 blur-3xl"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Icon */}
        <div className="mb-8 flex justify-center">
          <div className={`flex h-20 w-20 items-center justify-center rounded-3xl shadow-2xl ${isExpired ? 'bg-amber-500/15 ring-2 ring-amber-500/25' : 'bg-rose-500/15 ring-2 ring-rose-500/25'}`}>
            {isExpired
              ? <Clock size={36} className="text-amber-400" />
              : <ShieldX size={36} className="text-rose-400" />}
          </div>
        </div>

        {/* Content */}
        <div className="text-center space-y-4 mb-8">
          <h1 className="text-[28px] font-black tracking-tight text-white">
            {isExpired ? 'Acesso expirado' : 'Acesso suspenso'}
          </h1>

          {isExpired ? (
            <div className="space-y-2">
              <p className="text-[15px] font-medium text-white/50 leading-relaxed">
                Seu período de acesso à plataforma encerrou
                {expDate && <span className="text-white/70 font-semibold"> em {expDate}</span>}.
              </p>
              <p className="text-[13px] text-white/35 leading-relaxed">
                Para renovar o acesso, entre em contato com o administrador da plataforma.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-[15px] font-medium text-white/50 leading-relaxed">
                Sua conta foi temporariamente suspensa pelo administrador.
              </p>
              <p className="text-[13px] text-white/35 leading-relaxed">
                Entre em contato para verificar o motivo e regularizar o acesso.
              </p>
            </div>
          )}
        </div>

        {/* Warning box */}
        <div className={`mb-6 flex items-start gap-3 rounded-2xl border p-4 ${isExpired ? 'border-amber-500/20 bg-amber-500/8' : 'border-rose-500/20 bg-rose-500/8'}`}>
          <AlertTriangle size={16} className={`mt-0.5 shrink-0 ${isExpired ? 'text-amber-400' : 'text-rose-400'}`} />
          <p className="text-[12px] font-medium text-white/50 leading-relaxed">
            {isExpired
              ? 'Todos os dados foram preservados. Após a renovação, o acesso será restaurado imediatamente.'
              : 'Seus dados estão seguros. O acesso pode ser reativado pelo administrador a qualquer momento.'}
          </p>
        </div>

        {/* Contact button */}
        <a
          href="mailto:contato@triagemsmart.com.br"
          className="group mb-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-develoi-gold px-6 py-4 text-[13px] font-bold text-develoi-navy shadow-xl shadow-develoi-gold/20 transition-all hover:scale-[1.02]"
        >
          <Mail size={16} />
          Solicitar renovação de acesso
          <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
        </a>

        {/* Logout */}
        <button
          onClick={onLogout}
          className="w-full rounded-xl py-3 text-[12px] font-medium text-white/30 transition-colors hover:text-white/60"
        >
          Sair da conta
        </button>
      </motion.div>
    </div>
  );
}
