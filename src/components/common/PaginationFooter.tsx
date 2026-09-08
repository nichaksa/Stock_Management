import React from 'react';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface PaginationFooterProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: number[];
  className?: string;
}

export const PaginationFooter: React.FC<PaginationFooterProps> = ({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  className = "",
}) => {
  const { language } = useLanguage();
  const isTh = language === 'th';

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const startItem = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endItem = Math.min(safePage * pageSize, totalItems);

  // Generate pagination items with smart ellipsis
  const getPageNumbers = (): (number | string)[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    if (safePage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }

    if (safePage >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }

    return [1, '...', safePage - 1, safePage, safePage + 1, '...', totalPages];
  };

  const pageNumbers = getPageNumbers();

  return (
    <div
      className={`min-h-[56px] px-4 py-3 border-t border-[#E5EAF1] dark:border-app-darkBorder bg-white dark:bg-app-darkSurface flex flex-col sm:flex-row items-center justify-between gap-3 text-xs select-none ${className}`}
    >
      {/* LEFT SECTION: PAGE SIZE SELECTOR & RANGE INFO */}
      <div className="flex flex-wrap items-center gap-3 text-app-secondary dark:text-app-darkSecondary">
        <div className="flex items-center gap-2">
          <span>{isTh ? 'แสดง' : 'Show'}</span>
          <div className="relative inline-flex items-center">
            <select
              value={pageSize}
              onChange={(e) => {
                const newSize = Number(e.target.value);
                onPageSizeChange(newSize);
                onPageChange(1); // Reset to Page 1
              }}
              className="appearance-none h-9 pl-3 pr-8 bg-white dark:bg-app-darkBg border border-app-border dark:border-app-darkBorder rounded-[6px] text-xs font-semibold text-app-text dark:text-app-darkText outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-colors cursor-pointer shadow-subtle"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 w-3.5 h-3.5 text-app-muted pointer-events-none" />
          </div>
          <span>{isTh ? 'แถว/หน้า' : 'rows/page'}</span>
        </div>

        <span className="hidden sm:inline text-app-border dark:text-app-darkBorder">|</span>

        {/* Range text */}
        <div className="font-mono text-xs">
          {isTh ? (
            <span>
              แสดง <strong>{startItem.toLocaleString()}</strong> - <strong>{endItem.toLocaleString()}</strong> จากทั้งหมด{' '}
              <strong>{totalItems.toLocaleString()}</strong> แถว
            </span>
          ) : (
            <span>
              Showing <strong>{startItem.toLocaleString()}</strong> - <strong>{endItem.toLocaleString()}</strong> of{' '}
              <strong>{totalItems.toLocaleString()}</strong> rows
            </span>
          )}
        </div>
      </div>

      {/* RIGHT SECTION: PAGINATION BUTTONS */}
      <div className="flex items-center gap-1">
        {/* Previous Button */}
        <button
          type="button"
          onClick={() => onPageChange(safePage - 1)}
          disabled={safePage <= 1}
          className="h-9 px-3 rounded-[6px] border border-app-border dark:border-app-darkBorder bg-white dark:bg-app-darkBg text-app-text dark:text-app-darkText hover:bg-[#F4F6F8] dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-1 shadow-subtle"
        >
          <ChevronLeft className="w-4 h-4 text-app-muted" />
          <span className="hidden sm:inline">{isTh ? 'ก่อนหน้า' : 'Previous'}</span>
        </button>

        {/* Page Number Buttons */}
        <div className="flex items-center gap-1">
          {pageNumbers.map((p, idx) => {
            if (p === '...') {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="w-9 h-9 flex items-center justify-center text-app-muted font-mono"
                >
                  ...
                </span>
              );
            }

            const pageNum = Number(p);
            const isActive = pageNum === safePage;

            return (
              <button
                key={pageNum}
                type="button"
                onClick={() => onPageChange(pageNum)}
                className={`min-w-[36px] h-9 px-2.5 rounded-[6px] text-xs font-semibold font-mono transition-all ${
                  isActive
                    ? 'bg-brand-blue text-white shadow-sm font-bold border border-brand-blue'
                    : 'border border-app-border dark:border-app-darkBorder bg-white dark:bg-app-darkBg text-app-text dark:text-app-darkText hover:bg-[#F4F6F8] dark:hover:bg-slate-800 shadow-subtle'
                }`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        {/* Next Button */}
        <button
          type="button"
          onClick={() => onPageChange(safePage + 1)}
          disabled={safePage >= totalPages || totalItems === 0}
          className="h-9 px-3 rounded-[6px] border border-app-border dark:border-app-darkBorder bg-white dark:bg-app-darkBg text-app-text dark:text-app-darkText hover:bg-[#F4F6F8] dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-1 shadow-subtle"
        >
          <span className="hidden sm:inline">{isTh ? 'ถัดไป' : 'Next'}</span>
          <ChevronRight className="w-4 h-4 text-app-muted" />
        </button>
      </div>
    </div>
  );
};
