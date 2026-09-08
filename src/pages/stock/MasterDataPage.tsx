import React, { useState, useMemo } from 'react';
import { Material } from '../../types/stock';
import { PageLayout } from '../../components/layout/PageLayout';
import { SearchInput } from '../../components/common/SearchInput';
import { FilterSelect } from '../../components/common/FilterSelect';
import { VisibleColumnsDropdown, ColumnDefinition } from '../../components/common/VisibleColumnsDropdown';
import { DataTable, Column, SortDirection } from '../../components/common/DataTable';
import { MaterialFormDrawer } from '../../components/stock/MaterialFormDrawer';
import { MaterialDetailDrawer } from '../../components/stock/MaterialDetailDrawer';
import { useStock } from '../../context/StockContext';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { exportMasterDataToCsv } from '../../utils/export';
import { formatDateTime } from '../../utils/dateRange';
import {
  Plus,
  Download,
  History,
  Edit2,
  Package,
  Building2,
  SlidersHorizontal,
} from 'lucide-react';

const MASTER_COLUMNS_DEF: ColumnDefinition[] = [
  { id: 'plant', label: 'Plant', required: true },
  { id: 'materialDetails', label: 'Material Details', required: true },
  { id: 'materialType', label: 'Type' },
  { id: 'unit', label: 'Unit' },
  { id: 'standardPrice', label: 'Price' },
  { id: 'min', label: 'Min' },
  { id: 'max', label: 'Max' },
  { id: 'rop', label: 'ROP' },
  { id: 'leadTime', label: 'Lead Time' },
  { id: 'storageLocation', label: 'SLoc' },
  { id: 'storageBin', label: 'Storage Bin' },
  { id: 'updatedAt', label: 'Last Update' },
];

