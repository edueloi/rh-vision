import React, { useEffect, useRef, useState } from "react";
import {
  MapPin, Briefcase, Globe, FileText, Send, CheckCircle2,
  ArrowLeft, Clock, Award, GraduationCap, DollarSign,
  Building2, Zap, Star, Users, Phone, ChevronRight,
  Car, Plane, Home, Heart, ShieldCheck, Sparkles,
  TrendingUp, Target, BookOpen, Coffee, Laptop, Lightbulb,
  Share2, Copy, Check, ExternalLink, AlertCircle, Info,
  ChevronDown, ChevronUp,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatSalary(min?: number | null, max?: number | null) {
  if (!min && !max) return "A combinar";
  const fmt = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (min) return `A partir de ${fmt(min)}`;
  return `Até ${fmt(max!)}`;
}

function timeAgo(date?: string) {
  if (!date) return "";
  const d = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
  if (d === 0) return "Publicada hoje";
  if (d === 1) return "Publicada ontem";
  if (d < 7) return `Publicada há ${d} dias`;
  if (d < 30) return `Publicada há ${Math.floor(d / 7)} semana${Math.floor(d / 7) > 1 ? "s" : ""}`;
  return `Publicada há ${Math.floor(d / 30)} mese${Math.floor(d / 30) > 1 ? "s" : ""}`;
}

function workModelColor(model?: string) {
  if (model === "Home Office") return { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-500" };
  if (model === "Híbrido") return { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", dot: "bg-blue-500" };
  return { bg: "bg-zinc-100", text: "text-zinc-600", border: "border-zinc-200", dot: "bg-zinc-400" };
}

function seniorityColor(level?: string) {
  if (!level) return "bg-zinc-100 text-zinc-600";
  if (level === "Júnior") return "bg-sky-50 text-sky-700 border border-sky-200";
  if (level === "Pleno") return "bg-violet-50 text-violet-700 border border-violet-200";
  if (level === "Sênior") return "bg-amber-50 text-amber-700 border border-amber-200";
  if (level === "Gerência" || level === "Diretoria") return "bg-rose-50 text-rose-700 border border-rose-200";
  return "bg-zinc-100 text-zinc-600 border border-zinc-200";
}

// ─────────────────────────────────────────────────────────────────────────────
// Schema.org injector
// ─────────────────────────────────────────────────────────────────────────────

function injectSchema(job: any, baseUrl: string) {
  document.getElementById("job-schema-ld")?.remove();
  const slug = job.public_slug || job.id;
  const schema: Record<string, any> = {
    "@context": "https://schema.org/",
    "@type": "JobPosting",
    title: job.title,
    description: [job.description, job.responsibilities, job.technical_requirements, job.benefits]
      .filter(Boolean).join("\n\n"),
    datePosted: new Date(job.created_at).toISOString(),
    validThrough: new Date(new Date(job.created_at).getTime() + 90 * 86400000).toISOString(),
    employmentType: job.contract_type === "CLT" ? "FULL_TIME" : job.contract_type === "PJ" ? "CONTRACTOR" : job.contract_type === "Estágio" ? "INTERN" : job.contract_type === "Temporário" ? "TEMPORARY" : "OTHER",
    hiringOrganization: { "@type": "Organization", name: job.company_name || job.tenant_name || "RH Vision" },
    jobLocation: { "@type": "Place", address: { "@type": "PostalAddress", addressLocality: job.city, addressRegion: job.state, addressCountry: "BR" } },
    url: `${baseUrl}/vaga/${slug}`,
  };
  if (job.work_model === "Home Office") schema.jobLocationType = "TELECOMMUTE";
  if (job.salary_min || job.salary_max) {
    schema.baseSalary = { "@type": "MonetaryAmount", currency: "BRL", value: { "@type": "QuantitativeValue", ...(job.salary_min ? { minValue: job.salary_min } : {}), ...(job.salary_max ? { maxValue: job.salary_max } : {}), unitText: "MONTH" } };
  }
  if (job.seniority_level) schema.experienceRequirements = job.seniority_level;
  if (job.education_level) schema.educationRequirements = job.education_level;
  const s = document.createElement("script");
  s.id = "job-schema-ld"; s.type = "application/ld+json"; s.textContent = JSON.stringify(schema);
  document.head.appendChild(s);
  return () => document.getElementById("job-schema-ld")?.remove();
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function SectionCard({ icon: Icon, title, children, accent = false }: { icon: any; title: string; children: React.ReactNode; accent?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-zinc-100 overflow-hidden shadow-sm"
    >
      <div className={`flex items-center gap-3 px-6 py-4 border-b border-zinc-50 ${accent ? "bg-gradient-to-r from-develoi-navy/[0.03] to-transparent" : ""}`}>
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${accent ? "bg-develoi-gold/15" : "bg-zinc-100"}`}>
          <Icon size={14} className={accent ? "text-develoi-gold" : "text-zinc-500"} />
        </div>
        <h2 className="text-[11px] font-black uppercase tracking-widest text-zinc-500">{title}</h2>
      </div>
      <div className="px-6 py-5">{children}</div>
    </motion.div>
  );
}

function RichContent({ html }: { html: string }) {
  return (
    <div
      className="text-sm text-zinc-600 leading-relaxed space-y-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1 [&_li]:text-zinc-600 [&_strong]:font-bold [&_strong]:text-zinc-800 [&_p]:mb-2"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function InfoChip({ icon: Icon, label, value, color = "zinc" }: { icon: any; label: string; value: string; color?: string }) {
  const colors: Record<string, string> = {
    zinc: "bg-zinc-50 border-zinc-200 text-zinc-700",
    gold: "bg-amber-50 border-amber-200 text-amber-700",
    blue: "bg-blue-50 border-blue-200 text-blue-700",
    green: "bg-emerald-50 border-emerald-200 text-emerald-700",
    violet: "bg-violet-50 border-violet-200 text-violet-700",
  };
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border ${colors[color] || colors.zinc}`}>
      <Icon size={15} className="shrink-0 opacity-60" />
      <div className="min-w-0">
        <p className="text-[9px] font-black uppercase tracking-widest opacity-60 leading-none mb-0.5">{label}</p>
        <p className="text-xs font-bold leading-snug truncate">{value}</p>
      </div>
    </div>
  );
}

function ProgressStep({ step, label, active, done }: { step: number; label: string; active?: boolean; done?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 transition-all ${done ? "bg-emerald-500 text-white" : active ? "bg-develoi-gold text-white shadow-md shadow-develoi-gold/30" : "bg-zinc-100 text-zinc-400"}`}>
        {done ? <Check size={12} /> : step}
      </div>
      <span className={`text-xs font-bold ${active ? "text-zinc-900" : done ? "text-emerald-700" : "text-zinc-400"}`}>{label}</span>
    </div>
  );
}

function ShareButton({ url, title, compact = false }: { url: string; title: string; compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const copy = async () => {
    await navigator.clipboard.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const whatsappText = encodeURIComponent(`🚀 *${title}*\n\nVaga aberta! Candidate-se agora:\n${url}`);

  const channels = [
    { label: "WhatsApp", color: "bg-[#25D366] text-white", href: `https://wa.me/?text=${whatsappText}`, icon: "💬" },
    { label: "LinkedIn", color: "bg-[#0077B5] text-white", href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, icon: "in" },
    { label: "Telegram", color: "bg-[#229ED9] text-white", href: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`, icon: "✈️" },
    { label: "E-mail", color: "bg-zinc-600 text-white", href: `mailto:?subject=${encodeURIComponent(`Vaga: ${title}`)}&body=${encodeURIComponent(`Vaga aberta: ${title}\n\nSe candidate: ${url}`)}`, icon: "✉️" },
    { label: "Twitter/X", color: "bg-black text-white", href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(`🚀 ${title}`)}&url=${encodeURIComponent(url)}`, icon: "𝕏" },
  ];

  if (compact) {
    return (
      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen(v => !v)}
          className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-develoi-navy transition-colors px-3 py-1.5 rounded-xl border border-zinc-200 hover:border-develoi-navy/20 bg-white"
        >
          <Share2 size={11} /> Compartilhar
        </button>
        {open && (
          <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl border border-zinc-100 p-2 z-50">
            {channels.map(c => (
              <a key={c.label} href={c.href} target="_blank" rel="noreferrer"
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-zinc-50 transition-colors text-xs font-bold text-zinc-700">
                <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black ${c.color}`}>{c.icon}</span>
                {c.label}
              </a>
            ))}
            <div className="border-t border-zinc-100 mt-1 pt-1">
              <button onClick={copy} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-zinc-50 transition-colors text-xs font-bold text-zinc-700">
                <span className="w-6 h-6 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0">
                  {copied ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} className="text-zinc-500" />}
                </span>
                {copied ? "Copiado!" : "Copiar link"}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {channels.map(c => (
        <a key={c.label} href={c.href} target="_blank" rel="noreferrer"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black transition-all active:scale-[0.97] shadow-sm ${c.color}`}>
          <span>{c.icon}</span> {c.label}
        </a>
      ))}
      <button onClick={copy} className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-develoi-navy transition-colors px-3 py-1.5 rounded-xl border border-zinc-200 hover:border-develoi-navy/20 bg-white">
        {copied ? <><Check size={11} className="text-emerald-500" /> Copiado!</> : <><Copy size={11} /> Copiar link</>}
      </button>
    </div>
  );
}

function CollapsibleSection({ icon: Icon, title, children, defaultOpen = true, accent = false }: { icon: any; title: string; children: React.ReactNode; defaultOpen?: boolean; accent?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-zinc-100 overflow-hidden shadow-sm">
      <button onClick={() => setOpen(v => !v)} className={`w-full flex items-center justify-between gap-3 px-6 py-4 border-b border-zinc-50 hover:bg-zinc-50/50 transition-colors ${accent ? "bg-gradient-to-r from-develoi-navy/[0.03] to-transparent" : ""}`}>
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${accent ? "bg-develoi-gold/15" : "bg-zinc-100"}`}>
            <Icon size={14} className={accent ? "text-develoi-gold" : "text-zinc-500"} />
          </div>
          <h2 className="text-[11px] font-black uppercase tracking-widest text-zinc-500">{title}</h2>
        </div>
        <div className="text-zinc-300">
          {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-6 py-5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

export default function PublicJobPage() {
  const slugOrId = window.location.pathname.replace(/^\/vaga\//, "");
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [applied, setApplied] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [formStep, setFormStep] = useState(0); // 0=filling, 1=success
  const formRef = useRef<HTMLFormElement>(null);
  const applyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/public/jobs/${slugOrId}`)
      .then(r => { if (!r.ok) throw new Error("not found"); return r.json(); })
      .then(data => {
        setJob(data);
        const cleanup = injectSchema(data, window.location.origin);
        const company = data.company_name || data.tenant_name || "Portal de Vagas";
        document.title = `${data.title} em ${data.city}/${data.state} | ${company}`;
        const sm = (n: string, c: string, p = false) => {
          const a = p ? "property" : "name";
          let el = document.querySelector(`meta[${a}="${n}"]`) as HTMLMetaElement | null;
          if (!el) { el = document.createElement("meta"); el.setAttribute(a, n); document.head.appendChild(el); }
          el.content = c;
        };
        sm("description", `${data.title} em ${data.city}/${data.state}. ${data.work_model || ""}. ${data.contract_type || ""}. Candidate-se agora.`);
        sm("robots", "index, follow");
        sm("og:title", `${data.title} | ${company}`, true);
        sm("og:description", `Vaga: ${data.title} — ${data.city}/${data.state}. Candidate-se pelo portal.`, true);
        sm("og:type", "website", true);
        sm("og:url", window.location.href, true);
        return cleanup;
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slugOrId]);

  const handleApply = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!job) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/public/jobs/${job.id}/apply`, { method: "POST", body: new FormData(e.currentTarget) });
      const data = await res.json();
      if (!res.ok) { alert(data.error || "Erro ao enviar candidatura."); return; }
      setApplied(true);
      setFormStep(1);
    } catch { alert("Erro de conexão. Tente novamente."); }
    finally { setSubmitting(false); }
  };

  const scrollToApply = () => applyRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  // ── Loading ──
  if (loading) return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
      <div className="flex flex-col items-center gap-5">
        <div className="relative w-14 h-14">
          <div className="absolute inset-0 rounded-full border-[3px] border-develoi-navy/10" />
          <div className="absolute inset-0 rounded-full border-[3px] border-t-develoi-gold border-x-transparent border-b-transparent animate-spin" />
          <div className="absolute inset-3 rounded-full bg-develoi-gold/10 flex items-center justify-center">
            <Briefcase size={14} className="text-develoi-gold" />
          </div>
        </div>
        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em]">Carregando vaga…</p>
      </div>
    </div>
  );

  // ── Not found ──
  if (notFound) return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="w-20 h-20 rounded-3xl bg-zinc-100 flex items-center justify-center shadow-inner">
        <Briefcase size={32} className="text-zinc-300" />
      </div>
      <div className="space-y-2">
        <p className="text-2xl font-black text-zinc-800">Vaga não encontrada</p>
        <p className="text-sm text-zinc-500 max-w-xs mx-auto leading-relaxed">Esta vaga pode ter sido encerrada ou o link está incorreto. Explore outras oportunidades.</p>
      </div>
      <a href="/portal" className="flex items-center gap-2 text-sm font-black text-white bg-develoi-navy px-6 py-3 rounded-2xl hover:bg-develoi-navy/90 transition-all shadow-lg shadow-develoi-navy/20">
        <ArrowLeft size={15} /> Ver todas as vagas
      </a>
    </div>
  );

  const company = job.company_name || job.tenant_name || "Empresa";
  const wm = workModelColor(job.work_model);
  const hasRequirements = job.technical_requirements || job.mandatory_requirements || job.desirable_requirements || job.eliminatory_criteria;
  const hasSalary = job.salary_min || job.salary_max;
  const daysOpen = Math.floor((Date.now() - new Date(job.created_at).getTime()) / 86400000);

  // Parse tags
  const tags: string[] = job.tags ? (typeof job.tags === "string" ? job.tags.split(/[,;|]/).map((t: string) => t.trim()).filter(Boolean) : []) : [];

  return (
    <div className="min-h-screen bg-[#F7F8FC] font-sans">

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-50 bg-white/96 backdrop-blur-xl border-b border-zinc-100 shadow-[0_1px_20px_rgba(0,0,0,0.06)]">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between gap-4">
          <a href="/portal" className="flex items-center gap-3 hover:opacity-80 transition-opacity shrink-0">
            <div className="w-9 h-9 bg-develoi-navy rounded-xl flex items-center justify-center shadow-lg shadow-develoi-navy/25">
              <Sparkles size={15} className="text-develoi-gold" />
            </div>
            <div className="hidden sm:block">
              <p className="text-[13px] font-black text-develoi-navy uppercase tracking-tight leading-none">{company}</p>
              <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-[0.25em] mt-0.5">Portal de Vagas</p>
            </div>
          </a>

          {/* Center: job title breadcrumb */}
          <div className="hidden md:flex items-center gap-2 min-w-0 flex-1 justify-center">
            <a href="/portal" className="text-[10px] font-bold text-zinc-400 hover:text-develoi-navy transition-colors whitespace-nowrap">Vagas</a>
            <ChevronRight size={10} className="text-zinc-300 shrink-0" />
            <span className="text-[10px] font-black text-zinc-700 truncate max-w-xs">{job.title}</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <ShareButton url={window.location.href} title={job.title} compact />
            <button
              onClick={scrollToApply}
              className="hidden sm:flex items-center gap-2 bg-develoi-gold text-white text-xs font-black px-4 py-2 rounded-xl hover:bg-develoi-gold/90 transition-all shadow-sm shadow-develoi-gold/25"
            >
              <Zap size={12} /> Candidatar-se
            </button>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <div className="bg-develoi-navy relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-white/[0.03] rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-develoi-gold/10 rounded-full blur-3xl -translate-x-1/3 translate-y-1/3" />
          <div className="absolute top-1/2 left-1/2 w-px h-full bg-gradient-to-b from-transparent via-white/[0.04] to-transparent" />
          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle, #c5a04d 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-5 sm:px-8 py-12 sm:py-16">
          <div className="flex flex-col lg:flex-row gap-10 items-start lg:items-end justify-between">

            {/* Left: main info */}
            <div className="space-y-5 flex-1 min-w-0">
              {/* Badges row */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/25">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Vaga Aberta
                </span>
                {job.department && (
                  <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-full bg-white/10 text-white/80 border border-white/15">
                    {job.department}
                  </span>
                )}
                {job.seniority_level && (
                  <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-full bg-develoi-gold/20 text-develoi-gold border border-develoi-gold/25">
                    {job.seniority_level}
                  </span>
                )}
                {daysOpen <= 7 && (
                  <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/25">
                    Nova
                  </span>
                )}
              </div>

              {/* Title */}
              <div className="space-y-2">
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-[1.1] tracking-tight">
                  {job.title}
                </h1>
                <div className="flex items-center gap-2">
                  <Building2 size={13} className="text-develoi-gold shrink-0" />
                  <p className="text-sm text-white/60 font-semibold">{company}</p>
                </div>
              </div>

              {/* Meta row */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                <span className="text-xs text-white/60 flex items-center gap-1.5 font-medium">
                  <MapPin size={13} className="text-develoi-gold" /> {job.city}{job.state ? `, ${job.state}` : ""}
                </span>
                {job.work_model && (
                  <span className="text-xs text-white/60 flex items-center gap-1.5 font-medium">
                    <Globe size={13} className="text-develoi-gold" /> {job.work_model}
                  </span>
                )}
                {job.contract_type && (
                  <span className="text-xs text-white/60 flex items-center gap-1.5 font-medium">
                    <FileText size={13} className="text-develoi-gold" /> {job.contract_type}
                  </span>
                )}
                {job.workload && (
                  <span className="text-xs text-white/60 flex items-center gap-1.5 font-medium">
                    <Clock size={13} className="text-develoi-gold" /> {job.workload}
                  </span>
                )}
                <span className="text-xs text-white/40 flex items-center gap-1.5 font-medium">
                  <Clock size={11} /> {timeAgo(job.created_at)}
                </span>
              </div>

              {/* Tags */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {tags.map(t => (
                    <span key={t} className="text-[9px] font-bold px-2 py-1 rounded-lg bg-white/8 text-white/50 border border-white/10">
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Right: salary + CTA card */}
            <div className="w-full lg:w-72 shrink-0">
              <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-3xl p-6 space-y-5">
                {/* Salary */}
                <div className="text-center pb-4 border-b border-white/10">
                  <p className="text-[9px] font-black uppercase tracking-[0.3em] text-develoi-gold mb-2">Remuneração</p>
                  <p className="text-2xl sm:text-3xl font-black text-white leading-none">
                    {formatSalary(job.salary_min, job.salary_max)}
                  </p>
                  {hasSalary && <p className="text-[9px] text-white/35 font-medium mt-1.5">por mês</p>}
                </div>

                {/* Quick facts */}
                <div className="space-y-2.5 text-xs">
                  {job.work_model && (
                    <div className="flex items-center justify-between">
                      <span className="text-white/45 font-medium">Modelo</span>
                      <span className={`font-black px-2 py-0.5 rounded-full text-[10px] ${job.work_model === "Home Office" ? "bg-emerald-500/20 text-emerald-300" : job.work_model === "Híbrido" ? "bg-blue-500/20 text-blue-300" : "bg-white/10 text-white/70"}`}>
                        {job.work_model}
                      </span>
                    </div>
                  )}
                  {job.contract_type && (
                    <div className="flex items-center justify-between">
                      <span className="text-white/45 font-medium">Contrato</span>
                      <span className="font-black text-white/80 text-[10px]">{job.contract_type}</span>
                    </div>
                  )}
                  {job.seniority_level && (
                    <div className="flex items-center justify-between">
                      <span className="text-white/45 font-medium">Nível</span>
                      <span className="font-black text-develoi-gold text-[10px]">{job.seniority_level}</span>
                    </div>
                  )}
                  {job.min_experience_years != null && (
                    <div className="flex items-center justify-between">
                      <span className="text-white/45 font-medium">Experiência</span>
                      <span className="font-black text-white/80 text-[10px]">{job.min_experience_years}+ anos</span>
                    </div>
                  )}
                </div>

                {/* CTA Button */}
                <button
                  onClick={scrollToApply}
                  className="w-full flex items-center justify-center gap-2 bg-develoi-gold text-white font-black text-sm py-3.5 rounded-2xl hover:bg-develoi-gold/90 active:scale-[0.98] transition-all shadow-xl shadow-develoi-gold/30"
                >
                  <Zap size={15} /> Candidatar-se agora
                </button>

                <p className="text-[9px] text-white/30 text-center font-medium">
                  Processo 100% online · Resposta rápida
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Wave divider */}
        <div className="relative h-8 overflow-hidden">
          <svg className="absolute bottom-0 w-full" viewBox="0 0 1440 32" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
            <path d="M0 32L1440 32L1440 0C1440 0 1080 32 720 32C360 32 0 0 0 0L0 32Z" fill="#F7F8FC" />
          </svg>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-8">
        <div className="grid lg:grid-cols-5 gap-6 items-start">

          {/* ── LEFT COLUMN ── */}
          <div className="lg:col-span-3 space-y-4">

            {/* Quick info grid */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {job.city && <InfoChip icon={MapPin} label="Localização" value={`${job.city}, ${job.state || ""}`} color="zinc" />}
              {job.work_model && <InfoChip icon={Globe} label="Modelo" value={job.work_model} color={job.work_model === "Home Office" ? "green" : job.work_model === "Híbrido" ? "blue" : "zinc"} />}
              {job.contract_type && <InfoChip icon={FileText} label="Contrato" value={job.contract_type} color="zinc" />}
              {job.seniority_level && <InfoChip icon={TrendingUp} label="Nível" value={job.seniority_level} color="gold" />}
              {job.min_experience_years != null && <InfoChip icon={Award} label="Experiência" value={`${job.min_experience_years}+ anos`} color="violet" />}
              {job.education_level && <InfoChip icon={GraduationCap} label="Escolaridade" value={job.education_level} color="zinc" />}
              {job.workload && <InfoChip icon={Clock} label="Carga horária" value={job.workload} color="zinc" />}
              {job.work_schedule && <InfoChip icon={Coffee} label="Horário" value={job.work_schedule} color="zinc" />}
            </motion.div>

            {/* Special requirements */}
            {(job.requires_cnh || job.requires_travel || job.requires_relocation) && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle size={14} className="text-amber-600" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">Requisitos especiais</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {job.requires_cnh && (
                    <span className="flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-xl">
                      <Car size={12} /> CNH Categoria {job.cnh_category || "Exigida"}
                    </span>
                  )}
                  {job.requires_travel && (
                    <span className="flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-xl">
                      <Plane size={12} /> Disponibilidade para viagens
                    </span>
                  )}
                  {job.requires_relocation && (
                    <span className="flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-xl">
                      <Home size={12} /> Disponibilidade para mudança
                    </span>
                  )}
                </div>
              </motion.div>
            )}

            {/* About the job */}
            {job.description && (
              <CollapsibleSection icon={FileText} title="Sobre a vaga" accent defaultOpen>
                <RichContent html={job.description} />
              </CollapsibleSection>
            )}

            {/* Responsibilities */}
            {job.responsibilities && (
              <CollapsibleSection icon={Target} title="Responsabilidades e atividades" accent>
                <RichContent html={job.responsibilities} />
              </CollapsibleSection>
            )}

            {/* Requirements */}
            {hasRequirements && (
              <CollapsibleSection icon={BookOpen} title="Requisitos">
                <div className="space-y-5">
                  {job.mandatory_requirements && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="w-2 h-2 rounded-full bg-rose-500" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-rose-600">Obrigatórios</p>
                      </div>
                      <RichContent html={job.mandatory_requirements} />
                    </div>
                  )}
                  {job.technical_requirements && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="w-2 h-2 rounded-full bg-develoi-gold" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">Técnicos</p>
                      </div>
                      <RichContent html={job.technical_requirements} />
                    </div>
                  )}
                  {job.desirable_requirements && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="w-2 h-2 rounded-full bg-sky-500" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-sky-700">Diferenciais</p>
                      </div>
                      <RichContent html={job.desirable_requirements} />
                    </div>
                  )}
                  {job.eliminatory_criteria && (
                    <div className="mt-4 p-4 bg-rose-50 border border-rose-100 rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle size={13} className="text-rose-500" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-rose-700">Critérios eliminatórios</p>
                      </div>
                      <RichContent html={job.eliminatory_criteria} />
                    </div>
                  )}
                </div>
              </CollapsibleSection>
            )}

            {/* Benefits */}
            {job.benefits && (
              <CollapsibleSection icon={Heart} title="Benefícios e vantagens" accent>
                <RichContent html={job.benefits} />
              </CollapsibleSection>
            )}

            {/* Process tips card */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-br from-develoi-navy to-[#0d2240] rounded-2xl overflow-hidden relative">
              <div className="absolute inset-0 pointer-events-none opacity-[0.06]" style={{ backgroundImage: "radial-gradient(circle, #c5a04d 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
              <div className="relative z-10 p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-9 h-9 bg-develoi-gold/20 rounded-xl flex items-center justify-center">
                    <Lightbulb size={16} className="text-develoi-gold" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-white uppercase tracking-widest">Dicas para se destacar</p>
                    <p className="text-[9px] text-white/40 font-medium">Aumente suas chances de aprovação</p>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  {[
                    { icon: FileText, tip: "Personalize seu currículo com as palavras-chave da vaga" },
                    { icon: Laptop, tip: "Destaque projetos e resultados com números e métricas" },
                    { icon: Users, tip: "Inclua referências profissionais e recomendações relevantes" },
                    { icon: Star, tip: "Capriche na foto e apresentação do LinkedIn" },
                    { icon: Target, tip: "Leia a descrição completa antes de se candidatar" },
                    { icon: TrendingUp, tip: "Prepare exemplos reais de experiências anteriores" },
                  ].map(({ icon: Icon, tip }, i) => (
                    <div key={i} className="flex items-start gap-2.5 p-3 bg-white/5 border border-white/8 rounded-xl">
                      <div className="w-6 h-6 rounded-lg bg-develoi-gold/15 flex items-center justify-center shrink-0 mt-0.5">
                        <Icon size={11} className="text-develoi-gold" />
                      </div>
                      <p className="text-[11px] text-white/70 leading-relaxed font-medium">{tip}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Share section */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-zinc-100 p-5 space-y-4">
              <div>
                <p className="text-sm font-black text-zinc-800">Conhece alguém para esta vaga?</p>
                <p className="text-xs text-zinc-400 mt-0.5">Compartilhe e ajude um amigo a encontrar uma oportunidade incrível.</p>
              </div>
              <ShareButton url={window.location.href} title={job.title} />
            </motion.div>
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div className="lg:col-span-2 space-y-4">

            {/* Application form */}
            <div ref={applyRef}>
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-zinc-200 shadow-xl shadow-zinc-200/50 overflow-hidden">

                {/* Form header */}
                <div className="bg-develoi-navy relative overflow-hidden px-6 py-6">
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-develoi-gold/10 rounded-full blur-2xl translate-x-1/2 -translate-y-1/2" />
                  </div>
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-1">
                      <div className="w-8 h-8 bg-develoi-gold/20 rounded-xl flex items-center justify-center">
                        <Send size={14} className="text-develoi-gold" />
                      </div>
                      <p className="text-base font-black text-white">Candidatar-se</p>
                    </div>
                    <p className="text-[10px] text-white/45 font-medium ml-11">Preencha abaixo e participe da seleção</p>
                  </div>
                </div>

                {/* Process steps */}
                <div className="px-6 py-4 bg-zinc-50 border-b border-zinc-100">
                  <div className="flex items-center justify-between">
                    <ProgressStep step={1} label="Dados" active={!applied} done={applied} />
                    <div className="flex-1 h-px bg-zinc-200 mx-3" />
                    <ProgressStep step={2} label="Análise" active={false} done={false} />
                    <div className="flex-1 h-px bg-zinc-200 mx-3" />
                    <ProgressStep step={3} label="Retorno" active={false} done={false} />
                  </div>
                </div>

                <div className="p-6">
                  <AnimatePresence mode="wait">
                    {applied ? (
                      <motion.div
                        key="success"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="py-8 flex flex-col items-center gap-5 text-center"
                      >
                        <div className="relative">
                          <div className="w-20 h-20 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-xl shadow-emerald-500/30">
                            <CheckCircle2 size={36} />
                          </div>
                          <div className="absolute -top-1 -right-1 w-7 h-7 bg-develoi-gold rounded-full flex items-center justify-center border-2 border-white">
                            <Sparkles size={12} className="text-white" />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <p className="text-lg font-black text-zinc-900">Candidatura enviada!</p>
                          <p className="text-xs text-zinc-500 leading-relaxed max-w-[220px] mx-auto">
                            Recebemos seus dados. Nossa equipe vai analisar seu perfil e entraremos em contato em breve.
                          </p>
                        </div>
                        <div className="w-full bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-left">
                          <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-2">Próximos passos</p>
                          <div className="space-y-2">
                            {["Análise do seu currículo", "Triagem técnica por IA", "Contato do recrutador"].map((s, i) => (
                              <div key={i} className="flex items-center gap-2 text-xs text-emerald-700">
                                <div className="w-5 h-5 rounded-full bg-emerald-200 flex items-center justify-center text-[9px] font-black">{i + 1}</div>
                                {s}
                              </div>
                            ))}
                          </div>
                        </div>
                        <a href="/portal" className="flex items-center gap-1.5 text-xs font-bold text-zinc-400 hover:text-develoi-navy transition-colors">
                          <ArrowLeft size={12} /> Ver outras vagas
                        </a>
                      </motion.div>
                    ) : (
                      <motion.form key="form" ref={formRef} onSubmit={handleApply} className="space-y-4">

                        {/* Full name */}
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black uppercase tracking-[0.22em] text-zinc-400 flex items-center gap-1">
                            Nome completo <span className="text-rose-400">*</span>
                          </label>
                          <div className="relative">
                            <Users size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-300" />
                            <input name="full_name" type="text" required disabled={submitting}
                              placeholder="Seu nome completo"
                              className="w-full pl-9 pr-4 py-2.5 border border-zinc-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-develoi-gold/25 focus:border-develoi-gold/60 transition-all placeholder:text-zinc-300 disabled:opacity-50 bg-zinc-50 focus:bg-white" />
                          </div>
                        </div>

                        {/* Email */}
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black uppercase tracking-[0.22em] text-zinc-400 flex items-center gap-1">
                            E-mail <span className="text-rose-400">*</span>
                          </label>
                          <div className="relative">
                            <Send size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-300" />
                            <input name="email" type="email" required disabled={submitting}
                              placeholder="seu@email.com"
                              className="w-full pl-9 pr-4 py-2.5 border border-zinc-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-develoi-gold/25 focus:border-develoi-gold/60 transition-all placeholder:text-zinc-300 disabled:opacity-50 bg-zinc-50 focus:bg-white" />
                          </div>
                        </div>

                        {/* Phone */}
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black uppercase tracking-[0.22em] text-zinc-400">
                            Telefone / WhatsApp
                          </label>
                          <div className="relative">
                            <Phone size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-300" />
                            <input name="phone" type="tel" disabled={submitting}
                              placeholder="(11) 99999-9999"
                              className="w-full pl-9 pr-4 py-2.5 border border-zinc-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-develoi-gold/25 focus:border-develoi-gold/60 transition-all placeholder:text-zinc-300 disabled:opacity-50 bg-zinc-50 focus:bg-white" />
                          </div>
                        </div>

                        {/* LinkedIn */}
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black uppercase tracking-[0.22em] text-zinc-400">
                            LinkedIn <span className="text-zinc-300 normal-case font-medium">(opcional)</span>
                          </label>
                          <div className="relative">
                            <ExternalLink size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-300" />
                            <input name="linkedin" type="url" disabled={submitting}
                              placeholder="linkedin.com/in/seu-perfil"
                              className="w-full pl-9 pr-4 py-2.5 border border-zinc-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-develoi-gold/25 focus:border-develoi-gold/60 transition-all placeholder:text-zinc-300 disabled:opacity-50 bg-zinc-50 focus:bg-white" />
                          </div>
                        </div>

                        {/* Resume upload */}
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black uppercase tracking-[0.22em] text-zinc-400 flex items-center gap-1">
                            Currículo em PDF <span className="text-rose-400">*</span>
                          </label>
                          <label className={`flex items-center gap-3 w-full px-4 py-3.5 rounded-xl cursor-pointer transition-all group border-2 border-dashed ${resumeFile ? "border-emerald-300 bg-emerald-50" : "border-zinc-200 bg-zinc-50 hover:border-develoi-gold/50 hover:bg-white"}`}>
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all ${resumeFile ? "bg-emerald-500/15" : "bg-zinc-100 group-hover:bg-develoi-gold/10"}`}>
                              {resumeFile
                                ? <CheckCircle2 size={16} className="text-emerald-600" />
                                : <FileText size={16} className="text-zinc-400 group-hover:text-develoi-gold transition-colors" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              {resumeFile ? (
                                <>
                                  <p className="text-xs font-black text-emerald-700 truncate">{resumeFile.name}</p>
                                  <p className="text-[9px] text-emerald-600 font-medium mt-0.5">
                                    {(resumeFile.size / 1024).toFixed(0)} KB · Clique para trocar
                                  </p>
                                </>
                              ) : (
                                <>
                                  <p className="text-xs font-bold text-zinc-500 group-hover:text-zinc-700">Selecionar arquivo PDF</p>
                                  <p className="text-[9px] text-zinc-400 font-medium mt-0.5">Máx. 10 MB · somente .pdf</p>
                                </>
                              )}
                            </div>
                            <input
                              required name="resume" type="file" accept=".pdf"
                              className="hidden" disabled={submitting}
                              onChange={e => setResumeFile(e.target.files?.[0] || null)}
                            />
                          </label>
                        </div>

                        {/* Privacy note */}
                        <div className="flex items-start gap-2 p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                          <ShieldCheck size={13} className="text-zinc-400 mt-0.5 shrink-0" />
                          <p className="text-[9px] text-zinc-400 leading-relaxed font-medium">
                            Seus dados são protegidos e usados <strong className="text-zinc-600">exclusivamente</strong> para este processo seletivo. Não compartilhamos com terceiros.
                          </p>
                        </div>

                        {/* Submit */}
                        <button
                          type="submit"
                          disabled={submitting}
                          className="w-full flex items-center justify-center gap-2.5 bg-develoi-gold text-white font-black text-sm py-3.5 rounded-xl hover:bg-develoi-gold/90 active:scale-[0.99] transition-all shadow-lg shadow-develoi-gold/25 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {submitting ? (
                            <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                          ) : <Zap size={15} />}
                          {submitting ? "Enviando candidatura…" : "Enviar candidatura"}
                        </button>
                      </motion.form>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            </div>

            {/* Process timeline card */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-2xl border border-zinc-100 overflow-hidden shadow-sm">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-50 bg-gradient-to-r from-develoi-navy/[0.03] to-transparent">
                <div className="w-8 h-8 rounded-xl bg-develoi-gold/15 flex items-center justify-center">
                  <Target size={14} className="text-develoi-gold" />
                </div>
                <p className="text-[11px] font-black uppercase tracking-widest text-zinc-500">Como funciona o processo</p>
              </div>
              <div className="p-5">
                <div className="space-y-4">
                  {[
                    { icon: Send, step: "1", title: "Envie sua candidatura", desc: "Preencha o formulário ao lado com seus dados e currículo.", color: "bg-develoi-gold/15 text-develoi-gold" },
                    { icon: Zap, step: "2", title: "Triagem por IA", desc: "Nossa IA analisa compatibilidade do seu perfil com a vaga.", color: "bg-sky-100 text-sky-600" },
                    { icon: Users, step: "3", title: "Contato do RH", desc: "Candidatos selecionados recebem retorno em até 5 dias.", color: "bg-violet-100 text-violet-600" },
                    { icon: CheckCircle2, step: "4", title: "Entrevista", desc: "Agendamento de entrevista com a equipe.", color: "bg-emerald-100 text-emerald-600" },
                  ].map(({ icon: Icon, step, title, desc, color }, i, arr) => (
                    <div key={i} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                          <Icon size={13} />
                        </div>
                        {i < arr.length - 1 && <div className="w-px flex-1 bg-zinc-100 mt-1.5" />}
                      </div>
                      <div className="pb-4 min-w-0">
                        <p className="text-xs font-black text-zinc-800">{title}</p>
                        <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* About company card */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-white rounded-2xl border border-zinc-100 overflow-hidden shadow-sm">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-50">
                <div className="w-8 h-8 rounded-xl bg-zinc-100 flex items-center justify-center">
                  <Building2 size={14} className="text-zinc-500" />
                </div>
                <p className="text-[11px] font-black uppercase tracking-widest text-zinc-500">Sobre a empresa</p>
              </div>
              <div className="p-5 flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-develoi-navy/5 border border-zinc-100 flex items-center justify-center shrink-0">
                  <Building2 size={22} className="text-develoi-navy/40" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-black text-zinc-800">{company}</p>
                  <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">
                    Empresa anunciante da vaga na plataforma Triagem Smart.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Info box */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-2xl">
              <Info size={15} className="text-blue-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-black text-blue-800">Processo seletivo transparente</p>
                <p className="text-[11px] text-blue-600 mt-1 leading-relaxed">
                  Esta vaga utiliza triagem por inteligência artificial para garantir uma análise justa e imparcial de todos os candidatos.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <footer className="bg-develoi-navy text-white mt-12 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-[0.04]" style={{ backgroundImage: "radial-gradient(circle, #c5a04d 1px, transparent 1px)", backgroundSize: "28px 28px" }} />

        {/* CTA strip */}
        <div className="relative border-b border-white/8">
          <div className="max-w-6xl mx-auto px-5 sm:px-8 py-10 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-1 text-center sm:text-left">
              <p className="text-base font-black text-white">Esta não é a vaga certa?</p>
              <p className="text-xs text-white/45 font-medium">Explore outras oportunidades abertas no portal.</p>
            </div>
            <a
              href="/portal"
              className="flex items-center gap-2 bg-white/10 border border-white/20 text-white text-xs font-black px-5 py-2.5 rounded-xl hover:bg-white/15 transition-all whitespace-nowrap"
            >
              <Briefcase size={13} /> Ver todas as vagas
            </a>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="relative max-w-6xl mx-auto px-5 sm:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/8 border border-white/10 rounded-xl flex items-center justify-center">
              <Sparkles size={14} className="text-develoi-gold" />
            </div>
            <div>
              <p className="text-[11px] font-black text-white uppercase tracking-tight">{company}</p>
              <p className="text-[8px] text-white/25 font-bold uppercase tracking-[0.25em]">Portal de Vagas</p>
            </div>
          </div>
          <div className="flex flex-col items-center sm:items-end gap-0.5">
            <p className="text-[8px] text-white/20 font-medium uppercase tracking-widest">© {new Date().getFullYear()} {company}. Todos os direitos reservados.</p>
            <p className="text-[8px] text-white/15 font-medium uppercase tracking-widest">Powered by Triagem Smart</p>
          </div>
        </div>
      </footer>

      {/* ── MOBILE STICKY CTA ── */}
      <div className="fixed bottom-0 inset-x-0 sm:hidden z-40 p-4 bg-white/95 backdrop-blur-xl border-t border-zinc-200 shadow-2xl">
        <button
          onClick={scrollToApply}
          className="w-full flex items-center justify-center gap-2.5 bg-develoi-gold text-white font-black text-sm py-3.5 rounded-2xl shadow-lg shadow-develoi-gold/30 active:scale-[0.98] transition-all"
        >
          <Zap size={15} /> Candidatar-se agora
        </button>
      </div>
    </div>
  );
}
