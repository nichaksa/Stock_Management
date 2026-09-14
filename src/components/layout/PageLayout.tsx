import React from 'react';
import { Breadcrumbs } from './Breadcrumbs';

interface PageLayoutProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export const PageLayout: React.FC<PageLayoutProps> = ({
  title,
  subtitle,
  actions,
  children,
}) => {
  return (
    <div className="space-y-4 max-w-7xl mx-auto w-full pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-app-darkSurface p-4 sm:p-5 rounded-2xl border border-app-border dark:border-app-darkBorder shadow-subtle">
        <div className="min-w-0">
          <Breadcrumbs />
          <h1 className="text-xl sm:text-2xl font-bold text-app-text dark:text-app-darkText tracking-tight truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs sm:text-sm text-app-secondary dark:text-app-darkSecondary mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            {actions}
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div>{children}</div>
    </div>
  );
};
