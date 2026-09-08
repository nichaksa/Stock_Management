import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { StockTransaction } from '../../types/stock';
import { getStockChartData, GraphPoint } from '../../utils/stockCalculation';
import { useTheme } from '../../context/ThemeContext';

interface StockMovementChartProps {
  materialId: string;
  transactions: StockTransaction[];
  startDate: string;
  endDate: string;
  unit: string;
  onPointClick?: (transaction?: StockTransaction) => void;
}

export const StockMovementChart: React.FC<StockMovementChartProps> = ({
  materialId,
  transactions,
  startDate,
  endDate,
  unit,
  onPointClick,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const chartData = React.useMemo(() => {
    return getStockChartData(materialId, transactions, startDate, endDate);
  }, [materialId, transactions, startDate, endDate]);

  const minVal = Math.min(...chartData.map(d => d.balance), 0);
  const maxVal = Math.max(...chartData.map(d => d.balance), 10);
  const yDomain = [Math.max(0, minVal - 2), Math.ceil(maxVal * 1.15) + 1];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data: GraphPoint = payload[0].payload;
      const tx = data.transaction;

      return (
        <div className="bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder rounded-xl shadow-modal p-3 text-xs space-y-1 z-50 min-w-[190px] animate-fade-in">
          <p className="font-mono text-[11px] text-app-muted dark:text-app-darkMuted border-b border-app-border dark:border-app-darkBorder pb-1">
            {data.displayTime}
          </p>
          {data.isBoundary && !tx ? (
            <div className="py-1">
              <span className="font-semibold text-app-secondary dark:text-app-darkSecondary">
                {data.movementLabel}
              </span>
              <p className="text-base font-bold text-brand-blue font-mono mt-0.5">
                {data.balance} {unit}
              </p>
            </div>
          ) : tx ? (
            <div className="space-y-1 pt-1">
              <div className="flex items-center justify-between gap-2">
                <span className={`font-bold ${tx.transactionType === 'GR' ? 'text-gr' : tx.transactionType === 'GI' ? 'text-gi' : 'text-brand-blue'}`}>
                  {tx.transactionType === 'GR' ? 'Goods Receipt (GR)' : tx.transactionType === 'GI' ? 'Goods Issue (GI)' : tx.transactionType === 'OPENING' ? 'Opening Balance' : 'Stock Adjustment'}
                </span>
                <span className={`font-mono font-bold ${tx.quantity > 0 ? 'text-gr' : 'text-gi'}`}>
                  {tx.quantity > 0 ? `+${tx.quantity}` : `${tx.quantity}`} {unit}
                </span>
              </div>
              <div className="flex items-center justify-between text-app-secondary dark:text-app-darkSecondary">
                <span>Balance After:</span>
                <span className="font-bold text-app-text dark:text-app-darkText font-mono">
                  {data.balance} {unit}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-app-muted">
                <span>User:</span>
                <span className="font-mono font-medium text-app-secondary dark:text-app-darkSecondary">
                  {tx.createdBy}
                </span>
              </div>
              {tx.process && (
                <p className="text-[10px] text-app-muted italic truncate max-w-[180px]">
                  {tx.process}
                </p>
              )}
            </div>
          ) : null}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-64 sm:h-72 select-none">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          onClick={(state: any) => {
            if (state && state.activePayload && state.activePayload.length) {
              const point: GraphPoint = state.activePayload[0].payload;
              if (point.transaction && onPointClick) {
                onPointClick(point.transaction);
              }
            }
          }}
        >
          <defs>
            <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2563EB" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke={isDark ? '#23304B' : '#E5EAF1'}
          />
          <XAxis
            dataKey="displayTime"
            stroke={isDark ? '#64748B' : '#98A2B3'}
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: isDark ? '#23304B' : '#E5EAF1' }}
          />
          <YAxis
            domain={yDomain}
            stroke={isDark ? '#64748B' : '#98A2B3'}
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: isDark ? '#23304B' : '#E5EAF1' }}
            allowDecimals={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="stepAfter"
            dataKey="balance"
            stroke="#2563EB"
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#colorBalance)"
            dot={{ r: 4, fill: '#2563EB', stroke: isDark ? '#151E32' : '#FFFFFF', strokeWidth: 2 }}
            activeDot={{ r: 6, fill: '#2563EB', stroke: isDark ? '#151E32' : '#FFFFFF', strokeWidth: 3, cursor: 'pointer' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
