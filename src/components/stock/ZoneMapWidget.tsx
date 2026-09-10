import React from 'react';
import { MapPin, Warehouse, Layers, Package, DollarSign, HelpCircle, Box } from 'lucide-react';
import { ReportViewMode } from './GlobalFilterBar';
import { useLanguage } from '../../context/LanguageContext';

export interface ZoneMapItem {
  sloc: string;
  percentage: number;
  itemCount: number;
  totalQuantity: number;
  totalValue: number;
}

interface ZoneMapWidgetProps {
  zones: ZoneMapItem[];
  viewMode: ReportViewMode;
  totalItemsCount: number;
  totalInventoryQty: number;
  totalInventoryVal: number;
  className?: string;
}

// Curated badge accents for known and dynamic SLoc zones
const ZONE_COLOR_PALETTE: Record<string, { bg: string; text: string; border: string; bar: string; ring: string }> = {
  MAIN: {
    bg: 'bg-blue-50 dark:bg-blue-950/50',
    text: 'text-brand-blue dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-800/60',
    bar: 'bg-brand-blue',
    ring: 'ring-brand-blue/20',
  },
  SPARE: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/50',
    text: 'text-emerald-700 dark:text-emerald-400',
    border: 'border-emerald-200 dark:border-emerald-800/60',
    bar: 'bg-emerald-500',
    ring: 'ring-emerald-500/20',
  },
  WH01: {
    bg: 'bg-indigo-50 dark:bg-indigo-950/50',
    text: 'text-indigo-700 dark:text-indigo-400',
    border: 'border-indigo-200 dark:border-indigo-800/60',
    bar: 'bg-indigo-500',
    ring: 'ring-indigo-500/20',
  },
  WH02: {
    bg: 'bg-purple-50 dark:bg-purple-950/50',
    text: 'text-purple-700 dark:text-purple-400',
    border: 'border-purple-200 dark:border-purple-800/60',
    bar: 'bg-purple-500',
    ring: 'ring-purple-500/20',
  },
  STORE01: {
    bg: 'bg-amber-50 dark:bg-amber-950/50',
    text: 'text-amber-700 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-800/60',
    bar: 'bg-amber-500',
    ring: 'ring-amber-500/20',
  },
  Unassigned: {
    bg: 'bg-slate-100 dark:bg-slate-800/60',
    text: 'text-slate-600 dark:text-slate-400',
    border: 'border-slate-200 dark:border-slate-700',
    bar: 'bg-slate-400 dark:bg-slate-500',
    ring: 'ring-slate-400/20',
  },
};

const DEFAULT_ZONE_COLOR = {
  bg: 'bg-cyan-50 dark:bg-cyan-950/50',
  text: 'text-cyan-700 dark:text-cyan-400',
  border: 'border-cyan-200 dark:border-cyan-800/60',
  bar: 'bg-cyan-500',
  ring: 'ring-cyan-500/20',
};

