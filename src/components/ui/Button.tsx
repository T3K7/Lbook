import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon' | 'icon-circle';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'secondary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  style,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-semibold transition-all duration-200 select-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]';

  const variantStyles: Record<ButtonVariant, string> = {
    primary:
      'bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white shadow-xs border border-transparent font-semibold',
    secondary:
      'bg-[var(--glass-bg-soft)] text-[var(--text-primary)] border border-[var(--glass-border)] hover:bg-[var(--glass-bg-strong)] hover:border-[var(--accent-border)] shadow-xs backdrop-blur-md font-semibold',
    ghost:
      'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-soft)] border border-transparent font-semibold',
    danger:
      'bg-[var(--danger)] hover:opacity-90 text-white shadow-xs border border-transparent font-semibold',
  };

  const sizeStyles: Record<ButtonSize, string> = {
    sm: 'h-8 px-3 text-xs font-semibold rounded-xl gap-1.5',
    md: 'h-10 px-4 text-xs font-semibold rounded-xl gap-2',
    lg: 'h-11 px-5 text-sm font-semibold rounded-xl gap-2.5',
    icon: 'w-10 h-10 p-0 rounded-xl',
    'icon-circle': 'w-11 h-11 p-0 rounded-full',
  };

  const isGlassSecondary = variant === 'secondary';

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      disabled={disabled || isLoading}
      style={{
        ...(isGlassSecondary
          ? {
              backdropFilter: 'blur(12px) saturate(var(--glass-saturate))',
              WebkitBackdropFilter: 'blur(12px) saturate(var(--glass-saturate))',
            }
          : {}),
        ...style,
      }}
      {...props}
    >
      {isLoading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        <>
          {leftIcon && <span className="shrink-0">{leftIcon}</span>}
          {children && <span>{children}</span>}
          {rightIcon && <span className="shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  );
};
