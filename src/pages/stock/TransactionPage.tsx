import React, { useState, useMemo } from 'react';
import { TransactionDocument, TransactionType, DateRange } from '../../types/stock';
import { PageLayout } from '../../components/layout/PageLayout';
import { SearchInput } from '../../components/common/SearchInput';
import { FilterSelect } from '../../components/common/FilterSelect';
import { DateRangePicker } from '../../components/common/DateRangePicker';
import { DataTable, Column, SortDirection } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { GoodsReceiptDocumentDrawer } from '../../components/stock/GoodsReceiptDocumentDrawer';
import { GoodsIssueDocumentDrawer } from '../../components/stock/GoodsIssueDocumentDrawer';
import { TransactionDocumentDetailDrawer } from '../../components/stock/TransactionDocumentDetailDrawer';
import { useStock } from '../../context/StockContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { exportTransactionsToCsv } from '../../utils/export';
import { getPresetDateRange, formatDateTime } from '../../utils/dateRange';
import {
  Download,
  Building2,
  Filter,
  User as UserIcon,
  PackagePlus,
  PackageMinus,
  Eye,
  FileText,
  Layers,
} from 'lucide-react';

export const TransactionPage: React.FC = () => {
  const { transactionDocuments, transactions } = useStock();
  const { t, language } = useLanguage();
  const { addToast } = useToast();
  const { hasPermission } = useAuth();
  const isTh = language === 'th';

  const canGr = hasPermission('GR_CREATE');
  const canGi = hasPermission('GI_CREATE');

  const [dateRange, setDateRange] = useState<DateRange>(() => getPresetDateRange('31_days_ago'));
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlant, setSelectedPlant] = useState('All Plants');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedUser, setSelectedUser] = useState('ALL');

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [sortColumn, setSortColumn] = useState<string | null>('createdDateTime');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Modal / Drawer states
  const [isGrDrawerOpen, setIsGrDrawerOpen] = useState(false);
  const [isGiDrawerOpen, setIsGiDrawerOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<TransactionDocument | null>(null);

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
    transactionDocuments.forEach(d => set.add(d.createdBy));
    return Array.from(set);
  }, [transactionDocuments]);

  // Filter transaction documents
  const filteredDocuments = useMemo(() => {
    const startTime = new Date(dateRange.startDate).getTime();
    const endTime = new Date(dateRange.endDate).getTime();

    return transactionDocuments.filter(doc => {
      const docTime = new Date(doc.createdDateTime).getTime();

      // Date Range Filter
      if (docTime < startTime || docTime > endTime) {
        return false;
      }

      // Plant filter
      if (selectedPlant !== 'All Plants' && doc.plant !== selectedPlant) {
        return false;
      }

      // Type filter
      if (selectedType !== 'ALL' && doc.transactionType !== selectedType) {
        return false;
      }

      // User filter
      if (selectedUser !== 'ALL' && doc.createdBy !== selectedUser) {
        return false;
      }

      // Search query across TransactionNumber, Reference, PR ID, User, Comment, or Material Items
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesHeader =
          doc.transactionNumber.toLowerCase().includes(query) ||
          doc.referenceNumber?.toLowerCase().includes(query) ||
          doc.prId?.toLowerCase().includes(query) ||
          doc.picklist?.toLowerCase().includes(query) ||
          doc.createdBy.toLowerCase().includes(query) ||
          doc.comment?.toLowerCase().includes(query);

        const matchesItems = doc.items.some(item =>
          item.materialCode.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query) ||
          item.batchNumber?.toLowerCase().includes(query) ||
          item.serialNumber?.toLowerCase().includes(query) ||
          item.lot?.toLowerCase().includes(query)
        );

        if (!matchesHeader && !matchesItems) return false;
      }

      return true;
    });
  }, [transactionDocuments, dateRange, selectedPlant, selectedType, selectedUser, searchQuery]);

  // Sort transaction documents
  const sortedDocuments = useMemo(() => {
    if (!sortColumn || !sortDirection) return filteredDocuments;

    return [...filteredDocuments].sort((a, b) => {
      let valA: any = (a as any)[sortColumn];
      let valB: any = (b as any)[sortColumn];

      if (sortColumn === 'createdDateTime') {
        valA = new Date(a.createdDateTime).getTime();
        valB = new Date(b.createdDateTime).getTime();
      } else if (sortColumn === 'totalQuantity') {
        valA = a.totalQuantity;
        valB = b.totalQuantity;
      } else if (sortColumn === 'totalValue') {
        valA = a.totalValue;
        valB = b.totalValue;
      } else if (sortColumn === 'itemCount') {
        valA = a.items.length;
        valB = b.items.length;
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredDocuments, sortColumn, sortDirection]);

  // Paginated slice
  const paginatedDocuments = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedDocuments.slice(startIndex, startIndex + pageSize);
  }, [sortedDocuments, currentPage, pageSize]);

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
    exportTransactionsToCsv(transactions);
    addToast('All stock movement records exported to CSV', 'success');
  };

  // Document-level Columns Definition
  const tableColumns: Column<TransactionDocument>[] = [
    {
      id: 'transactionNumber',
      header: isTh ? 'เลขที่เอกสาร' : 'Transaction No.',
      sortable: true,
      className: 'min-w-[140px]',
      accessor: (doc) => (
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full shrink-0 ${
              doc.transactionType === 'GR'
                ? 'bg-gr'
                : doc.transactionType === 'GI'
                ? 'bg-gi'
                : doc.transactionType === 'OPENING'
                ? 'bg-brand-blue'
                : 'bg-purple-600'
            }`}
          />
          <span className="font-mono font-bold text-xs text-brand-blue">
            {doc.transactionNumber}
          </span>
        </div>
      ),
    },
    {
      id: 'transactionType',
      header: isTh ? 'ประเภท' : 'Type',
      sortable: true,
      className: 'w-[100px]',
      accessor: (doc) => <StatusBadge status={doc.transactionType} size="sm" />,
    },
    {
      id: 'plant',
      header: isTh ? 'โรงงาน' : 'Plant',
      sortable: true,
      className: 'w-[110px]',
      accessor: (doc) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#F4F6F8] dark:bg-slate-800 text-[#344054] dark:text-slate-200 text-xs font-mono font-medium">
          {doc.plant}
        </span>
      ),
    },
    {
      id: 'referenceNumber',
      header: isTh ? 'เลขอ้างอิง / PR / PL' : 'Reference / PR / PL',
      sortable: true,
      className: 'min-w-[140px]',
      accessor: (doc) => (
        <div className="font-mono text-xs">
          {doc.referenceNumber && (
            <span className="text-app-text dark:text-app-darkText font-semibold block">
              {doc.referenceNumber}
            </span>
          )}
          {doc.prId && (
            <span className="text-[11px] text-app-muted block">
              PR: {doc.prId}
            </span>
          )}
          {doc.picklist && (
            <span className="text-[11px] text-app-muted block">
              PL: {doc.picklist}
            </span>
          )}
          {!doc.referenceNumber && !doc.prId && !doc.picklist && (
            <span className="text-app-muted">-</span>
          )}
        </div>
      ),
    },
    {
      id: 'itemCount',
      header: isTh ? 'จำนวนรายการ' : 'Items',
      align: 'center',
      sortable: true,
      className: 'w-[100px]',
      accessor: (doc) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono font-semibold bg-app-bg dark:bg-app-darkBg text-app-secondary dark:text-app-darkSecondary border border-app-border dark:border-app-darkBorder">
          {doc.items.length} {doc.items.length === 1 ? 'Line' : 'Lines'}
        </span>
      ),
    },
    {
      id: 'totalQuantity',
      header: isTh ? 'จำนวนรวม' : 'Total Qty',
      align: 'right',
      sortable: true,
      className: 'min-w-[110px]',
      accessor: (doc) => {
        const isGr = doc.transactionType === 'GR' || doc.transactionType === 'OPENING';
        const isGi = doc.transactionType === 'GI';

        return (
          <div className="text-right font-mono font-bold text-xs">
            <span
              className={
                isGr ? 'text-gr' : isGi ? 'text-gi' : 'text-app-text dark:text-app-darkText'
              }
            >
              {isGr ? `+${doc.totalQuantity}` : isGi ? `-${doc.totalQuantity}` : doc.totalQuantity}
            </span>{' '}
            <span className="text-[11px] font-normal text-app-muted">Units</span>
          </div>
        );
      },
    },
    {
      id: 'totalValue',
      header: isTh ? 'มูลค่ารวม' : 'Total Value',
      align: 'right',
      sortable: true,
      className: 'min-w-[120px]',
      accessor: (doc) => (
        <span className="font-mono font-bold text-xs text-app-text dark:text-app-darkText">
          ฿{doc.totalValue.toLocaleString()}
        </span>
      ),
    },
    {
      id: 'createdDateTime',
      header: isTh ? 'วันที่บันทึก' : 'Created Date',
      sortable: true,
      className: 'min-w-[140px]',
      accessor: (doc) => (
        <span className="font-mono text-xs text-app-muted whitespace-nowrap">
          {formatDateTime(doc.createdDateTime)}
        </span>
      ),
    },
    {
      id: 'createdBy',
      header: isTh ? 'ผู้บันทึก' : 'Created By',
      sortable: true,
      className: 'min-w-[120px]',
      accessor: (doc) => (
        <div className="flex items-center gap-1.5 text-xs text-app-secondary dark:text-app-darkSecondary">
          <div className="w-5 h-5 rounded-full bg-brand-softBlue dark:bg-blue-950 text-brand-blue flex items-center justify-center text-[10px] font-bold">
            {doc.createdBy.charAt(0).toUpperCase()}
          </div>
          <span className="truncate max-w-[110px] font-medium">{doc.createdBy}</span>
        </div>
      ),
    },
    {
      id: 'status',
      header: isTh ? 'สถานะ' : 'Status',
      align: 'center',
      className: 'w-[100px]',
      accessor: (doc) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
          {doc.status || 'COMPLETED'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: isTh ? 'การกระทำ' : 'Actions',
      align: 'right',
      className: 'w-16',
      accessor: (doc) => (
        <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => setSelectedDocument(doc)}
            className="p-1.5 rounded-lg text-app-secondary hover:text-brand-blue hover:bg-brand-softBlue dark:hover:bg-blue-950/40 transition-colors"
            title="View Document Details"
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
      subtitle={
        isTh
          ? 'ประวัติเอกสารการรับเข้า (GR) และการเบิกจ่าย (GI) พร้อมระบบการตรวจสอบย้อนกลับแบบหลายรายการ'
          : 'Document-level audit trail of Goods Receipts (GR) and Goods Issues (GI) across all plants.'
      }
      actions={
        <div className="flex items-center gap-2">
          {/* + GR Button */}
          {canGr && (
            <button
              type="button"
              onClick={() => setIsGrDrawerOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-gr hover:bg-green-700 active:scale-95 text-white shadow-subtle transition-all"
            >
              <PackagePlus className="w-4 h-4" />
              <span>+ GR — Goods Receipt</span>
            </button>
          )}

          {/* - GI Button */}
          {canGi && (
            <button
              type="button"
              onClick={() => setIsGiDrawerOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-gi hover:bg-red-700 active:scale-95 text-white shadow-subtle transition-all"
            >
              <PackageMinus className="w-4 h-4" />
              <span>- GI — Goods Issue</span>
            </button>
          )}

          {/* Export CSV Button */}
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border border-app-border dark:border-app-darkBorder bg-white dark:bg-app-darkSurface text-app-secondary dark:text-app-darkSecondary hover:text-app-text dark:hover:text-app-darkText shadow-subtle hover:bg-app-bg transition-colors"
          >
            <Download className="w-4 h-4 text-app-muted" />
            <span>{t('export_csv')}</span>
          </button>
        </div>
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
                  { value: 'GR', label: 'GR' },
                  { value: 'GI', label: 'GI' },
                ]}
                className="w-36"
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
              placeholder="Search Doc#, Code, PR, PO, User..."
              className="w-full lg:w-72"
            />
          </div>
        </div>

        {/* DOCUMENT-LEVEL TRANSACTIONS TABLE */}
        <DataTable
          data={paginatedDocuments}
          columns={tableColumns}
          keyExtractor={(doc) => doc.id}
          onRowClick={(doc) => setSelectedDocument(doc)}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onSortChange={handleSortChange}
          emptyTitle="No Transaction Documents Found"
          emptyDescription="No goods receipt or goods issue documents match the specified date range or filter criteria."
          emptyType="transactions"
          pagination={{
            currentPage,
            pageSize,
            totalItems: sortedDocuments.length,
            onPageChange: setCurrentPage,
            onPageSizeChange: setPageSize,
            pageSizeOptions: [10, 20, 50, 100],
          }}
        />
      </div>

      {/* GOODS RECEIPT DOCUMENT CREATION DRAWER */}
      <GoodsReceiptDocumentDrawer
        isOpen={isGrDrawerOpen}
        onClose={() => setIsGrDrawerOpen(false)}
      />

      {/* GOODS ISSUE DOCUMENT CREATION DRAWER */}
      <GoodsIssueDocumentDrawer
        isOpen={isGiDrawerOpen}
        onClose={() => setIsGiDrawerOpen(false)}
      />

      {/* TRANSACTION DOCUMENT DETAIL DRAWER */}
      <TransactionDocumentDetailDrawer
        isOpen={Boolean(selectedDocument)}
        onClose={() => setSelectedDocument(null)}
        document={selectedDocument}
      />
    </PageLayout>
  );
};
