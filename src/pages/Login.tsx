import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, ArrowRight, Lock, User, Sparkles } from 'lucide-react';
import { useToast } from '../components/ui/Toast';

interface LoginProps {
  onLogin: (user: any) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (res.ok) {
        const user = await res.json();
        console.log('Login response:', user);
        localStorage.setItem('auth_user', JSON.stringify(user));
        toast.success(`Bem-vindo, ${user.full_name}!`);
        onLogin(user);
      } else {
        const err = await res.json();
        console.warn('Login failed:', err);
        toast.error('Credenciais inválidas. Tente admin / admin');
      }
    } catch (error) {
      toast.error('Erro ao conectar com o servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-develoi-gold/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-develoi-navy/5 blur-[120px] rounded-full" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-zinc-900 rounded-3xl flex items-center justify-center text-develoi-gold mx-auto mb-6 shadow-2xl">
            <ShieldCheck size={32} />
          </div>
          <h1 className="text-3xl font-black text-zinc-900 tracking-tighter uppercase mb-2">Recruitment Hub</h1>
          <p className="text-[10px] font-black text-develoi-gold uppercase tracking-[0.3em] flex items-center justify-center gap-2">
            <Sparkles size={12} /> Powered by Aurora AI
          </p>
        </div>

        <div className="bg-white rounded-[40px] p-10 shadow-2xl shadow-zinc-200/50 border border-zinc-100">
           <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Acesso Administrativo</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                  <input 
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="E-mail ou Usuário"
                    className="w-full pl-12 pr-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl outline-none focus:border-develoi-gold focus:bg-white transition-all font-bold text-sm"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Senha de Segurança</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                  <input 
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-12 pr-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl outline-none focus:border-develoi-gold focus:bg-white transition-all font-bold text-sm"
                    required
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={isLoading}
                className="w-full py-5 bg-zinc-900 text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:bg-develoi-navy transition-all flex items-center justify-center gap-3 shadow-xl shadow-zinc-900/10 active:scale-[0.98] disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Entrar no Dashboard <ArrowRight size={16} />
                  </>
                )}
              </button>
           </form>

           <div className="mt-10 pt-8 border-t border-zinc-50 text-center">
              <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                Protegido pela Tecnologia Develoi &copy; 2024
              </p>
           </div>
        </div>
      </motion.div>
    </div>
  );
}
