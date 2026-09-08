import React from 'react';
import { Building2, Layers, DollarSign, ArrowUpRight } from 'lucide-react';
import { ReportViewMode } from './GlobalFilterBar';
import { useLanguage } from '../../context/LanguageContext';

export interface PlantInventorySummary {
  plant: string;
  itemCount: number;
  totalQuantity: number;
  totalValue: number;
  percentage: number;
}

interface InventoryByPlantWidgetProps {
  plantSummaries: PlantInventorySummary[];
  viewMode: ReportViewMode;
  className?: string;
}

export const InventoryByPlantWidget: React.FC<InventoryByPlantWidgetProps> = ({
  plantSummaries,
  viewMode,
  className = '',
}) => {
  const { language } = useLanguage();
  const isTh = language === 'th';
  const isPrice = viewMode === 'PRICE';

  const formatMoney = (val: number) => {
    return `฿${val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const getPlantColor = (plant: string) => {
    if (plant === 'DEMO') return 'bg-purple-500';
    if (plant === 'PLANT-01') return 'bg-brand-blue';
    if (plant === 'PLANT-02') return 'bg-emerald-500';
    return 'bg-amber-500';
  };

  const getPlantBadgeBg = (plant: string) => {
    if (plant === 'DEMO') return 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800';
    if (plant === 'PLANT-01') return 'bg-blue-50 dark:bg-blue-950/60 text-brand-blue border-blue-200 dark:border-blue-800';
    if (plant === 'PLANT-02') return 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
    return 'bg-amber-50 text-amber-700 border-amber-200';
  };

  return (
    <div className={`p-4 sm:p-5 rounded-2xl bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder shadow-subtle flex flex-col justify-between ${className}`}>
      {/* HEADER */}
      <div className="flex items-center justify-between pb-3 border-b border-app-border dark:border-app-darkBorder">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-brand-blue flex items-center justify-center shrink-0">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-app-text dark:text-app-darkText uppercase tracking-wider">
              {isTh ? 'สินค้าคงคลังแยกตามโรงงาน' : 'Inventory by Plant'}
            </h3>
            <p className="text-[10px] sm:text-[11px] text-app-muted">
              {isTh ? 'สัดส่วนมูลค่าและจำนวนชิ้นในแต่ละโรงงาน' : 'Plant-level distribution, valuation & SKU counts'}
            </p>
          </div>
        </div>
      </div>

      {/* PLANT CARDS LIST */}
      <div className="mt-4 space-y-3.5">
        {plantSummaries.map((p) => (
          <div
            key={p.plant}
            className="p-3 rounded-xl border border-app-border dark:border-app-darkBorder bg-app-bg/60 dark:bg-app-darkBg/60 space-y-2 hover:border-brand-blue/40 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-md text-xs font-mono font-bold border ${getPlantBadgeBg(p.plant)}`}>
                  {p.plant}
                </span>
                <span className="text-xs font-semibold text-app-text dark:text-app-darkText">
                  {p.itemCount} SKUs
                </span>
              </div>

              <div className="text-right">
                <span className="font-mono font-bold text-xs text-app-text dark:text-app-darkText">
                  {isPrice ? formatMoney(p.totalValue) : `${p.totalQuantity.toLocaleString()} Units`}
                </span>
                <span className="text-[11px] font-mono text-app-muted ml-1.5 font-bold">
                  ({p.percentage.toFixed(1)}%)
                </span>
              </div>
            </div>

            {/* PROGRESS BAR */}
            <div className="w-full h-2 rounded-full bg-app-border dark:bg-app-darkBorder overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${getPlantColor(p.plant)}`}
                style={{ width: `${Math.max(2, Math.min(100, p.percentage))}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[10px] text-app-muted font-mono">
              <span>Physical: {p.totalQuantity.toLocaleString()} EA</span>
              <span>Valuation: {formatMoney(p.totalValue)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
