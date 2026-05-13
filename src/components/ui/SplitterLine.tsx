import React from 'react';
import { cn } from '@/src/lib/utils';

export interface SplitterLineProps {
  label?: string;
  icon?: React.ReactNode;
  rightNode?: React.ReactNode;
  className?: string;
}

export function SplitterLine({ label, icon, rightNode, className }: SplitterLineProps) {
  return (
    <div className={cn("flex items-center w-full", className)}>
      <div className="flex items-center gap-2 whitespace-nowrap">
        {icon && (
          <div className="w-8 h-8 rounded-lg bg-zinc-50 flex items-center justify-center text-zinc-500 border border-zinc-200/50">
            {icon}
          </div>
        )}
        {label && (
          <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-widest">
            {label}
          </h3>
        )}
      </div>

      <div className="flex-1 h-px bg-zinc-200 mx-4 opacity-70" />

      {rightNode && (
        <div className="flex items-center gap-2 whitespace-nowrap">
          {rightNode}
        </div>
      )}
    </div>
  );
}
