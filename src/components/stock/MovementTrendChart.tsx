import React, { useState, useRef } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  MoreVertical,
  Maximize2,
  Minimize2,
  Printer,
  Download,
  FileCode,
  FileSpreadsheet,
  Table as TableIcon,
  TrendingUp,
  Layers,
  DollarSign,
} from 'lucide-react';
import { ChartGranularity, MovementGranularPoint } from '../../utils/stockCalculation';
import {
  downloadChartAsPng,
  downloadChartAsSvg,
  downloadChartAsCsv,
  printChartElement,
} from '../../utils/chartExport';
import { ChartDataTableModal } from './ChartDataTableModal';
import { ReportViewMode } from './GlobalFilterBar';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';

interface MovementTrendChartProps {
  data: MovementGranularPoint[];
  viewMode: ReportViewMode;
  granularity: ChartGranularity;
  onGranularityChange: (g: ChartGranularity) => void;
  className?: string;
}

export const MovementTrendChart: React.FC<MovementTrendChartProps> = ({
  data,
  viewMode,
  granularity,
  onGranularityChange,
  className = '',
}) => {
  const { t, language } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const isTh = language === 'th';
  const isPrice = viewMode === 'PRICE';

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isDataTableOpen, setIsDataTableOpen] = useState(false);

  // Toggle fullscreen
  const toggleFullScreen = () => {
    if (!chartContainerRef.current) return;

    if (!document.fullscreenElement) {
      chartContainerRef.current.requestFullscreen?.().catch(() => {});
      setIsFullScreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullScreen(false);
    }
    setIsMenuOpen(false);
  };

  const handlePrint = () => {
    setIsMenuOpen(false);
    printChartElement(
      chartContainerRef.current,
      `Goods Issue vs Goods Receipt [${isPrice ? 'Value' : 'Quantity'}]`
    );
  };

  const handleDownloadPng = () => {
    setIsMenuOpen(false);
    downloadChartAsPng(chartContainerRef.current, `gr_vs_gi_${granularity.toLowerCase()}_trend.png`);
  };

  const handleDownloadSvg = () => {
    setIsMenuOpen(false);
    downloadChartAsSvg(chartContainerRef.current, `gr_vs_gi_${granularity.toLowerCase()}_trend.svg`);
  };

  const handleDownloadCsv = () => {
    setIsMenuOpen(false);
    downloadChartAsCsv(data, isPrice, `gr_vs_gi_${granularity.toLowerCase()}_trend.csv`);
  };

  const handleOpenDataTable = () => {
    setIsMenuOpen(false);
    setIsDataTableOpen(true);
  };

  const chartTitle = isPrice
    ? (isTh ? 'การเบิกจ่าย vs การรับเข้า [มูลค่า / บาท]' : 'Goods Issue vs Goods Receipt [Value]')
    : (isTh ? 'การเบิกจ่าย vs การรับเข้า [จำนวนหน่วย]' : 'Goods Issue vs Goods Receipt [Quantity]');

  // Custom Recharts Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const point = payload[0].payload as MovementGranularPoint;
      const gr = isPrice ? point.grValue : point.grQty;
      const gi = isPrice ? point.giValue : point.giQty;
      const net = isPrice ? point.netValue : point.netQty;

      return (
        <div className="p-3 bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder rounded-xl shadow-xl text-xs space-y-1.5 min-w-[190px]">
          <div className="font-bold font-mono text-app-text dark:text-app-darkText border-b border-app-border dark:border-app-darkBorder pb-1">
            {point.periodLabel}
          </div>
          <div className="flex items-center justify-between text-gr font-mono font-semibold">
            <span>{isTh ? 'รับเข้า (GR):' : 'Goods Receipt:'}</span>
            <span>+{isPrice ? `฿${gr.toLocaleString()}` : `${gr.toLocaleString()} Units`}</span>
          </div>
          <div className="flex items-center justify-between text-gi font-mono font-semibold">
            <span>{isTh ? 'เบิกจ่าย (GI):' : 'Goods Issue:'}</span>
            <span>-{isPrice ? `฿${gi.toLocaleString()}` : `${gi.toLocaleString()} Units`}</span>
          </div>
          <div className="flex items-center justify-between font-mono font-bold pt-1 border-t border-app-border dark:border-app-darkBorder text-app-text dark:text-app-darkText">
            <span>{isTh ? 'ยอดสุทธิ (Net):' : 'Net Delta:'}</span>
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
    <div
      ref={chartContainerRef}
      className={`p-4 sm:p-5 rounded-2xl bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder shadow-subtle flex flex-col justify-between ${className}`}
    >
      {/* HEADER: TITLE + GRANULARITY SELECTOR + CONTEXT MENU */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-app-border dark:border-app-darkBorder">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-brand-softBlue dark:bg-blue-950/60 text-brand-blue flex items-center justify-center shrink-0">
            {isPrice ? <DollarSign className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-app-text dark:text-app-darkText">
              {chartTitle}
            </h3>
            <p className="text-[10px] sm:text-[11px] text-app-muted">
              {isTh
                ? `เปรียบเทียบการไหลเวียนของสินค้าคงคลังแบบ ${granularity}`
                : `Periodic inflow vs outflow volume distribution (${granularity})`}
            </p>
          </div>
        </div>

        {/* RIGHT CONTROLS: GRANULARITY + CONTEXT MENU */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* Granularity Switcher */}
          <div className="flex items-center p-0.5 bg-app-bg dark:bg-app-darkBg border border-app-border dark:border-app-darkBorder rounded-lg">
            {(['Daily', 'Monthly', 'Yearly'] as ChartGranularity[]).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => onGranularityChange(g)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                  granularity === g
                    ? 'bg-white dark:bg-app-darkSurface text-brand-blue shadow-xs'
                    : 'text-app-secondary dark:text-app-darkSecondary hover:text-app-text'
                }`}
              >
                {g === 'Daily' ? (isTh ? 'รายวัน' : 'Daily') : g === 'Monthly' ? (isTh ? 'รายเดือน' : 'Monthly') : (isTh ? 'รายปี' : 'Yearly')}
              </button>
            ))}
          </div>

          {/* Context Menu Dropdown */}
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
                      <span>{isFullScreen ? 'Exit Full Screen' : 'Full Screen'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handlePrint}
                      className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-app-bg dark:hover:bg-app-darkBorder transition-colors text-left"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print Chart</span>
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
                      <span>View Data Table</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* CHART CANVAS */}
      <div className="h-72 w-full mt-4">
        {data.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-app-muted text-xs">
            <TrendingUp className="w-8 h-8 mb-2 stroke-1" />
            <span>{isTh ? 'ไม่มีข้อมูลการเคลื่อนไหวในช่วงเวลาที่เลือก' : 'No movement records in this period.'}</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={data}
              margin={{ top: 10, right: 15, left: -10, bottom: 5 }}
            >
              <defs>
                <linearGradient id="grGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#16A34A" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#16A34A" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="giGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#DC2626" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#DC2626" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke={isDark ? '#23304B' : '#E5EAF1'}
              />
              <XAxis
                dataKey="periodLabel"
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
                wrapperStyle={{ fontSize: 11, paddingTop: 10 }}
                iconType="circle"
              />
              <Area
                type="monotone"
                dataKey={isPrice ? 'grValue' : 'grQty'}
                name={isTh ? 'รับเข้า (Goods Receipt)' : 'Goods Receipt (GR)'}
                stroke="#16A34A"
                strokeWidth={2.5}
                fill="url(#grGradient)"
                dot={{ r: 3, fill: '#16A34A' }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey={isPrice ? 'giValue' : 'giQty'}
                name={isTh ? 'เบิกจ่าย (Goods Issue)' : 'Goods Issue (GI)'}
                stroke="#DC2626"
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#DC2626' }}
                activeDot={{ r: 6 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* DATA TABLE MODAL */}
      <ChartDataTableModal
        isOpen={isDataTableOpen}
        onClose={() => setIsDataTableOpen(false)}
        data={data}
        isPriceMode={isPrice}
        granularity={granularity}
      />
    </div>
  );
};
