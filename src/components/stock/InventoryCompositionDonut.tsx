import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';
import { PieChart as PieChartIcon } from 'lucide-react';
import { ReportViewMode } from './GlobalFilterBar';
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

  const chartData = data.map((item, idx) => ({
    ...item,
    chartValue: isPrice ? item.value : item.quantity,
    color: item.color || TYPE_COLORS[idx % TYPE_COLORS.length],
  })).filter(d => d.chartValue > 0);

  const totalChartVal = chartData.reduce((acc, curr) => acc + curr.chartValue, 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload as TypeCompositionItem & { chartValue: number };
      const pct = totalChartVal > 0 ? ((item.chartValue / totalChartVal) * 100).toFixed(1) : 0;

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
    <div className={`p-4 sm:p-5 rounded-2xl bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder shadow-subtle flex flex-col justify-between ${className}`}>
      {/* HEADER */}
      <div className="flex items-center justify-between pb-3 border-b border-app-border dark:border-app-darkBorder">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center shrink-0">
            <PieChartIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-app-text dark:text-app-darkText uppercase tracking-wider">
              {isTh ? 'สัดส่วนตามประเภทวัสดุ' : 'Inventory Composition'}
            </h3>
            <p className="text-[10px] sm:text-[11px] text-app-muted">
              {isTh
                ? `จำแนกตามประเภทวัสดุ (${isPrice ? 'ตามมูลค่าเงิน' : 'ตามจำนวนชิ้น'})`
                : `Grouped by Material Type (${isPrice ? 'Valuation ฿' : 'Quantity Units'})`}
            </p>
          </div>
        </div>
      </div>

      {/* DONUT CHART */}
      <div className="h-64 w-full mt-2">
        {chartData.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-app-muted text-xs">
            <span>No composition records available</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
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
  );
};
