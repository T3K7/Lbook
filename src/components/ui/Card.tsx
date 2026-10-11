import React from 'react';

export type CardVariant = 'glass' | 'glass-strong' | 'glass-soft';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg';
  bordered?: boolean;
  interactive?: boolean;
  variant?: CardVariant;
}

export const Card: React.FC<CardProps> = ({
  children,
  padding = 'md',
  bordered = true,
  interactive = false,
  variant = 'glass',
  className = '',
  style,
  ...props
}) => {
  const paddingStyles = {
    none: 'p-0',
    sm: 'p-3.5 sm:p-4',
    md: 'p-5 sm:p-6',
    lg: 'p-6 sm:p-8',
  };

  const variantStyles: Record<CardVariant, string> = {
    glass: 'bg-[var(--glass-bg)] border-[var(--glass-border)]',
    'glass-strong': 'bg-[var(--glass-bg-strong)] border-[var(--glass-border-strong)]',
    'glass-soft': 'bg-[var(--glass-bg-soft)] border-[var(--glass-border-subtle)]',
  };

  const borderClass = bordered ? 'border' : 'border-0';

  const interactiveStyles = interactive
    ? 'cursor-pointer hover:bg-[var(--glass-bg-strong)] hover:border-[var(--accent-border)] hover:shadow-lg hover:-translate-y-0.5'
    : '';

  return (
    <div
      className={`rounded-[18px] transition-all duration-300 ease-out select-none ${borderClass} ${variantStyles[variant]} ${paddingStyles[padding]} ${interactiveStyles} ${className}`}
      style={{
        backdropFilter: 'blur(var(--glass-blur)) saturate(var(--glass-saturate))',
        WebkitBackdropFilter: 'blur(var(--glass-blur)) saturate(var(--glass-saturate))',
        boxShadow: 'var(--glass-shadow)',
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
};
