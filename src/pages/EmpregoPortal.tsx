import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  MapPin, FileText, Send, CheckCircle2, Search, Clock, ChevronRight,
  DollarSign, Building2, Zap, Filter, X, ArrowLeft, Sparkles,
  Share2, Copy, Check, ExternalLink, Briefcase, Globe, Radio,
  TrendingUp, Users, Star, Rocket, ChevronDown,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/src/lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}
function formatSalary(min?: number | null, max?: number | null) {
  if (!min && !max) return "A combinar";
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (min) return `A partir de ${fmt(min)}`;
  return `Até ${fmt(max!)}`;
}
function timeAgo(date?: string) {
  if (!date) return "";
  const d = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
  if (d === 0) return "Hoje";
  if (d === 1) return "Ontem";
  if (d < 7) return `${d}d atrás`;
  if (d < 30) return `${Math.floor(d / 7)}sem atrás`;
  return `${Math.floor(d / 30)}m atrás`;
}
function getInitials(name?: string) {
  if (!name) return "?";
  return name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
}
function getInitialsBg(name?: string) {
  const colors = [
    "from-violet-500 to-purple-600",
    "from-blue-500 to-cyan-500",
    "from-emerald-500 to-teal-600",
    "from-orange-500 to-amber-500",
    "from-rose-500 to-pink-600",
    "from-indigo-500 to-blue-600",
    "from-teal-500 to-green-600",
  ];
  const i = (name || "").charCodeAt(0) % colors.length;
  return colors[i];
}

const MODEL_STYLE: Record<string, { bg: string; text: string; dot: string }> = {
  "Home Office": { bg: "bg-emerald-50 border border-emerald-200", text: "text-emerald-700", dot: "bg-emerald-500" },
  "Híbrido":     { bg: "bg-blue-50 border border-blue-200",       text: "text-blue-700",    dot: "bg-blue-500" },
  "Presencial":  { bg: "bg-zinc-100 border border-zinc-200",      text: "text-zinc-600",    dot: "bg-zinc-400" },
};

function injectJobSchema(job: any) {
  document.getElementById("emp-schema-ld")?.remove();
  const base = window.location.origin;
  const url = `${base}/empregos/vaga/${job.public_slug || job.id}`;
  const schema: Record<string, any> = {
    "@context": "https://schema.org/",
    "@type": "JobPosting",
    title: job.title,
    description: [job.description, job.responsibilities, job.technical_requirements, job.benefits].filter(Boolean).join("\n\n"),
    datePosted: new Date(job.created_at).toISOString(),
    validThrough: new Date(new Date(job.created_at).getTime() + 90 * 86400000).toISOString(),
    employmentType: job.contract_type === "CLT" ? "FULL_TIME" : job.contract_type === "PJ" ? "CONTRACTOR" : job.contract_type === "Estágio" ? "INTERN" : "OTHER",
    hiringOrganization: { "@type": "Organization", name: job.company_name || job.tenant_name || "Triagem Smart" },
    jobLocation: { "@type": "Place", address: { "@type": "PostalAddress", addressLocality: job.city, addressRegion: job.state, addressCountry: "BR" } },
    url,
  };
  if (job.work_model === "Home Office") schema.jobLocationType = "TELECOMMUTE";
  if (job.salary_min || job.salary_max) {
    schema.baseSalary = { "@type": "MonetaryAmount", currency: "BRL", value: { "@type": "QuantitativeValue", ...(job.salary_min ? { minValue: job.salary_min } : {}), ...(job.salary_max ? { maxValue: job.salary_max } : {}), unitText: "MONTH" } };
  }
  const s = document.createElement("script");
  s.id = "emp-schema-ld"; s.type = "application/ld+json"; s.textContent = JSON.stringify(schema);
  document.head.appendChild(s);
}

// ─── Distribution Channels ───────────────────────────────────────────────────

type ChannelStatus = "ativo" | "feed" | "manual" | "pago" | "breve";

interface Channel {
  id: string;
  name: string;
  desc: string;
  status: ChannelStatus;
  color: string;
  icon: string;
  feedPath?: string;      // rota do feed gerado
  cadastroUrl?: string;   // onde cadastrar
  cadastroDesc?: string;  // instrução de cadastro
}

