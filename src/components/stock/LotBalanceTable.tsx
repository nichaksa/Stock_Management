import React, { useState, useMemo } from 'react';
import { StockLotItem } from '../../types/stock';
import { DataTable, Column, SortDirection } from '../common/DataTable';
import { SearchInput } from '../common/SearchInput';
import { FilterSelect } from '../common/FilterSelect';
import { useLanguage } from '../../context/LanguageContext';
import { Layers, Tag, MapPin, Hash, Barcode } from 'lucide-react';

interface LotBalanceTableProps {
  lots: StockLotItem[];
  onSelectLot?: (lot: StockLotItem) => void;
  selectedLotId?: string | null;
  compact?: boolean;
}

export const LotBalanceTable: React.FC<LotBalanceTableProps> = ({
  lots,
  onSelectLot,
  selectedLotId,
  compact = false,
}) => {
  const { t, language } = useLanguage();
  const isTh = language === 'th';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlant, setSelectedPlant] = useState('All Plants');
  const [selectedStore, setSelectedStore] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(compact ? 5 : 10);
  const [sortColumn, setSortColumn] = useState<string | null>('materialCode');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Extract unique plants and stores for filter dropdowns
  const plantOptions = useMemo(() => {
    const set = new Set<string>();
    lots.forEach(l => {
      if (l.plant) set.add(l.plant);
    });
    return [
      { value: 'All Plants', label: isTh ? 'ทุกโรงงาน (All Plants)' : 'All Plants' },
      ...Array.from(set).map(p => ({ value: p, label: p })),
    ];
  }, [lots, isTh]);

  const storeOptions = useMemo(() => {
    const set = new Set<string>();
    lots.forEach(l => {
      if (l.store) set.add(l.store);
    });
    return [
      { value: 'ALL', label: isTh ? 'ทุกสโตร์ (All Stores)' : 'All Stores' },
      ...Array.from(set).map(s => ({ value: s, label: s })),
    ];
  }, [lots, isTh]);

  // Filter lots
  const filteredLots = useMemo(() => {
    return lots.filter(lot => {
      if (selectedPlant !== 'All Plants' && lot.plant !== selectedPlant) return false;
      if (selectedStore !== 'ALL' && lot.store !== selectedStore && lot.storageLocation !== selectedStore) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchCode = lot.materialCode.toLowerCase().includes(q);
        const matchDesc = lot.description.toLowerCase().includes(q);
        const matchLot = lot.lot.toLowerCase().includes(q);
        const matchBatch = (lot.batchNumber || '').toLowerCase().includes(q);
        const matchBin = (lot.storageBin || '').toLowerCase().includes(q);
        const matchSloc = (lot.storageLocation || '').toLowerCase().includes(q);
        return matchCode || matchDesc || matchLot || matchBatch || matchBin || matchSloc;
      }
      return true;
    });
  }, [lots, selectedPlant, selectedStore, searchQuery]);

  // Sort lots
  const sortedLots = useMemo(() => {
    if (!sortColumn || !sortDirection) return filteredLots;

    return [...filteredLots].sort((a, b) => {
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
  }, [filteredLots, sortColumn, sortDirection]);

  // Paginate lots
  const paginatedLots = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedLots.slice(start, start + pageSize);
  }, [sortedLots, currentPage, pageSize]);

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

  const columns: Column<StockLotItem>[] = [
    {
      id: 'plant',
      header: isTh ? 'โรงงาน / สโตร์' : 'Plant / Store',
      sortable: true,
      className: 'w-[140px]',
      accessor: item => (
        <div>
          <span className="inline-flex items-center px-2 py-0.5 rounded-[6px] bg-[#F4F6F8] dark:bg-slate-800 text-[#344054] dark:text-slate-200 text-xs font-mono font-medium">
            {item.plant}
          </span>
          <span className="block text-[11px] text-app-muted font-medium mt-0.5">
            {item.store || item.storageLocation}
          </span>
        </div>
      ),
    },
    {
      id: 'materialCode',
      header: isTh ? 'รหัสพัสดุ' : 'Material Code',
      sortable: true,
      className: 'w-[130px] font-mono',
      accessor: item => (
        <span className="font-bold text-xs text-brand-blue">{item.materialCode}</span>
      ),
    },
    {
      id: 'description',
      header: isTh ? 'รายละเอียดพัสดุ' : 'Description',
      sortable: true,
      className: 'min-w-[200px]',
      accessor: item => (
        <div className="py-0.5">
          <p className="text-xs font-semibold text-app-text dark:text-app-darkText truncate">
            {item.description}
          </p>
          <span className="inline-block text-[10px] text-app-muted bg-slate-100 dark:bg-slate-800/60 px-1.5 py-0.5 rounded mt-0.5">
            {item.materialType}
          </span>
        </div>
      ),
    },
    {
      id: 'lot',
      header: isTh ? 'ล็อต (Lot)' : 'Lot No.',
      sortable: true,
      className: 'w-[120px] font-mono',
      accessor: item => (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-brand-blue text-xs font-bold border border-blue-200 dark:border-blue-900/60">
          <Tag className="w-3 h-3" />
          {item.lot}
        </span>
      ),
    },
    {
      id: 'batchNumber',
      header: isTh ? 'Batch No.' : 'Batch No.',
      sortable: true,
      className: 'w-[120px] font-mono text-xs',
      accessor: item => (
        <div>
          {item.batchNumber ? (
            <span className="text-app-text dark:text-app-darkText font-medium block">
              {item.batchNumber}
            </span>
          ) : (
            <span className="text-app-muted">-</span>
          )}
        </div>
      ),
    },
    {
      id: 'quantity',
      header: isTh ? 'คงเหลือในล็อต' : 'Lot Qty',
      sortable: true,
      align: 'right',
      className: 'w-[110px] font-mono',
      accessor: item => (
        <div className="text-right">
          <span className="font-bold text-xs text-app-text dark:text-app-darkText">
            {item.quantity.toLocaleString()}
          </span>{' '}
          <span className="text-[11px] text-app-muted font-normal">{item.unit}</span>
        </div>
      ),
    },
    {
      id: 'storageBin',
      header: isTh ? 'ตำแหน่งจัดเก็บ (Bin)' : 'Storage Bin / SLoc',
      sortable: true,
      className: 'w-[130px]',
      accessor: item => (
        <div className="flex items-center gap-1.5 text-xs text-app-secondary dark:text-app-darkSecondary">
          <MapPin className="w-3.5 h-3.5 text-app-muted shrink-0" />
          <span className="font-mono">{item.storageBin || 'Default'}</span>
        </div>
      ),
    },
    {
      id: 'receivedDate',
      header: isTh ? 'วันที่รับเข้า' : 'Received Date',
      sortable: true,
      className: 'w-[120px] font-mono text-xs',
      accessor: item => (
        <span className="text-app-text dark:text-app-darkText">
          {item.receivedDate ? item.receivedDate.slice(0, 10) : item.lastUpdated ? item.lastUpdated.slice(0, 10) : '-'}
        </span>
      ),
    },
    {
      id: 'expiryDate',
      header: isTh ? 'วันหมดอายุ' : 'Expiry Date',
      sortable: true,
      className: 'w-[120px] font-mono text-xs',
      accessor: item => (
        item.expiryDate ? (
          <span className="text-amber-600 dark:text-amber-400 font-medium">
            {item.expiryDate.slice(0, 10)}
          </span>
        ) : (
          <span className="text-app-muted">-</span>
        )
      ),
    },
  ];

  return (
    <div className="space-y-3">
      {/* FILTER TOOLBAR */}
      <div className="p-3 rounded-2xl bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder shadow-subtle flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto flex-1">
          <SearchInput
            value={searchQuery}
            onChange={q => {
              setSearchQuery(q);
              setCurrentPage(1);
            }}
            placeholder={
              isTh
                ? 'ค้นหารหัส, ล็อต, Batch, Bin...'
                : 'Search Code, Lot, Batch, Bin...'
            }
            className="w-full sm:w-72"
          />

          <div className="w-full sm:w-44 shrink-0">
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

          <div className="w-full sm:w-40 shrink-0">
            <FilterSelect
              label=""
              value={selectedStore}
              options={storeOptions}
              onChange={s => {
                setSelectedStore(s);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>

        <div className="text-xs text-app-muted font-medium shrink-0">
          {isTh ? 'แสดง' : 'Showing'} <strong>{filteredLots.length}</strong>{' '}
          {isTh ? 'รายการล็อต' : 'lot entries'}
        </div>
      </div>

      {/* LOT TABLE */}
      <DataTable
        columns={columns}
        data={paginatedLots}
        keyExtractor={l => l.id}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        onSortChange={handleSortChange}
        onRowClick={onSelectLot}
        selectedRowId={selectedLotId}
        emptyTitle={isTh ? 'ไม่พบข้อมูลล็อตในระบบ' : 'No Lot Balances Found'}
        emptyDescription={
          isTh
            ? 'ไม่มีรายการล็อตที่ตรงตามเงื่อนไขการค้นหาหรือตัวกรองที่เลือก'
            : 'No lot entries match the specified plant, store, or search keyword.'
        }
        pagination={{
          currentPage,
          pageSize,
          totalItems: filteredLots.length,
          onPageChange: setCurrentPage,
          onPageSizeChange: setPageSize,
          pageSizeOptions: compact ? [5, 10, 20] : [10, 20, 50, 100],
        }}
      />
    </div>
  );
};
