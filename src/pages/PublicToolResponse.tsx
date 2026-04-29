import React, { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { 
  ClipboardCheck, 
  User, 
  Mail, 
  Phone, 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft,
  Loader2,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/src/lib/utils";

export default function PublicToolResponse() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const jobId = searchParams.get('jobId');

  const [tool, setTool] = useState<any>(null);
  const [step, setStep] = useState<'info' | 'questions' | 'success'>('info');
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [candidateInfo, setCandidateInfo] = useState({
    full_name: '',
    email: '',
    phone: ''
  });

  const [answers, setAnswers] = useState<Record<number, any>>({});

  useEffect(() => {
    fetchTool();
  }, [slug]);

  const fetchTool = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/public/hr-tools/${slug}`);
      if (!res.ok) throw new Error("Ferramenta não encontrada ou inativa.");
      const data = await res.json();
      setTool(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidateInfo.full_name || !candidateInfo.email) return;
    setStep('questions');
  };

  const handleAnswerChange = (questionId: number, value: any) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      const formattedAnswers = Object.entries(answers).map(([id, val]) => ({
        question_id: parseInt(id),
        value: val
      }));

      const res = await fetch(`/api/public/hr-tools/${slug}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateInfo,
          answers: formattedAnswers,
          jobId
        })
      });

      if (res.ok) {
        setStep('success');
      } else {
        alert("Ocorreu um erro ao enviar suas respostas.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
        <Loader2 className="w-10 h-10 text-zinc-900 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-[32px] border border-zinc-200 shadow-xl max-w-md text-center">
           <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
           <h1 className="text-xl font-black text-zinc-900 mb-2">Ops! Alguma coisa deu errado</h1>
           <p className="text-zinc-500 font-bold text-sm mb-6 uppercase tracking-widest">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-4 py-12">
      {/* Branding */}
      <div className="mb-12 flex items-center gap-2">
        <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center text-white">
          <ClipboardCheck size={24} />
        </div>
        <span className="text-xl font-black text-zinc-900 tracking-tighter">Nexus AI <span className="text-blue-600">Recruitment</span></span>
      </div>

      <div className="w-full max-w-xl mx-auto">
        <AnimatePresence mode="wait">
          {step === 'info' && (
            <motion.div 
              key="info"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-[40px] p-8 md:p-12 shadow-2xl shadow-zinc-200 border border-zinc-100"
            >
              <h2 className="text-2xl font-black text-zinc-900 mb-2 tracking-tight">{tool?.name}</h2>
              <p className="text-zinc-500 text-sm font-bold mb-8 uppercase tracking-widest opacity-70">Preencha seus dados para começar a avaliação</p>

              <form onSubmit={handleInfoSubmit} className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Nome Completo</label>
                    <div className="relative">
                       <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                       <input 
                         required
                         type="text" 
                         value={candidateInfo.full_name}
                         onChange={e => setCandidateInfo(p => ({ ...p, full_name: e.target.value }))}
                         placeholder="Seu nome"
                         className="w-full pl-12 pr-4 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl outline-none focus:border-zinc-900 focus:ring-4 focus:ring-zinc-900/5 transition-all text-sm font-bold"
                       />
                    </div>
                 </div>

                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">E-mail Corporativo</label>
                    <div className="relative">
                       <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                       <input 
                         required
                         type="email" 
                         value={candidateInfo.email}
                         onChange={e => setCandidateInfo(p => ({ ...p, email: e.target.value }))}
                         placeholder="seu@email.com"
                         className="w-full pl-12 pr-4 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl outline-none focus:border-zinc-900 focus:ring-4 focus:ring-zinc-900/5 transition-all text-sm font-bold"
                       />
                    </div>
                 </div>

                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Telefone / WhatsApp</label>
                    <div className="relative">
                       <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                       <input 
                         type="tel" 
                         value={candidateInfo.phone}
                         onChange={e => setCandidateInfo(p => ({ ...p, phone: e.target.value }))}
                         placeholder="(00) 00000-0000"
                         className="w-full pl-12 pr-4 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl outline-none focus:border-zinc-900 focus:ring-4 focus:ring-zinc-900/5 transition-all text-sm font-bold"
                       />
                    </div>
                 </div>

                 <button 
                   type="submit"
                   className="w-full py-5 bg-zinc-900 text-white rounded-[24px] text-xs font-black uppercase tracking-widest hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 group"
                 >
                   Iniciar Avaliação
                   <ChevronRight size={18} className="transition-transform group-hover:translate-x-1" />
                 </button>
              </form>
            </motion.div>
          )}

          {step === 'questions' && tool && (
            <motion.div 
              key="questions"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white rounded-[40px] p-8 md:p-12 shadow-2xl shadow-zinc-200 border border-zinc-100 min-h-[400px] flex flex-col"
            >
              <div className="flex items-center justify-between mb-8">
                 <div className="flex flex-col">
                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Questão {currentQuestionIdx + 1} de {tool.questions.length}</span>
                    <div className="w-32 h-1.5 bg-zinc-100 rounded-full mt-2 overflow-hidden">
                       <div 
                         className="h-full bg-zinc-900 transition-all duration-300" 
                         style={{ width: `${((currentQuestionIdx + 1) / tool.questions.length) * 100}%` }} 
                       />
                    </div>
                 </div>
                 <button 
                  onClick={() => setStep('info')}
                  className="p-2 text-zinc-400 hover:text-zinc-900"
                 >
                   <ChevronLeft size={20} />
                 </button>
              </div>

              <div className="flex-1 flex flex-col justify-center mb-8">
                <h3 className="text-xl font-black text-zinc-900 mb-6 leading-tight">
                  {tool.questions[currentQuestionIdx].question_text}
                </h3>

                <div className="space-y-3">
                   {tool.questions[currentQuestionIdx].question_type === 'text' && (
                     <input 
                        autoFocus
                        type="text" 
                        value={answers[tool.questions[currentQuestionIdx].id] || ''}
                        onChange={e => handleAnswerChange(tool.questions[currentQuestionIdx].id, e.target.value)}
                        className="w-full px-6 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl outline-none focus:border-zinc-900 transition-all font-bold"
                        placeholder="Sua resposta..."
                     />
                   )}
                   
                   {tool.questions[currentQuestionIdx].question_type === 'yes-no' && (
                     <div className="grid grid-cols-2 gap-4">
                        {['Sim', 'Não'].map(opt => (
                          <button
                            key={opt}
                            onClick={() => handleAnswerChange(tool.questions[currentQuestionIdx].id, opt)}
                            className={cn(
                              "py-5 border-2 rounded-2xl font-black uppercase tracking-widest text-xs transition-all",
                              answers[tool.questions[currentQuestionIdx].id] === opt ? "bg-zinc-900 border-zinc-900 text-white" : "bg-white border-zinc-100 text-zinc-400 hover:border-zinc-300"
                            )}
                          >
                            {opt}
                          </button>
                        ))}
                     </div>
                   )}

                   {/* Add more types as needed */}
                   {(tool.questions[currentQuestionIdx].question_type === 'scale-5' || tool.questions[currentQuestionIdx].question_type === 'scale-10') && (
                      <div className="flex justify-between gap-2">
                        {Array.from({ length: tool.questions[currentQuestionIdx].question_type === 'scale-5' ? 5 : 10 }).map((_, i) => {
                          const val = i + 1;
                          return (
                            <button
                              key={val}
                              onClick={() => handleAnswerChange(tool.questions[currentQuestionIdx].id, val)}
                              className={cn(
                                "flex-1 aspect-square md:aspect-auto md:py-4 border-2 rounded-xl md:rounded-2xl font-black text-xs transition-all flex items-center justify-center",
                                answers[tool.questions[currentQuestionIdx].id] === val ? "bg-zinc-900 border-zinc-900 text-white scale-110 shadow-lg shadow-zinc-900/20" : "bg-white border-zinc-100 text-zinc-400 hover:border-zinc-300"
                              )}
                            >
                              {val}
                            </button>
                          );
                        })}
                      </div>
                   )}
                </div>
              </div>

              <div className="flex gap-4">
                 {currentQuestionIdx > 0 && (
                   <button 
                     onClick={() => setCurrentQuestionIdx(p => p - 1)}
                     className="flex-1 py-4 border-2 border-zinc-200 text-zinc-900 rounded-[20px] text-[10px] font-black uppercase tracking-widest hover:border-zinc-900 transition-all flex items-center justify-center gap-2"
                   >
                     Anterior
                   </button>
                 )}

                 {currentQuestionIdx < tool.questions.length - 1 ? (
                   <button 
                     disabled={!answers[tool.questions[currentQuestionIdx].id]}
                     onClick={() => setCurrentQuestionIdx(p => p + 1)}
                     className="flex-[2] py-4 bg-zinc-900 text-white rounded-[20px] text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                   >
                     Próxima
                     <ChevronRight size={16} />
                   </button>
                 ) : (
                   <button 
                     disabled={!answers[tool.questions[currentQuestionIdx].id] || isSubmitting}
                     onClick={handleSubmit}
                     className="flex-[2] py-4 bg-blue-600 text-white rounded-[20px] text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                   >
                     {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 size={16} />}
                     Finalizar Avaliação
                   </button>
                 )}
              </div>
            </motion.div>
          )}

          {step === 'success' && (
            <motion.div 
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-[40px] p-8 md:p-12 shadow-2xl shadow-zinc-200 border border-zinc-100 text-center"
            >
              <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-8">
                 <CheckCircle2 size={40} />
              </div>
              <h2 className="text-2xl font-black text-zinc-900 mb-4 tracking-tight">Avaliação Concluída!</h2>
              <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest opacity-70 mb-12">
                Obrigado por participar, {candidateInfo.full_name.split(' ')[0]}. Seus dados foram enviados com sucesso para nosso RH.
              </p>
              
              <div className="p-6 bg-zinc-50 rounded-3xl mb-8">
                 <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1 text-left">Próximos Passos</h4>
                 <p className="text-xs font-bold text-zinc-600 text-left leading-relaxed">
                   Nossa equipe analisará seu perfil e entrará em contato caso seu bafit esteja alinhado com o que buscamos para o time Fadel.
                 </p>
              </div>

              <button 
                 onClick={() => window.location.href = tool.company_url || 'https://fadeltransportes.com.br'}
                 className="w-full py-5 border-2 border-zinc-200 text-zinc-900 rounded-[24px] text-xs font-black uppercase tracking-widest hover:border-zinc-900 transition-all"
              >
                Visitar nosso site
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="mt-20 text-center opacity-40">
         <p className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.3em]">Ambiente Seguro & Protegido por Nexus AI</p>
      </div>
    </div>
  );
}
