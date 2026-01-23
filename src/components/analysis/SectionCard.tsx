import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SectionColor = 'emerald' | 'cyan' | 'amber' | 'blue' | 'purple' | 'red' | 'neutral';

interface SectionCardProps {
  title: string;
  icon: LucideIcon;
  color: SectionColor;
  children: ReactNode;
  className?: string;
}

const colorClasses: Record<SectionColor, { border: string; bg: string; header: string }> = {
  emerald: {
    border: 'border-emerald-200 dark:border-emerald-500/30',
    bg: 'bg-emerald-50 dark:bg-emerald-500/5',
    header: 'text-emerald-700 dark:text-emerald-400'
  },
  cyan: {
    border: 'border-cyan-200 dark:border-cyan-500/30',
    bg: 'bg-cyan-50 dark:bg-cyan-500/5',
    header: 'text-cyan-700 dark:text-cyan-400'
  },
  amber: {
    border: 'border-amber-200 dark:border-amber-500/30',
    bg: 'bg-amber-50 dark:bg-amber-500/5',
    header: 'text-amber-700 dark:text-amber-400'
  },
  blue: {
    border: 'border-blue-200 dark:border-blue-500/30',
    bg: 'bg-blue-50 dark:bg-blue-500/5',
    header: 'text-blue-700 dark:text-blue-400'
  },
  purple: {
    border: 'border-purple-200 dark:border-purple-500/30',
    bg: 'bg-purple-50 dark:bg-purple-500/5',
    header: 'text-purple-700 dark:text-purple-400'
  },
  red: {
    border: 'border-red-200 dark:border-red-500/30',
    bg: 'bg-red-50 dark:bg-red-500/5',
    header: 'text-red-700 dark:text-red-400'
  },
  neutral: {
    border: 'border-border',
    bg: 'bg-muted/50',
    header: 'text-muted-foreground'
  }
};

export function SectionCard({ title, icon: Icon, color, children, className }: SectionCardProps) {
  const colors = colorClasses[color];

  return (
    <div
      className={cn(
        'card-hover rounded-xl border p-3 sm:p-5',
        colors.border,
        colors.bg,
        className
      )}
    >
      <div className={cn('flex items-center gap-2 mb-3 sm:mb-4', colors.header)}>
        <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
        <h3 className="font-semibold text-xs sm:text-sm uppercase tracking-wider">{title}</h3>
      </div>
      {children}
    </div>
  );
}
