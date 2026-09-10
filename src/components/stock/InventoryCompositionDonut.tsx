import React, { useState, useRef, useEffect } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';
import {
  PieChart as PieChartIcon,
  MoreVertical,
  Maximize2,
  Minimize2,
  Printer,
  Download,
  FileCode,
  FileSpreadsheet,
  Table as TableIcon,
  X,
} from 'lucide-react';
import { ReportViewMode } from './GlobalFilterBar';
import {
  downloadChartAsPng,
  downloadChartAsSvg,
  downloadCompositionCsv,
  printChartElement,
  getExportDateStamp,
} from '../../utils/chartExport';
import { CompositionDataTableModal } from './CompositionDataTableModal';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';

export interface TypeCompositionItem {
  name: string;
  itemCount: number;
  quantity: number;
  value: number;
  color: string;
}

interface InventoryCompositionDonutProps {
  data: TypeCompositionItem[];
  viewMode: ReportViewMode;
  className?: string;
}

const TYPE_COLORS = [
  '#2563EB', // Brand Blue
  '#16A34A', // Green
  '#9333EA', // Purple
  '#EA580C', // Orange
  '#0284C7', // Sky
  '#D97706', // Amber
  '#0D9488', // Teal
  '#E11D48', // Rose
];

export const InventoryCompositionDonut: React.FC<InventoryCompositionDonutProps> = ({
  data,
  viewMode,
  className = '',
}) => {
  const { language } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const isTh = language === 'th';
  const isPrice = viewMode === 'PRICE';

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isDataTableOpen, setIsDataTableOpen] = useState(false);

  // Keyboard escape handler for fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullScreen) {
        setIsFullScreen(false);
      }
    };
    if (isFullScreen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isFullScreen]);

  const toggleFullScreen = () => {
    setIsFullScreen(prev => !prev);
    setIsMenuOpen(false);
  };

  const chartData = data.map((item, idx) => ({
    ...item,
    chartValue: isPrice ? item.value : item.quantity,
    color: item.color || TYPE_COLORS[idx % TYPE_COLORS.length],
  })).filter(d => d.chartValue > 0);

  const totalChartVal = chartData.reduce((acc, curr) => acc + curr.chartValue, 0);

  const chartTitle = isTh
    ? (isPrice ? 'สัดส่วนสินค้าคงคลังตามประเภทวัสดุ [มูลค่า]' : 'สัดส่วนสินค้าคงคลังตามประเภทวัสดุ [จำนวน]')
    : (isPrice ? 'Inventory Composition by Material Type [Value]' : 'Inventory Composition by Material Type [Quantity]');

  const subtitle = isTh
    ? `จำแนกตามประเภทวัสดุ (${isPrice ? 'ตามมูลค่าเงิน THB' : 'ตามจำนวนชิ้น Units'})`
    : `Grouped by Material Type (${isPrice ? 'Valuation ฿' : 'Quantity Units'})`;

  const handlePrint = () => {
    setIsMenuOpen(false);
    printChartElement(chartContainerRef.current, {
      title: chartTitle,
      subtitle: `${subtitle} | Categories: ${chartData.length}`,
    });
  };

  const handleDownloadPng = () => {
    setIsMenuOpen(false);
    downloadChartAsPng(chartContainerRef.current, {
      title: chartTitle,
      subtitle: subtitle,
      filenamePrefix: `inventory_composition_by_type_${isPrice ? 'value' : 'qty'}`,
    });
  };

  const handleDownloadSvg = () => {
    setIsMenuOpen(false);
    downloadChartAsSvg(chartContainerRef.current, {
      title: chartTitle,
      subtitle: subtitle,
      filenamePrefix: `inventory_composition_by_type_${isPrice ? 'value' : 'qty'}`,
    });
  };

  const handleDownloadCsv = () => {
    setIsMenuOpen(false);
    const dateStamp = getExportDateStamp();
    downloadCompositionCsv(
      data,
      isPrice,
      `inventory_composition_by_type_${isPrice ? 'value' : 'qty'}_${dateStamp}.csv`
    );
  };

  const handleOpenDataTable = () => {
    setIsMenuOpen(false);
    setIsDataTableOpen(true);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload as TypeCompositionItem & { chartValue: number };
      const pct = totalChartVal > 0 ? ((item.chartValue / totalChartVal) * 100).toFixed(1) : '0';

      return (
        <div className="p-3 bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder rounded-xl shadow-xl text-xs space-y-1.5 min-w-[170px]">
          <div className="font-bold text-app-text dark:text-app-darkText border-b border-app-border dark:border-app-darkBorder pb-1">
            {item.name}
          </div>
          <div className="flex items-center justify-between font-mono">
            <span className="text-app-muted">Physical Qty:</span>
            <span className="font-bold text-app-text dark:text-app-darkText">{item.quantity.toLocaleString()} Units</span>
          </div>
          <div className="flex items-center justify-between font-mono">
            <span className="text-app-muted">Valuation:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">฿{item.value.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between font-mono pt-1 border-t border-app-border dark:border-app-darkBorder text-brand-blue font-bold">
            <span>Share:</span>
            <span>{pct}%</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <>
      <div
        ref={chartContainerRef}
        className={
          isFullScreen
            ? 'fixed inset-0 z-50 bg-white dark:bg-app-darkSurface p-6 sm:p-8 flex flex-col justify-between overflow-y-auto animate-fade-in'
            : `p-4 sm:p-5 rounded-2xl bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder shadow-subtle flex flex-col justify-between ${className}`
        }
      >
        {/* HEADER */}
        <div className="flex items-center justify-between pb-3 border-b border-app-border dark:border-app-darkBorder">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center shrink-0">
              <PieChartIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className={`font-bold text-app-text dark:text-app-darkText uppercase tracking-wider ${isFullScreen ? 'text-lg' : 'text-xs sm:text-sm'}`}>
                {chartTitle}
              </h3>
              <p className="text-[10px] sm:text-[11px] text-app-muted">
                {subtitle}
              </p>
            </div>
          </div>

          {/* Action Menu & Controls */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="w-8 h-8 rounded-lg border border-app-border dark:border-app-darkBorder bg-white dark:bg-app-darkBg text-app-secondary hover:text-app-text dark:hover:text-app-darkText flex items-center justify-center shadow-xs transition-colors"
                title="Chart Actions"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {isMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setIsMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-1.5 w-48 bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder rounded-xl shadow-xl py-1.5 z-30 text-xs font-medium text-app-text dark:text-app-darkText divide-y divide-app-border dark:divide-app-darkBorder">
                    <div className="py-1">
                      <button
                        type="button"
                        onClick={toggleFullScreen}
                        className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-app-bg dark:hover:bg-app-darkBorder transition-colors text-left"
                      >
                        {isFullScreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                        <span>{isFullScreen ? (isTh ? 'ออกจากเต็มจอ' : 'Exit Full Screen') : (isTh ? 'แสดงแบบเต็มจอ' : 'View Full Screen')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handlePrint}
                        className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-app-bg dark:hover:bg-app-darkBorder transition-colors text-left"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>{isTh ? 'พิมพ์กราฟ (Print)' : 'Print Chart'}</span>
                      </button>
                    </div>

                    <div className="py-1">
                      <button
                        type="button"
                        onClick={handleDownloadPng}
                        className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-app-bg dark:hover:bg-app-darkBorder transition-colors text-left"
                      >
                        <Download className="w-3.5 h-3.5 text-brand-blue" />
                        <span>Download PNG</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleDownloadSvg}
                        className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-app-bg dark:hover:bg-app-darkBorder transition-colors text-left"
                      >
                        <FileCode className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Download SVG</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleDownloadCsv}
                        className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-app-bg dark:hover:bg-app-darkBorder transition-colors text-left"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Download CSV</span>
                      </button>
                    </div>

                    <div className="py-1">
                      <button
                        type="button"
                        onClick={handleOpenDataTable}
                        className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-app-bg dark:hover:bg-app-darkBorder transition-colors text-left text-brand-blue font-semibold"
                      >
                        <TableIcon className="w-3.5 h-3.5" />
                        <span>{isTh ? 'ดูตารางข้อมูล' : 'View Data Table'}</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {isFullScreen && (
              <button
                type="button"
                onClick={() => setIsFullScreen(false)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-app-border dark:border-app-darkBorder bg-app-bg dark:bg-app-darkBg text-xs font-semibold text-app-secondary dark:text-app-darkSecondary hover:text-app-text transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                <span>{isTh ? 'ปิดเต็มจอ' : 'Close'}</span>
              </button>
            )}
          </div>
        </div>

        {/* DONUT CHART */}
        <div className={`w-full ${isFullScreen ? 'flex-1 min-h-[480px] my-6' : 'h-64 mt-2'}`}>
          {chartData.length === 0 ? (
            <div className="w-full h-full flex flex-col items-center justify-center text-app-muted text-xs">
              <span>{isTh ? 'ไม่มีข้อมูลสัดส่วนสินค้าคงคลัง' : 'No composition records available'}</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={isFullScreen ? 90 : 55}
                  outerRadius={isFullScreen ? 140 : 85}
                  paddingAngle={3}
                  dataKey="chartValue"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-comp-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  iconType="circle"
                  wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
                  formatter={(val) => <span className="text-xs text-app-secondary dark:text-app-darkSecondary">{val}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* DATA TABLE MODAL */}
      <CompositionDataTableModal
        isOpen={isDataTableOpen}
        onClose={() => setIsDataTableOpen(false)}
        data={data}
        isPriceMode={isPrice}
      />
    </>
  );
};
