import React, { useState, useMemo, useEffect } from 'react';
import { Building2, Calendar, Clock, Filter, Check, Sparkles, DollarSign, Layers, Warehouse } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { getAllPlants, getStoresForPlant } from '../../utils/plantStoreMaster';
import { Material } from '../../types/stock';

export type ReportViewMode = 'OVERVIEW' | 'PRICE';

export interface GlobalFilterState {
  viewMode: ReportViewMode;
  selectedPlant: string;
  selectedStore: string;
  startDate: string; // "YYYY-MM-DD"
  startHour: string; // "00" - "23"
  startMinute: string; // "00" - "59"
  endDate: string; // "YYYY-MM-DD"
  endHour: string; // "00" - "23"
  endMinute: string; // "00" - "59"
}

interface GlobalFilterBarProps {
  filter: GlobalFilterState;
  onApplyFilter: (newFilter: GlobalFilterState) => void;
  materials?: Material[];
  className?: string;
}

export const GlobalFilterBar: React.FC<GlobalFilterBarProps> = ({
  filter,
  onApplyFilter,
  materials = [],
  className = '',
}) => {
  const { t, language } = useLanguage();
  const isTh = language === 'th';

  // Draft state before user clicks "Apply Filter"
  const [draft, setDraft] = useState<GlobalFilterState>(filter);

  // Synchronize draft when filter prop changes
  useEffect(() => {
    setDraft(filter);
  }, [filter]);

  // Plants & Stores Options (Canonical & Cascaded)
  const availablePlants = useMemo(() => {
    return getAllPlants(materials);
  }, [materials]);

  const availableStores = useMemo(() => {
    return getStoresForPlant(draft.selectedPlant, materials);
  }, [draft.selectedPlant, materials]);

  const handlePlantChange = (newPlant: string) => {
    const validStores = getStoresForPlant(newPlant, materials);
    const isStoreStillValid =
      draft.selectedStore === 'All Stores' ||
      draft.selectedStore === 'ALL' ||
      validStores.some(s => s.code === draft.selectedStore);

    setDraft(prev => ({
      ...prev,
      selectedPlant: newPlant,
      selectedStore: isStoreStillValid ? prev.selectedStore : 'All Stores',
    }));
  };

  // Hour options
  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  // Minute options (00, 05, 10, 15, ..., 55 or full 00-59)
  const minutes = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    onApplyFilter(draft);
  };

  const handleQuickPreset = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);

    const pad = (n: number) => String(n).padStart(2, '0');
    const startD = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`;
    const endD = `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`;

    setDraft(prev => ({
      ...prev,
      startDate: startD,
      startHour: '00',
      startMinute: '00',
      endDate: endD,
      endHour: '23',
      endMinute: '59',
    }));
  };

  return (
    <div className={`p-4 rounded-2xl bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder shadow-subtle space-y-3.5 ${className}`}>
      <form onSubmit={handleApply} className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3.5">
        {/* LEFT: VIEW MODE TOGGLE & PLANT / STORE SELECTORS */}
        <div className="flex flex-wrap items-center gap-3">
          {/* View Mode Toggle: Overview / Price */}
          <div className="flex items-center p-1 bg-app-bg dark:bg-app-darkBg border border-app-border dark:border-app-darkBorder rounded-xl">
            <button
              type="button"
              onClick={() => {
                const next = { ...draft, viewMode: 'OVERVIEW' as ReportViewMode };
                setDraft(next);
                onApplyFilter(next);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                draft.viewMode === 'OVERVIEW'
                  ? 'bg-white dark:bg-app-darkSurface text-brand-blue shadow-sm'
                  : 'text-app-secondary dark:text-app-darkSecondary hover:text-app-text'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{isTh ? 'ภาพรวม (Overview)' : 'Overview'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const next = { ...draft, viewMode: 'PRICE' as ReportViewMode };
                setDraft(next);
                onApplyFilter(next);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                draft.viewMode === 'PRICE'
                  ? 'bg-white dark:bg-app-darkSurface text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-app-secondary dark:text-app-darkSecondary hover:text-app-text'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>{isTh ? 'มูลค่า (Price)' : 'Price / Valuation'}</span>
            </button>
          </div>

          {/* Plant Selector */}
          <div className="relative inline-flex items-center">
            <Building2 className="w-3.5 h-3.5 text-app-muted absolute left-3 pointer-events-none" />
            <select
              value={draft.selectedPlant}
              onChange={(e) => handlePlantChange(e.target.value)}
              className="h-9 pl-8 pr-8 bg-white dark:bg-app-darkBg border border-app-border dark:border-app-darkBorder rounded-xl text-xs font-semibold text-app-text dark:text-app-darkText outline-none focus:border-brand-blue shadow-subtle cursor-pointer"
            >
              <option value="All Plants">{t('all_plants') || 'All Plants'}</option>
              {availablePlants.map(p => (
                <option key={p.code} value={p.code}>{p.code}</option>
              ))}
            </select>
          </div>

          {/* Store / SLoc Selector */}
          <div className="relative inline-flex items-center">
            <Warehouse className="w-3.5 h-3.5 text-app-muted absolute left-3 pointer-events-none" />
            <select
              value={draft.selectedStore || 'All Stores'}
              onChange={(e) => setDraft(prev => ({ ...prev, selectedStore: e.target.value }))}
              className="h-9 pl-8 pr-8 bg-white dark:bg-app-darkBg border border-app-border dark:border-app-darkBorder rounded-xl text-xs font-semibold text-app-text dark:text-app-darkText outline-none focus:border-brand-blue shadow-subtle cursor-pointer"
            >
              <option value="All Stores">{t('all_stores') || (isTh ? 'ทุกสโตร์' : 'All Stores')}</option>
              {availableStores.map(s => (
                <option key={s.code} value={s.code}>{s.label || s.code}</option>
              ))}
            </select>
          </div>
        </div>

        {/* RIGHT: START DATETIME + END DATETIME + APPLY BUTTON */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Start Date + Time */}
          <div className="flex items-center gap-1 bg-app-bg dark:bg-app-darkBg border border-app-border dark:border-app-darkBorder px-2.5 py-1 rounded-xl shadow-subtle">
            <span className="text-[10px] font-bold uppercase tracking-wider text-app-muted mr-1">
              {isTh ? 'เริ่ม' : 'Start'}
            </span>
            <input
              type="date"
              value={draft.startDate}
              onChange={(e) => setDraft(prev => ({ ...prev, startDate: e.target.value }))}
              className="bg-transparent border-none text-xs font-mono font-medium text-app-text dark:text-app-darkText outline-none"
            />
            <div className="flex items-center gap-0.5 border-l border-app-border dark:border-app-darkBorder pl-1.5 ml-1">
              <select
                value={draft.startHour}
                onChange={(e) => setDraft(prev => ({ ...prev, startHour: e.target.value }))}
                className="bg-transparent text-xs font-mono font-bold text-app-text dark:text-app-darkText outline-none cursor-pointer"
              >
                {hours.map(h => (
                  <option key={`sh-${h}`} value={h} className="bg-white dark:bg-slate-900">{h}</option>
                ))}
              </select>
              <span className="text-xs text-app-muted">:</span>
              <select
                value={draft.startMinute}
                onChange={(e) => setDraft(prev => ({ ...prev, startMinute: e.target.value }))}
                className="bg-transparent text-xs font-mono font-bold text-app-text dark:text-app-darkText outline-none cursor-pointer"
              >
                {minutes.map(m => (
                  <option key={`sm-${m}`} value={m} className="bg-white dark:bg-slate-900">{m}</option>
                ))}
              </select>
            </div>
          </div>

          <span className="text-app-muted font-bold text-xs">→</span>

          {/* End Date + Time */}
          <div className="flex items-center gap-1 bg-app-bg dark:bg-app-darkBg border border-app-border dark:border-app-darkBorder px-2.5 py-1 rounded-xl shadow-subtle">
            <span className="text-[10px] font-bold uppercase tracking-wider text-app-muted mr-1">
              {isTh ? 'ถึง' : 'End'}
            </span>
            <input
              type="date"
              value={draft.endDate}
              onChange={(e) => setDraft(prev => ({ ...prev, endDate: e.target.value }))}
              className="bg-transparent border-none text-xs font-mono font-medium text-app-text dark:text-app-darkText outline-none"
            />
            <div className="flex items-center gap-0.5 border-l border-app-border dark:border-app-darkBorder pl-1.5 ml-1">
              <select
                value={draft.endHour}
                onChange={(e) => setDraft(prev => ({ ...prev, endHour: e.target.value }))}
                className="bg-transparent text-xs font-mono font-bold text-app-text dark:text-app-darkText outline-none cursor-pointer"
              >
                {hours.map(h => (
                  <option key={`eh-${h}`} value={h} className="bg-white dark:bg-slate-900">{h}</option>
                ))}
              </select>
              <span className="text-xs text-app-muted">:</span>
              <select
                value={draft.endMinute}
                onChange={(e) => setDraft(prev => ({ ...prev, endMinute: e.target.value }))}
                className="bg-transparent text-xs font-mono font-bold text-app-text dark:text-app-darkText outline-none cursor-pointer"
              >
                {minutes.map(m => (
                  <option key={`em-${m}`} value={m} className="bg-white dark:bg-slate-900">{m}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Apply Filter Button */}
          <button
            type="submit"
            className="h-9 px-4 rounded-xl bg-brand-blue text-white hover:bg-brand-darkBlue active:scale-95 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>{isTh ? 'ปรับใช้ตัวกรอง' : 'Apply Filter'}</span>
          </button>
        </div>
      </form>

      {/* QUICK PRESETS */}
      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-app-border dark:border-app-darkBorder text-[11px] text-app-muted">
        <span className="font-medium">{isTh ? 'ช่วงเวลายอดนิยม:' : 'Quick Presets:'}</span>
        {[
          { label: isTh ? 'วันนี้' : 'Today', days: 0 },
          { label: isTh ? '7 วันที่ผ่านมา' : 'Last 7 Days', days: 7 },
          { label: isTh ? '30 วันที่ผ่านมา' : 'Last 30 Days', days: 30 },
          { label: isTh ? '90 วันที่ผ่านมา' : 'Last 90 Days', days: 90 },
          { label: isTh ? '1 ปีที่ผ่านมา' : 'Last 365 Days', days: 365 },
        ].map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => handleQuickPreset(preset.days)}
            className="px-2 py-0.5 rounded-md hover:bg-app-bg dark:hover:bg-app-darkBorder text-app-secondary dark:text-app-darkSecondary hover:text-brand-blue transition-colors"
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
};
