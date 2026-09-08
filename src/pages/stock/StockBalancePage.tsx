import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Material, StockStatus, MaterialWithStock } from '../../types/stock';
import { PageLayout } from '../../components/layout/PageLayout';
import { SearchInput } from '../../components/common/SearchInput';
import { FilterSelect } from '../../components/common/FilterSelect';
import { DataTable, Column, SortDirection } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { GoodsReceiptDrawer } from '../../components/stock/GoodsReceiptDrawer';
import { GoodsIssueDrawer } from '../../components/stock/GoodsIssueDrawer';
import { StockAdjustmentDrawer } from '../../components/stock/StockAdjustmentDrawer';
import { MaterialDetailDrawer } from '../../components/stock/MaterialDetailDrawer';
import { MaterialFormDrawer } from '../../components/stock/MaterialFormDrawer';
import { useStock } from '../../context/StockContext';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { getCurrentStock, calculateStockStatus, getLastMovement } from '../../utils/stockCalculation';
import { formatDateTime } from '../../utils/dateRange';
import {
  Plus,
  Minus,
  MoreVertical,
  Layers,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  PackageX,
  PackageCheck,
  TrendingDown,
  Building2,
  Package,
  History,
  Edit2,
  Sliders,
  ExternalLink,
} from 'lucide-react';

