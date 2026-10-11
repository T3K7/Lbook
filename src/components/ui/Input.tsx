import React from 'react';
import { Search } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ leftIcon, rightElement, className = '', style, ...props }, ref) => {
    return (
      <div className="relative flex items-center w-full">
        {leftIcon && (
          <div className="absolute left-3.5 text-[var(--text-muted)] pointer-events-none flex items-center justify-center">
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          className={`w-full h-11 bg-[var(--glass-bg-input)] border border-[var(--glass-border)] rounded-xl text-xs sm:text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-3 focus:ring-[var(--accent-soft)] transition-all shadow-xs ${
            leftIcon ? 'pl-10' : 'pl-3.5'
          } ${rightElement ? 'pr-16' : 'pr-3.5'} ${className}`}
          style={{
            backdropFilter: 'blur(14px) saturate(var(--glass-saturate))',
            WebkitBackdropFilter: 'blur(14px) saturate(var(--glass-saturate))',
            ...style,
          }}
          {...props}
        />
        {rightElement && (
          <div className="absolute right-2 flex items-center">
            {rightElement}
          </div>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onSearch?: () => void;
  className?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  placeholder = 'Tìm kiếm file, mô tả, nội dung...',
  onSearch,
  className = '',
}) => {
  return (
    <Input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => e.key === 'Enter' && onSearch?.()}
      placeholder={placeholder}
      leftIcon={<Search className="w-4 h-4" />}
      rightElement={
        <button
          onClick={onSearch}
          className="px-3 py-1.5 bg-[var(--glass-bg-soft)] hover:bg-[var(--accent-soft)] text-[var(--text-primary)] hover:text-[var(--accent)] text-xs font-semibold rounded-lg transition-colors cursor-pointer border border-[var(--glass-border)] shadow-xs"
        >
          Tìm
        </button>
      }
      className={className}
    />
  );
};