const CHANNELS: Channel[] = [
  {
    id: "google",
    name: "Google for Jobs",
    desc: "Schema.org JobPosting injetado em cada página de vaga",
    status: "ativo",
    color: "from-blue-500 to-indigo-600",
    icon: "G",
    cadastroDesc: "Automático — o Google indexa as vagas publicadas pelo schema JSON-LD inserido nas páginas.",
  },
  {
    id: "indeed",
    name: "Indeed",
    desc: "Feed XML no formato oficial do publisher",
    status: "feed",
    color: "from-sky-500 to-blue-600",
    icon: "In",
    feedPath: "/feed/indeed.xml",
    cadastroUrl: "https://indeed.com/publisher",
    cadastroDesc: "Crie conta em indeed.com/publisher e envie a URL do feed XML para aprovação.",
  },
  {
    id: "jooble",
    name: "Jooble",
    desc: "Feed XML de parceiro — indexação automática",
    status: "feed",
    color: "from-violet-500 to-purple-600",
    icon: "Jo",
    feedPath: "/feed/jooble.xml",
    cadastroUrl: "https://jooble.org",
    cadastroDesc: "Envie a URL do feed para partnerships@jooble.org solicitando cadastro como parceiro.",
  },
  {
    id: "careerjet",
    name: "Careerjet",
    desc: "Feed XML de parceiro ATS",
    status: "feed",
    color: "from-orange-500 to-amber-500",
    icon: "CJ",
    feedPath: "/feed/careerjet.xml",
    cadastroUrl: "https://www.careerjet.com.br/content/publisher.html",
    cadastroDesc: "Acesse o programa de publishers do Careerjet e envie a URL do feed.",
  },
  {
    id: "talent",
    name: "Talent.com",
    desc: "Feed XML para o maior agregador global",
    status: "feed",
    color: "from-teal-500 to-cyan-600",
    icon: "T",
    feedPath: "/feed/talent.xml",
    cadastroUrl: "https://www.talent.com/partner",
    cadastroDesc: "Entre em contato em partnerships@talent.com com a URL do feed para parceria.",
  },
  {
    id: "jobrapido",
    name: "Jobrapido",
    desc: "Feed RSS padrão — indexação automática",
    status: "feed",
    color: "from-rose-500 to-pink-600",
    icon: "JR",
    feedPath: "/feed/jobrapido.xml",
    cadastroUrl: "https://br.jobrapido.com",
    cadastroDesc: "Entre em contato pelo site para cadastro de feed de parceiro.",
  },
  {
    id: "bne",
    name: "BNE",
    desc: "Banco Nacional de Empregos — feed XML",
    status: "feed",
    color: "from-emerald-600 to-green-700",
    icon: "BN",
    feedPath: "/feed/bne.xml",
    cadastroUrl: "https://www.bne.com.br/anunciante",
    cadastroDesc: "Plano pago. Envie a URL do feed para integração com a equipe BNE.",
  },
  {
    id: "empregos",
    name: "Empregos.com.br",
    desc: "Feed XML para portal de vagas nacional",
    status: "feed",
    color: "from-blue-600 to-indigo-700",
    icon: "Em",
    feedPath: "/feed/empregos.xml",
    cadastroUrl: "https://www.empregos.com.br/parceiros",
    cadastroDesc: "Envie a URL do feed para parceiros@empregos.com.br.",
  },
  {
    id: "infojobs",
    name: "Infojobs Brasil",
    desc: "Feed XML para portal de vagas",
    status: "pago",
    color: "from-red-500 to-rose-600",
    icon: "IJ",
    feedPath: "/feed/infojobs.xml",
    cadastroUrl: "https://www.infojobs.com.br/anuncie",
    cadastroDesc: "Plano pago. Acesse a área de anunciantes e solicite integração via feed.",
  },
  {
    id: "catho",
    name: "Catho",
    desc: "Feed XML no formato de oportunidades",
    status: "pago",
    color: "from-yellow-500 to-orange-500",
    icon: "Ca",
    feedPath: "/feed/catho.xml",
    cadastroUrl: "https://anunciante.catho.com.br",
    cadastroDesc: "Plano pago. Solicite integração ATS pelo portal de anunciantes.",
  },
  {
    id: "vagas-com",
    name: "Vagas.com.br",
    desc: "Feed XML de integração ATS",
    status: "pago",
    color: "from-indigo-500 to-violet-600",
    icon: "V",
    feedPath: "/feed/vagas-com.xml",
    cadastroUrl: "https://www.vagas.com.br/sistema-de-recrutamento",
    cadastroDesc: "Plano pago. Solicite integração via sistema de recrutamento deles.",
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    desc: "Compartilhamento 1 clique pelo painel da vaga",
    status: "manual",
    color: "from-blue-700 to-blue-900",
    icon: "Li",
    cadastroDesc: "Use o botão de compartilhamento no painel de cada vaga para postar no LinkedIn.",
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    desc: "Texto pronto gerado automaticamente",
    status: "manual",
    color: "from-green-500 to-emerald-600",
    icon: "W",
    cadastroDesc: "Use o botão de compartilhamento no painel de cada vaga.",
  },
  {
    id: "sine",
    name: "SINE / Emprega Brasil",
    desc: "Feed de exportação + cadastro no Portal do Empregador",
    status: "breve",
    color: "from-green-700 to-teal-700",
    icon: "SI",
    feedPath: "/feed/sine.xml",
    cadastroUrl: "https://empregabrasil.mte.gov.br",
    cadastroDesc: "O SINE não tem API pública. Use o feed XML gerado como guia para cadastro manual no Portal do Empregador (MTE).",
  },
];

