import React from 'react';
import { StockTransaction } from '../../types/stock';
import { Drawer } from '../common/Drawer';
import { formatDateTime } from '../../utils/dateRange';
import { StatusBadge } from '../common/StatusBadge';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, Copy, FileText, CheckCircle2 } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

interface TransactionDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: StockTransaction | null;
}

export const TransactionDetailDrawer: React.FC<TransactionDetailDrawerProps> = ({
  isOpen,
  onClose,
  transaction,
}) => {
  const { addToast } = useToast();

  if (!transaction) return null;

  const isGr = transaction.transactionType === 'GR' || (transaction.transactionType === 'OPENING' && transaction.quantity > 0);
  const isGi = transaction.transactionType === 'GI';

  const handlePrintReceipt = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Movement Receipt - ${transaction.documentNo}</title>
          <style>
            body { font-family: sans-serif; padding: 30px; color: #111; }
            .header { border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 20px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 13px; }
            .label { font-weight: bold; color: #555; }
            .qty { font-size: 20px; font-weight: bold; color: ${isGr ? '#16A34A' : '#DC2626'}; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>ZYCODA STOCK MOVEMENT VOUCHER</h2>
            <p>Document No: <strong>${transaction.documentNo}</strong> | Date: ${formatDateTime(transaction.createdAt)}</p>
          </div>
          <div class="grid">
            <div><span class="label">Plant:</span> ${transaction.plant}</div>
            <div><span class="label">Material Code:</span> ${transaction.materialCode}</div>
            <div><span class="label">Transaction Type:</span> ${transaction.transactionType}</div>
            <div><span class="label">User:</span> ${transaction.createdBy}</div>
            <div><span class="label">Process:</span> ${transaction.process || '-'}</div>
            <div><span class="label">Reference No:</span> ${transaction.referenceNo || '-'}</div>
            <div><span class="label">Storage Location:</span> ${transaction.storageLocation || '-'} / ${transaction.storageBin || '-'}</div>
            <div><span class="label">Batch / Lot:</span> ${transaction.batchNo || '-'} / ${transaction.lotNo || '-'}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Item Code</th>
                <th>Balance Before</th>
                <th>Movement</th>
                <th>Balance After</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${transaction.materialCode}</td>
                <td>${transaction.balanceBefore}</td>
                <td class="qty">${transaction.quantity > 0 ? '+' : ''}${transaction.quantity}</td>
                <td><strong>${transaction.balanceAfter}</strong></td>
              </tr>
            </tbody>
          </table>
          <p style="margin-top: 30px; font-size: 11px; color: #777;">Authorized electronic transaction timestamp: ${transaction.createdAt}</p>
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
      title="Transaction Audit Record"
      subtitle={`Document: ${transaction.documentNo}`}
      widthClass="max-w-xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(transaction.documentNo);
              addToast('Document No. copied to clipboard', 'info');
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-app-border dark:border-app-darkBorder text-app-secondary hover:text-app-text transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Copy Doc No</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrintReceipt}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-brand-blue hover:bg-brand-hoverBlue text-white shadow-sm transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Voucher</span>
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Banner */}
        <div className="p-4 rounded-2xl bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder shadow-subtle flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-app-muted uppercase tracking-wider block">
              Movement Quantity
            </span>
            <span
              className={`text-2xl font-mono font-bold ${
                transaction.quantity > 0 ? 'text-gr' : 'text-gi'
              }`}
            >
              {transaction.quantity > 0 ? `+${transaction.quantity}` : `${transaction.quantity}`}
            </span>
            <span className="text-xs text-app-muted ml-1.5">
              (Balance: {transaction.balanceBefore} → {transaction.balanceAfter})
            </span>
          </div>

          <StatusBadge status={transaction.transactionType} size="lg" />
        </div>

        {/* Audit Details Matrix */}
        <div className="p-4 rounded-2xl bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder shadow-subtle space-y-3">
          <h4 className="text-xs font-bold text-app-text dark:text-app-darkText uppercase tracking-wider pb-2 border-b border-app-border dark:border-app-darkBorder">
            Traceability & Metadata
          </h4>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-app-muted block text-[11px]">Material Code</span>
              <span className="font-mono font-bold text-brand-blue">{transaction.materialCode}</span>
            </div>
            <div>
              <span className="text-app-muted block text-[11px]">Plant</span>
              <span className="font-semibold text-app-text dark:text-app-darkText">{transaction.plant}</span>
            </div>
            <div>
              <span className="text-app-muted block text-[11px]">Executed By</span>
              <span className="font-mono text-app-text dark:text-app-darkText font-medium">{transaction.createdBy}</span>
            </div>
            <div>
              <span className="text-app-muted block text-[11px]">Exact Timestamp</span>
              <span className="font-mono text-app-text dark:text-app-darkText">{formatDateTime(transaction.createdAt)}</span>
            </div>
            <div>
              <span className="text-app-muted block text-[11px]">Storage Location / Bin</span>
              <span className="font-mono text-app-text dark:text-app-darkText">{transaction.storageLocation || '-'} / {transaction.storageBin || '-'}</span>
            </div>
            <div>
              <span className="text-app-muted block text-[11px]">Process</span>
              <span className="font-medium text-app-text dark:text-app-darkText">{transaction.process || '-'}</span>
            </div>
            <div>
              <span className="text-app-muted block text-[11px]">Reference No.</span>
              <span className="font-mono text-app-text dark:text-app-darkText">{transaction.referenceNo || '-'}</span>
            </div>
            <div>
              <span className="text-app-muted block text-[11px]">Picklist No.</span>
              <span className="font-mono text-app-text dark:text-app-darkText">{transaction.picklist || '-'}</span>
            </div>
            <div>
              <span className="text-app-muted block text-[11px]">Batch No.</span>
              <span className="font-mono text-app-text dark:text-app-darkText">{transaction.batchNo || '-'}</span>
            </div>
            <div>
              <span className="text-app-muted block text-[11px]">Lot / Serial No.</span>
              <span className="font-mono text-app-text dark:text-app-darkText">{transaction.lotNo || '-'} {transaction.serialNo ? `(SN: ${transaction.serialNo})` : ''}</span>
            </div>
          </div>

          {transaction.comment && (
            <div className="pt-2 border-t border-app-border dark:border-app-darkBorder">
              <span className="text-app-muted block text-[11px] mb-0.5">Comment</span>
              <p className="text-xs text-app-secondary dark:text-app-darkSecondary bg-app-bg dark:bg-app-darkBg p-2.5 rounded-lg border border-app-border dark:border-app-darkBorder">
                {transaction.comment}
              </p>
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
};
