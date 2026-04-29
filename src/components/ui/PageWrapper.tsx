import React from 'react';
import { cn } from "@/src/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Page Layout Components
// ─────────────────────────────────────────────────────────────────────────────

interface PageWrapperProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
}

export const PageWrapper: React.FC<PageWrapperProps> = ({ 
  children, 
  className,
  maxWidth = 'full' 
}) => {
  const maxW = {
    sm: 'max-w-screen-sm',
    md: 'max-w-screen-md',
    lg: 'max-w-screen-lg',
    xl: 'max-w-screen-xl',
    '2xl': 'max-w-screen-2xl',
    full: 'max-w-full'
  };

  return (
    <div className={cn(
      "w-full min-h-screen animate-in fade-in duration-500",
      maxW[maxWidth],
      "mx-auto",
      className
    )}>
      {children}
    </div>
  );
};

interface ContentCardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  transparent?: boolean;
}

export const ContentCard: React.FC<ContentCardProps> = ({ 
  children, 
  className,
  padding = 'md',
  transparent = false
}) => {
  const paddings = {
    none: 'p-0',
    sm: 'p-3',
    md: 'p-5',
    lg: 'p-8'
  };

  return (
    <div className={cn(
      "overflow-hidden transition-all duration-200",
      !transparent && "bg-white border border-zinc-200 rounded-3xl shadow-sm",
      paddings[padding],
      className
    )}>
      {children}
    </div>
  );
};

interface SectionTitleProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const SectionTitle: React.FC<SectionTitleProps> = ({
  title,
  subtitle,
  icon,
  actions,
  className,
}) => (
  <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8", className)}>
    <div className="flex items-center gap-4">
      {icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 text-white shadow-lg shadow-zinc-200">
          {icon}
        </div>
      )}
      <div className="flex flex-col">
        <h1 className="text-2xl font-black tracking-tight text-zinc-900 leading-none mb-1">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">
            {subtitle}
          </p>
        )}
      </div>
    </div>
    {actions && <div className="flex items-center gap-2">{actions}</div>}
  </div>
);

interface StatGridProps {
  children: React.ReactNode;
  cols?: 1 | 2 | 3 | 4 | 5;
  gap?: number;
  className?: string;
}

export const StatGrid: React.FC<StatGridProps> = ({ 
  children, 
  cols = 4, 
  gap = 4,
  className 
}) => {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    5: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-5',
  };

  return (
    <div className={cn("grid gap-4 mb-8", gridCols[cols], className)}>
      {children}
    </div>
  );
};

interface FormRowProps {
  children: React.ReactNode;
  className?: string;
  cols?: number;
}

export const FormRow: React.FC<FormRowProps> = ({ children, className, cols = 2 }) => {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-4',
  }[cols as 1 | 2 | 3 | 4];

  return (
    <div className={cn("grid gap-4 mb-4", gridCols, className)}>
      {children}
    </div>
  );
};

export const Divider: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn("h-px w-full bg-zinc-100 my-8", className)} />
);
