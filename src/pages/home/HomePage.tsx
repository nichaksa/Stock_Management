import React from 'react';
import { Link } from 'react-router-dom';
import {
  Database,
  Layers,
  ArrowLeftRight,
  FileSpreadsheet,
  FileCheck2,
  ArrowUpRight,
  Sparkles,
  Boxes,
  ClipboardList,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useStock } from '../../context/StockContext';
import { useLanguage } from '../../context/LanguageContext';

export const HomePage: React.FC = () => {
  const { currentUser, hasPermission } = useAuth();
  const { materials, transactions } = useStock();
  const { t } = useLanguage();

  return (
    <div className="space-y-6 w-full pb-12">
      {/* Welcome Banner */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder shadow-subtle flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-brand-softBlue dark:bg-blue-950/60 text-brand-blue text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Industrial Enterprise Suite 2026</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-app-text dark:text-app-darkText tracking-tight">
            Welcome back, {currentUser?.fullName || currentUser?.username}
          </h1>
          <p className="text-xs sm:text-sm text-app-secondary dark:text-app-darkSecondary mt-0.5">
            Role: <strong>{currentUser?.roleName}</strong> · Plant: <strong>{currentUser?.plant || 'All Plants'}</strong> · Department: <strong>{currentUser?.department}</strong>
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right px-3 py-1.5 rounded-xl bg-app-bg dark:bg-app-darkBg border border-app-border dark:border-app-darkBorder">
            <span className="text-[10px] text-app-muted uppercase font-bold block">Active Ledger</span>
            <span className="text-xs font-mono font-bold text-app-text dark:text-app-darkText">
              {materials.length} Materials · {transactions.length} Tx
            </span>
          </div>
        </div>
      </div>

      {/* Grid of Launcher Modules */}
      <div className="space-y-4">
        {/* SECTION: STOCK MANAGEMENT (Core Functional System) */}
        <div className="p-5 rounded-2xl bg-white dark:bg-app-darkSurface border-2 border-brand-blue/30 shadow-subtle space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-softBlue dark:bg-blue-950 text-brand-blue flex items-center justify-center font-bold">
                <Boxes className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-app-text dark:text-app-darkText uppercase tracking-wider">
                    {t('stock_management')}
                  </h3>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gr-bg text-gr border border-gr/20">
                    Live Operational
                  </span>
                </div>
                <p className="text-xs text-app-secondary dark:text-app-darkSecondary">
                  Material master catalog, physical stock ledger, Goods Movement (GR/GI), Requisitions, and Analytics.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-2">
            <Link
              to="/stock/master-data"
              className="p-3 rounded-xl border border-app-border dark:border-app-darkBorder bg-app-bg/50 dark:bg-app-darkBg/50 hover:bg-brand-softBlue dark:hover:bg-blue-950/40 hover:border-brand-blue/40 transition-all group"
            >
              <div className="flex items-center justify-between text-app-secondary dark:text-app-darkSecondary group-hover:text-brand-blue mb-1">
                <Database className="w-4 h-4" />
                <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <span className="font-bold text-xs text-app-text dark:text-app-darkText group-hover:text-brand-blue block">
                {t('master_data')}
              </span>
              <span className="text-[11px] text-app-muted">Catalog & Specs</span>
            </Link>

            <Link
              to="/stock/request"
              className="p-3 rounded-xl border border-app-border dark:border-app-darkBorder bg-app-bg/50 dark:bg-app-darkBg/50 hover:bg-brand-softBlue dark:hover:bg-blue-950/40 hover:border-brand-blue/40 transition-all group"
            >
              <div className="flex items-center justify-between text-app-secondary dark:text-app-darkSecondary group-hover:text-brand-blue mb-1">
                <ClipboardList className="w-4 h-4" />
                <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <span className="font-bold text-xs text-app-text dark:text-app-darkText group-hover:text-brand-blue block">
                {t('material_request') || 'Material Request'}
              </span>
              <span className="text-[11px] text-app-muted">Create Requisition</span>
            </Link>

            {hasPermission('STORE_APPROVAL') && (
              <Link
                to="/stock/approval"
                className="p-3 rounded-xl border border-brand-blue/30 dark:border-blue-900 bg-brand-softBlue/20 dark:bg-blue-950/20 hover:bg-brand-softBlue dark:hover:bg-blue-950/40 hover:border-brand-blue transition-all group"
              >
                <div className="flex items-center justify-between text-brand-blue mb-1">
                  <FileCheck2 className="w-4 h-4" />
                  <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <span className="font-bold text-xs text-brand-blue block">
                  {t('store_approval') || 'Store Approval'}
                </span>
                <span className="text-[11px] text-brand-blue/80 font-medium">Review & Issue</span>
              </Link>
            )}

            <Link
              to="/stock/balance"
              className="p-3 rounded-xl border border-app-border dark:border-app-darkBorder bg-app-bg/50 dark:bg-app-darkBg/50 hover:bg-brand-softBlue dark:hover:bg-blue-950/40 hover:border-brand-blue/40 transition-all group"
            >
              <div className="flex items-center justify-between text-app-secondary dark:text-app-darkSecondary group-hover:text-brand-blue mb-1">
                <Layers className="w-4 h-4" />
                <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <span className="font-bold text-xs text-app-text dark:text-app-darkText group-hover:text-brand-blue block">
                {t('stock_balance')}
              </span>
              <span className="text-[11px] text-app-muted">Material & Lot View</span>
            </Link>

            <Link
              to="/stock/transaction"
              className="p-3 rounded-xl border border-app-border dark:border-app-darkBorder bg-app-bg/50 dark:bg-app-darkBg/50 hover:bg-brand-softBlue dark:hover:bg-blue-950/40 hover:border-brand-blue/40 transition-all group"
            >
              <div className="flex items-center justify-between text-app-secondary dark:text-app-darkSecondary group-hover:text-brand-blue mb-1">
                <ArrowLeftRight className="w-4 h-4" />
                <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <span className="font-bold text-xs text-app-text dark:text-app-darkText group-hover:text-brand-blue block">
                {t('transaction')}
              </span>
              <span className="text-[11px] text-app-muted">Audit & Transfers</span>
            </Link>

            <Link
              to="/stock/inventory-report"
              className="p-3 rounded-xl border border-app-border dark:border-app-darkBorder bg-app-bg/50 dark:bg-app-darkBg/50 hover:bg-brand-softBlue dark:hover:bg-blue-950/40 hover:border-brand-blue/40 transition-all group"
            >
              <div className="flex items-center justify-between text-app-secondary dark:text-app-darkSecondary group-hover:text-brand-blue mb-1">
                <FileSpreadsheet className="w-4 h-4" />
                <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <span className="font-bold text-xs text-app-text dark:text-app-darkText group-hover:text-brand-blue block">
                {t('inventory_report')}
              </span>
              <span className="text-[11px] text-app-muted">Valuation & Reorders</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
