import React from 'react';
import { PackageOpen, FileQuestion, SearchX, Inbox } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
  type?: 'materials' | 'transactions' | 'search' | 'generic';
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionText,
  onAction,
  type = 'generic',
}) => {
  const getIcon = () => {
    switch (type) {
      case 'materials':
        return <PackageOpen className="w-10 h-10 text-brand-blue/60" />;
      case 'transactions':
        return <Inbox className="w-10 h-10 text-brand-blue/60" />;
      case 'search':
        return <SearchX className="w-10 h-10 text-app-muted" />;
      default:
        return <FileQuestion className="w-10 h-10 text-app-muted" />;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center rounded-2xl border border-dashed border-app-border dark:border-app-darkBorder bg-app-bg/40 dark:bg-app-darkBg/40">
      <div className="p-4 rounded-2xl bg-white dark:bg-app-darkSurface shadow-subtle mb-3">
        {getIcon()}
      </div>
      <h3 className="text-sm font-semibold text-app-text dark:text-app-darkText">
        {title}
      </h3>
      {description && (
        <p className="text-xs text-app-secondary dark:text-app-darkSecondary mt-1 max-w-sm">
          {description}
        </p>
      )}
      {actionText && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-brand-blue hover:bg-brand-hoverBlue rounded-lg transition-colors shadow-sm"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};
