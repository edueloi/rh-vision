import React, { useState, useEffect, useRef } from 'react';
import { 
  Brain, 
  Sparkles, 
  Bot, 
  Send, 
  Target, 
  BarChart3, 
  CheckCircle2, 
  AlertCircle, 
  MessageSquare,
  History,
  Settings as SettingsIcon,
  X,
  ChevronRight,
  Zap,
  MoreVertical,
  User,
  MapPin,
  RefreshCw,
  Cpu
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { getAuthHeaders, getTenantId } from '@/src/lib/auth';
import { useUnit } from '@/src/lib/useUnit';
import { 
  useToast, 
  PanelCard, 
  Button, 
  IconButton, 
  Badge, 
  Input, 
  Switch, 
  Modal
} from '@/src/components/ui';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
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

export default function AuroraAI() {
  const { currentUnit } = useUnit();
  const tenantId = getTenantId();
  const queryUnitId = currentUnit.is_master ? 'master' : currentUnit.id;
  const activeUnitId = currentUnit.id;
  const toast = useToast();
  
  const [activeView, setActiveView] = useState<'chat' | 'match' | 'history'>('chat');
  const [chatMessages, setChatMessages] = useState<Message[]>([
    { 
      id: '1', 
      role: 'assistant', 
      content: 'Olá! Sou a Aurora, sua inteligência artificial. Posso ajudar com triagem de candidatos, análise de vagas e consultoria estratégica. Como posso ser útil hoje?',
      timestamp: new Date().toISOString()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [chatSessionId, setChatSessionId] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Real Data States
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [jobs, setJobs] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [matchResults, setMatchResults] = useState<MatchResult[]>([]);
  const [isMatching, setIsMatching] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // Filters
  const [precisionMode, setPrecisionMode] = useState('Equilibrada');
  const [minScore, setMinScore] = useState(70);
  const [radius, setRadius] = useState(50);
  const [onlyWithResume, setOnlyWithResume] = useState(false);
  const [onlyWithDisc, setOnlyWithDisc] = useState(false);

  useEffect(() => {
    fetchJobs();
    fetchSessions();
    fetchStats();
  }, [queryUnitId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages, isTyping]);

  const fetchJobs = async () => {
    try {
      const res = await fetch(`/api/jobs?tenantId=${tenantId}&unitId=${queryUnitId}`);
      const data = await res.json();
      setJobs(data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchSessions = async () => {
    try {
      const res = await fetch(`/api/aurora-ai/sessions?tenantId=${tenantId}&unitId=${queryUnitId}`);
      const data = await res.json();
      setSessions(data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`/api/dashboard/overview?tenantId=${tenantId}&unitId=${queryUnitId}`);
      const data = await res.json();
      setStats(data.stats);
    } catch (error) {
      console.error(error);
    }
  };

  const handleSendMessage = async () => {
    const trimmedMessage = inputMessage.trim();
    if (!trimmedMessage) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: trimmedMessage,
      timestamp: new Date().toISOString()
    };

    setChatMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setIsTyping(true);

    try {
      const res = await fetch('/api/aurora-ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          message: trimmedMessage,
          tenantId,
          unitId: activeUnitId,
          sessionId: chatSessionId
        })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Falha na conexão com Aurora.');
      
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message,
        timestamp: new Date().toISOString()
      };

      setChatSessionId(data.sessionId ?? null);
      setChatMessages(prev => [...prev, assistantMsg]);
      fetchSessions(); // Atualiza histórico
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao processar mensagem');
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
    try {
      const res = await fetch('/api/aurora-ai/match-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: selectedJobId,
          tenantId,
          unitId: queryUnitId,
          precisionMode,
          minScore,
          radius,
          onlyWithResume,
          onlyWithDisc
        })
      });
      const data = await res.json();
      setMatchResults(data.results || []);
      toast.success('Análise de match concluída!');
      fetchSessions(); // O match também gera sessão
    } catch (error) {
      toast.error('Erro ao realizar match');
    } finally {
      setIsMatching(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `Há ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Há ${hours} horas`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-8 pb-20 px-4 md:px-8 py-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-develoi-navy dark:bg-develoi-gold text-white dark:text-develoi-navy rounded-2xl shadow-xl shadow-develoi-navy/20">
            <Brain size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-develoi-navy dark:text-white tracking-tight">Aurora AI</h1>
              <Badge color="gold" className="animate-pulse">Active</Badge>
            </div>
            <p className="text-[10px] font-bold text-zinc-400 dark:text-white/40 uppercase tracking-widest mt-1">
              Intelligent Human Capital Advisor
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-zinc-100 dark:bg-white/5 p-1 rounded-2xl border border-zinc-200 dark:border-white/10 shadow-sm transition-colors">
          {[
            { id: 'chat', label: 'Conversa', icon: MessageSquare },
            { id: 'match', label: 'Match', icon: Target },
            { id: 'history', label: 'Histórico', icon: History }
          ].map(view => (
            <button 
              key={view.id}
              onClick={() => setActiveView(view.id as any)}
              className={cn(
                "px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-2",
                activeView === view.id 
                  ? "bg-develoi-navy dark:bg-develoi-gold text-white dark:text-develoi-navy shadow-lg" 
                  : "text-zinc-500 hover:text-develoi-navy dark:hover:text-white"
              )}
            >
              <view.icon size={14} />
              {view.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Main Content Area */}
        <div className="lg:col-span-8 space-y-8">
          {activeView === 'chat' && (
            <div className="bg-white dark:bg-[#0d1b3e]/40 dark:backdrop-blur-xl rounded-[40px] border border-zinc-200 dark:border-white/10 shadow-2xl flex flex-col h-[650px] overflow-hidden transition-all">
              {/* Chat Header */}
              <div className="p-6 border-b border-zinc-100 dark:border-white/5 flex items-center justify-between bg-zinc-50/50 dark:bg-transparent">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-develoi-navy dark:bg-white/10 text-develoi-gold rounded-2xl flex items-center justify-center shadow-inner">
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-develoi-navy dark:text-white uppercase tracking-widest">Aurora Core</h3>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                      <span className="text-[8px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Neural Link Active</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <IconButton variant="ghost" size="md" onClick={() => setShowSettings(true)}>
                    <SettingsIcon size={18} className="text-zinc-400" />
                  </IconButton>
                </div>
              </div>

              {/* Chat Messages */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-6 scroll-smooth custom-scrollbar">
                {chatMessages.map((msg) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={msg.id}
                    className={cn(
                      "flex items-start gap-4",
                      msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-lg",
                      msg.role === 'assistant' 
                        ? "bg-develoi-navy dark:bg-white/10 text-develoi-gold" 
                        : "bg-develoi-gold dark:bg-develoi-navy text-white"
                    )}>
                      {msg.role === 'assistant' ? <Sparkles size={18} /> : <User size={18} />}
                    </div>
                    <div className={cn(
                      "max-w-[80%] rounded-[2.5rem] px-6 py-4.5 text-[12px] leading-relaxed",
                      msg.role === 'assistant' 
                        ? "bg-white dark:bg-white/5 text-zinc-700 dark:text-zinc-200 rounded-tl-none border border-zinc-100 dark:border-white/5 shadow-sm" 
                        : "bg-develoi-navy dark:bg-develoi-gold text-white dark:text-develoi-navy rounded-tr-none font-medium shadow-xl shadow-develoi-navy/10"
                    )}>
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                      <p className={cn(
                        "mt-2 text-[8px] font-black uppercase tracking-widest opacity-40",
                        msg.role === 'user' ? "text-right" : "text-left"
                      )}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </motion.div>
                ))}
                {isTyping && (
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-zinc-900 dark:bg-white/10 text-white rounded-2xl flex items-center justify-center shrink-0">
                      <Bot size={18} className="animate-pulse" />
                    </div>
                    <div className="bg-zinc-100 dark:bg-white/5 p-5 rounded-3xl rounded-tl-none flex gap-1.5">
                      <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" />
                      <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <div className="p-8 border-t border-zinc-100 dark:border-white/5 bg-zinc-50/30 dark:bg-transparent">
                <div className="relative flex items-center gap-3">
                  <Input 
                    placeholder="Como Aurora pode ajudar você hoje?..."
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    className="flex-1 rounded-[2rem] bg-white dark:bg-white/5 px-6 py-6 border-zinc-200 dark:border-white/10 text-xs font-bold focus:ring-develoi-navy dark:focus:ring-develoi-gold transition-all"
                  />
                  <Button 
                    variant="secondary"
                    size="lg"
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim() || isTyping}
                    className="rounded-full w-14 h-14 p-0 shrink-0 bg-develoi-navy dark:bg-develoi-gold text-white dark:text-develoi-navy shadow-xl"
                  >
                    <Send size={20} />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {activeView === 'match' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <PanelCard 
                title="Match Inteligente de Vagas" 
                icon={Target}
                description="Use nossa IA neural para encontrar os candidatos ideais baseado em competências, comportamento e localização."
              >
                <div className="space-y-8 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-zinc-400 dark:text-white/30 uppercase tracking-widest px-1">Vaga Alvo</label>
                      <select 
                        value={selectedJobId}
                        onChange={(e) => setSelectedJobId(e.target.value)}
                        className="w-full h-14 px-5 bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-2xl text-xs font-bold text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-develoi-navy dark:focus:ring-develoi-gold transition-all"
                      >
                        <option value="">Selecione uma vaga ativa...</option>
                        {jobs.map(job => (
                          <option key={job.id} value={job.id}>{job.title} - {job.city}/{job.state}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-zinc-400 dark:text-white/30 uppercase tracking-widest px-1">Rigor da IA</label>
                      <div className="flex p-1 bg-zinc-100 dark:bg-white/5 rounded-2xl">
                        {['Flexível', 'Equilibrada', 'Rigorosa'].map(mode => (
                          <button
                            key={mode}
                            onClick={() => setPrecisionMode(mode)}
                            className={cn(
                              "flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                              precisionMode === mode 
                                ? "bg-white dark:bg-develoi-gold text-develoi-navy shadow-sm" 
                                : "text-zinc-500 hover:text-zinc-700 dark:hover:text-white"
                            )}
                          >
                            {mode}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-400 dark:text-white/30 uppercase tracking-widest px-1">Score Mínimo</label>
                      <Input 
                        type="number"
                        value={minScore}
                        onChange={(e) => setMinScore(Number(e.target.value))}
                        className="bg-zinc-50 dark:bg-white/5 border-zinc-200 dark:border-white/10 rounded-2xl h-12 font-bold"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-400 dark:text-white/30 uppercase tracking-widest px-1">Raio KM</label>
                      <Input 
                        type="number"
                        value={radius}
                        onChange={(e) => setRadius(Number(e.target.value))}
                        className="bg-zinc-50 dark:bg-white/5 border-zinc-200 dark:border-white/10 rounded-2xl h-12 font-bold"
                      />
                    </div>
                    <div className="flex flex-col gap-4 pt-6">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Apenas DISC</span>
                        <Switch checked={onlyWithDisc} onCheckedChange={setOnlyWithDisc} />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Apenas Currículo</span>
                        <Switch checked={onlyWithResume} onCheckedChange={setOnlyWithResume} />
                      </div>
                    </div>
                  </div>

                  <Button 
                    onClick={executeMatch}
                    loading={isMatching}
                    variant="primary"
                    className="w-full py-8 rounded-[2rem] bg-develoi-navy dark:bg-develoi-gold text-white dark:text-develoi-navy text-xs font-black uppercase tracking-[0.2em] shadow-2xl shadow-develoi-navy/20"
                    iconLeft={!isMatching && <Zap size={18} className="text-develoi-gold dark:text-develoi-navy" />}
                  >
                    {isMatching ? 'Processando Redes Neurais...' : 'Rodar Análise Aurora AI'}
                  </Button>
                </div>
              </PanelCard>

              {matchResults.length > 0 && (
                <div className="grid md:grid-cols-2 gap-6 animate-in fade-in zoom-in duration-500">
                  {matchResults.map((rec) => (
                    <div key={rec.candidate_id} className="bg-white dark:bg-white/5 border border-zinc-100 dark:border-white/5 p-6 rounded-[2.5rem] hover:border-develoi-gold transition-all group shadow-sm">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-2xl bg-zinc-50 dark:bg-white/10 flex items-center justify-center font-black text-zinc-400 dark:text-white/40 group-hover:bg-develoi-navy group-hover:text-develoi-gold transition-all">
                             {rec.full_name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                             <h5 className="text-sm font-black text-zinc-900 dark:text-white">{rec.full_name}</h5>
                             <p className="text-[9px] font-bold text-zinc-400 dark:text-white/40 uppercase tracking-widest mt-1 flex items-center gap-1">
                               <MapPin size={10} /> {rec.city}, {rec.state}
                             </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-black text-blue-600 dark:text-develoi-gold">{rec.compatibility_score}%</div>
                          <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-tighter">Match AI</p>
                        </div>
                      </div>
                      
                      <div className="space-y-3 mb-6">
                        <div className="flex flex-wrap gap-2">
                           <Badge color={rec.classification === 'Alto Fit' ? 'success' : 'gold'}>{rec.classification}</Badge>
                           {rec.has_disc && <Badge color="primary">{rec.disc_profile}</Badge>}
                        </div>
                        <p className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400 line-clamp-2 italic">
                          "{rec.recommendation_reason}"
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: AI Insights & Status */}
        <div className="lg:col-span-4 space-y-8">
           <div className="bg-develoi-gold dark:bg-[#1a1408] rounded-[2.5rem] p-8 text-develoi-navy dark:text-develoi-gold shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
              <h4 className="text-xs font-black uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                <Zap size={16} /> Insights de Hoje
              </h4>
              <div className="space-y-6">
                 {[
                   { title: 'Vagas Ativas', value: stats?.active_jobs || '0', desc: 'Em recrutamento' },
                   { title: 'Processados', value: `+${stats?.new_candidates || '0'}`, desc: 'Candidatos novos' },
                   { title: 'Compatíveis', value: stats?.compatible_candidates || '0', desc: 'Acima de 80% match' }
                 ].map((insight, i) => (
                   <div key={i} className="flex justify-between items-end border-b border-develoi-navy/10 dark:border-develoi-gold/10 pb-4">
                      <div>
                         <p className="text-[9px] font-black uppercase tracking-widest opacity-60">{insight.title}</p>
                         <p className="text-[10px] font-bold mt-1">{insight.desc}</p>
                      </div>
                      <span className="text-2xl font-black">{insight.value}</span>
                   </div>
                 ))}
              </div>
           </div>

           <PanelCard title="Histórico Recente" icon={History}>
              <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                 {sessions.length > 0 ? sessions.slice(0, 5).map((session, i) => (
                   <div key={i} className="flex items-center justify-between group cursor-pointer hover:bg-zinc-50 dark:hover:bg-white/5 p-2 rounded-xl transition-all">
                      <div className="flex items-center gap-3">
                         <div className="p-2 bg-zinc-50 dark:bg-white/5 rounded-xl text-zinc-400 group-hover:bg-develoi-navy group-hover:text-white transition-all">
                            <MessageSquare size={14} />
                         </div>
                         <div>
                            <h5 className="text-[11px] font-black text-zinc-800 dark:text-white/90 line-clamp-1">{session.query || "Conversa Aurora"}</h5>
                            <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">{formatDate(session.created_at)}</p>
                         </div>
                      </div>
                      <ChevronRight size={14} className="text-zinc-200 group-hover:text-develoi-navy transition-colors" />
                   </div>
                 )) : (
                   <p className="text-[9px] font-bold text-zinc-400 uppercase text-center py-4">Sem histórico recente</p>
                 )}
              </div>
           </PanelCard>

           <div className="p-8 bg-develoi-navy rounded-[2.5rem] text-white relative overflow-hidden shadow-2xl">
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-develoi-blue/10 rounded-full blur-3xl -ml-16 -mb-16" />
              <div className="relative z-10 text-center">
                 <div className="w-16 h-16 bg-white/10 rounded-3xl flex items-center justify-center mx-auto mb-6 text-develoi-gold shadow-inner">
                    <Cpu size={32} />
                 </div>
                 <h4 className="text-sm font-black uppercase tracking-[0.25em] mb-2">Neural Engine</h4>
                 <p className="text-[10px] font-medium text-white/40 mb-6 uppercase tracking-widest">v4.2.0 - Stabilized</p>
                 <Button variant="ghost" className="w-full border-white/20 text-white hover:bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest border">
                    Ver Logs de Rede
                 </Button>
              </div>
           </div>
        </div>
      </div>

      {/* Settings Modal */}
      <Modal 
        open={showSettings} 
        onClose={() => setShowSettings(false)}
        title="Configurações da Aurora AI"
      >
        <div className="space-y-6">
           <div className="space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Parâmetros de Match</h4>
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase">Limite Global (%)</label>
                    <Input 
                      type="number" 
                      value={minScore} 
                      onChange={(e) => setMinScore(Number(e.target.value))}
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase">Raio Padrão (KM)</label>
                    <Input 
                      type="number" 
                      value={radius} 
                      onChange={(e) => setRadius(Number(e.target.value))}
                    />
                 </div>
              </div>
           </div>

           <div className="space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Personalidade do Core</h4>
              <div className="flex p-1 bg-zinc-100 rounded-2xl">
                 {['Analítica', 'Criativa', 'Equilibrada'].map(mode => (
                   <button
                     key={mode}
                     onClick={() => setPrecisionMode(mode)}
                     className={cn(
                       "flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                       precisionMode === mode 
                         ? "bg-white text-develoi-navy shadow-sm" 
                         : "text-zinc-500 hover:text-zinc-700"
                     )}
                   >
                     {mode}
                   </button>
                 ))}
              </div>
           </div>

           <div className="pt-4 flex gap-3">
              <Button variant="ghost" fullWidth onClick={() => setShowSettings(false)}>Cancelar</Button>
              <Button variant="primary" fullWidth onClick={() => {
                toast.success("Configurações aplicadas com sucesso!");
                setShowSettings(false);
              }}>Salvar Mudanças</Button>
           </div>
        </div>
      </Modal>
    </div>
  );
}
