import React from 'react';

export type BadgeVariant = 'emerald' | 'neutral' | 'danger' | 'warning';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  className = '',
  icon,
}) => {
  const variantStyles: Record<BadgeVariant, string> = {
    emerald:
      'bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent-border)] font-semibold',
    neutral:
      'bg-[var(--bg-surface-secondary)] text-[var(--text-secondary)] border border-[var(--border)] font-semibold',
    danger:
      'bg-[var(--danger-soft)] text-[var(--danger)] border border-[var(--danger)]/25 font-semibold',
    warning:
      'bg-[var(--warning-soft)] text-[var(--warning)] border border-[var(--warning)]/25 font-semibold',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold tracking-tight ${variantStyles[variant]} ${className}`}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};
