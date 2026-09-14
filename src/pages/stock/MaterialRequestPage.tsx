import React, { useState, useMemo, useEffect } from 'react';
import { MaterialRequest, MaterialRequestStatus, RequestType } from '../../types/stock';
import { PageLayout } from '../../components/layout/PageLayout';
import { SearchInput } from '../../components/common/SearchInput';
import { FilterSelect } from '../../components/common/FilterSelect';
import { DataTable, Column, SortDirection } from '../../components/common/DataTable';
import { CreateRequestDrawer } from '../../components/stock/CreateRequestDrawer';
import { RequestDetailDrawer } from '../../components/stock/RequestDetailDrawer';
import { useStock } from '../../context/StockContext';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  Plus,
  Clock,
  FileCheck2,
  CheckCircle2,
  PackageCheck,
  XCircle,
  Eye,
  ClipboardList,
  Building2,
  Tag,
  AlertCircle,
  ShoppingCart,
  Package,
  Sliders,
  User,
  RotateCcw,
} from 'lucide-react';

export const MaterialRequestPage: React.FC = () => {
  const { materialRequests } = useStock();
  const { currentUser, hasPermission } = useAuth();
  const { t, language } = useLanguage();
  const isTh = language === 'th';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlant, setSelectedPlant] = useState('ALL');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedType, setSelectedType] = useState<RequestType | 'ALL'>('ALL');
  const [selectedPriority, setSelectedPriority] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<MaterialRequestStatus | 'ALL'>('ALL');
  const [myRequestsOnly, setMyRequestsOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [sortColumn, setSortColumn] = useState<string | null>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [createInitialType, setCreateInitialType] = useState<RequestType>('MATERIAL_REQUEST');
  const [selectedRequest, setSelectedRequest] = useState<MaterialRequest | null>(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);

  // Statistics KPI
  const stats = useMemo(() => {
    return {
      total: materialRequests.length,
      mrCount: materialRequests.filter(r => (r.requestType || 'MATERIAL_REQUEST') === 'MATERIAL_REQUEST').length,
      prCount: materialRequests.filter(r => r.requestType === 'PURCHASE_REQUISITION').length,
      pendingApproval: materialRequests.filter(r => r.status === 'PENDING_APPROVAL').length,
      storeReview: materialRequests.filter(r => r.status === 'STORE_REVIEW').length,
      approvedOrPartial: materialRequests.filter(r => r.status === 'APPROVED' || r.status === 'PARTIALLY_ISSUED').length,
      issuedOrPurchasing: materialRequests.filter(r => r.status === 'ISSUED' || r.status === 'PROCEEDED_PURCHASING').length,
      rejected: materialRequests.filter(r => r.status === 'REJECTED').length,
    };
  }, [materialRequests]);

  // Dynamic Plant Options
  const plantOptions = useMemo(() => {
    const counts = new Map<string, number>();
    materialRequests.forEach(r => {
      counts.set(r.plant, (counts.get(r.plant) || 0) + 1);
    });
    const total = materialRequests.length;
    const opts = [
      { value: 'ALL', label: `All Plants (${total})` },
    ];
    Array.from(counts.keys()).sort().forEach(p => {
      opts.push({ value: p, label: `${p} (${counts.get(p)})` });
    });
    return opts;
  }, [materialRequests]);

  // Dynamic Department Options (Cascaded from Plant)
  const deptOptions = useMemo(() => {
    const relevant = materialRequests.filter(r => selectedPlant === 'ALL' || r.plant === selectedPlant);
    const counts = new Map<string, number>();
    relevant.forEach(r => {
      if (r.department) counts.set(r.department, (counts.get(r.department) || 0) + 1);
    });
    const opts = [
      { value: 'ALL', label: `All Departments (${relevant.length})` },
    ];
    Array.from(counts.keys()).sort().forEach(d => {
      opts.push({ value: d, label: `${d} (${counts.get(d)})` });
    });
    return opts;
  }, [materialRequests, selectedPlant]);

  // Auto-reset department if no longer valid under new plant
  useEffect(() => {
    if (selectedDept !== 'ALL') {
      const isValid = deptOptions.some(opt => opt.value === selectedDept);
      if (!isValid) setSelectedDept('ALL');
    }
  }, [selectedPlant, deptOptions, selectedDept]);

  // Filter requests
  const filteredRequests = useMemo(() => {
    return materialRequests.filter(r => {
      if (myRequestsOnly && currentUser?.username && r.requestedBy !== currentUser.username) {
        return false;
      }

      if (selectedPlant !== 'ALL' && selectedPlant !== 'All Plants' && r.plant !== selectedPlant) {
        return false;
      }

      if (selectedDept !== 'ALL' && r.department !== selectedDept) {
        return false;
      }

      if (selectedType !== 'ALL' && (r.requestType || 'MATERIAL_REQUEST') !== selectedType) {
        return false;
      }

      if (selectedPriority !== 'ALL' && r.priority !== selectedPriority) {
        return false;
      }

      if (statusFilter !== 'ALL' && r.status !== statusFilter) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
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
  }, [materialRequests, myRequestsOnly, currentUser, selectedPlant, selectedDept, selectedType, selectedPriority, statusFilter, searchQuery]);

  // Sorting
  const sortedRequests = useMemo(() => {
    if (!sortColumn || !sortDirection) return filteredRequests;

    return [...filteredRequests].sort((a, b) => {
      let valA: any = (a as any)[sortColumn];
      let valB: any = (b as any)[sortColumn];

      if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = (valB || '').toLowerCase();
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredRequests, sortColumn, sortDirection]);

  // Pagination
  const paginatedRequests = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedRequests.slice(start, start + pageSize);
  }, [sortedRequests, currentPage, pageSize]);

  const handleSortChange = (columnId: string) => {
    if (sortColumn === columnId) {
      if (sortDirection === 'asc') setSortDirection('desc');
      else if (sortDirection === 'desc') {
        setSortColumn(null);
        setSortDirection(null);
      } else {
        setSortDirection('asc');
      }
    } else {
      setSortColumn(columnId);
      setSortDirection('asc');
    }
  };

  const handleOpenDetail = (req: MaterialRequest) => {
    setSelectedRequest(req);
    setIsDetailDrawerOpen(true);
  };

  const getStatusBadge = (status: MaterialRequestStatus) => {
    switch (status) {
      case 'PENDING_APPROVAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
            <Clock className="w-3 h-3" />
            <span>Pending Approval</span>
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
            <span>Approved</span>
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
            <span>Issued</span>
          </span>
        );
      case 'PROCEEDED_PURCHASING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
            <ShoppingCart className="w-3 h-3" />
            <span>Purchasing</span>
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

  const columns: Column<MaterialRequest>[] = [
    {
      id: 'requestNo',
      header: isTh ? 'เลขที่คำขอ' : 'Request No.',
      sortable: true,
      className: 'w-[130px] font-mono',
      accessor: r => (
        <span className="font-bold text-xs text-brand-blue hover:underline cursor-pointer">
          {r.requestNo}
        </span>
      ),
    },
    {
      id: 'requestType',
      header: isTh ? 'ประเภท' : 'Type',
      sortable: true,
      className: 'w-[105px]',
      accessor: r => {
        const isPR = r.requestType === 'PURCHASE_REQUISITION';
        return (
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${
              isPR
                ? 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                : 'bg-blue-50 dark:bg-blue-950/50 text-brand-blue border-blue-200 dark:border-blue-800'
            }`}
          >
            {isPR ? <ShoppingCart className="w-2.5 h-2.5 shrink-0" /> : <ClipboardList className="w-2.5 h-2.5 shrink-0" />}
            <span>{isPR ? 'PR' : 'Material Request'}</span>
          </span>
        );
      },
    },
    {
      id: 'requesterName',
      header: isTh ? 'ผู้ขอ' : 'Requester',
      sortable: true,
      className: 'min-w-[130px] max-w-[170px]',
      accessor: r => (
        <div className="text-xs truncate">
          <span className="font-medium text-app-text dark:text-app-darkText block truncate" title={r.requesterName}>
            {r.requesterName}
          </span>
          <span className="text-[10px] text-app-muted font-mono truncate block" title={r.department}>
            {r.department}
          </span>
        </div>
      ),
    },
    {
      id: 'plant',
      header: isTh ? 'โรงงาน' : 'Plant',
      sortable: true,
      className: 'w-[90px]',
      accessor: r => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-[6px] bg-[#F4F6F8] dark:bg-slate-800 text-[#344054] dark:text-slate-200 text-xs font-mono font-medium">
          {r.plant}
        </span>
      ),
    },
    {
      id: 'title',
      header: isTh ? 'รายการพัสดุ' : 'Items',
      sortable: true,
      className: 'min-w-[180px] max-w-[260px]',
      accessor: r => {
        const firstItem = r.items[0];
        return (
          <div className="text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-app-text dark:text-app-darkText">
              <span className="truncate" title={firstItem?.materialCode || r.title}>
                {firstItem?.materialCode || r.title}
              </span>
              {r.items.length > 1 && (
                <span className="px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-app-muted text-[10px] font-bold shrink-0">
                  +{r.items.length - 1}
                </span>
              )}
              {r.priority === 'URGENT' && (
                <span className="px-1.5 py-0.2 rounded bg-red-500 text-white text-[9px] font-extrabold shrink-0 animate-pulse">
                  URGENT
                </span>
              )}
            </div>
            <p className="text-[11px] text-app-muted truncate mt-0.5" title={firstItem?.description || r.purpose}>
              {firstItem?.description || r.title} ({r.items.length} {isTh ? 'รายการ' : 'lines'}, {r.totalQuantity} total)
            </p>
          </div>
        );
      },
    },
    {
      id: 'requiredDate',
      header: isTh ? 'วันที่ต้องการ' : 'Required Date',
      sortable: true,
      className: 'w-[115px] font-mono text-xs text-app-secondary dark:text-app-darkSecondary',
      accessor: r => r.requiredDate || r.createdAt.slice(0, 10),
    },
    {
      id: 'status',
      header: isTh ? 'สถานะ' : 'Status',
      sortable: true,
      align: 'center',
      className: 'w-[160px]',
      accessor: r => getStatusBadge(r.status),
    },
    {
      id: 'action',
      header: '',
      align: 'right',
      className: 'w-14',
      accessor: r => (
        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            handleOpenDetail(r);
          }}
          className="p-1.5 rounded-lg text-brand-blue hover:bg-brand-softBlue dark:hover:bg-blue-950/50 transition-colors cursor-pointer"
          title="View Requisition Detail"
        >
          <Eye className="w-4 h-4" />
        </button>
      ),
    },
  ];

  return (
    <PageLayout
      title={t('material_request_title') || 'Requisitions (MR & PR)'}
      subtitle={
        t('material_request_subtitle') ||
        'Create and track Material Requests (MR) and Purchase Requisitions (PR) with live stock verification.'
      }
      actions={
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setCreateInitialType('PURCHASE_REQUISITION');
              setIsCreateDrawerOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-sm transition-all"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>{isTh ? '+ ขอซื้อ (PR)' : '+ Purchase Requisition'}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setCreateInitialType('MATERIAL_REQUEST');
              setIsCreateDrawerOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-blue hover:bg-blue-600 text-white text-xs font-bold shadow-sm transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isTh ? '+ ขอเบิกพัสดุ (MR)' : '+ Material Request'}</span>
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* KPI SUMMARY CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* TOTAL REQUESTS */}
          <button
            type="button"
            onClick={() => {
              setSelectedType('ALL');
              setStatusFilter('ALL');
            }}
            className={`p-3 sm:p-3.5 rounded-2xl border text-left transition-all shadow-subtle cursor-pointer ${
              statusFilter === 'ALL' && selectedType === 'ALL'
                ? 'bg-brand-softBlue dark:bg-blue-950/60 border-brand-blue ring-2 ring-brand-blue/20'
                : 'bg-white dark:bg-app-darkSurface border-app-border dark:border-app-darkBorder hover:border-app-muted'
            }`}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-app-muted block truncate">
              Total Requisitions
            </span>
            <div className="text-xl sm:text-2xl font-bold font-mono text-app-text dark:text-app-darkText mt-1">
              {stats.total}
            </div>
            <span className="text-[10px] text-brand-blue font-medium mt-0.5 block">
              All MR & PR
            </span>
          </button>

          {/* MR COUNT */}
          <button
            type="button"
            onClick={() => {
              setSelectedType('MATERIAL_REQUEST');
              setStatusFilter('ALL');
            }}
            className={`p-3 sm:p-3.5 rounded-2xl border text-left transition-all shadow-subtle cursor-pointer ${
              selectedType === 'MATERIAL_REQUEST'
                ? 'bg-blue-50 dark:bg-blue-950/60 border-brand-blue ring-2 ring-brand-blue/20'
                : 'bg-white dark:bg-app-darkSurface border-app-border dark:border-app-darkBorder hover:border-app-muted'
            }`}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-blue block truncate">
              Material Requests
            </span>
            <div className="text-xl sm:text-2xl font-bold font-mono text-brand-blue mt-1">
              {stats.mrCount}
            </div>
            <span className="text-[10px] text-app-muted font-medium mt-0.5 block">
              Store Requisitions
            </span>
          </button>

          {/* PR COUNT */}
          <button
            type="button"
            onClick={() => {
              setSelectedType('PURCHASE_REQUISITION');
              setStatusFilter('ALL');
            }}
            className={`p-3 sm:p-3.5 rounded-2xl border text-left transition-all shadow-subtle cursor-pointer ${
              selectedType === 'PURCHASE_REQUISITION'
                ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-500 ring-2 ring-amber-500/20'
                : 'bg-white dark:bg-app-darkSurface border-app-border dark:border-app-darkBorder hover:border-app-muted'
            }`}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block truncate">
              Purchase Req. (PR)
            </span>
            <div className="text-xl sm:text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-1">
              {stats.prCount}
            </div>
            <span className="text-[10px] text-app-muted font-medium mt-0.5 block">
              Procurement Requests
            </span>
          </button>

          {/* PENDING APPROVAL / IN REVIEW */}
          <button
            type="button"
            onClick={() => setStatusFilter('PENDING_APPROVAL')}
            className={`p-3 sm:p-3.5 rounded-2xl border text-left transition-all shadow-subtle cursor-pointer ${
              statusFilter === 'PENDING_APPROVAL'
                ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-500 ring-2 ring-amber-500/20'
                : 'bg-white dark:bg-app-darkSurface border-app-border dark:border-app-darkBorder hover:border-app-muted'
            }`}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block truncate">
              Pending / Review
            </span>
            <div className="text-xl sm:text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-1">
              {stats.pendingApproval + stats.storeReview}
            </div>
            <span className="text-[10px] text-app-muted font-medium mt-0.5 block">
              Awaiting Action
            </span>
          </button>

          {/* ISSUED / PURCHASING */}
          <button
            type="button"
            onClick={() => setStatusFilter('ISSUED')}
            className={`p-3 sm:p-3.5 rounded-2xl border text-left transition-all shadow-subtle cursor-pointer ${
              statusFilter === 'ISSUED'
                ? 'bg-purple-50 dark:bg-purple-950/60 border-purple-500 ring-2 ring-purple-500/20'
                : 'bg-white dark:bg-app-darkSurface border-app-border dark:border-app-darkBorder hover:border-app-muted'
            }`}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 block truncate">
              Issued / Done
            </span>
            <div className="text-xl sm:text-2xl font-bold font-mono text-purple-600 dark:text-purple-400 mt-1">
              {stats.issuedOrPurchasing}
            </div>
            <span className="text-[10px] text-app-muted font-medium mt-0.5 block">
              Fulfilled
            </span>
          </button>

          {/* REJECTED */}
          <button
            type="button"
            onClick={() => setStatusFilter('REJECTED')}
            className={`p-3 sm:p-3.5 rounded-2xl border text-left transition-all shadow-subtle cursor-pointer ${
              statusFilter === 'REJECTED'
                ? 'bg-red-50 dark:bg-red-950/60 border-red-500 ring-2 ring-red-500/20'
                : 'bg-white dark:bg-app-darkSurface border-app-border dark:border-app-darkBorder hover:border-app-muted'
            }`}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400 block truncate">
              Rejected
            </span>
            <div className="text-xl sm:text-2xl font-bold font-mono text-red-600 dark:text-red-400 mt-1">
              {stats.rejected}
            </div>
            <span className="text-[10px] text-app-muted font-medium mt-0.5 block">
              Declined requests
            </span>
          </button>
        </div>

        {/* TOOLBAR */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder shadow-subtle flex flex-col lg:flex-row items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full lg:w-auto flex-1 flex-wrap">
            <SearchInput
              value={searchQuery}
              onChange={q => {
                setSearchQuery(q);
                setCurrentPage(1);
              }}
              placeholder="Search Request No, Purpose, Requester, Item Code..."
              className="w-full sm:w-64"
            />

            {/* 1. PLANT FILTER (CASCADED) */}
            <div className="w-full sm:w-40 shrink-0">
              <FilterSelect
                label=""
                value={selectedPlant}
                options={plantOptions}
                onChange={p => {
                  setSelectedPlant(p);
                  setCurrentPage(1);
                }}
              />
            </div>

            {/* 2. DEPARTMENT FILTER (CASCADED FROM PLANT) */}
            <div className="w-full sm:w-44 shrink-0">
              <FilterSelect
                label=""
                value={selectedDept}
                options={deptOptions}
                onChange={d => {
                  setSelectedDept(d);
                  setCurrentPage(1);
                }}
              />
            </div>

            {/* 3. REQUEST TYPE FILTER */}
            <div className="w-full sm:w-44 shrink-0">
              <FilterSelect
                label=""
                value={selectedType}
                options={[
                  { value: 'ALL', label: 'All Types (ทั้งหมด)' },
                  { value: 'MATERIAL_REQUEST', label: 'MR: ขอเบิกพัสดุ' },
                  { value: 'PURCHASE_REQUISITION', label: 'PR: ขอซื้อพัสดุ' },
                ]}
                onChange={t => {
                  setSelectedType(t as RequestType | 'ALL');
                  setCurrentPage(1);
                }}
              />
            </div>

            {/* 4. PRIORITY FILTER */}
            <div className="w-full sm:w-36 shrink-0">
              <FilterSelect
                label=""
                value={selectedPriority}
                options={[
                  { value: 'ALL', label: 'All Priorities' },
                  { value: 'URGENT', label: '🚨 Urgent' },
                  { value: 'HIGH', label: 'High' },
                  { value: 'MEDIUM', label: 'Medium' },
                  { value: 'LOW', label: 'Low' },
                ]}
                onChange={pr => {
                  setSelectedPriority(pr);
                  setCurrentPage(1);
                }}
              />
            </div>

            {/* RESET FILTERS */}
            {(selectedPlant !== 'ALL' || selectedDept !== 'ALL' || selectedType !== 'ALL' || selectedPriority !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setSelectedPlant('ALL');
                  setSelectedDept('ALL');
                  setSelectedType('ALL');
                  setSelectedPriority('ALL');
                  setCurrentPage(1);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-app-border dark:border-app-darkBorder text-xs text-app-muted hover:text-brand-blue transition-colors"
                title="Reset Filters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}

            {/* MY REQUESTS TOGGLE BUTTON */}
            <button
              type="button"
              onClick={() => {
                setMyRequestsOnly(prev => !prev);
                setCurrentPage(1);
              }}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                myRequestsOnly
                  ? 'bg-brand-blue text-white border-brand-blue shadow-sm'
                  : 'border-app-border dark:border-app-darkBorder hover:bg-app-bg dark:hover:bg-app-darkBg text-app-text dark:text-app-darkText'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>{isTh ? 'คำขอของฉันเท่านั้น' : 'My Requests Only'}</span>
            </button>
          </div>

          <div className="text-xs text-app-muted font-medium shrink-0">
            Showing <strong>{filteredRequests.length}</strong> of {materialRequests.length} requests
          </div>
        </div>

        {/* DATA TABLE */}
        <DataTable
          columns={columns}
          data={paginatedRequests}
          keyExtractor={r => r.id}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onSortChange={handleSortChange}
          onRowClick={handleOpenDetail}
          emptyTitle="No Requisitions Found"
          emptyDescription="No material requests or purchase requisitions match your filter criteria."
          pagination={{
            currentPage,
            pageSize,
            totalItems: filteredRequests.length,
            onPageChange: setCurrentPage,
            onPageSizeChange: setPageSize,
            pageSizeOptions: [10, 20, 50, 100],
          }}
        />
      </div>

      {/* CREATE REQUEST DRAWER */}
      <CreateRequestDrawer
        isOpen={isCreateDrawerOpen}
        initialType={createInitialType}
        onClose={() => setIsCreateDrawerOpen(false)}
        onSuccess={reqNo => {
          const created = materialRequests.find(r => r.requestNo === reqNo);
          if (created) {
            setSelectedRequest(created);
            setIsDetailDrawerOpen(true);
          }
        }}
      />

      {/* DETAIL DRAWER */}
      <RequestDetailDrawer
        isOpen={isDetailDrawerOpen}
        onClose={() => setIsDetailDrawerOpen(false)}
        request={selectedRequest}
      />
    </PageLayout>
  );
};

