import { useState, useMemo, useEffect } from 'react';
import { Material, StockTransaction, StockLotItem } from '../types/stock';
import { getAllPlants, getStoresForPlant, isValidStoreForPlant } from '../utils/plantStoreMaster';

export interface CascadingFilterState {
  plant: string;
  store: string;
  item: string;
  material: string;
  lot: string;
}

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

export interface UseCascadingFiltersOptions {
  materials: Material[];
  transactions?: StockTransaction[];
  lotBalances?: StockLotItem[];
  initialPlant?: string;
  initialStore?: string;
  initialItem?: string;
  initialMaterial?: string;
  initialLot?: string;
}

export function useCascadingFilters({
  materials,
  transactions = [],
  lotBalances = [],
  initialPlant = 'ALL',
  initialStore = 'ALL',
  initialItem = 'ALL',
  initialMaterial = 'ALL',
  initialLot = 'ALL',
}: UseCascadingFiltersOptions) {
  const [selectedPlant, setSelectedPlant] = useState<string>(initialPlant);
  const [selectedStore, setSelectedStore] = useState<string>(initialStore);
  const [selectedItem, setSelectedItem] = useState<string>(initialItem);
  const [selectedMaterial, setSelectedMaterial] = useState<string>(initialMaterial);
  const [selectedLot, setSelectedLot] = useState<string>(initialLot);

  // Helper to extract item name/group from a material
  const getItemName = (m: Material): string => {
    if (m.itemName) return m.itemName;
    if (m.itemCode) return m.itemCode;
    const firstPart = m.description.split(',')[0].trim();
    return firstPart || 'General Item';
  };

  // 1. DYNAMIC PLANTS with counts (From Shared Master)
  const plantOptions: FilterOption[] = useMemo(() => {
    const allPlants = getAllPlants(materials);
    const counts = new Map<string, number>();
    materials.forEach(m => {
      const p = m.plant || 'DEMO';
      counts.set(p, (counts.get(p) || 0) + 1);
    });

    const total = materials.length;
    const opts: FilterOption[] = [
      { value: 'ALL', label: `All Plants (${total})`, count: total },
      { value: 'All Plants', label: `All Plants (${total})`, count: total },
    ];

    allPlants.forEach(p => {
      const count = counts.get(p.code) || 0;
      opts.push({
        value: p.code,
        label: `${p.code} (${count})`,
        count,
      });
    });

    return opts;
  }, [materials]);

  // 2. DYNAMIC STORES / SLOC (cascaded from Plant using Shared Master)
  const storeOptions: FilterOption[] = useMemo(() => {
    const relevantMaterials = materials.filter(m => {
      if (selectedPlant !== 'ALL' && selectedPlant !== 'All Plants') {
        return m.plant === selectedPlant || lotBalances.some(l => l.materialId === m.id && l.plant === selectedPlant);
      }
      return true;
    });

    const counts = new Map<string, number>();
    relevantMaterials.forEach(m => {
      const s = m.storageLocation || 'MAIN';
      counts.set(s, (counts.get(s) || 0) + 1);
    });
    lotBalances.forEach(l => {
      const s = l.storageLocation || l.store;
      if (s && (selectedPlant === 'ALL' || selectedPlant === 'All Plants' || l.plant === selectedPlant)) {
        counts.set(s, (counts.get(s) || 0) + 1);
      }
    });

    const total = relevantMaterials.length;
    const opts: FilterOption[] = [
      { value: 'ALL', label: `All Stores (${total})`, count: total },
    ];

    const availableStores = getStoresForPlant(selectedPlant, materials);
    availableStores.forEach(storeObj => {
      const count = counts.get(storeObj.code) || 0;
      opts.push({
        value: storeObj.code,
        label: `${storeObj.code} (${count})`,
        count,
      });
    });

    return opts;
  }, [materials, selectedPlant, lotBalances]);

  // 3. DYNAMIC ITEMS (cascaded from Plant + Store)
  const itemOptions: FilterOption[] = useMemo(() => {
    const relevantMaterials = materials.filter(m => {
      if (selectedPlant !== 'ALL' && selectedPlant !== 'All Plants') {
        const matchesPlant = m.plant === selectedPlant || lotBalances.some(l => l.materialId === m.id && l.plant === selectedPlant);
        if (!matchesPlant) return false;
      }
      if (selectedStore !== 'ALL') {
        const matchesStore = m.storageLocation === selectedStore || lotBalances.some(l => l.materialId === m.id && (l.storageLocation === selectedStore || l.store === selectedStore));
        if (!matchesStore) return false;
      }
      return true;
    });

    const counts = new Map<string, number>();
    relevantMaterials.forEach(m => {
      const item = getItemName(m);
      counts.set(item, (counts.get(item) || 0) + 1);
    });

    const total = relevantMaterials.length;
    const opts: FilterOption[] = [
      { value: 'ALL', label: `All Items (${total})`, count: total },
    ];

    Array.from(counts.keys())
      .sort()
      .forEach(itemKey => {
        const count = counts.get(itemKey) || 0;
        opts.push({
          value: itemKey,
          label: `${itemKey} (${count})`,
          count,
        });
      });

    return opts;
  }, [materials, selectedPlant, selectedStore, lotBalances]);

  // 4. DYNAMIC MATERIALS (cascaded from Plant + Store + Item)
  const materialOptions: FilterOption[] = useMemo(() => {
    const relevantMaterials = materials.filter(m => {
      if (selectedPlant !== 'ALL' && selectedPlant !== 'All Plants') {
        const matchesPlant = m.plant === selectedPlant || lotBalances.some(l => l.materialId === m.id && l.plant === selectedPlant);
        if (!matchesPlant) return false;
      }
      if (selectedStore !== 'ALL') {
        const matchesStore = m.storageLocation === selectedStore || lotBalances.some(l => l.materialId === m.id && (l.storageLocation === selectedStore || l.store === selectedStore));
        if (!matchesStore) return false;
      }
      if (selectedItem !== 'ALL' && getItemName(m) !== selectedItem) {
        return false;
      }
      return true;
    });

    const opts: FilterOption[] = [
      { value: 'ALL', label: `All Materials (${relevantMaterials.length})`, count: relevantMaterials.length },
    ];

    relevantMaterials.forEach(m => {
      opts.push({
        value: m.materialCode,
        label: `${m.materialCode} — ${m.description.slice(0, 30)}`,
        count: 1,
      });
    });

    return opts;
  }, [materials, selectedPlant, selectedStore, selectedItem, lotBalances]);

  // 5. DYNAMIC LOTS (cascaded from Plant + Store + Material)
  const lotOptions: FilterOption[] = useMemo(() => {
    const relevantLots = lotBalances.filter(l => {
      if (selectedPlant !== 'ALL' && selectedPlant !== 'All Plants' && l.plant !== selectedPlant) {
        return false;
      }
      if (selectedStore !== 'ALL' && l.store !== selectedStore && l.storageLocation !== selectedStore) {
        return false;
      }
      if (selectedMaterial !== 'ALL' && l.materialCode !== selectedMaterial && l.materialId !== selectedMaterial) {
        return false;
      }
      return true;
    });

    const counts = new Map<string, number>();
    relevantLots.forEach(l => {
      const lot = l.lot || l.lotNo || 'LOT-STANDARD';
      counts.set(lot, (counts.get(lot) || 0) + l.quantity);
    });

    const total = relevantLots.length;
    const opts: FilterOption[] = [
      { value: 'ALL', label: `All Lots (${total})`, count: total },
    ];

    Array.from(counts.keys())
      .sort()
      .forEach(lotKey => {
        const qty = counts.get(lotKey) || 0;
        opts.push({
          value: lotKey,
          label: `${lotKey} (${qty} PCS)`,
          count: qty,
        });
      });

    return opts;
  }, [lotBalances, selectedPlant, selectedStore, selectedMaterial]);

  // AUTO-RESET / VALIDATE CHILD FILTERS ON PARENT CHANGE
  // When Plant changes -> validate Store
  useEffect(() => {
    if (selectedStore !== 'ALL') {
      const isValid = storeOptions.some(opt => opt.value === selectedStore);
      if (!isValid) setSelectedStore('ALL');
    }
  }, [selectedPlant, storeOptions, selectedStore]);

  // When Store changes -> validate Item
  useEffect(() => {
    if (selectedItem !== 'ALL') {
      const isValid = itemOptions.some(opt => opt.value === selectedItem);
      if (!isValid) setSelectedItem('ALL');
    }
  }, [selectedStore, itemOptions, selectedItem]);

  // When Item changes -> validate Material
  useEffect(() => {
    if (selectedMaterial !== 'ALL') {
      const isValid = materialOptions.some(opt => opt.value === selectedMaterial);
      if (!isValid) setSelectedMaterial('ALL');
    }
  }, [selectedItem, materialOptions, selectedMaterial]);

  // When Material changes -> validate Lot
  useEffect(() => {
    if (selectedLot !== 'ALL') {
      const isValid = lotOptions.some(opt => opt.value === selectedLot);
      if (!isValid) setSelectedLot('ALL');
    }
  }, [selectedMaterial, lotOptions, selectedLot]);

  // Reset all filters
  const resetAllFilters = () => {
    setSelectedPlant('ALL');
    setSelectedStore('ALL');
    setSelectedItem('ALL');
    setSelectedMaterial('ALL');
    setSelectedLot('ALL');
  };

  const hasActiveCascadingFilters =
    (selectedPlant !== 'ALL' && selectedPlant !== 'All Plants') ||
    selectedStore !== 'ALL' ||
    selectedItem !== 'ALL' ||
    selectedMaterial !== 'ALL' ||
    selectedLot !== 'ALL';

  return {
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
  };
}
