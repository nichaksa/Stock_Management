import React from 'react';
import { Search, X } from 'lucide-react';

interface SearchInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  placeholder = "Search...",
  className = "",
}) => {
  return (
    <div className={`relative flex items-center ${className}`}>
      <Search className="absolute left-3 w-4 h-4 text-app-muted dark:text-app-darkMuted pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-8 py-1.5 text-xs sm:text-sm bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder rounded-lg text-app-text dark:text-app-darkText placeholder-app-muted dark:placeholder-app-darkMuted focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-colors"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-2.5 p-0.5 text-app-muted hover:text-app-text dark:hover:text-app-darkText transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