const STATUS_LABEL: Record<ChannelStatus, { label: string; cls: string; dot?: string }> = {
  ativo:  { label: "Ativo",         cls: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  feed:   { label: "Feed pronto",   cls: "bg-violet-50 text-violet-700 border-violet-200",    dot: "bg-violet-500" },
  manual: { label: "Manual",        cls: "bg-blue-50 text-blue-700 border-blue-200" },
  pago:   { label: "Plano pago",    cls: "bg-amber-50 text-amber-700 border-amber-200" },
  breve:  { label: "Em breve",      cls: "bg-zinc-100 text-zinc-500 border-zinc-200" },
};

function ChannelBadge({ status }: { status: ChannelStatus }) {
  const s = STATUS_LABEL[status];
  return (
    <span className={cn("inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border", s.cls)}>
      {s.dot && <span className={cn("w-1.5 h-1.5 rounded-full inline-block", s.dot)} />}
      {s.label}
    </span>
  );
}

// ─── ShareDropdown ────────────────────────────────────────────────────────────

function ShareDropdown({ job }: { job: any }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const url = `${window.location.origin}/empregos/vaga/${job.public_slug || job.id}`;
  const text = `${job.title} — ${job.company_name || job.tenant_name || "Empresa"} · ${job.city}/${job.state}\n${url}`;

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const copy = () => {
    navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2200); });
    setOpen(false);
  };

  const links = [
    { label: "WhatsApp", href: `https://wa.me/?text=${encodeURIComponent(text)}`, cls: "text-green-600 hover:bg-green-50" },
    { label: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, cls: "text-blue-700 hover:bg-blue-50" },
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, cls: "text-blue-500 hover:bg-blue-50" },
    { label: "Telegram", href: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, cls: "text-sky-500 hover:bg-sky-50" },
  ];

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(v => !v)} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-zinc-200 bg-white text-xs font-black text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50 transition-all">
        <Share2 size={13} /> Compartilhar
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -4 }}
            className="absolute right-0 top-full mt-2 bg-white rounded-2xl border border-zinc-200 shadow-2xl shadow-zinc-200/60 p-2 z-50 w-52">
            {links.map(l => (
              <a key={l.label} href={l.href} target="_blank" rel="noreferrer"
                className={cn("flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors", l.cls)}>
                <ExternalLink size={11} /> {l.label}
              </a>
            ))}
            <div className="border-t border-zinc-100 mt-1 pt-1">
              <button onClick={copy} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-zinc-600 hover:bg-zinc-50 transition-colors">
                {copied ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                {copied ? "Link copiado!" : "Copiar link"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── JobCard ──────────────────────────────────────────────────────────────────

function JobCard({ job, onClick }: { job: any; onClick: () => void }) {
  const company = job.company_name || job.tenant_name || "Empresa";
  const model = MODEL_STYLE[job.work_model] ?? MODEL_STYLE["Presencial"];

  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3, boxShadow: "0 12px 32px -8px rgba(0,0,0,0.12)" }}
      onClick={onClick}
      className="group w-full text-left bg-white rounded-2xl border border-zinc-200/80 hover:border-develoi-gold/40 transition-all duration-200 p-5 relative overflow-hidden"
    >
      {/* subtle gradient on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-develoi-gold/0 via-transparent to-develoi-gold/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      <div className="relative flex items-start gap-3.5">
        {/* Avatar */}
        <div className={cn("w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0 text-white text-xs font-black shadow-md", getInitialsBg(company))}>
          {getInitials(company)}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400 truncate">{company}</p>
          <h3 className="text-sm font-black text-zinc-900 group-hover:text-develoi-navy leading-snug mt-0.5 line-clamp-2">
            {job.title}
          </h3>

          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            {job.work_model && (
              <span className={cn("inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full", model.bg, model.text)}>
                <span className={cn("w-1.5 h-1.5 rounded-full", model.dot)} />{job.work_model}
              </span>
            )}
            {job.contract_type && (
              <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500 border border-zinc-200">
                {job.contract_type}
              </span>
            )}
            {job.seniority_level && (
              <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-violet-50 text-violet-600 border border-violet-200">
                {job.seniority_level}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-2.5">
            <span className="text-[11px] text-zinc-500 flex items-center gap-1 font-medium">
              <MapPin size={10} className="text-develoi-gold shrink-0" />
              {job.city}, {job.state}
            </span>
            {(job.salary_min || job.salary_max) && (
              <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                <DollarSign size={10} className="shrink-0" />
                {formatSalary(job.salary_min, job.salary_max)}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-4 pt-3.5 border-t border-zinc-100">
        <span className="text-[10px] text-zinc-400 flex items-center gap-1 font-medium">
          <Clock size={9} /> {timeAgo(job.created_at)}
        </span>
        <span className="flex items-center gap-1 text-[10px] font-black text-develoi-gold group-hover:gap-2 transition-all">
          Ver vaga <ChevronRight size={11} />
        </span>
      </div>
    </motion.button>
  );
}

// ─── JobDetail ────────────────────────────────────────────────────────────────

function SectionBlock({ label, content, icon }: { label: string; content: string; icon: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-sm overflow-hidden">
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center justify-between px-6 py-4 hover:bg-zinc-50 transition-colors">
        <div className="flex items-center gap-2.5">
          <span className="text-zinc-400">{icon}</span>
          <span className="text-xs font-black uppercase tracking-widest text-zinc-700">{label}</span>
        </div>
        <ChevronDown size={14} className={cn("text-zinc-400 transition-transform", open && "rotate-180")} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="px-6 pb-5">
              <div className="text-sm text-zinc-600 leading-relaxed whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ __html: content.replace(/\n/g, "<br/>") }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function JobDetail({ job, onBack, onApply }: { job: any; onBack: () => void; onApply: () => void }) {
  const company = job.company_name || job.tenant_name || "Empresa";
  const model = MODEL_STYLE[job.work_model] ?? MODEL_STYLE["Presencial"];

  useEffect(() => {
    injectJobSchema(job);
    document.title = `${job.title} — ${company} | Triagem Smart Empregos`;
    return () => { document.getElementById("emp-schema-ld")?.remove(); document.title = "Triagem Smart — Portal de Empregos"; };
  }, [job]);

  const sections = [
    { label: "Sobre a vaga", content: job.description, icon: <Briefcase size={13} /> },
    { label: "Responsabilidades", content: job.responsibilities, icon: <Star size={13} /> },
    { label: "Requisitos técnicos", content: job.technical_requirements, icon: <Zap size={13} /> },
    { label: "Requisitos obrigatórios", content: job.mandatory_requirements, icon: <CheckCircle2 size={13} /> },
    { label: "Diferenciais desejáveis", content: job.desirable_requirements, icon: <TrendingUp size={13} /> },
    { label: "Benefícios", content: job.benefits, icon: <Sparkles size={13} /> },
  ].filter(s => s.content);

  return (
    <motion.div key="detail" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      {/* Top hero bar */}
      <div className="bg-develoi-navy">
        <div className="max-w-4xl mx-auto px-5 py-4">
          <button onClick={onBack} className="flex items-center gap-1.5 text-white/50 hover:text-white transition-colors text-xs font-semibold mb-5">
            <ArrowLeft size={13} /> Todas as vagas
          </button>
          <div className="flex items-start gap-4 pb-2">
            <div className={cn("w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white text-sm font-black shadow-xl shrink-0", getInitialsBg(company))}>
              {getInitials(company)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white/50 text-xs font-semibold mb-1">{company}</p>
              <h1 className="text-xl sm:text-2xl font-black text-white leading-tight">{job.title}</h1>
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {job.work_model && (
                  <span className={cn("inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full", model.bg, model.text)}>
                    <span className={cn("w-1.5 h-1.5 rounded-full", model.dot)} />{job.work_model}
                  </span>
                )}
                {job.contract_type && <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-white/10 text-white/70">{job.contract_type}</span>}
                {job.seniority_level && <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-white/10 text-white/70">{job.seniority_level}</span>}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-5 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Left — details */}
          <div className="lg:col-span-2 space-y-4">
            {sections.map(s => <SectionBlock key={s.label} {...s} />)}
          </div>

          {/* Right — sidebar */}
          <div className="space-y-4">
            {/* Info card */}
            <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-sm p-5 space-y-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Detalhes da vaga</p>

              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-lg bg-develoi-gold/10 flex items-center justify-center shrink-0">
                    <MapPin size={14} className="text-develoi-gold" />
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-400 font-semibold">Localização</p>
                    <p className="text-xs font-black text-zinc-800">{job.city}, {job.state}</p>
                  </div>
                </div>

                {(job.salary_min || job.salary_max) && (
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                      <DollarSign size={14} className="text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-400 font-semibold">Remuneração</p>
                      <p className="text-xs font-black text-zinc-800">{formatSalary(job.salary_min, job.salary_max)}</p>
                    </div>
                  </div>
                )}

                {job.contract_type && (
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0">
                      <FileText size={14} className="text-zinc-500" />
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-400 font-semibold">Contrato</p>
                      <p className="text-xs font-black text-zinc-800">{job.contract_type}</p>
                    </div>
                  </div>
                )}

                {job.work_model && (
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                      <Globe size={14} className="text-blue-500" />
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-400 font-semibold">Modalidade</p>
                      <p className="text-xs font-black text-zinc-800">{job.work_model}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0">
                    <Clock size={14} className="text-zinc-500" />
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-400 font-semibold">Publicada</p>
                    <p className="text-xs font-black text-zinc-800">{timeAgo(job.created_at)}</p>
                  </div>
                </div>
              </div>

              {/* CTA */}
              <button
                onClick={onApply}
                className="w-full flex items-center justify-center gap-2 bg-develoi-navy text-white py-3 rounded-xl text-sm font-black hover:bg-develoi-navy/90 active:scale-[0.98] transition-all shadow-lg shadow-develoi-navy/25 mt-2"
              >
                <Send size={14} /> Candidatar-se
              </button>

              <ShareDropdown job={job} />
            </div>

            {/* Powered by */}
            <div className="bg-gradient-to-br from-develoi-navy to-[#0d2a4e] rounded-2xl p-5 text-center">
              <div className="w-10 h-10 bg-develoi-gold/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Sparkles size={18} className="text-develoi-gold" />
              </div>
              <p className="text-white font-black text-sm mb-1">Triagem Smart IA</p>
              <p className="text-white/50 text-[11px] leading-relaxed">
                Processo seletivo com IA. Sua candidatura é analisada automaticamente.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom CTA mobile */}
        <div className="lg:hidden mt-5 bg-develoi-navy rounded-2xl p-5 text-center">
          <p className="text-white font-black mb-1">Interessou?</p>
          <p className="text-white/50 text-xs mb-3">Candidate-se agora e entre no processo seletivo.</p>
          <button onClick={onApply} className="w-full flex items-center justify-center gap-2 bg-develoi-gold text-develoi-navy py-3 rounded-xl text-sm font-black">
            <Send size={14} /> Enviar candidatura
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── ApplyModal ───────────────────────────────────────────────────────────────

function ApplyModal({ job, onClose }: { job: any; onClose: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const fd = new FormData(e.currentTarget);
      const res = await fetch(`/api/public/jobs/${job.id}/apply`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Erro ao enviar candidatura."); return; }
      setDone(true);
    } catch { setError("Erro de conexão. Tente novamente."); }
    finally { setSubmitting(false); }
  };

  const company = job.company_name || job.tenant_name || "Empresa";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-6 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.97 }}
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="relative bg-gradient-to-br from-develoi-navy to-[#0d2a4e] px-6 py-5">
          <div className="flex items-start gap-3">
            <div className={cn("w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-white text-xs font-black shrink-0", getInitialsBg(company))}>
              {getInitials(company)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Candidatura</p>
              <p className="text-white font-black text-sm leading-tight mt-0.5 truncate">{job.title}</p>
              <p className="text-white/40 text-[11px] mt-0.5 truncate">{company}</p>
            </div>
            <button onClick={onClose} className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition shrink-0 mt-0.5">
              <X size={13} />
            </button>
          </div>
        </div>

        <div className="p-6">
          {done ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center py-4">
              <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-100">
                <CheckCircle2 size={30} className="text-emerald-500" />
              </div>
              <p className="text-lg font-black text-zinc-900 mb-1">Candidatura enviada!</p>
              <p className="text-sm text-zinc-500 leading-relaxed">Recebemos seu currículo. A equipe de RH irá analisar seu perfil em breve.</p>
              <div className="flex items-center gap-2 justify-center mt-4 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                <Sparkles size={13} className="text-emerald-600" />
                <p className="text-xs text-emerald-700 font-semibold">Seu currículo passa pela Triagem Smart IA</p>
              </div>
              <button onClick={onClose} className="mt-5 px-6 py-2.5 bg-develoi-navy text-white rounded-xl text-sm font-black hover:bg-develoi-navy/90 transition">
                Fechar
              </button>
            </motion.div>
          ) : (
            <form ref={formRef} onSubmit={handleSubmit} className="space-y-3.5">
              {[
                { name: "full_name", label: "Nome completo", type: "text", placeholder: "Seu nome completo", required: true },
                { name: "email", label: "E-mail", type: "email", placeholder: "seu@email.com", required: true },
                { name: "phone", label: "Telefone / WhatsApp", type: "tel", placeholder: "(11) 99999-0000", required: false },
                { name: "linkedin", label: "LinkedIn (opcional)", type: "url", placeholder: "linkedin.com/in/seu-perfil", required: false },
              ].map(f => (
                <div key={f.name}>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1.5">{f.label}</label>
                  <input
                    name={f.name} type={f.type} required={f.required} placeholder={f.placeholder}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-sm font-medium outline-none focus:ring-2 focus:ring-develoi-navy/20 focus:border-develoi-navy/30 transition placeholder:text-zinc-300"
                  />
                </div>
              ))}

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1.5">Currículo (PDF ou Word) *</label>
                <label className={cn(
                  "flex flex-col items-center justify-center gap-2 w-full h-20 border-2 border-dashed rounded-xl cursor-pointer transition-all",
                  fileName ? "border-develoi-navy/30 bg-develoi-navy/5" : "border-zinc-200 hover:border-develoi-gold/50 hover:bg-develoi-gold/3"
                )}>
                  <FileText size={18} className={fileName ? "text-develoi-navy" : "text-zinc-300"} />
                  <span className={cn("text-xs font-semibold", fileName ? "text-develoi-navy" : "text-zinc-400")}>
                    {fileName || "Clique para selecionar"}
                  </span>
                  <input name="resume" type="file" accept=".pdf,.doc,.docx" required className="hidden"
                    onChange={e => setFileName(e.target.files?.[0]?.name || "")} />
                </label>
              </div>

              {error && <p className="text-xs text-red-600 font-medium bg-red-50 px-3 py-2.5 rounded-xl border border-red-100">{error}</p>}

              <button
                type="submit" disabled={submitting}
                className="w-full flex items-center justify-center gap-2 bg-develoi-navy text-white py-3 rounded-xl text-sm font-black hover:bg-develoi-navy/90 disabled:opacity-60 active:scale-[0.98] transition-all shadow-lg shadow-develoi-navy/20 mt-1"
              >
                {submitting
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Enviando…</>
                  : <><Send size={14} /> Enviar candidatura</>}
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ─── DistributionModal ────────────────────────────────────────────────────────

function DistributionModal({ onClose }: { onClose: () => void }) {
  const base = window.location.origin;
  const [copied, setCopied] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => { setCopied(key); setTimeout(() => setCopied(null), 2200); });
  };

  const groups: { title: string; dot: string; ids: ChannelStatus[] }[] = [
    { title: "Ativo agora",              dot: "bg-emerald-500", ids: ["ativo"] },
    { title: "Feed XML pronto",          dot: "bg-violet-500",  ids: ["feed"] },
    { title: "Compartilhamento manual",  dot: "bg-blue-500",    ids: ["manual"] },
    { title: "Portais pagos",            dot: "bg-amber-500",   ids: ["pago"] },
    { title: "Em desenvolvimento",       dot: "bg-zinc-400",    ids: ["breve"] },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 20 }}
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
      >
        {/* Header */}
        <div className="bg-develoi-navy px-6 py-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-develoi-gold/20 rounded-xl flex items-center justify-center">
              <Radio size={16} className="text-develoi-gold" />
            </div>
            <div>
              <p className="text-white font-black text-base leading-tight">Canais de Distribuição</p>
              <p className="text-white/40 text-xs mt-0.5">{CHANNELS.length} portais · feeds XML gerados e prontos para uso</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition">
            <X size={14} />
          </button>
        </div>

        {/* Stats bar */}
        <div className="bg-develoi-navy/5 border-b border-zinc-200 px-6 py-3 flex items-center gap-6 shrink-0">
          {[
            { color: "bg-emerald-500", label: "Ativo", count: CHANNELS.filter(c => c.status === "ativo").length },
            { color: "bg-violet-500",  label: "Feed pronto", count: CHANNELS.filter(c => c.status === "feed").length },
            { color: "bg-blue-500",    label: "Manual", count: CHANNELS.filter(c => c.status === "manual").length },
            { color: "bg-amber-500",   label: "Pago", count: CHANNELS.filter(c => c.status === "pago").length },
            { color: "bg-zinc-400",    label: "Em breve", count: CHANNELS.filter(c => c.status === "breve").length },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-500">
              <span className={cn("w-2 h-2 rounded-full", s.color)} />
              <span className="font-black text-zinc-800">{s.count}</span> {s.label}
            </div>
          ))}
        </div>

        <div className="overflow-y-auto p-5 space-y-5">

          {groups.map(group => {
            const chs = CHANNELS.filter(c => group.ids.includes(c.status));
            if (!chs.length) return null;
            return (
              <div key={group.title}>
                <div className="flex items-center gap-2 mb-2.5">
                  <span className={cn("w-2 h-2 rounded-full", group.dot)} />
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{group.title}</p>
                </div>
                <div className="space-y-2">
                  {chs.map(ch => (
                    <div key={ch.id} className={cn("rounded-xl border overflow-hidden transition-all", expanded === ch.id ? "border-develoi-navy/20 bg-develoi-navy/2" : "border-zinc-200/80 bg-zinc-50 hover:border-zinc-300")}>
                      {/* Row */}
                      <button
                        className="w-full flex items-center gap-3 p-3 text-left"
                        onClick={() => setExpanded(expanded === ch.id ? null : ch.id)}
                      >
                        <div className={cn("w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center text-white text-[10px] font-black shrink-0 shadow-sm", ch.color)}>
                          {ch.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-black text-zinc-900">{ch.name}</p>
                            <ChannelBadge status={ch.status} />
                          </div>
                          <p className="text-[11px] text-zinc-500 mt-0.5 truncate">{ch.desc}</p>
                        </div>
                        <ChevronDown size={13} className={cn("text-zinc-400 transition-transform shrink-0", expanded === ch.id && "rotate-180")} />
                      </button>

                      {/* Expanded */}
                      <AnimatePresence initial={false}>
                        {expanded === ch.id && (
                          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                            <div className="px-4 pb-4 space-y-3 border-t border-zinc-200/60 pt-3">
                              {/* Feed URL */}
                              {ch.feedPath && (
                                <div>
                                  <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1.5 flex items-center gap-1">
                                    <Globe size={9} /> URL do Feed
                                  </p>
                                  <div className="flex items-center gap-2 bg-white rounded-lg border border-zinc-200 px-3 py-2">
                                    <p className="flex-1 text-[11px] font-mono text-zinc-600 truncate">{base}{ch.feedPath}</p>
                                    <button
                                      onClick={e => { e.stopPropagation(); copy(base + ch.feedPath!, ch.id + "-feed"); }}
                                      className="shrink-0 flex items-center gap-1 text-[9px] font-black text-develoi-navy px-2 py-1 rounded-md bg-develoi-navy/5 hover:bg-develoi-navy/10 transition"
                                    >
                                      {copied === ch.id + "-feed" ? <Check size={9} className="text-emerald-500" /> : <Copy size={9} />}
                                      {copied === ch.id + "-feed" ? "Copiado!" : "Copiar"}
                                    </button>
                                    <a
                                      href={base + ch.feedPath} target="_blank" rel="noreferrer"
                                      onClick={e => e.stopPropagation()}
                                      className="shrink-0 p-1 text-zinc-400 hover:text-zinc-700 transition"
                                    >
                                      <ExternalLink size={12} />
                                    </a>
                                  </div>
                                </div>
                              )}

                              {/* Instrução de cadastro */}
                              {ch.cadastroDesc && (
                                <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2.5">
                                  <p className="text-[9px] font-black uppercase tracking-widest text-amber-600 mb-1">Como cadastrar</p>
                                  <p className="text-[11px] text-amber-800 leading-relaxed">{ch.cadastroDesc}</p>
                                </div>
                              )}

                              {/* Link de cadastro */}
                              {ch.cadastroUrl && (
                                <a
                                  href={ch.cadastroUrl} target="_blank" rel="noreferrer"
                                  onClick={e => e.stopPropagation()}
                                  className="inline-flex items-center gap-1.5 text-[11px] font-black text-develoi-navy hover:underline"
                                >
                                  <ExternalLink size={11} /> Acessar portal de cadastro
                                </a>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Nota final */}
          <div className="bg-zinc-50 rounded-2xl border border-zinc-200 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">Como funciona</p>
            <ol className="space-y-1.5 text-[11px] text-zinc-600 leading-relaxed list-none">
              {[
                "Publique a vaga no sistema (is_public = ativado)",
                "A vaga entra automaticamente em todos os feeds XML",
                "Copie a URL do feed do portal desejado",
                "Cadastre-se no portal e envie a URL do feed",
                "O portal indexa suas vagas automaticamente a cada 1–24h",
                "Candidatos chegam diretamente no banco da Triagem Smart",
              ].map((s, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-develoi-navy text-white text-[8px] font-black flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                  {s}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function EmpregoPortal() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [applyJob, setApplyJob] = useState<any>(null);
  const [showDistrib, setShowDistrib] = useState(false);
  const [search, setSearch] = useState("");
  const [filterModel, setFilterModel] = useState("");
  const [filterState, setFilterState] = useState("");
  const [filterContract, setFilterContract] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const match = window.location.pathname.match(/\/empregos\/vaga\/([^/]+)/);
    if (match) {
      fetch(`/api/public/jobs/${match[1]}`).then(r => r.json()).then(d => { if (!d.error) setSelectedJob(d); }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    document.title = "Triagem Smart — Portal de Empregos";
    fetch("/api/public/jobs").then(r => r.json()).then(setJobs).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const openJob = (job: any) => {
    setSelectedJob(job);
    window.history.pushState(null, "", `/empregos/vaga/${job.public_slug || job.id}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const closeJob = () => {
    setSelectedJob(null);
    window.history.pushState(null, "", "/empregos");
    document.title = "Triagem Smart — Portal de Empregos";
  };

  const models    = useMemo(() => Array.from(new Set(jobs.map(j => j.work_model).filter(Boolean))).sort(), [jobs]);
  const states    = useMemo(() => Array.from(new Set(jobs.map(j => j.state).filter(Boolean))).sort(), [jobs]);
  const contracts = useMemo(() => Array.from(new Set(jobs.map(j => j.contract_type).filter(Boolean))).sort(), [jobs]);
  const companies = useMemo(() => Array.from(new Set(jobs.map(j => j.company_name || j.tenant_name).filter(Boolean))), [jobs]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return jobs.filter(j =>
      (!q || j.title.toLowerCase().includes(q) || (j.department || "").toLowerCase().includes(q) || (j.city || "").toLowerCase().includes(q) || (j.company_name || j.tenant_name || "").toLowerCase().includes(q))
      && (!filterModel || j.work_model === filterModel)
      && (!filterState || j.state === filterState)
      && (!filterContract || j.contract_type === filterContract)
    );
  }, [jobs, search, filterModel, filterState, filterContract]);

  const hasFilters = !!(search || filterModel || filterState || filterContract);
  const clearFilters = () => { setSearch(""); setFilterModel(""); setFilterState(""); setFilterContract(""); };

  return (
    <div className="min-h-screen bg-[#F5F6FA] font-sans">

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-zinc-200/70 shadow-sm">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center gap-4">
          <a href="/empregos" onClick={e => { e.preventDefault(); closeJob(); }} className="flex items-center gap-3 shrink-0 hover:opacity-80 transition-opacity">
            <div className="w-9 h-9 bg-develoi-navy rounded-xl flex items-center justify-center shadow-md shadow-develoi-navy/20">
              <Sparkles size={16} className="text-develoi-gold" />
            </div>
            <div className="hidden sm:block">
              <p className="text-[13px] font-black text-develoi-navy uppercase tracking-tight leading-none">Triagem Smart</p>
              <p className="text-[8px] text-zinc-400 font-bold uppercase tracking-widest mt-0.5">Portal de Empregos</p>
            </div>
          </a>

          <div className="flex-1" />

          {!selectedJob && (
            <div className="flex-1 max-w-sm hidden lg:block">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={13} />
                <input type="text" placeholder="Buscar vagas…" value={search} onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-develoi-gold/25 transition-all placeholder:text-zinc-300 font-medium" />
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDistrib(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 text-xs font-black text-zinc-600 hover:bg-zinc-50 hover:border-zinc-300 transition-all"
            >
              <Radio size={12} className="text-develoi-gold" />
              <span className="hidden sm:inline">Canais</span>
            </button>

            {!loading && (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-develoi-gold/10 rounded-xl border border-develoi-gold/20">
                <Zap size={11} className="text-develoi-gold" />
                <span className="text-[11px] font-black text-develoi-gold">{jobs.length} vagas</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <AnimatePresence mode="wait">

        {/* ── DETAIL ── */}
        {selectedJob ? (
          <JobDetail key="detail" job={selectedJob} onBack={closeJob} onApply={() => setApplyJob(selectedJob)} />
        ) : (

          /* ── LIST ── */
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

            {/* Hero */}
            <div className="relative bg-develoi-navy overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(212,168,58,0.15),_transparent_60%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(99,102,241,0.1),_transparent_60%)]" />
              <div className="relative max-w-6xl mx-auto px-5 py-14 sm:py-20 text-center">
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  className="inline-flex items-center gap-2 bg-develoi-gold/15 text-develoi-gold border border-develoi-gold/25 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-5">
                  <Zap size={10} />
                  {loading ? "Carregando…" : `${jobs.length} oportunidade${jobs.length !== 1 ? "s" : ""} abertas`}
                </motion.div>

                <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}
                  className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.05] mb-4">
                  Encontre sua próxima<br />
                  <span className="text-develoi-gold">grande oportunidade</span>
                </motion.h1>

                <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                  className="text-white/50 text-sm sm:text-base max-w-lg mx-auto mb-8 leading-relaxed">
                  Vagas selecionadas das melhores empresas. Candidate-se em segundos com Triagem Smart IA.
                </motion.p>

                {/* Search */}
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}
                  className="max-w-2xl mx-auto">
                  <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-2 flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" size={14} />
                      <input type="text" placeholder="Cargo, empresa ou cidade…" value={search} onChange={e => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-transparent text-white placeholder:text-white/40 text-sm font-medium outline-none" />
                    </div>
                    <button onClick={() => setShowFilters(v => !v)}
                      className={cn("flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all", showFilters ? "bg-develoi-gold text-develoi-navy" : "bg-white/15 text-white hover:bg-white/20")}>
                      <Filter size={12} /> Filtros {hasFilters && <span className="w-2 h-2 bg-develoi-gold rounded-full" />}
                    </button>
                  </div>

                  <AnimatePresence>
                    {showFilters && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                        <div className="pt-2 flex flex-wrap gap-2 justify-center">
                          {[
                            { val: filterModel, set: setFilterModel, opts: models, placeholder: "Modalidade" },
                            { val: filterState, set: setFilterState, opts: states, placeholder: "Estado" },
                            { val: filterContract, set: setFilterContract, opts: contracts, placeholder: "Contrato" },
                          ].map(f => (
                            <select key={f.placeholder} value={f.val} onChange={e => f.set(e.target.value)}
                              className="px-3 py-2 rounded-xl border border-white/20 bg-white/10 text-white text-xs font-semibold outline-none focus:bg-white/20 backdrop-blur-sm">
                              <option value="" className="text-zinc-800 bg-white">{f.placeholder}</option>
                              {f.opts.map(o => <option key={o} value={o} className="text-zinc-800 bg-white">{o}</option>)}
                            </select>
                          ))}
                          {hasFilters && (
                            <button onClick={clearFilters} className="px-3 py-2 rounded-xl border border-white/20 bg-white/10 text-white/70 text-xs font-semibold flex items-center gap-1 hover:bg-white/20 transition">
                              <X size={11} /> Limpar
                            </button>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>

                {/* Stats row */}
                {!loading && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
                    className="flex items-center justify-center gap-6 mt-8">
                    {[
                      { icon: <Briefcase size={13} />, label: `${jobs.length} vagas` },
                      { icon: <Building2 size={13} />, label: `${companies.length} empresa${companies.length !== 1 ? "s" : ""}` },
                      { icon: <Users size={13} />, label: "Triagem Smart IA" },
                    ].map(s => (
                      <div key={s.label} className="flex items-center gap-1.5 text-white/50 text-xs font-semibold">
                        {s.icon} {s.label}
                      </div>
                    ))}
                  </motion.div>
                )}
              </div>
            </div>

            {/* Content */}
            <main className="max-w-6xl mx-auto px-5 py-8">

              {loading ? (
                <div className="flex flex-col items-center justify-center py-24 gap-4">
                  <div className="w-10 h-10 border-[3px] border-develoi-navy/20 border-t-develoi-navy rounded-full animate-spin" />
                  <p className="text-xs font-black text-zinc-400 uppercase tracking-widest">Buscando vagas…</p>
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
                  <div className="w-16 h-16 bg-zinc-100 rounded-2xl flex items-center justify-center">
                    <Briefcase size={24} className="text-zinc-400" />
                  </div>
                  <div>
                    <p className="text-base font-black text-zinc-700">Nenhuma vaga encontrada</p>
                    <p className="text-sm text-zinc-400 mt-1">Tente outros termos ou remova os filtros</p>
                  </div>
                  {hasFilters && (
                    <button onClick={clearFilters} className="text-xs font-semibold text-develoi-gold hover:underline flex items-center gap-1">
                      <X size={11} /> Limpar filtros
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {hasFilters && (
                    <div className="flex items-center justify-between mb-5">
                      <p className="text-sm font-semibold text-zinc-500">
                        <span className="text-zinc-900 font-black">{filtered.length}</span> vaga{filtered.length !== 1 ? "s" : ""} encontrada{filtered.length !== 1 ? "s" : ""}
                      </p>
                      <button onClick={clearFilters} className="text-xs font-semibold text-zinc-400 hover:text-zinc-700 flex items-center gap-1 transition">
                        <X size={11} /> Limpar filtros
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map((job, i) => (
                      <motion.div key={job.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.04, 0.3) }}>
                        <JobCard job={job} onClick={() => openJob(job)} />
                      </motion.div>
                    ))}
                  </div>
                </>
              )}
            </main>

            {/* Footer */}
            <footer className="border-t border-zinc-200 bg-white mt-6">
              <div className="max-w-6xl mx-auto px-5 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-develoi-navy rounded-lg flex items-center justify-center">
                    <Sparkles size={13} className="text-develoi-gold" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-develoi-navy">Triagem Smart</p>
                    <p className="text-[10px] text-zinc-400">Portal de Empregos</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <button onClick={() => setShowDistrib(true)} className="text-xs text-zinc-400 hover:text-zinc-700 font-semibold flex items-center gap-1.5 transition">
                    <Radio size={11} /> Canais de distribuição
                  </button>
                  <span className="text-zinc-200">|</span>
                  <p className="text-xs text-zinc-400">
                    Powered by <span className="font-black text-develoi-gold">Triagem Smart IA</span>
                  </p>
                </div>
              </div>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Modals ── */}
      <AnimatePresence>
        {applyJob && <ApplyModal key="apply" job={applyJob} onClose={() => setApplyJob(null)} />}
        {showDistrib && <DistributionModal key="distrib" onClose={() => setShowDistrib(false)} />}
      </AnimatePresence>
    </div>
  );
}