export const ZoneMapWidget: React.FC<ZoneMapWidgetProps> = ({
  zones,
  viewMode,
  totalItemsCount,
  totalInventoryQty,
  totalInventoryVal,
  className = '',
}) => {
  const { language } = useLanguage();
  const isTh = language === 'th';
  const isPrice = viewMode === 'PRICE';

  return (
    <div className={`p-4 sm:p-5 rounded-2xl bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder shadow-subtle space-y-4 ${className}`}>
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-app-border dark:border-app-darkBorder">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <Warehouse className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-app-text dark:text-app-darkText uppercase tracking-wider">
              {isTh ? 'Zone Map — ผังพื้นที่จัดเก็บตาม SLoc' : 'Zone Map'}
            </h3>
            <p className="text-[10px] sm:text-[11px] text-app-muted">
              {isTh
                ? `การกระจายตัวของสต็อกตาม Storage Location (${zones.length} โซน)`
                : `Storage Location inventory allocation breakdown (${zones.length} SLoc zones)`}
            </p>
          </div>
        </div>

        {/* Global Summary Badge */}
        <div className="flex items-center gap-2 text-xs font-mono self-end sm:self-auto">
          <span className="text-app-muted">{isTh ? 'รวมทุกโซน:' : 'Total Filtered:'}</span>
          <strong className="text-brand-blue">{totalItemsCount} {isTh ? 'รายการ' : 'Items'}</strong>
          <span className="text-app-muted">·</span>
          <strong className={isPrice ? 'text-emerald-600 dark:text-emerald-400' : 'text-app-text dark:text-app-darkText'}>
            {isPrice ? `฿${totalInventoryVal.toLocaleString()}` : `${totalInventoryQty.toLocaleString()} Units`}
          </strong>
        </div>
      </div>

      {/* ZONE CARDS GRID */}
      {zones.length === 0 ? (
        <div className="py-12 flex flex-col items-center justify-center text-center text-app-muted">
          <MapPin className="w-8 h-8 mb-2 stroke-1" />
          <p className="text-xs font-medium">{isTh ? 'ไม่มีข้อมูลพื้นที่จัดเก็บในเงื่อนไขที่เลือก' : 'No storage locations match the current filter.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {zones.map((zone) => {
            const colors = ZONE_COLOR_PALETTE[zone.sloc] || DEFAULT_ZONE_COLOR;
            const isUnassigned = zone.sloc === 'Unassigned';

            return (
              <div
                key={zone.sloc}
                className="group relative p-4 rounded-2xl bg-app-bg/50 dark:bg-app-darkBg/60 border border-app-border dark:border-app-darkBorder hover:border-brand-blue/40 dark:hover:border-blue-500/40 transition-all shadow-xs flex flex-col justify-between space-y-3"
              >
                {/* TOP ROW: SLOC BADGE + PERCENTAGE */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-mono font-bold border ${colors.bg} ${colors.text} ${colors.border}`}
                    >
                      {isUnassigned ? <HelpCircle className="w-3.5 h-3.5" /> : <MapPin className="w-3.5 h-3.5" />}
                      <span>{zone.sloc}</span>
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-xl font-mono font-bold text-app-text dark:text-app-darkText block leading-none">
                      {zone.percentage.toFixed(1)}%
                    </span>
                    <span className="text-[10px] text-app-muted font-mono block mt-0.5">
                      {isPrice ? (isTh ? 'สัดส่วนมูลค่า' : 'of Value') : (isTh ? 'สัดส่วนจำนวน' : 'of Qty')}
                    </span>
                  </div>
                </div>

                {/* PROGRESS METER */}
                <div className="w-full bg-slate-200 dark:bg-slate-700/60 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${colors.bar}`}
                    style={{ width: `${Math.min(100, Math.max(0, zone.percentage))}%` }}
                  />
                </div>

                {/* BOTTOM METRICS ROW */}
                <div className="pt-2 border-t border-app-border dark:border-app-darkBorder flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-app-muted uppercase tracking-wider block">
                      {isTh ? 'จำนวนรายการ' : 'Total Items'}
                    </span>
                    <span className="font-mono font-bold text-app-text dark:text-app-darkText">
                      {zone.itemCount.toLocaleString()} <span className="text-[10px] font-normal text-app-muted">{isTh ? 'รายการ' : 'Items'}</span>
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-app-muted uppercase tracking-wider block">
                      {isPrice ? (isTh ? 'มูลค่าคงคลัง' : 'Inventory Value') : (isTh ? 'ยอดคงเหลือ' : 'Balance Qty')}
                    </span>
                    <span
                      className={`font-mono font-bold ${
                        isPrice
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-brand-blue'
                      }`}
                    >
                      {isPrice
                        ? `฿${zone.totalValue.toLocaleString()}`
                        : `${zone.totalQuantity.toLocaleString()} Units`}
                    </span>
                  </div>
                </div>

                {/* COMPACT SUMMARY TEXT REQUIRED */}
                <div className="px-2 py-1 rounded-lg bg-white/70 dark:bg-slate-800/50 border border-app-border/60 dark:border-app-darkBorder/40 text-[11px] font-mono text-app-secondary dark:text-app-darkSecondary flex items-center justify-between">
                  <span className="truncate font-semibold">{zone.sloc} — {zone.percentage.toFixed(0)}%</span>
                  <span className="shrink-0 font-bold">{zone.itemCount} Items</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
