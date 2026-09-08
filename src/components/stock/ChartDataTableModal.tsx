import React from 'react';
import { Modal } from '../common/Modal';
import { MovementGranularPoint } from '../../utils/stockCalculation';
import { downloadChartAsCsv } from '../../utils/chartExport';
import { Download, Table as TableIcon } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface ChartDataTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: MovementGranularPoint[];
  isPriceMode: boolean;
  granularity: string;
}

export const ChartDataTableModal: React.FC<ChartDataTableModalProps> = ({
  isOpen,
  onClose,
  data,
  isPriceMode,
  granularity,
}) => {
  const { language } = useLanguage();
  const isTh = language === 'th';

  const formatVal = (num: number) => {
    if (isPriceMode) {
      return `฿${num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    }
    return `${num.toLocaleString()} Units`;
  };

  const handleExport = () => {
    downloadChartAsCsv(data, isPriceMode, `goods_movement_${granularity.toLowerCase()}_table.csv`);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${isTh ? 'ตารางข้อมูลแนวโน้ม' : 'Movement Trend Data'} (${granularity} - ${isPriceMode ? (isTh ? 'มูลค่า' : 'Valuation') : (isTh ? 'จำนวน' : 'Quantity')})`}
      maxWidthClass="max-w-3xl"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-app-secondary dark:text-app-darkSecondary">
            {isTh
              ? `แสดงชุดข้อมูลความละเอียดระดับ ${granularity} จำนวน ${data.length} รายการ`
              : `Showing ${data.length} data points at ${granularity} granularity`}
          </p>
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-brand-blue text-white hover:bg-brand-darkBlue transition-colors shadow-subtle"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isTh ? 'ส่งออก CSV' : 'Export CSV'}</span>
          </button>
        </div>

        <div className="overflow-x-auto max-h-[420px] rounded-xl border border-app-border dark:border-app-darkBorder">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 z-10 bg-app-bg dark:bg-app-darkBg text-app-secondary dark:text-app-darkSecondary uppercase font-semibold text-[10px] tracking-wider border-b border-app-border dark:border-app-darkBorder">
              <tr>
                <th className="py-2.5 px-3.5">{isTh ? 'ช่วงเวลา (Period)' : 'Period'}</th>
                <th className="py-2.5 px-3.5 text-right text-gr">{isTh ? 'รับเข้า (Goods Receipt)' : 'Goods Receipt (GR)'}</th>
                <th className="py-2.5 px-3.5 text-right text-gi">{isTh ? 'เบิกจ่าย (Goods Issue)' : 'Goods Issue (GI)'}</th>
                <th className="py-2.5 px-3.5 text-right text-brand-blue">{isTh ? 'สุทธิ (Net Movement)' : 'Net Movement'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border dark:divide-app-darkBorder bg-white dark:bg-app-darkSurface">
              {data.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-app-muted">
                    {isTh ? 'ไม่มีข้อมูลการเคลื่อนไหวในช่วงเวลานี้' : 'No movement records in this period.'}
                  </td>
                </tr>
              ) : (
                data.map((row, idx) => (
                  <tr key={row.periodKey || idx} className="hover:bg-app-bg/50 dark:hover:bg-app-darkBorder/30 font-mono">
                    <td className="py-2.5 px-3.5 font-bold text-app-text dark:text-app-darkText">
                      {row.periodLabel}
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-bold text-gr">
                      +{formatVal(isPriceMode ? row.grValue : row.grQty)}
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-bold text-gi">
                      -{formatVal(isPriceMode ? row.giValue : row.giQty)}
                    </td>
                    <td className={`py-2.5 px-3.5 text-right font-bold ${(isPriceMode ? row.netValue : row.netQty) >= 0 ? 'text-brand-blue' : 'text-amber-600'}`}>
                      {(isPriceMode ? row.netValue : row.netQty) > 0 ? '+' : ''}
                      {formatVal(isPriceMode ? row.netValue : row.netQty)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
};
