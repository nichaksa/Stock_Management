import React, { useState, useMemo } from 'react';
import { StockTransaction, TransactionType, DateRange } from '../../types/stock';
import { PageLayout } from '../../components/layout/PageLayout';
import { SearchInput } from '../../components/common/SearchInput';
import { FilterSelect } from '../../components/common/FilterSelect';
import { DateRangePicker } from '../../components/common/DateRangePicker';
import { DataTable, Column, SortDirection } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { TransactionDetailDrawer } from '../../components/stock/TransactionDetailDrawer';
import { useStock } from '../../context/StockContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { exportTransactionsToCsv } from '../../utils/export';
import { getPresetDateRange, formatDateTime } from '../../utils/dateRange';
import {
  Download,
  Building2,
  Filter,
  User as UserIcon,
  Layers,
  FileText,
  Eye,
} from 'lucide-react';

export const TransactionPage: React.FC = () => {
  const { transactions, materials } = useStock();
  const { t } = useLanguage();
  const { addToast } = useToast();

  const [dateRange, setDateRange] = useState<DateRange>(() => getPresetDateRange('31_days_ago'));
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlant, setSelectedPlant] = useState('All Plants');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedUser, setSelectedUser] = useState('ALL');

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [sortColumn, setSortColumn] = useState<string | null>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const [selectedTransaction, setSelectedTransaction] = useState<StockTransaction | null>(null);

  const handleDateRangeChange = (range: DateRange) => {
    setDateRange(range);
    setCurrentPage(1);
  };

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setCurrentPage(1);
  };

  const handlePlantChange = (val: string) => {
    setSelectedPlant(val);
    setCurrentPage(1);
  };

  const handleTypeChange = (val: string) => {
    setSelectedType(val);
    setCurrentPage(1);
  };

  const handleUserChange = (val: string) => {
    setSelectedUser(val);
    setCurrentPage(1);
  };

  // Extract unique users
  const uniqueUsers = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach(t => set.add(t.createdBy));
    return Array.from(set);
  }, [transactions]);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    const startTime = new Date(dateRange.startDate).getTime();
    const endTime = new Date(dateRange.endDate).getTime();

    return transactions.filter(tx => {
      const txTime = new Date(tx.createdAt).getTime();

      // Date Range Filter
      if (txTime < startTime || txTime > endTime) {
        return false;
      }

      // Plant filter
      if (selectedPlant !== 'All Plants' && tx.plant !== selectedPlant) {
        return false;
      }

      // Type filter
      if (selectedType !== 'ALL' && tx.transactionType !== selectedType) {
        return false;
      }

      // User filter
      if (selectedUser !== 'ALL' && tx.createdBy !== selectedUser) {
        return false;
      }

      // Search query across DocumentNo, MaterialCode, Batch, Serial, Lot, Reference, Process
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matches =
          tx.documentNo.toLowerCase().includes(query) ||
          tx.materialCode.toLowerCase().includes(query) ||
          tx.batchNo?.toLowerCase().includes(query) ||
          tx.serialNo?.toLowerCase().includes(query) ||
          tx.lotNo?.toLowerCase().includes(query) ||
          tx.referenceNo?.toLowerCase().includes(query) ||
          tx.process?.toLowerCase().includes(query) ||
          tx.comment?.toLowerCase().includes(query);
        if (!matches) return false;
      }

      return true;
    });
  }, [transactions, dateRange, selectedPlant, selectedType, selectedUser, searchQuery]);

  // Sort
  const sortedTransactions = useMemo(() => {
    if (!sortColumn || !sortDirection) return filteredTransactions;

    return [...filteredTransactions].sort((a, b) => {
      let valA: any = (a as any)[sortColumn];
      let valB: any = (b as any)[sortColumn];

      if (sortColumn === 'createdAt') {
        valA = new Date(a.createdAt).getTime();
        valB = new Date(b.createdAt).getTime();
      } else if (sortColumn === 'movement') {
        valA = a.quantity;
        valB = b.quantity;
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredTransactions, sortColumn, sortDirection]);

  const handleSortChange = (colId: string) => {
    if (sortColumn !== colId) {
      setSortColumn(colId);
      setSortDirection('asc');
    } else if (sortDirection === 'asc') {
      setSortDirection('desc');
    } else {
      setSortColumn(null);
      setSortDirection(null);
    }
  };

  const handleExport = () => {
    exportTransactionsToCsv(sortedTransactions);
    addToast('Transactions exported to CSV', 'success');
  };

  // Paginated slice
  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedTransactions.slice(startIndex, startIndex + pageSize);
  }, [sortedTransactions, currentPage, pageSize]);

  // Table columns
  const tableColumns: Column<StockTransaction>[] = [
    {
      id: 'documentNo',
      header: t('document_no'),
      sortable: true,
      className: 'min-w-[130px]',
      accessor: (tx) => (
        <span className="font-mono font-bold text-xs text-brand-blue">
          {tx.documentNo}
        </span>
      ),
    },
    {
      id: 'createdAt',
      header: t('date_time'),
      sortable: true,
      className: 'min-w-[140px]',
      accessor: (tx) => (
        <span className="font-mono text-xs text-app-text dark:text-app-darkText">
          {formatDateTime(tx.createdAt)}
        </span>
      ),
    },
    {
      id: 'plant',
      header: t('plant'),
      sortable: true,
      align: 'left',
      className: 'w-[120px] min-w-[120px] max-w-[120px] px-4 whitespace-nowrap',
      accessor: (tx) => (
        <span className="inline-flex items-center px-2 py-1 rounded-[6px] bg-[#F4F6F8] dark:bg-slate-800 text-[#344054] dark:text-slate-200 text-xs font-medium whitespace-nowrap tracking-wide select-none">
          {tx.plant}
        </span>
      ),
    },
    {
      id: 'materialCode',
      header: t('material_code'),
      sortable: true,
      className: 'min-w-[140px]',
      accessor: (tx) => (
        <div>
          <span className="font-mono font-bold text-xs text-app-text dark:text-app-darkText">
            {tx.materialCode}
          </span>
        </div>
      ),
    },
    {
      id: 'transactionType',
      header: t('type'),
      align: 'center',
      className: 'w-24',
      accessor: (tx) => <StatusBadge status={tx.transactionType} size="sm" showDot={false} />,
    },
    {
      id: 'movement',
      header: t('movement'),
      sortable: true,
      align: 'right',
      className: 'min-w-[100px]',
      accessor: (tx) => (
        <span
          className={`font-mono text-xs font-bold ${
            tx.quantity > 0 ? 'text-gr' : 'text-gi'
          }`}
        >
          {tx.quantity > 0 ? `+${tx.quantity}` : `${tx.quantity}`}
        </span>
      ),
    },
    {
      id: 'balanceAfter',
      header: 'Balance After',
      sortable: true,
      align: 'right',
      className: 'min-w-[100px]',
      accessor: (tx) => (
        <span className="font-mono text-xs font-semibold text-app-text dark:text-app-darkText">
          {tx.balanceAfter}
        </span>
      ),
    },
    {
      id: 'createdBy',
      header: t('user'),
      sortable: true,
      className: 'min-w-[90px]',
      accessor: (tx) => (
        <span className="font-mono text-xs text-app-secondary dark:text-app-darkSecondary">
          {tx.createdBy}
        </span>
      ),
    },
    {
      id: 'location',
      header: t('location'),
      accessor: (tx) => (
        <span className="font-mono text-xs text-app-text dark:text-app-darkText">
          {tx.storageLocation || '-'} / {tx.storageBin || '-'}
        </span>
      ),
    },
    {
      id: 'batchNo',
      header: 'Batch / S/N / Lot',
      className: 'min-w-[120px]',
      accessor: (tx) => (
        <span className="font-mono text-xs text-app-muted">
          {tx.batchNo || tx.serialNo || tx.lotNo || '-'}
        </span>
      ),
    },
    {
      id: 'process',
      header: t('process'),
      className: 'min-w-[150px]',
      accessor: (tx) => (
        <span className="text-xs text-app-secondary dark:text-app-darkSecondary font-medium truncate max-w-[160px] block">
          {tx.process || '-'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: t('actions'),
      align: 'right',
      className: 'w-16',
      accessor: (tx) => (
        <div className="flex items-center justify-end" onClick={e => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => setSelectedTransaction(tx)}
            className="p-1.5 rounded-lg text-app-secondary hover:text-brand-blue hover:bg-brand-softBlue dark:hover:bg-blue-950/40 transition-colors"
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <PageLayout
      title={t('transaction_log_title')}
      subtitle={t('transaction_log_subtitle')}
      actions={
        <button
          type="button"
          onClick={handleExport}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border border-app-border dark:border-app-darkBorder bg-white dark:bg-app-darkSurface text-app-secondary dark:text-app-darkSecondary hover:text-app-text dark:hover:text-app-darkText shadow-subtle hover:bg-app-bg transition-colors"
        >
          <Download className="w-4 h-4 text-app-muted" />
          <span>{t('export_csv')}</span>
        </button>
      }
    >
      <div className="space-y-4">
        {/* FILTERS TOOLBAR */}
        <div className="p-4 rounded-2xl bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder shadow-subtle space-y-3">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 flex-1">
              {/* Date Range Picker */}
              <DateRangePicker value={dateRange} onChange={handleDateRangeChange} />

              {/* Plant Filter */}
              <FilterSelect
                label={t('plant_filter')}
                value={selectedPlant}
                onChange={handlePlantChange}
                prefixIcon={<Building2 className="w-3.5 h-3.5" />}
                options={[
                  { value: 'All Plants', label: t('all_plants') },
                  { value: 'DEMO', label: 'DEMO' },
                  { value: 'PLANT-01', label: 'PLANT-01' },
                  { value: 'PLANT-02', label: 'PLANT-02' },
                ]}
                className="w-40"
              />

              {/* Transaction Type Filter */}
              <FilterSelect
                label="Type"
                value={selectedType}
                onChange={handleTypeChange}
                prefixIcon={<Filter className="w-3.5 h-3.5" />}
                options={[
                  { value: 'ALL', label: 'All Types' },
                  { value: 'OPENING', label: 'Opening Balance' },
                  { value: 'GR', label: 'Goods Receipt (GR)' },
                  { value: 'GI', label: 'Goods Issue (GI)' },
                  { value: 'ADJUSTMENT', label: 'Adjustment' },
                ]}
                className="w-44"
              />

              {/* User Filter */}
              <FilterSelect
                label="User"
                value={selectedUser}
                onChange={handleUserChange}
                prefixIcon={<UserIcon className="w-3.5 h-3.5" />}
                options={[
                  { value: 'ALL', label: 'All Users' },
                  ...uniqueUsers.map(u => ({ value: u, label: u })),
                ]}
                className="w-36"
              />
            </div>

            {/* Search */}
            <SearchInput
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search Doc#, Code, Batch, S/N, Ref..."
              className="w-full lg:w-72"
            />
          </div>
        </div>

        {/* TRANSACTIONS TABLE */}
        <DataTable
          data={paginatedTransactions}
          columns={tableColumns}
          keyExtractor={(tx) => tx.id}
          onRowClick={(tx) => setSelectedTransaction(tx)}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onSortChange={handleSortChange}
          emptyTitle="No Transactions Found"
          emptyDescription="No stock movements match the specified date range or filter criteria."
          emptyType="transactions"
          pagination={{
            currentPage,
            pageSize,
            totalItems: sortedTransactions.length,
            onPageChange: setCurrentPage,
            onPageSizeChange: setPageSize,
            pageSizeOptions: [10, 20, 50, 100],
          }}
        />
      </div>

      {/* TRANSACTION DETAIL DRAWER */}
      <TransactionDetailDrawer
        isOpen={Boolean(selectedTransaction)}
        onClose={() => setSelectedTransaction(null)}
        transaction={selectedTransaction}
      />
    </PageLayout>
  );
};
