import React from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { EmptyState } from './EmptyState';

export interface Column<T> {
  id: string;
  header: string;
  accessor?: (item: T) => React.ReactNode;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

export type SortDirection = 'asc' | 'desc' | null;

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  selectedRowId?: string | null;
  sortColumn?: string | null;
  sortDirection?: SortDirection;
  onSortChange?: (columnId: string) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyType?: 'materials' | 'transactions' | 'search' | 'generic';
  stickyHeader?: boolean;
  className?: string;
}

export function DataTable<T>({
  data,
  columns,
  keyExtractor,
  onRowClick,
  selectedRowId,
  sortColumn,
  sortDirection,
  onSortChange,
  emptyTitle = "No Data Found",
  emptyDescription,
  emptyType = "generic",
  stickyHeader = true,
  className = "",
}: DataTableProps<T>) {
  return (
    <div className={`w-full overflow-hidden border border-app-border dark:border-app-darkBorder rounded-2xl bg-white dark:bg-app-darkSurface shadow-subtle ${className}`}>
      <div className="overflow-x-auto min-h-[300px]">
        <table className="w-full text-left border-collapse text-xs sm:text-sm">
          <thead className={`text-[11px] uppercase tracking-wider font-semibold text-app-secondary dark:text-app-darkSecondary bg-app-bg/80 dark:bg-app-darkBg/80 border-b border-app-border dark:border-app-darkBorder ${stickyHeader ? 'sticky top-0 z-10 backdrop-blur-sm' : ''}`}>
            <tr>
              {columns.map((col) => {
                const isSorted = sortColumn === col.id;
                return (
                  <th
                    key={col.id}
                    scope="col"
                    className={`py-3 px-4 whitespace-nowrap select-none font-semibold ${
                      col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                    } ${col.className || ''}`}
                  >
                    {col.sortable ? (
                      <button
                        type="button"
                        onClick={() => onSortChange && onSortChange(col.id)}
                        className="inline-flex items-center gap-1.5 hover:text-app-text dark:hover:text-app-darkText transition-colors focus:outline-none group"
                      >
                        <span>{col.header}</span>
                        {isSorted && sortDirection === 'asc' ? (
                          <ArrowUp className="w-3.5 h-3.5 text-brand-blue" />
                        ) : isSorted && sortDirection === 'desc' ? (
                          <ArrowDown className="w-3.5 h-3.5 text-brand-blue" />
                        ) : (
                          <ArrowUpDown className="w-3.5 h-3.5 text-app-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </button>
                    ) : (
                      <span>{col.header}</span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-app-border dark:divide-app-darkBorder">
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-12 px-4">
                  <EmptyState
                    title={emptyTitle}
                    description={emptyDescription}
                    type={emptyType}
                  />
                </td>
              </tr>
            ) : (
              data.map((item) => {
                const rowKey = keyExtractor(item);
                const isSelected = selectedRowId === rowKey;
                return (
                  <tr
                    key={rowKey}
                    onClick={() => onRowClick && onRowClick(item)}
                    className={`transition-colors ${
                      onRowClick ? 'cursor-pointer' : ''
                    } ${
                      isSelected
                        ? 'bg-brand-softBlue/80 dark:bg-blue-950/40 text-brand-blue font-medium'
                        : 'hover:bg-app-bg/60 dark:hover:bg-app-darkBorder/40 text-app-text dark:text-app-darkText'
                    }`}
                  >
                    {columns.map((col) => (
                      <td
                        key={col.id}
                        className={`py-3 px-4 ${
                          col.align === 'right'
                            ? 'text-right'
                            : col.align === 'center'
                            ? 'text-center'
                            : 'text-left'
                        } ${col.className || ''}`}
                      >
                        {col.accessor ? col.accessor(item) : (item as any)[col.id]}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
