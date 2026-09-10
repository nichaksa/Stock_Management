import React, { useState, useMemo, useEffect } from 'react';
import { Material } from '../../types/stock';
import { useStock } from '../../context/StockContext';
import { getCurrentStock } from '../../utils/stockCalculation';
import { formatDateTime } from '../../utils/dateRange';
import {
  Search,
  X,
  Check,
  Package,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  RotateCcw,
} from 'lucide-react';

interface ItemFinderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMaterial: (material: Material) => void;
  currentSelectedId?: string;
  plantFilter?: string;
}

type SortField =
  | 'plant'
  | 'materialCode'
  | 'description'
  | 'quantity'
  | 'materialType'
  | 'unit'
  | 'standardPrice'
  | 'storageLocation'
  | 'storageBin'
  | 'updatedAt';

interface ColumnFilters {
  plant: string;
  materialCode: string;
  description: string;
  quantity: string;
  materialType: string;
  unit: string;
  standardPrice: string;
  storageLocation: string;
  storageBin: string;
}

const initialFilters: ColumnFilters = {
  plant: '',
  materialCode: '',
  description: '',
  quantity: '',
  materialType: '',
  unit: '',
  standardPrice: '',
  storageLocation: '',
  storageBin: '',
};

export const ItemFinderModal: React.FC<ItemFinderModalProps> = ({
  isOpen,
  onClose,
  onSelectMaterial,
  currentSelectedId,
}) => {
  const { materials, transactions } = useStock();

  const [columnFilters, setColumnFilters] = useState<ColumnFilters>(initialFilters);
  const [selectedId, setSelectedId] = useState<string>(currentSelectedId || '');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Sorting
  const [sortField, setSortField] = useState<SortField | null>('materialCode');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    if (isOpen) {
      setColumnFilters(initialFilters);
      setSelectedId(currentSelectedId || '');
      setCurrentPage(1);
    }
  }, [isOpen, currentSelectedId]);

  // Handle keyboard escape
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

  const handleFilterChange = (field: keyof ColumnFilters, value: string) => {
    setColumnFilters(prev => ({ ...prev, [field]: value }));
    setCurrentPage(1); // Reset to page 1 on search/filter update
  };

  const handleClearAllFilters = () => {
    setColumnFilters(initialFilters);
    setCurrentPage(1);
  };

  const hasActiveFilters = Object.values(columnFilters).some(v => v.trim() !== '');

  // Column-by-column filtering with multi-column AND logic (case-insensitive & partial match)
  const filteredMaterials = useMemo(() => {
    return materials.filter(m => {
      const currentStock = getCurrentStock(m.id, transactions);
      const stockRawStr = currentStock.toString();
      const stockLocaleStr = currentStock.toLocaleString();
      const priceRawStr = (m.standardPrice || 0).toString();
      const priceLocaleStr = (m.standardPrice || 0).toLocaleString();

      // 1. Plant
      if (columnFilters.plant.trim()) {
        const q = columnFilters.plant.toLowerCase().trim();
        if (!(m.plant || '').toLowerCase().includes(q)) return false;
      }

      // 2. Material Code
      if (columnFilters.materialCode.trim()) {
        const q = columnFilters.materialCode.toLowerCase().trim();
        if (!(m.materialCode || '').toLowerCase().includes(q)) return false;
      }

      // 3. Description
      if (columnFilters.description.trim()) {
        const q = columnFilters.description.toLowerCase().trim();
        if (!(m.description || '').toLowerCase().includes(q)) return false;
      }

      // 4. Quantity
      if (columnFilters.quantity.trim()) {
        const q = columnFilters.quantity.toLowerCase().trim();
        if (!stockRawStr.includes(q) && !stockLocaleStr.includes(q)) return false;
      }

      // 5. Type
      if (columnFilters.materialType.trim()) {
        const q = columnFilters.materialType.toLowerCase().trim();
        if (!(m.materialType || '').toLowerCase().includes(q)) return false;
      }

      // 6. Unit
      if (columnFilters.unit.trim()) {
        const q = columnFilters.unit.toLowerCase().trim();
        if (!(m.unit || '').toLowerCase().includes(q)) return false;
      }

      // 7. Standard Price
      if (columnFilters.standardPrice.trim()) {
        const q = columnFilters.standardPrice.toLowerCase().trim();
        if (!priceRawStr.includes(q) && !priceLocaleStr.toLowerCase().includes(q)) return false;
      }

      // 8. SLoc
      if (columnFilters.storageLocation.trim()) {
        const q = columnFilters.storageLocation.toLowerCase().trim();
        if (!(m.storageLocation || '').toLowerCase().includes(q)) return false;
      }

      // 9. Storage Bin
      if (columnFilters.storageBin.trim()) {
        const q = columnFilters.storageBin.toLowerCase().trim();
        if (!(m.storageBin || '').toLowerCase().includes(q)) return false;
      }

      return true;
    });
  }, [materials, transactions, columnFilters]);

  // Sort materials
  const sortedMaterials = useMemo(() => {
    if (!sortField) return filteredMaterials;

    return [...filteredMaterials].sort((a, b) => {
      let valA: any = a[sortField as keyof Material];
      let valB: any = b[sortField as keyof Material];

      if (sortField === 'quantity') {
        valA = getCurrentStock(a.id, transactions);
        valB = getCurrentStock(b.id, transactions);
      } else if (sortField === 'updatedAt') {
        valA = new Date(a.updatedAt || a.createdAt).getTime();
        valB = new Date(b.updatedAt || b.createdAt).getTime();
      } else if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = (valB || '').toLowerCase();
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredMaterials, sortField, sortDirection, transactions]);

  // Pagination slice (exactly 10 items per page)
  const totalPages = Math.max(1, Math.ceil(sortedMaterials.length / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const paginatedMaterials = sortedMaterials.slice(startIndex, startIndex + pageSize);

  const startItem = sortedMaterials.length === 0 ? 0 : startIndex + 1;
  const endItem = Math.min(startIndex + pageSize, sortedMaterials.length);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === 'asc') setSortDirection('desc');
      else {
        setSortField(null);
        setSortDirection('asc');
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const handleRowClick = (material: Material) => {
    setSelectedId(material.id);
  };

  const handleRowDoubleClick = (material: Material) => {
    setSelectedId(material.id);
    onSelectMaterial(material);
    onClose();
  };

  const handleConfirmSelect = () => {
    const selectedMat = materials.find(m => m.id === selectedId);
    if (selectedMat) {
      onSelectMaterial(selectedMat);
      onClose();
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-app-muted opacity-40 ml-1 inline shrink-0" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-brand-blue ml-1 inline shrink-0" />
    ) : (
      <ArrowDown className="w-3 h-3 text-brand-blue ml-1 inline shrink-0" />
    );
  };

  if (!isOpen) return null;

  const selectedMaterialObj = materials.find(m => m.id === selectedId);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-3 sm:p-4 text-center">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity animate-fade-in"
          onClick={onClose}
        />

        {/* Modal Dialog */}
        <div className="relative transform overflow-hidden rounded-2xl bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder text-left shadow-2xl transition-all w-full max-w-6xl my-4 flex flex-col max-h-[92vh] animate-fade-in">
          {/* 1. HEADER */}
          <div className="px-6 py-4 border-b border-app-border dark:border-app-darkBorder flex items-center justify-between bg-white dark:bg-app-darkSurface shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-softBlue dark:bg-blue-950/70 border border-brand-blue/20 flex items-center justify-center text-brand-blue shadow-xs">
                <Search className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className="text-base font-bold text-app-text dark:text-app-darkText tracking-tight">
                    Find Material
                  </h3>
                  {hasActiveFilters && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950 text-[11px] font-semibold text-brand-blue border border-brand-blue/20">
                      <Filter className="w-3 h-3" />
                      Filtered
                    </span>
                  )}
                </div>
                <p className="text-xs text-app-secondary dark:text-app-darkSecondary mt-0.5">
                  Select a material item from Master Data to populate the document line.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleClearAllFilters}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-app-border dark:border-app-darkBorder text-app-secondary dark:text-app-darkSecondary hover:text-brand-blue hover:border-brand-blue/40 hover:bg-brand-softBlue/30 transition-all flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Clear Filters</span>
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-app-muted hover:text-app-text dark:hover:text-app-darkText hover:bg-app-bg dark:hover:bg-app-darkBorder/60 transition-colors"
                title="Close (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* 2. MATERIAL DATA TABLE WITH COLUMN-BY-COLUMN SEARCH/FILTER HEADERS */}
          <div className="flex-1 overflow-x-auto overflow-y-auto min-h-[360px] max-h-[54vh]">
            <table className="w-full text-left border-collapse text-xs min-w-[1100px]">
              <thead className="sticky top-0 z-10 bg-[#F8FAFC] dark:bg-app-darkSurface text-app-secondary dark:text-app-darkSecondary border-b border-[#E5EAF1] dark:border-app-darkBorder shadow-xs select-none">
                {/* 2.1 Column Header Titles & Sort */}
                <tr className="uppercase font-semibold text-[10.5px] tracking-wider border-b border-app-border/40 dark:border-app-darkBorder/40">
                  <th
                    className="pt-3 pb-1.5 px-3 cursor-pointer hover:bg-slate-200/50 dark:hover:bg-app-darkBorder/40 transition-colors w-[115px] min-w-[115px] whitespace-nowrap"
                    onClick={() => handleSort('plant')}
                  >
                    <div className="flex items-center justify-between">
                      <span>Plant</span>
                      {getSortIcon('plant')}
                    </div>
                  </th>

                  <th
                    className="pt-3 pb-1.5 px-3 cursor-pointer hover:bg-slate-200/50 dark:hover:bg-app-darkBorder/40 transition-colors w-[145px] min-w-[145px] whitespace-nowrap"
                    onClick={() => handleSort('materialCode')}
                  >
                    <div className="flex items-center justify-between">
                      <span>Material Code</span>
                      {getSortIcon('materialCode')}
                    </div>
                  </th>

                  <th
                    className="pt-3 pb-1.5 px-3 cursor-pointer hover:bg-slate-200/50 dark:hover:bg-app-darkBorder/40 transition-colors min-w-[260px]"
                    onClick={() => handleSort('description')}
                  >
                    <div className="flex items-center justify-between">
                      <span>Description</span>
                      {getSortIcon('description')}
                    </div>
                  </th>

                  <th
                    className="pt-3 pb-1.5 px-3 cursor-pointer hover:bg-slate-200/50 dark:hover:bg-app-darkBorder/40 transition-colors text-right w-[105px] min-w-[105px] whitespace-nowrap"
                    onClick={() => handleSort('quantity')}
                  >
                    <div className="flex items-center justify-end">
                      <span>Qty</span>
                      {getSortIcon('quantity')}
                    </div>
                  </th>

                  <th
                    className="pt-3 pb-1.5 px-3 cursor-pointer hover:bg-slate-200/50 dark:hover:bg-app-darkBorder/40 transition-colors w-[120px] min-w-[120px] whitespace-nowrap"
                    onClick={() => handleSort('materialType')}
                  >
                    <div className="flex items-center justify-between">
                      <span>Type</span>
                      {getSortIcon('materialType')}
                    </div>
                  </th>

                  <th
                    className="pt-3 pb-1.5 px-3 cursor-pointer hover:bg-slate-200/50 dark:hover:bg-app-darkBorder/40 transition-colors w-[85px] min-w-[85px] whitespace-nowrap"
                    onClick={() => handleSort('unit')}
                  >
                    <div className="flex items-center justify-between">
                      <span>Unit</span>
                      {getSortIcon('unit')}
                    </div>
                  </th>

                  <th
                    className="pt-3 pb-1.5 px-3 cursor-pointer hover:bg-slate-200/50 dark:hover:bg-app-darkBorder/40 transition-colors text-right w-[115px] min-w-[115px] whitespace-nowrap"
                    onClick={() => handleSort('standardPrice')}
                  >
                    <div className="flex items-center justify-end">
                      <span>Price</span>
                      {getSortIcon('standardPrice')}
                    </div>
                  </th>

                  <th
                    className="pt-3 pb-1.5 px-3 cursor-pointer hover:bg-slate-200/50 dark:hover:bg-app-darkBorder/40 transition-colors w-[95px] min-w-[95px] whitespace-nowrap"
                    onClick={() => handleSort('storageLocation')}
                  >
                    <div className="flex items-center justify-between">
                      <span>SLoc</span>
                      {getSortIcon('storageLocation')}
                    </div>
                  </th>

                  <th
                    className="pt-3 pb-1.5 px-3 cursor-pointer hover:bg-slate-200/50 dark:hover:bg-app-darkBorder/40 transition-colors w-[115px] min-w-[115px] whitespace-nowrap"
                    onClick={() => handleSort('storageBin')}
                  >
                    <div className="flex items-center justify-between">
                      <span>Storage Bin</span>
                      {getSortIcon('storageBin')}
                    </div>
                  </th>

                  <th
                    className="pt-3 pb-1.5 px-3 cursor-pointer hover:bg-slate-200/50 dark:hover:bg-app-darkBorder/40 transition-colors w-[140px] min-w-[140px] whitespace-nowrap"
                    onClick={() => handleSort('updatedAt')}
                  >
                    <div className="flex items-center justify-between">
                      <span>Last Update</span>
                      {getSortIcon('updatedAt')}
                    </div>
                  </th>
                </tr>

                {/* 2.2 Direct Column Search/Filter Inputs Row (Except Last Update) */}
                <tr className="bg-slate-100/60 dark:bg-app-darkBg/60 border-b border-[#E5EAF1] dark:border-app-darkBorder">
                  {/* 1. Plant Filter */}
                  <th className="py-2 px-2.5">
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        placeholder="Search Plant..."
                        value={columnFilters.plant}
                        onChange={e => handleFilterChange('plant', e.target.value)}
                        onClick={e => e.stopPropagation()}
                        className="w-full h-7 px-2 pr-5 bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder rounded-lg text-xs font-normal text-app-text dark:text-app-darkText placeholder:text-app-muted/70 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/30 transition-all shadow-2xs"
                      />
                      {columnFilters.plant && (
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            handleFilterChange('plant', '');
                          }}
                          className="absolute right-1 text-app-muted hover:text-app-text p-0.5 rounded"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </th>

                  {/* 2. Material Code Filter */}
                  <th className="py-2 px-2.5">
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        placeholder="Search Code..."
                        value={columnFilters.materialCode}
                        onChange={e => handleFilterChange('materialCode', e.target.value)}
                        onClick={e => e.stopPropagation()}
                        className="w-full h-7 px-2 pr-5 bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder rounded-lg text-xs font-normal text-app-text dark:text-app-darkText placeholder:text-app-muted/70 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/30 transition-all shadow-2xs font-mono"
                      />
                      {columnFilters.materialCode && (
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            handleFilterChange('materialCode', '');
                          }}
                          className="absolute right-1 text-app-muted hover:text-app-text p-0.5 rounded"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </th>

                  {/* 3. Description Filter */}
                  <th className="py-2 px-2.5">
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        placeholder="Search Description..."
                        value={columnFilters.description}
                        onChange={e => handleFilterChange('description', e.target.value)}
                        onClick={e => e.stopPropagation()}
                        className="w-full h-7 px-2 pr-5 bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder rounded-lg text-xs font-normal text-app-text dark:text-app-darkText placeholder:text-app-muted/70 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/30 transition-all shadow-2xs"
                      />
                      {columnFilters.description && (
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            handleFilterChange('description', '');
                          }}
                          className="absolute right-1 text-app-muted hover:text-app-text p-0.5 rounded"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </th>

                  {/* 4. Quantity Filter */}
                  <th className="py-2 px-2.5">
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        placeholder="Filter Qty..."
                        value={columnFilters.quantity}
                        onChange={e => handleFilterChange('quantity', e.target.value)}
                        onClick={e => e.stopPropagation()}
                        className="w-full h-7 px-2 pr-5 text-right bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder rounded-lg text-xs font-normal text-app-text dark:text-app-darkText placeholder:text-app-muted/70 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/30 transition-all shadow-2xs font-mono"
                      />
                      {columnFilters.quantity && (
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            handleFilterChange('quantity', '');
                          }}
                          className="absolute left-1 text-app-muted hover:text-app-text p-0.5 rounded"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </th>

                  {/* 5. Type Filter */}
                  <th className="py-2 px-2.5">
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        placeholder="Search Type..."
                        value={columnFilters.materialType}
                        onChange={e => handleFilterChange('materialType', e.target.value)}
                        onClick={e => e.stopPropagation()}
                        className="w-full h-7 px-2 pr-5 bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder rounded-lg text-xs font-normal text-app-text dark:text-app-darkText placeholder:text-app-muted/70 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/30 transition-all shadow-2xs"
                      />
                      {columnFilters.materialType && (
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            handleFilterChange('materialType', '');
                          }}
                          className="absolute right-1 text-app-muted hover:text-app-text p-0.5 rounded"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </th>

                  {/* 6. Unit Filter */}
                  <th className="py-2 px-2.5">
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        placeholder="Unit..."
                        value={columnFilters.unit}
                        onChange={e => handleFilterChange('unit', e.target.value)}
                        onClick={e => e.stopPropagation()}
                        className="w-full h-7 px-2 pr-5 bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder rounded-lg text-xs font-normal text-app-text dark:text-app-darkText placeholder:text-app-muted/70 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/30 transition-all shadow-2xs font-mono"
                      />
                      {columnFilters.unit && (
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            handleFilterChange('unit', '');
                          }}
                          className="absolute right-1 text-app-muted hover:text-app-text p-0.5 rounded"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </th>

                  {/* 7. Price Filter */}
                  <th className="py-2 px-2.5">
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        placeholder="Price..."
                        value={columnFilters.standardPrice}
                        onChange={e => handleFilterChange('standardPrice', e.target.value)}
                        onClick={e => e.stopPropagation()}
                        className="w-full h-7 px-2 pr-5 text-right bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder rounded-lg text-xs font-normal text-app-text dark:text-app-darkText placeholder:text-app-muted/70 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/30 transition-all shadow-2xs font-mono"
                      />
                      {columnFilters.standardPrice && (
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            handleFilterChange('standardPrice', '');
                          }}
                          className="absolute left-1 text-app-muted hover:text-app-text p-0.5 rounded"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </th>

                  {/* 8. SLoc Filter */}
                  <th className="py-2 px-2.5">
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        placeholder="SLoc..."
                        value={columnFilters.storageLocation}
                        onChange={e => handleFilterChange('storageLocation', e.target.value)}
                        onClick={e => e.stopPropagation()}
                        className="w-full h-7 px-2 pr-5 bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder rounded-lg text-xs font-normal text-app-text dark:text-app-darkText placeholder:text-app-muted/70 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/30 transition-all shadow-2xs font-mono"
                      />
                      {columnFilters.storageLocation && (
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            handleFilterChange('storageLocation', '');
                          }}
                          className="absolute right-1 text-app-muted hover:text-app-text p-0.5 rounded"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </th>

                  {/* 9. Storage Bin Filter */}
                  <th className="py-2 px-2.5">
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        placeholder="Bin..."
                        value={columnFilters.storageBin}
                        onChange={e => handleFilterChange('storageBin', e.target.value)}
                        onClick={e => e.stopPropagation()}
                        className="w-full h-7 px-2 pr-5 bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder rounded-lg text-xs font-normal text-app-text dark:text-app-darkText placeholder:text-app-muted/70 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/30 transition-all shadow-2xs font-mono"
                      />
                      {columnFilters.storageBin && (
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            handleFilterChange('storageBin', '');
                          }}
                          className="absolute right-1 text-app-muted hover:text-app-text p-0.5 rounded"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </th>

                  {/* 10. Last Update (NO search input as specified) */}
                  <th className="py-2 px-2.5 text-center">
                    <span className="text-[10px] text-app-muted italic font-normal">—</span>
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-app-border dark:divide-app-darkBorder bg-white dark:bg-app-darkSurface">
                {paginatedMaterials.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-14 text-center text-app-muted">
                      <Package className="w-9 h-9 mx-auto mb-2 opacity-35" />
                      <p className="text-xs font-semibold text-app-text dark:text-app-darkText">
                        No materials matching the active column filters
                      </p>
                      <p className="text-[11px] text-app-secondary dark:text-app-darkSecondary mt-0.5">
                        Try adjusting or clearing your column search filters.
                      </p>
                      {hasActiveFilters && (
                        <button
                          type="button"
                          onClick={handleClearAllFilters}
                          className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-brand-softBlue dark:bg-blue-950 text-brand-blue hover:bg-brand-blue hover:text-white transition-colors"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Clear All Filters</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  paginatedMaterials.map(m => {
                    const isSelected = selectedId === m.id;
                    const currentStock = getCurrentStock(m.id, transactions);

                    return (
                      <tr
                        key={m.id}
                        onClick={() => handleRowClick(m)}
                        onDoubleClick={() => handleRowDoubleClick(m)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-blue-50/90 dark:bg-blue-950/70 ring-1 ring-inset ring-brand-blue font-medium'
                            : 'hover:bg-app-bg/70 dark:hover:bg-app-darkBorder/30'
                        }`}
                      >
                        {/* 1. Plant Soft Badge */}
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-[6px] bg-[#F4F6F8] dark:bg-slate-800 text-[#344054] dark:text-slate-200 text-xs font-medium tracking-wide select-none">
                            {m.plant}
                          </span>
                        </td>

                        {/* 2. Material Code (Primary Blue) */}
                        <td className="py-3 px-3.5 font-mono font-bold text-xs text-brand-blue whitespace-nowrap">
                          {m.materialCode}
                        </td>

                        {/* 3. Description */}
                        <td className="py-3 px-3.5 font-medium text-app-text dark:text-app-darkText max-w-sm truncate">
                          {m.description}
                        </td>

                        {/* 4. Quantity */}
                        <td className="py-3 px-3.5 text-right font-mono font-bold whitespace-nowrap">
                          <span
                            className={
                              currentStock === 0
                                ? 'text-gi'
                                : currentStock <= m.min
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-app-text dark:text-app-darkText'
                            }
                          >
                            {currentStock.toLocaleString()}
                          </span>
                        </td>

                        {/* 5. Type */}
                        <td className="py-3 px-3.5 text-app-secondary dark:text-app-darkSecondary whitespace-nowrap">
                          {m.materialType}
                        </td>

                        {/* 6. Unit */}
                        <td className="py-3 px-3.5 font-mono font-semibold text-app-text dark:text-app-darkText whitespace-nowrap">
                          {m.unit}
                        </td>

                        {/* 7. Price */}
                        <td className="py-3 px-3.5 text-right font-mono text-app-text dark:text-app-darkText whitespace-nowrap">
                          ฿{(m.standardPrice || 0).toLocaleString()}
                        </td>

                        {/* 8. SLoc */}
                        <td className="py-3 px-3.5 font-mono text-app-secondary dark:text-app-darkSecondary whitespace-nowrap">
                          {m.storageLocation || '-'}
                        </td>

                        {/* 9. Storage Bin */}
                        <td className="py-3 px-3.5 font-mono text-app-secondary dark:text-app-darkSecondary whitespace-nowrap">
                          {m.storageBin || '-'}
                        </td>

                        {/* 10. Last Update */}
                        <td className="py-3 px-3.5 font-mono text-[11px] text-app-muted whitespace-nowrap">
                          {formatDateTime(m.updatedAt || m.createdAt)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* 3. PAGINATION FOOTER */}
          <div className="px-6 py-3 border-t border-app-border dark:border-app-darkBorder bg-[#F8FAFC]/70 dark:bg-app-darkBg/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shrink-0 select-none">
            <div className="font-mono text-app-secondary dark:text-app-darkSecondary">
              Showing <strong>{startItem}</strong> - <strong>{endItem}</strong> of{' '}
              <strong>{sortedMaterials.length}</strong> items
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={safePage <= 1}
                className="px-3 py-1.5 rounded-lg border border-app-border dark:border-app-darkBorder bg-white dark:bg-app-darkSurface text-app-text dark:text-app-darkText font-semibold hover:bg-app-bg dark:hover:bg-app-darkBorder/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1 shadow-xs text-xs"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>

              <span className="px-3 py-1.5 font-mono font-semibold bg-brand-softBlue dark:bg-blue-950/80 text-brand-blue rounded-lg border border-brand-blue/20 text-xs">
                Page {safePage} / {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={safePage >= totalPages}
                className="px-3 py-1.5 rounded-lg border border-app-border dark:border-app-darkBorder bg-white dark:bg-app-darkSurface text-app-text dark:text-app-darkText font-semibold hover:bg-app-bg dark:hover:bg-app-darkBorder/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1 shadow-xs text-xs"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 4. SELECTION & ACTIONS FOOTER */}
          <div className="px-6 py-4 border-t border-app-border dark:border-app-darkBorder bg-white dark:bg-app-darkSurface flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
            <div className="text-xs truncate max-w-full sm:max-w-xl">
              {selectedMaterialObj ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-app-secondary dark:text-app-darkSecondary font-semibold">Selected:</span>
                  <span className="font-mono font-bold text-brand-blue">
                    {selectedMaterialObj.materialCode}
                  </span>
                  <span className="font-medium text-app-text dark:text-app-darkText">
                    {selectedMaterialObj.description}
                  </span>
                </div>
              ) : (
                <span className="text-app-muted italic">No material selected</span>
              )}
            </div>

            <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-app-border dark:border-app-darkBorder text-app-secondary dark:text-app-darkSecondary hover:text-app-text dark:hover:text-app-darkText hover:bg-app-bg dark:hover:bg-app-darkBorder/40 transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmSelect}
                disabled={!selectedId}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-brand-blue hover:bg-brand-darkBlue active:scale-95 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-subtle flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Select Material</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
