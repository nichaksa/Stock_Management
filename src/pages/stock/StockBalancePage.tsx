import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Material, StockStatus, MaterialWithStock, ItemWithStock, StockLotItem } from '../../types/stock';
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
import { MaterialLotViewToggle, InventoryViewMode } from '../../components/stock/MaterialLotViewToggle';
import { useStock } from '../../context/StockContext';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useCascadingFilters } from '../../hooks/useCascadingFilters';
import { getCurrentStock, calculateStockStatus, getLastMovement, groupMaterialsByItem } from '../../utils/stockCalculation';
import { formatDateTime } from '../../utils/dateRange';
import {
  Plus,
  Minus,
  MoreVertical,
  Layers,
  Building2,
  Package,
  History,
  Edit2,
  Sliders,
  ExternalLink,
  ArrowLeftRight,
  ChevronDown,
  ChevronRight,
  Calendar,
  Info,
  Boxes,
  Store,
  Tag,
  RotateCcw,
} from 'lucide-react';

export const StockBalancePage: React.FC = () => {
  const { materials, transactions, getLotBalances } = useStock();
  const { hasPermission } = useAuth();
  const { t, language } = useLanguage();
  const isTh = language === 'th';

  const [viewMode, setViewMode] = useState<InventoryViewMode>('MATERIAL');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StockStatus | 'ALL'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Active lot balances (Single Source of Truth)
  const allLotBalances = useMemo(() => {
    return getLotBalances();
  }, [getLotBalances]);

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
  } = useCascadingFilters({
    materials,
    transactions,
    lotBalances: allLotBalances,
    initialPlant: 'All Plants',
  });

  // Sorting
  const [sortColumn, setSortColumn] = useState<string | null>('totalStock');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Expanded rows
  // Level 1: Item expansion (Item -> Materials)
  const [expandedItemIds, setExpandedItemIds] = useState<Set<string>>(new Set());
  // Level 2: Material expansion (Material -> Lots in Lot View)
  const [expandedMaterialIds, setExpandedMaterialIds] = useState<Set<string>>(new Set());

  const toggleItemExpansion = (itemId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedItemIds(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const toggleMaterialExpansion = (materialId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedMaterialIds(prev => {
      const next = new Set(prev);
      if (next.has(materialId)) {
        next.delete(materialId);
      } else {
        next.add(materialId);
      }
      return next;
    });
  };

  // Reset pagination on search or filter change
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setCurrentPage(1);
  };

  const handlePlantChange = (val: string) => {
    setSelectedPlant(val);
    setCurrentPage(1);
  };

  const handleStoreChange = (val: string) => {
    setSelectedStore(val);
    setCurrentPage(1);
  };

  const handleItemChange = (val: string) => {
    setSelectedItem(val);
    setCurrentPage(1);
  };

  const handleMaterialChange = (val: string) => {
    setSelectedMaterial(val);
    setCurrentPage(1);
  };

  const handleLotChange = (val: string) => {
    setSelectedLot(val);
    setCurrentPage(1);
  };

  // Drawers
  const [grMaterial, setGrMaterial] = useState<Material | null>(null);
  const [giMaterial, setGiMaterial] = useState<Material | null>(null);
  const [adjMaterial, setAdjMaterial] = useState<Material | null>(null);
  const [detailMaterial, setDetailMaterial] = useState<Material | null>(null);
  const [editMaterial, setEditMaterial] = useState<Material | null>(null);
  const [detailTab, setDetailTab] = useState<'info' | 'movement' | 'lots'>('info');

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
  const canTransfer = hasPermission('TRANSFER_CREATE');

  // Active lot balances under current plant/store filter context (Single Source of Truth)
  const lotBalances = useMemo(() => {
    const plantFilter = selectedPlant === 'All Plants' || selectedPlant === 'ALL' ? undefined : selectedPlant;
    const storeFilter = selectedStore === 'All Stores' || selectedStore === 'ALL' ? undefined : selectedStore;
    return getLotBalances(plantFilter, storeFilter);
  }, [getLotBalances, selectedPlant, selectedStore]);

  // Derive full stock data for all materials (Level 2) - strictly sourced from Lot Balances
  const enrichedMaterials: MaterialWithStock[] = useMemo(() => {
    return materials.map(m => {
      const matLots = allLotBalances.filter(l => l.materialId === m.id);
      const currentStock = matLots.length > 0
        ? matLots.reduce((sum, l) => sum + l.quantity, 0)
        : getCurrentStock(m.id, transactions);
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
  }, [materials, transactions, allLotBalances]);

  // Group materials by high-level Item (Level 1)
  const allGroupedItems: ItemWithStock[] = useMemo(() => {
    return groupMaterialsByItem(enrichedMaterials, allLotBalances);
  }, [enrichedMaterials, allLotBalances]);

  // Status counts for Summary KPI Cards (Aggregated at Item level)
  const statusCounts = useMemo(() => {
    let total = allGroupedItems.length;
    let normal = 0;
    let reordering = 0;
    let overmax = 0;
    let undermin = 0;
    let outOfStock = 0;

    allGroupedItems.forEach(item => {
      if (item.stockStatus === 'NORMAL') normal++;
      else if (item.stockStatus === 'REORDERING') reordering++;
      else if (item.stockStatus === 'OVERMAX') overmax++;
      else if (item.stockStatus === 'UNDERMIN') undermin++;
      else if (item.stockStatus === 'OUT_OF_STOCK') outOfStock++;
    });

    return { total, normal, reordering, overmax, undermin, outOfStock };
  }, [allGroupedItems]);

  // Helper to match item + material against search query with punctuation normalization
  const matchItemAndMaterial = (
    item: ItemWithStock,
    material: MaterialWithStock,
    query: string,
    materialLots: StockLotItem[] = []
  ): boolean => {
    if (!query) return true;

    const rawTokens = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
    if (rawTokens.length === 0) return true;

    // Build comprehensive search text corpus for this material and parent item
    const itemCode = (item.itemCode || '').toLowerCase();
    const itemName = (item.itemName || '').toLowerCase();
    const itemDesc = (item.description || '').toLowerCase();

    const matCode = (material.materialCode || '').toLowerCase();
    const matDesc = (material.description || '').toLowerCase();
    const matItemName = (material.itemName || '').toLowerCase();
    const matItemCode = (material.itemCode || '').toLowerCase();
    const matType = (material.materialType || '').toLowerCase();
    const sloc = (material.storageLocation || '').toLowerCase();
    const bin = (material.storageBin || '').toLowerCase();
    const plant = (material.plant || '').toLowerCase();

    const lotStrings = materialLots.map(l =>
      `${l.lot || ''} ${l.lotNo || ''} ${l.batchNumber || ''} ${l.batchNo || ''}`.toLowerCase()
    ).join(' ');

    // Combined text with original characters
    const rawCombined = `${itemCode} ${itemName} ${itemDesc} ${matCode} ${matDesc} ${matItemName} ${matItemCode} ${matType} ${sloc} ${bin} ${plant} ${lotStrings}`;

    // Normalized text where punctuation (commas, underscores, dashes, slashes) is converted to spaces
    const normalizedCombined = rawCombined.replace(/[,_\-\/]+/g, ' ');

    // Check if every token in query is found in rawCombined or normalizedCombined
    return rawTokens.every(token => {
      const cleanToken = token.replace(/[,_\-\/]+/g, ' ').trim();
      return (
        rawCombined.includes(token) ||
        normalizedCombined.includes(token) ||
        (cleanToken !== '' && normalizedCombined.includes(cleanToken))
      );
    });
  };

  // Filter Items with Cascading Plant -> SLoc -> Item -> Material -> Lot + Status + Search
  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return allGroupedItems
      .map(item => {
        // 1. Plant filter on parent item / materials
        if (selectedPlant !== 'ALL' && selectedPlant !== 'All Plants') {
          const matchesPlant = item.plant === selectedPlant || item.materials.some(m => m.plant === selectedPlant || lotBalances.some(l => l.materialId === m.id && l.plant === selectedPlant));
          if (!matchesPlant) return null;
        }

        // Filter the child materials of this item according to active filters + search query
        const matchingMaterials = item.materials
          .map(m => {
            // Find lots for this material in the active plant & store & lot filter context
            let matLots = lotBalances.filter(l => l.materialId === m.id);

            // Plant filter
            if (selectedPlant !== 'ALL' && selectedPlant !== 'All Plants') {
              const matchesPlant = m.plant === selectedPlant || matLots.some(l => l.plant === selectedPlant);
              if (!matchesPlant) return null;
              matLots = matLots.filter(l => l.plant === selectedPlant);
            }

            // SLoc / Store filter
            if (selectedStore !== 'ALL' && selectedStore !== 'All Stores') {
              const isLotTracked = allLotBalances.some(l => l.materialId === m.id);
              if (isLotTracked) {
                if (matLots.length === 0) return null;
              } else {
                if ((m.storageLocation || 'MAIN') !== selectedStore) return null;
              }
            }

            // Item filter
            if (selectedItem !== 'ALL') {
              const matchesItem = item.itemName === selectedItem || item.itemCode === selectedItem || m.itemName === selectedItem || m.itemCode === selectedItem;
              if (!matchesItem) return false;
            }

            // Material filter
            if (selectedMaterial !== 'ALL' && m.materialCode !== selectedMaterial && m.id !== selectedMaterial) {
              return null;
            }

            // Lot filter
            if (selectedLot !== 'ALL') {
              const matchingLots = matLots.filter(l => l.lot === selectedLot || l.lotNo === selectedLot);
              if (matchingLots.length === 0) return null;
              matLots = matchingLots;
            }

            // Search query matching
            if (query) {
              const matches = matchItemAndMaterial(item, m, query, matLots);
              if (!matches) return null;
            }

            // Recalculate material stock and values strictly based on filtered lot/movement dataset (Single Source of Truth)
            const isLotTracked = allLotBalances.some(l => l.materialId === m.id);
            let currentStock: number;
            if (isLotTracked) {
              currentStock = matLots.reduce((sum, l) => sum + l.quantity, 0);
            } else {
              const plantFilter = selectedPlant === 'ALL' || selectedPlant === 'All Plants' ? undefined : selectedPlant;
              const storeFilter = selectedStore === 'ALL' || selectedStore === 'All Stores' ? undefined : selectedStore;
              currentStock = getCurrentStock(m.id, transactions, plantFilter, storeFilter);
            }

            const totalValue = currentStock * (m.standardPrice || 0);
            const stockStatus = calculateStockStatus(m, currentStock);

            return {
              ...m,
              currentStock,
              totalValue,
              stockStatus,
            };
          })
          .filter((m): m is MaterialWithStock => m !== null);

        // If no child materials match the filters/search, exclude this item
        if (matchingMaterials.length === 0) {
          return null;
        }

        // Status card filter
        if (statusFilter !== 'ALL') {
          const itemMatchesStatus = item.stockStatus === statusFilter;
          const anyMatMatchesStatus = matchingMaterials.some(m => m.stockStatus === statusFilter);
          if (!itemMatchesStatus && !anyMatMatchesStatus) {
            return null;
          }
        }

        // Return the item with its matching materials (Item Total strictly = SUM of matching materials)
        const filteredTotalStock = matchingMaterials.reduce((sum, m) => sum + m.currentStock, 0);
        const filteredTotalValue = matchingMaterials.reduce((sum, m) => sum + m.totalValue, 0);
        const matchingMatIds = new Set(matchingMaterials.map(m => m.id));
        const filteredLotCount = lotBalances.filter(l => matchingMatIds.has(l.materialId)).length;

        return {
          ...item,
          materials: matchingMaterials,
          materialCount: matchingMaterials.length,
          totalStock: filteredTotalStock,
          totalValue: filteredTotalValue,
          lotCount: filteredLotCount > 0 ? filteredLotCount : matchingMaterials.reduce((acc, m) => acc + (m.currentStock > 0 ? 1 : 0), 0),
        };
      })
      .filter((item): item is ItemWithStock => item !== null);
  }, [allGroupedItems, selectedPlant, selectedStore, selectedItem, selectedMaterial, selectedLot, statusFilter, searchQuery, lotBalances, allLotBalances, transactions]);

  // Automatically expand matching items and materials on new search query, while preserving full manual expand/collapse interactivity
  const prevSearchQueryRef = useRef('');
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed !== prevSearchQueryRef.current) {
      prevSearchQueryRef.current = trimmed;
      if (trimmed) {
        const matchingItemIds = new Set<string>();
        const matchingMatIds = new Set<string>();
        filteredItems.forEach(item => {
          matchingItemIds.add(item.itemId);
          item.materials.forEach(m => matchingMatIds.add(m.id));
        });
        setExpandedItemIds(matchingItemIds);
        setExpandedMaterialIds(matchingMatIds);
      }
    }
  }, [searchQuery, filteredItems]);

  // Sort items
  const sortedItems = useMemo(() => {
    if (!sortColumn || !sortDirection) return filteredItems;

    return [...filteredItems].sort((a, b) => {
      let valA: any = (a as any)[sortColumn];
      let valB: any = (b as any)[sortColumn];

      if (sortColumn === 'totalStock') {
        valA = a.totalStock;
        valB = b.totalStock;
      } else if (sortColumn === 'itemDetails') {
        valA = a.itemName.toLowerCase();
        valB = b.itemName.toLowerCase();
      } else if (sortColumn === 'materialCount') {
        valA = a.materialCount;
        valB = b.materialCount;
      } else if (sortColumn === 'totalValue') {
        valA = a.totalValue;
        valB = b.totalValue;
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredItems, sortColumn, sortDirection]);

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
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedItems.slice(startIndex, startIndex + pageSize);
  }, [sortedItems, currentPage, pageSize]);

  // ---------------------------------------------------------------------------
  // Top-Level Table Columns (Level 1: Item Level for both Material & Lot Views)
  // ---------------------------------------------------------------------------
  const itemTableColumns: Column<ItemWithStock>[] = [
    {
      id: 'itemDetails',
      header: t('item') || 'Item / Category',
      sortable: true,
      className: 'min-w-[280px]',
      accessor: (item) => {
        const isExpanded = expandedItemIds.has(item.itemId);
        return (
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={(e) => toggleItemExpansion(item.itemId, e)}
              className={`p-1 rounded-md transition-colors ${
                isExpanded
                  ? 'bg-brand-softBlue dark:bg-blue-950 text-brand-blue'
                  : 'text-app-muted hover:text-brand-blue hover:bg-app-bg dark:hover:bg-app-darkBorder'
              }`}
              title={isExpanded ? 'Collapse Materials' : `Expand ${item.materialCount} Material(s)`}
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-brand-blue stroke-[2.5]" />
              ) : (
                <ChevronRight className="w-4 h-4 stroke-[2]" />
              )}
            </button>

            <div className="w-10 h-10 rounded-lg border border-app-border dark:border-app-darkBorder bg-app-bg dark:bg-app-darkBg flex items-center justify-center shrink-0 overflow-hidden shadow-subtle">
              <Boxes className="w-5 h-5 text-brand-blue" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-xs text-app-text dark:text-app-darkText">
                  {item.itemName}
                </span>
                <span className="font-mono text-[10px] text-brand-blue bg-brand-softBlue dark:bg-blue-950/60 px-1.5 py-0.2 rounded font-semibold">
                  {item.itemCode}
                </span>
              </div>
              <p className="text-[11px] text-app-muted truncate max-w-xs mt-0.5">
                {item.materials.map(m => m.materialCode).join(', ')}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      id: 'plant',
      header: t('plant'),
      sortable: true,
      align: 'left',
      className: 'w-[110px] min-w-[110px] px-4 whitespace-nowrap',
      accessor: (item) => (
        <span className="inline-flex items-center px-2 py-1 rounded-[6px] bg-[#F4F6F8] dark:bg-slate-800 text-[#344054] dark:text-slate-200 text-xs font-medium whitespace-nowrap tracking-wide select-none">
          {item.plant}
        </span>
      ),
    },
    {
      id: 'totalStock',
      header: t('quantity') || 'Total Stock',
      sortable: true,
      align: 'right',
      className: 'min-w-[130px]',
      accessor: (item) => (
        <div className="text-right">
          <span
            className={`font-mono text-sm font-bold ${
              item.totalStock <= 0
                ? 'text-gi'
                : item.stockStatus === 'UNDERMIN'
                ? 'text-amber-600'
                : item.stockStatus === 'REORDERING'
                ? 'text-warn'
                : item.stockStatus === 'OVERMAX'
                ? 'text-purple-600'
                : 'text-app-text dark:text-app-darkText'
            }`}
          >
            {item.totalStock}
          </span>{' '}
          <span className="text-[11px] font-medium text-app-muted">{item.unit}</span>
        </div>
      ),
    },
    {
      id: 'materialCount',
      header: viewMode === 'MATERIAL' ? 'Materials' : 'Materials / Lots',
      sortable: true,
      align: 'center',
      className: 'w-[140px]',
      accessor: (item) => (
        <div className="flex items-center justify-center gap-1.5">
          <span
            onClick={(e) => toggleItemExpansion(item.itemId, e)}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono font-semibold bg-brand-softBlue dark:bg-blue-950/60 text-brand-blue cursor-pointer hover:bg-blue-100 transition-colors"
          >
            <Package className="w-3 h-3" />
            {item.materialCount} {item.materialCount === 1 ? 'Material' : 'Materials'}
          </span>
          {viewMode === 'LOT' && item.lotCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
              <Layers className="w-3 h-3" />
              {item.lotCount} Lots
            </span>
          )}
        </div>
      ),
    },
    {
      id: 'totalValue',
      header: t('total_value') || 'Total Value',
      sortable: true,
      align: 'right',
      accessor: (item) => (
        <span className="font-mono text-xs font-bold text-app-text dark:text-app-darkText">
          ฿{Number(item.totalValue || 0).toLocaleString()}
        </span>
      ),
    },
    {
      id: 'status',
      header: t('status'),
      align: 'center',
      className: 'w-28',
      accessor: (item) => <StatusBadge status={item.stockStatus} size="sm" />,
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
              All Items
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
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 block truncate">
              {t('undermin')}
            </span>
            <div className="text-xl sm:text-2xl font-bold font-mono text-amber-600 mt-1">
              {statusCounts.undermin}
            </div>
            <span className="text-[10px] text-app-muted font-medium mt-0.5 block">
              &lt; Min Threshold
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

        {/* CASCADING FILTER TOOLBAR */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder shadow-subtle space-y-3">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 flex-1">
              {/* Search */}
              <SearchInput
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder={t('search_material_placeholder')}
                className="w-full sm:w-64"
              />

              {/* 1. Plant Filter */}
              <FilterSelect
                label={t('plant_filter')}
                value={selectedPlant}
                onChange={handlePlantChange}
                prefixIcon={<Building2 className="w-3.5 h-3.5 text-brand-blue" />}
                options={plantOptions}
                className="w-full sm:w-44"
              />

              {/* 2. SLoc / Store Filter (Cascaded) */}
              <FilterSelect
                label={isTh ? 'คลัง (SLoc)' : 'Store'}
                value={selectedStore}
                onChange={handleStoreChange}
                prefixIcon={<Store className="w-3.5 h-3.5 text-purple-600" />}
                options={storeOptions}
                className="w-full sm:w-44"
              />

              {/* 3. Item Filter (Cascaded) */}
              <FilterSelect
                label={isTh ? 'พัสดุ (Item)' : 'Item'}
                value={selectedItem}
                onChange={handleItemChange}
                prefixIcon={<Package className="w-3.5 h-3.5 text-amber-600" />}
                options={itemOptions}
                className="w-full sm:w-44"
              />

              {/* 4. Material Filter (Cascaded) */}
              <FilterSelect
                label={isTh ? 'รหัส (Material)' : 'Material'}
                value={selectedMaterial}
                onChange={handleMaterialChange}
                prefixIcon={<Boxes className="w-3.5 h-3.5 text-emerald-600" />}
                options={materialOptions}
                className="w-full sm:w-48"
              />

              {/* 5. Lot Filter (Cascaded - in Lot View) */}
              {viewMode === 'LOT' && (
                <FilterSelect
                  label={isTh ? 'ล็อต (Lot)' : 'Lot'}
                  value={selectedLot}
                  onChange={handleLotChange}
                  prefixIcon={<Tag className="w-3.5 h-3.5 text-purple-600" />}
                  options={lotOptions}
                  className="w-full sm:w-44"
                />
              )}

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

            <div className="flex items-center gap-3 justify-between lg:justify-end shrink-0">
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
                    Clear status
                  </button>
                </div>
              )}

              {/* VIEW SWITCHER: MATERIAL VIEW (Item -> Material) | LOT VIEW (Item -> Material -> Lot) */}
              <MaterialLotViewToggle viewMode={viewMode} onChange={setViewMode} />
            </div>
          </div>
        </div>

        {/* HIERARCHICAL STOCK BALANCE TABLE */}
        <DataTable
          data={paginatedItems}
          columns={itemTableColumns}
          keyExtractor={(item) => item.itemId}
          expandedRowIds={expandedItemIds}
          renderExpandedRow={(item) => {
            // -----------------------------------------------------------------
            // MODE 1: MATERIAL VIEW (Level 1: Item -> Level 2: Materials)
            // -----------------------------------------------------------------
            if (viewMode === 'MATERIAL') {
              return (
                <div className="p-4 bg-slate-50/90 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-200/70 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-brand-blue" />
                      <span className="text-xs font-bold uppercase tracking-wider text-app-text dark:text-app-darkText">
                        {item.itemName} — Material Breakdown ({item.materials.length} Materials)
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold text-app-text dark:text-app-darkText">
                      Item Total: <span className="text-brand-blue">{item.totalStock} {item.unit}</span>
                    </span>
                  </div>

                  <div className="overflow-x-auto border border-app-border dark:border-app-darkBorder rounded-xl bg-white dark:bg-app-darkSurface">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-app-bg dark:bg-app-darkBg text-[10px] uppercase font-bold text-app-secondary dark:text-app-darkSecondary border-b border-app-border dark:border-app-darkBorder whitespace-nowrap">
                        <tr>
                          <th className="py-2.5 px-3">Material Code</th>
                          <th className="py-2.5 px-3">Description</th>
                          <th className="py-2.5 px-3 text-right">Quantity</th>
                          <th className="py-2.5 px-3 text-center">Min / ROP / Max</th>
                          <th className="py-2.5 px-3 text-right">Unit Price</th>
                          <th className="py-2.5 px-3">Location / Bin</th>
                          <th className="py-2.5 px-3">Last Move</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                          <th className="py-2.5 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-app-border dark:divide-app-darkBorder">
                        {item.materials.map(m => (
                          <tr key={m.id} className="hover:bg-app-bg/50 dark:hover:bg-app-darkBorder/30 transition-colors">
                            <td className="py-2.5 px-3 font-mono font-bold text-brand-blue whitespace-nowrap">
                              {m.materialCode}
                            </td>
                            <td className="py-2.5 px-3 font-medium text-app-text dark:text-app-darkText">
                              {m.description}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-right text-app-text dark:text-app-darkText whitespace-nowrap">
                              <span className={m.currentStock <= 0 ? 'text-gi' : 'text-emerald-600 dark:text-emerald-400'}>
                                {m.currentStock}
                              </span>{' '}
                              <span className="text-[11px] font-normal text-app-muted">{m.unit}</span>
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[11px] text-center text-app-secondary dark:text-app-darkSecondary whitespace-nowrap">
                              <span className="text-amber-600 font-semibold">{m.min}</span>
                              <span className="text-app-muted mx-1">/</span>
                              <span className="text-warn font-semibold">{m.rop}</span>
                              <span className="text-app-muted mx-1">/</span>
                              <span className="text-purple-600 font-semibold">{m.max}</span>
                            </td>
                            <td className="py-2.5 px-3 font-mono text-right text-app-text dark:text-app-darkText whitespace-nowrap">
                              ฿{Number(m.standardPrice || 0).toLocaleString()}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-app-secondary dark:text-app-darkSecondary whitespace-nowrap">
                              {m.storageLocation || '-'} / {m.storageBin || '-'}
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              {m.lastMovement ? (
                                <span className="text-[11px] font-mono text-app-muted">
                                  {m.lastMovement.quantity > 0 ? `+${m.lastMovement.quantity}` : `${m.lastMovement.quantity}`} ({formatDateTime(m.lastMovement.createdAt)})
                                </span>
                              ) : (
                                <span className="text-app-muted text-[11px]">-</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center whitespace-nowrap">
                              <StatusBadge status={m.stockStatus} size="sm" />
                            </td>
                            <td className="py-2.5 px-3 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                                {canGr && (
                                  <button
                                    type="button"
                                    onClick={() => setGrMaterial(m)}
                                    className="px-2 py-0.5 text-xs font-bold text-white bg-gr hover:bg-green-700 rounded-md shadow-sm transition-all"
                                    title="Goods Receipt (+)"
                                  >
                                    GR
                                  </button>
                                )}
                                {canGi && (
                                  <button
                                    type="button"
                                    onClick={() => setGiMaterial(m)}
                                    disabled={m.currentStock <= 0}
                                    className="px-2 py-0.5 text-xs font-bold text-white bg-gi hover:bg-red-700 rounded-md shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                    title="Goods Issue (-)"
                                  >
                                    GI
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDetailMaterial(m);
                                    setDetailTab('info');
                                  }}
                                  className="p-1 rounded text-app-secondary hover:text-brand-blue hover:bg-brand-softBlue dark:hover:bg-blue-950/40 transition-colors"
                                  title="View Material Detail"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            }

            // -----------------------------------------------------------------
            // MODE 2: LOT VIEW (Level 1: Item -> Level 2: Materials -> Level 3: Lots)
            // -----------------------------------------------------------------
            return (
              <div className="p-4 bg-slate-50/90 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-4 animate-fade-in">
                <div className="flex items-center justify-between pb-1 border-b border-slate-200/70 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-brand-blue" />
                    <span className="text-xs font-bold uppercase tracking-wider text-app-text dark:text-app-darkText">
                      {item.itemName} — Material & Lot Breakdown
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-app-text dark:text-app-darkText">
                    Item Total: <span className="text-brand-blue">{item.totalStock} {item.unit}</span>
                  </span>
                </div>

                {/* Level 2: List of Materials */}
                <div className="space-y-3">
                  {item.materials.map(m => {
                    const materialLots = lotBalances.filter(l => l.materialId === m.id);
                    const isMaterialExpanded = expandedMaterialIds.has(m.id);

                    return (
                      <div
                        key={m.id}
                        className="rounded-xl border border-app-border dark:border-app-darkBorder bg-white dark:bg-app-darkSurface shadow-subtle overflow-hidden"
                      >
                        {/* Material Header Row */}
                        <div
                          onClick={() => toggleMaterialExpansion(m.id)}
                          className={`p-3 flex items-center justify-between gap-3 cursor-pointer select-none transition-colors ${
                            isMaterialExpanded
                              ? 'bg-brand-softBlue/40 dark:bg-blue-950/40 border-b border-app-border dark:border-app-darkBorder'
                              : 'hover:bg-app-bg/50 dark:hover:bg-app-darkBorder/30'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <button
                              type="button"
                              onClick={(e) => toggleMaterialExpansion(m.id, e)}
                              className="p-1 rounded text-app-muted hover:text-brand-blue transition-colors"
                              title={isMaterialExpanded ? 'Collapse Lots' : 'Expand Lots'}
                            >
                              {isMaterialExpanded ? (
                                <ChevronDown className="w-4 h-4 text-brand-blue stroke-[2.5]" />
                              ) : (
                                <ChevronRight className="w-4 h-4 stroke-[2]" />
                              )}
                            </button>

                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-xs text-brand-blue">
                                  {m.materialCode}
                                </span>
                                <span className="text-xs font-semibold text-app-text dark:text-app-darkText truncate">
                                  {m.description}
                                </span>
                              </div>
                              <span className="text-[11px] text-app-muted block font-mono">
                                Plant: {m.plant} · Loc: {m.storageLocation || '-'} / {m.storageBin || '-'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 shrink-0" onClick={(e) => e.stopPropagation()}>
                            {/* Material Stock */}
                            <div className="text-right">
                              <span className="text-[10px] uppercase font-bold text-app-muted block">Material Stock</span>
                              <span className="font-mono text-sm font-bold text-app-text dark:text-app-darkText">
                                {m.currentStock} <span className="text-xs font-normal text-app-muted">{m.unit}</span>
                              </span>
                            </div>

                            {/* Active Lots Badge */}
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-blue-50 dark:bg-blue-950/70 text-brand-blue border border-blue-200/80 dark:border-blue-900/60">
                              <Layers className="w-3 h-3" />
                              {materialLots.length} {materialLots.length === 1 ? 'Lot' : 'Lots'}
                            </span>

                            {/* Status */}
                            <StatusBadge status={m.stockStatus} size="sm" />

                            {/* Quick Action */}
                            <div className="flex items-center gap-1">
                              {canGr && (
                                <button
                                  type="button"
                                  onClick={() => setGrMaterial(m)}
                                  className="px-2 py-1 text-xs font-bold text-white bg-gr hover:bg-green-700 rounded-lg shadow-sm transition-all"
                                  title="Goods Receipt (+)"
                                >
                                  GR
                                </button>
                              )}
                              {canGi && (
                                <button
                                  type="button"
                                  onClick={() => setGiMaterial(m)}
                                  disabled={m.currentStock <= 0}
                                  className="px-2 py-1 text-xs font-bold text-white bg-gi hover:bg-red-700 rounded-lg shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                  title="Goods Issue (-)"
                                >
                                  GI
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Level 3: Lots Table under this Material */}
                        {isMaterialExpanded && (
                          <div className="p-3.5 bg-slate-50/60 dark:bg-slate-900/40 space-y-2 animate-fade-in">
                            {materialLots.length === 0 ? (
                              <div className="p-3 bg-white dark:bg-app-darkSurface rounded-lg text-xs text-app-muted flex items-center gap-2 border border-app-border dark:border-app-darkBorder">
                                <Info className="w-4 h-4 text-app-muted" />
                                <span>No individual lots recorded. Base material stock: <strong className="font-mono text-app-text dark:text-app-darkText">{m.currentStock} {m.unit}</strong>.</span>
                              </div>
                            ) : (
                              <div className="overflow-x-auto border border-app-border dark:border-app-darkBorder rounded-lg bg-white dark:bg-app-darkSurface">
                                <table className="w-full text-left text-xs border-collapse">
                                  <thead className="bg-app-bg dark:bg-app-darkBg text-[10px] uppercase font-bold text-app-secondary dark:text-app-darkSecondary border-b border-app-border dark:border-app-darkBorder whitespace-nowrap">
                                    <tr>
                                      <th className="py-2 px-3">Lot No.</th>
                                      <th className="py-2 px-3">Batch No.</th>
                                      <th className="py-2 px-3 text-right">Available Qty</th>
                                      <th className="py-2 px-3">Plant</th>
                                      <th className="py-2 px-3">Store / SLoc</th>
                                      <th className="py-2 px-3">Storage Bin</th>
                                      <th className="py-2 px-3">Received Date</th>
                                      <th className="py-2 px-3">Expiry Date</th>
                                      <th className="py-2 px-3 text-right">Action</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-app-border dark:divide-app-darkBorder">
                                    {materialLots.map(l => (
                                      <tr key={`${l.lotNo || l.lot}-${l.plant || ''}-${l.storageLocation || l.store || ''}`} className="hover:bg-app-bg/40 dark:hover:bg-app-darkBorder/20 transition-colors">
                                        <td className="py-2 px-3 font-mono font-bold text-brand-blue flex items-center gap-1.5">
                                          <span className="w-1.5 h-1.5 rounded-full bg-brand-blue"></span>
                                          {l.lotNo || l.lot}
                                        </td>
                                        <td className="py-2 px-3 font-mono text-app-secondary dark:text-app-darkSecondary">
                                          {l.batchNo || l.batchNumber || '-'}
                                        </td>
                                        <td className="py-2 px-3 font-mono font-bold text-right text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                                          {l.quantity} <span className="text-xs font-normal text-app-muted">{l.unit}</span>
                                        </td>
                                        <td className="py-2 px-3 font-mono text-app-secondary dark:text-app-darkSecondary">
                                          {l.plant}
                                        </td>
                                        <td className="py-2 px-3 font-mono text-app-secondary dark:text-app-darkSecondary">
                                          {l.storageLocation || m.storageLocation || '-'}
                                        </td>
                                        <td className="py-2 px-3 font-mono text-app-secondary dark:text-app-darkSecondary">
                                          {l.storageBin || m.storageBin || '-'}
                                        </td>
                                        <td className="py-2 px-3 font-mono text-app-secondary dark:text-app-darkSecondary whitespace-nowrap">
                                          {l.receivedDate ? formatDateTime(l.receivedDate) : '-'}
                                        </td>
                                        <td className="py-2 px-3 font-mono text-app-secondary dark:text-app-darkSecondary whitespace-nowrap">
                                          {l.expiryDate ? (
                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[11px] bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-medium">
                                              <Calendar className="w-3 h-3" />
                                              {l.expiryDate}
                                            </span>
                                          ) : (
                                            '-'
                                          )}
                                        </td>
                                        <td className="py-2 px-3 text-right whitespace-nowrap">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setDetailMaterial(m);
                                              setDetailTab('lots');
                                            }}
                                            className="text-[11px] font-semibold text-brand-blue hover:underline"
                                          >
                                            View Movement →
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          }}
          onRowClick={(item) => toggleItemExpansion(item.itemId)}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onSortChange={handleSortChange}
          emptyTitle="No Stock Balance Records"
          emptyDescription="No items match your active search and status filter."
          emptyType="materials"
          pagination={{
            currentPage,
            pageSize,
            totalItems: sortedItems.length,
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
