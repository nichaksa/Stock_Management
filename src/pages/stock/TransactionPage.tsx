import React, { useState, useMemo } from 'react';
import { StockTransaction, DateRange } from '../../types/stock';
import { PageLayout } from '../../components/layout/PageLayout';
import { SearchInput } from '../../components/common/SearchInput';
import { FilterSelect } from '../../components/common/FilterSelect';
import { DateRangePicker } from '../../components/common/DateRangePicker';
import { DataTable, Column, SortDirection } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { GoodsReceiptDocumentDrawer } from '../../components/stock/GoodsReceiptDocumentDrawer';
import { GoodsIssueDocumentDrawer } from '../../components/stock/GoodsIssueDocumentDrawer';
import { MaterialTransferDrawer } from '../../components/stock/MaterialTransferDrawer';
import { useStock } from '../../context/StockContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { useCascadingFilters } from '../../hooks/useCascadingFilters';
import { exportTransactionsToCsv } from '../../utils/export';
import { getPresetDateRange, formatDateTime } from '../../utils/dateRange';
import {
  Download,
  Building2,
  Filter,
  User as UserIcon,
  PackagePlus,
  PackageMinus,
  ArrowLeftRight,
  ArrowRight,
  Layers,
  ChevronDown,
  ChevronRight,
  Tag,
  Truck,
  Store,
  Compass,
  FileText,
  Boxes,
  Package,
  RotateCcw,
} from 'lucide-react';

export const getTransactionMovementType = (tx: StockTransaction): 'GR' | 'GI' => {
  if (tx.transactionType === 'GI') return 'GI';
  if (tx.transactionType === 'GR') return 'GR';
  return tx.quantity >= 0 ? 'GR' : 'GI';
};

export const getTransactionSource = (tx: StockTransaction): string => {
  if (
    tx.source === 'Transfer' ||
    tx.documentNo?.startsWith('TR-') ||
    tx.referenceNo?.startsWith('TR-') ||
    Boolean(tx.transferRoute) ||
    (tx.process || '').toLowerCase().includes('transfer')
  ) {
    return 'Transfer';
  }
  if (
    tx.source === 'Material Request' ||
    (tx.process || '').toLowerCase().includes('request') ||
    tx.referenceNo?.startsWith('REQ-') ||
    tx.picklist
  ) {
    return 'Material Request';
  }
  if (
    tx.source === 'Adjustment' ||
    tx.transactionType === 'ADJUSTMENT' ||
    (tx.process || '').toLowerCase().includes('adjust')
  ) {
    return 'Adjustment';
  }
  if (
    tx.source === 'Opening Stock' ||
    tx.transactionType === 'OPENING' ||
    (tx.process || '').toLowerCase().includes('initial') ||
    (tx.process || '').toLowerCase().includes('opening')
  ) {
    return 'Opening Stock';
  }
  if (tx.source && tx.source !== 'ITEM_LEVEL' && tx.source !== 'DOCUMENT_LEVEL') {
    return tx.source;
  }
  return 'Manual';
};