export const StockBalancePage: React.FC = () => {
  const { materials, transactions } = useStock();
  const { hasPermission } = useAuth();
  const { t } = useLanguage();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlant, setSelectedPlant] = useState('All Plants');
  const [statusFilter, setStatusFilter] = useState<StockStatus | 'ALL'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Sorting
  const [sortColumn, setSortColumn] = useState<string | null>('quantity');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Reset pagination on search or plant change
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setCurrentPage(1);
  };

  const handlePlantChange = (val: string) => {
    setSelectedPlant(val);
    setCurrentPage(1);
  };

  // Drawers
  const [grMaterial, setGrMaterial] = useState<Material | null>(null);
  const [giMaterial, setGiMaterial] = useState<Material | null>(null);
  const [adjMaterial, setAdjMaterial] = useState<Material | null>(null);
  const [detailMaterial, setDetailMaterial] = useState<Material | null>(null);
  const [editMaterial, setEditMaterial] = useState<Material | null>(null);
  const [detailTab, setDetailTab] = useState<'info' | 'movement'>('info');

  const [activeMenuRowId, setActiveMenuRowId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenuRowId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const canGr = hasPermission('GR_CREATE');
  const canGi = hasPermission('GI_CREATE');
  const canAdjust = hasPermission('STOCK_ADJUST');
  const canEdit = hasPermission('MASTER_EDIT');

  // Derive full stock data for all materials
  const enrichedMaterials: MaterialWithStock[] = useMemo(() => {
    return materials.map(m => {
      const currentStock = getCurrentStock(m.id, transactions);
      const stockStatus = calculateStockStatus(m, currentStock);
      const lastMovement = getLastMovement(m.id, transactions);
      const totalValue = currentStock * (m.standardPrice || 0);

      return {
        ...m,
        currentStock,
        stockStatus,
        lastMovement,
        totalValue,
      };
    });
  }, [materials, transactions]);

  // Status counts for Summary Cards
  const statusCounts = useMemo(() => {
    let total = enrichedMaterials.length;
    let normal = 0;
    let reordering = 0;
    let overmax = 0;
    let undermin = 0;
    let outOfStock = 0;

    enrichedMaterials.forEach(m => {
      if (m.stockStatus === 'NORMAL') normal++;
      else if (m.stockStatus === 'REORDERING') reordering++;
      else if (m.stockStatus === 'OVERMAX') overmax++;
      else if (m.stockStatus === 'UNDERMIN') undermin++;
      else if (m.stockStatus === 'OUT_OF_STOCK') outOfStock++;
    });

    return { total, normal, reordering, overmax, undermin, outOfStock };
  }, [enrichedMaterials]);

  // Filter materials
  const filteredMaterials = useMemo(() => {
    return enrichedMaterials.filter(m => {
      // Plant filter
      if (selectedPlant !== 'All Plants' && m.plant !== selectedPlant) {
        return false;
      }

      // Status card filter
      if (statusFilter !== 'ALL' && m.stockStatus !== statusFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matches =
          m.materialCode.toLowerCase().includes(query) ||
          m.description.toLowerCase().includes(query) ||
          m.materialType.toLowerCase().includes(query) ||
          m.storageLocation?.toLowerCase().includes(query) ||
          m.storageBin?.toLowerCase().includes(query);
        if (!matches) return false;
      }

      return true;
    });
  }, [enrichedMaterials, selectedPlant, statusFilter, searchQuery]);

  // Sorting
  const sortedMaterials = useMemo(() => {
    if (!sortColumn || !sortDirection) return filteredMaterials;

    return [...filteredMaterials].sort((a, b) => {
      let valA: any = (a as any)[sortColumn];
      let valB: any = (b as any)[sortColumn];

      if (sortColumn === 'quantity') {
        valA = a.currentStock;
        valB = b.currentStock;
      } else if (sortColumn === 'materialDetails') {
        valA = a.description.toLowerCase();
        valB = b.description.toLowerCase();
      } else if (sortColumn === 'lastMove') {
        valA = a.lastMovement ? new Date(a.lastMovement.createdAt).getTime() : 0;
        valB = b.lastMovement ? new Date(b.lastMovement.createdAt).getTime() : 0;
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredMaterials, sortColumn, sortDirection]);

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

  const handleKpiCardClick = (status: StockStatus | 'ALL') => {
    if (statusFilter === status) {
      setStatusFilter('ALL'); // toggle off
    } else {
      setStatusFilter(status);
    }
    setCurrentPage(1);
  };

  // Paginated slice
  const paginatedMaterials = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedMaterials.slice(startIndex, startIndex + pageSize);
  }, [sortedMaterials, currentPage, pageSize]);

  // Table columns definition
  const tableColumns: Column<MaterialWithStock>[] = [
    {
      id: 'materialDetails',
      header: t('material_details'),
      sortable: true,
      className: 'min-w-[260px]',
      accessor: (m) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg border border-app-border dark:border-app-darkBorder bg-app-bg dark:bg-app-darkBg flex items-center justify-center shrink-0 overflow-hidden">
            {m.image ? (
              <img src={m.image} alt={m.materialCode} className="w-full h-full object-cover" />
            ) : (
              <Package className="w-5 h-5 text-app-muted" />
            )}
          </div>
          <div className="min-w-0">
            <span className="font-mono font-bold text-xs text-brand-blue tracking-tight block">
              {m.materialCode}
            </span>
            <p className="text-xs font-semibold text-app-text dark:text-app-darkText truncate max-w-xs">
              {m.description}
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'plant',
      header: t('plant'),
      sortable: true,
      align: 'left',
      className: 'w-[120px] min-w-[120px] max-w-[120px] px-4 whitespace-nowrap',
      accessor: (m) => (
        <span className="inline-flex items-center px-2 py-1 rounded-[6px] bg-[#F4F6F8] dark:bg-slate-800 text-[#344054] dark:text-slate-200 text-xs font-medium whitespace-nowrap tracking-wide select-none">
          {m.plant}
        </span>
      ),
    },
    {
      id: 'quantity',
      header: t('quantity'),
      sortable: true,
      align: 'right',
      className: 'min-w-[110px]',
      accessor: (m) => (
        <div className="text-right">
          <span
            className={`font-mono text-sm font-bold ${
              m.currentStock <= 0
                ? 'text-gi'
                : m.stockStatus === 'UNDERMIN'
                ? 'text-amber-600'
                : m.stockStatus === 'REORDERING'
                ? 'text-warn'
                : m.stockStatus === 'OVERMAX'
                ? 'text-purple-600'
                : 'text-app-text dark:text-app-darkText'
            }`}
          >
            {m.currentStock}
          </span>{' '}
          <span className="text-[11px] font-medium text-app-muted">{m.unit}</span>
        </div>
      ),
    },
    {
      id: 'materialType',
      header: t('type'),
      sortable: true,
      accessor: (m) => (
        <span className="text-xs text-app-secondary dark:text-app-darkSecondary">{m.materialType}</span>
      ),
    },
    {
      id: 'stockControl',
      header: 'Min / ROP / Max',
      align: 'center',
      className: 'min-w-[130px]',
      accessor: (m) => (
        <div className="font-mono text-[11px] text-app-secondary dark:text-app-darkSecondary">
          <span className="text-amber-600 font-semibold">{m.min}</span>
          <span className="text-app-muted mx-1">/</span>
          <span className="text-warn font-semibold">{m.rop}</span>
          <span className="text-app-muted mx-1">/</span>
          <span className="text-purple-600 font-semibold">{m.max}</span>
        </div>
      ),
    },
    {
      id: 'standardPrice',
      header: t('price'),
      sortable: true,
      align: 'right',
      accessor: (m) => (
        <span className="font-mono text-xs font-semibold text-app-text dark:text-app-darkText">
          ฿{Number(m.standardPrice || 0).toLocaleString()}
        </span>
      ),
    },
    {
      id: 'location',
      header: t('location'),
      accessor: (m) => (
        <span className="font-mono text-xs text-app-text dark:text-app-darkText">
          {m.storageLocation || '-'} / {m.storageBin || '-'}
        </span>
      ),
    },
    {
      id: 'lastMove',
      header: t('last_move'),
      sortable: true,
      className: 'min-w-[140px]',
      accessor: (m) => {
        if (!m.lastMovement) {
          return <span className="text-app-muted text-[11px]">No movement</span>;
        }
        return (
          <div>
            <div className="flex items-center gap-1.5">
              <StatusBadge status={m.lastMovement.transactionType} size="sm" showDot={false} />
              <span className={`font-mono text-[11px] font-bold ${m.lastMovement.quantity > 0 ? 'text-gr' : 'text-gi'}`}>
                {m.lastMovement.quantity > 0 ? `+${m.lastMovement.quantity}` : `${m.lastMovement.quantity}`}
              </span>
            </div>
            <span className="text-[10px] font-mono text-app-muted block mt-0.5">
              {formatDateTime(m.lastMovement.createdAt)}
            </span>
          </div>
        );
      },
    },
    {
      id: 'status',
      header: t('status'),
      align: 'center',
      className: 'w-28',
      accessor: (m) => <StatusBadge status={m.stockStatus} size="sm" />,
    },
    {
      id: 'actions',
      header: t('actions'),
      align: 'right',
      className: 'min-w-[160px]',
      accessor: (m) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          {/* GR Action */}
          {canGr && (
            <button
              type="button"
              onClick={() => setGrMaterial(m)}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-white bg-gr hover:bg-green-700 rounded-lg shadow-sm transition-all"
              title="Goods Receipt (+)"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>GR</span>
            </button>
          )}

          {/* GI Action */}
          {canGi && (
            <button
              type="button"
              onClick={() => setGiMaterial(m)}
              disabled={m.currentStock <= 0}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-white bg-gi hover:bg-red-700 rounded-lg shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              title="Goods Issue (-)"
            >
              <Minus className="w-3.5 h-3.5 stroke-[3]" />
              <span>GI</span>
            </button>
          )}

          {/* More Actions Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setActiveMenuRowId(activeMenuRowId === m.id ? null : m.id)}
              className="p-1.5 rounded-lg text-app-secondary hover:text-app-text hover:bg-app-bg dark:hover:bg-app-darkBorder transition-colors"
              title="More Actions"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {activeMenuRowId === m.id && (
              <div
                ref={menuRef}
                className="absolute right-0 mt-1 w-44 bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder rounded-xl shadow-modal z-30 py-1 text-xs animate-fade-in"
              >
                <button
                  type="button"
                  onClick={() => {
                    setActiveMenuRowId(null);
                    setDetailMaterial(m);
                    setDetailTab('info');
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-app-text dark:text-app-darkText hover:bg-app-bg dark:hover:bg-app-darkBorder text-left"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-app-muted" />
                  <span>View Detail</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveMenuRowId(null);
                    setDetailMaterial(m);
                    setDetailTab('movement');
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-app-text dark:text-app-darkText hover:bg-app-bg dark:hover:bg-app-darkBorder text-left"
                >
                  <History className="w-3.5 h-3.5 text-brand-blue" />
                  <span>Movement History</span>
                </button>

                {canAdjust && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveMenuRowId(null);
                      setAdjMaterial(m);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30 text-left"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Adjust Stock</span>
                  </button>
                )}

                {canEdit && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveMenuRowId(null);
                      setEditMaterial(m);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-app-text dark:text-app-darkText hover:bg-app-bg dark:hover:bg-app-darkBorder text-left border-t border-app-border dark:border-app-darkBorder mt-1 pt-1"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-app-muted" />
                    <span>Edit Material</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      ),
    },
  ];

  return (
    <PageLayout
      title={t('stock_balance_title')}
      subtitle={t('stock_balance_subtitle')}
    >
      <div className="space-y-4">
        {/* SUMMARY KPI FILTER CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
          {/* 1. TOTAL ITEMS */}
          <button
            type="button"
            onClick={() => handleKpiCardClick('ALL')}
            className={`p-3 sm:p-3.5 rounded-2xl border text-left transition-all shadow-subtle ${
              statusFilter === 'ALL'
                ? 'bg-brand-softBlue dark:bg-blue-950/60 border-brand-blue ring-2 ring-brand-blue/20'
                : 'bg-white dark:bg-app-darkSurface border-app-border dark:border-app-darkBorder hover:border-app-muted'
            }`}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-app-muted block truncate">
              {t('total_items')}
            </span>
            <div className="text-xl sm:text-2xl font-bold font-mono text-app-text dark:text-app-darkText mt-1">
              {statusCounts.total}
            </div>
            <span className="text-[10px] text-brand-blue font-medium mt-0.5 block">
              All Materials
            </span>
          </button>

          {/* 2. NORMAL */}
          <button
            type="button"
            onClick={() => handleKpiCardClick('NORMAL')}
            className={`p-3 sm:p-3.5 rounded-2xl border text-left transition-all shadow-subtle ${
              statusFilter === 'NORMAL'
                ? 'bg-gr-bg dark:bg-gr-darkBg border-gr ring-2 ring-gr/20'
                : 'bg-white dark:bg-app-darkSurface border-app-border dark:border-app-darkBorder hover:border-gr/40'
            }`}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-gr block truncate">
              {t('normal')}
            </span>
            <div className="text-xl sm:text-2xl font-bold font-mono text-gr mt-1">
              {statusCounts.normal}
            </div>
            <span className="text-[10px] text-app-muted font-medium mt-0.5 block">
              Optimal Level
            </span>
          </button>

          {/* 3. REORDERING */}
          <button
            type="button"
            onClick={() => handleKpiCardClick('REORDERING')}
            className={`p-3 sm:p-3.5 rounded-2xl border text-left transition-all shadow-subtle ${
              statusFilter === 'REORDERING'
                ? 'bg-warn-bg dark:bg-warn-darkBg border-warn ring-2 ring-warn/20'
                : 'bg-white dark:bg-app-darkSurface border-app-border dark:border-app-darkBorder hover:border-warn/40'
            }`}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-warn block truncate">
              {t('reordering')}
            </span>
            <div className="text-xl sm:text-2xl font-bold font-mono text-warn mt-1">
              {statusCounts.reordering}
            </div>
            <span className="text-[10px] text-app-muted font-medium mt-0.5 block">
              ≤ ROP Trigger
            </span>
          </button>

          {/* 4. OVERMAX */}
          <button
            type="button"
            onClick={() => handleKpiCardClick('OVERMAX')}
            className={`p-3 sm:p-3.5 rounded-2xl border text-left transition-all shadow-subtle ${
              statusFilter === 'OVERMAX'
                ? 'bg-purple-50 dark:bg-purple-950/60 border-purple-400 ring-2 ring-purple-400/20'
                : 'bg-white dark:bg-app-darkSurface border-app-border dark:border-app-darkBorder hover:border-purple-300'
            }`}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300 block truncate">
              {t('overmax')}
            </span>
            <div className="text-xl sm:text-2xl font-bold font-mono text-purple-700 dark:text-purple-300 mt-1">
              {statusCounts.overmax}
            </div>
            <span className="text-[10px] text-app-muted font-medium mt-0.5 block">
              &gt; Max Threshold
            </span>
          </button>

          {/* 5. UNDERMIN */}
          <button
            type="button"
            onClick={() => handleKpiCardClick('UNDERMIN')}
            className={`p-3 sm:p-3.5 rounded-2xl border text-left transition-all shadow-subtle ${
              statusFilter === 'UNDERMIN'
                ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-400 ring-2 ring-amber-400/20'
                : 'bg-white dark:bg-app-darkSurface border-app-border dark:border-app-darkBorder hover:border-amber-300'
            }`}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 block truncate">
              {t('undermin')}
            </span>
            <div className="text-xl sm:text-2xl font-bold font-mono text-amber-700 dark:text-amber-300 mt-1">
              {statusCounts.undermin}
            </div>
            <span className="text-[10px] text-app-muted font-medium mt-0.5 block">
              &lt; Min Critical
            </span>
          </button>

          {/* 6. OUT OF STOCK */}
          <button
            type="button"
            onClick={() => handleKpiCardClick('OUT_OF_STOCK')}
            className={`p-3 sm:p-3.5 rounded-2xl border text-left transition-all shadow-subtle ${
              statusFilter === 'OUT_OF_STOCK'
                ? 'bg-gi-bg dark:bg-gi-darkBg border-gi ring-2 ring-gi/20'
                : 'bg-white dark:bg-app-darkSurface border-app-border dark:border-app-darkBorder hover:border-gi/40'
            }`}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-gi block truncate">
              {t('out_of_stock')}
            </span>
            <div className="text-xl sm:text-2xl font-bold font-mono text-gi mt-1">
              {statusCounts.outOfStock}
            </div>
            <span className="text-[10px] text-app-muted font-medium mt-0.5 block">
              0 Available
            </span>
          </button>
        </div>

        {/* TOOLBAR */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder shadow-subtle flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto flex-1 max-w-2xl">
            <SearchInput
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder={t('search_material_placeholder')}
              className="w-full sm:w-80"
            />

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
              className="w-full sm:w-44"
            />
          </div>

          {statusFilter !== 'ALL' && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-app-muted">Filtered by:</span>
              <StatusBadge status={statusFilter} size="sm" />
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('ALL');
                  setCurrentPage(1);
                }}
                className="text-[11px] text-brand-blue font-semibold hover:underline ml-1"
              >
                Clear filter
              </button>
            </div>
          )}
        </div>

        {/* STOCK BALANCE TABLE */}
        <DataTable
          data={paginatedMaterials}
          columns={tableColumns}
          keyExtractor={(m) => m.id}
          onRowClick={(m) => {
            setDetailMaterial(m);
            setDetailTab('info');
          }}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onSortChange={handleSortChange}
          emptyTitle="No Stock Balance Records"
          emptyDescription="No materials match your active search and status filter."
          emptyType="materials"
          pagination={{
            currentPage,
            pageSize,
            totalItems: sortedMaterials.length,
            onPageChange: setCurrentPage,
            onPageSizeChange: setPageSize,
            pageSizeOptions: [10, 20, 50, 100],
          }}
        />
      </div>

      {/* DRAWERS */}
      <GoodsReceiptDrawer
        isOpen={Boolean(grMaterial)}
        onClose={() => setGrMaterial(null)}
        material={grMaterial}
      />

      <GoodsIssueDrawer
        isOpen={Boolean(giMaterial)}
        onClose={() => setGiMaterial(null)}
        material={giMaterial}
      />

      <StockAdjustmentDrawer
        isOpen={Boolean(adjMaterial)}
        onClose={() => setAdjMaterial(null)}
        material={adjMaterial}
      />

      <MaterialDetailDrawer
        isOpen={Boolean(detailMaterial)}
        onClose={() => setDetailMaterial(null)}
        material={detailMaterial}
        initialTab={detailTab}
      />

      <MaterialFormDrawer
        isOpen={Boolean(editMaterial)}
        onClose={() => setEditMaterial(null)}
        initialMaterial={editMaterial}
      />
    </PageLayout>
  );
};
