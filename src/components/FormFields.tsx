import React from 'react';
import { ChevronRight } from 'lucide-react';

export function FormField({ label, value, onChange, placeholder, type = 'text', required = false }: any) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black uppercase tracking-widest text-[#64748B] ml-1 block">{label}</label>
      <input 
        required={required}
        type={type}
        className="w-full px-6 py-4 rounded-2xl border border-[#E2E8F0] focus:border-[#2563EB] outline-none font-bold text-sm transition-all"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  );
}

export function AreaField({ label, value, onChange, placeholder }: any) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black uppercase tracking-widest text-[#64748B] ml-1 block">{label}</label>
      <textarea 
        rows={4}
        className="w-full px-6 py-4 rounded-2xl border border-[#E2E8F0] focus:border-[#2563EB] outline-none font-medium text-sm transition-all resize-none"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  );
}

export function SelectField({ label, value, options, onChange }: any) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black uppercase tracking-widest text-[#64748B] ml-1 block">{label}</label>
      <div className="relative">
        <select 
          className="w-full px-6 py-4 rounded-2xl border border-[#E2E8F0] focus:border-[#2563EB] outline-none font-bold text-sm transition-all appearance-none bg-white cursor-pointer"
          value={value}
          onChange={e => onChange(e.target.value)}
        >
          {options.map((opt: string) => <option key={opt} value={opt}>{opt.toUpperCase()}</option>)}
        </select>
        <ChevronRight size={16} className="absolute right-6 top-1/2 -translate-y-1/2 rotate-90 text-[#94A3B8] pointer-events-none" />
      </div>
    </div>
  );
}

export function CheckboxField({ label, checked, onChange }: any) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="w-5 h-5 rounded border-gray-300 text-blue-600 outline-none" />
      <span className="text-[11px] font-black uppercase tracking-widest text-[#0F172A]">{label}</span>
    </label>
  );
}

export function WeightSlider({ label, value, onChange }: any) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <label className="text-[9px] font-black uppercase tracking-widest text-white/40">{label}</label>
        <span className="text-[10px] font-black text-blue-400">{value}%</span>
      </div>
      <input 
        type="range" 
        min="0" max="100" 
        className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
        value={value}
        onChange={e => onChange(parseInt(e.target.value))}
      />
    </div>
  );
}

export function CandidateInputField({ label, value, onChange, type = 'text', required = false, maxLength }: any) {
  return (
    <div className="space-y-2">
      <label className="text-[9px] font-black uppercase tracking-widest text-[#64748B] block ml-1">{label} {required && '*'}</label>
      <input 
        type={type}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        required={required}
        maxLength={maxLength}
        className="w-full px-5 py-4 border border-[#E2E8F0] rounded-2xl outline-none focus:border-[#2563EB] transition-all font-bold text-xs bg-[#F8FAFC]/50 focus:bg-white"
      />
    </div>
  );
}

export function CandidateTextField({ label, value, onChange, rows = 3, placeholder }: any) {
  return (
    <div className="space-y-2">
      <label className="text-[9px] font-black uppercase tracking-widest text-[#64748B] block ml-1">{label}</label>
      <textarea 
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="w-full px-5 py-4 border border-[#E2E8F0] rounded-2xl outline-none focus:border-[#2563EB] transition-all font-bold text-xs bg-[#F8FAFC]/50 focus:bg-white resize-none"
      />
    </div>
  );
}

export function CandidateSelectField({ label, value, onChange, options }: any) {
  return (
    <div className="space-y-2">
      <label className="text-[9px] font-black uppercase tracking-widest text-[#64748B] block ml-1">{label}</label>
      <select 
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        className="w-full px-5 py-4 border border-[#E2E8F0] rounded-2xl outline-none focus:border-[#2563EB] transition-all font-bold text-xs bg-[#F8FAFC]/50 focus:bg-white cursor-pointer uppercase"
      >
        {options.map((opt: string) => (
          <option key={opt} value={opt}>{opt.toUpperCase()}</option>
        ))}
      </select>
    </div>
  );
}

export function Toggle({ label, checked, onChange }: { label: string, checked: boolean, onChange: (v: boolean) => void }) {
  return (
    <button 
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between w-full p-4 bg-white border border-[#E2E8F0] rounded-2xl hover:border-[#2563EB] transition-all group"
    >
      <span className="text-[10px] font-black uppercase tracking-widest text-[#64748B] group-hover:text-[#0F172A] transition-colors">{label}</span>
      <div className={`w-10 h-5 rounded-full relative transition-all duration-300 ${checked ? 'bg-[#2563EB]' : 'bg-[#E2E8F0]'}`}>
        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-300 ${checked ? 'left-6' : 'left-1'}`}></div>
      </div>
    </button>
  );
}
