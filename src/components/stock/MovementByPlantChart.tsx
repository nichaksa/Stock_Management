import React, { useState, useRef, useEffect } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  BarChart3,
  MoreVertical,
  Maximize2,
  Minimize2,
  Printer,
  Download,
  FileCode,
  FileSpreadsheet,
  Table as TableIcon,
  DollarSign,
  Building2,
  X,
} from 'lucide-react';
import { ReportViewMode } from './GlobalFilterBar';
import {
  PlantMovementComparison,
  downloadChartAsPng,
  downloadChartAsSvg,
  downloadPlantMovementCsv,
  printChartElement,
  getExportDateStamp,
} from '../../utils/chartExport';
import { PlantMovementDataTableModal } from './PlantMovementDataTableModal';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';

export type { PlantMovementComparison };

interface MovementByPlantChartProps {
  data: PlantMovementComparison[];
  viewMode: ReportViewMode;
  className?: string;
}

export const MovementByPlantChart: React.FC<MovementByPlantChartProps> = ({
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

  const chartTitle = isPrice
    ? (isTh ? 'Goods Issue vs Goods Receipt by FL [มูลค่า]' : 'Goods Issue vs Goods Receipt by FL [Value]')
    : (isTh ? 'Goods Issue vs Goods Receipt by FL [จำนวน]' : 'Goods Issue vs Goods Receipt by FL [Quantity]');

  const subtitle = isTh
    ? `เปรียบเทียบปริมาณงานรับเข้า (GR) และเบิกจ่าย (GI) ตาม Plant (FL) (${isPrice ? 'มูลค่าบาท' : 'จำนวนหน่วย'})`
    : `Cross-plant (FL) Goods Issue vs Goods Receipt volume comparison (${isPrice ? 'Valuation THB' : 'Quantity Units'})`;

  const handlePrint = () => {
    setIsMenuOpen(false);
    printChartElement(chartContainerRef.current, {
      title: chartTitle,
      subtitle: `${subtitle} | Locations: ${data.length}`,
    });
  };

  const handleDownloadPng = () => {
    setIsMenuOpen(false);
    downloadChartAsPng(chartContainerRef.current, {
      title: chartTitle,
      subtitle: subtitle,
      filenamePrefix: `goods_issue_vs_goods_receipt_by_fl_${isPrice ? 'value' : 'qty'}`,
    });
  };

  const handleDownloadSvg = () => {
    setIsMenuOpen(false);
    downloadChartAsSvg(chartContainerRef.current, {
      title: chartTitle,
      subtitle: subtitle,
      filenamePrefix: `goods_issue_vs_goods_receipt_by_fl_${isPrice ? 'value' : 'qty'}`,
    });
  };

  const handleDownloadCsv = () => {
    setIsMenuOpen(false);
    const dateStamp = getExportDateStamp();
    downloadPlantMovementCsv(
      data,
      isPrice,
      `goods_issue_vs_goods_receipt_by_fl_${isPrice ? 'value' : 'qty'}_${dateStamp}.csv`
    );
  };

  const handleOpenDataTable = () => {
    setIsMenuOpen(false);
    setIsDataTableOpen(true);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload as PlantMovementComparison;
      const gr = isPrice ? item.grValue : item.grQty;
      const gi = isPrice ? item.giValue : item.giQty;
      const net = gr - gi;

      return (
        <div className="p-3 bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder rounded-xl shadow-xl text-xs space-y-1.5 min-w-[190px]">
          <div className="font-bold text-app-text dark:text-app-darkText border-b border-app-border dark:border-app-darkBorder pb-1 font-mono flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-brand-blue" />
            <span>{item.plant}</span>
          </div>
          <div className="flex items-center justify-between font-mono text-gr font-semibold">
            <span>{isTh ? 'รับเข้า (GR):' : 'Goods Receipt:'}</span>
            <span>+{isPrice ? `฿${gr.toLocaleString()}` : `${gr.toLocaleString()} Units`}</span>
          </div>
          <div className="flex items-center justify-between font-mono text-gi font-semibold">
            <span>{isTh ? 'เบิกจ่าย (GI):' : 'Goods Issue:'}</span>
            <span>-{isPrice ? `฿${gi.toLocaleString()}` : `${gi.toLocaleString()} Units`}</span>
          </div>
          <div className="flex items-center justify-between font-mono font-bold pt-1 border-t border-app-border dark:border-app-darkBorder text-app-text dark:text-app-darkText">
            <span>{isTh ? 'ส่วนต่างสุทธิ (Net):' : 'Net Delta:'}</span>
            <span className={net >= 0 ? 'text-brand-blue' : 'text-amber-600'}>
              {net > 0 ? '+' : ''}{isPrice ? `฿${net.toLocaleString()}` : `${net.toLocaleString()} Units`}
            </span>
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
        {/* HEADER: TITLE + CONTEXT MENU */}
        <div className="flex items-center justify-between pb-3 border-b border-app-border dark:border-app-darkBorder">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center shrink-0">
              {isPrice ? <DollarSign className="w-4 h-4" /> : <BarChart3 className="w-4 h-4" />}
            </div>
            <div>
              <h3 className={`font-bold text-app-text dark:text-app-darkText ${isFullScreen ? 'text-lg' : 'text-xs sm:text-sm'}`}>
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

        {/* BAR CHART */}
        <div className={`w-full ${isFullScreen ? 'flex-1 min-h-[480px] my-6' : 'h-64 mt-2'}`}>
          {data.length === 0 ? (
            <div className="w-full h-full flex flex-col items-center justify-center text-app-muted text-xs">
              <BarChart3 className="w-8 h-8 mb-2 stroke-1" />
              <span>{isTh ? 'ไม่มีข้อมูลการเคลื่อนไหวตาม FL ในช่วงเวลานี้' : 'No movement records in this period.'}</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 10, right: 15, left: -15, bottom: 5 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke={isDark ? '#23304B' : '#E5EAF1'}
                />
                <XAxis
                  dataKey="plant"
                  stroke={isDark ? '#64748B' : '#98A2B3'}
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis
                  stroke={isDark ? '#64748B' : '#98A2B3'}
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(val) => {
                    if (isPrice) {
                      if (val >= 1000000) return `฿${(val / 1000000).toFixed(1)}M`;
                      if (val >= 1000) return `฿${(val / 1000).toFixed(0)}k`;
                      return `฿${val}`;
                    }
                    return val.toLocaleString();
                  }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  iconType="circle"
                  wrapperStyle={{ fontSize: 11, paddingTop: 10 }}
                />
                <Bar
                  dataKey={isPrice ? 'grValue' : 'grQty'}
                  name={isTh ? 'รับเข้า (GR)' : 'Goods Receipt (GR)'}
                  fill="#16A34A"
                  radius={[6, 6, 0, 0]}
                />
                <Bar
                  dataKey={isPrice ? 'giValue' : 'giQty'}
                  name={isTh ? 'เบิกจ่าย (GI)' : 'Goods Issue (GI)'}
                  fill="#DC2626"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* DATA TABLE MODAL */}
      <PlantMovementDataTableModal
        isOpen={isDataTableOpen}
        onClose={() => setIsDataTableOpen(false)}
        data={data}
        isPriceMode={isPrice}
      />
    </>
  );
};
