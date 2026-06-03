import React, { useRef } from 'react';
import { X, Printer, Download, Check, MapPin, Mail, MessageCircle } from 'lucide-react';
import { Job } from '@/src/types';

interface JobPosterModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: Job;
}

const DEFAULT_BENEFITS = [
  'Cesta Natalidade (para recém-nascidos, pai e mãe);',
  'Convênio com Farmácias;',
  'Convênio com Ponto de Vendas Local; (Produtos com até 20% de desconto)',
  'Convênio Médico Coparticipação;',
  'Refeição na empresa;',
  'Seguro de Vida;',
  'Transporte Fretado;',
  'Vale Alimentação R$ 600,00 (acordo sindical).',
];

const DEFAULT_REQUIREMENTS = [
  'Bom relacionamento e trabalho em equipe;',
  'Boa comunicação, senso de organização e agilidade;',
  'Fácil adaptabilidade;',
  'Comprometimento, responsabilidade e pontualidade.',
];

function parseLines(text?: string | null, fallback: string[] = []): string[] {
  if (!text || !text.trim()) return fallback;
  const lines = text
    .split(/\n|;(?=\s)/)
    .map(l => l.trim())
    .filter(Boolean)
    .map(l => (l.endsWith(';') || l.endsWith('.') ? l : l + ';'));
  return lines.length > 0 ? lines : fallback;
}

