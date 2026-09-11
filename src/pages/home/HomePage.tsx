import React from 'react';
import { Link } from 'react-router-dom';
import {
  Database,
  Layers,
  ArrowLeftRight,
  FileSpreadsheet,
  Cpu,
  FileCheck2,
  AlertOctagon,
  Radio,
  Activity,
  ArrowUpRight,
  Shield,
  Clock,
  Sparkles,
  Boxes,
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
                  Material master catalog, physical stock ledger, Goods Movement (GR/GI), and analytics.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
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
              <span className="text-[11px] text-app-muted">Catalog & Specifications</span>
            </Link>

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
              <span className="text-[11px] text-app-muted">Quantity & GR/GI Actions</span>
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
              <span className="text-[11px] text-app-muted">System-wide Audit Trail</span>
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

        {/* ENTERPRISE MODULES GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* M-PROS */}
          <div className="p-4 rounded-2xl bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder shadow-subtle space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-app-text dark:text-app-darkText uppercase tracking-wider">
                    M-Pros (Maintenance Management)
                  </h4>
                  <p className="text-[11px] text-app-muted">Work orders, PM schedules, and asset health</p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {["Dashboard", "Create Job", "Follow Up", "My Job", "PM Master", "SparePart"].map((action, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 text-xs font-medium rounded-lg bg-app-bg dark:bg-app-darkBg text-app-secondary dark:text-app-darkSecondary border border-app-border dark:border-app-darkBorder cursor-default select-none opacity-80"
                >
                  {action}
                </span>
              ))}
            </div>
          </div>

          {/* WORK PERMIT */}
          <div className="p-4 rounded-2xl bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder shadow-subtle space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                  <FileCheck2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-app-text dark:text-app-darkText uppercase tracking-wider">
                    Work Permit (EHS Safety)
                  </h4>
                  <p className="text-[11px] text-app-muted">Hot work, confined space, and safety authorization</p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {["Dashboard", "WorkPermit"].map((action, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 text-xs font-medium rounded-lg bg-app-bg dark:bg-app-darkBg text-app-secondary dark:text-app-darkSecondary border border-app-border dark:border-app-darkBorder cursor-default select-none opacity-80"
                >
                  {action}
                </span>
              ))}
            </div>
          </div>

          {/* UNSAFE */}
          <div className="p-4 rounded-2xl bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder shadow-subtle space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-red-50 dark:bg-red-950/40 text-gi">
                  <AlertOctagon className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-app-text dark:text-app-darkText uppercase tracking-wider">
                    Unsafe Condition & Incident Reporting
                  </h4>
                  <p className="text-[11px] text-app-muted">Hazard reporting and corrective actions</p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {["Dashboard", "Unsafe"].map((action, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 text-xs font-medium rounded-lg bg-app-bg dark:bg-app-darkBg text-app-secondary dark:text-app-darkSecondary border border-app-border dark:border-app-darkBorder cursor-default select-none opacity-80"
                >
                  {action}
                </span>
              ))}
            </div>
          </div>

          {/* Z-SENSOR & Z-PAP */}
          <div className="p-4 rounded-2xl bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder shadow-subtle space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-app-text dark:text-app-darkText uppercase tracking-wider">
                    Z-Sensor & Z-PAP (IoT & Predictive AI)
                  </h4>
                  <p className="text-[11px] text-app-muted">Telemetry streaming, telemetry alarms, AI predictive models</p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {["Z-SENSOR", "Data Preparation", "Model Deployment", "Alarm History"].map((action, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 text-xs font-medium rounded-lg bg-app-bg dark:bg-app-darkBg text-app-secondary dark:text-app-darkSecondary border border-app-border dark:border-app-darkBorder cursor-default select-none opacity-80"
                >
                  {action}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
