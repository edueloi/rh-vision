import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Brain, Briefcase, Zap, ArrowRight, ShieldCheck } from 'lucide-react';

interface WelcomeProps {
  onComplete: () => void;
}

export default function Welcome({ onComplete }: WelcomeProps) {
  useEffect(() => {
    // Auto-complete after animation or let user click
  }, []);

  const features = [
    { icon: <Brain size={24} />, title: "Análise Preditiva", color: "bg-blue-500" },
    { icon: <Zap size={24} />, title: "Triagem Inteligente", color: "bg-amber-500" },
    { icon: <Briefcase size={24} />, title: "Match em Tempo Real", color: "bg-emerald-500" }
  ];

  return (
    <div className="fixed inset-0 z-[200] bg-zinc-950 flex items-center justify-center p-4 md:p-8 overflow-y-auto overflow-x-hidden">
      {/* Aurora Effect Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.4, 0.2],
            rotate: [0, 90, 0]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute top-[-10%] right-[-5%] w-[100%] h-[100%] bg-develoi-gold/10 blur-[180px] rounded-full"
        />
        <motion.div 
          animate={{ 
            scale: [1.2, 1, 1.2],
            opacity: [0.1, 0.3, 0.1],
            rotate: [0, -90, 0]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-[-10%] left-[-5%] w-[90%] h-[90%] bg-develoi-navy/30 blur-[180px] rounded-full"
        />
      </div>

      <div className="w-full max-w-7xl relative z-10 py-12">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-20 items-center">
          <div className="space-y-6 md:space-y-10 text-center lg:text-left relative z-20 max-w-2xl mx-auto lg:mx-0">
             <motion.div 
               initial={{ opacity: 0, y: -20 }}
               animate={{ opacity: 1, y: 0 }}
               className="inline-flex items-center gap-2.5 px-4 py-2 bg-white/5 backdrop-blur-md border border-white/10 rounded-full"
             >
                <Sparkles size={12} className="text-develoi-gold animate-pulse" />
                <span className="text-[9px] md:text-[10px] font-black text-white/70 uppercase tracking-[0.25em]">Tecnologia Develoi AI</span>
             </motion.div>

             <div className="space-y-6">
                <motion.h1 
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.8, ease: "circOut" }}
                  className="text-4xl md:text-6xl lg:text-7xl xl:text-8xl font-black text-white tracking-tighter leading-[0.85]"
                >
                  RECRUITMENT<br />
                  <span className="text-develoi-gold inline-block mt-2">HUB.</span>
                </motion.h1>
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4, duration: 1 }}
                  className="text-white/50 text-sm md:text-base lg:text-lg font-medium leading-relaxed max-w-sm mx-auto lg:mx-0"
                >
                  Bem-vindo à nova era da contratação proativa. 
                  Eu sou <span className="text-white font-black underline decoration-develoi-gold/50 underline-offset-8">Aurora AI</span>, 
                  sua assistente estratégica de talentos.
                </motion.p>
             </div>

             <motion.div
               initial={{ opacity: 0, scale: 0.9 }}
               animate={{ opacity: 1, scale: 1 }}
               transition={{ delay: 0.8 }}
             >
               <button 
                 onClick={onComplete}
                 className="group relative px-8 md:px-12 py-5 bg-develoi-gold text-white font-black uppercase text-[10px] md:text-xs tracking-[0.4em] rounded-2xl hover:bg-white hover:text-develoi-navy transition-all duration-500 flex items-center gap-4 mx-auto lg:mx-0 shadow-2xl shadow-develoi-gold/20 overflow-hidden"
               >
                  <span className="relative z-10">Iniciar Expediente</span>
                  <ArrowRight size={18} className="relative z-10 group-hover:translate-x-2 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-white translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
               </button>
             </motion.div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4 md:gap-5 relative z-10">
             {features.map((feature, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + (idx * 0.15), duration: 0.8 }}
                  className="bg-white/5 backdrop-blur-2xl border border-white/5 p-6 md:p-8 rounded-[32px] flex items-center gap-6 group hover:bg-white/10 hover:border-white/10 transition-all duration-500 cursor-default"
                >
                   <div className={`${feature.color} w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-black/20 group-hover:scale-110 transition-transform duration-500`}>
                      {React.cloneElement(feature.icon as React.ReactElement, { size: 28 })}
                   </div>
                   <div>
                      <h3 className="text-base md:text-lg font-black text-white uppercase tracking-tight group-hover:text-develoi-gold transition-colors">{feature.title}</h3>
                      <p className="text-white/40 text-[9px] font-bold uppercase tracking-widest mt-1.5 opacity-60 group-hover:opacity-100 transition-opacity">Powered by Aurora AI</p>
                   </div>
                </motion.div>
             ))}

             <motion.div 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 1.2 }}
               className="md:col-span-2 lg:col-span-1 p-6 md:p-8 bg-develoi-navy/20 backdrop-blur-xl border border-develoi-navy/30 rounded-[32px] flex items-start gap-5"
             >
                <div className="w-10 h-10 shrink-0 bg-white/5 rounded-xl flex items-center justify-center text-develoi-gold border border-white/5">
                   <ShieldCheck size={20} />
                </div>
                <div>
                   <p className="text-[10px] md:text-xs font-medium text-white/50 leading-relaxed italic">
                     "Infraestrutura SQLite inicializada com sucesso. Sistema pronto para operação em escala."
                   </p>
                   <p className="text-[8px] font-black text-develoi-gold uppercase tracking-widest mt-2">Status: Sistema Online</p>
                </div>
             </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
