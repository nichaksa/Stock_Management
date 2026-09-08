import React, { useState, useRef, useEffect } from 'react';
import { Columns3, Check, Lock } from 'lucide-react';

export interface ColumnDefinition {
  id: string;
  label: string;
  required?: boolean;
}

interface VisibleColumnsDropdownProps {
  columns: ColumnDefinition[];
  visibleColumns: string[];
  onChange: (visibleColumns: string[]) => void;
}

export const VisibleColumnsDropdown: React.FC<VisibleColumnsDropdownProps> = ({
  columns,
  visibleColumns,
  onChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleColumn = (colId: string, isRequired?: boolean) => {
    if (isRequired) return; // Cannot uncheck required columns
    if (visibleColumns.includes(colId)) {
      onChange(visibleColumns.filter(c => c !== colId));
    } else {
      onChange([...visibleColumns, colId]);
    }
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder rounded-lg text-app-secondary dark:text-app-darkSecondary hover:text-app-text dark:hover:text-app-darkText hover:border-app-muted transition-colors shadow-subtle"
      >
        <Columns3 className="w-4 h-4 text-app-muted dark:text-app-darkMuted" />
        <span>Columns</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-60 bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder rounded-xl shadow-modal z-30 py-2 animate-fade-in">
          <div className="px-3 py-1.5 border-b border-app-border dark:border-app-darkBorder flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-app-secondary dark:text-app-darkSecondary">
              Visible Columns
            </span>
            <span className="text-[11px] text-app-muted dark:text-app-darkMuted font-mono">
              {visibleColumns.length}/{columns.length}
            </span>
          </div>

          <div className="max-h-64 overflow-y-auto p-1.5 space-y-0.5">
            {columns.map(col => {
              const isVisible = visibleColumns.includes(col.id);
              return (
                <button
                  key={col.id}
                  type="button"
                  onClick={() => toggleColumn(col.id, col.required)}
                  disabled={col.required}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg transition-colors text-left ${
                    col.required
                      ? 'cursor-not-allowed opacity-80 bg-gray-50 dark:bg-gray-800/40 text-app-text dark:text-app-darkText'
                      : 'hover:bg-app-bg dark:hover:bg-app-darkBorder text-app-text dark:text-app-darkText cursor-pointer'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                        isVisible
                          ? 'bg-brand-blue border-brand-blue text-white'
                          : 'border-app-border dark:border-app-darkBorder bg-white dark:bg-app-darkSurface'
                      }`}
                    >
                      {isVisible && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span className="truncate">{col.label}</span>
                  </div>

                  {col.required && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-app-muted dark:text-app-darkMuted bg-app-bg dark:bg-app-darkBg px-1.5 py-0.5 rounded">
                      <Lock className="w-2.5 h-2.5" />
                      Required
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
