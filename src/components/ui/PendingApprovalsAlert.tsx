import { ChevronRight, ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";

interface PendingApprovalsAlertProps {
  count: number;
  href?: string;
}

export function PendingApprovalsAlert({
  count,
  href = "/aprovacoes",
}: PendingApprovalsAlertProps) {
  if (count <= 0) {
    return null;
  }

  return (
    <Link
      to={href}
      className="group flex items-center gap-4 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 transition-all hover:border-amber-300 hover:bg-amber-100"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-200 bg-amber-100">
        <ShieldAlert size={18} className="text-amber-600" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-black text-amber-900">
          {count} vaga{count !== 1 ? "s" : ""} aguardando aprovação
        </p>
        <p className="mt-0.5 text-[11px] text-amber-700">
          Clique para revisar e aprovar ou reprovar as vagas
        </p>
      </div>

      <ChevronRight size={16} className="shrink-0 text-amber-500 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
