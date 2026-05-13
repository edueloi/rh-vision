import React from "react";
import { Badge } from "@/src/components/ui";

interface JobStatusBadgeProps {
  status?: string | null;
}

export function JobStatusBadge({ status }: JobStatusBadgeProps) {
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
