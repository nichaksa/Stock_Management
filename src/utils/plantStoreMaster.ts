import { Material } from '../types/stock';

export interface PlantMasterItem {
  id: string;        // e.g. "PLANT-01", "DEMO", "GM"
  code: string;      // e.g. "PLANT-01"
  name: string;      // e.g. "Main Factory"
  label: string;     // e.g. "PLANT-01 (Main Factory)"
}

export interface StoreMasterItem {
  code: string;      // e.g. "STORE-A", "MAIN", "SPARE", "WH01"
  name: string;      // e.g. "Main SLoc"
  plant: string;     // e.g. "PLANT-01"
  label: string;     // e.g. "STORE-A (Main Catalog)"
}

// ---------------------------------------------------------------------------
// Canonical Plant Master (Single Source of Truth)
// ---------------------------------------------------------------------------
export const BASE_PLANT_MASTER: PlantMasterItem[] = [
  { id: 'DEMO', code: 'DEMO', name: 'Demo Plant', label: 'DEMO (Demo Plant)' },
  { id: 'PLANT-01', code: 'PLANT-01', name: 'Factory Plant 01', label: 'PLANT-01 (Main Factory)' },
  { id: 'PLANT-02', code: 'PLANT-02', name: 'Assembly Plant 02', label: 'PLANT-02 (Assembly Plant)' },
];

// ---------------------------------------------------------------------------
// Canonical Store / SLoc Master per Plant (Single Source of Truth)
// ---------------------------------------------------------------------------
export const BASE_STORE_MASTER: StoreMasterItem[] = [
  // DEMO Stores
  { code: 'MAIN', name: 'Central Store', plant: 'DEMO', label: 'MAIN (Central Store)' },
  { code: 'SPARE', name: 'Spare Parts Store', plant: 'DEMO', label: 'SPARE (Spare Parts)' },
  { code: 'STORE-01', name: 'Primary Store 01', plant: 'DEMO', label: 'STORE-01 (Primary Store)' },
  { code: 'STORE-02', name: 'Secondary Store 02', plant: 'DEMO', label: 'STORE-02 (Secondary Store)' },
  { code: 'STORE-A', name: 'Store A', plant: 'DEMO', label: 'STORE-A (Main SLoc)' },
  { code: 'STORE-B', name: 'Store B', plant: 'DEMO', label: 'STORE-B (Secondary SLoc)' },

  // PLANT-01 Stores
  { code: 'SPARE', name: 'Spare Parts Store', plant: 'PLANT-01', label: 'SPARE (Spare Parts)' },
  { code: 'WH01', name: 'Central Warehouse 01', plant: 'PLANT-01', label: 'WH01 (Central Warehouse)' },
  { code: 'STORE-A', name: 'Store A (Main Catalog)', plant: 'PLANT-01', label: 'STORE-A (Main Catalog)' },
  { code: 'STORE-B', name: 'Store B (Sub Store)', plant: 'PLANT-01', label: 'STORE-B (Sub Store)' },
  { code: 'STORE-C', name: 'Store C (Chemical / Hazardous)', plant: 'PLANT-01', label: 'STORE-C (Hazardous)' },
  { code: 'STORE-01', name: 'Store 01', plant: 'PLANT-01', label: 'STORE-01 (Factory Store 1)' },
  { code: 'STORE-02', name: 'Store 02', plant: 'PLANT-01', label: 'STORE-02 (Factory Store 2)' },
  { code: 'S001', name: 'Storage 001', plant: 'PLANT-01', label: 'S001 (Storage Bin 01)' },

  // PLANT-02 Stores
  { code: 'MAINT', name: 'Maintenance Store', plant: 'PLANT-02', label: 'MAINT (Maintenance Store)' },
  { code: 'WH02', name: 'Warehouse 02', plant: 'PLANT-02', label: 'WH02 (Warehouse 2)' },
  { code: 'STORE-A', name: 'Store A (Plant 2 Main)', plant: 'PLANT-02', label: 'STORE-A (Plant 2 Main)' },
  { code: 'STORE-B', name: 'Store B (Assembly Sub Store)', plant: 'PLANT-02', label: 'STORE-B (Assembly Sub)' },
  { code: 'STORE-01', name: 'Store 01', plant: 'PLANT-02', label: 'STORE-01 (Store 1)' },
  { code: 'STORE-02', name: 'Store 02', plant: 'PLANT-02', label: 'STORE-02 (Store 2)' },
];

/**
 * Returns all canonical plants + dynamically discovered plants from current materials.
 */
export function getAllPlants(materials: Material[] = []): PlantMasterItem[] {
  const map = new Map<string, PlantMasterItem>();
  BASE_PLANT_MASTER.forEach(p => map.set(p.code, p));

  materials.forEach(m => {
    if (m.plant && !map.has(m.plant)) {
      map.set(m.plant, {
        id: m.plant,
        code: m.plant,
        name: m.plant,
        label: m.plant,
      });
    }
  });

  return Array.from(map.values()).sort((a, b) => a.code.localeCompare(b.code));
}

/**
 * Returns all valid Stores / SLocs for a specific plant.
 * Combines BASE_STORE_MASTER with any dynamically discovered stores from materials in that plant.
 */
export function getStoresForPlant(plant?: string, materials: Material[] = []): StoreMasterItem[] {
  if (!plant || plant === 'ALL' || plant === 'All Plants') {
    const map = new Map<string, StoreMasterItem>();
    BASE_STORE_MASTER.forEach(s => map.set(s.code, s));
    materials.forEach(m => {
      const s = m.storageLocation?.trim();
      if (s && !map.has(s)) {
        map.set(s, {
          code: s,
          name: s,
          plant: m.plant || 'DEMO',
          label: s,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.code.localeCompare(b.code));
  }

  const map = new Map<string, StoreMasterItem>();

  // 1. Load canonical stores for this plant
  BASE_STORE_MASTER.filter(s => s.plant === plant).forEach(s => {
    map.set(s.code, s);
  });

  // 2. Discover any additional storageLocation present in materials for this plant
  materials.filter(m => m.plant === plant).forEach(m => {
    const s = m.storageLocation?.trim();
    if (s && !map.has(s)) {
      map.set(s, {
        code: s,
        name: s,
        plant,
        label: s,
      });
    }
  });

  // 3. Fallback for dynamic plants (e.g. GM, RD)
  if (map.size === 0) {
    const defaultStores = [`${plant}-STORE-01`, `${plant}-STORE-02`, `${plant}-SPARE`, 'MAIN', 'STORE-A', 'STORE-B'];
    defaultStores.forEach(s => {
      map.set(s, {
        code: s,
        name: s,
        plant,
        label: `${s} (${plant})`,
      });
    });
  }

  return Array.from(map.values()).sort((a, b) => a.code.localeCompare(b.code));
}

/**
 * Checks if a store is valid for a given plant.
 */
export function isValidStoreForPlant(plant?: string, store?: string, materials: Material[] = []): boolean {
  if (!plant || plant === 'ALL' || plant === 'All Plants') return true;
  if (!store || store === 'ALL') return true;
  const availableStores = getStoresForPlant(plant, materials);
  return availableStores.some(s => s.code === store);
}
