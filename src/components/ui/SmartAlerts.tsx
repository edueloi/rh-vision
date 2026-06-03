import { motion } from "motion/react";
import { AlertTriangle, CheckCircle2, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/src/lib/utils";

interface Alert {
  type: "danger" | "success";
  title: string;
  message: string;
  action?: string;
  href?: string;
}

export function SmartAlerts({ alerts }: { alerts: Alert[] }) {
  if (!alerts?.length) return null;

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {alerts.map((alert, i) => {
        const isDanger = alert.type === "danger";
        return (
          <motion.div
            key={`${alert.title}-${i}`}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className={cn(
              "flex items-start gap-3 rounded-xl border p-3.5 transition-colors",
              isDanger
                ? "border-rose-100 bg-rose-50/80"
                : "border-emerald-100 bg-emerald-50/80"
            )}
          >
            <div className={cn(
              "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
              isDanger ? "bg-rose-100 text-rose-600" : "bg-emerald-100 text-emerald-600"
            )}>
              {isDanger ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}
            </div>

            <div className="flex-1 min-w-0">
              <p className={cn(
                "mb-0.5 text-[10px] font-bold uppercase tracking-wider",
                isDanger ? "text-rose-500" : "text-emerald-600"
              )}>{alert.title}</p>
              <p className={cn(
                "text-[11px] font-medium leading-relaxed",
                isDanger ? "text-rose-900/80" : "text-emerald-900/80"
              )}>{alert.message}</p>

              {alert.action && (
                alert.href ? (
                  <Link
                    to={alert.href}
                    className={cn(
                      "mt-2 inline-flex items-center gap-1 text-[10px] font-semibold transition-opacity hover:opacity-75",
                      isDanger ? "text-rose-700" : "text-emerald-700"
                    )}
                  >
                    {alert.action} <ChevronRight size={11} />
                  </Link>
                ) : (
                  <span className={cn(
                    "mt-2 inline-flex items-center gap-1 text-[10px] font-semibold",
                    isDanger ? "text-rose-700" : "text-emerald-700"
                  )}>
                    {alert.action} <ChevronRight size={11} />
                  </span>
                )
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
