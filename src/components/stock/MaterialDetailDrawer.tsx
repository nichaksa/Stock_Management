import React, { useState, useRef, useEffect } from 'react';
import { Material, StockTransaction, DateRange } from '../../types/stock';
import { Drawer } from '../common/Drawer';
import { DateRangePicker } from '../common/DateRangePicker';
import { StockMovementChart } from './StockMovementChart';
import { StatusBadge } from '../common/StatusBadge';
import { QrCodeModal } from './QrCodeModal';
import { useStock } from '../../context/StockContext';
import { useLanguage } from '../../context/LanguageContext';
import { getPresetDateRange, formatDateTime } from '../../utils/dateRange';
import { getMovementHistoryInRange } from '../../utils/stockCalculation';
import {
  QrCode,
  Calendar,
  Layers,
  Info,
  History,
  TrendingUp,
  Package,
  Clock,
  MapPin,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  DollarSign,
  ShieldAlert,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface MaterialDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  material: Material | null;
  initialTab?: 'info' | 'movement';
}

export const MaterialDetailDrawer: React.FC<MaterialDetailDrawerProps> = ({
  isOpen,
  onClose,
  material,
  initialTab = 'info',
}) => {
  const { transactions, getItemStock, getItemStatus } = useStock();
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState<'info' | 'movement'>('info');
  const [dateRange, setDateRange] = useState<DateRange>(() => getPresetDateRange('this_month'));
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [highlightedRowId, setHighlightedRowId] = useState<string | null>(null);

  const historyTableRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});

  useEffect(() => {
    setActiveTab(initialTab);
    setDateRange(getPresetDateRange('this_month'));
    setExpandedRowId(null);
    setHighlightedRowId(null);
  }, [initialTab, material, isOpen]);

  if (!material) return null;

  const currentStock = getItemStock(material.id);
  const currentStatus = getItemStatus(material.id);

  // Transactions within selected date range
  const rangeTransactions = getMovementHistoryInRange(
    material.id,
    transactions,
    dateRange.startDate,
    dateRange.endDate
  );

  // All transactions ever for this item
  const allItemTransactions = transactions.filter(t => t.materialId === material.id);

  const handleGraphPointClick = (tx?: StockTransaction) => {
    if (!tx) return;
    setHighlightedRowId(tx.id);
    setExpandedRowId(tx.id);

    // Smooth scroll to history row
    const targetRow = rowRefs.current[tx.id];
    if (targetRow) {
      targetRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Clear highlight after 3.5s
    setTimeout(() => {
      setHighlightedRowId(prev => (prev === tx.id ? null : prev));
    }, 3500);
  };

  return (
    <>
      <Drawer
        isOpen={isOpen}
        onClose={onClose}
        title="Material Detail"
        subtitle={`${material.materialCode} · ${material.plant}`}
        widthClass="max-w-4xl"
      >
        <div className="space-y-5">
          {/* TOP HEADER CARD */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder shadow-subtle flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-16 h-16 rounded-xl border border-app-border dark:border-app-darkBorder bg-app-bg dark:bg-app-darkBg overflow-hidden shrink-0 flex items-center justify-center shadow-inner">
                {material.image ? (
                  <img src={material.image} alt={material.materialCode} className="w-full h-full object-cover" />
                ) : (
                  <Package className="w-8 h-8 text-app-muted" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold font-mono text-brand-blue bg-brand-softBlue dark:bg-blue-950/60 px-2.5 py-0.5 rounded-md">
                    {material.materialCode}
                  </span>
                  <StatusBadge status={currentStatus} size="sm" />
                </div>
                <h2 className="text-sm sm:text-base font-bold text-app-text dark:text-app-darkText truncate mt-1">
                  {material.description}
                </h2>
                <div className="flex items-center gap-3 text-xs text-app-secondary dark:text-app-darkSecondary mt-1">
                  <span>Plant: <strong>{material.plant}</strong></span>
                  <span>•</span>
                  <span>Type: <strong>{material.materialType}</strong></span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-app-muted" />
                    {material.storageLocation || '-'} / {material.storageBin || '-'}
                  </span>
                </div>
              </div>
            </div>

            {/* Header Right: Stock + QR Button */}
            <div className="flex items-center gap-4 self-end sm:self-center shrink-0">
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-app-muted block">
                  Current Stock
                </span>
                <span className="text-2xl font-mono font-bold text-app-text dark:text-app-darkText">
                  {currentStock}{' '}
                  <span className="text-xs font-normal text-app-muted">{material.unit}</span>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsQrModalOpen(true)}
                className="p-2.5 rounded-xl border border-app-border dark:border-app-darkBorder bg-app-bg/60 dark:bg-app-darkBg/60 hover:bg-brand-softBlue dark:hover:bg-blue-950/40 text-app-secondary hover:text-brand-blue transition-colors shadow-subtle"
                title="View QR Code"
              >
                <QrCode className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* TABS SELECTOR */}
          <div className="flex border-b border-app-border dark:border-app-darkBorder gap-4 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('info')}
              className={`pb-2.5 px-1 flex items-center gap-2 border-b-2 transition-all ${
                activeTab === 'info'
                  ? 'border-brand-blue text-brand-blue'
                  : 'border-transparent text-app-secondary dark:text-app-darkSecondary hover:text-app-text'
              }`}
            >
              <Info className="w-4 h-4" />
              <span>{t('item_info_tab')}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('movement')}
              className={`pb-2.5 px-1 flex items-center gap-2 border-b-2 transition-all ${
                activeTab === 'movement'
                  ? 'border-brand-blue text-brand-blue'
                  : 'border-transparent text-app-secondary dark:text-app-darkSecondary hover:text-app-text'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>{t('stock_movement_tab')}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-brand-softBlue dark:bg-blue-950/60 text-brand-blue">
                {allItemTransactions.length}
              </span>
            </button>
          </div>

          {/* TAB 1: ITEM INFORMATION */}
          {activeTab === 'info' && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* GENERAL */}
                <div className="p-4 rounded-2xl bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder shadow-subtle space-y-2.5">
                  <h4 className="text-xs font-bold text-app-text dark:text-app-darkText uppercase tracking-wider pb-1.5 border-b border-app-border dark:border-app-darkBorder">
                    General Master Data
                  </h4>
                  <div className="grid grid-cols-2 gap-2.5 text-xs">
                    <div>
                      <span className="text-app-muted block text-[11px]">Plant</span>
                      <span className="font-semibold text-app-text dark:text-app-darkText">{material.plant}</span>
                    </div>
                    <div>
                      <span className="text-app-muted block text-[11px]">Material Code</span>
                      <span className="font-mono font-bold text-brand-blue">{material.materialCode}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-app-muted block text-[11px]">Description</span>
                      <span className="font-medium text-app-text dark:text-app-darkText">{material.description}</span>
                    </div>
                    <div>
                      <span className="text-app-muted block text-[11px]">Material Type</span>
                      <span className="font-medium text-app-text dark:text-app-darkText">{material.materialType}</span>
                    </div>
                    <div>
                      <span className="text-app-muted block text-[11px]">Unit of Measure</span>
                      <span className="font-bold font-mono text-app-text dark:text-app-darkText">{material.unit}</span>
                    </div>
                  </div>
                </div>

                {/* STOCK CONTROL */}
                <div className="p-4 rounded-2xl bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder shadow-subtle space-y-2.5">
                  <h4 className="text-xs font-bold text-app-text dark:text-app-darkText uppercase tracking-wider pb-1.5 border-b border-app-border dark:border-app-darkBorder">
                    Stock Control Rules
                  </h4>
                  <div className="grid grid-cols-2 gap-2.5 text-xs">
                    <div>
                      <span className="text-app-muted block text-[11px]">Min Stock</span>
                      <span className="font-mono font-bold text-amber-600">{material.min} {material.unit}</span>
                    </div>
                    <div>
                      <span className="text-app-muted block text-[11px]">ROP (Reorder Point)</span>
                      <span className="font-mono font-bold text-warn">{material.rop} {material.unit}</span>
                    </div>
                    <div>
                      <span className="text-app-muted block text-[11px]">Max Stock</span>
                      <span className="font-mono font-bold text-purple-600">{material.max} {material.unit}</span>
                    </div>
                    <div>
                      <span className="text-app-muted block text-[11px]">Lead Time</span>
                      <span className="font-mono text-app-text dark:text-app-darkText">{material.leadTime || 0} Days</span>
                    </div>
                  </div>
                </div>

                {/* COST & VALUATION */}
                <div className="p-4 rounded-2xl bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder shadow-subtle space-y-2.5">
                  <h4 className="text-xs font-bold text-app-text dark:text-app-darkText uppercase tracking-wider pb-1.5 border-b border-app-border dark:border-app-darkBorder">
                    Cost & Valuation
                  </h4>
                  <div className="grid grid-cols-2 gap-2.5 text-xs">
                    <div>
                      <span className="text-app-muted block text-[11px]">Standard Unit Price</span>
                      <span className="font-mono font-bold text-app-text dark:text-app-darkText">
                        ฿{Number(material.standardPrice || 0).toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-app-muted block text-[11px]">Total Stock Value</span>
                      <span className="font-mono font-bold text-brand-blue">
                        ฿{(currentStock * (material.standardPrice || 0)).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* LOCATION & SYSTEM */}
                <div className="p-4 rounded-2xl bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder shadow-subtle space-y-2.5">
                  <h4 className="text-xs font-bold text-app-text dark:text-app-darkText uppercase tracking-wider pb-1.5 border-b border-app-border dark:border-app-darkBorder">
                    Location & Audit
                  </h4>
                  <div className="grid grid-cols-2 gap-2.5 text-xs">
                    <div>
                      <span className="text-app-muted block text-[11px]">Storage Location</span>
                      <span className="font-mono font-semibold text-app-text dark:text-app-darkText">{material.storageLocation || '-'}</span>
                    </div>
                    <div>
                      <span className="text-app-muted block text-[11px]">Storage Bin</span>
                      <span className="font-mono font-semibold text-app-text dark:text-app-darkText">{material.storageBin || '-'}</span>
                    </div>
                    <div>
                      <span className="text-app-muted block text-[11px]">Created At</span>
                      <span className="font-mono text-app-muted text-[11px]">{formatDateTime(material.createdAt)}</span>
                    </div>
                    <div>
                      <span className="text-app-muted block text-[11px]">Last Updated</span>
                      <span className="font-mono text-app-muted text-[11px]">{formatDateTime(material.updatedAt || material.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* QR Code Preview Card */}
              <div className="p-4 rounded-2xl bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder shadow-subtle flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-white rounded-xl border border-app-border shadow-inner">
                    <QRCodeSVG value={material.qrValue} size={64} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-app-text dark:text-app-darkText">
                      Item QR Identifier
                    </h4>
                    <p className="text-[11px] font-mono text-app-muted dark:text-app-darkMuted mt-0.5">
                      {material.qrValue}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsQrModalOpen(true)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-brand-blue bg-brand-softBlue dark:bg-blue-950/60 hover:bg-brand-blue hover:text-white rounded-lg transition-colors shadow-sm"
                >
                  View / Print QR
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: STOCK MOVEMENT & GRAPH */}
          {activeTab === 'movement' && (
            <div className="space-y-5 animate-fade-in">
              {/* Date Filter Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3.5 rounded-2xl bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder shadow-subtle">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-brand-blue" />
                  <span className="text-xs font-bold text-app-text dark:text-app-darkText uppercase tracking-wider">
                    {t('date_range')}:
                  </span>
                </div>
                <DateRangePicker value={dateRange} onChange={setDateRange} />
              </div>

              {/* RECHARTS STOCK BALANCE GRAPH */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder shadow-subtle space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-app-border dark:border-app-darkBorder">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-brand-blue" />
                    <h3 className="text-xs font-bold text-app-text dark:text-app-darkText uppercase tracking-wider">
                      {t('stock_balance_over_time')}
                    </h3>
                  </div>
                  <span className="text-[11px] text-app-muted dark:text-app-darkMuted">
                    Click any point to view & highlight audit row
                  </span>
                </div>

                <StockMovementChart
                  materialId={material.id}
                  transactions={transactions}
                  startDate={dateRange.startDate}
                  endDate={dateRange.endDate}
                  unit={material.unit}
                  onPointClick={handleGraphPointClick}
                />
              </div>

              {/* MOVEMENT HISTORY TABLE */}
              <div className="space-y-2.5" ref={historyTableRef}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-brand-blue" />
                    <h3 className="text-xs font-bold text-app-text dark:text-app-darkText uppercase tracking-wider">
                      {t('movement_history')}
                    </h3>
                  </div>
                  <span className="text-[11px] text-app-muted font-mono">
                    {rangeTransactions.length} movement(s) in period
                  </span>
                </div>

                {allItemTransactions.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl border border-dashed border-app-border dark:border-app-darkBorder bg-app-bg/40">
                    <History className="w-8 h-8 text-app-muted mx-auto mb-2" />
                    <p className="text-xs font-bold text-app-text dark:text-app-darkText">
                      {t('no_history')}
                    </p>
                    <p className="text-[11px] text-app-secondary dark:text-app-darkSecondary mt-0.5">
                      {t('no_history_desc')}
                    </p>
                  </div>
                ) : rangeTransactions.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl border border-dashed border-app-border dark:border-app-darkBorder bg-app-bg/40">
                    <History className="w-8 h-8 text-app-muted mx-auto mb-2" />
                    <p className="text-xs font-bold text-app-text dark:text-app-darkText">
                      {t('no_history_period')}
                    </p>
                    <p className="text-[11px] text-app-secondary dark:text-app-darkSecondary mt-0.5">
                      The stock balance remained constant during the selected dates.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-hidden border border-app-border dark:border-app-darkBorder rounded-2xl bg-white dark:bg-app-darkSurface shadow-subtle">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="text-[10px] uppercase font-semibold text-app-secondary dark:text-app-darkSecondary bg-app-bg dark:bg-app-darkBg border-b border-app-border dark:border-app-darkBorder">
                        <tr>
                          <th className="py-2.5 px-3">Date / Time</th>
                          <th className="py-2.5 px-3">Type</th>
                          <th className="py-2.5 px-3 text-right">Movement</th>
                          <th className="py-2.5 px-3">User</th>
                          <th className="py-2.5 px-3">Batch</th>
                          <th className="py-2.5 px-3">Process</th>
                          <th className="py-2.5 px-3 text-center">Detail</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-app-border dark:divide-app-darkBorder">
                        {rangeTransactions.map(tx => {
                          const isExpanded = expandedRowId === tx.id;
                          const isHighlighted = highlightedRowId === tx.id;
                          const isPositive = tx.quantity > 0;

                          return (
                            <React.Fragment key={tx.id}>
                              <tr
                                ref={el => {
                                  rowRefs.current[tx.id] = el;
                                }}
                                onClick={() => setExpandedRowId(isExpanded ? null : tx.id)}
                                className={`cursor-pointer transition-colors ${
                                  isHighlighted
                                    ? 'bg-brand-softBlue dark:bg-blue-950/60 ring-1 ring-brand-blue'
                                    : isExpanded
                                    ? 'bg-app-bg/80 dark:bg-app-darkBorder/40'
                                    : 'hover:bg-app-bg/50 dark:hover:bg-app-darkBorder/30'
                                }`}
                              >
                                <td className="py-2.5 px-3 font-mono text-[11px] text-app-text dark:text-app-darkText">
                                  {formatDateTime(tx.createdAt)}
                                </td>
                                <td className="py-2.5 px-3">
                                  <StatusBadge status={tx.transactionType} size="sm" showDot={false} />
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold">
                                  <span className={isPositive ? 'text-gr' : 'text-gi'}>
                                    {isPositive ? `+${tx.quantity}` : `${tx.quantity}`} {material.unit}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 font-mono text-app-secondary dark:text-app-darkSecondary">
                                  {tx.createdBy}
                                </td>
                                <td className="py-2.5 px-3 font-mono text-app-muted">
                                  {tx.batchNo || '-'}
                                </td>
                                <td className="py-2.5 px-3 text-app-text dark:text-app-darkText font-medium truncate max-w-[140px]">
                                  {tx.process || '-'}
                                </td>
                                <td className="py-2.5 px-3 text-center text-app-muted">
                                  {isExpanded ? (
                                    <ChevronUp className="w-4 h-4 mx-auto text-brand-blue" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4 mx-auto" />
                                  )}
                                </td>
                              </tr>

                              {/* Expandable Full Audit Row */}
                              {isExpanded && (
                                <tr className="bg-app-bg/60 dark:bg-app-darkBg/60">
                                  <td colSpan={7} className="p-3.5">
                                    <div className="p-3 rounded-xl bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[11px]">
                                      <div>
                                        <span className="text-app-muted block">Document No.</span>
                                        <span className="font-mono font-bold text-brand-blue">{tx.documentNo}</span>
                                      </div>
                                      <div>
                                        <span className="text-app-muted block">Plant / SLoc / Bin</span>
                                        <span className="font-mono text-app-text dark:text-app-darkText">
                                          {tx.plant} · {tx.storageLocation || '-'} · {tx.storageBin || '-'}
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-app-muted block">Balance Before → After</span>
                                        <span className="font-mono font-bold text-app-text dark:text-app-darkText">
                                          {tx.balanceBefore} → {tx.balanceAfter} {material.unit}
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-app-muted block">Ref No / Picklist</span>
                                        <span className="font-mono text-app-text dark:text-app-darkText">
                                          {tx.referenceNo || '-'} {tx.picklist ? `/ ${tx.picklist}` : ''}
                                        </span>
                                      </div>
                                      {tx.serialNo && (
                                        <div>
                                          <span className="text-app-muted block">Serial No (S/N)</span>
                                          <span className="font-mono text-app-text dark:text-app-darkText">{tx.serialNo}</span>
                                        </div>
                                      )}
                                      {tx.lotNo && (
                                        <div>
                                          <span className="text-app-muted block">Lot No.</span>
                                          <span className="font-mono text-app-text dark:text-app-darkText">{tx.lotNo}</span>
                                        </div>
                                      )}
                                      {tx.comment && (
                                        <div className="col-span-2 sm:col-span-4 mt-1 pt-1.5 border-t border-app-border dark:border-app-darkBorder">
                                          <span className="text-app-muted block">Audit Comment:</span>
                                          <p className="italic text-app-secondary dark:text-app-darkSecondary">
                                            {tx.comment}
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </Drawer>

      {/* QR Code Modal Shortcut */}
      <QrCodeModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        materialCode={material.materialCode}
        description={material.description}
        plant={material.plant}
      />
    </>
  );
};
