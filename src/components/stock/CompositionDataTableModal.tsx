import React from 'react';
import { Modal } from '../common/Modal';
import { TypeCompositionItem } from './InventoryCompositionDonut';
import { downloadCompositionCsv } from '../../utils/chartExport';
import { Download, PieChart } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface CompositionDataTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: TypeCompositionItem[];
  isPriceMode: boolean;
}

export const CompositionDataTableModal: React.FC<CompositionDataTableModalProps> = ({
  isOpen,
  onClose,
  data,
  isPriceMode,
}) => {
  const { language } = useLanguage();
  const isTh = language === 'th';

  const totalQty = data.reduce((acc, curr) => acc + curr.quantity, 0);
  const totalVal = data.reduce((acc, curr) => acc + curr.value, 0);

  const formatMoney = (val: number) => {
    return `฿${val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const handleExport = () => {
    downloadCompositionCsv(data, isPriceMode);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${isTh ? 'ตารางข้อมูลสัดส่วนตามประเภทวัสดุ' : 'Inventory Composition by Material Type'} (${isPriceMode ? (isTh ? 'มูลค่า' : 'Valuation') : (isTh ? 'จำนวน' : 'Quantity')})`}
      maxWidthClass="max-w-3xl"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-app-secondary dark:text-app-darkSecondary">
            {isTh
              ? `แสดงสัดส่วนสินค้าคงคลังจำแนกตามประเภทวัสดุ ${data.length} กลุ่ม`
              : `Showing inventory breakdown across ${data.length} material categories`}
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
                <th className="py-2.5 px-3.5">{isTh ? 'ประเภทวัสดุ (Material Type)' : 'Material Type'}</th>
                <th className="py-2.5 px-3.5 text-right">{isTh ? 'จำนวนรายการ (SKUs)' : 'SKU Count'}</th>
                <th className="py-2.5 px-3.5 text-right">{isTh ? 'จำนวนคงคลัง (Physical Qty)' : 'Physical Qty'}</th>
                <th className="py-2.5 px-3.5 text-right">{isTh ? 'มูลค่าคงคลัง (Valuation)' : 'Valuation (THB)'}</th>
                <th className="py-2.5 px-3.5 text-right text-brand-blue">{isTh ? 'สัดส่วน (Share)' : 'Share (%)'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border dark:divide-app-darkBorder bg-white dark:bg-app-darkSurface">
              {data.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-app-muted">
                    {isTh ? 'ไม่มีข้อมูลประเภทวัสดุ' : 'No material composition data available.'}
                  </td>
                </tr>
              ) : (
                data.map((row) => {
                  const share = isPriceMode
                    ? totalVal > 0 ? ((row.value / totalVal) * 100).toFixed(1) : '0'
                    : totalQty > 0 ? ((row.quantity / totalQty) * 100).toFixed(1) : '0';

                  return (
                    <tr key={row.name} className="hover:bg-app-bg/50 dark:hover:bg-app-darkBorder/30 font-mono">
                      <td className="py-2.5 px-3.5 font-bold text-app-text dark:text-app-darkText">
                        {row.name}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-mono text-app-secondary dark:text-app-darkSecondary">
                        {row.itemCount.toLocaleString()} {isTh ? 'รายการ' : 'SKUs'}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-mono font-semibold text-app-text dark:text-app-darkText">
                        {row.quantity.toLocaleString()} Units
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {formatMoney(row.value)}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-mono font-bold text-brand-blue">
                        {share}%
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {data.length > 0 && (
              <tfoot className="sticky bottom-0 bg-app-bg dark:bg-app-darkBg border-t-2 border-app-border dark:border-app-darkBorder font-mono font-bold text-xs">
                <tr>
                  <td className="py-2.5 px-3.5 text-app-text dark:text-app-darkText">{isTh ? 'รวมทั้งหมด' : 'Total'}</td>
                  <td className="py-2.5 px-3.5 text-right text-app-secondary dark:text-app-darkSecondary">
                    {data.reduce((acc, c) => acc + c.itemCount, 0).toLocaleString()} {isTh ? 'รายการ' : 'SKUs'}
                  </td>
                  <td className="py-2.5 px-3.5 text-right text-app-text dark:text-app-darkText">
                    {totalQty.toLocaleString()} Units
                  </td>
                  <td className="py-2.5 px-3.5 text-right text-emerald-600 dark:text-emerald-400">
                    {formatMoney(totalVal)}
                  </td>
                  <td className="py-2.5 px-3.5 text-right text-brand-blue">
                    100.0%
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </Modal>
  );
};
