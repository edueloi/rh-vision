import React from "react";
import { motion } from "motion/react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/src/lib/utils";

interface Alert {
  type: 'danger' | 'success';
  title: string;
  message: string;
  action: string;
}

interface SmartAlertsProps {
  alerts: Alert[];
}

export function SmartAlerts({ alerts }: SmartAlertsProps) {
  if (!alerts || alerts.length === 0) return null;

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {alerts.map((alert, i) => (
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.1 }}
          key={i} 
          className={cn(
            "p-4 rounded-3xl border flex items-start gap-4 shadow-sm transition-colors",
            alert.type === 'danger' 
              ? "bg-red-50 border-red-100 text-red-900 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-200" 
              : "bg-emerald-50 border-emerald-100 text-emerald-900 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-200"
          )}
        >
          <div className={cn(
            "p-2 rounded-xl mt-1 shrink-0 transition-colors",
            alert.type === 'danger' ? "bg-red-100 text-red-600 dark:bg-red-500/20" : "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20"
          )}>
            {alert.type === 'danger' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          </div>
          <div className="flex-1">
            <p className="text-[9px] font-bold uppercase tracking-widest mb-1 opacity-60">{alert.title}</p>
            <p className="text-[11px] font-semibold leading-relaxed">{alert.message}</p>
            <button className="mt-3 text-[9px] font-bold uppercase tracking-widest flex items-center gap-1 hover:opacity-70 transition-opacity cursor-pointer">
              {alert.action} <CustomArrowRight size={10} />
            </button>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function CustomArrowRight({ className, size = 16 }: { className?: string, size?: number }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="3" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}
