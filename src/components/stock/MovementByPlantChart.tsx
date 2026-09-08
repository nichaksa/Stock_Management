import React from 'react';
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
import { BarChart3 } from 'lucide-react';
import { ReportViewMode } from './GlobalFilterBar';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';

export interface PlantMovementComparison {
  plant: string;
  grQty: number;
  giQty: number;
  grValue: number;
  giValue: number;
}

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

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload as PlantMovementComparison;
      const gr = isPrice ? item.grValue : item.grQty;
      const gi = isPrice ? item.giValue : item.giQty;

      return (
        <div className="p-3 bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder rounded-xl shadow-xl text-xs space-y-1.5 min-w-[170px]">
          <div className="font-bold text-app-text dark:text-app-darkText border-b border-app-border dark:border-app-darkBorder pb-1 font-mono">
            {item.plant}
          </div>
          <div className="flex items-center justify-between font-mono text-gr font-semibold">
            <span>Goods Receipt:</span>
            <span>+{isPrice ? `฿${gr.toLocaleString()}` : `${gr.toLocaleString()} EA`}</span>
          </div>
          <div className="flex items-center justify-between font-mono text-gi font-semibold">
            <span>Goods Issue:</span>
            <span>-{isPrice ? `฿${gi.toLocaleString()}` : `${gi.toLocaleString()} EA`}</span>
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
          <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center shrink-0">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-app-text dark:text-app-darkText uppercase tracking-wider">
              {isTh ? 'การเบิกจ่าย vs รับเข้าแยกตามโรงงาน' : 'GR vs GI by Plant'}
            </h3>
            <p className="text-[10px] sm:text-[11px] text-app-muted">
              {isTh ? 'เปรียบเทียบปริมาณงานระหว่างโรงงาน' : 'Cross-plant volume and valuation comparison'}
            </p>
          </div>
        </div>
      </div>

      {/* BAR CHART */}
      <div className="h-64 w-full mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -15, bottom: 5 }}>
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
      </div>
    </div>
  );
};
