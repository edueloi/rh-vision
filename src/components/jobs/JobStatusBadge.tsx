import React from "react";
import { Badge } from "@/src/components/ui";

interface JobStatusBadgeProps {
  status?: string | null;
  approvalStatus?: string | null;
}

export function JobStatusBadge({ status, approvalStatus }: JobStatusBadgeProps) {
  // Approval state takes visual priority over base status
  if (approvalStatus === 'pending') {
    return <Badge color="warning" pill>Em Aprovação</Badge>;
  }
  if (approvalStatus === 'rejected') {
    return <Badge color="danger" pill>Reprovada</Badge>;
  }

  const normalized = status || "Rascunho";

  const color =
    normalized === "Aberta"
      ? "success"
      : normalized === "Pausada"
        ? "warning"
        : normalized === "Encerrada"
          ? "danger"
          : "default";

  return (
    <Badge color={color} pill>
      {normalized}
    </Badge>
  );
}
