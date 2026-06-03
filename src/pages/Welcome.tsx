import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles, Brain, Briefcase, Zap, ArrowRight,
  Target, Users, BarChart3, CheckCircle2,
} from 'lucide-react';

interface WelcomeProps {
  onComplete: () => void;
}

const STEPS = [
  { icon: Brain,     label: "Aurora AI",         desc: "Motor de análise neural ativo" },
  { icon: Target,    label: "Aderência Neural",   desc: "Matching por função e comportamento" },
  { icon: Users,     label: "Banco de Talentos",  desc: "Pipeline de candidatos pronto" },
  { icon: BarChart3, label: "Analytics RH",       desc: "Indicadores em tempo real" },
];

function useTypingEffect(text: string, speed = 40, delay = 0) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed('');
    setDone(false);
    let i = 0;
    const t = setTimeout(() => {
      const id = setInterval(() => {
        i++;
        setDisplayed(text.slice(0, i));
        if (i >= text.length) { clearInterval(id); setDone(true); }
      }, speed);
      return () => clearInterval(id);
    }, delay);
    return () => clearTimeout(t);
  }, [text, speed, delay]);

  return { displayed, done };
}

export default function Welcome({ onComplete }: WelcomeProps) {
  const storedUser = JSON.parse(localStorage.getItem("auth_user") || "{}");
  const firstName = (storedUser.full_name || "").split(" ")[0] || "Gestor";

  const greeting = `Olá, ${firstName}.`;
  const { displayed: typedGreeting, done: greetingDone } = useTypingEffect(greeting, 55, 600);

  const subtitle = "Tudo pronto para você começar.";
  const { displayed: typedSub } = useTypingEffect(subtitle, 35, greetingDone ? 200 : 9999);

  const [stepsVisible, setStepsVisible] = useState(false);
  const [btnVisible, setBtnVisible] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setStepsVisible(true), 1800);
    const t2 = setTimeout(() => setBtnVisible(true), 2600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden bg-[#060f1e]">

      {/* ── Ambient background ── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.18, 0.32, 0.18] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -right-[20%] -top-[20%] h-[80%] w-[80%] rounded-full bg-develoi-gold/12 blur-[140px]"
        />
        <motion.div
          animate={{ scale: [1.1, 1, 1.1], opacity: [0.12, 0.22, 0.12] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -bottom-[20%] -left-[10%] h-[70%] w-[70%] rounded-full bg-sky-500/10 blur-[140px]"
        />
        {/* Grid dots */}
        <div
          className="absolute inset-0 opacity-[0.018]"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      {/* ── Content ── */}
      <div className="relative z-10 flex w-full max-w-5xl flex-col items-center gap-12 px-6 py-12 text-center lg:flex-row lg:items-center lg:gap-20 lg:text-left">

        {/* LEFT — identity + CTA */}
        <div className="flex flex-col items-center gap-8 lg:flex-1 lg:items-start">

          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 backdrop-blur-md"
          >
            <Sparkles size={11} className="text-develoi-gold animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/60">
              Triagem Smart · Aurora AI
            </span>
          </motion.div>

          {/* Greeting — typing effect */}
          <div className="space-y-3">
            <h1 className="min-h-[1.1em] text-[40px] font-black leading-none tracking-tight text-white sm:text-[52px] lg:text-[60px]">
              {typedGreeting}
              {!greetingDone && (
                <span className="ml-0.5 inline-block h-[0.85em] w-[3px] animate-pulse rounded-full bg-develoi-gold align-middle" />
              )}
            </h1>

            <div className="min-h-[1.6em]">
              {greetingDone && (
                <p className="text-[16px] font-medium text-white/45 sm:text-[18px]">
                  {typedSub}
                  {typedSub.length < subtitle.length && (
                    <span className="ml-0.5 inline-block h-[1em] w-[2px] animate-pulse rounded-full bg-white/30 align-middle" />
                  )}
                </p>
              )}
            </div>
          </div>

          {/* Subtitle copy */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.4, duration: 0.8 }}
            className="max-w-sm text-[13px] font-medium leading-relaxed text-white/35 lg:max-w-none"
          >
            A plataforma está inicializada e pronta. Seus candidatos, vagas e
            análises Aurora AI aguardam você no painel.
          </motion.p>

          {/* CTA */}
          <AnimatePresence>
            {btnVisible && (
              <motion.button
                initial={{ opacity: 0, y: 10, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                onClick={onComplete}
                className="group relative flex items-center gap-3 overflow-hidden rounded-2xl bg-develoi-gold px-8 py-4 text-[12px] font-bold uppercase tracking-[0.2em] text-develoi-navy shadow-2xl shadow-develoi-gold/25 transition-all duration-300 hover:scale-[1.02] hover:shadow-develoi-gold/40"
              >
                <span className="relative z-10">Entrar no Painel</span>
                <ArrowRight size={16} className="relative z-10 transition-transform duration-300 group-hover:translate-x-1" />
                {/* Shine sweep */}
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              </motion.button>
            )}
          </AnimatePresence>

          {/* Status indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.8 }}
            className="flex items-center gap-2"
          >
            <CheckCircle2 size={13} className="text-emerald-400" />
            <span className="text-[11px] font-medium text-white/30">
              Sistema operacional · Aurora AI ativa
            </span>
          </motion.div>
        </div>

        {/* RIGHT — feature cards */}
        <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-2 lg:w-[340px] lg:shrink-0 lg:grid-cols-1 xl:w-[380px]">
          <AnimatePresence>
            {stepsVisible && STEPS.map((step, i) => (
              <motion.div
                key={step.label}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.12, duration: 0.45, ease: "easeOut" }}
                className="group flex items-center gap-3.5 rounded-2xl border border-white/[0.06] bg-white/[0.04] p-4 backdrop-blur-md transition-all duration-300 hover:border-white/10 hover:bg-white/[0.07]"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-develoi-gold/12 text-develoi-gold ring-1 ring-develoi-gold/20 transition-all group-hover:bg-develoi-gold/20">
                  <step.icon size={17} />
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] font-bold text-white">{step.label}</p>
                  <p className="mt-0.5 truncate text-[10px] font-medium text-white/35">{step.desc}</p>
                </div>
                {/* Active dot */}
                <div className="ml-auto flex h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

      </div>

      {/* Bottom copyright */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 3 }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-medium text-white/15"
      >
        © {new Date().getFullYear()} Triagem Smart · Todos os direitos reservados
      </motion.p>

    </div>
  );
}
