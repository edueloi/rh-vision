import React, { useState, useEffect, useRef } from 'react';
import { 
  Brain, 
  Sparkles, 
  Bot, 
  Cpu, 
  Zap, 
  Send, 
  Search, 
  Filter, 
  ArrowRight,
  User,
  Briefcase,
  Target,
  BarChart3,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  ExternalLink,
  ChevronDown,
  History,
  Settings as SettingsIcon,
  MessageSquare,
  X,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { useUnit } from '@/src/lib/useUnit';
import { useToast } from '@/src/components/ui/Toast';
import { PanelCard } from '@/src/components/ui/PanelCard';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  results?: MatchResult[];
}

interface MatchResult {
  candidate_id: number;
  full_name: string;
  city: string;
  state: string;
  desired_position: string;
  compatibility_score: number;
  classification: string;
  distance_km?: number;
  has_disc: boolean;
  disc_profile: string;
  strengths: string[];
  attention_points: string[];
  recommendation_reason: string;
  risk_reason: string;
}

export default function NexusAI() {
  const { currentUnit } = useUnit();
  const toast = useToast();
  const [activeView, setActiveView] = useState<'chat' | 'match' | 'history'>('chat');
  const [chatMessages, setChatMessages] = useState<Message[]>([
    { 
      id: '1', 
      role: 'assistant', 
      content: 'Olá! Eu sou o Nexus AI. Como posso ajudar com seu recrutamento hoje? Posso encontrar candidatos, comparar currículos ou analisar perfis comportamentais.',
      timestamp: new Date().toISOString()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Search/Match state
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [jobs, setJobs] = useState<any[]>([]);
  const [matchResults, setMatchResults] = useState<MatchResult[]>([]);
  const [isMatching, setIsMatching] = useState(false);
  const [matchSummary, setMatchSummary] = useState('');
  const [sessions, setSessions] = useState<any[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);

  // Config Match state
  const [precisionMode, setPrecisionMode] = useState('Equilibrada');
  const [minScore, setMinScore] = useState(70);
  const [maxResults, setMaxResults] = useState(20);
  const [radius, setRadius] = useState(50);
  const [locationRule, setLocationRule] = useState('Peso médio');
  const [onlyWithResume, setOnlyWithResume] = useState(false);
  const [onlyWithDisc, setOnlyWithDisc] = useState(false);

  // Comparison state
  const [comparingCandidates, setComparingCandidates] = useState<MatchResult[]>([]);
  const [showComparison, setShowComparison] = useState(false);

  // Settings Modal state
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    fetchJobs();
    fetchSessions();
    fetchSettings();
  }, [currentUnit]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages, isTyping]);

  const fetchJobs = async () => {
    try {
      const res = await fetch(`/api/jobs?tenantId=fadel&unitId=${currentUnit.id}&status=Aberta`);
      const data = await res.json();
      setJobs(data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchSessions = async () => {
    setIsLoadingSessions(true);
    try {
      const res = await fetch(`/api/nexus-ai/sessions?tenantId=fadel&unitId=${currentUnit.id}`);
      const data = await res.json();
      setSessions(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch(`/api/nexus-ai/settings?tenantId=fadel&unitId=${currentUnit.id}`);
      const data = await res.json();
      setSettings(data);
      if (data) {
        setPrecisionMode(data.default_precision_mode || 'Equilibrada');
        setMinScore(data.default_compatibility_threshold || 70);
        setMaxResults(data.default_max_results || 20);
        setRadius(data.default_distance_radius_km || 50);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const saveSettings = async (newSettings: any) => {
    try {
      const res = await fetch('/api/nexus-ai/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newSettings,
          tenant_id: 'fadel',
          unit_id: currentUnit.id
        })
      });
      if (res.ok) {
        toast.success('Configurações salvas!');
        setShowSettings(false);
        fetchSettings();
      }
    } catch (error) {
      toast.error('Erro ao salvar configurações');
    }
  };

  const toggleComparison = (candidate: MatchResult) => {
    setComparingCandidates(prev => {
      const exists = prev.find(c => c.candidate_id === candidate.candidate_id);
      if (exists) {
        return prev.filter(c => c.candidate_id !== candidate.candidate_id);
      }
      if (prev.length >= 3) {
        toast.error('Você pode comparar no máximo 3 candidatos por vez');
        return prev;
      }
      return [...prev, candidate];
    });
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString()
    };

    setChatMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setIsTyping(true);

    try {
      const res = await fetch('/api/nexus-ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: inputMessage,
          tenantId: 'fadel',
          unitId: currentUnit.id
        })
      });
      const data = await res.json();
      
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message,
        timestamp: new Date().toISOString()
      };
      setChatMessages(prev => [...prev, assistantMsg]);
    } catch (error) {
      toast.error('Erro ao processar mensagem');
    } finally {
      setIsTyping(false);
    }
  };

  const executeMatch = async () => {
    if (!selectedJobId) {
      toast.error('Selecione uma vaga primeiro');
      return;
    }

    setIsMatching(true);
    setMatchResults([]);
    
    try {
      const res = await fetch('/api/nexus-ai/match-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: selectedJobId,
          tenantId: 'fadel',
          unitId: currentUnit.id,
          precisionMode,
          minScore,
          maxResults,
          radius,
          locationRule,
          onlyWithResume,
          onlyWithDisc
        })
      });
      const data = await res.json();
      setMatchResults(data.results || []);
      setMatchSummary(data.summary || '');
      toast.success('Análise concluída!');
    } catch (error) {
      toast.error('Erro ao realizar match de vaga');
    } finally {
      setIsMatching(false);
    }
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-zinc-900 text-white rounded-xl">
              <Brain size={24} />
            </div>
            <h1 className="text-3xl font-black text-zinc-900 tracking-tighter">Nexus AI</h1>
            <div className="px-3 py-1 bg-fadel-blue/10 text-fadel-blue text-[10px] font-black uppercase tracking-widest rounded-full">
              Intelligent Core
            </div>
          </div>
          <p className="text-sm font-bold text-zinc-500 max-w-xl">
            Assistente inteligente para compatibilidade de vagas, análise comportamental e busca estratégica de talentos.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-white p-1 rounded-2xl border border-zinc-200 shadow-sm">
          <button 
            onClick={() => setActiveView('chat')}
            className={cn(
              "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              activeView === 'chat' ? "bg-zinc-900 text-white" : "text-zinc-500 hover:text-zinc-900"
            )}
          >
            <div className="flex items-center gap-2">
              <MessageSquare size={14} />
              Conversa
            </div>
          </button>
          <button 
            onClick={() => setActiveView('match')}
            className={cn(
              "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              activeView === 'match' ? "bg-zinc-900 text-white" : "text-zinc-500 hover:text-zinc-900"
            )}
          >
            <div className="flex items-center gap-2">
              <Target size={14} />
              Match de Vaga
            </div>
          </button>
          <button 
            onClick={() => setActiveView('history')}
            className={cn(
              "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              activeView === 'history' ? "bg-zinc-900 text-white" : "text-zinc-500 hover:text-zinc-900"
            )}
          >
            <div className="flex items-center gap-2">
              <History size={14} />
              Histórico
            </div>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Main View */}
        <div className="lg:col-span-8 space-y-8">
          {activeView === 'chat' && (
            <div className="bg-white rounded-3xl border border-zinc-200 shadow-xl shadow-zinc-200/20 flex flex-col h-[600px] overflow-hidden">
              <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-zinc-900 text-white rounded-xl flex items-center justify-center">
                    <Bot size={18} />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-zinc-900 uppercase tracking-widest">Nexus AI Chat</h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Online e Pronto</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-2 text-zinc-400 hover:text-zinc-900 transition-colors">
                    <MoreVertical size={18} />
                  </button>
                </div>
              </div>

              <div 
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth"
              >
                {chatMessages.map((msg) => (
                  <div 
                    key={msg.id}
                    className={cn(
                      "flex items-start gap-4",
                      msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
                      msg.role === 'assistant' ? "bg-fadel-navy text-white" : "bg-fadel-red text-white"
                    )}>
                      {msg.role === 'assistant' ? <Bot size={16} /> : <User size={16} />}
                    </div>
                    <div className={cn(
                      "max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed",
                      msg.role === 'assistant' 
                        ? "bg-zinc-100 text-zinc-800 rounded-tl-none font-medium" 
                        : "bg-fadel-red text-white rounded-tr-none font-bold shadow-lg shadow-fadel-red/20"
                    )}>
                      {msg.content}
                      <p className={cn(
                        "text-[9px] mt-2 opacity-50",
                        msg.role === 'assistant' ? "text-zinc-500" : "text-white"
                      )}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-zinc-900 text-white rounded-xl flex items-center justify-center shrink-0">
                      <Bot size={16} />
                    </div>
                    <div className="bg-zinc-100 p-4 rounded-2xl rounded-tl-none">
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" />
                        <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                        <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-zinc-100">
                <div className="relative group">
                  <input 
                    type="text" 
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Pergunte ao Nexus AI..."
                    className="w-full pl-6 pr-16 py-4 bg-zinc-100 border-2 border-transparent rounded-2xl text-xs font-bold outline-none focus:bg-white focus:border-zinc-900 transition-all placeholder:text-zinc-400"
                  />
                  <button 
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim() || isTyping}
                    className="absolute right-2 top-2 p-3 bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 transition-all disabled:opacity-50 disabled:grayscale"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeView === 'match' && (
            <div className="space-y-8">
              {comparingCandidates.length > 0 && !showComparison && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 bg-zinc-900 text-white px-8 py-4 rounded-3xl shadow-2xl flex items-center gap-8 border border-white/10 backdrop-blur-xl">
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-3">
                      {comparingCandidates.map(c => (
                        <div key={c.candidate_id} className="w-10 h-10 rounded-full border-2 border-zinc-900 bg-white overflow-hidden">
                          <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${c.candidate_id}`} alt="avatar" />
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest">
                      {comparingCandidates.length} Candidato{comparingCandidates.length > 1 ? 's' : ''} selecionado{comparingCandidates.length > 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setComparingCandidates([])}
                      className="px-4 py-2 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                    >
                      Limpar
                    </button>
                    <button 
                      onClick={() => setShowComparison(true)}
                      className="px-6 py-2 bg-fadel-red text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-fadel-red/80 transition-all flex items-center gap-2"
                    >
                      Comparar Agora
                      <Zap size={14} />
                    </button>
                  </div>
                </div>
              )}

              {showComparison ? (
                <div className="bg-white rounded-3xl border border-zinc-200 shadow-xl overflow-hidden animate-in fade-in zoom-in duration-300">
                  <div className="p-8 border-b border-zinc-100 flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-black text-zinc-900 tracking-tighter">Comparativo Inteligente</h2>
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Análise Nexus AI Lado a Lado</p>
                    </div>
                    <button 
                      onClick={() => setShowComparison(false)}
                      className="p-4 bg-zinc-100 text-zinc-900 rounded-2xl hover:bg-zinc-200 transition-all"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  
                  <div className="p-8 overflow-x-auto">
                    <table className="w-full min-w-[800px] border-collapse">
                      <thead>
                        <tr>
                          <th className="w-48"></th>
                          {comparingCandidates.map(c => (
                            <th key={c.candidate_id} className="p-4 text-center border-x border-zinc-50">
                              <div className="flex flex-col items-center gap-3">
                                <div className="w-20 h-20 rounded-2xl bg-zinc-100 overflow-hidden shadow-md">
                                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${c.candidate_id}`} alt="avatar" />
                                </div>
                                <div>
                                  <h4 className="text-sm font-black text-zinc-900">{c.full_name}</h4>
                                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{c.compatibility_score}% Match</p>
                                </div>
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        <tr>
                          <td className="p-4 font-black text-zinc-400 uppercase text-[9px] tracking-widest bg-zinc-50 rounded-l-2xl">Classificação</td>
                          {comparingCandidates.map(c => (
                            <td key={c.candidate_id} className="p-6 text-center border-x border-zinc-50 font-bold">{c.classification}</td>
                          ))}
                        </tr>
                        <tr>
                          <td className="p-4 font-black text-zinc-400 uppercase text-[9px] tracking-widest">DISC</td>
                          {comparingCandidates.map(c => (
                            <td key={c.candidate_id} className="p-6 text-center border-x border-zinc-50">
                              <span className="px-3 py-1 bg-zinc-900 text-white rounded-lg text-xs font-black">
                                {c.disc_profile || 'N/A'}
                              </span>
                            </td>
                          ))}
                        </tr>
                        <tr>
                          <td className="p-4 font-black text-zinc-400 uppercase text-[9px] tracking-widest bg-zinc-50">Localização</td>
                          {comparingCandidates.map(c => (
                            <td key={c.candidate_id} className="p-6 text-center border-x border-zinc-50 bg-zinc-50/30">
                              <p className="font-bold">{c.city}/{c.state}</p>
                              <p className="text-[10px] text-zinc-400">{c.distance_km}km de distância</p>
                            </td>
                          ))}
                        </tr>
                        <tr>
                          <td className="p-4 font-black text-zinc-400 uppercase text-[9px] tracking-widest">Pontos Fortes</td>
                          {comparingCandidates.map(c => (
                            <td key={c.candidate_id} className="p-6 border-x border-zinc-50 align-top">
                              <div className="flex flex-col gap-2">
                                {c.strengths.map((s, i) => (
                                  <div key={i} className="flex gap-2 text-[10px] font-bold text-green-700 bg-green-50 p-2 rounded-lg italic border border-green-100">
                                    <CheckCircle2 size={12} className="shrink-0" />
                                    "{s}"
                                  </div>
                                ))}
                              </div>
                            </td>
                          ))}
                        </tr>
                        <tr>
                          <td className="p-4 font-black text-zinc-400 uppercase text-[9px] tracking-widest bg-zinc-50">Principais Riscos</td>
                          {comparingCandidates.map(c => (
                            <td key={c.candidate_id} className="p-6 border-x border-zinc-50 bg-zinc-50/30 align-top">
                              <p className="text-[10px] font-bold text-red-700 p-3 bg-red-50 rounded-xl border border-red-100 italic">
                                "{c.risk_reason}"
                              </p>
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <>
                  <PanelCard 
                    title="Match de Vaga Inteligente"
                icon={Target}
                description="Encontre os candidatos mais compatíveis com uma vaga específica usando IA."
              >
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1">Vaga Alvo</label>
                      <select 
                        value={selectedJobId}
                        onChange={(e) => setSelectedJobId(e.target.value)}
                        className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-zinc-900/5 outline-none transition-all"
                      >
                        <option value="">Selecione uma vaga ativa...</option>
                        {jobs.map(job => (
                          <option key={job.id} value={job.id}>{job.title} - {job.city}/{job.state}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1">Modo de Precisão</label>
                      <div className="flex p-1 bg-zinc-100 rounded-2xl">
                        {['Flexível', 'Equilibrada', 'Rigorosa'].map(mode => (
                          <button
                            key={mode}
                            onClick={() => setPrecisionMode(mode)}
                            className={cn(
                              "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                              precisionMode === mode ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
                            )}
                          >
                            {mode}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1">Margem Mín (%)</label>
                      <input 
                        type="number"
                        value={minScore}
                        onChange={(e) => setMinScore(Number(e.target.value))}
                        className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-2xl text-xs font-bold outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1">Qtd Máxima</label>
                      <input 
                        type="number"
                        value={maxResults}
                        onChange={(e) => setMaxResults(Number(e.target.value))}
                        className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-2xl text-xs font-bold outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1">Raio Dist (km)</label>
                      <input 
                        type="number"
                        value={radius}
                        onChange={(e) => setRadius(Number(e.target.value))}
                        className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-2xl text-xs font-bold outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1">Localização</label>
                      <select 
                        value={locationRule}
                        onChange={(e) => setLocationRule(e.target.value)}
                        className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-2xl text-xs font-bold outline-none"
                      >
                        <option>Obrigatória</option>
                        <option>Peso alto</option>
                        <option>Peso médio</option>
                        <option>Peso baixo</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-6 pt-4">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className="relative">
                        <input 
                          type="checkbox" 
                          checked={onlyWithResume}
                          onChange={(e) => setOnlyWithResume(e.target.checked)}
                          className="sr-only peer" 
                        />
                        <div className="w-10 h-6 bg-zinc-200 rounded-full peer peer-checked:bg-amber-400 transition-all after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4 shadow-inner" />
                      </div>
                      <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest group-hover:text-zinc-900 transition-colors">Somente com Currículo</span>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className="relative">
                        <input 
                          type="checkbox" 
                          checked={onlyWithDisc}
                          onChange={(e) => setOnlyWithDisc(e.target.checked)}
                          className="sr-only peer" 
                        />
                        <div className="w-10 h-6 bg-zinc-200 rounded-full peer peer-checked:bg-amber-400 transition-all after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4 shadow-inner" />
                      </div>
                      <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest group-hover:text-zinc-900 transition-colors">Somente com DISC</span>
                    </label>
                  </div>

                  <button 
                    onClick={executeMatch}
                    disabled={!selectedJobId || isMatching}
                    className="w-full py-5 bg-zinc-900 text-white rounded-3xl font-black uppercase tracking-[0.2em] text-xs hover:bg-zinc-800 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed shadow-xl shadow-zinc-900/10"
                  >
                    {isMatching ? (
                      <>
                        <Zap size={18} className="animate-pulse text-fadel-blue" />
                        Nexus AI analisando...
                      </>
                    ) : (
                      <>
                        <Zap size={18} className="text-fadel-blue" />
                        {!selectedJobId ? 'Selecione uma Vaga para Iniciar' : 'Rodar Análise de Match'}
                      </>
                    )}
                  </button>
                </div>
              </PanelCard>

              {matchSummary && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-fadel-navy text-white rounded-3xl p-8 relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-fadel-red/20 rounded-full -mr-16 -mt-16 blur-3xl" />
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-fadel-red text-white rounded-2xl shadow-lg shadow-fadel-red/20">
                      <BarChart3 size={24} />
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-white uppercase tracking-[0.2em]">Resumo Executivo Nexus AI</h3>
                      <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">IA Insights</p>
                    </div>
                  </div>
                  <p className="text-sm font-bold text-white leading-relaxed italic border-l-4 border-fadel-red pl-6 py-2">
                    "{matchSummary}"
                  </p>
                </motion.div>
              )}

              {matchResults.length > 0 && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-black text-zinc-900 tracking-tighter">Ranking de Compatibilidade</h2>
                    <div className="flex items-center gap-2">
                       <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Ordenar por:</span>
                        <select className="bg-transparent text-[10px] font-black text-zinc-900 uppercase tracking-widest outline-none cursor-pointer">
                          <option>Score</option>
                          <option>Distância</option>
                        </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    {matchResults.map((result, idx) => (
                      <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        key={result.candidate_id}
                        className="bg-white border border-zinc-200 rounded-3xl p-6 hover:shadow-xl hover:shadow-zinc-200/20 transition-all group overflow-hidden relative"
                      >
                         <div className={cn(
                            "absolute top-0 right-0 w-1 pt-12 h-full",
                            result.compatibility_score >= 90 ? "bg-green-500" :
                            result.compatibility_score >= 70 ? "bg-amber-400" : "bg-zinc-300"
                         )} />

                        <div className="flex flex-col md:flex-row md:items-center gap-6">
                          {/* Rank & Photo */}
                          <div className="flex items-center gap-4 shrink-0">
                            <span className="text-2xl font-black text-zinc-200 group-hover:text-fadel-red transition-colors w-8">
                              #{idx + 1}
                            </span>
                            <div className="w-16 h-16 rounded-2xl bg-zinc-100 flex items-center justify-center font-black text-zinc-400 overflow-hidden border-2 border-zinc-50 shadow-sm">
                              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${result.candidate_id}`} alt="candidate" />
                            </div>
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                               <h4 className="text-base font-black text-zinc-900 truncate">{result.full_name}</h4>
                               {result.compatibility_score >= 90 && (
                                 <Sparkles size={14} className="text-fadel-red shrink-0" />
                               )}
                            </div>
                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">{result.desired_position}</p>
                            
                            <div className="flex flex-wrap gap-4">
                              <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-500">
                                <MapPin size={12} className="text-zinc-400" />
                                {result.city}/{result.state} • {result.distance_km}km
                              </div>
                              <div className={cn(
                                "flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest",
                                result.compatibility_score >= 90 ? "text-green-600" :
                                result.compatibility_score >= 70 ? "text-amber-600" : "text-zinc-600"
                              )}>
                                <CheckCircle2 size={12} />
                                {result.classification}
                                {result.disc_profile && (
                                  <span className="ml-2 px-2 py-0.5 bg-zinc-900 text-white rounded-[4px] text-[7px] tracking-normal">
                                    DISC: {result.disc_profile}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Score */}
                          <div className="flex items-center gap-6 px-6 md:border-l border-zinc-100">
                            <div className="flex flex-col items-center gap-2 mr-4">
                              <button 
                                onClick={() => toggleComparison(result)}
                                className={cn(
                                  "w-10 h-10 rounded-xl flex items-center justify-center transition-all border",
                                  comparingCandidates.find(c => c.candidate_id === result.candidate_id)
                                    ? "bg-fadel-red text-white border-fadel-red animate-pulse"
                                    : "bg-white text-zinc-400 border-zinc-200 hover:border-zinc-900 hover:text-zinc-900 shadow-sm"
                                )}
                                title="Adicionar para comparar"
                              >
                                {comparingCandidates.find(c => c.candidate_id === result.candidate_id) ? <Target size={18} /> : <Search size={18} />}
                              </button>
                              <span className="text-[8px] font-black uppercase text-zinc-400">Comparar</span>
                            </div>
                            <div className="text-center shrink-0">
                              <p className={cn(
                                "text-3xl font-black leading-none mb-1",
                                result.compatibility_score >= 90 ? "text-green-600" :
                                result.compatibility_score >= 70 ? "text-amber-500" : "text-zinc-400"
                              )}>
                                {result.compatibility_score}%
                              </p>
                              <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Score IA</p>
                            </div>
                            <button className="p-4 bg-zinc-900 text-white rounded-2xl hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-900/10">
                              <ArrowRight size={18} />
                            </button>
                          </div>
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-6 border-t border-zinc-50">
                          <div className="space-y-3">
                            <h5 className="text-[9px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                               <Sparkles size={10} className="text-amber-500" />
                               Pontos Fortes
                            </h5>
                            <div className="flex flex-wrap gap-2">
                              {result.strengths.slice(0, 3).map((st, i) => (
                                <span key={i} className="px-3 py-1 bg-green-50 text-green-700 text-[9px] font-bold rounded-lg border border-green-100 italic">
                                  "{st}"
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="space-y-3">
                            <h5 className="text-[9px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                               <AlertCircle size={10} className="text-red-400" />
                               Ficar de Olho
                            </h5>
                            <div className="flex flex-wrap gap-2">
                              {result.attention_points.slice(0, 2).map((att, i) => (
                                <span key={i} className="px-3 py-1 bg-red-50 text-red-700 text-[9px] font-bold rounded-lg border border-red-100 italic">
                                  "{att}"
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 p-4 bg-zinc-50/50 rounded-2xl">
                           <p className="text-[11px] font-bold text-zinc-600 leading-relaxed italic">
                             <span className="font-black text-zinc-900 not-italic mr-2 uppercase text-[9px]">Recomendação:</span>
                             {result.recommendation_reason}
                           </p>
                        </div>
                      </motion.div>
                    ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

          {activeView === 'history' && (
            <div className="space-y-6">
               <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-zinc-900 tracking-tighter">Últimas Consultas Nexus AI</h2>
                <button className="text-[10px] font-black text-zinc-400 uppercase tracking-widest hover:text-zinc-900 flex items-center gap-2 transition-colors">
                  Limpar Histórico
                  <X size={12} />
                </button>
              </div>

              {isLoadingSessions ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                  <div className="w-12 h-12 border-4 border-zinc-200 border-t-zinc-900 rounded-full animate-spin" />
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Carregando Histórico...</p>
                </div>
              ) : sessions.length === 0 ? (
                <div className="p-12 border-2 border-dashed border-zinc-200 rounded-[32px] text-center">
                  <p className="text-sm font-bold text-zinc-400">Nenhuma consulta realizada recentemente.</p>
                </div>
              ) : (
                sessions.map(session => (
                  <div key={session.id} className="bg-white border border-zinc-200 rounded-3xl p-6 flex items-center justify-between hover:border-zinc-900 transition-all cursor-pointer group">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-zinc-50 text-zinc-900 rounded-2xl flex items-center justify-center border border-zinc-100 group-hover:bg-zinc-900 group-hover:text-white transition-all">
                        {session.search_type === 'match-job' ? <Target size={20} /> : <MessageSquare size={20} />}
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-zinc-900">
                          {session.search_type === 'match-job' ? 'Match de Vaga' : 'Conversa com Nexus AI'}
                        </h4>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">
                          {new Date(session.created_at).toLocaleDateString()} • {new Date(session.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Precisão: {session.precision_mode}
                        </p>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-zinc-200 group-hover:text-zinc-900 transition-all" />
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Right Column: Quick Tools & Tools */}
        <div className="lg:col-span-4 space-y-8">
           {/* AI Status Card */}
           <div className="bg-fadel-navy rounded-[32px] p-8 text-white relative overflow-hidden shadow-2xl shadow-fadel-navy/20">
            <div className="absolute top-0 right-0 w-32 h-32 bg-fadel-red/20 rounded-full blur-3xl -mr-16 -mt-16" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-fadel-red text-white rounded-xl">
                  <Cpu size={18} />
                </div>
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-fadel-blue">System Status</h4>
                  <p className="text-xs font-bold font-mono text-white">NEXUS_V2_ACTIVE</p>
                </div>
              </div>
              <div className="space-y-4 mb-8">
                <div className="flex justify-between items-end">
                   <p className="text-[10px] font-black uppercase tracking-widest opacity-60 text-white">IA Precision</p>
                   <p className="text-xs font-bold text-white">98.4%</p>
                </div>
                <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-fadel-red w-[98%]" />
                </div>
                <div className="flex justify-between items-end">
                   <p className="text-[10px] font-black uppercase tracking-widest opacity-60 text-white">Banco Local</p>
                   <p className="text-xs font-bold text-white">1.2k Perfis</p>
                </div>
                <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-white w-[60%]" />
                </div>
              </div>
              <button 
                onClick={() => toast.success("Algoritmo otimizado com sucesso!")}
                className="w-full py-4 bg-white text-fadel-navy rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-fadel-red hover:text-white transition-all shadow-lg active:scale-95"
              >
                Otimizar Algoritmo
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] px-2 mb-4">Ferramentas Rápidas</h3>
            
            <button 
              onClick={() => {
                setInputMessage("Pode me ajudar a melhorar a descrição e os requisitos para uma vaga?");
                setActiveView('chat');
                toast.success("Consultoria iniciada");
              }}
              className="w-full bg-white border border-zinc-200 p-6 rounded-3xl flex items-center justify-between hover:shadow-xl hover:shadow-zinc-200/40 hover:-translate-y-1 transition-all group overflow-hidden relative"
            >
               <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full blur-2xl -mr-12 -mt-12 opacity-0 group-hover:opacity-100 transition-opacity" />
               <div className="flex items-center gap-4 relative z-10">
                 <div className="w-10 h-10 bg-zinc-50 text-zinc-900 rounded-2xl flex items-center justify-center group-hover:bg-zinc-900 group-hover:text-white transition-all">
                   <Briefcase size={20} />
                 </div>
                 <div className="text-left">
                   <h4 className="text-xs font-black text-zinc-900 uppercase tracking-widest">Consultoria de Vaga</h4>
                   <p className="text-[9px] font-bold text-zinc-400 mt-0.5">Melhorar descrição e requisitos</p>
                 </div>
               </div>
               <ArrowRight size={16} className="text-zinc-200 group-hover:text-zinc-900 transition-all" />
            </button>

            <button 
              onClick={() => {
                setActiveView('match');
                toast.info("Selecione uma vaga para comparar candidatos");
              }}
              className="w-full bg-white border border-zinc-200 p-6 rounded-3xl flex items-center justify-between hover:shadow-xl hover:shadow-zinc-200/40 hover:-translate-y-1 transition-all group overflow-hidden relative"
            >
               <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50 rounded-full blur-2xl -mr-12 -mt-12 opacity-0 group-hover:opacity-100 transition-opacity" />
               <div className="flex items-center gap-4 relative z-10">
                 <div className="w-10 h-10 bg-zinc-50 text-zinc-900 rounded-2xl flex items-center justify-center group-hover:bg-zinc-900 group-hover:text-white transition-all">
                   <Target size={20} />
                 </div>
                 <div className="text-left">
                   <h4 className="text-xs font-black text-zinc-900 uppercase tracking-widest">Comparar Candidatos</h4>
                   <p className="text-[9px] font-bold text-zinc-400 mt-0.5">Lado a lado entre perfis</p>
                 </div>
               </div>
               <ArrowRight size={16} className="text-zinc-200 group-hover:text-zinc-900 transition-all" />
            </button>

            <button 
              onClick={() => {
                setActiveView('match');
                setOnlyWithDisc(true);
                toast.info("Análise DISC ativada no Match");
              }}
              className="w-full bg-white border border-zinc-200 p-6 rounded-3xl flex items-center justify-between hover:shadow-xl hover:shadow-zinc-200/40 hover:-translate-y-1 transition-all group overflow-hidden relative"
            >
               <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-full blur-2xl -mr-12 -mt-12 opacity-0 group-hover:opacity-100 transition-opacity" />
               <div className="flex items-center gap-4 relative z-10">
                 <div className="w-10 h-10 bg-zinc-50 text-zinc-900 rounded-2xl flex items-center justify-center group-hover:bg-zinc-900 group-hover:text-white transition-all">
                   <Zap size={20} />
                 </div>
                 <div className="text-left">
                   <h4 className="text-xs font-black text-zinc-900 uppercase tracking-widest">Analisar DISC</h4>
                   <p className="text-[9px] font-bold text-zinc-400 mt-0.5">Encontrar perfil ideal</p>
                 </div>
               </div>
               <ArrowRight size={16} className="text-zinc-200 group-hover:text-zinc-900 transition-all" />
            </button>

            <button 
              onClick={() => {
                setShowSettings(true);
              }}
              className="w-full bg-white border border-zinc-200 p-6 rounded-3xl flex items-center justify-between hover:shadow-xl hover:shadow-zinc-200/40 hover:-translate-y-1 transition-all group overflow-hidden relative"
            >
               <div className="absolute top-0 right-0 w-24 h-24 bg-zinc-50 rounded-full blur-2xl -mr-12 -mt-12 opacity-0 group-hover:opacity-100 transition-opacity" />
               <div className="flex items-center gap-4 relative z-10">
                 <div className="w-10 h-10 bg-zinc-50 text-zinc-900 rounded-2xl flex items-center justify-center group-hover:bg-zinc-900 group-hover:text-white transition-all">
                   <SettingsIcon size={20} />
                 </div>
                 <div className="text-left">
                   <h4 className="text-xs font-black text-zinc-900 uppercase tracking-widest">Configurações Nexus</h4>
                   <p className="text-[9px] font-bold text-zinc-400 mt-0.5">Pesos e critérios globais</p>
                 </div>
               </div>
               <ExternalLink size={16} className="text-zinc-200 group-hover:text-zinc-900 transition-all" />
            </button>
          </div>

          <div className="bg-zinc-50 rounded-3xl p-6 border border-zinc-100">
             <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4">Dicas do Nexus</h4>
             <ul className="space-y-4">
               <li className="flex gap-3">
                 <div className="w-1 h-1 bg-amber-500 rounded-full mt-1.5 shrink-0" />
                 <p className="text-[10px] font-bold text-zinc-600 leading-relaxed italic">
                   "Vagas presenciais em Tatuí costumam aceitar candidatos de até 30km (Boituva/Cerquilho)."
                 </p>
               </li>
               <li className="flex gap-3">
                 <div className="w-1 h-1 bg-amber-500 rounded-full mt-1.5 shrink-0" />
                 <p className="text-[10px] font-bold text-zinc-600 leading-relaxed italic">
                   "Canditados com perfil DISC Estável (S) performam 20% melhor em cargos administrativos."
                 </p>
               </li>
             </ul>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
              onClick={() => setShowSettings(false)}
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[40px] shadow-3xl overflow-hidden"
            >
              <div className="p-8 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-zinc-900 text-white rounded-2xl">
                    <SettingsIcon size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-zinc-900 tracking-tighter">Configurações do Nexus AI</h3>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Ajuste os algoritmos de match para sua unidade</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowSettings(false)}
                  className="p-3 bg-white text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 rounded-2xl transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-10 max-h-[70vh] overflow-y-auto space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                     <h4 className="text-[10px] font-black text-zinc-900 uppercase tracking-[0.2em] mb-4">Padronização de Match</h4>
                     <div className="space-y-6">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Precisão Padrão</label>
                           <select 
                             className="w-full p-4 bg-zinc-100 border border-transparent rounded-2xl text-xs font-bold focus:bg-white focus:border-zinc-200 outline-none"
                             value={settings?.default_precision_mode || 'Equilibrada'}
                             onChange={(e) => setSettings({ ...settings, default_precision_mode: e.target.value })}
                           >
                             <option>Flexível</option>
                             <option>Equilibrada</option>
                             <option>Rigorosa</option>
                           </select>
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Raio de Distância (km)</label>
                           <input 
                             type="number" 
                             step="5" 
                             value={settings?.default_distance_radius_km || 50} 
                             onChange={(e) => setSettings({ ...settings, default_distance_radius_km: Number(e.target.value) })}
                             className="w-full p-4 bg-zinc-100 border border-transparent rounded-2xl text-xs font-bold" 
                           />
                        </div>
                     </div>
                  </div>

                  <div className="space-y-4">
                     <h4 className="text-[10px] font-black text-zinc-900 uppercase tracking-[0.2em] mb-4">Pesos dos Algoritmos (%)</h4>
                     <div className="space-y-4">
                        {[
                          { label: 'Localização', key: 'weight_location', val: settings?.weight_location ?? 10 },
                          { label: 'Experiência', key: 'weight_experience', val: settings?.weight_experience ?? 20 },
                          { label: 'Hard Skills', key: 'weight_hard_skills', val: settings?.weight_hard_skills ?? 20 },
                          { label: 'Soft Skills', key: 'weight_soft_skills', val: settings?.weight_soft_skills ?? 15 },
                          { label: 'DISC Behavioral', key: 'weight_disc', val: settings?.weight_disc ?? 15 },
                        ].map(w => (
                          <div key={w.key} className="space-y-2 group cursor-pointer" onClick={() => {
                            const current = settings?.[w.key] ?? w.val;
                            const next = current >= 40 ? 0 : current + 5;
                            setSettings({ ...settings, [w.key]: next });
                          }}>
                            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                               <span className="text-zinc-500 group-hover:text-zinc-900 transition-colors">{w.label}</span>
                               <span className="text-zinc-900">{w.val}%</span>
                            </div>
                            <div className="h-1 bg-zinc-100 rounded-full overflow-hidden">
                               <div className="h-full bg-zinc-900 transition-all duration-500" style={{ width: `${w.val}%` }} />
                            </div>
                          </div>
                        ))}
                     </div>
                  </div>
                </div>

                <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100 flex items-start gap-4">
                   <AlertCircle className="text-amber-500 shrink-0 mt-1" size={18} />
                   <p className="text-[11px] font-bold text-amber-900 leading-relaxed italic">
                     "As mudanças nos pesos impactam diretamente o score gerado pela IA. Recomendamos cautela ao alterar pesos comportamentais para vagas operacionais."
                   </p>
                </div>
              </div>

              <div className="p-8 border-t border-zinc-100 bg-zinc-50/50 flex items-center justify-end gap-4">
                <button 
                  onClick={() => setShowSettings(false)}
                  className="px-8 py-4 text-xs font-black text-zinc-500 uppercase tracking-widest hover:text-zinc-900"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => saveSettings(settings)}
                  className="px-10 py-4 bg-zinc-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-zinc-900/10 active:scale-95 transition-all"
                >
                  Salvar Alterações
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