export default function JobPosterModal({ isOpen, onClose, job }: JobPosterModalProps) {
  const [cargoTitle, setCargoTitle] = React.useState(job.title || '');
  const [departamento, setDepartamento] = React.useState(job.department || '');
  const [localizacao, setLocalizacao] = React.useState(
    [job.city, job.state].filter(Boolean).join(' - ') || 'Granja Nova - Tatuí'
  );
  const [beneficiosText, setBeneficiosText] = React.useState(
    parseLines(job.benefits, DEFAULT_BENEFITS).join('\n')
  );
  const [requisitosText, setRequisitosText] = React.useState(
    parseLines(job.desirable_requirements || job.mandatory_requirements, DEFAULT_REQUIREMENTS).join('\n')
  );
  const [emailContato, setEmailContato] = React.useState('rh@shigueno.com.br');
  const [whatsapp, setWhatsapp] = React.useState('(15) 99661-9119');
  const [disclaimer, setDisclaimer] = React.useState('PARA A VAGA PROPOSTA É NECESSÁRIO EXPERIÊNCIA COMPROVADA');
  const [zoom, setZoom] = React.useState(0.65);
  const [exported, setExported] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);
  const posterRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setCargoTitle(job.title || '');
    setDepartamento(job.department || '');
    setLocalizacao([job.city, job.state].filter(Boolean).join(' - ') || 'Granja Nova - Tatuí');
    setBeneficiosText(parseLines(job.benefits, DEFAULT_BENEFITS).join('\n'));
    setRequisitosText(parseLines(job.desirable_requirements || job.mandatory_requirements, DEFAULT_REQUIREMENTS).join('\n'));
  }, [job.id]);

  if (!isOpen) return null;

  const benefitsList = beneficiosText.split('\n').map(l => l.trim()).filter(Boolean);
  const requirementsList = requisitosText.split('\n').map(l => l.trim()).filter(Boolean);

  const handlePrint = () => window.print();

  const handleExportPNG = async () => {
    const node = document.getElementById('shigueno-a4-poster');
    if (!node) return;
    try {
      setExporting(true);
      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(node, {
        width: 794,
        height: 1123,
        style: { transform: 'scale(1)', transformOrigin: 'top left', width: '794px', height: '1123px' },
      });
      const link = document.createElement('a');
      link.download = `Vaga_${cargoTitle.replace(/\s+/g, '_')}.png`;
      link.href = dataUrl;
      link.click();
      setExported(true);
      setTimeout(() => setExported(false), 3000);
    } catch {
      alert('Falha ao exportar. Use o botão "Imprimir / Salvar PDF" do navegador.');
    } finally {
      setExporting(false);
    }
  };

  const ZOOM_OPTIONS = [
    { label: '50%', value: 0.5 },
    { label: '65% (Padrão)', value: 0.65 },
    { label: '80%', value: 0.8 },
    { label: '100%', value: 1.0 },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <style>{`
        @media print {
          body > * { display: none !important; }
          #shigueno-print-wrapper {
            display: block !important; position: absolute !important;
            left: 0 !important; top: 0 !important; width: 100% !important; height: 100% !important;
            margin: 0 !important; padding: 0 !important; background: white !important;
          }
          #shigueno-a4-poster {
            position: absolute !important; left: 0 !important; top: 0 !important;
            width: 210mm !important; height: 297mm !important;
            margin: 0 !important; padding: 0 !important;
            background: white !important; box-shadow: none !important;
            border: none !important; border-radius: 0 !important;
            transform: scale(1) !important; transform-origin: top left !important;
          }
        }
      `}</style>

      <div
        id="shigueno-print-wrapper"
        className="bg-white rounded-2xl w-full max-w-6xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col"
        style={{ maxHeight: '95vh' }}
      >
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-zinc-100 bg-zinc-50 shrink-0">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-100 inline-block px-2 py-0.5 rounded mb-1">
              PDF Oficial A4 · Layout de Divulgação Social
            </p>
            <h2 className="text-sm font-black text-zinc-900">Gerador de Cartaz de Vaga — Formato A4 Corporativo</h2>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 bg-[#147B42] hover:bg-[#0f5a31] text-white text-xs font-black px-4 py-2.5 rounded-xl transition-all shadow-sm"
            >
              <Printer size={14} />
              Imprimir / Salvar PDF (A4)
            </button>
            <button
              onClick={handleExportPNG}
              disabled={exporting}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black px-4 py-2.5 rounded-xl transition-all shadow-sm disabled:opacity-60"
            >
              {exported ? <Check size={14} /> : <Download size={14} />}
              {exporting ? 'Exportando…' : exported ? 'Baixado!' : 'Baixar Imagem PNG'}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors border border-zinc-200"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* Left: Settings Panel */}
          <div className="w-[320px] shrink-0 bg-white border-r border-zinc-100 overflow-y-auto p-5 space-y-4">
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-amber-600 mb-1">Painel de Ajustes do Cartaz</p>
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                Altere os textos abaixo. O cartaz do lado direito mudará instantaneamente.
              </p>
            </div>

            {[
              { label: 'Título do Cargo', value: cargoTitle, onChange: setCargoTitle, type: 'input' },
              { label: 'Unidade / Setor', value: departamento, onChange: setDepartamento, type: 'input', placeholder: 'Ex: Agropecuária' },
              { label: 'Atuação / Local', value: localizacao, onChange: setLocalizacao, type: 'input' },
            ].map(({ label, value, onChange, type, placeholder }) => (
              <div key={label}>
                <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1.5">{label}</label>
                <input
                  type="text"
                  value={value}
                  onChange={e => onChange(e.target.value)}
                  placeholder={placeholder}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-800 focus:outline-none focus:border-emerald-400 focus:bg-white transition-all"
                />
              </div>
            ))}

            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1.5">
                Benefícios Oferecidos (um por linha)
              </label>
              <textarea
                rows={7}
                value={beneficiosText}
                onChange={e => setBeneficiosText(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-[11px] font-mono text-zinc-700 focus:outline-none focus:border-emerald-400 focus:bg-white transition-all resize-none leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1.5">
                Desejável e Requisitos (um por linha)
              </label>
              <textarea
                rows={5}
                value={requisitosText}
                onChange={e => setRequisitosText(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-[11px] font-mono text-zinc-700 focus:outline-none focus:border-emerald-400 focus:bg-white transition-all resize-none leading-relaxed"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'E-mail Recrutamento', value: emailContato, onChange: setEmailContato },
                { label: 'WhatsApp Fichas', value: whatsapp, onChange: setWhatsapp },
              ].map(({ label, value, onChange }) => (
                <div key={label}>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1.5">{label}</label>
                  <input
                    type="text"
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-2.5 py-2 text-[10px] font-semibold text-zinc-800 focus:outline-none focus:border-emerald-400 focus:bg-white transition-all"
                  />
                </div>
              ))}
            </div>

            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1.5">Texto do Rodapé</label>
              <input
                type="text"
                value={disclaimer}
                onChange={e => setDisclaimer(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-[10px] font-semibold text-zinc-800 focus:outline-none focus:border-emerald-400 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Right: A4 Preview */}
          <div className="flex-1 bg-zinc-100 overflow-auto flex flex-col items-center py-6 gap-4">
            {/* Zoom selector */}
            <div className="flex items-center gap-1 bg-white border border-zinc-200 rounded-full px-3 py-1.5 shadow-sm shrink-0">
              <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mr-1">Zoom A4:</span>
              {ZOOM_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setZoom(opt.value)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-black transition-all ${
                    zoom === opt.value
                      ? 'bg-[#147B42] text-white shadow-sm'
                      : 'text-zinc-500 hover:bg-zinc-100'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Scaled A4 poster */}
            <div
              style={{ width: `${794 * zoom}px`, height: `${1123 * zoom}px` }}
              className="relative shrink-0 rounded-xl shadow-2xl border border-zinc-300 overflow-hidden"
            >
              <div
                id="shigueno-a4-poster"
                ref={posterRef}
                style={{
                  width: '794px',
                  height: '1123px',
                  transform: `scale(${zoom})`,
                  transformOrigin: 'top left',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  fontFamily: "'Helvetica Neue', Arial, sans-serif",
                }}
                className="bg-white text-zinc-900 flex flex-col overflow-hidden"
              >
                {/* ── HEADER ── */}
                <div className="relative shrink-0" style={{ height: '210px' }}>
                  {/* SVG header — fundo sólido + onda fluida na base */}
                  <svg
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
                    viewBox="0 0 794 210"
                    preserveAspectRatio="none"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <rect width="794" height="210" fill="#0D532F" />
                    <rect width="794" height="90" fill="#0a4525" opacity="0.4" />
                    <path
                      d="M0 145 C80 118, 180 168, 300 148 C420 128, 520 172, 640 152 C710 140, 760 155, 794 148 L794 210 L0 210 Z"
                      fill="#147B42"
                    />
                    <path
                      d="M0 168 C60 155, 160 182, 280 165 C400 148, 500 188, 620 170 C700 158, 755 172, 794 165 L794 210 L0 210 Z"
                      fill="#1eb356"
                      opacity="0.5"
                    />
                    <ellipse cx="720" cy="60" rx="120" ry="55" fill="#1eb356" opacity="0.12" />
                  </svg>

                  {/* Logo Shigueno */}
                  <div style={{ position: 'absolute', left: '40px', top: '28px', display: 'flex', alignItems: 'center', gap: '16px', zIndex: 10 }}>
                    <div style={{
                      width: '72px', height: '72px',
                      background: 'white',
                      borderRadius: '14px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
                      overflow: 'hidden',
                      padding: '6px',
                    }}>
                      <img
                        src="/shigueno-logo.png"
                        alt="Shigueno"
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                    </div>
                    <div>
                      <h1 style={{
                        fontSize: '38px', fontWeight: '900', color: 'white',
                        fontStyle: 'italic', lineHeight: 1, letterSpacing: '-1px',
                        textShadow: '0 2px 8px rgba(0,0,0,0.35)',
                        fontFamily: 'Georgia, serif',
                      }}>
                        Shigueno
                      </h1>
                      <div style={{ width: '60px', height: '3px', background: 'rgba(255,255,255,0.4)', borderRadius: '99px', marginTop: '4px' }} />
                    </div>
                  </div>

                  {/* People badge */}
                  <div style={{ position: 'absolute', right: '40px', top: '24px', zIndex: 10 }}>
                    <div style={{
                      width: '100px', height: '100px', background: 'white',
                      borderRadius: '50%', border: '4px solid #147B42',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 8px 28px rgba(0,0,0,0.2)',
                    }}>
                      <svg width="70" height="70" viewBox="0 0 100 100">
                        <circle cx="30" cy="34" r="10" fill="none" stroke="#DE7358" strokeWidth="3.5" />
                        <path d="M12 68 C12 52, 48 52, 48 68" fill="none" stroke="#DE7358" strokeWidth="3.5" strokeLinecap="round" />
                        <circle cx="70" cy="34" r="10" fill="none" stroke="#DE5A43" strokeWidth="3.5" />
                        <path d="M52 68 C52 52, 88 52, 88 68" fill="none" stroke="#DE5A43" strokeWidth="3.5" strokeLinecap="round" />
                        <circle cx="50" cy="30" r="11" fill="none" stroke="#2563EB" strokeWidth="4" />
                        <path d="M28 70 C28 52, 72 52, 72 70" fill="none" stroke="#2563EB" strokeWidth="4" strokeLinecap="round" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* ── BODY ── */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '28px 48px 20px', gap: '0' }}>

                  {/* Call to action block */}
                  <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'flex-start', gap: '0' }}>
                      <div style={{ width: '5px', background: '#147B42', borderRadius: '3px', marginRight: '16px', alignSelf: 'stretch', minHeight: '54px' }} />
                      <div style={{ textAlign: 'left' }}>
                        <p style={{ fontSize: '16px', fontWeight: '900', color: '#0D532F', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '2px' }}>
                          Estamos em busca de
                        </p>
                        <h2 style={{ fontSize: '30px', fontWeight: '900', color: '#1a1a1a', letterSpacing: '-0.5px', textTransform: 'uppercase', lineHeight: 1.1 }}>
                          Novos Talentos
                        </h2>
                      </div>
                    </div>

                    <div style={{ marginTop: '14px' }}>
                      <p style={{ fontSize: '18px', fontWeight: '900', color: '#1c1d1e', letterSpacing: '3px', textTransform: 'uppercase' }}>
                        Estamos Contratando
                      </p>
                      <div style={{ display: 'inline-block', marginTop: '6px' }}>
                        <span style={{
                          fontSize: '12px', fontWeight: '800', color: '#147B42',
                          background: '#ecfdf5', border: '1px solid #a7f3d0',
                          borderRadius: '999px', padding: '4px 18px',
                          letterSpacing: '2px', textTransform: 'uppercase',
                        }}>
                          Vaga Aberta
                        </span>
                      </div>
                    </div>

                    {/* Job title */}
                    <div style={{ marginTop: '16px' }}>
                      <h1 style={{
                        fontSize: cargoTitle.length > 30 ? '32px' : '40px',
                        fontWeight: '900', color: '#111827',
                        letterSpacing: '-1px', lineHeight: 1.1,
                      }}>
                        {cargoTitle || 'Título da Vaga'}
                      </h1>
                      {departamento && (
                        <p style={{
                          fontSize: '12px', fontWeight: '800', color: '#6b7280',
                          textTransform: 'uppercase', letterSpacing: '3px',
                          marginTop: '6px', background: '#f4f4f5',
                          display: 'inline-block', padding: '3px 14px', borderRadius: '6px',
                        }}>
                          {departamento}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Divider */}
                  <div style={{ height: '1px', background: '#e5e7eb', margin: '4px 0 16px' }} />

                  {/* Two columns: Benefícios / Desejável */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0', flex: 1 }}>
                    {/* Benefícios */}
                    <div style={{ paddingRight: '28px', borderRight: '1px solid #e5e7eb' }}>
                      <p style={{
                        fontSize: '13px', fontWeight: '900', color: '#0D532F',
                        textTransform: 'uppercase', letterSpacing: '2px',
                        borderBottom: '3px solid #147B42', paddingBottom: '5px', marginBottom: '14px',
                      }}>
                        Benefícios
                      </p>
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {benefitsList.map((ben, i) => (
                          <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12px', color: '#374151', lineHeight: 1.4 }}>
                            <span style={{ color: '#147B42', fontWeight: '900', fontSize: '14px', lineHeight: 1, marginTop: '1px', flexShrink: 0 }}>•</span>
                            <span>{ben}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Desejável */}
                    <div style={{ paddingLeft: '28px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <p style={{
                          fontSize: '13px', fontWeight: '900', color: '#0D532F',
                          textTransform: 'uppercase', letterSpacing: '2px',
                          borderBottom: '3px solid #147B42', paddingBottom: '5px', marginBottom: '14px',
                        }}>
                          Desejável
                        </p>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {requirementsList.map((req, i) => (
                            <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12px', color: '#111827', fontWeight: '600', lineHeight: 1.4 }}>
                              <span style={{ color: '#147B42', fontWeight: '900', fontSize: '14px', lineHeight: 1, marginTop: '1px', flexShrink: 0 }}>•</span>
                              <span>{req}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Local */}
                      <div style={{ marginTop: '20px', paddingTop: '14px', borderTop: '1px solid #e5e7eb' }}>
                        <p style={{ fontSize: '10px', fontWeight: '900', color: '#147B42', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '4px' }}>
                          Local
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#147B42" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                            <circle cx="12" cy="10" r="3" />
                          </svg>
                          <p style={{ fontSize: '13px', fontWeight: '800', color: '#1f2937' }}>{localizacao}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── FOOTER ── */}
                <div style={{ background: '#f9fafb', borderTop: '2px solid #e5e7eb', padding: '16px 48px', textAlign: 'center', flexShrink: 0 }}>
                  <p style={{ fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '6px' }}>
                    Encaminhe seu currículo no e-mail
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '15px', fontWeight: '900', color: '#147B42', textDecoration: 'underline' }}>{emailContato}</span>
                    <span style={{ color: '#9ca3af', fontWeight: '400' }}>ou</span>
                    <span style={{ fontSize: '15px', fontWeight: '900', color: '#1f2937' }}>Whatsapp {whatsapp}</span>
                  </div>
                  <p style={{ fontSize: '10px', fontWeight: '900', color: '#1c1d1e', textTransform: 'uppercase', letterSpacing: '2px', marginTop: '8px' }}>
                    {disclaimer}
                  </p>
                </div>

                {/* Bottom green border */}
                <div style={{ height: '8px', background: '#0D532F', flexShrink: 0 }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
