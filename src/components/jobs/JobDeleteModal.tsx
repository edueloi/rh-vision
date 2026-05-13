import React from "react";
import { AlertTriangle } from "lucide-react";
import { Button, Modal } from "@/src/components/ui";
import { Job } from "@/src/types";

interface JobDeleteModalProps {
  job: Job | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (jobId: number) => void;
}

export function JobDeleteModal({ job, open, onClose, onConfirm }: JobDeleteModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Excluir vaga"
      description={
        job
          ? `A vaga "${job.title}" será removida permanentemente. Esta ação não pode ser desfeita.`
          : "Confirme a exclusão da vaga."
      }
      icon={<AlertTriangle size={20} />}
      size="sm"
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              if (job) {
                onConfirm(job.id);
              }
            }}
          >
            Sim, excluir
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <p className="text-sm font-black tracking-tight text-zinc-900">
          Esta ação remove a vaga da listagem e do fluxo operacional.
        </p>
        <p className="text-sm leading-relaxed text-zinc-500">
          Use essa opção apenas quando a vaga não precisar mais ficar registrada. Se você só quiser tirá-la de circulação, prefira pausar ou encerrar.
        </p>
      </div>
    </Modal>
  );
}