export const MasterDataPage: React.FC = () => {
  const { materials, transactions } = useStock();
  const { hasPermission } = useAuth();
  const { t } = useLanguage();
  const { addToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlant, setSelectedPlant] = useState('All Plants');
  const [visibleColIds, setVisibleColIds] = useState<string[]>(() => {
    return [
      'plant',
      'materialDetails',
      'materialType',
      'unit',
      'standardPrice',
      'min',
      'max',
      'rop',
      'leadTime',
      'storageLocation',
      'storageBin',
      'updatedAt',
    ];
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Sorting state
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  // Drawers state
  const [isFormDrawerOpen, setIsFormDrawerOpen] = useState(false);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [detailTab, setDetailTab] = useState<'info' | 'movement'>('info');

  const canCreate = hasPermission('MASTER_CREATE');
  const canEdit = hasPermission('MASTER_EDIT');

  // Reset to page 1 when search or plant changes
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setCurrentPage(1);
  };

  const handlePlantChange = (val: string) => {
    setSelectedPlant(val);
    setCurrentPage(1);
  };

  // Filter materials in real-time
  const filteredMaterials = useMemo(() => {
    return materials.filter(m => {
      // Plant filter
      if (selectedPlant !== 'All Plants' && m.plant !== selectedPlant) {
        return false;
      }

      // Search query across Code, Description, Type, SLoc, Bin
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
  }, [materials, selectedPlant, searchQuery]);

  // Handle column sorting (cycle: asc -> desc -> reset)
  const handleSortChange = (colId: string) => {
    if (colId === 'plant') return; // Plant is not sortable as specified

    if (sortColumn !== colId) {
      setSortColumn(colId);
      setSortDirection('asc');
    } else if (sortDirection === 'asc') {
      setSortDirection('desc');
    } else {
      setSortColumn(null);
      setSortDirection(null);
    }
    setCurrentPage(1);
  };

  // Sort materials
  const sortedMaterials = useMemo(() => {
    if (!sortColumn || !sortDirection) return filteredMaterials;

    return [...filteredMaterials].sort((a, b) => {
      let valA: any = (a as any)[sortColumn];
      let valB: any = (b as any)[sortColumn];

      if (sortColumn === 'materialDetails') {
        valA = a.description.toLowerCase();
        valB = b.description.toLowerCase();
      } else if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = (valB || '').toLowerCase();
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredMaterials, sortColumn, sortDirection]);

  // Paginated slice
  const paginatedMaterials = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedMaterials.slice(startIndex, startIndex + pageSize);
  }, [sortedMaterials, currentPage, pageSize]);

  // Actions
  const handleOpenAddModal = () => {
    setSelectedMaterial(null);
    setIsFormDrawerOpen(true);
  };

  const handleOpenEditModal = (material: Material, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedMaterial(material);
    setIsFormDrawerOpen(true);
  };

  const handleOpenMovementHistory = (material: Material, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedMaterial(material);
    setDetailTab('movement');
    setIsDetailDrawerOpen(true);
  };

  const handleRowClick = (material: Material) => {
    setSelectedMaterial(material);
    setDetailTab('info');
    setIsDetailDrawerOpen(true);
  };

  const handleExport = () => {
    exportMasterDataToCsv(sortedMaterials, transactions);
    addToast('Master Data exported successfully', 'success');
  };

  // Build table columns with pinned Plant first and Material Details second
  const tableColumns: Column<Material>[] = useMemo(() => {
    const cols: Column<Material>[] = [];

    // 1. Plant (Required, First, Non-sortable) - 120px, left aligned, clean enterprise soft badge
    if (visibleColIds.includes('plant')) {
      cols.push({
        id: 'plant',
        header: t('plant'),
        sortable: false,
        align: 'left',
        className: 'w-[120px] min-w-[120px] max-w-[120px] px-4 whitespace-nowrap',
        accessor: (m) => (
          <span className="inline-flex items-center px-2 py-1 rounded-[6px] bg-[#F4F6F8] dark:bg-slate-800 text-[#344054] dark:text-slate-200 text-xs font-medium whitespace-nowrap tracking-wide select-none">
            {m.plant}
          </span>
        ),
      });
    }

    // 2. Material Details (Required, Second: Image + Description + Material Code)
    if (visibleColIds.includes('materialDetails')) {
      cols.push({
        id: 'materialDetails',
        header: t('material_details'),
        sortable: true,
        className: 'min-w-[280px]',
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
              <p className="text-xs font-semibold text-app-text dark:text-app-darkText truncate max-w-sm">
                {m.description}
              </p>
            </div>
          </div>
        ),
      });
    }

    // 3. Type
    if (visibleColIds.includes('materialType')) {
      cols.push({
        id: 'materialType',
        header: t('type'),
        sortable: true,
        accessor: (m) => (
          <span className="text-xs text-app-secondary dark:text-app-darkSecondary">
            {m.materialType}
          </span>
        ),
      });
    }

    // 4. Unit
    if (visibleColIds.includes('unit')) {
      cols.push({
        id: 'unit',
        header: t('unit'),
        sortable: true,
        accessor: (m) => (
          <span className="font-mono text-xs font-semibold text-app-text dark:text-app-darkText">
            {m.unit}
          </span>
        ),
      });
    }

    // 5. Price
    if (visibleColIds.includes('standardPrice')) {
      cols.push({
        id: 'standardPrice',
        header: t('price'),
        sortable: true,
        align: 'right',
        accessor: (m) => (
          <span className="font-mono text-xs font-bold text-app-text dark:text-app-darkText">
            ฿{Number(m.standardPrice || 0).toLocaleString()}
          </span>
        ),
      });
    }

    // 6. Min
    if (visibleColIds.includes('min')) {
      cols.push({
        id: 'min',
        header: t('min'),
        sortable: true,
        align: 'center',
        accessor: (m) => (
          <span className="font-mono text-xs font-semibold text-amber-600">
            {m.min}
          </span>
        ),
      });
    }

    // 7. Max
    if (visibleColIds.includes('max')) {
      cols.push({
        id: 'max',
        header: t('max'),
        sortable: true,
        align: 'center',
        accessor: (m) => (
          <span className="font-mono text-xs font-semibold text-purple-600">
            {m.max}
          </span>
        ),
      });
    }

    // 8. ROP
    if (visibleColIds.includes('rop')) {
      cols.push({
        id: 'rop',
        header: t('rop'),
        sortable: true,
        align: 'center',
        accessor: (m) => (
          <span className="font-mono text-xs font-semibold text-warn">
            {m.rop}
          </span>
        ),
      });
    }

    // 9. Lead Time
    if (visibleColIds.includes('leadTime')) {
      cols.push({
        id: 'leadTime',
        header: t('lead_time'),
        sortable: true,
        align: 'center',
        accessor: (m) => (
          <span className="font-mono text-xs text-app-secondary dark:text-app-darkSecondary">
            {m.leadTime || 0}d
          </span>
        ),
      });
    }

    // 10. SLoc
    if (visibleColIds.includes('storageLocation')) {
      cols.push({
        id: 'storageLocation',
        header: t('sloc'),
        sortable: true,
        accessor: (m) => (
          <span className="font-mono text-xs text-app-text dark:text-app-darkText">
            {m.storageLocation || '-'}
          </span>
        ),
      });
    }

    // 11. Storage Bin
    if (visibleColIds.includes('storageBin')) {
      cols.push({
        id: 'storageBin',
        header: t('storage_bin'),
        sortable: true,
        accessor: (m) => (
          <span className="font-mono text-xs text-app-text dark:text-app-darkText">
            {m.storageBin || '-'}
          </span>
        ),
      });
    }

    // 12. Last Update
    if (visibleColIds.includes('updatedAt')) {
      cols.push({
        id: 'updatedAt',
        header: t('last_update'),
        sortable: true,
        className: 'min-w-[130px]',
        accessor: (m) => (
          <span className="font-mono text-[11px] text-app-muted">
            {formatDateTime(m.updatedAt || m.createdAt)}
          </span>
        ),
      });
    }

    // 13. Actions (Icons directly visible with tooltips)
    cols.push({
      id: 'actions',
      header: t('actions'),
      align: 'right',
      className: 'w-24',
      accessor: (m) => (
        <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
          <button
            type="button"
            onClick={(e) => handleOpenMovementHistory(m, e)}
            className="p-1.5 rounded-lg text-app-secondary dark:text-app-darkSecondary hover:text-brand-blue hover:bg-brand-softBlue dark:hover:bg-blue-950/50 transition-colors"
            title="Movement History"
          >
            <History className="w-4 h-4" />
          </button>
          {canEdit && (
            <button
              type="button"
              onClick={(e) => handleOpenEditModal(m, e)}
              className="p-1.5 rounded-lg text-app-secondary dark:text-app-darkSecondary hover:text-brand-blue hover:bg-brand-softBlue dark:hover:bg-blue-950/50 transition-colors"
              title="Edit Item"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    });

    return cols;
  }, [visibleColIds, t, canEdit]);

  return (
    <PageLayout
      title={t('master_data_title')}
      subtitle={t('master_data_subtitle')}
      actions={
        <>
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border border-app-border dark:border-app-darkBorder bg-white dark:bg-app-darkSurface text-app-secondary dark:text-app-darkSecondary hover:text-app-text dark:hover:text-app-darkText shadow-subtle hover:bg-app-bg transition-colors"
          >
            <Download className="w-4 h-4 text-app-muted" />
            <span>{t('export_csv')}</span>
          </button>

          {canCreate && (
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-brand-blue hover:bg-brand-hoverBlue text-white shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>{t('add_material')}</span>
            </button>
          )}
        </>
      }
    >
      <div className="space-y-4">
        {/* Toolbar: Real-time Search, Plant Filter, Columns Toggle (NO Stock Status filter!) */}
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

          <div className="flex items-center gap-2 self-end sm:self-center">
            <VisibleColumnsDropdown
              columns={MASTER_COLUMNS_DEF}
              visibleColumns={visibleColIds}
              onChange={setVisibleColIds}
            />
          </div>
        </div>

        {/* Master Data Table */}
        <DataTable
          data={paginatedMaterials}
          columns={tableColumns}
          keyExtractor={(m) => m.id}
          onRowClick={handleRowClick}
          selectedRowId={selectedMaterial?.id}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onSortChange={handleSortChange}
          emptyTitle="No Materials Found"
          emptyDescription="No spare parts match your active filters or search terms."
          emptyType="materials"
          pagination={{
            currentPage,
            pageSize,
            totalItems: sortedMaterials.length,
            onPageChange: setCurrentPage,
            onPageSizeChange: setPageSize,
          }}
        />
      </div>

      {/* Add / Edit Material Drawer */}
      <MaterialFormDrawer
        isOpen={isFormDrawerOpen}
        onClose={() => setIsFormDrawerOpen(false)}
        initialMaterial={selectedMaterial}
      />

      {/* Material Detail Drawer */}
      <MaterialDetailDrawer
        isOpen={isDetailDrawerOpen}
        onClose={() => setIsDetailDrawerOpen(false)}
        material={selectedMaterial}
        initialTab={detailTab}
      />
    </PageLayout>
  );
};
