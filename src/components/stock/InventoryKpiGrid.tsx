import React from 'react';
import {
  Package,
  Layers,
  AlertTriangle,
  AlertCircle,
  TrendingUp,
  PackageX,
  DollarSign,
  TrendingDown,
  ShieldCheck,
} from 'lucide-react';
import { ReportViewMode } from './GlobalFilterBar';
import { useLanguage } from '../../context/LanguageContext';

export interface InventoryKpiMetrics {
  totalInventoryQty: number;
  totalInventoryVal: number;
  totalItemsCount: number;
  overStockCount: number;
  overStockVal: number;
  reorderCount: number;
  reorderVal: number;
  underminCount: number;
  underminVal: number;
  outOfStockCount: number;
  outOfStockVal: number;
  healthyCount: number;
}

interface InventoryKpiGridProps {
  metrics: InventoryKpiMetrics;
  viewMode: ReportViewMode;
  className?: string;
}

export const InventoryKpiGrid: React.FC<InventoryKpiGridProps> = ({
  metrics,
  viewMode,
  className = '',
}) => {
  const { t, language } = useLanguage();
  const isTh = language === 'th';
  const isPrice = viewMode === 'PRICE';

  const formatMoney = (amount: number) => {
    return `฿${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const cards = [
    {
      id: 'total_inventory',
      label: isTh ? 'สินค้าคงคลังรวม' : 'TOTAL INVENTORY',
      value: isPrice ? formatMoney(metrics.totalInventoryVal) : `${metrics.totalInventoryQty.toLocaleString()} Units`,
      subtext: isPrice
        ? `${metrics.totalInventoryQty.toLocaleString()} physical units on hand`
        : `Valued at ${formatMoney(metrics.totalInventoryVal)}`,
      icon: isPrice ? DollarSign : Layers,
      themeColor: 'blue',
      badgeBg: 'bg-blue-50 dark:bg-blue-950/60 text-brand-blue border-blue-200 dark:border-blue-900',
    },
    {
      id: 'total_items',
      label: isTh ? 'จำนวนรายการทั้งหมด' : 'TOTAL ITEMS',
      value: isPrice
        ? formatMoney(metrics.totalItemsCount > 0 ? metrics.totalInventoryVal / metrics.totalItemsCount : 0)
        : `${metrics.totalItemsCount} SKUs`,
      subtext: isPrice
        ? 'Average holding valuation per SKU'
        : `${metrics.healthyCount} healthy (${Math.round((metrics.healthyCount / Math.max(1, metrics.totalItemsCount)) * 100)}%)`,
      icon: Package,
      themeColor: 'indigo',
      badgeBg: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900',
    },
    {
      id: 'over_stock',
      label: isTh ? 'สต็อกเกินเกณฑ์ (Over Stock)' : 'OVER STOCK ITEMS',
      value: isPrice ? formatMoney(metrics.overStockVal) : `${metrics.overStockCount} Items`,
      subtext: isPrice
        ? `${metrics.overStockCount} items exceeding max limit`
        : `Tied-up capital: ${formatMoney(metrics.overStockVal)}`,
      icon: TrendingUp,
      themeColor: 'purple',
      badgeBg: 'bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-900',
    },
    {
      id: 'reordering',
      label: isTh ? 'ถึงจุดสั่งซื้อ (Reordering)' : 'REORDERING ITEMS',
      value: isPrice ? formatMoney(metrics.reorderVal) : `${metrics.reorderCount} Items`,
      subtext: isPrice
        ? `${metrics.reorderCount} items at or below ROP`
        : `Valued at ${formatMoney(metrics.reorderVal)}`,
      icon: AlertTriangle,
      themeColor: 'amber',
      badgeBg: 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900',
    },
    {
      id: 'undermin',
      label: isTh ? 'ต่ำกว่าขั้นต่ำ (Low Stock)' : 'LOW STOCK (UNDERMIN)',
      value: isPrice ? formatMoney(metrics.underminVal) : `${metrics.underminCount} Items`,
      subtext: isPrice
        ? `${metrics.underminCount} items below safety stock`
        : `Urgent restock needed (${formatMoney(metrics.underminVal)})`,
      icon: AlertCircle,
      themeColor: 'orange',
      badgeBg: 'bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-900',
    },
    {
      id: 'out_of_stock',
      label: isTh ? 'สินค้าหมด (Out of Stock)' : 'OUT OF STOCK',
      value: isPrice ? formatMoney(metrics.outOfStockVal) : `${metrics.outOfStockCount} Items`,
      subtext: isPrice
        ? `Replenishment target: ${formatMoney(metrics.outOfStockVal)}`
        : '0 units physically available',
      icon: PackageX,
      themeColor: 'red',
      badgeBg: 'bg-red-50 dark:bg-red-950/60 text-gi border-red-200 dark:border-red-900',
    },
  ];

  return (
    <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 ${className}`}>
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div
            key={c.id}
            className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder shadow-subtle flex flex-col justify-between hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-app-muted truncate">
                {c.label}
              </span>
              <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${c.badgeBg}`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="mt-2.5">
              <div className="text-lg sm:text-xl font-mono font-bold text-app-text dark:text-app-darkText tracking-tight truncate">
                {c.value}
              </div>
              <p className="text-[10px] sm:text-[11px] text-app-muted mt-1 truncate font-medium">
                {c.subtext}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
