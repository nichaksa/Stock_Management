import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { PageLayout } from '../../components/layout/PageLayout';
import { Cpu, ArrowLeft, Sparkles, CheckCircle2 } from 'lucide-react';

export const ComingSoonPage: React.FC = () => {
  const { moduleName } = useParams<{ moduleName: string }>();

  const displayName = moduleName
    ? moduleName
        .split('-')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
    : 'Enterprise Module';

  return (
    <PageLayout
      title={`${displayName} Integration`}
      subtitle="Enterprise system connection & real-time factory telemetry gateway"
    >
      <div className="p-8 sm:p-12 rounded-2xl bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder shadow-subtle text-center max-w-2xl mx-auto my-6 space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-brand-softBlue dark:bg-blue-950/60 text-brand-blue flex items-center justify-center mx-auto shadow-inner">
          <Cpu className="w-7 h-7" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-softBlue dark:bg-blue-950/60 text-brand-blue text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>ZYCODA Connected Ecosystem</span>
        </div>

        <h2 className="text-xl font-bold text-app-text dark:text-app-darkText">
          {displayName} Module Preview
        </h2>

        <p className="text-xs sm:text-sm text-app-secondary dark:text-app-darkSecondary max-w-lg mx-auto leading-relaxed">
          This enterprise module communicates directly with the centralized Stock Management inventory ledger for automated spare-part consumption and PM reservations.
        </p>

        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/stock/balance"
            className="px-4 py-2 text-xs font-semibold text-white bg-brand-blue hover:bg-brand-hoverBlue rounded-xl shadow-sm transition-colors"
          >
            Go to Stock Balance
          </Link>
          <Link
            to="/"
            className="px-4 py-2 text-xs font-semibold text-app-secondary dark:text-app-darkSecondary hover:text-app-text rounded-xl border border-app-border dark:border-app-darkBorder hover:bg-app-bg transition-colors"
          >
            Back to Launcher
          </Link>
        </div>
      </div>
    </PageLayout>
  );
};
