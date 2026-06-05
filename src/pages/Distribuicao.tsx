import React, { useState } from "react";
import {
  Radio, Globe, Copy, Check, ExternalLink, ChevronDown,
  Zap, AlertCircle, CheckCircle2, ArrowRight, Link2,
  Settings, Users, Rocket, Shield, Play, Star,
  RefreshCw, Eye, Lock,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/src/lib/utils";
import { PageWrapper } from "@/src/components/ui";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type ChannelStatus = "ativo" | "feed" | "manual" | "pago" | "breve";
type SetupStatus   = "configurado" | "pendente" | "nao_necessario";

interface Channel {
  id: string;
  name: string;
  desc: string;
  status: ChannelStatus;
  color: string;
  icon: string;
  feedPath?: string;
  // Para o admin — o que ELE precisa fazer uma vez só
  adminSetup?: string[];
  adminUrl?: string;
  setupStatus?: SetupStatus; // você pode marcar manualmente
  pricingNote?: string;
  // Para o cliente — o que ELE vê/faz
  clientView: string;
}

// ─── Canais ───────────────────────────────────────────────────────────────────

const CHANNELS: Channel[] = [
  {
    id: "google",
    name: "Google for Jobs",
    desc: "Schema.org inserido automaticamente em cada página de vaga",
    status: "ativo",
    color: "from-blue-500 to-indigo-600",
    icon: "G",
    setupStatus: "configurado",
    adminSetup: [
      "Nenhuma ação necessária.",
      "O schema JSON-LD já é injetado automaticamente em todas as páginas /vaga/:slug.",
      "O Google rastreia e indexa as vagas sozinho em 24–72h.",
    ],
    clientView: "Vagas aparecem no Google automaticamente ao publicar.",
  },
  {
    id: "indeed",
    name: "Indeed",
    desc: "Feed XML no formato oficial do publisher",
    status: "feed",
    color: "from-sky-500 to-blue-600",
    icon: "In",
    feedPath: "/feed/indeed.xml",
    setupStatus: "pendente",
    adminUrl: "https://indeed.com/publisher",
    adminSetup: [
      "Acesse indeed.com/publisher e crie UMA conta de publisher da Triagem Smart.",
      "Copie a URL do feed abaixo e cole no cadastro do Indeed.",
      "Aguarde aprovação (2–5 dias). Após isso, TODAS as vagas de todos os clientes aparecem automaticamente.",
      "Feito isso uma vez — nenhum cliente precisa criar conta no Indeed.",
    ],
    clientView: "Vaga publicada automaticamente no Indeed ao ativar a publicação.",
  },
  {
    id: "jooble",
    name: "Jooble",
    desc: "Maior agregador de vagas do mundo — 67 países",
    status: "feed",
    color: "from-violet-500 to-purple-600",
    icon: "Jo",
    feedPath: "/feed/jooble.xml",
    setupStatus: "pendente",
    adminUrl: "https://jooble.org",
    adminSetup: [
      "Envie UM e-mail para partnerships@jooble.org com a URL do feed da Triagem Smart.",
      "Informe que é uma plataforma ATS com múltiplos clientes.",
      "Aprovação em 2–5 dias. Após isso, todas as vagas de todos os clientes aparecem.",
    ],
    clientView: "Vaga distribuída para o Jooble ao publicar — sem ação necessária.",
  },
  {
    id: "careerjet",
    name: "Careerjet",
    desc: "Agregador global com forte presença no Brasil",
    status: "feed",
    color: "from-orange-500 to-amber-500",
    icon: "CJ",
    feedPath: "/feed/careerjet.xml",
    setupStatus: "pendente",
    adminUrl: "https://www.careerjet.com.br/content/publisher.html",
    adminSetup: [
      "Acesse careerjet.com.br/content/publisher.html.",
      "Cadastre a Triagem Smart como publisher com a URL do feed.",
      "Após aprovação, todas as vagas são indexadas automaticamente.",
    ],
    clientView: "Vaga distribuída para o Careerjet ao publicar — sem ação necessária.",
  },
  {
    id: "talent",
    name: "Talent.com",
    desc: "Maior agregador global (ex-Neuvoo) — 30M visitantes/mês",
    status: "feed",
    color: "from-teal-500 to-cyan-600",
    icon: "T",
    feedPath: "/feed/talent.xml",
    setupStatus: "pendente",
    adminUrl: "https://www.talent.com/partner",
    adminSetup: [
      "Acesse talent.com/partner ou envie e-mail para partnerships@talent.com.",
      "Solicite parceria como plataforma ATS e informe a URL do feed.",
      "Após aprovação, todas as vagas são indexadas automaticamente.",
    ],
    clientView: "Vaga distribuída para o Talent.com ao publicar — sem ação necessária.",
  },
  {
    id: "jobrapido",
    name: "Jobrapido",
    desc: "Agregador com presença consolidada no Brasil",
    status: "feed",
    color: "from-rose-500 to-pink-600",
    icon: "JR",
    feedPath: "/feed/jobrapido.xml",
    setupStatus: "pendente",
    adminUrl: "https://br.jobrapido.com",
    clientView: "Vaga distribuída para o Jobrapido ao publicar — sem ação necessária.",
    adminSetup: [
      "Entre em contato pelo site br.jobrapido.com solicitando parceria de feed.",
      "Informe que é uma plataforma ATS e envie a URL do feed.",
    ],
  },
  {
    id: "bne",
    name: "BNE — Banco Nacional de Empregos",
    desc: "Portal nacional focado em contratações CLT",
    status: "feed",
    color: "from-emerald-600 to-green-700",
    icon: "BN",
    feedPath: "/feed/bne.xml",
    setupStatus: "pendente",
    pricingNote: "Plano pago — único custo centralizado na Triagem Smart",
    adminUrl: "https://www.bne.com.br/anunciante",
    adminSetup: [
      "Contrate UM plano corporativo no BNE (bne.com.br/anunciante).",
      "Solicite integração de feed XML para a equipe de suporte.",
      "Envie a URL do feed — todas as vagas de todos os clientes passam por esse plano.",
    ],
    clientView: "Vaga distribuída para o BNE ao publicar — sem ação necessária.",
  },
  {
    id: "empregos",
    name: "Empregos.com.br",
    desc: "Portal de vagas nacional tradicional",
    status: "feed",
    color: "from-blue-600 to-indigo-700",
    icon: "Em",
    feedPath: "/feed/empregos.xml",
    setupStatus: "pendente",
    adminUrl: "https://www.empregos.com.br/parceiros",
    adminSetup: [
      "Envie e-mail para parceiros@empregos.com.br com a URL do feed.",
      "Apresente a Triagem Smart como plataforma ATS.",
      "Após parceria, todas as vagas são indexadas automaticamente.",
    ],
    clientView: "Vaga distribuída para o Empregos.com.br ao publicar — sem ação necessária.",
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    desc: "Compartilhamento 1 clique direto pelo painel",
    status: "manual",
    color: "from-blue-700 to-blue-900",
    icon: "Li",
    setupStatus: "configurado",
    adminSetup: [
      "Nenhuma conta necessária para o básico.",
      "O botão de compartilhamento já está no painel de cada vaga.",
      "Para publicação paga automática, é necessária parceria com LinkedIn Talent Solutions.",
    ],
    clientView: "RH clica em 'Compartilhar' na vaga e posta no LinkedIn em 1 clique.",
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    desc: "Texto pronto gerado automaticamente por vaga",
    status: "manual",
    color: "from-green-500 to-emerald-600",
    icon: "W",
    setupStatus: "configurado",
    adminSetup: [
      "Nenhuma configuração necessária.",
      "O botão já gera texto formatado com link da vaga para compartilhar.",
    ],
    clientView: "RH clica em 'WhatsApp' na vaga e envia para grupos em 1 clique.",
  },
  {
    id: "telegram",
    name: "Telegram",
    desc: "Link direto para grupos e canais",
    status: "manual",
    color: "from-sky-400 to-blue-500",
    icon: "Tg",
    setupStatus: "configurado",
    adminSetup: ["Nenhuma configuração necessária. Botão já disponível no painel da vaga."],
    clientView: "RH compartilha a vaga em grupos do Telegram em 1 clique.",
  },
  {
    id: "facebook",
    name: "Facebook",
    desc: "Compartilhamento de link pelo painel da vaga",
    status: "manual",
    color: "from-blue-600 to-blue-800",
    icon: "Fb",
    setupStatus: "configurado",
    adminSetup: ["Nenhuma configuração necessária. Botão já disponível no painel da vaga."],
    clientView: "RH compartilha a vaga no Facebook em 1 clique.",
  },
  {
    id: "infojobs",
    name: "Infojobs Brasil",
    desc: "Portal de vagas — feed XML pronto para integração",
    status: "pago",
    color: "from-red-500 to-rose-600",
    icon: "IJ",
    feedPath: "/feed/infojobs.xml",
    setupStatus: "pendente",
    pricingNote: "Plano pago — único custo centralizado",
    adminUrl: "https://www.infojobs.com.br/anuncie",
    adminSetup: [
      "Contrate UM plano corporativo no Infojobs (infojobs.com.br/anuncie).",
      "Solicite integração ATS via feed XML ao gerente de conta.",
      "Todas as vagas de todos os clientes ficam cobertas por esse único plano.",
    ],
    clientView: "Vaga distribuída para o Infojobs ao publicar — sem ação necessária.",
  },
  {
    id: "catho",
    name: "Catho",
    desc: "Maior portal de vagas do Brasil — feed pronto",
    status: "pago",
    color: "from-yellow-500 to-orange-500",
    icon: "Ca",
    feedPath: "/feed/catho.xml",
    setupStatus: "pendente",
    pricingNote: "Plano pago — único custo centralizado",
    adminUrl: "https://anunciante.catho.com.br",
    adminSetup: [
      "Contrate UM plano corporativo ATS na Catho (anunciante.catho.com.br).",
      "Solicite integração via feed XML ao gerente de conta.",
      "Todas as vagas de todos os clientes ficam cobertas por esse único plano.",
    ],
    clientView: "Vaga distribuída para a Catho ao publicar — sem ação necessária.",
  },
  {
    id: "vagas-com",
    name: "Vagas.com.br",
    desc: "Portal tradicional de vagas — feed pronto",
    status: "pago",
    color: "from-indigo-500 to-violet-600",
    icon: "Va",
    feedPath: "/feed/vagas-com.xml",
    setupStatus: "pendente",
    pricingNote: "Plano pago — único custo centralizado",
    adminUrl: "https://www.vagas.com.br/sistema-de-recrutamento",
    adminSetup: [
      "Contrate UM plano ATS no Vagas.com.br.",
      "Solicite integração via feed XML ao time comercial.",
      "Todas as vagas de todos os clientes ficam cobertas.",
    ],
    clientView: "Vaga distribuída para o Vagas.com.br ao publicar — sem ação necessária.",
  },
  {
    id: "sine",
    name: "SINE / Emprega Brasil",
    desc: "Portal do Empregador (MTE) — sem API pública",
    status: "breve",
    color: "from-green-700 to-teal-700",
    icon: "SI",
    feedPath: "/feed/sine.xml",
    setupStatus: "nao_necessario",
    adminUrl: "https://empregabrasil.mte.gov.br",
    adminSetup: [
      "O SINE não possui API de importação — é cadastro manual por empresa.",
      "O feed /feed/sine.xml já gera os dados estruturados para facilitar o preenchimento.",
      "Cada empresa cliente precisa cadastrar com seu próprio CNPJ no Portal do Empregador.",
      "Solução: oferecer esse serviço gerenciado como add-on no seu plano.",
    ],
    clientView: "Exportação guiada disponível. Cadastro no SINE exige CNPJ da empresa.",
  },
];

const STATUS_CFG: Record<ChannelStatus, { label: string; cls: string; dot: string }> = {
  ativo:  { label: "Ativo",       cls: "bg-emerald-50 text-emerald-700 border border-emerald-200", dot: "bg-emerald-500" },
  feed:   { label: "Feed pronto", cls: "bg-violet-50 text-violet-700 border border-violet-200",   dot: "bg-violet-500" },
  manual: { label: "Manual",      cls: "bg-blue-50 text-blue-700 border border-blue-200",         dot: "bg-blue-500" },
  pago:   { label: "Plano pago",  cls: "bg-amber-50 text-amber-700 border border-amber-200",      dot: "bg-amber-400" },
  breve:  { label: "Em breve",    cls: "bg-zinc-100 text-zinc-500 border border-zinc-200",        dot: "bg-zinc-400" },
};

const SETUP_CFG: Record<SetupStatus, { label: string; icon: React.ReactNode; cls: string }> = {
  configurado:    { label: "Configurado",   icon: <CheckCircle2 size={11} />, cls: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  pendente:       { label: "Pendente",      icon: <AlertCircle size={11} />,  cls: "text-amber-600 bg-amber-50 border-amber-200" },
  nao_necessario: { label: "Manual",        icon: <Eye size={11} />,          cls: "text-zinc-500 bg-zinc-100 border-zinc-200" },
};

const GROUP_ORDER: ChannelStatus[] = ["ativo", "feed", "manual", "pago", "breve"];
const GROUP_TITLES: Record<ChannelStatus, string> = {
  ativo:  "Ativo automaticamente",
  feed:   "Feed XML gerado — cadastro único necessário",
  manual: "Compartilhamento manual (1 clique)",
  pago:   "Portais pagos — feed gerado, contrato único",
  breve:  "Em desenvolvimento",
};

// ─── ChannelCard ──────────────────────────────────────────────────────────────

function ChannelCard({ ch, adminView }: { ch: Channel; adminView: boolean }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const base = window.location.origin;
  const sc = STATUS_CFG[ch.status];
  const sp = ch.setupStatus ? SETUP_CFG[ch.setupStatus] : null;

  const copy = () => {
    if (!ch.feedPath) return;
    navigator.clipboard.writeText(base + ch.feedPath).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    });
  };

  return (
    <div className={cn(
      "rounded-2xl border overflow-hidden transition-all duration-200 bg-white",
      open ? "border-develoi-navy/20 shadow-md shadow-develoi-navy/5" : "border-zinc-200 hover:border-zinc-300"
    )}>
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center gap-3.5 p-4 text-left hover:bg-zinc-50/60 transition-colors">
        <div className={cn("w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-white text-[10px] font-black shrink-0 shadow-sm", ch.color)}>
          {ch.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
            <p className="text-sm font-black text-zinc-900">{ch.name}</p>
            <span className={cn("inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full border", sc.cls)}>
              <span className={cn("w-1.5 h-1.5 rounded-full inline-block shrink-0", sc.dot)} />
              {sc.label}
            </span>
            {/* Admin vê o status de setup */}
            {adminView && sp && (
              <span className={cn("hidden sm:inline-flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded-full border", sp.cls)}>
                {sp.icon} {sp.label}
              </span>
            )}
            {ch.pricingNote && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[9px] text-amber-600 font-semibold">
                💰 {ch.pricingNote}
              </span>
            )}
          </div>
          <p className="text-[11px] text-zinc-500 truncate">{ch.desc}</p>
        </div>
        {ch.feedPath && (
          <span className="hidden sm:flex items-center gap-1 text-[9px] font-black text-violet-600 bg-violet-50 border border-violet-200 px-2 py-1 rounded-lg shrink-0">
            <Zap size={9} /> Feed gerado
          </span>
        )}
        <ChevronDown size={13} className={cn("text-zinc-400 transition-transform shrink-0", open && "rotate-180")} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="border-t border-zinc-100 px-5 py-4 space-y-4">

              {/* Vista do cliente */}
              <div className="flex items-start gap-2.5 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                <Users size={13} className="text-blue-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-blue-500 mb-0.5">O que o cliente vê</p>
                  <p className="text-[11px] text-blue-800 font-semibold leading-relaxed">{ch.clientView}</p>
                </div>
              </div>

              {/* Vista do admin */}
              {adminView && ch.adminSetup && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Settings size={11} className="text-zinc-400" />
                    <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">O que você precisa fazer — uma vez só</p>
                  </div>
                  <div className="bg-zinc-50 rounded-xl border border-zinc-200 p-3.5 space-y-2">
                    {ch.adminSetup.map((step, i) => {
                      const isStep = /^\d+\./.test(step.trim()) || ch.adminSetup!.length > 1;
                      return (
                        <div key={i} className="flex items-start gap-2.5">
                          {ch.adminSetup!.length > 1 ? (
                            <span className="w-4 h-4 rounded-full bg-develoi-navy/10 text-develoi-navy text-[8px] font-black flex items-center justify-center shrink-0 mt-0.5">
                              {i + 1}
                            </span>
                          ) : (
                            <CheckCircle2 size={13} className="text-emerald-500 shrink-0 mt-0.5" />
                          )}
                          <p className="text-[11px] text-zinc-600 leading-relaxed">{step.replace(/^\d+\.\s*/, "")}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Feed URL */}
              {ch.feedPath && (
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1.5 flex items-center gap-1.5">
                    <Link2 size={9} /> URL do Feed — copie e cadastre no portal
                  </p>
                  <div className="flex items-center gap-2 bg-white rounded-xl border border-zinc-200 px-3.5 py-2.5">
                    <Globe size={11} className="text-zinc-400 shrink-0" />
                    <p className="flex-1 text-[11px] font-mono text-zinc-700 truncate">{base}{ch.feedPath}</p>
                    <button onClick={copy} className="shrink-0 flex items-center gap-1.5 text-[10px] font-black text-develoi-navy px-2.5 py-1.5 rounded-lg bg-develoi-navy/5 hover:bg-develoi-navy/10 transition-colors">
                      {copied ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} />}
                      {copied ? "Copiado!" : "Copiar"}
                    </button>
                    <a href={`${base}${ch.feedPath}`} target="_blank" rel="noreferrer" className="shrink-0 p-1.5 text-zinc-400 hover:text-zinc-700 transition-colors">
                      <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
              )}

              {ch.adminUrl && adminView && (
                <a href={ch.adminUrl} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-develoi-navy text-white rounded-xl text-xs font-black hover:bg-develoi-navy/90 transition-all">
                  <ExternalLink size={11} /> Acessar portal de cadastro <ArrowRight size={11} />
                </a>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Distribuicao() {
  const base = window.location.origin;
  const [adminView, setAdminView] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  const copyFeed = (path: string, key: string) => {
    navigator.clipboard.writeText(base + path).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2200);
    });
  };

  const pendentes  = CHANNELS.filter(c => c.setupStatus === "pendente");
  const configurados = CHANNELS.filter(c => c.setupStatus === "configurado");
  const totalFeed  = CHANNELS.filter(c => c.feedPath).length;

  return (
    <PageWrapper className="min-h-screen bg-[#f8fafc]">
      <div className="space-y-5 px-4 pb-20 pt-5 sm:px-6">

        {/* ── HEADER ── */}
        <div className="relative overflow-hidden rounded-2xl bg-develoi-navy px-6 py-6 sm:px-7">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-develoi-gold/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-12 left-1/3 h-36 w-36 rounded-full bg-violet-500/8 blur-3xl" />
          <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <Radio size={11} className="text-develoi-gold/70" />
                <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-white/40">Publicação</span>
              </div>
              <h1 className="text-[22px] font-black leading-none tracking-tight text-white sm:text-[26px]">
                Distribuição de Vagas
              </h1>
              <p className="mt-1.5 text-[11px] font-medium text-white/40 max-w-md">
                Você cadastra os portais uma vez. Seus clientes publicam a vaga e ela aparece em todos automaticamente.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Toggle visão admin / cliente */}
              <div className="flex items-center gap-1 p-1 bg-white/10 rounded-xl">
                <button
                  onClick={() => setAdminView(true)}
                  className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black transition-all", adminView ? "bg-develoi-gold text-develoi-navy" : "text-white/60 hover:text-white")}
                >
                  <Settings size={11} /> Admin
                </button>
                <button
                  onClick={() => setAdminView(false)}
                  className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black transition-all", !adminView ? "bg-white text-develoi-navy" : "text-white/60 hover:text-white")}
                >
                  <Users size={11} /> Cliente
                </button>
              </div>
              <a href="/empregos" target="_blank" rel="noreferrer"
                className="flex h-8 items-center gap-1.5 rounded-lg border border-white/15 bg-white/8 px-3.5 text-[11px] font-medium text-white/70 hover:bg-white/12 hover:text-white transition-all">
                <Globe size={11} /> Portal de Empregos
              </a>
            </div>
          </div>
        </div>

        {/* ── BANNER DE CONTEXTO ── */}
        <AnimatePresence mode="wait">
          {adminView ? (
            <motion.div key="admin-banner" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="flex gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
              <Shield size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-black text-amber-900">Você faz o cadastro. Seus clientes não precisam fazer nada.</p>
                <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
                  Você cria <strong>uma conta</strong> na Triagem Smart em cada portal (Indeed, Jooble, Catho etc.) e cadastra a URL do feed XML.
                  A partir daí, <strong>todas as vagas de todos os seus clientes</strong> são distribuídas automaticamente — nenhum cliente precisa criar conta em nenhum portal.
                  É exatamente assim que a Recrutei, Gupy e outros ATSs funcionam.
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div key="client-banner" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="flex gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
              <Rocket size={16} className="text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-black text-emerald-900">Seu cliente só precisa publicar a vaga.</p>
                <p className="text-[11px] text-emerald-700 mt-0.5 leading-relaxed">
                  Ao ativar a publicação de uma vaga no sistema, ela é distribuída automaticamente para todos os portais abaixo.
                  Sem criar contas, sem copiar nada, sem conhecimento técnico necessário.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── STATS ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: <Radio size={14} />, value: CHANNELS.length, label: "Portais mapeados", cls: "text-develoi-navy", bg: "bg-develoi-navy/5" },
            { icon: <Zap size={14} />, value: totalFeed, label: "Feeds XML prontos", cls: "text-violet-600", bg: "bg-violet-50" },
            { icon: <CheckCircle2 size={14} />, value: configurados.length, label: "Já configurados", cls: "text-emerald-600", bg: "bg-emerald-50" },
            { icon: <AlertCircle size={14} />, value: pendentes.length, label: "Pendentes de cadastro", cls: "text-amber-600", bg: "bg-amber-50" },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-zinc-200 p-4 flex items-center gap-3">
              <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", s.bg, s.cls)}>{s.icon}</div>
              <div>
                <p className="text-xl font-black text-zinc-900 leading-none">{s.value}</p>
                <p className="text-[10px] text-zinc-500 font-medium mt-0.5">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── FLUXO ── */}
        <div className="bg-develoi-navy rounded-2xl p-5 overflow-x-auto">
          <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-3 flex items-center gap-1.5">
            <Play size={9} /> Fluxo completo
          </p>
          <div className="flex items-center gap-2 min-w-max">
            {(adminView ? [
              { step: "Você cadastra o feed", sub: "uma vez por portal", icon: <Settings size={11} />, highlight: true },
              { step: "Cliente cria a vaga", sub: "no sistema", icon: <Users size={11} /> },
              { step: "Cliente ativa publicação", sub: "is_public = ✓", icon: <CheckCircle2 size={11} /> },
              { step: "Feed XML atualiza", sub: "automático", icon: <RefreshCw size={11} /> },
              { step: "Portais indexam", sub: "a cada 1–24h", icon: <Globe size={11} /> },
              { step: "Candidatos chegam", sub: "no banco", icon: <Users size={11} /> },
              { step: "IA faz a triagem", sub: "automático", icon: <Star size={11} /> },
            ] : [
              { step: "Criar a vaga", sub: "no sistema", icon: <Users size={11} /> },
              { step: "Ativar publicação", sub: "1 clique", icon: <CheckCircle2 size={11} />, highlight: true },
              { step: "Aparece no Google", sub: "em 24–72h", icon: <Globe size={11} /> },
              { step: "Aparece no Indeed", sub: "automático", icon: <Zap size={11} /> },
              { step: "Aparece em +10 portais", sub: "automático", icon: <Radio size={11} /> },
              { step: "Candidatos chegam", sub: "no sistema", icon: <Users size={11} /> },
              { step: "IA analisa os CVs", sub: "automático", icon: <Star size={11} /> },
            ]).map((s, i, arr) => (
              <React.Fragment key={s.step}>
                <div className={cn(
                  "flex items-center gap-2 rounded-xl px-3 py-2 shrink-0",
                  s.highlight ? "bg-develoi-gold/20 border border-develoi-gold/30" : "bg-white/8"
                )}>
                  <span className={s.highlight ? "text-develoi-gold" : "text-white/50"}>{s.icon}</span>
                  <div>
                    <p className={cn("text-[11px] font-black leading-none", s.highlight ? "text-develoi-gold" : "text-white/90")}>{s.step}</p>
                    <p className="text-[9px] text-white/40 mt-0.5">{s.sub}</p>
                  </div>
                </div>
                {i < arr.length - 1 && <ArrowRight size={11} className="text-white/20 shrink-0" />}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* ── FEEDS RÁPIDOS (só admin vê) ── */}
        {adminView && (
          <div className="bg-white rounded-2xl border border-zinc-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 bg-violet-50 rounded-lg flex items-center justify-center">
                <Link2 size={13} className="text-violet-600" />
              </div>
              <div>
                <p className="text-sm font-black text-zinc-900">URLs dos Feeds — copie e cadastre</p>
                <p className="text-[11px] text-zinc-400">Cada URL vai para o portal correspondente durante o cadastro único</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {CHANNELS.filter(c => c.feedPath).map(ch => (
                <div key={ch.id} className={cn(
                  "flex items-center gap-2.5 rounded-xl border px-3 py-2.5",
                  ch.setupStatus === "configurado" ? "bg-emerald-50 border-emerald-200" : ch.setupStatus === "pendente" ? "bg-zinc-50 border-zinc-200" : "bg-zinc-50 border-dashed border-zinc-200"
                )}>
                  <div className={cn("w-6 h-6 rounded-md bg-gradient-to-br flex items-center justify-center text-white text-[8px] font-black shrink-0", ch.color)}>
                    {ch.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-[10px] font-black text-zinc-700 truncate">{ch.name}</p>
                      {ch.setupStatus === "configurado" && <CheckCircle2 size={10} className="text-emerald-500 shrink-0" />}
                      {ch.setupStatus === "pendente" && <AlertCircle size={10} className="text-amber-500 shrink-0" />}
                    </div>
                    <p className="text-[9px] font-mono text-zinc-400 truncate">{base}{ch.feedPath}</p>
                  </div>
                  <button
                    onClick={() => copyFeed(ch.feedPath!, ch.id)}
                    className="shrink-0 flex items-center gap-1 text-[9px] font-black px-2 py-1 rounded-lg bg-white border border-zinc-200 hover:border-develoi-navy/30 text-zinc-500 hover:text-develoi-navy transition-all"
                  >
                    {copied === ch.id ? <Check size={9} className="text-emerald-500" /> : <Copy size={9} />}
                    {copied === ch.id ? "Copiado!" : "Copiar"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── CANAIS ── */}
        {GROUP_ORDER.map(status => {
          const chs = CHANNELS.filter(c => c.status === status);
          if (!chs.length) return null;
          const sc = STATUS_CFG[status];
          return (
            <div key={status}>
              <div className="flex items-center gap-2 mb-3">
                <span className={cn("w-2.5 h-2.5 rounded-full", sc.dot)} />
                <p className="text-xs font-black uppercase tracking-widest text-zinc-500">{GROUP_TITLES[status]}</p>
                <span className="text-[10px] font-black text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full">{chs.length}</span>
              </div>
              <div className="space-y-2">
                {chs.map(ch => <ChannelCard key={ch.id} ch={ch} adminView={adminView} />)}
              </div>
            </div>
          );
        })}

        {/* ── NOTA SINE ── */}
        <div className="flex gap-3 p-4 bg-zinc-100 border border-zinc-200 rounded-2xl">
          <Lock size={14} className="text-zinc-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-black text-zinc-700">SINE — Particularidade</p>
            <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">
              O SINE/Emprega Brasil é um sistema do governo que exige CNPJ da empresa para cada vaga.
              Não há API de importação. O feed <code className="font-mono bg-zinc-200 px-1 rounded text-[10px]">/feed/sine.xml</code> gera os dados estruturados para facilitar o preenchimento manual.
              Você pode oferecer esse cadastro como serviço adicional aos seus clientes.
            </p>
          </div>
        </div>

      </div>
    </PageWrapper>
  );
}
