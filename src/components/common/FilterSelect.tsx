import React from 'react';
import { ChevronDown } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface FilterSelectProps {
  label?: string;
  value: string;
  onChange: (val: string) => void;
  options: Option[];
  className?: string;
  prefixIcon?: React.ReactNode;
}

export const FilterSelect: React.FC<FilterSelectProps> = ({
  label,
  value,
  onChange,
  options,
  className = "",
  prefixIcon,
}) => {
  return (
    <div className={`relative flex items-center ${className}`}>
      {prefixIcon && (
        <span className="absolute left-2.5 text-app-muted dark:text-app-darkMuted pointer-events-none">
          {prefixIcon}
        </span>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full appearance-none text-xs sm:text-sm bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder rounded-lg text-app-text dark:text-app-darkText focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue py-1.5 pr-8 transition-colors cursor-pointer ${
          prefixIcon ? 'pl-8' : 'pl-3'
        }`}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-white dark:bg-app-darkSurface text-app-text dark:text-app-darkText">
            {label ? `${label}: ${opt.label}` : opt.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-2.5 w-4 h-4 text-app-muted dark:text-app-darkMuted pointer-events-none" />
    </div>
  );
};
