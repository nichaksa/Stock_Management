import React from 'react';
import { TransactionDocument } from '../../types/stock';
import { Drawer } from '../common/Drawer';
import { formatDateTime } from '../../utils/dateRange';
import { StatusBadge } from '../common/StatusBadge';
import { Printer, Copy, FileText, Building2, User, Calendar, CheckCircle2 } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useLanguage } from '../../context/LanguageContext';

interface TransactionDocumentDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  document: TransactionDocument | null;
}

export const TransactionDocumentDetailDrawer: React.FC<TransactionDocumentDetailDrawerProps> = ({
  isOpen,
  onClose,
  document: doc,
}) => {
  const { addToast } = useToast();
  const { language } = useLanguage();
  const isTh = language === 'th';

  if (!doc) return null;

  const isGr = doc.transactionType === 'GR' || doc.transactionType === 'OPENING';
  const isGi = doc.transactionType === 'GI';

  const handlePrintDocument = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Stock Voucher - ${doc.transactionNumber}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 30px; color: #111; }
            .header { border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 20px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; font-size: 13px; margin-bottom: 20px; }
            .label { font-weight: bold; color: #555; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 13px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; }
            .totals { margin-top: 20px; text-align: right; font-size: 14px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>ZYCODA STOCK TRANSACTION VOUCHER</h2>
            <p>Document No: <strong>${doc.transactionNumber}</strong> | Type: <strong>${doc.transactionType}</strong> | Date: ${formatDateTime(doc.createdDateTime)}</p>
          </div>
          <div class="grid">
            <div><span class="label">Plant:</span> ${doc.plant}</div>
            <div><span class="label">Created By:</span> ${doc.createdBy}</div>
            <div><span class="label">Reference:</span> ${doc.referenceNumber || '-'}</div>
            <div><span class="label">${doc.picklist ? 'PickList' : 'PR ID'}:</span> ${doc.picklist || doc.prId || '-'}</div>
            <div><span class="label">Status:</span> ${doc.status}</div>
            <div><span class="label">Total Items:</span> ${doc.items.length}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Material Code</th>
                <th>Description</th>
                <th>Batch / Lot</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th>Total Value</th>
              </tr>
            </thead>
            <tbody>
              ${doc.items
                .map(
                  (item, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td><strong>${item.materialCode}</strong></td>
                  <td>${item.description}</td>
                  <td>${item.batchNumber || '-'} / ${item.lot || '-'}</td>
                  <td>${isGr ? '+' : isGi ? '-' : ''}${item.quantity} ${item.unit || 'EA'}</td>
                  <td>฿${item.price.toLocaleString()}</td>
                  <td>฿${(item.totalPrice || item.quantity * item.price).toLocaleString()}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
          <div class="totals">
            <p>Total Quantity: ${isGr ? '+' : isGi ? '-' : ''}${doc.totalQuantity}</p>
            <p>Total Ledger Valuation: ฿${doc.totalValue.toLocaleString()}</p>
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Transaction Document Details"
      subtitle={`${doc.transactionNumber} (${doc.transactionType})`}
      widthClass="max-w-2xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(doc.transactionNumber);
              addToast('Transaction number copied to clipboard', 'info');
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-app-border dark:border-app-darkBorder text-app-secondary hover:text-app-text transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Copy Doc No</span>
          </button>

          <button
            type="button"
            onClick={handlePrintDocument}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-brand-blue hover:bg-brand-darkBlue text-white shadow-sm transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Document Voucher</span>
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* DOCUMENT HEADER BANNER */}
        <div className="p-4 rounded-2xl bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder shadow-subtle flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-app-muted uppercase tracking-wider block">
              Document Volume & Valuation
            </span>
            <span
              className={`text-2xl font-mono font-bold ${
                isGr ? 'text-gr' : isGi ? 'text-gi' : 'text-brand-blue'
              }`}
            >
              {isGr ? `+${doc.totalQuantity}` : isGi ? `-${doc.totalQuantity}` : doc.totalQuantity} Units
            </span>
            <span className="text-xs text-app-muted ml-2 font-mono font-bold">
              (Total Value: ฿{doc.totalValue.toLocaleString()})
            </span>
          </div>

          <StatusBadge status={doc.transactionType} size="lg" />
        </div>

        {/* METADATA GRID */}
        <div className="p-4 rounded-2xl bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder shadow-subtle space-y-3">
          <h4 className="text-xs font-bold text-app-text dark:text-app-darkText uppercase tracking-wider pb-2 border-b border-app-border dark:border-app-darkBorder">
            Header Information
          </h4>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-app-muted block text-[11px]">Transaction No.</span>
              <span className="font-mono font-bold text-brand-blue">{doc.transactionNumber}</span>
            </div>
            <div>
              <span className="text-app-muted block text-[11px]">Plant</span>
              <span className="font-semibold text-app-text dark:text-app-darkText">{doc.plant}</span>
            </div>
            <div>
              <span className="text-app-muted block text-[11px]">Created By</span>
              <span className="font-mono text-app-text dark:text-app-darkText font-medium">{doc.createdBy}</span>
            </div>
            <div>
              <span className="text-app-muted block text-[11px]">Created DateTime</span>
              <span className="font-mono text-app-text dark:text-app-darkText">{formatDateTime(doc.createdDateTime)}</span>
            </div>
            <div>
              <span className="text-app-muted block text-[11px]">Reference / PO No.</span>
              <span className="font-mono text-app-text dark:text-app-darkText">{doc.referenceNumber || '-'}</span>
            </div>
            {doc.picklist ? (
              <div>
                <span className="text-app-muted block text-[11px]">PickList</span>
                <span className="font-mono text-app-text dark:text-app-darkText">{doc.picklist}</span>
              </div>
            ) : (
              <div>
                <span className="text-app-muted block text-[11px]">PR ID</span>
                <span className="font-mono text-app-text dark:text-app-darkText">{doc.prId || '-'}</span>
              </div>
            )}
          </div>

          {doc.comment && (
            <div className="pt-2 border-t border-app-border dark:border-app-darkBorder">
              <span className="text-app-muted block text-[11px] mb-0.5">Remark / Comment</span>
              <p className="text-xs text-app-secondary dark:text-app-darkSecondary bg-app-bg dark:bg-app-darkBg p-2.5 rounded-lg border border-app-border dark:border-app-darkBorder">
                {doc.comment}
              </p>
            </div>
          )}
        </div>

        {/* ITEM LINES TABLE */}
        <div className="p-4 rounded-2xl bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder shadow-subtle space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-app-border dark:border-app-darkBorder">
            <h4 className="text-xs font-bold uppercase tracking-wider text-app-text dark:text-app-darkText">
              Document Item Lines ({doc.items.length})
            </h4>
            <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
              ฿{doc.totalValue.toLocaleString()}
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-app-border dark:border-app-darkBorder max-h-64">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-app-bg dark:bg-app-darkBg text-app-secondary dark:text-app-darkSecondary uppercase font-semibold text-[10px] tracking-wider border-b border-app-border dark:border-app-darkBorder">
                <tr>
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Material Code</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3">Batch / Lot / SN</th>
                  <th className="py-2.5 px-3 text-right">Quantity</th>
                  <th className="py-2.5 px-3 text-right">Price / Unit</th>
                  <th className="py-2.5 px-3 text-right">Total (฿)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border dark:divide-app-darkBorder bg-white dark:bg-app-darkSurface">
                {doc.items.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-app-bg/50 dark:hover:bg-app-darkBorder/30 font-mono">
                    <td className="py-2.5 px-3 text-app-muted">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-bold text-brand-blue">{item.materialCode}</td>
                    <td className="py-2.5 px-3 font-sans">
                      <span className="font-medium text-app-text dark:text-app-darkText block truncate max-w-xs">{item.description}</span>
                      {item.supplier && <span className="text-[10px] text-app-muted block">{item.supplier}</span>}
                    </td>
                    <td className="py-2.5 px-3 text-[11px] text-app-secondary">
                      {item.batchNumber || item.lot || '-'} {item.serialNumber ? `(SN: ${item.serialNumber})` : ''}
                    </td>
                    <td className={`py-2.5 px-3 text-right font-bold ${isGr ? 'text-gr' : isGi ? 'text-gi' : 'text-app-text'}`}>
                      {isGr ? `+${item.quantity}` : isGi ? `-${item.quantity}` : item.quantity} {item.unit || 'EA'}
                    </td>
                    <td className="py-2.5 px-3 text-right text-app-secondary">
                      ฿{item.price.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-app-text dark:text-app-darkText">
                      ฿{(item.totalPrice || item.quantity * item.price).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Drawer>
  );
};
