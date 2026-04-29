import React from 'react';

export function StatCard({ label, value, icon, key }: { label: string, value: string, icon: React.ReactNode, key?: any }) {
  return (
    <div className="bg-white border border-[#E2E8F0] p-6 rounded-[2rem] shadow-sm flex items-center gap-5 group hover:border-[#2563EB] transition-all">
      <div className="w-14 h-14 bg-[#F8FAFC] rounded-2xl flex items-center justify-center transition-all group-hover:bg-blue-50 group-hover:scale-110">
        {icon}
      </div>
      <div>
        <div className="text-[10px] font-black uppercase tracking-widest text-[#64748B] mb-0.5">{label}</div>
        <div className="text-3xl font-black text-[#0F172A] leading-tight">{value}</div>
      </div>
    </div>
  );
}

export function NavItem({ active, icon, label, onClick, key }: { active: boolean, icon: React.ReactNode, label: string, onClick: () => void, key?: any }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-[10px] font-black tracking-widest transition-all ${
        active 
        ? 'bg-[#2563EB] text-white shadow-lg shadow-blue-200' 
        : 'text-[#64748B] hover:bg-[#F1F5F9]'
      }`}
    >
      <span className={active ? 'text-white' : 'text-[#64748B]'}>{icon}</span>
      <span className="uppercase">{label}</span>
    </button>
  );
}

export function AiTabButton({ active, label, icon, onClick, key }: { active: boolean, label: string, icon: React.ReactNode, onClick: () => void, key?: any }) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
        active 
        ? 'bg-white text-[#2563EB] shadow-sm' 
        : 'text-[#64748B] hover:text-[#0F172A]'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

import { User, BrainCircuit } from 'lucide-react';

export function ChatBubble({ m, key }: { m: { role: string, content: string }, key?: any }) {
  return (
    <div className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] flex gap-4 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
          m.role === 'user' ? 'bg-[#0F172A] text-white' : 'bg-blue-600 text-white'
        }`}>
          {m.role === 'user' ? <User size={18} /> : <BrainCircuit size={18} />}
        </div>
        <div className={`rounded-3xl p-6 shadow-sm border ${
          m.role === 'user' 
          ? 'bg-[#F1F5F9] border-[#E2E8F0] rounded-tr-none text-[#1E293B]' 
          : 'bg-white border-[#E2E8F0] rounded-tl-none text-[#334155]'
        }`}>
          <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">{m.content}</p>
        </div>
      </div>
    </div>
  );
}
