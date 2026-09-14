import React, { useState, useMemo } from 'react';
import { StockTransaction } from '../../types/stock';
import { DataTable, Column } from '../common/DataTable';
import { SearchInput } from '../common/SearchInput';
import { StatusBadge } from '../common/StatusBadge';
import { formatDateTime } from '../../utils/dateRange';
import { History, Package, User } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface RecentMovementsTableProps {
  transactions: StockTransaction[];
  onRowClick?: (tx: StockTransaction) => void;
  className?: string;
}

export const RecentMovementsTable: React.FC<RecentMovementsTableProps> = ({
  transactions,
  onRowClick,
  className = '',
}) => {
  const { language } = useLanguage();
  const isTh = language === 'th';

  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setCurrentPage(1);
  };

  // Filter transactions across ALL columns before pagination
  const filteredTransactions = useMemo(() => {
    if (!searchQuery.trim()) return transactions;
    const q = searchQuery.toLowerCase().trim();

    return transactions.filter(tx => {
      const formattedDate = formatDateTime(tx.createdAt).toLowerCase();
      const unitPriceStr = (tx.pricePerUnit ?? tx.price ?? 0).toString();
      const totalPriceStr = (tx.totalPrice ?? Math.abs(tx.quantity) * (tx.pricePerUnit || 0)).toString();
      const qtyStr = tx.quantity.toString();
      const signedQtyStr = tx.quantity > 0 ? `+${tx.quantity}` : tx.quantity.toString();

      return (
        tx.transactionType.toLowerCase().includes(q) ||
        tx.materialCode.toLowerCase().includes(q) ||
        tx.documentNo.toLowerCase().includes(q) ||
        (tx.transactionNumber && tx.transactionNumber.toLowerCase().includes(q)) ||
        (tx.description && tx.description.toLowerCase().includes(q)) ||
        (tx.process && tx.process.toLowerCase().includes(q)) ||
        (tx.type && tx.type.toLowerCase().includes(q)) ||
        qtyStr.includes(q) ||
        signedQtyStr.includes(q) ||
        unitPriceStr.includes(q) ||
        totalPriceStr.includes(q) ||
        (tx.storageLocation && tx.storageLocation.toLowerCase().includes(q)) ||
        (tx.storageBin && tx.storageBin.toLowerCase().includes(q)) ||
        (tx.batchNo && tx.batchNo.toLowerCase().includes(q)) ||
        (tx.batchNumber && tx.batchNumber.toLowerCase().includes(q)) ||
        (tx.lotNo && tx.lotNo.toLowerCase().includes(q)) ||
        (tx.lot && tx.lot.toLowerCase().includes(q)) ||
        (tx.referenceNo && tx.referenceNo.toLowerCase().includes(q)) ||
        (tx.referenceNumber && tx.referenceNumber.toLowerCase().includes(q)) ||
        (tx.picklist && tx.picklist.toLowerCase().includes(q)) ||
        tx.createdBy.toLowerCase().includes(q) ||
        (tx.comment && tx.comment.toLowerCase().includes(q)) ||
        formattedDate.includes(q) ||
        tx.createdAt.toLowerCase().includes(q)
      );
    });
  }, [transactions, searchQuery]);

  // Paginate transactions
  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredTransactions.slice(startIndex, startIndex + pageSize);
  }, [filteredTransactions, currentPage, pageSize]);

  const columns: Column<StockTransaction>[] = [
    {
      id: 'transactionType',
      header: isTh ? 'ประเภท' : 'Type',
      sortable: true,
      className: 'w-[100px]',
      accessor: (tx) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold font-mono ${
            tx.transactionType === 'GR'
              ? 'bg-gr-bg dark:bg-gr-darkBg text-gr'
              : tx.transactionType === 'GI'
              ? 'bg-gi-bg dark:bg-gi-darkBg text-gi'
              : tx.transactionType === 'OPENING'
              ? 'bg-blue-50 dark:bg-blue-950/60 text-brand-blue'
              : 'bg-purple-50 dark:bg-purple-950/60 text-purple-600'
          }`}
        >
          {tx.transactionType}
        </span>
      ),
    },
    {
      id: 'material',
      header: isTh ? 'วัสดุ / อะไหล่' : 'Material',
      sortable: true,
      className: 'min-w-[220px]',
      accessor: (tx) => (
        <div>
          <span className="font-mono font-bold text-xs text-brand-blue block">
            {tx.materialCode}
          </span>
          <span className="text-xs text-app-text dark:text-app-darkText truncate max-w-xs block">
            {tx.documentNo} {tx.process ? `· ${tx.process}` : ''}
          </span>
        </div>
      ),
    },
    {
      id: 'quantity',
      header: isTh ? 'จำนวน' : 'Qty',
      align: 'right',
      sortable: true,
      accessor: (tx) => (
        <div className="text-right font-mono font-bold text-xs">
          <span className={tx.quantity > 0 ? 'text-gr' : tx.quantity < 0 ? 'text-gi' : 'text-app-text'}>
            {tx.quantity > 0 ? `+${tx.quantity}` : tx.quantity}
          </span>
        </div>
      ),
    },
    {
      id: 'pricePerUnit',
      header: isTh ? 'ราคา/หน่วย' : 'Cost / Unit',
      align: 'right',
      sortable: true,
      accessor: (tx) => (
        <span className="font-mono text-xs text-app-secondary dark:text-app-darkSecondary">
          ฿{(tx.pricePerUnit || 0).toLocaleString()}
        </span>
      ),
    },
    {
      id: 'totalPrice',
      header: isTh ? 'มูลค่ารวม' : 'Total Cost',
      align: 'right',
      sortable: true,
      accessor: (tx) => (
        <span className="font-mono font-bold text-xs text-app-text dark:text-app-darkText">
          ฿{(tx.totalPrice || Math.abs(tx.quantity) * (tx.pricePerUnit || 0)).toLocaleString()}
        </span>
      ),
    },
    {
      id: 'createdAt',
      header: isTh ? 'เวลาบันทึก' : 'Time Create',
      sortable: true,
      accessor: (tx) => (
        <span className="font-mono text-[11px] text-app-muted whitespace-nowrap">
          {formatDateTime(tx.createdAt)}
        </span>
      ),
    },
    {
      id: 'createdBy',
      header: isTh ? 'ผู้บันทึก' : 'User Create',
      sortable: true,
      accessor: (tx) => (
        <div className="flex items-center gap-1.5 text-xs text-app-secondary dark:text-app-darkSecondary">
          <div className="w-5 h-5 rounded-full bg-app-bg dark:bg-app-darkBg flex items-center justify-center text-[10px] font-bold text-brand-blue">
            {tx.createdBy.charAt(0).toUpperCase()}
          </div>
          <span className="truncate max-w-[120px]">{tx.createdBy}</span>
        </div>
      ),
    },
  ];

  return (
    <div className={`p-4 sm:p-5 rounded-2xl bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder shadow-subtle space-y-4 ${className}`}>
      {/* HEADER & SEARCH BAR */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-brand-blue flex items-center justify-center shrink-0">
            <History className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-app-text dark:text-app-darkText uppercase tracking-wider">
              {isTh ? 'Recent Movements' : 'Recent Movements'}
            </h3>
            <p className="text-[10px] sm:text-[11px] text-app-muted">
              {isTh
                ? `รายการเคลื่อนไหวทั้งหมด (${filteredTransactions.length} รายการ จากทั้งหมด ${transactions.length} รายการ)`
                : `Audited movements within the applied filter (${filteredTransactions.length} of ${transactions.length} records)`}
            </p>
          </div>
        </div>

        {/* SEARCH INPUT */}
        <SearchInput
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder={isTh ? 'ค้นหาทุกคอลัมน์ (Doc#, Code, SLoc, User...)' : 'Search all columns (Doc#, Code, SLoc, User...)'}
          className="w-full sm:w-72"
        />
      </div>

      {/* TABLE WITH 10 ITEMS DEFAULT PAGINATION */}
      <DataTable
        data={paginatedTransactions}
        columns={columns}
        keyExtractor={(tx) => tx.id}
        onRowClick={onRowClick}
        emptyTitle="No Recent Movements in Period"
        emptyDescription="No stock receipts, issues, or adjustments match your search query or filter criteria."
        emptyType="transactions"
        pagination={{
          currentPage,
          pageSize,
          totalItems: filteredTransactions.length,
          onPageChange: setCurrentPage,
          onPageSizeChange: setPageSize,
          pageSizeOptions: [10, 20, 50, 100],
        }}
      />
    </div>
  );
};