export const TransactionPage: React.FC = () => {
  const { transactions, materials, getLotBalances } = useStock();
  const { t, language } = useLanguage();
  const { addToast } = useToast();
  const { hasPermission } = useAuth();
  const isTh = language === 'th';

  const canGr = hasPermission('GR_CREATE');
  const canGi = hasPermission('GI_CREATE');
  const canTransfer = hasPermission('TRANSFER_CREATE');

  const [dateRange, setDateRange] = useState<DateRange>(() => getPresetDateRange('31_days_ago'));
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL'); // 'ALL' | 'GR' | 'GI'
  const [selectedSource, setSelectedSource] = useState<string>('ALL');
  const [selectedUser, setSelectedUser] = useState('ALL');

  // Cascading Filters (Plant -> SLoc / Store -> Item -> Material -> Lot)
  const {
    selectedPlant,
    setSelectedPlant,
    selectedStore,
    setSelectedStore,
    selectedItem,
    setSelectedItem,
    selectedMaterial,
    setSelectedMaterial,
    selectedLot,
    setSelectedLot,
    plantOptions,
    storeOptions,
    itemOptions,
    materialOptions,
    lotOptions,
    resetAllFilters,
    hasActiveCascadingFilters,
    getItemName,
  } = useCascadingFilters({
    materials,
    transactions,
    lotBalances: getLotBalances(),
    initialPlant: 'All Plants',
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [sortColumn, setSortColumn] = useState<string | null>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Expanded rows for full audit details
  const [expandedRowIds, setExpandedRowIds] = useState<Set<string>>(new Set());

  // Modal / Drawer states
  const [isGrDrawerOpen, setIsGrDrawerOpen] = useState(false);
  const [isGiDrawerOpen, setIsGiDrawerOpen] = useState(false);
  const [isTransferDrawerOpen, setIsTransferDrawerOpen] = useState(false);

  const toggleRowExpansion = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedRowIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

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

  const handleSourceChange = (val: string) => {
    setSelectedSource(val);
    setCurrentPage(1);
  };

  const handleUserChange = (val: string) => {
    setSelectedUser(val);
    setCurrentPage(1);
  };

  // Extract unique users and unique lots
  const uniqueUsers = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach(tx => {
      if (tx.createdBy) set.add(tx.createdBy);
    });
    return Array.from(set);
  }, [transactions]);

  const uniqueLots = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach(tx => {
      const lotVal = tx.lot || tx.lotNo;
      if (lotVal) set.add(lotVal);
    });
    return Array.from(set);
  }, [transactions]);

  // Filter granular lot transactions
  const filteredTransactions = useMemo(() => {
    const startTime = new Date(dateRange.startDate).getTime();
    const endTime = new Date(dateRange.endDate).getTime();

    return transactions.filter(tx => {
      const txTime = new Date(tx.createdAt).getTime();

      // Date Range Filter
      if (txTime < startTime || txTime > endTime) {
        return false;
      }

      // 1. Plant filter
      if (selectedPlant !== 'ALL' && selectedPlant !== 'All Plants' && tx.plant !== selectedPlant) {
        return false;
      }

      // 2. SLoc / Store filter
      if (selectedStore !== 'ALL') {
        const matchStore =
          tx.storageLocation === selectedStore ||
          tx.fromStore === selectedStore ||
          tx.toStore === selectedStore;
        if (!matchStore) return false;
      }

      // 3. Item filter
      if (selectedItem !== 'ALL') {
        const matObj = materials.find(m => m.id === tx.materialId || m.materialCode === tx.materialCode);
        if (matObj) {
          const itemGroup = getItemName(matObj);
          if (itemGroup !== selectedItem) return false;
        }
      }

      // 4. Material filter
      if (selectedMaterial !== 'ALL' && tx.materialCode !== selectedMaterial) {
        return false;
      }

      // 5. Lot filter
      if (selectedLot !== 'ALL' && (tx.lot || tx.lotNo) !== selectedLot) {
        return false;
      }

      // Movement Type filter (strictly GR or GI only)
      const movementType = getTransactionMovementType(tx);
      if (selectedType !== 'ALL' && movementType !== selectedType) {
        return false;
      }

      // Source / Origin filter (Separate filter: Manual, Transfer, Material Request, Adjustment, Opening Stock)
      const sourceVal = getTransactionSource(tx);
      if (selectedSource !== 'ALL' && sourceVal !== selectedSource) {
        return false;
      }

      // User filter
      if (selectedUser !== 'ALL' && tx.createdBy !== selectedUser) {
        return false;
      }

      // Search query across Lot No, Batch No, Doc No, Material Code, Description, User, Supplier, Reference, SLoc, Source
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const lotVal = (tx.lot || tx.lotNo || '').toLowerCase();
        const batchVal = (tx.batchNo || tx.batchNumber || '').toLowerCase();
        const docVal = (tx.documentNo || tx.transactionNumber || '').toLowerCase();
        const matCode = (tx.materialCode || '').toLowerCase();
        const matDesc = (tx.description || '').toLowerCase();
        const userVal = (tx.createdBy || '').toLowerCase();
        const supplierVal = (tx.supplier || '').toLowerCase();
        const refVal = (tx.referenceNo || tx.referenceNumber || '').toLowerCase();
        const commentVal = (tx.comment || '').toLowerCase();
        const locVal = (tx.storageLocation || '').toLowerCase();
        const binVal = (tx.storageBin || '').toLowerCase();
        const srcText = sourceVal.toLowerCase();

        const matches =
          lotVal.includes(query) ||
          batchVal.includes(query) ||
          docVal.includes(query) ||
          matCode.includes(query) ||
          matDesc.includes(query) ||
          userVal.includes(query) ||
          supplierVal.includes(query) ||
          refVal.includes(query) ||
          commentVal.includes(query) ||
          locVal.includes(query) ||
          binVal.includes(query) ||
          srcText.includes(query);

        if (!matches) return false;
      }

      return true;
    });
  }, [transactions, materials, dateRange, selectedPlant, selectedStore, selectedItem, selectedMaterial, selectedLot, selectedType, selectedSource, selectedUser, searchQuery, getItemName]);

  // Sort transactions
  const sortedTransactions = useMemo(() => {
    if (!sortColumn || !sortDirection) return filteredTransactions;

    return [...filteredTransactions].sort((a, b) => {
      let valA: any = (a as any)[sortColumn];
      let valB: any = (b as any)[sortColumn];

      if (sortColumn === 'createdAt') {
        valA = new Date(a.createdAt).getTime();
        valB = new Date(b.createdAt).getTime();
      } else if (sortColumn === 'transactionType') {
        valA = getTransactionMovementType(a);
        valB = getTransactionMovementType(b);
      } else if (sortColumn === 'source') {
        valA = getTransactionSource(a).toLowerCase();
        valB = getTransactionSource(b).toLowerCase();
      } else if (sortColumn === 'lot') {
        valA = (a.lot || a.lotNo || '').toLowerCase();
        valB = (b.lot || b.lotNo || '').toLowerCase();
      } else if (sortColumn === 'batchNo') {
        valA = (a.batchNo || a.batchNumber || '').toLowerCase();
        valB = (b.batchNo || b.batchNumber || '').toLowerCase();
      } else if (sortColumn === 'quantity') {
        valA = a.quantity;
        valB = b.quantity;
      } else if (sortColumn === 'materialCode') {
        valA = (a.materialCode || '').toLowerCase();
        valB = (b.materialCode || '').toLowerCase();
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredTransactions, sortColumn, sortDirection]);

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    let totalMovements = filteredTransactions.length;
    let grQty = 0;
    let giQty = 0;
    let totalVal = 0;

    filteredTransactions.forEach(tx => {
      const type = getTransactionMovementType(tx);
      if (type === 'GR') {
        grQty += Math.abs(tx.quantity);
      } else {
        giQty += Math.abs(tx.quantity);
      }
      totalVal += tx.totalPrice || (Math.abs(tx.quantity) * (tx.pricePerUnit || 0));
    });

    return { totalMovements, grQty, giQty, totalVal };
  }, [filteredTransactions]);

  // Paginated slice
  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedTransactions.slice(startIndex, startIndex + pageSize);
  }, [sortedTransactions, currentPage, pageSize]);

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
    exportTransactionsToCsv(filteredTransactions);
    addToast('Transaction records exported to CSV', 'success');
  };

  // Helper for source badge styling
  const renderSourceBadge = (source: string) => {
    switch (source) {
      case 'Transfer':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 text-[11px] font-medium font-sans">
            <ArrowLeftRight className="w-2.5 h-2.5" />
            Transfer
          </span>
        );
      case 'Material Request':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 text-[11px] font-medium font-sans">
            <FileText className="w-2.5 h-2.5" />
            Request
          </span>
        );
      case 'Adjustment':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 text-[11px] font-medium font-sans">
            Adjustment
          </span>
        );
      case 'Opening Stock':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 text-[11px] font-medium font-sans">
            Opening
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[11px] font-medium font-sans">
            Manual
          </span>
        );
    }
  };

  // Columns definition: Strictly Movement Type (GR/GI) and Source (Origin)
  const tableColumns: Column<StockTransaction>[] = [
    {
      id: 'createdAt',
      header: isTh ? 'วันที่ / เวลา' : 'Date / Time',
      sortable: true,
      className: 'w-[130px] whitespace-nowrap',
      accessor: (tx) => {
        const isExpanded = expandedRowIds.has(tx.id);
        return (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={(e) => toggleRowExpansion(tx.id, e)}
              className="p-1 rounded text-app-muted hover:text-brand-blue hover:bg-app-bg dark:hover:bg-app-darkBorder transition-colors"
              title={isExpanded ? 'Collapse details' : 'Expand details'}
            >
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5 text-brand-blue stroke-[2.5]" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>
            <span className="font-mono text-xs text-app-text dark:text-app-darkText">
              {formatDateTime(tx.createdAt)}
            </span>
          </div>
        );
      },
    },
    {
      id: 'documentNo',
      header: isTh ? 'เลขที่รายการ' : 'Transaction No.',
      sortable: true,
      className: 'min-w-[120px]',
      accessor: (tx) => (
        <span className="font-mono text-xs font-bold text-brand-blue truncate">
          {tx.documentNo || tx.transactionNumber || 'TX-AUTO'}
        </span>
      ),
    },
    {
      id: 'transactionType',
      header: isTh ? 'ประเภท (Type)' : 'Type',
      sortable: true,
      align: 'center',
      className: 'w-[80px]',
      accessor: (tx) => {
        const movementType = getTransactionMovementType(tx);
        return <StatusBadge status={movementType} size="sm" showDot={false} />;
      },
    },
    {
      id: 'source',
      header: isTh ? 'ที่มา (Source)' : 'Source',
      sortable: true,
      align: 'center',
      className: 'w-[110px]',
      accessor: (tx) => renderSourceBadge(getTransactionSource(tx)),
    },
    {
      id: 'materialCode',
      header: isTh ? 'รหัส & รายการพัสดุ' : 'Material Code & Desc',
      sortable: true,
      className: 'min-w-[190px]',
      accessor: (tx) => (
        <div>
          <span className="font-mono font-bold text-xs text-brand-blue block">
            {tx.materialCode}
          </span>
          <p className="text-xs text-app-text dark:text-app-darkText truncate max-w-[200px]">
            {tx.description || '-'}
          </p>
        </div>
      ),
    },
    {
      id: 'lot',
      header: isTh ? 'ล็อต (Lot)' : 'Lot No.',
      sortable: true,
      className: 'min-w-[110px]',
      accessor: (tx) => {
        const lotVal = tx.lot || tx.lotNo || 'LOT-2608-01';
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-brand-blue font-bold border border-blue-200 dark:border-blue-900/60 text-[11px] font-mono">
            <Tag className="w-3 h-3" />
            {lotVal}
          </span>
        );
      },
    },
    {
      id: 'storageLocation',
      header: isTh ? 'สโตร์ (Store)' : 'Store',
      sortable: true,
      className: 'w-[100px]',
      accessor: (tx) => (
        <span className="font-mono font-semibold text-xs text-app-text dark:text-app-darkText">
          {tx.storageLocation || '-'}
        </span>
      ),
    },
    {
      id: 'quantity',
      header: isTh ? 'จำนวน' : 'Qty',
      sortable: true,
      align: 'right',
      className: 'w-[90px] font-mono whitespace-nowrap',
      accessor: (tx) => {
        const isPositive = tx.quantity > 0;
        return (
          <div className="text-right">
            <span
              className={`font-bold text-xs px-2 py-0.5 rounded-md ${isPositive
                  ? 'text-gr bg-green-50 dark:bg-green-950/50 dark:text-green-400'
                  : 'text-gi bg-red-50 dark:bg-red-950/50 dark:text-red-400'
                }`}
            >
              {isPositive ? `+${tx.quantity}` : `${tx.quantity}`}
            </span>
          </div>
        );
      },
    },
    {
      id: 'referenceNo',
      header: isTh ? 'เลขอ้างอิง' : 'Reference',
      sortable: true,
      className: 'min-w-[120px]',
      accessor: (tx) => {
        const ref = tx.referenceNo || tx.referenceNumber;
        if (!ref) return <span className="text-app-muted text-xs">-</span>;
        const isTr = ref.startsWith('TR-');
        return (
          <span className={`font-mono text-xs font-semibold ${isTr ? 'text-purple-600 dark:text-purple-400 font-bold' : 'text-app-secondary dark:text-app-darkSecondary'}`}>
            {ref}
          </span>
        );
      },
    },
    {
      id: 'createdBy',
      header: isTh ? 'ผู้ทำรายการ' : 'User',
      sortable: true,
      className: 'w-[100px] font-mono text-xs text-app-muted truncate',
      accessor: (tx) => (
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full bg-brand-softBlue dark:bg-blue-950 text-brand-blue flex items-center justify-center text-[10px] font-bold shrink-0">
            {(tx.createdBy || 'U').charAt(0).toUpperCase()}
          </div>
          <span className="truncate max-w-[80px] font-medium">{tx.createdBy}</span>
        </div>
      ),
    },
  ];

  return (
    <PageLayout
      title={isTh ? 'บันทึกรายการเคลื่อนไหว (Transaction Ledger)' : 'Stock Transaction Log'}
      subtitle={
        isTh
          ? 'ประวัติรายการเคลื่อนไหวสต็อก (Movement Type: GR / GI) พร้อมแยกหมวดหมู่ Source / Origin'
          : 'Unified GR & GI movement ledger with traceable Source origins (Manual, Transfer, Material Request).'
      }
      actions={
        <div className="flex items-center gap-2">
          {/* + GR Button */}
          <button
            type="button"
            onClick={() => setIsGrDrawerOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-gr hover:bg-green-700 active:scale-95 text-white shadow-subtle transition-all"
            title={isTh ? 'รับสินค้าเข้าคลัง (Goods Receipt)' : 'Goods Receipt'}
          >
            <PackagePlus className="w-4 h-4" />
            <span>GR</span>
          </button>

          {/* - GI Button */}
          <button
            type="button"
            onClick={() => setIsGiDrawerOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-gi hover:bg-red-700 active:scale-95 text-white shadow-subtle transition-all"
            title={isTh ? 'เบิกจ่ายสินค้า (Goods Issue)' : 'Goods Issue'}
          >
            <PackageMinus className="w-4 h-4" />
            <span>GI</span>
          </button>

          {/* ⇄ Transfer Button */}
          <button
            type="button"
            onClick={() => setIsTransferDrawerOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-95 text-white shadow-subtle transition-all"
            title={isTh ? 'โอนย้ายสต็อกระหว่างสโตร์ (Store Transfer)' : 'Store Transfer'}
          >
            <ArrowLeftRight className="w-4 h-4" />
            <span>Transfer</span>
          </button>

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
        {/* SUMMARY KPI CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder shadow-subtle">
            <span className="text-[10px] font-bold uppercase tracking-wider text-app-muted block">
              {isTh ? 'รายการเคลื่อนไหวทั้งหมด' : 'Total Movements'}
            </span>
            <div className="text-xl sm:text-2xl font-bold font-mono text-brand-blue mt-1">
              {summaryMetrics.totalMovements}
            </div>
            <span className="text-[10px] text-brand-blue font-medium mt-0.5 block">
              Movement Records
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder shadow-subtle">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gr block">
              {isTh ? 'รับเข้าทั้งหมด (+GR)' : 'Total Received (+GR)'}
            </span>
            <div className="text-xl sm:text-2xl font-bold font-mono text-gr mt-1">
              +{summaryMetrics.grQty}
            </div>
            <span className="text-[10px] text-app-muted font-medium mt-0.5 block">
              Inward Stock Units
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder shadow-subtle">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gi block">
              {isTh ? 'เบิกจ่ายทั้งหมด (-GI)' : 'Total Issued (-GI)'}
            </span>
            <div className="text-xl sm:text-2xl font-bold font-mono text-gi mt-1">
              -{summaryMetrics.giQty}
            </div>
            <span className="text-[10px] text-app-muted font-medium mt-0.5 block">
              Outward Stock Units
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder shadow-subtle">
            <span className="text-[10px] font-bold uppercase tracking-wider text-app-muted block">
              {isTh ? 'มูลค่าหมุนเวียนรวม' : 'Total Valuation'}
            </span>
            <div className="text-xl sm:text-2xl font-bold font-mono text-app-text dark:text-app-darkText mt-1">
              ฿{summaryMetrics.totalVal.toLocaleString()}
            </div>
            <span className="text-[10px] text-app-muted font-medium mt-0.5 block">
              Ledger Valuation
            </span>
          </div>
        </div>

        {/* FILTERS TOOLBAR */}
        <div className="p-4 rounded-2xl bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder shadow-subtle space-y-3">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 flex-1">
              {/* Date Range Picker */}
              <DateRangePicker value={dateRange} onChange={handleDateRangeChange} />

              {/* 1. Plant Filter */}
              <FilterSelect
                label={t('plant_filter')}
                value={selectedPlant}
                onChange={handlePlantChange}
                prefixIcon={<Building2 className="w-3.5 h-3.5 text-brand-blue" />}
                options={plantOptions}
                className="w-36"
              />

              {/* 2. SLoc / Store Filter (Cascaded) */}
              <FilterSelect
                label={isTh ? 'คลัง (SLoc)' : 'Store'}
                value={selectedStore}
                onChange={setSelectedStore}
                prefixIcon={<Store className="w-3.5 h-3.5 text-purple-600" />}
                options={storeOptions}
                className="w-36"
              />

              {/* 3. Item Filter (Cascaded) */}
              <FilterSelect
                label={isTh ? 'พัสดุ (Item)' : 'Item'}
                value={selectedItem}
                onChange={setSelectedItem}
                prefixIcon={<Package className="w-3.5 h-3.5 text-amber-600" />}
                options={itemOptions}
                className="w-40"
              />

              {/* 4. Material Filter (Cascaded) */}
              <FilterSelect
                label={isTh ? 'รหัส (Material)' : 'Material'}
                value={selectedMaterial}
                onChange={setSelectedMaterial}
                prefixIcon={<Boxes className="w-3.5 h-3.5 text-emerald-600" />}
                options={materialOptions}
                className="w-44"
              />

              {/* 5. Lot Filter (Cascaded) */}
              <FilterSelect
                label="Lot"
                value={selectedLot}
                onChange={setSelectedLot}
                prefixIcon={<Layers className="w-3.5 h-3.5 text-purple-600" />}
                options={lotOptions}
                className="w-36"
              />

              {/* Movement Type Filter: Strictly GR / GI */}
              <FilterSelect
                label="Type"
                value={selectedType}
                onChange={handleTypeChange}
                prefixIcon={<Filter className="w-3.5 h-3.5" />}
                options={[
                  { value: 'ALL', label: 'All Types (GR/GI)' },
                  { value: 'GR', label: 'GR — Goods Receipt' },
                  { value: 'GI', label: 'GI — Goods Issue' },
                ]}
                className="w-36"
              />

              {/* Separate Source / Origin Filter */}
              <FilterSelect
                label="Source"
                value={selectedSource}
                onChange={handleSourceChange}
                prefixIcon={<Compass className="w-3.5 h-3.5" />}
                options={[
                  { value: 'ALL', label: 'All Sources' },
                  { value: 'Manual', label: 'Manual' },
                  { value: 'Transfer', label: 'Transfer' },
                  { value: 'Material Request', label: 'Material Request' },
                  { value: 'Adjustment', label: 'Adjustment' },
                  { value: 'Opening Stock', label: 'Opening Stock' },
                ]}
                className="w-40"
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

              {/* Reset Cascading Filters Button */}
              {hasActiveCascadingFilters && (
                <button
                  type="button"
                  onClick={() => {
                    resetAllFilters();
                    setCurrentPage(1);
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-app-border dark:border-app-darkBorder text-xs text-app-muted hover:text-brand-blue hover:border-brand-blue/40 transition-colors"
                  title="Clear Cascading Filters"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Clear Filters</span>
                </button>
              )}
            </div>

            {/* Search */}
            <SearchInput
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search Lot, Code, Doc#, Ref..."
              className="w-full lg:w-64"
            />
          </div>
        </div>

        {/* TRANSACTION TABLE */}
        <DataTable
          data={paginatedTransactions}
          columns={tableColumns}
          keyExtractor={(tx) => tx.id}
          expandedRowIds={expandedRowIds}
          renderExpandedRow={(tx) => {
            const movementType = getTransactionMovementType(tx);
            const source = getTransactionSource(tx);
            const isTransfer = source === 'Transfer';
            const isGi = movementType === 'GI';

            if (isTransfer) {
              const transferRef = tx.referenceNo || tx.referenceNumber || tx.documentNo;
              const sourceStore = tx.fromStore || (isGi ? tx.storageLocation : '-');
              const destStore = tx.toStore || (!isGi ? tx.storageLocation : '-');

              return (
                <div className="p-4 bg-purple-50/40 dark:bg-purple-950/20 rounded-xl border border-purple-200/80 dark:border-purple-900/50 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2.5 border-b border-purple-200 dark:border-purple-900/60 gap-2">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={movementType} size="sm" showDot={false} />
                      <span className="px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 font-semibold text-xs border border-purple-200 dark:border-purple-800">
                        Source: <strong>Transfer</strong>
                      </span>
                      <span className="font-mono text-xs text-app-muted">
                        · Reference: <strong className="text-purple-600 dark:text-purple-400 font-bold">{transferRef}</strong>
                      </span>
                    </div>
                    <span className="text-[11px] text-app-muted font-mono">
                      Recorded: {formatDateTime(tx.createdAt)} by <strong className="text-app-text dark:text-app-darkText">{tx.createdBy}</strong>
                    </span>
                  </div>

                  {/* Transfer Movement Card */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-white dark:bg-app-darkSurface border border-slate-200 dark:border-slate-800 space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-app-muted block">
                        Movement Specifications
                      </span>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-app-muted block text-[11px]">Movement Type:</span>
                          <span className="font-bold text-app-text dark:text-app-darkText font-mono">
                            {movementType} ({isGi ? 'Outbound Issue' : 'Inbound Receipt'})
                          </span>
                        </div>
                        <div>
                          <span className="text-app-muted block text-[11px]">Source / Origin:</span>
                          <span className="font-bold text-purple-600 font-mono">Transfer</span>
                        </div>
                        <div>
                          <span className="text-app-muted block text-[11px]">Material Code:</span>
                          <span className="font-mono font-bold text-brand-blue">{tx.materialCode}</span>
                        </div>
                        <div>
                          <span className="text-app-muted block text-[11px]">Plant:</span>
                          <span className="font-semibold text-app-text dark:text-app-darkText">{tx.plant}</span>
                        </div>
                        <div>
                          <span className="text-app-muted block text-[11px]">Current Store:</span>
                          <span className="font-mono font-bold text-app-text dark:text-app-darkText">{tx.storageLocation}</span>
                        </div>
                        <div>
                          <span className="text-app-muted block text-[11px]">Quantity:</span>
                          <span className={`font-mono font-bold ${isGi ? 'text-gi' : 'text-gr'}`}>
                            {isGi ? `${tx.quantity} Units` : `+${tx.quantity} Units`}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-white dark:bg-app-darkSurface border border-purple-200 dark:border-purple-900/60 space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 block">
                        {isGi ? 'Transfer Destination & Balance' : 'Transfer Origin & Balance'}
                      </span>
                      <div className="text-xs space-y-1.5 pt-0.5">
                        {isGi ? (
                          <div className="flex justify-between">
                            <span className="text-app-muted">Transfer To (Destination Store):</span>
                            <strong className="text-purple-600 font-mono">{destStore}</strong>
                          </div>
                        ) : (
                          <div className="flex justify-between">
                            <span className="text-app-muted">Transfer From (Source Store):</span>
                            <strong className="text-purple-600 font-mono">{sourceStore}</strong>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-app-muted">Transfer Reference:</span>
                          <strong className="font-mono text-app-text dark:text-app-darkText">{transferRef}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-app-muted">Store Balance Progression:</span>
                          <span className="font-mono font-bold text-app-text dark:text-app-darkText">
                            {tx.balanceBefore} ➔ {tx.balanceAfter} Units
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-app-muted">Preserved Lot No.:</span>
                          <span className="font-mono font-bold text-brand-blue">{tx.lot || tx.lotNo || '-'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div className="p-4 bg-slate-50/90 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={movementType} size="sm" />
                    {renderSourceBadge(source)}
                    <span className="font-mono font-bold text-xs text-brand-blue">
                      {tx.documentNo || tx.transactionNumber || 'TX-AUTO'}
                    </span>
                    <span className="font-mono text-xs text-app-muted">· Lot: <strong>{tx.lot || tx.lotNo || 'LOT-2608-01'}</strong></span>
                  </div>
                  <span className="text-[11px] text-app-muted font-mono">
                    Recorded: {formatDateTime(tx.createdAt)} by <strong className="text-app-text dark:text-app-darkText">{tx.createdBy}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                  <div className="bg-white dark:bg-app-darkSurface p-2.5 rounded-lg border border-slate-200 dark:border-slate-700/80">
                    <span className="text-app-muted block text-[10px] uppercase font-bold">Source / Origin</span>
                    <span className="font-mono font-bold text-app-text dark:text-app-darkText">
                      {source}
                    </span>
                  </div>

                  <div className="bg-white dark:bg-app-darkSurface p-2.5 rounded-lg border border-slate-200 dark:border-slate-700/80">
                    <span className="text-app-muted block text-[10px] uppercase font-bold">Balance Progression</span>
                    <span className="font-mono font-bold text-app-text dark:text-app-darkText">
                      {tx.balanceBefore} → {tx.balanceAfter} Units
                    </span>
                  </div>

                  <div className="bg-white dark:bg-app-darkSurface p-2.5 rounded-lg border border-slate-200 dark:border-slate-700/80">
                    <span className="text-app-muted block text-[10px] uppercase font-bold">Storage Location</span>
                    <span className="font-mono text-app-text dark:text-app-darkText">
                      {tx.storageLocation || '-'} / {tx.storageBin || '-'}
                    </span>
                  </div>

                  <div className="bg-white dark:bg-app-darkSurface p-2.5 rounded-lg border border-slate-200 dark:border-slate-700/80">
                    <span className="text-app-muted block text-[10px] uppercase font-bold">Reference No.</span>
                    <span className="font-mono text-app-text dark:text-app-darkText">
                      {tx.referenceNo || tx.referenceNumber || '-'}
                    </span>
                  </div>
                </div>

                {/* Supplier and Comment */}
                {(tx.supplier || tx.comment) && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
                    {tx.supplier && (
                      <div>
                        <span className="text-app-muted block text-[10px] uppercase font-bold flex items-center gap-1">
                          <Truck className="w-3 h-3 text-app-muted" /> Supplier
                        </span>
                        <p className="font-medium text-app-text dark:text-app-darkText">{tx.supplier}</p>
                      </div>
                    )}

                    {tx.comment && (
                      <div className="col-span-1 sm:col-span-2">
                        <span className="text-app-muted block text-[10px] uppercase font-bold">Remarks / Comment</span>
                        <p className="text-app-text dark:text-app-darkText bg-white dark:bg-app-darkSurface p-2 rounded-lg border border-slate-200 dark:border-slate-700/80 mt-0.5">
                          {tx.comment}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          }}
          onRowClick={(tx) => toggleRowExpansion(tx.id)}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onSortChange={handleSortChange}
          emptyTitle="No Transactions Found"
          emptyDescription="No goods receipt or goods issue records match the specified date range or filter criteria."
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

      {/* MATERIAL TRANSFER CREATION DRAWER */}
      <MaterialTransferDrawer
        isOpen={isTransferDrawerOpen}
        onClose={() => setIsTransferDrawerOpen(false)}
      />
    </PageLayout>
  );
};
