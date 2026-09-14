import React, { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { MaterialRequest, MaterialRequestStatus } from '../../types/stock';
import { PageLayout } from '../../components/layout/PageLayout';
import { SearchInput } from '../../components/common/SearchInput';
import { FilterSelect } from '../../components/common/FilterSelect';
import { DataTable, Column, SortDirection } from '../../components/common/DataTable';
import { RequestDetailDrawer } from '../../components/stock/RequestDetailDrawer';
import { useStock } from '../../context/StockContext';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { getCurrentStock } from '../../utils/stockCalculation';
import { useCascadingFilters } from '../../hooks/useCascadingFilters';
import {
  ShieldCheck,
  Clock,
  FileCheck2,
  CheckCircle2,
  PackageCheck,
  XCircle,
  Eye,
  AlertTriangle,
  Building2,
  Tag,
  ShoppingCart,
  Package,
  Sliders,
  RotateCcw,
  ArrowRight,
  Flame,
  Boxes,
  Layers,
  Check,
  Calendar,
  Sparkles,
  ClipboardList,
  ChevronRight,
  CheckSquare,
} from 'lucide-react';

export const StoreApprovalPage: React.FC = () => {
  const location = useLocation();
  const { materialRequests, materials, transactions, getLotBalances } = useStock();
  const { currentUser } = useAuth();
  const { t, language } = useLanguage();
  const isTh = language === 'th';

  // Workstream view mode: 'ALL' | 'MR' | 'PR'
  const [activeWorkstream, setActiveWorkstream] = useState<'ALL' | 'MR' | 'PR'>('ALL');

  // Selected Request & Detail Drawer
  const [selectedRequest, setSelectedRequest] = useState<MaterialRequest | null>(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);

  // Auto open request if navigated from Store Approval notification
  useEffect(() => {
    const state = location.state as { openRequestId?: string; requestNo?: string } | null;
    if (state?.openRequestId || state?.requestNo) {
      const target = materialRequests.find(
        r => r.id === state.openRequestId || r.requestNo === state.requestNo
      );
      if (target) {
        setSelectedRequest(target);
        setIsDetailDrawerOpen(true);
        if (target.requestType === 'PURCHASE_REQUISITION') {
          setActiveWorkstream('PR');
        } else {
          setActiveWorkstream('MR');
        }
      }
    }
  }, [location.state, materialRequests]);

  // =========================================================================
  // 1. KPI SUMMARY & METRICS (Dual Workstream Relationships)
  // =========================================================================
  const stats = useMemo(() => {
    const mrList = materialRequests.filter(
      r => (r.requestType || 'MATERIAL_REQUEST') === 'MATERIAL_REQUEST'
    );
    const prList = materialRequests.filter(
      r => r.requestType === 'PURCHASE_REQUISITION'
    );

    const mrPending = mrList.filter(
      r => r.status === 'PENDING_APPROVAL' || r.status === 'STORE_REVIEW'
    ).length;
    const mrReadyToIssue = mrList.filter(
      r => r.status === 'APPROVED' || r.status === 'PARTIALLY_ISSUED'
    ).length;
    const mrIssued = mrList.filter(r => r.status === 'ISSUED').length;

    const prPending = prList.filter(
      r => r.status === 'PENDING_APPROVAL' || r.status === 'STORE_REVIEW'
    ).length;
    const prProceeded = prList.filter(r => r.status === 'PROCEEDED_PURCHASING').length;
    const prRejected = prList.filter(r => r.status === 'REJECTED').length;

    const totalActionRequired = mrPending + prPending;

    return {
      totalActionRequired,
      mr: {
        total: mrList.length,
        pending: mrPending,
        readyToIssue: mrReadyToIssue,
        issued: mrIssued,
      },
      pr: {
        total: prList.length,
        pending: prPending,
        proceeded: prProceeded,
        rejected: prRejected,
      },
    };
  }, [materialRequests]);

  // =========================================================================
  // 2. SECTION 1: MATERIAL REQUEST (Stock Issue) STATE & FILTERS
  // =========================================================================
  const [mrSearch, setMrSearch] = useState('');
  const [mrStatusFilter, setMrStatusFilter] = useState<string>('ALL'); // 'ALL' | 'ACTIONABLE' | 'PENDING' | 'APPROVED' | 'PARTIALLY_ISSUED' | 'ISSUED' | 'REJECTED'
  const [mrCurrentPage, setMrCurrentPage] = useState(1);
  const [mrPageSize, setMrPageSize] = useState(10);
  const [mrSortColumn, setMrSortColumn] = useState<string | null>('createdAt');
  const [mrSortDirection, setMrSortDirection] = useState<SortDirection>('desc');

  const mrCascading = useCascadingFilters({
    materials,
    transactions,
    lotBalances: getLotBalances(),
    initialPlant: 'ALL',
  });

  const mrFilteredList = useMemo(() => {
    return materialRequests.filter(r => {
      if ((r.requestType || 'MATERIAL_REQUEST') !== 'MATERIAL_REQUEST') return false;

      // Status filter
      if (mrStatusFilter === 'ACTIONABLE') {
        if (
          r.status !== 'PENDING_APPROVAL' &&
          r.status !== 'STORE_REVIEW' &&
          r.status !== 'APPROVED' &&
          r.status !== 'PARTIALLY_ISSUED'
        ) {
          return false;
        }
      } else if (mrStatusFilter === 'PENDING') {
        if (r.status !== 'PENDING_APPROVAL' && r.status !== 'STORE_REVIEW') return false;
      } else if (mrStatusFilter !== 'ALL' && r.status !== mrStatusFilter) {
        return false;
      }

      // Cascading filters
      if (mrCascading.selectedPlant !== 'ALL' && r.plant !== mrCascading.selectedPlant) {
        return false;
      }

      if (mrCascading.selectedStore !== 'ALL') {
        const hasStore = r.items.some(it => {
          const mat = materials.find(m => m.id === it.materialId || m.materialCode === it.materialCode);
          const s = it.storageLocation || mat?.storageLocation || 'MAIN';
          return s === mrCascading.selectedStore;
        });
        if (!hasStore) return false;
      }

      if (mrCascading.selectedItem !== 'ALL') {
        const hasItem = r.items.some(it => {
          const mat = materials.find(m => m.id === it.materialId || m.materialCode === it.materialCode);
          return mat && mrCascading.getItemName(mat) === mrCascading.selectedItem;
        });
        if (!hasItem) return false;
      }

      if (mrCascading.selectedMaterial !== 'ALL') {
        const hasMat = r.items.some(
          it => it.materialCode === mrCascading.selectedMaterial || it.materialId === mrCascading.selectedMaterial
        );
        if (!hasMat) return false;
      }

      if (mrCascading.selectedLot !== 'ALL') {
        const hasLot = r.items.some(
          it => it.lot === mrCascading.selectedLot || it.batchNumber === mrCascading.selectedLot
        );
        if (!hasLot) return false;
      }

      // Search Query
      if (mrSearch.trim()) {
        const q = mrSearch.toLowerCase().trim();
        const matchNo = r.requestNo.toLowerCase().includes(q);
        const matchTitle = r.title.toLowerCase().includes(q);
        const matchRequester = r.requesterName.toLowerCase().includes(q);
        const matchDept = r.department.toLowerCase().includes(q);
        const matchItems = r.items.some(
          it => it.materialCode.toLowerCase().includes(q) || it.description.toLowerCase().includes(q)
        );
        return matchNo || matchTitle || matchRequester || matchDept || matchItems;
      }

      return true;
    });
  }, [materialRequests, mrStatusFilter, mrCascading.selectedPlant, mrCascading.selectedStore, mrCascading.selectedItem, mrCascading.selectedMaterial, mrCascading.selectedLot, mrSearch, materials, mrCascading]);

  const mrSortedList = useMemo(() => {
    if (!mrSortColumn || !mrSortDirection) return mrFilteredList;

    return [...mrFilteredList].sort((a, b) => {
      let valA: any = (a as any)[mrSortColumn];
      let valB: any = (b as any)[mrSortColumn];

      if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = (valB || '').toLowerCase();
      }

      if (valA < valB) return mrSortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return mrSortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [mrFilteredList, mrSortColumn, mrSortDirection]);

  const mrPaginatedList = useMemo(() => {
    const start = (mrCurrentPage - 1) * mrPageSize;
    return mrSortedList.slice(start, start + mrPageSize);
  }, [mrSortedList, mrCurrentPage, mrPageSize]);

  // =========================================================================
  // 3. SECTION 2: PURCHASE REQUISITION (PR Review) STATE & FILTERS
  // =========================================================================
  const [prSearch, setPrSearch] = useState('');
  const [prStatusFilter, setPrStatusFilter] = useState<string>('ALL'); // 'ALL' | 'PENDING' | 'PROCEEDED_PURCHASING' | 'REJECTED'
  const [prCurrentPage, setPrCurrentPage] = useState(1);
  const [prPageSize, setPrPageSize] = useState(10);
  const [prSortColumn, setPrSortColumn] = useState<string | null>('createdAt');
  const [prSortDirection, setPrSortDirection] = useState<SortDirection>('desc');

  const prCascading = useCascadingFilters({
    materials,
    transactions,
    initialPlant: 'ALL',
  });

  const prFilteredList = useMemo(() => {
    return materialRequests.filter(r => {
      if (r.requestType !== 'PURCHASE_REQUISITION') return false;

      // Status filter
      if (prStatusFilter === 'PENDING') {
        if (r.status !== 'PENDING_APPROVAL' && r.status !== 'STORE_REVIEW') return false;
      } else if (prStatusFilter !== 'ALL' && r.status !== prStatusFilter) {
        return false;
      }

      // Cascading filters
      if (prCascading.selectedPlant !== 'ALL' && r.plant !== prCascading.selectedPlant) {
        return false;
      }

      if (prCascading.selectedStore !== 'ALL') {
        const hasStore = r.items.some(it => {
          const mat = materials.find(m => m.id === it.materialId || m.materialCode === it.materialCode);
          const s = it.storageLocation || mat?.storageLocation || 'MAIN';
          return s === prCascading.selectedStore;
        });
        if (!hasStore) return false;
      }

      if (prCascading.selectedItem !== 'ALL') {
        const hasItem = r.items.some(it => {
          const mat = materials.find(m => m.id === it.materialId || m.materialCode === it.materialCode);
          return mat && prCascading.getItemName(mat) === prCascading.selectedItem;
        });
        if (!hasItem) return false;
      }

      if (prCascading.selectedMaterial !== 'ALL') {
        const hasMat = r.items.some(
          it => it.materialCode === prCascading.selectedMaterial || it.materialId === prCascading.selectedMaterial
        );
        if (!hasMat) return false;
      }

      // Search Query
      if (prSearch.trim()) {
        const q = prSearch.toLowerCase().trim();
        const matchNo = r.requestNo.toLowerCase().includes(q);
        const matchTitle = r.title.toLowerCase().includes(q);
        const matchRequester = r.requesterName.toLowerCase().includes(q);
        const matchDept = r.department.toLowerCase().includes(q);
        const matchItems = r.items.some(
          it => it.materialCode.toLowerCase().includes(q) || it.description.toLowerCase().includes(q)
        );
        return matchNo || matchTitle || matchRequester || matchDept || matchItems;
      }

      return true;
    });
  }, [materialRequests, prStatusFilter, prCascading.selectedPlant, prCascading.selectedStore, prCascading.selectedItem, prCascading.selectedMaterial, prSearch, materials, prCascading]);

  const prSortedList = useMemo(() => {
    if (!prSortColumn || !prSortDirection) return prFilteredList;

    return [...prFilteredList].sort((a, b) => {
      let valA: any = (a as any)[prSortColumn];
      let valB: any = (b as any)[prSortColumn];

      if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = (valB || '').toLowerCase();
      }

      if (valA < valB) return prSortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return prSortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [prFilteredList, prSortColumn, prSortDirection]);

  const prPaginatedList = useMemo(() => {
    const start = (prCurrentPage - 1) * prPageSize;
    return prSortedList.slice(start, start + prPageSize);
  }, [prSortedList, prCurrentPage, prPageSize]);

  // Status Badge Helper
  const getStatusBadge = (status: MaterialRequestStatus, isPR: boolean = false) => {
    switch (status) {
      case 'PENDING_APPROVAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
            <Clock className="w-3 h-3" />
            <span>{isPR ? 'Pending Store Review' : 'Pending Review'}</span>
          </span>
        );
      case 'STORE_REVIEW':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/60 text-brand-blue border border-blue-200 dark:border-blue-800">
            <FileCheck2 className="w-3 h-3" />
            <span>Store Review</span>
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3 h-3" />
            <span>Ready to Issue</span>
          </span>
        );
      case 'PARTIALLY_ISSUED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800">
            <Sliders className="w-3 h-3" />
            <span>Partially Issued</span>
          </span>
        );
      case 'ISSUED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
            <PackageCheck className="w-3.5 h-3.5" />
            <span>Issued (GI Done)</span>
          </span>
        );
      case 'PROCEEDED_PURCHASING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
            <ShoppingCart className="w-3 h-3" />
            <span>Proceeded Purchasing</span>
          </span>
        );
      case 'CLOSED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            <CheckCircle2 className="w-3 h-3" />
            <span>Closed</span>
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800">
            <XCircle className="w-3 h-3" />
            <span>Rejected</span>
          </span>
        );
    }
  };

  // =========================================================================
  // 4. COLUMNS DEFINITION
  // =========================================================================

  // Section 1: Material Request Columns
  const mrColumns: Column<MaterialRequest>[] = [
    {
      id: 'requestNo',
      header: isTh ? 'เลขที่คำขอ' : 'Request No.',
      sortable: true,
      className: 'w-[140px] font-mono',
      accessor: r => (
        <button
          type="button"
          onClick={() => {
            setSelectedRequest(r);
            setIsDetailDrawerOpen(true);
          }}
          className="font-bold text-xs text-brand-blue hover:underline text-left cursor-pointer"
        >
          {r.requestNo}
        </button>
      ),
    },
    {
      id: 'requesterName',
      header: isTh ? 'ผู้ขอ & แผนก' : 'Requester & Dept',
      sortable: true,
      className: 'w-[150px]',
      accessor: r => (
        <div className="text-xs">
          <span className="font-semibold text-app-text dark:text-app-darkText block truncate">
            {r.requesterName}
          </span>
          <span className="text-[11px] text-app-muted truncate block">{r.department}</span>
        </div>
      ),
    },
    {
      id: 'plant',
      header: isTh ? 'โรงงาน' : 'Plant',
      sortable: true,
      className: 'w-[100px]',
      accessor: r => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-[6px] bg-[#F4F6F8] dark:bg-slate-800 text-[#344054] dark:text-slate-200 text-xs font-mono font-medium">
          {r.plant}
        </span>
      ),
    },
    {
      id: 'title',
      header: isTh ? 'รายการพัสดุ / วัตถุประสงค์' : 'Items & Purpose',
      sortable: true,
      className: 'min-w-[200px]',
      accessor: r => {
        const firstItem = r.items[0];
        return (
          <div className="text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-app-text dark:text-app-darkText">
              <Package className="w-3.5 h-3.5 text-brand-blue shrink-0" />
              <span className="truncate">{firstItem?.materialCode || r.title}</span>
              {r.items.length > 1 && (
                <span className="px-1.5 py-0.2 rounded-full bg-blue-100 dark:bg-blue-950 text-brand-blue text-[10px] font-bold shrink-0">
                  +{r.items.length - 1} more
                </span>
              )}
            </div>
            <p className="text-[11px] text-app-muted truncate mt-0.5">
              {firstItem?.description || r.title}
            </p>
          </div>
        );
      },
    },
    {
      id: 'totalQuantity',
      header: isTh ? 'จำนวนขอ' : 'Requested Qty',
      sortable: true,
      align: 'right',
      className: 'w-[110px] font-mono',
      accessor: r => (
        <div className="text-right">
          <span className="font-bold text-xs text-app-text dark:text-app-darkText">
            {r.totalQuantity} {r.items[0]?.unit || 'PC'}
          </span>
          <span className="block text-[10px] text-app-muted">{r.items.length} lines</span>
        </div>
      ),
    },
    {
      id: 'stockAvailable',
      header: isTh ? 'สต็อกในคลัง' : 'Available Qty',
      align: 'right',
      className: 'w-[130px]',
      accessor: r => {
        const firstItem = r.items[0];
        const stock = firstItem ? getCurrentStock(firstItem.materialId, transactions) : 0;
        const isSufficient = stock >= r.totalQuantity;

        return (
          <div className="text-right">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold font-mono ${
                isSufficient
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isSufficient ? 'bg-emerald-500' : 'bg-red-500'}`} />
              {stock} {firstItem?.unit || 'PC'}
            </span>
            <span className="block text-[10px] text-app-muted mt-0.5">
              {isSufficient ? 'Sufficient' : 'Low / Shortage'}
            </span>
          </div>
        );
      },
    },
    {
      id: 'requiredDate',
      header: isTh ? 'วันที่ต้องการ' : 'Required Date',
      sortable: true,
      className: 'w-[110px] font-mono text-xs text-app-secondary dark:text-app-darkSecondary',
      accessor: r => r.requiredDate || r.createdAt.slice(0, 10),
    },
    {
      id: 'priority',
      header: isTh ? 'ด่วน' : 'Urgent',
      sortable: true,
      align: 'center',
      className: 'w-[85px]',
      accessor: r =>
        r.priority === 'URGENT' ? (
          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-red-500 text-white animate-pulse">
            <Flame className="w-2.5 h-2.5 fill-current" />
            URGENT
          </span>
        ) : (
          <span className="text-[11px] text-app-muted font-medium">{r.priority}</span>
        ),
    },
    {
      id: 'status',
      header: isTh ? 'สถานะ' : 'Status',
      sortable: true,
      align: 'center',
      className: 'w-[155px]',
      accessor: r => getStatusBadge(r.status, false),
    },
    {
      id: 'action',
      header: '',
      align: 'right',
      className: 'w-[120px]',
      accessor: r => (
        <button
          type="button"
          onClick={() => {
            setSelectedRequest(r);
            setIsDetailDrawerOpen(true);
          }}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-brand-blue hover:bg-brand-blue/90 shadow-sm transition-all cursor-pointer"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>{r.status === 'APPROVED' ? (isTh ? 'จ่ายพัสดุ' : 'Issue Goods') : (isTh ? 'ตรวจสอบ' : 'Review')}</span>
        </button>
      ),
    },
  ];

  // Section 2: Purchase Requisition (PR) Columns
  const prColumns: Column<MaterialRequest>[] = [
    {
      id: 'requestNo',
      header: isTh ? 'เลขที่ PR' : 'PR No.',
      sortable: true,
      className: 'w-[140px] font-mono',
      accessor: r => (
        <button
          type="button"
          onClick={() => {
            setSelectedRequest(r);
            setIsDetailDrawerOpen(true);
          }}
          className="font-bold text-xs text-purple-600 dark:text-purple-400 hover:underline text-left cursor-pointer flex items-center gap-1"
        >
          <ShoppingCart className="w-3 h-3" />
          <span>{r.requestNo}</span>
        </button>
      ),
    },
    {
      id: 'requesterName',
      header: isTh ? 'ผู้ขอ' : 'Requester',
      sortable: true,
      className: 'w-[130px]',
      accessor: r => (
        <span className="font-semibold text-xs text-app-text dark:text-app-darkText block truncate">
          {r.requesterName}
        </span>
      ),
    },
    {
      id: 'department',
      header: isTh ? 'แผนก' : 'Department',
      sortable: true,
      className: 'w-[120px]',
      accessor: r => (
        <span className="text-xs text-app-secondary dark:text-app-darkSecondary block truncate">
          {r.department}
        </span>
      ),
    },
    {
      id: 'plant',
      header: isTh ? 'โรงงาน' : 'Plant',
      sortable: true,
      className: 'w-[95px]',
      accessor: r => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-[6px] bg-[#F4F6F8] dark:bg-slate-800 text-[#344054] dark:text-slate-200 text-xs font-mono font-medium">
          {r.plant}
        </span>
      ),
    },
    {
      id: 'title',
      header: isTh ? 'รายการขอซื้อ' : 'PR Items',
      sortable: true,
      className: 'min-w-[200px]',
      accessor: r => {
        const firstItem = r.items[0];
        return (
          <div className="text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-app-text dark:text-app-darkText">
              <Tag className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
              <span className="truncate">{firstItem?.materialCode || r.title}</span>
              {r.items.length > 1 && (
                <span className="px-1.5 py-0.2 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 text-[10px] font-bold shrink-0">
                  +{r.items.length - 1} items
                </span>
              )}
            </div>
            <p className="text-[11px] text-app-muted truncate mt-0.5">
              {firstItem?.description || r.title}
            </p>
          </div>
        );
      },
    },
    {
      id: 'totalQuantity',
      header: isTh ? 'จำนวนขอซื้อ' : 'Requested Qty',
      sortable: true,
      align: 'right',
      className: 'w-[110px] font-mono',
      accessor: r => (
        <div className="text-right">
          <span className="font-bold text-xs text-app-text dark:text-app-darkText">
            {r.totalQuantity} {r.items[0]?.unit || 'PC'}
          </span>
          <span className="block text-[10px] text-app-muted">{r.items.length} lines</span>
        </div>
      ),
    },
    {
      id: 'stockAvailable',
      header: isTh ? 'สต็อกในคลัง' : 'Stock Available',
      align: 'right',
      className: 'w-[140px]',
      accessor: r => {
        const firstItem = r.items[0];
        const stock = firstItem ? getCurrentStock(firstItem.materialId, transactions) : 0;
        const hasStock = stock > 0;

        return (
          <div className="text-right">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold font-mono ${
                hasStock
                  ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${hasStock ? 'bg-amber-500' : 'bg-slate-400'}`} />
              {stock} {firstItem?.unit || 'PC'}
            </span>
            <span className="block text-[10px] text-app-muted mt-0.5">
              {hasStock ? 'In Stock (Can Issue MR)' : '0 in Store (Proceed PR)'}
            </span>
          </div>
        );
      },
    },
    {
      id: 'requiredDate',
      header: isTh ? 'วันที่ต้องการ' : 'Required Date',
      sortable: true,
      className: 'w-[110px] font-mono text-xs text-app-secondary dark:text-app-darkSecondary',
      accessor: r => r.requiredDate || r.createdAt.slice(0, 10),
    },
    {
      id: 'priority',
      header: isTh ? 'ด่วน' : 'Urgent',
      sortable: true,
      align: 'center',
      className: 'w-[85px]',
      accessor: r =>
        r.priority === 'URGENT' ? (
          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-red-500 text-white animate-pulse">
            <Flame className="w-2.5 h-2.5 fill-current" />
            URGENT
          </span>
        ) : (
          <span className="text-[11px] text-app-muted font-medium">{r.priority}</span>
        ),
    },
    {
      id: 'status',
      header: isTh ? 'สถานะ' : 'Status',
      sortable: true,
      align: 'center',
      className: 'w-[160px]',
      accessor: r => getStatusBadge(r.status, true),
    },
    {
      id: 'action',
      header: '',
      align: 'right',
      className: 'w-[130px]',
      accessor: r => (
        <button
          type="button"
          onClick={() => {
            setSelectedRequest(r);
            setIsDetailDrawerOpen(true);
          }}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-sm transition-all cursor-pointer"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>{r.status === 'PENDING_APPROVAL' || r.status === 'STORE_REVIEW' ? (isTh ? 'ตรวจสอบ PR' : 'Review PR') : (isTh ? 'ดูรายละเอียด' : 'View Detail')}</span>
        </button>
      ),
    },
  ];

  return (
    <PageLayout
      title={t('store_approval_title') || 'Store Request Approval & Issue'}
      subtitle={
        isTh
          ? 'ศูนย์ควบคุมการจ่ายพัสดุตามคำขอเบิก (Material Request) และตรวจสอบคำขอสั่งซื้อ (Purchase Requisition) สำหรับเจ้าหน้าที่ Store'
          : 'Unified operational workstreams for physical Stock Issue (MR) & Stock Review before Procurement (PR).'
      }
    >
      <div className="space-y-6">
        {/* ================================================================= */}
        {/* TOP SUMMARY KPI CARDS (Restructured Relationship Groups)          */}
        {/* ================================================================= */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* TOTAL ACTION REQUIRED */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-red-500/10 via-red-500/5 to-transparent border-2 border-red-400 dark:border-red-500/60 shadow-subtle flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block animate-pulse" />
                  {t('total_action_required') || 'Total Action Required'}
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 font-bold">
                  Notification Source
                </span>
              </div>
              <div className="text-3xl font-extrabold font-mono text-red-600 dark:text-red-400 mt-2">
                🔴 {stats.totalActionRequired}
              </div>
              <p className="text-xs text-app-secondary dark:text-app-darkSecondary mt-1">
                {isTh ? 'มีคำขอรอให้ Store ตรวจสอบและดำเนินการ' : 'Requests currently waiting for Store action'}
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-red-200/60 dark:border-red-900/60 flex items-center justify-between text-xs text-app-muted">
              <span>MR: <strong className="text-brand-blue">{stats.mr.pending}</strong></span>
              <span>•</span>
              <span>PR: <strong className="text-purple-600 dark:text-purple-400">{stats.pr.pending}</strong></span>
              <button
                type="button"
                onClick={() => {
                  setActiveWorkstream('ALL');
                  setMrStatusFilter('ACTIONABLE');
                  setPrStatusFilter('PENDING');
                }}
                className="text-[11px] font-bold text-red-600 hover:underline ml-auto"
              >
                {isTh ? 'ดูที่ต้องทำทั้งหมด →' : 'View Actionable →'}
              </button>
            </div>
          </div>

          {/* GROUP CARD 1: MATERIAL REQUEST (Stock Issue) */}
          <div
            onClick={() => setActiveWorkstream('MR')}
            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer shadow-subtle flex flex-col justify-between ${
              activeWorkstream === 'MR'
                ? 'bg-blue-50/50 dark:bg-blue-950/40 border-brand-blue ring-2 ring-brand-blue/20'
                : 'bg-white dark:bg-app-darkSurface border-brand-blue/40 hover:border-brand-blue'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-brand-blue flex items-center gap-1.5">
                  <ClipboardList className="w-4 h-4" />
                  {isTh ? 'Material Request (เบิกของ)' : 'Material Request'}
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-brand-blue font-bold">
                  Stock Issue Flow
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3">
                <div className="p-2 rounded-xl bg-amber-50/60 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/60">
                  <span className="text-[10px] text-amber-700 dark:text-amber-300 font-bold block">Pending</span>
                  <span className="text-lg font-bold font-mono text-amber-600 dark:text-amber-400">{stats.mr.pending}</span>
                </div>
                <div className="p-2 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60">
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold block">To Issue</span>
                  <span className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">{stats.mr.readyToIssue}</span>
                </div>
                <div className="p-2 rounded-xl bg-purple-50/60 dark:bg-purple-950/40 border border-purple-200/60 dark:border-purple-800/60">
                  <span className="text-[10px] text-purple-700 dark:text-purple-300 font-bold block">Issued (GI)</span>
                  <span className="text-lg font-bold font-mono text-purple-600 dark:text-purple-400">{stats.mr.issued}</span>
                </div>
              </div>
            </div>
            <div className="mt-3 text-[11px] text-brand-blue font-semibold flex items-center justify-between">
              <span>{isTh ? 'คลิกเพื่อโฟกัสงานเบิกจ่ายพัสดุ' : 'Click to filter Stock Issue stream'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* GROUP CARD 2: PURCHASE REQUISITION (Purchase Review) */}
          <div
            onClick={() => setActiveWorkstream('PR')}
            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer shadow-subtle flex flex-col justify-between ${
              activeWorkstream === 'PR'
                ? 'bg-purple-50/50 dark:bg-purple-950/40 border-purple-500 ring-2 ring-purple-500/20'
                : 'bg-white dark:bg-app-darkSurface border-purple-400/40 hover:border-purple-500'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                  <ShoppingCart className="w-4 h-4" />
                  {isTh ? 'Purchase Requisition (ขอซื้อ)' : 'Purchase Requisition'}
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold">
                  Purchase Review Flow
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3">
                <div className="p-2 rounded-xl bg-amber-50/60 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/60">
                  <span className="text-[10px] text-amber-700 dark:text-amber-300 font-bold block">Pending PR</span>
                  <span className="text-lg font-bold font-mono text-amber-600 dark:text-amber-400">{stats.pr.pending}</span>
                </div>
                <div className="p-2 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/60">
                  <span className="text-[10px] text-indigo-700 dark:text-indigo-300 font-bold block">Proceeded</span>
                  <span className="text-lg font-bold font-mono text-indigo-600 dark:text-indigo-400">{stats.pr.proceeded}</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-700 dark:text-slate-300 font-bold block">Rejected</span>
                  <span className="text-lg font-bold font-mono text-slate-600 dark:text-slate-400">{stats.pr.rejected}</span>
                </div>
              </div>
            </div>
            <div className="mt-3 text-[11px] text-purple-600 dark:text-purple-400 font-semibold flex items-center justify-between">
              <span>{isTh ? 'คลิกเพื่อโฟกัสงานตรวจขอซื้อ' : 'Click to filter PR Review stream'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* WORKSTREAM VIEW SWITCHER TABS                                     */}
        {/* ================================================================= */}
        <div className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-app-darkBorder rounded-2xl w-fit flex-wrap">
          <button
            type="button"
            onClick={() => setActiveWorkstream('ALL')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeWorkstream === 'ALL'
                ? 'bg-white dark:bg-app-darkSurface text-app-text dark:text-app-darkText shadow-sm'
                : 'text-app-secondary dark:text-app-darkSecondary hover:text-app-text'
            }`}
          >
            <span>{t('all_workstreams') || 'All Workstreams (2 Sections)'}</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 text-[10px]">
              {materialRequests.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveWorkstream('MR')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeWorkstream === 'MR'
                ? 'bg-brand-blue text-white shadow-sm'
                : 'text-app-secondary dark:text-app-darkSecondary hover:text-app-text'
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5" />
            <span>{isTh ? '1. Material Request — เบิกของ' : '1. Material Request (Issue)'}</span>
            {stats.mr.pending > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-red-500 text-white text-[10px] font-extrabold animate-pulse">
                {stats.mr.pending}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveWorkstream('PR')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeWorkstream === 'PR'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-app-secondary dark:text-app-darkSecondary hover:text-app-text'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>{isTh ? '2. Purchase Requisition (PR) — ขอซื้อ' : '2. Purchase Requisition (PR)'}</span>
            {stats.pr.pending > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-red-500 text-white text-[10px] font-extrabold animate-pulse">
                {stats.pr.pending}
              </span>
            )}
          </button>
        </div>

        {/* ================================================================= */}
        {/* SECTION 1: MATERIAL REQUEST — เบิกของจากคลัง (Stock Issue)          */}
        {/* ================================================================= */}
        {(activeWorkstream === 'ALL' || activeWorkstream === 'MR') && (
          <section aria-labelledby="mr-section-title" className="space-y-4 pt-2">
            {/* SECTION BANNER */}
            <div className="p-4 rounded-2xl bg-white dark:bg-app-darkSurface border-l-4 border-l-brand-blue border border-app-border dark:border-app-darkBorder shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 id="mr-section-title" className="text-base font-bold text-app-text dark:text-app-darkText flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-brand-blue" />
                    <span>{t('mr_workstream_title') || '1. Material Request — เบิกของจากคลัง (Stock Issue)'}</span>
                  </h2>
                  {stats.mr.pending > 0 && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500 text-white shadow-sm animate-pulse">
                      🔴 {stats.mr.pending} {isTh ? 'คำขอรออนุมัติ' : 'Pending'}
                    </span>
                  )}
                  {stats.mr.readyToIssue > 0 && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {stats.mr.readyToIssue} {isTh ? 'พร้อมจ่ายของ' : 'Ready to Issue'}
                    </span>
                  )}
                </div>
                <p className="text-xs text-app-secondary dark:text-app-darkSecondary mt-1">
                  {t('mr_workstream_desc') || 'Flow: Request เข้ามา → ตรวจ Stock → เลือก Store/Lot → Approve → Issue Goods (GI) → Completed'}
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xs text-app-muted font-medium">
                  {isTh ? 'แสดง' : 'Showing'} <strong>{mrFilteredList.length}</strong> {isTh ? 'รายการ' : 'requests'}
                </span>
              </div>
            </div>

            {/* MR FILTERS TOOLBAR */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder shadow-subtle space-y-3">
              {/* Row 1: Search + Status quick filter */}
              <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
                <SearchInput
                  value={mrSearch}
                  onChange={q => {
                    setMrSearch(q);
                    setMrCurrentPage(1);
                  }}
                  placeholder={isTh ? 'ค้นหาเลขที่คำขอ, ผู้ขอ, แผนก, พัสดุ...' : 'Search Request No, Requester, Item...'}
                  className="w-full lg:w-80"
                />

                <div className="flex items-center gap-1.5 overflow-x-auto w-full lg:w-auto pb-1 lg:pb-0">
                  {[
                    { id: 'ALL', label: isTh ? 'ทั้งหมด' : 'All' },
                    { id: 'ACTIONABLE', label: isTh ? 'ต้องดำเนินการ' : 'Actionable' },
                    { id: 'PENDING', label: isTh ? 'รออนุมัติ' : 'Pending' },
                    { id: 'APPROVED', label: isTh ? 'พร้อมจ่าย' : 'Ready to Issue' },
                    { id: 'PARTIALLY_ISSUED', label: isTh ? 'จ่ายบางส่วน' : 'Partially' },
                    { id: 'ISSUED', label: isTh ? 'จ่ายแล้ว' : 'Issued' },
                    { id: 'REJECTED', label: isTh ? 'ปฏิเสธ' : 'Rejected' },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setMrStatusFilter(tab.id);
                        setMrCurrentPage(1);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                        mrStatusFilter === tab.id
                          ? 'bg-brand-blue text-white shadow-sm'
                          : 'bg-app-bg dark:bg-app-darkBg text-app-secondary dark:text-app-darkSecondary hover:text-app-text'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Row 2: Cascading Filters (Plant -> SLoc/Store -> Item -> Material -> Lot) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 pt-2 border-t border-app-border/60 dark:border-app-darkBorder/60">
                <FilterSelect
                  label={isTh ? 'โรงงาน (Plant)' : 'Plant'}
                  value={mrCascading.selectedPlant}
                  options={mrCascading.plantOptions}
                  onChange={v => {
                    mrCascading.setSelectedPlant(v);
                    setMrCurrentPage(1);
                  }}
                />

                <FilterSelect
                  label={isTh ? 'คลัง (SLoc/Store)' : 'Store'}
                  value={mrCascading.selectedStore}
                  options={mrCascading.storeOptions}
                  onChange={v => {
                    mrCascading.setSelectedStore(v);
                    setMrCurrentPage(1);
                  }}
                />

                <FilterSelect
                  label={isTh ? 'กลุ่มพัสดุ (Item)' : 'Item'}
                  value={mrCascading.selectedItem}
                  options={mrCascading.itemOptions}
                  onChange={v => {
                    mrCascading.setSelectedItem(v);
                    setMrCurrentPage(1);
                  }}
                />

                <FilterSelect
                  label={isTh ? 'รหัสพัสดุ (Material)' : 'Material'}
                  value={mrCascading.selectedMaterial}
                  options={mrCascading.materialOptions}
                  onChange={v => {
                    mrCascading.setSelectedMaterial(v);
                    setMrCurrentPage(1);
                  }}
                />

                <FilterSelect
                  label={isTh ? 'หมายเลขล็อต (Lot)' : 'Lot'}
                  value={mrCascading.selectedLot}
                  options={mrCascading.lotOptions}
                  onChange={v => {
                    mrCascading.setSelectedLot(v);
                    setMrCurrentPage(1);
                  }}
                />
              </div>

              {mrCascading.hasActiveCascadingFilters && (
                <div className="flex items-center justify-between pt-1 text-xs">
                  <span className="text-app-muted">
                    {isTh ? 'กำลังใช้ตัวกรองแบบต่อเนื่อง (Cascading)' : 'Filtered by cascading parameters'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      mrCascading.resetAllFilters();
                      setMrStatusFilter('ALL');
                      setMrSearch('');
                      setMrCurrentPage(1);
                    }}
                    className="text-brand-blue hover:underline font-semibold flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>{isTh ? 'ล้างตัวกรองทั้งหมด' : 'Reset Filters'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* MR DATA TABLE */}
            <DataTable
              columns={mrColumns}
              data={mrPaginatedList}
              keyExtractor={r => r.id}
              sortColumn={mrSortColumn}
              sortDirection={mrSortDirection}
              onSortChange={colId => {
                if (mrSortColumn === colId) {
                  if (mrSortDirection === 'asc') setMrSortDirection('desc');
                  else if (mrSortDirection === 'desc') {
                    setMrSortColumn(null);
                    setMrSortDirection(null);
                  } else setMrSortDirection('asc');
                } else {
                  setMrSortColumn(colId);
                  setMrSortDirection('asc');
                }
              }}
              onRowClick={r => {
                setSelectedRequest(r);
                setIsDetailDrawerOpen(true);
              }}
              emptyTitle={isTh ? 'ไม่พบคำขอเบิกพัสดุ (Material Request)' : 'No Material Requests Found'}
              emptyDescription={isTh ? 'ไม่มีคำขอที่ตรงกับเงื่อนไขการค้นหาหรือตัวกรอง' : 'Try adjusting your search or filters.'}
              emptyType="materials"
              pagination={{
                currentPage: mrCurrentPage,
                pageSize: mrPageSize,
                totalItems: mrFilteredList.length,
                onPageChange: setMrCurrentPage,
                onPageSizeChange: setMrPageSize,
                pageSizeOptions: [10, 20, 50, 100],
              }}
            />
          </section>
        )}

        {/* ================================================================= */}
        {/* SECTION 2: PURCHASE REQUISITION (PR Review)                       */}
        {/* ================================================================= */}
        {(activeWorkstream === 'ALL' || activeWorkstream === 'PR') && (
          <section aria-labelledby="pr-section-title" className="space-y-4 pt-4 border-t-2 border-dashed border-app-border dark:border-app-darkBorder">
            {/* SECTION BANNER */}
            <div className="p-4 rounded-2xl bg-white dark:bg-app-darkSurface border-l-4 border-l-purple-500 border border-app-border dark:border-app-darkBorder shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 id="pr-section-title" className="text-base font-bold text-app-text dark:text-app-darkText flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    <span>{t('pr_workstream_title') || '2. Purchase Requisition (PR) — ขอซื้อ (Purchase Review)'}</span>
                  </h2>
                  {stats.pr.pending > 0 && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500 text-white shadow-sm animate-pulse">
                      🔴 {stats.pr.pending} {isTh ? 'PR รอตรวจ' : 'Pending Review'}
                    </span>
                  )}
                  {stats.pr.proceeded > 0 && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                      <ShoppingCart className="w-3.5 h-3.5" />
                      {stats.pr.proceeded} {isTh ? 'ส่งต่อจัดซื้อแล้ว' : 'Proceeded to Purchasing'}
                    </span>
                  )}
                </div>
                <p className="text-xs text-app-secondary dark:text-app-darkSecondary mt-1">
                  {t('pr_workstream_desc') || 'Flow: PR เข้ามา → Store ตรวจ Stock → ถ้าไม่มีของ: Proceed PR ส่งต่อจัดซื้อ | ถ้ามีของ: แจ้งเบิกจ่ายเป็น MR | ถ้าไม่เหมาะสม: Reject'}
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xs text-app-muted font-medium">
                  {isTh ? 'แสดง' : 'Showing'} <strong>{prFilteredList.length}</strong> {isTh ? 'ใบขอซื้อ' : 'PRs'}
                </span>
              </div>
            </div>

            {/* PR FILTERS TOOLBAR */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder shadow-subtle space-y-3">
              {/* Row 1: Search + Status quick filter */}
              <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
                <SearchInput
                  value={prSearch}
                  onChange={q => {
                    setPrSearch(q);
                    setPrCurrentPage(1);
                  }}
                  placeholder={isTh ? 'ค้นหา PR No, ผู้ขอ, แผนก, รายการขอซื้อ...' : 'Search PR No, Requester, Department...'}
                  className="w-full lg:w-80"
                />

                <div className="flex items-center gap-1.5 overflow-x-auto w-full lg:w-auto pb-1 lg:pb-0">
                  {[
                    { id: 'ALL', label: isTh ? 'ทั้งหมด' : 'All' },
                    { id: 'PENDING', label: isTh ? 'รอตรวจสต็อก' : 'Pending Review' },
                    { id: 'PROCEEDED_PURCHASING', label: isTh ? 'ส่งจัดซื้อแล้ว' : 'Proceeded PR' },
                    { id: 'REJECTED', label: isTh ? 'ปฏิเสธ' : 'Rejected' },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setPrStatusFilter(tab.id);
                        setPrCurrentPage(1);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                        prStatusFilter === tab.id
                          ? 'bg-purple-600 text-white shadow-sm'
                          : 'bg-app-bg dark:bg-app-darkBg text-app-secondary dark:text-app-darkSecondary hover:text-app-text'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Row 2: Cascading Filters (Plant -> SLoc/Store -> Item -> Material) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-app-border/60 dark:border-app-darkBorder/60">
                <FilterSelect
                  label={isTh ? 'โรงงาน (Plant)' : 'Plant'}
                  value={prCascading.selectedPlant}
                  options={prCascading.plantOptions}
                  onChange={v => {
                    prCascading.setSelectedPlant(v);
                    setPrCurrentPage(1);
                  }}
                />

                <FilterSelect
                  label={isTh ? 'คลังอ้างอิง (Store)' : 'Store'}
                  value={prCascading.selectedStore}
                  options={prCascading.storeOptions}
                  onChange={v => {
                    prCascading.setSelectedStore(v);
                    setPrCurrentPage(1);
                  }}
                />

                <FilterSelect
                  label={isTh ? 'กลุ่มพัสดุ (Item)' : 'Item'}
                  value={prCascading.selectedItem}
                  options={prCascading.itemOptions}
                  onChange={v => {
                    prCascading.setSelectedItem(v);
                    setPrCurrentPage(1);
                  }}
                />

                <FilterSelect
                  label={isTh ? 'รหัสพัสดุ (Material)' : 'Material'}
                  value={prCascading.selectedMaterial}
                  options={prCascading.materialOptions}
                  onChange={v => {
                    prCascading.setSelectedMaterial(v);
                    setPrCurrentPage(1);
                  }}
                />
              </div>

              {prCascading.hasActiveCascadingFilters && (
                <div className="flex items-center justify-between pt-1 text-xs">
                  <span className="text-app-muted">
                    {isTh ? 'กำลังใช้ตัวกรองแบบต่อเนื่อง (Cascading)' : 'Filtered by cascading parameters'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      prCascading.resetAllFilters();
                      setPrStatusFilter('ALL');
                      setPrSearch('');
                      setPrCurrentPage(1);
                    }}
                    className="text-purple-600 dark:text-purple-400 hover:underline font-semibold flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>{isTh ? 'ล้างตัวกรองทั้งหมด' : 'Reset Filters'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* PR DATA TABLE */}
            <DataTable
              columns={prColumns}
              data={prPaginatedList}
              keyExtractor={r => r.id}
              sortColumn={prSortColumn}
              sortDirection={prSortDirection}
              onSortChange={colId => {
                if (prSortColumn === colId) {
                  if (prSortDirection === 'asc') setPrSortDirection('desc');
                  else if (prSortDirection === 'desc') {
                    setPrSortColumn(null);
                    setPrSortDirection(null);
                  } else setPrSortDirection('asc');
                } else {
                  setPrSortColumn(colId);
                  setPrSortDirection('asc');
                }
              }}
              onRowClick={r => {
                setSelectedRequest(r);
                setIsDetailDrawerOpen(true);
              }}
              emptyTitle={isTh ? 'ไม่พบใบขอสั่งซื้อ (Purchase Requisition)' : 'No Purchase Requisitions Found'}
              emptyDescription={isTh ? 'ไม่มีรายการขอซื้อที่ตรงกับเงื่อนไขการค้นหา' : 'Try adjusting your search or filters.'}
              emptyType="transactions"
              pagination={{
                currentPage: prCurrentPage,
                pageSize: prPageSize,
                totalItems: prFilteredList.length,
                onPageChange: setPrCurrentPage,
                onPageSizeChange: setPrPageSize,
                pageSizeOptions: [10, 20, 50, 100],
              }}
            />
          </section>
        )}
      </div>

      {/* DETAIL DRAWER FOR REVIEW / APPROVAL / ISSUE / PROCEED PR */}
      <RequestDetailDrawer
        isOpen={isDetailDrawerOpen}
        onClose={() => setIsDetailDrawerOpen(false)}
        request={selectedRequest}
      />
    </PageLayout>
  );
};
