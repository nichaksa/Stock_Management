import React, { useState, useMemo } from 'react';
import { PageLayout } from '../../components/layout/PageLayout';
import { StatusBadge } from '../../components/common/StatusBadge';
import { MaterialDetailDrawer } from '../../components/stock/MaterialDetailDrawer';
import { useStock } from '../../context/StockContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { exportInventoryReportToCsv } from '../../utils/export';
import { getCurrentStock, calculateStockStatus, getLastMovement } from '../../utils/stockCalculation';
import { formatDateTime } from '../../utils/dateRange';
import { Material, StockStatus } from '../../types/stock';
import {
  Download,
  DollarSign,
  Package,
  TrendingUp,
  AlertTriangle,
  Clock,
  PieChart as PieChartIcon,
  BarChart3,
  Layers,
  ArrowUpRight,
  ShieldAlert,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

export const InventoryReportPage: React.FC = () => {
  const { materials, transactions } = useStock();
  const { t } = useLanguage();
  const { theme } = useTheme();
  const { addToast } = useToast();
  const isDark = theme === 'dark';

  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [slowMoveDays, setSlowMoveDays] = useState<number>(30);

  // Enriched stock information
  const enrichedMaterials = useMemo(() => {
    return materials.map(m => {
      const currentStock = getCurrentStock(m.id, transactions);
      const stockStatus = calculateStockStatus(m, currentStock);
      const lastMovement = getLastMovement(m.id, transactions);
      const totalValue = currentStock * (m.standardPrice || 0);

      // Days since last movement
      let daysSinceLastMove = 999;
      if (lastMovement) {
        const diffMs = Date.now() - new Date(lastMovement.createdAt).getTime();
        daysSinceLastMove = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      }

      return {
        ...m,
        currentStock,
        stockStatus,
        lastMovement,
        totalValue,
        daysSinceLastMove,
      };
    });
  }, [materials, transactions]);

  // KPIs
  const reportKpis = useMemo(() => {
    let totalVal = 0;
    let totalItems = enrichedMaterials.length;
    let normal = 0;
    let reordering = 0;
    let overmax = 0;
    let undermin = 0;
    let outOfStock = 0;

    enrichedMaterials.forEach(m => {
      totalVal += m.totalValue;
      if (m.stockStatus === 'NORMAL') normal++;
      else if (m.stockStatus === 'REORDERING') reordering++;
      else if (m.stockStatus === 'OVERMAX') overmax++;
      else if (m.stockStatus === 'UNDERMIN') undermin++;
      else if (m.stockStatus === 'OUT_OF_STOCK') outOfStock++;
    });

    return { totalVal, totalItems, normal, reordering, overmax, undermin, outOfStock };
  }, [enrichedMaterials]);

  // Reorder / Attention List
  const reorderAttentionList = useMemo(() => {
    return enrichedMaterials
      .filter(m => m.stockStatus === 'OUT_OF_STOCK' || m.stockStatus === 'UNDERMIN' || m.stockStatus === 'REORDERING')
      .sort((a, b) => {
        const priorityOrder: Record<StockStatus, number> = {
          OUT_OF_STOCK: 1,
          UNDERMIN: 2,
          REORDERING: 3,
          OVERMAX: 4,
          NORMAL: 5,
        };
        return priorityOrder[a.stockStatus] - priorityOrder[b.stockStatus];
      });
  }, [enrichedMaterials]);

  // Slow / Non-Moving List
  const slowMovingList = useMemo(() => {
    return enrichedMaterials
      .filter(m => m.daysSinceLastMove >= slowMoveDays && m.currentStock > 0)
      .sort((a, b) => b.daysSinceLastMove - a.daysSinceLastMove);
  }, [enrichedMaterials, slowMoveDays]);

  // Status composition chart data
  const statusPieData = useMemo(() => {
    const data = [
      { name: 'Normal', value: reportKpis.normal, color: '#16A34A' },
      { name: 'Reordering', value: reportKpis.reordering, color: '#D97706' },
      { name: 'Overmax', value: reportKpis.overmax, color: '#9333EA' },
      { name: 'Undermin', value: reportKpis.undermin, color: '#EA580C' },
      { name: 'Out of Stock', value: reportKpis.outOfStock, color: '#DC2626' },
    ];
    return data.filter(d => d.value > 0);
  }, [reportKpis]);

  // Value by Material Type chart data
  const valueByTypeData = useMemo(() => {
    const map: Record<string, number> = {};
    enrichedMaterials.forEach(m => {
      map[m.materialType] = (map[m.materialType] || 0) + m.totalValue;
    });

    return Object.entries(map)
      .map(([type, value]) => ({ type, value }))
      .sort((a, b) => b.value - a.value);
  }, [enrichedMaterials]);

  // GR vs GI summary by month/week
  const movementTrendData = useMemo(() => {
    let totalGr = 0;
    let totalGi = 0;
    let totalOpening = 0;

    transactions.forEach(t => {
      if (t.transactionType === 'GR') totalGr += t.quantity;
      if (t.transactionType === 'GI') totalGi += Math.abs(t.quantity);
      if (t.transactionType === 'OPENING') totalOpening += t.quantity;
    });

    return [
      { name: 'Opening Baseline', Volume: totalOpening, fill: '#2563EB' },
      { name: 'Goods Receipt (GR)', Volume: totalGr, fill: '#16A34A' },
      { name: 'Goods Issue (GI)', Volume: totalGi, fill: '#DC2626' },
    ];
  }, [transactions]);

  const handleExport = () => {
    exportInventoryReportToCsv(materials, transactions);
    addToast('Inventory Report exported successfully', 'success');
  };

  return (
    <PageLayout
      title={t('inventory_report')}
      subtitle="Executive inventory analytics, financial valuation, and stock health monitoring"
      actions={
        <button
          type="button"
          onClick={handleExport}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border border-app-border dark:border-app-darkBorder bg-white dark:bg-app-darkSurface text-app-secondary dark:text-app-darkSecondary hover:text-app-text dark:hover:text-app-darkText shadow-subtle hover:bg-app-bg transition-colors"
        >
          <Download className="w-4 h-4 text-app-muted" />
          <span>{t('export_csv')}</span>
        </button>
      }
    >
      <div className="space-y-5">
        {/* EXECUTIVE KPI CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Total Value */}
          <div className="p-4 rounded-2xl bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder shadow-subtle">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-app-muted">
                {t('total_inventory_value')}
              </span>
              <div className="p-2 rounded-xl bg-brand-softBlue dark:bg-blue-950 text-brand-blue">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-mono font-bold text-brand-blue mt-2">
              ฿{reportKpis.totalVal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
            <p className="text-[11px] text-app-muted mt-1">
              Active ledger valuation based on standard price
            </p>
          </div>

          {/* Total Items */}
          <div className="p-4 rounded-2xl bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder shadow-subtle">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-app-muted">
                {t('total_items')}
              </span>
              <div className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-app-secondary">
                <Package className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-mono font-bold text-app-text dark:text-app-darkText mt-2">
              {reportKpis.totalItems}
            </div>
            <p className="text-[11px] text-app-muted mt-1">
              {reportKpis.normal} healthy · {reportKpis.reordering + reportKpis.undermin + reportKpis.outOfStock} requiring attention
            </p>
          </div>

          {/* Attention Items */}
          <div className="p-4 rounded-2xl bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder shadow-subtle">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-warn">
                Items Below ROP
              </span>
              <div className="p-2 rounded-xl bg-warn-bg dark:bg-warn-darkBg text-warn">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-mono font-bold text-warn mt-2">
              {reportKpis.reordering + reportKpis.undermin + reportKpis.outOfStock}
            </div>
            <p className="text-[11px] text-app-muted mt-1">
              {reportKpis.outOfStock} out of stock, {reportKpis.undermin} undermin
            </p>
          </div>

          {/* Slow Moving */}
          <div className="p-4 rounded-2xl bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder shadow-subtle">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-app-muted">
                Slow-Moving Items
              </span>
              <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-mono font-bold text-app-text dark:text-app-darkText mt-2">
              {slowMovingList.length}
            </div>
            <p className="text-[11px] text-app-muted mt-1">
              No movement recorded in &gt; {slowMoveDays} days
            </p>
          </div>
        </div>

        {/* CHARTS GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Status Composition (Donut) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder shadow-subtle space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-app-border dark:border-app-darkBorder">
              <h4 className="text-xs font-bold text-app-text dark:text-app-darkText uppercase tracking-wider flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-brand-blue" />
                <span>{t('status_composition')}</span>
              </h4>
            </div>

            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={76}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {statusPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Value by Material Type */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder shadow-subtle space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-app-border dark:border-app-darkBorder">
              <h4 className="text-xs font-bold text-app-text dark:text-app-darkText uppercase tracking-wider flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-brand-blue" />
                <span>{t('value_by_type')}</span>
              </h4>
            </div>

            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={valueByTypeData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#23304B' : '#E5EAF1'} />
                  <XAxis dataKey="type" stroke={isDark ? '#64748B' : '#98A2B3'} fontSize={10} angle={-25} textAnchor="end" />
                  <YAxis stroke={isDark ? '#64748B' : '#98A2B3'} fontSize={10} tickFormatter={(val) => `฿${(val / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(val: any) => `฿${Number(val).toLocaleString()}`} />
                  <Bar dataKey="value" name="Valuation" fill="#2563EB" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* GR vs GI Movement */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder shadow-subtle space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-app-border dark:border-app-darkBorder">
              <h4 className="text-xs font-bold text-app-text dark:text-app-darkText uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-brand-blue" />
                <span>{t('gr_vs_gi')}</span>
              </h4>
            </div>

            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={movementTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#23304B' : '#E5EAF1'} />
                  <XAxis dataKey="name" stroke={isDark ? '#64748B' : '#98A2B3'} fontSize={10} />
                  <YAxis stroke={isDark ? '#64748B' : '#98A2B3'} fontSize={10} />
                  <Tooltip />
                  <Bar dataKey="Volume" name="Quantity Units" radius={[6, 6, 0, 0]}>
                    {movementTrendData.map((entry, index) => (
                      <Cell key={`cell-m-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* REORDER / ATTENTION SECTION */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder shadow-subtle space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-app-border dark:border-app-darkBorder">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-gi" />
              <h3 className="text-xs font-bold text-app-text dark:text-app-darkText uppercase tracking-wider">
                {t('reorder_list')}
              </h3>
            </div>
            <span className="text-[11px] font-mono text-app-muted">
              {reorderAttentionList.length} items requiring replenishment
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="text-[10px] uppercase font-semibold text-app-secondary dark:text-app-darkSecondary bg-app-bg dark:bg-app-darkBg border-b border-app-border dark:border-app-darkBorder">
                <tr>
                  <th className="py-2.5 px-3">Plant</th>
                  <th className="py-2.5 px-3">Material</th>
                  <th className="py-2.5 px-3 text-right">Current Stock</th>
                  <th className="py-2.5 px-3 text-center">Min / ROP / Max</th>
                  <th className="py-2.5 px-3 text-center">Lead Time</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Suggested Reorder Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border dark:divide-app-darkBorder">
                {reorderAttentionList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-app-muted">
                      No materials currently require replenishment. All stock levels are within normal bounds.
                    </td>
                  </tr>
                ) : (
                  reorderAttentionList.map(m => {
                    const suggestedOrder = Math.max(0, m.max - m.currentStock);
                    return (
                      <tr
                        key={m.id}
                        onClick={() => setSelectedMaterial(m)}
                        className="hover:bg-app-bg/50 dark:hover:bg-app-darkBorder/30 cursor-pointer transition-colors"
                      >
                        <td className="py-2.5 px-3 font-mono font-bold text-[11px]">
                          {m.plant}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-mono font-bold text-brand-blue block">
                            {m.materialCode}
                          </span>
                          <span className="text-app-text dark:text-app-darkText truncate max-w-xs block">
                            {m.description}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold">
                          <span className={m.currentStock <= 0 ? 'text-gi' : 'text-warn'}>
                            {m.currentStock} {m.unit}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-[11px] text-app-secondary">
                          {m.min} / {m.rop} / {m.max}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono">
                          {m.leadTime} Days
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <StatusBadge status={m.stockStatus} size="sm" />
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-brand-blue">
                          +{suggestedOrder} {m.unit}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* SLOW / NON-MOVING SECTION */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder shadow-subtle space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b border-app-border dark:border-app-darkBorder">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-600" />
              <h3 className="text-xs font-bold text-app-text dark:text-app-darkText uppercase tracking-wider">
                {t('slow_non_moving')}
              </h3>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-app-muted">Threshold:</span>
              {[
                { label: '30 Days', days: 30 },
                { label: '60 Days', days: 60 },
                { label: '90 Days', days: 90 },
              ].map(opt => (
                <button
                  key={opt.days}
                  type="button"
                  onClick={() => setSlowMoveDays(opt.days)}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all ${
                    slowMoveDays === opt.days
                      ? 'bg-purple-50 dark:bg-purple-950/60 border-purple-300 text-purple-700 dark:text-purple-300'
                      : 'bg-white dark:bg-app-darkSurface border-app-border text-app-secondary hover:text-app-text'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="text-[10px] uppercase font-semibold text-app-secondary dark:text-app-darkSecondary bg-app-bg dark:bg-app-darkBg border-b border-app-border dark:border-app-darkBorder">
                <tr>
                  <th className="py-2.5 px-3">Plant</th>
                  <th className="py-2.5 px-3">Material</th>
                  <th className="py-2.5 px-3 text-right">Current Stock</th>
                  <th className="py-2.5 px-3 text-right">Holding Value</th>
                  <th className="py-2.5 px-3">Storage Location</th>
                  <th className="py-2.5 px-3">Last Movement</th>
                  <th className="py-2.5 px-3 text-center">Days Inactive</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border dark:divide-app-darkBorder">
                {slowMovingList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-app-muted">
                      No materials match the slow-moving threshold of &gt; {slowMoveDays} days.
                    </td>
                  </tr>
                ) : (
                  slowMovingList.map(m => (
                    <tr
                      key={m.id}
                      onClick={() => setSelectedMaterial(m)}
                      className="hover:bg-app-bg/50 dark:hover:bg-app-darkBorder/30 cursor-pointer transition-colors"
                    >
                      <td className="py-2.5 px-3 font-mono font-bold text-[11px]">{m.plant}</td>
                      <td className="py-2.5 px-3">
                        <span className="font-mono font-bold text-brand-blue block">{m.materialCode}</span>
                        <span className="text-app-text dark:text-app-darkText truncate max-w-xs block">{m.description}</span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold">
                        {m.currentStock} {m.unit}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-app-text dark:text-app-darkText">
                        ฿{m.totalValue.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-app-secondary">
                        {m.storageLocation} / {m.storageBin}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-app-muted">
                        {m.lastMovement ? formatDateTime(m.lastMovement.createdAt) : 'Initial Registration'}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-purple-600">
                        {m.daysSinceLastMove >= 999 ? 'No Movements' : `${m.daysSinceLastMove} Days`}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Material Detail Drawer */}
      <MaterialDetailDrawer
        isOpen={Boolean(selectedMaterial)}
        onClose={() => setSelectedMaterial(null)}
        material={selectedMaterial}
      />
    </PageLayout>
  );
};
