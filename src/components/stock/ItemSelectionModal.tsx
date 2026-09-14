import React, { useState, useMemo, useEffect } from 'react';
import { Material, StockLotItem, MaterialWithStock, ItemWithStock } from '../../types/stock';
import { useStock } from '../../context/StockContext';
import { useLanguage } from '../../context/LanguageContext';
import { MaterialLotViewToggle, InventoryViewMode } from './MaterialLotViewToggle';
import { SearchInput } from '../common/SearchInput';
import { FilterSelect } from '../common/FilterSelect';
import { StatusBadge } from '../common/StatusBadge';
import { getCurrentStock, calculateStockStatus, groupMaterialsByItem } from '../../utils/stockCalculation';
import { getAllPlants, getStoresForPlant } from '../../utils/plantStoreMaster';
import {
  X,
  Check,
  Package,
  Layers,
  MapPin,
  Tag,
  Building2,
  Boxes,
  ChevronDown,
  ChevronRight,
  Search,
  CheckCircle2,
  Calendar,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';

export interface SelectedItemPayload {
  material: Material;
  selectedMode: 'MATERIAL' | 'LOT';
  itemCode?: string;
  itemName?: string;
  lot?: string;
  batchNumber?: string;
  storageLocation?: string;
  storageBin?: string;
  availableStock: number;
}

interface ItemSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (payload: SelectedItemPayload) => void;
  targetPlant?: string;
  targetStore?: string;
  title?: string;
  excludeMaterialKeys?: string[];
  initialMode?: InventoryViewMode;
}

export const ItemSelectionModal: React.FC<ItemSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  targetPlant,
  targetStore,
  title,
  excludeMaterialKeys = [],
  initialMode = 'MATERIAL',
}) => {
  const { materials, transactions, getLotBalances } = useStock();
  const { t, language } = useLanguage();
  const isTh = language === 'th';

  const [viewMode, setViewMode] = useState<InventoryViewMode>(initialMode);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlant, setSelectedPlant] = useState<string>(targetPlant || 'All Plants');
  const [selectedStore, setSelectedStore] = useState<string>(targetStore || 'ALL');

  // Expanded items & materials
  const [expandedItemIds, setExpandedItemIds] = useState<Set<string>>(new Set());
  const [expandedMaterialIds, setExpandedMaterialIds] = useState<Set<string>>(new Set());

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setViewMode(initialMode);
      setSearchQuery('');
      if (targetPlant && targetPlant !== 'All Plants') {
        setSelectedPlant(targetPlant);
      }
      if (targetStore && targetStore !== 'ALL') {
        setSelectedStore(targetStore);
      }
      setExpandedItemIds(new Set());
      setExpandedMaterialIds(new Set());
    }
  }, [isOpen, targetPlant, targetStore, initialMode]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Plant & Store Options
  const plantOptions = useMemo(() => {
    const list = getAllPlants(materials);
    return [
      { value: 'All Plants', label: isTh ? 'ทุกโรงงาน (All Plants)' : 'All Plants' },
      ...list.map(p => ({ value: p.code, label: p.label || p.code })),
    ];
  }, [materials, isTh]);

  const storeOptions = useMemo(() => {
    const stores = getStoresForPlant(selectedPlant, materials);
    return [
      { value: 'ALL', label: isTh ? 'ทุกสโตร์ (All Stores)' : 'All Stores' },
      ...stores.map(s => ({ value: s.code, label: s.label || s.code })),
    ];
  }, [selectedPlant, materials, isTh]);

  // 1. Calculate Real-Time Stock for all Materials
  const materialsWithStock = useMemo<MaterialWithStock[]>(() => {
    return materials.map(m => {
      const currentStock = getCurrentStock(
        m.id,
        transactions,
        selectedPlant === 'All Plants' ? undefined : selectedPlant,
        selectedStore === 'ALL' ? undefined : selectedStore
      );
      const stockStatus = calculateStockStatus(m, currentStock);
      return {
        ...m,
        currentStock,
        totalValue: currentStock * (m.standardPrice || 0),
        stockStatus,
      };
    });
  }, [materials, transactions, selectedPlant, selectedStore]);

  // 2. Real-Time Lot Balances
  const allLotBalances = useMemo<StockLotItem[]>(() => {
    return getLotBalances(
      selectedPlant === 'All Plants' ? undefined : selectedPlant,
      selectedStore === 'ALL' ? undefined : selectedStore
    );
  }, [getLotBalances, selectedPlant, selectedStore]);

  // 3. Group into Item hierarchy
  const allItems = useMemo<ItemWithStock[]>(() => {
    return groupMaterialsByItem(materialsWithStock, allLotBalances);
  }, [materialsWithStock, allLotBalances]);

  // 4. Filter Items & Materials based on search & filters
  const filteredItems = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    return allItems
      .map(item => {
        let matchedMaterials = item.materials.filter(m => {
          if (selectedPlant !== 'All Plants' && m.plant !== selectedPlant) return false;
          if (selectedStore !== 'ALL' && m.storageLocation !== selectedStore) return false;
          return true;
        });

        if (query) {
          matchedMaterials = matchedMaterials.filter(m => {
            const matchItemCode = (item.itemCode || '').toLowerCase().includes(query);
            const matchItemName = (item.itemName || '').toLowerCase().includes(query);
            const matchMatCode = (m.materialCode || '').toLowerCase().includes(query);
            const matchDesc = (m.description || '').toLowerCase().includes(query);
            const matchType = (m.materialType || '').toLowerCase().includes(query);
            const matchBin = (m.storageBin || '').toLowerCase().includes(query);
            const matchSloc = (m.storageLocation || '').toLowerCase().includes(query);

            let matchLot = false;
            if (viewMode === 'LOT') {
              const mLots = allLotBalances.filter(l => l.materialId === m.id);
              matchLot = mLots.some(
                l =>
                  (l.lot || '').toLowerCase().includes(query) ||
                  (l.batchNumber || '').toLowerCase().includes(query)
              );
            }

            return (
              matchItemCode ||
              matchItemName ||
              matchMatCode ||
              matchDesc ||
              matchType ||
              matchBin ||
              matchSloc ||
              matchLot
            );
          });
        }

        const totalMatStock = matchedMaterials.reduce((sum, m) => sum + m.currentStock, 0);
        const matIds = new Set(matchedMaterials.map(m => m.id));
        const itemLots = allLotBalances.filter(l => matIds.has(l.materialId));

        return {
          ...item,
          materials: matchedMaterials,
          materialCount: matchedMaterials.length,
          lotCount: itemLots.length,
          totalStock: totalMatStock,
        };
      })
      .filter(item => item.materials.length > 0);
  }, [allItems, allLotBalances, searchQuery, selectedPlant, selectedStore, viewMode]);

  // Auto-expand all items when searching
  useEffect(() => {
    if (searchQuery.trim()) {
      const allIds = new Set(filteredItems.map(it => it.itemId));
      setExpandedItemIds(allIds);
      if (viewMode === 'LOT') {
        const matIds = new Set<string>();
        filteredItems.forEach(it => it.materials.forEach(m => matIds.add(m.id)));
        setExpandedMaterialIds(matIds);
      }
    }
  }, [searchQuery, filteredItems, viewMode]);

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

  const handleSelectMaterial = (item: ItemWithStock, mat: MaterialWithStock) => {
    onSelect({
      material: mat,
      selectedMode: 'MATERIAL',
      itemCode: item.itemCode,
      itemName: item.itemName,
      availableStock: mat.currentStock,
      storageLocation: mat.storageLocation,
      storageBin: mat.storageBin,
    });
    onClose();
  };

  const handleSelectLot = (item: ItemWithStock, mat: MaterialWithStock, lot: StockLotItem) => {
    onSelect({
      material: mat,
      selectedMode: 'LOT',
      itemCode: item.itemCode,
      itemName: item.itemName,
      lot: lot.lot,
      batchNumber: lot.batchNumber,
      storageLocation: lot.store || lot.storageLocation,
      storageBin: lot.storageBin,
      availableStock: lot.quantity,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden">
        {/* HEADER */}
        <div className="p-4 sm:p-5 border-b border-app-border dark:border-app-darkBorder flex items-center justify-between gap-4 bg-white dark:bg-app-darkSurface shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-softBlue dark:bg-blue-950 text-brand-blue flex items-center justify-center font-bold shrink-0">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-app-text dark:text-app-darkText">
                  {title || (isTh ? 'เลือกรายการพัสดุ (Select Item)' : 'Select Item / Material')}
                </h2>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-app-secondary dark:text-app-darkSecondary">
                  {filteredItems.length} {filteredItems.length === 1 ? 'Item' : 'Items'}
                </span>
              </div>
              <p className="text-xs text-app-secondary dark:text-app-darkSecondary mt-0.5">
                {viewMode === 'MATERIAL'
                  ? isTh
                    ? 'เลือกตามพัสดุ (Item → Material) เพื่อระบุความต้องการใช้งาน'
                    : 'Select by Material (Item → Material) for standard request issuance'
                  : isTh
                  ? 'เลือกตามล็อต (Item → Material → Lot) เพื่อเจาะจง Lot/Expiry Date จากคลัง'
                  : 'Select by Lot (Item → Material → Lot) for specific Lot & expiry reservation'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-app-muted hover:text-app-text dark:hover:text-app-darkText hover:bg-app-bg dark:hover:bg-app-darkBg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TOOLBAR & FILTERS */}
        <div className="p-3.5 sm:p-4 border-b border-app-border dark:border-app-darkBorder bg-app-bg/50 dark:bg-app-darkBg/50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={
                viewMode === 'MATERIAL'
                  ? isTh
                    ? 'ค้นหา Item Code, Material Code, รายละเอียด...'
                    : 'Search Item Code, Material Code, Description...'
                  : isTh
                  ? 'ค้นหา Item, Material, หรือ Lot No...'
                  : 'Search Item, Material, or Lot No...'
              }
              className="w-full sm:w-72"
            />

            <div className="w-full sm:w-44">
              <FilterSelect
                label=""
                value={selectedPlant}
                options={plantOptions}
                onChange={setSelectedPlant}
              />
            </div>

            <div className="w-full sm:w-40">
              <FilterSelect
                label=""
                value={selectedStore}
                options={storeOptions}
                onChange={setSelectedStore}
              />
            </div>

            {(selectedPlant !== 'All Plants' || selectedStore !== 'ALL' || searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedPlant('All Plants');
                  setSelectedStore('ALL');
                  setSearchQuery('');
                }}
                className="p-2 rounded-lg text-app-muted hover:text-brand-blue hover:bg-white dark:hover:bg-app-darkSurface border border-app-border dark:border-app-darkBorder transition-colors text-xs flex items-center gap-1"
                title="Reset Filters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{isTh ? 'ล้างตัวกรอง' : 'Reset'}</span>
              </button>
            )}
          </div>

          {/* VIEW SWITCHER */}
          <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
            <MaterialLotViewToggle viewMode={viewMode} onChange={setViewMode} size="sm" />
          </div>
        </div>

        {/* HIERARCHY TREE CONTENT */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
          {filteredItems.length === 0 ? (
            <div className="py-16 text-center">
              <Package className="w-12 h-12 text-app-muted mx-auto mb-3 opacity-60" />
              <h3 className="text-sm font-bold text-app-text dark:text-app-darkText">
                {isTh ? 'ไม่พบข้อมูลพัสดุตามเงื่อนไขที่ค้นหา' : 'No Items or Materials Found'}
              </h3>
              <p className="text-xs text-app-secondary dark:text-app-darkSecondary mt-1">
                {isTh
                  ? 'ลองเปลี่ยนคำค้นหา หรือเลือกปรับเปลี่ยนตัวกรอง Plant / Store'
                  : 'Try adjusting your search terms or relaxing Plant / Store filters.'}
              </p>
            </div>
          ) : (
            filteredItems.map(item => {
              const isItemExpanded = expandedItemIds.has(item.itemId);

              return (
                <div
                  key={item.itemId}
                  className="rounded-2xl border border-app-border dark:border-app-darkBorder bg-white dark:bg-app-darkSurface shadow-sm overflow-hidden transition-all"
                >
                  {/* LEVEL 1: ITEM HEADER */}
                  <div
                    onClick={() => toggleItemExpansion(item.itemId)}
                    className={`p-3.5 flex items-center justify-between gap-3 cursor-pointer select-none transition-colors ${
                      isItemExpanded
                        ? 'bg-slate-50 dark:bg-slate-900/60 border-b border-app-border dark:border-app-darkBorder'
                        : 'hover:bg-app-bg/60 dark:hover:bg-app-darkBg/60'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={e => toggleItemExpansion(item.itemId, e)}
                        className={`p-1.5 rounded-lg transition-colors shrink-0 ${
                          isItemExpanded
                            ? 'bg-brand-softBlue dark:bg-blue-950 text-brand-blue'
                            : 'text-app-muted hover:text-brand-blue hover:bg-app-bg dark:hover:bg-app-darkBorder'
                        }`}
                      >
                        {isItemExpanded ? (
                          <ChevronDown className="w-4 h-4 text-brand-blue stroke-[2.5]" />
                        ) : (
                          <ChevronRight className="w-4 h-4 stroke-[2]" />
                        )}
                      </button>

                      <div className="w-9 h-9 rounded-xl bg-brand-softBlue/60 dark:bg-blue-950/60 border border-brand-blue/20 text-brand-blue flex items-center justify-center shrink-0">
                        <Boxes className="w-4 h-4" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs sm:text-sm text-app-text dark:text-app-darkText">
                            {item.itemName}
                          </span>
                          <span className="font-mono text-[10px] text-brand-blue bg-brand-softBlue dark:bg-blue-950/60 px-1.5 py-0.5 rounded font-bold border border-brand-blue/20">
                            {item.itemCode}
                          </span>
                          <span className="font-mono text-[10px] text-app-muted bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                            {item.plant}
                          </span>
                        </div>
                        <p className="text-[11px] text-app-muted truncate mt-0.5">
                          {item.materials.map(m => m.materialCode).join(', ')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 sm:gap-4 shrink-0" onClick={e => e.stopPropagation()}>
                      <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-brand-softBlue dark:bg-blue-950/60 text-brand-blue">
                        <Package className="w-3 h-3" />
                        {item.materialCount} {item.materialCount === 1 ? 'Material' : 'Materials'}
                      </span>

                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-app-muted block">
                          Total Stock
                        </span>
                        <span className="font-mono text-xs sm:text-sm font-bold text-app-text dark:text-app-darkText">
                          <span className={item.totalStock <= 0 ? 'text-gi' : 'text-emerald-600 dark:text-emerald-400'}>
                            {item.totalStock.toLocaleString()}
                          </span>{' '}
                          <span className="text-[10px] font-normal text-app-muted">{item.unit}</span>
                        </span>
                      </div>

                      <StatusBadge status={item.stockStatus} size="sm" />
                    </div>
                  </div>

                  {/* LEVEL 2 / 3: EXPANDED MATERIALS & LOTS */}
                  {isItemExpanded && (
                    <div className="p-3 sm:p-4 bg-slate-50/70 dark:bg-slate-900/40 space-y-3 animate-fadeIn">
                      {item.materials.map(mat => {
                        const materialLots = allLotBalances.filter(l => l.materialId === mat.id);
                        const isMatExpanded = expandedMaterialIds.has(mat.id);

                        return (
                          <div
                            key={mat.id}
                            className="rounded-xl border border-app-border dark:border-app-darkBorder bg-white dark:bg-app-darkSurface overflow-hidden shadow-subtle"
                          >
                            {/* MATERIAL ROW */}
                            <div className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                {viewMode === 'LOT' && materialLots.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => toggleMaterialExpansion(mat.id)}
                                    className="p-1 rounded hover:bg-app-bg dark:hover:bg-app-darkBg text-app-muted hover:text-brand-blue transition-colors"
                                    title={isMatExpanded ? 'Collapse Lots' : 'Expand Lots'}
                                  >
                                    {isMatExpanded ? (
                                      <ChevronDown className="w-3.5 h-3.5 text-brand-blue stroke-[2.5]" />
                                    ) : (
                                      <ChevronRight className="w-3.5 h-3.5 stroke-[2]" />
                                    )}
                                  </button>
                                )}

                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-mono font-bold text-xs text-brand-blue">
                                      {mat.materialCode}
                                    </span>
                                    <span className="text-xs font-semibold text-app-text dark:text-app-darkText">
                                      {mat.description}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 text-[11px] text-app-muted mt-0.5 font-mono flex-wrap">
                                    <span>Store: <strong>{mat.storageLocation || 'MAIN'}</strong></span>
                                    <span>•</span>
                                    <span>Bin: <strong>{mat.storageBin || 'BIN-01'}</strong></span>
                                    <span>•</span>
                                    <span>Price: <strong>฿{Number(mat.standardPrice || 0).toLocaleString()}</strong></span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-app-border/40">
                                <div className="text-right">
                                  <span className="text-[10px] uppercase font-bold text-app-muted block">
                                    Available
                                  </span>
                                  <span className="font-mono text-xs sm:text-sm font-bold">
                                    <span className={mat.currentStock <= 0 ? 'text-gi' : 'text-emerald-600 dark:text-emerald-400'}>
                                      {mat.currentStock.toLocaleString()}
                                    </span>{' '}
                                    <span className="text-[10px] font-normal text-app-muted">{mat.unit}</span>
                                  </span>
                                </div>

                                {viewMode === 'LOT' ? (
                                  <button
                                    type="button"
                                    onClick={() => toggleMaterialExpansion(mat.id)}
                                    className="px-2.5 py-1 text-xs font-bold rounded-lg border border-brand-blue/30 text-brand-blue bg-blue-50 dark:bg-blue-950/60 hover:bg-brand-blue hover:text-white transition-all flex items-center gap-1"
                                  >
                                    <Layers className="w-3 h-3" />
                                    <span>{materialLots.length} {materialLots.length === 1 ? 'Lot' : 'Lots'}</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleSelectMaterial(item, mat)}
                                    className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-brand-blue text-white hover:bg-blue-600 shadow-sm transition-all flex items-center gap-1.5"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>{isTh ? 'เลือกพัสดุนี้' : 'Select'}</span>
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* LEVEL 3: LOTS TABLE (FOR BY LOT MODE) */}
                            {viewMode === 'LOT' && (isMatExpanded || materialLots.length > 0) && (
                              <div className="border-t border-app-border dark:border-app-darkBorder bg-slate-50/90 dark:bg-slate-900/60 p-3">
                                {materialLots.length === 0 ? (
                                  <div className="p-3 text-center text-xs text-app-muted">
                                    {isTh ? 'ไม่มีข้อมูลล็อตที่มีสต็อกคงเหลือ' : 'No available lots with positive stock'}
                                  </div>
                                ) : (
                                  <div className="overflow-x-auto rounded-lg border border-app-border dark:border-app-darkBorder bg-white dark:bg-app-darkSurface">
                                    <table className="w-full text-left text-xs border-collapse">
                                      <thead className="bg-app-bg dark:bg-app-darkBg text-[10px] uppercase font-bold text-app-secondary dark:text-app-darkSecondary border-b border-app-border dark:border-app-darkBorder">
                                        <tr>
                                          <th className="py-2 px-3">Lot No. / Batch</th>
                                          <th className="py-2 px-3">Store / Bin</th>
                                          <th className="py-2 px-3">Received Date</th>
                                          <th className="py-2 px-3">Expiry Date</th>
                                          <th className="py-2 px-3 text-right">Available Lot Qty</th>
                                          <th className="py-2 px-3 text-right">Action</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-app-border dark:divide-app-darkBorder">
                                        {materialLots.map(lot => (
                                          <tr
                                            key={lot.id}
                                            className="hover:bg-app-bg/50 dark:hover:bg-app-darkBg/50 transition-colors"
                                          >
                                            <td className="py-2 px-3 font-mono font-bold text-purple-600 dark:text-purple-400 whitespace-nowrap">
                                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-900/60 text-xs">
                                                <Tag className="w-3 h-3" />
                                                {lot.lot}
                                              </span>
                                              {lot.batchNumber && (
                                                <span className="block text-[10px] text-app-muted mt-0.5">
                                                  Batch: {lot.batchNumber}
                                                </span>
                                              )}
                                            </td>
                                            <td className="py-2 px-3 font-mono text-xs whitespace-nowrap">
                                              <span>{lot.store || lot.storageLocation}</span>
                                              <span className="block text-[10px] text-app-muted">{lot.storageBin}</span>
                                            </td>
                                            <td className="py-2 px-3 text-xs text-app-muted whitespace-nowrap">
                                              {lot.receivedDate || '-'}
                                            </td>
                                            <td className="py-2 px-3 text-xs whitespace-nowrap">
                                              {lot.expiryDate ? (
                                                <span className="text-amber-600 dark:text-amber-400 font-medium">
                                                  {lot.expiryDate}
                                                </span>
                                              ) : (
                                                <span className="text-app-muted">-</span>
                                              )}
                                            </td>
                                            <td className="py-2 px-3 font-mono font-bold text-right whitespace-nowrap">
                                              <span className="text-emerald-600 dark:text-emerald-400">
                                                {lot.quantity.toLocaleString()}
                                              </span>{' '}
                                              <span className="text-[10px] font-normal text-app-muted">{lot.unit}</span>
                                            </td>
                                            <td className="py-2 px-3 text-right whitespace-nowrap">
                                              <button
                                                type="button"
                                                onClick={() => handleSelectLot(item, mat, lot)}
                                                className="px-3 py-1 text-xs font-bold rounded-lg bg-purple-600 hover:bg-purple-700 text-white shadow-sm transition-all flex items-center gap-1 ml-auto"
                                              >
                                                <Check className="w-3 h-3" />
                                                <span>{isTh ? 'เลือกล็อตนี้' : 'Select Lot'}</span>
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
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* FOOTER */}
        <div className="p-3.5 border-t border-app-border dark:border-app-darkBorder bg-app-bg dark:bg-app-darkBg flex items-center justify-between text-xs text-app-secondary dark:text-app-darkSecondary shrink-0">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-brand-blue" />
            <span>
              Target Scope: <strong>{selectedPlant}</strong> {selectedStore !== 'ALL' && `(${selectedStore})`}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl border border-app-border dark:border-app-darkBorder font-medium hover:bg-white dark:hover:bg-app-darkSurface transition-colors text-app-text dark:text-app-darkText"
          >
            {isTh ? 'ยกเลิก' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
};
