import { Material, StockTransaction, StockStatus, TransactionDocument, StockLotItem, MaterialWithStock, ItemWithStock } from '../types/stock';

/**
 * Checks if a PR ID already exists in any recorded transaction documents or stock transactions.
 * Case-insensitive & trimmed across both GR and GI.
 */
export function checkDuplicatePrId(
  prId: string,
  documents: TransactionDocument[] = [],
  transactions: StockTransaction[] = []
): boolean {
  const clean = prId.trim().toLowerCase();
  if (!clean) return false;

  const inDocs = documents.some(doc => {
    if (doc.prId && doc.prId.trim().toLowerCase() === clean) return true;
    if (doc.picklist && doc.picklist.trim().toLowerCase() === clean) return true;
    if (doc.referenceNumber && doc.referenceNumber.trim().toLowerCase() === clean) return true;
    return false;
  });
  if (inDocs) return true;

  const inTx = transactions.some(tx => {
    if (tx.picklist && tx.picklist.trim().toLowerCase() === clean) return true;
    if (tx.referenceNo && tx.referenceNo.trim().toLowerCase() === clean) return true;
    if (tx.referenceNumber && tx.referenceNumber.trim().toLowerCase() === clean) return true;
    return false;
  });

  return inTx;
}

/**
 * Checks if a PickList number already exists in any recorded transaction documents or stock transactions.
 * Case-insensitive & trimmed across both GR and GI.
 */
export function checkDuplicatePicklist(
  picklist: string,
  documents: TransactionDocument[] = [],
  transactions: StockTransaction[] = []
): boolean {
  const clean = picklist.trim().toLowerCase();
  if (!clean) return false;

  const inDocs = documents.some(doc => {
    if (doc.picklist && doc.picklist.trim().toLowerCase() === clean) return true;
    if (doc.prId && doc.prId.trim().toLowerCase() === clean) return true;
    if (doc.referenceNumber && doc.referenceNumber.trim().toLowerCase() === clean) return true;
    return false;
  });
  if (inDocs) return true;

  const inTx = transactions.some(tx => {
    if (tx.picklist && tx.picklist.trim().toLowerCase() === clean) return true;
    if (tx.referenceNo && tx.referenceNo.trim().toLowerCase() === clean) return true;
    if (tx.referenceNumber && tx.referenceNumber.trim().toLowerCase() === clean) return true;
    return false;
  });

  return inTx;
}

/**
 * Calculates current stock quantity for a material from all historical transactions.
 * Uses the sum of transaction quantities as the single source of truth.
 */
export function getCurrentStock(
  materialId: string,
  transactions: StockTransaction[],
  filterPlant?: string,
  filterStore?: string
): number {
  let itemTx = transactions.filter(t => t.materialId === materialId);

  if (filterPlant && filterPlant !== 'ALL' && filterPlant !== 'All Plants') {
    itemTx = itemTx.filter(t => t.plant === filterPlant);
  }

  if (filterStore && filterStore !== 'ALL' && filterStore !== 'All Stores') {
    itemTx = itemTx.filter(t => t.storageLocation === filterStore);
  }

  const total = itemTx.reduce((sum, tx) => sum + (tx.quantity || 0), 0);
  return Math.max(0, total);
}

/**
 * Derives stock status based on current stock, min, max, and rop.
 */
export function calculateStockStatus(material: { min: number; max: number; rop: number }, currentStock: number): StockStatus {
  if (currentStock <= 0) {
    return "OUT_OF_STOCK";
  }
  if (currentStock > material.max) {
    return "OVERMAX";
  }
  if (currentStock < material.min) {
    return "UNDERMIN";
  }
  if (currentStock <= material.rop) {
    return "REORDERING";
  }
  return "NORMAL";
}

/**
 * Gets the most recent transaction for a material.
 */
export function getLastMovement(materialId: string, transactions: StockTransaction[]): StockTransaction | undefined {
  const itemTx = transactions
    .filter(t => t.materialId === materialId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return itemTx[0];
}

/**
 * Calculates starting balance of a material immediately before startDate.
 */
export function getStartingBalance(materialId: string, transactions: StockTransaction[], startDateStr: string): number {
  const startTime = new Date(startDateStr).getTime();
  
  const priorTransactions = transactions
    .filter(t => t.materialId === materialId && new Date(t.createdAt).getTime() < startTime)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  if (priorTransactions.length === 0) {
    return 0;
  }

  return priorTransactions[priorTransactions.length - 1].balanceAfter;
}

/**
 * Gets transactions for a material within date range [startDate, endDate], sorted newest first.
 */
export function getMovementHistoryInRange(
  materialId: string,
  transactions: StockTransaction[],
  startDateStr: string,
  endDateStr: string
): StockTransaction[] {
  const startTime = new Date(startDateStr).getTime();
  const endTime = new Date(endDateStr).getTime();

  return transactions
    .filter(t => {
      if (t.materialId !== materialId) return false;
      const tTime = new Date(t.createdAt).getTime();
      return tTime >= startTime && tTime <= endTime;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export interface GraphPoint {
  timestamp: string;
  displayTime: string;
  balance: number;
  transaction?: StockTransaction;
  movementLabel?: string;
  isBoundary?: boolean;
}

/**
 * Prepares chronological data points for Stock Balance Over Time chart
 */
export function getStockChartData(
  materialId: string,
  transactions: StockTransaction[],
  startDateStr: string,
  endDateStr: string
): GraphPoint[] {
  const startingBalance = getStartingBalance(materialId, transactions, startDateStr);
  const startTime = new Date(startDateStr).getTime();
  const endTime = new Date(endDateStr).getTime();

  const inRangeTx = transactions
    .filter(t => {
      if (t.materialId !== materialId) return false;
      const tTime = new Date(t.createdAt).getTime();
      return tTime >= startTime && tTime <= endTime;
    })
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const points: GraphPoint[] = [];

  // Start point: starting balance at range start
  points.push({
    timestamp: startDateStr,
    displayTime: formatChartDate(startDateStr),
    balance: startingBalance,
    movementLabel: "Starting Balance",
    isBoundary: true,
  });

  // If no transactions in range, render flat line from start to end
  if (inRangeTx.length === 0) {
    points.push({
      timestamp: endDateStr,
      displayTime: formatChartDate(endDateStr),
      balance: startingBalance,
      movementLabel: "Current Period Balance",
      isBoundary: true,
    });
    return points;
  }

  // Add each transaction in range
  inRangeTx.forEach(tx => {
    let typeLabel: string = tx.transactionType;
    if (tx.transactionType === 'GR') typeLabel = 'Goods Receipt (+)';
    if (tx.transactionType === 'GI') typeLabel = 'Goods Issue (-)';
    if (tx.transactionType === 'OPENING') typeLabel = 'Opening Balance';
    if (tx.transactionType === 'ADJUSTMENT') typeLabel = 'Stock Adjustment';

    points.push({
      timestamp: tx.createdAt,
      displayTime: formatChartDate(tx.createdAt),
      balance: tx.balanceAfter,
      transaction: tx,
      movementLabel: `${typeLabel}: ${tx.quantity > 0 ? '+' : ''}${tx.quantity}`,
    });
  });

  // Add end point to sustain graph to the end of selected period
  const lastBalance = inRangeTx[inRangeTx.length - 1].balanceAfter;
  points.push({
    timestamp: endDateStr,
    displayTime: formatChartDate(endDateStr),
    balance: lastBalance,
    movementLabel: "Ending Period Balance",
    isBoundary: true,
  });

  return points;
}

function formatChartDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    const day = String(d.getDate()).padStart(2, '0');
    const month = d.toLocaleString('en-US', { month: 'short' });
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day} ${month} ${hours}:${minutes}`;
  } catch {
    return isoString;
  }
}

/**
 * Calculates the exact cumulative stock quantity for a material at any target DateTime.
 * Uses all historical transactions created on or before targetDateTimeStr with optional plant/store filters.
 */
export function getStockAtDateTime(
  materialId: string,
  transactions: StockTransaction[],
  targetDateTimeStr: string,
  filterPlant?: string,
  filterStore?: string
): number {
  const targetTime = new Date(targetDateTimeStr).getTime();
  
  let priorTransactions = transactions
    .filter(t => t.materialId === materialId && new Date(t.createdAt).getTime() <= targetTime);

  if (filterPlant && filterPlant !== 'ALL' && filterPlant !== 'All Plants') {
    priorTransactions = priorTransactions.filter(t => t.plant === filterPlant);
  }
  if (filterStore && filterStore !== 'ALL' && filterStore !== 'All Stores') {
    priorTransactions = priorTransactions.filter(t => t.storageLocation === filterStore);
  }

  const total = priorTransactions.reduce((sum, tx) => sum + (tx.quantity || 0), 0);
  return Math.max(0, total);
}

export type ChartGranularity = 'Daily' | 'Monthly' | 'Yearly';

export interface MovementGranularPoint {
  periodKey: string;
  periodLabel: string;
  grQty: number;
  giQty: number;
  grValue: number;
  giValue: number;
  netQty: number;
  netValue: number;
}

/**
 * Aggregates GR and GI movements within a DateTime range into Daily, Monthly, or Yearly buckets.
 */
export function getMovementTrendGranularData(
  transactions: StockTransaction[],
  startDateTimeStr: string,
  endDateTimeStr: string,
  granularity: ChartGranularity,
  selectedPlant: string = 'All Plants',
  selectedStore: string = 'All Stores'
): MovementGranularPoint[] {
  const startTime = new Date(startDateTimeStr).getTime();
  const endTime = new Date(endDateTimeStr).getTime();

  const inRangeTx = transactions.filter(t => {
    if (selectedPlant !== 'All Plants' && selectedPlant !== 'ALL' && t.plant !== selectedPlant) return false;
    if (selectedStore !== 'All Stores' && selectedStore !== 'ALL' && t.storageLocation !== selectedStore) return false;
    const tTime = new Date(t.createdAt).getTime();
    return tTime >= startTime && tTime <= endTime;
  });

  const buckets: Record<string, {
    periodLabel: string;
    grQty: number;
    giQty: number;
    grValue: number;
    giValue: number;
    sortTime: number;
  }> = {};

  inRangeTx.forEach(tx => {
    const d = new Date(tx.createdAt);
    let key = '';
    let label = '';
    let sortTime = 0;

    if (granularity === 'Daily') {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      key = `${year}-${month}-${day}`;
      label = `${day} ${d.toLocaleString('en-US', { month: 'short' })}`;
      sortTime = new Date(year, d.getMonth(), d.getDate()).getTime();
    } else if (granularity === 'Monthly') {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      key = `${year}-${month}`;
      label = `${d.toLocaleString('en-US', { month: 'short' })} ${year}`;
      sortTime = new Date(year, d.getMonth(), 1).getTime();
    } else {
      // Yearly
      const year = d.getFullYear();
      key = `${year}`;
      label = `${year}`;
      sortTime = new Date(year, 0, 1).getTime();
    }

    if (!buckets[key]) {
      buckets[key] = {
        periodLabel: label,
        grQty: 0,
        giQty: 0,
        grValue: 0,
        giValue: 0,
        sortTime,
      };
    }

    const price = tx.pricePerUnit || 0;
    if (tx.transactionType === 'GR' || tx.transactionType === 'OPENING') {
      const qty = Math.abs(tx.quantity);
      buckets[key].grQty += qty;
      buckets[key].grValue += tx.totalPrice || qty * price;
    } else if (tx.transactionType === 'GI') {
      const qty = Math.abs(tx.quantity);
      buckets[key].giQty += qty;
      buckets[key].giValue += tx.totalPrice || qty * price;
    } else if (tx.transactionType === 'ADJUSTMENT') {
      if (tx.quantity > 0) {
        buckets[key].grQty += tx.quantity;
        buckets[key].grValue += tx.totalPrice || tx.quantity * price;
      } else if (tx.quantity < 0) {
        const qty = Math.abs(tx.quantity);
        buckets[key].giQty += qty;
        buckets[key].giValue += tx.totalPrice || qty * price;
      }
    }
  });

  const sortedPoints = Object.entries(buckets)
    .sort((a, b) => a[1].sortTime - b[1].sortTime)
    .map(([key, data]) => ({
      periodKey: key,
      periodLabel: data.periodLabel,
      grQty: Math.round(data.grQty * 100) / 100,
      giQty: Math.round(data.giQty * 100) / 100,
      grValue: Math.round(data.grValue * 100) / 100,
      giValue: Math.round(data.giValue * 100) / 100,
      netQty: Math.round((data.grQty - data.giQty) * 100) / 100,
      netValue: Math.round((data.grValue - data.giValue) * 100) / 100,
    }));

  return sortedPoints;
}

/**
 * Derives real-time lot balances across all materials, stores, and bins
 * Ensures: Sum(Lot Quantities) = Material Total Stock in that plant/store
 */
export function calculateLotBalances(
  materials: Material[],
  transactions: StockTransaction[],
  filterPlant?: string,
  filterStore?: string
): StockLotItem[] {
  const lotMap = new Map<string, StockLotItem>();
  const materialMap = new Map<string, Material>();
  materials.forEach(m => materialMap.set(m.id, m));

  const sortedTx = [...transactions].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  sortedTx.forEach(tx => {
    const mat = materialMap.get(tx.materialId);
    const plant = tx.plant || mat?.plant || 'DEMO';
    const store = tx.storageLocation || mat?.storageLocation || 'MAIN';
    const storageBin = tx.storageBin || mat?.storageBin || 'BIN-01';
    const lot = tx.lot || tx.lotNo || 'LOT-2608-01';
    const batchNumber = tx.batchNumber || tx.batchNo || 'B-2608';
    const key = `${plant}__${store}__${storageBin}__${tx.materialId}__${lot}`;

    if (!lotMap.has(key)) {
      lotMap.set(key, {
        id: `lot-${plant}-${tx.materialId}-${lot}-${store}-${storageBin}`.toLowerCase().replace(/\s+/g, '-'),
        plant,
        store,
        storageLocation: store,
        storageBin,
        materialId: tx.materialId,
        materialCode: tx.materialCode || mat?.materialCode || '',
        description: mat?.description || tx.description || '',
        materialType: mat?.materialType || 'SPARE_PARTS',
        unit: mat?.unit || 'PC',
        lot,
        lotNo: lot,
        batchNumber,
        batchNo: batchNumber,
        quantity: 0,
        standardPrice: mat?.standardPrice || tx.pricePerUnit || 0,
        totalValue: 0,
        receivedDate: tx.receivedDate || (tx.transactionType === 'GR' || tx.transactionType === 'OPENING' ? tx.createdAt.slice(0, 10) : undefined),
        expiryDate: tx.expiryDate,
        lastUpdated: tx.createdAt,
      });
    }

    const entry = lotMap.get(key)!;
    entry.quantity += tx.quantity;
    entry.totalValue = Math.max(0, entry.quantity * entry.standardPrice);
    entry.lastUpdated = tx.createdAt;
    if (batchNumber) {
      entry.batchNumber = batchNumber;
      entry.batchNo = batchNumber;
    }
    if (tx.expiryDate) entry.expiryDate = tx.expiryDate;
    if ((tx.transactionType === 'GR' || tx.transactionType === 'OPENING') && !entry.receivedDate) {
      entry.receivedDate = tx.receivedDate || tx.createdAt.slice(0, 10);
    }
  });

  // Ensure every material from the catalog with positive balance is represented
  materials.forEach(mat => {
    const currentStock = getCurrentStock(mat.id, transactions);
    if (currentStock > 0) {
      const existingLots = Array.from(lotMap.values()).filter(l => l.materialId === mat.id);
      if (existingLots.length === 0) {
        const plant = mat.plant || 'DEMO';
        const store = mat.storageLocation || 'MAIN';
        const storageBin = mat.storageBin || 'BIN-01';
        const lot = 'LOT-2608-01';
        const key = `${plant}__${store}__${storageBin}__${mat.id}__${lot}`;
        lotMap.set(key, {
          id: `lot-${plant}-${mat.id}-${lot}-${store}-${storageBin}`.toLowerCase().replace(/\s+/g, '-'),
          plant,
          store,
          storageLocation: store,
          storageBin,
          materialId: mat.id,
          materialCode: mat.materialCode,
          description: mat.description,
          materialType: mat.materialType,
          unit: mat.unit,
          lot,
          lotNo: lot,
          batchNumber: 'B-260801',
          batchNo: 'B-260801',
          quantity: currentStock,
          standardPrice: mat.standardPrice || 0,
          totalValue: currentStock * (mat.standardPrice || 0),
          lastUpdated: mat.updatedAt || mat.createdAt,
        });
      }
    }
  });

  let results = Array.from(lotMap.values()).filter(l => l.quantity > 0);

  if (filterPlant && filterPlant !== 'All Plants') {
    results = results.filter(l => l.plant === filterPlant);
  }

  if (filterStore && filterStore !== 'ALL' && filterStore !== 'All Stores') {
    results = results.filter(l => l.store === filterStore || l.storageLocation === filterStore);
  }

  return results;
}

/**
 * Groups materials into high-level Items (Item -> Material -> Lot hierarchy).
 * Real-time calculation: Item Total Stock = Sum of all Material stock = Sum of all Lot stock
 */
export function groupMaterialsByItem(
  materials: MaterialWithStock[],
  lotBalances: StockLotItem[] = []
): ItemWithStock[] {
  const itemMap = new Map<string, ItemWithStock>();

  materials.forEach(mat => {
    // Derive item identifier and name
    const itemName = mat.itemName || mat.description.split(',')[0].trim() || 'General Item';
    const itemCode = mat.itemCode || `ITEM-${itemName.replace(/[^a-zA-Z0-9ก-๙]/g, '-').toUpperCase()}`;
    const itemId = `item-${itemCode.toLowerCase()}`;

    if (!itemMap.has(itemId)) {
      itemMap.set(itemId, {
        itemId,
        itemCode,
        itemName,
        description: mat.itemName ? `${mat.itemName}` : mat.description,
        unit: mat.unit,
        plant: mat.plant,
        totalStock: 0,
        totalValue: 0,
        materialCount: 0,
        lotCount: 0,
        stockStatus: 'NORMAL',
        materials: [],
      });
    }

    const item = itemMap.get(itemId)!;
    item.materials.push(mat);
    item.totalStock += mat.currentStock;
    item.totalValue += mat.totalValue;
    item.materialCount += 1;
  });

  // Calculate lot count and overall item stock status
  itemMap.forEach(item => {
    const matIds = new Set(item.materials.map(m => m.id));
    const itemLots = lotBalances.filter(l => matIds.has(l.materialId));
    item.lotCount = itemLots.length > 0 ? itemLots.length : item.materials.reduce((acc, m) => acc + (m.currentStock > 0 ? 1 : 0), 0);

    // Determine aggregate status
    if (item.totalStock === 0) {
      item.stockStatus = 'OUT_OF_STOCK';
    } else if (item.materials.some(m => m.stockStatus === 'UNDERMIN' || m.stockStatus === 'OUT_OF_STOCK')) {
      item.stockStatus = 'UNDERMIN';
    } else if (item.materials.some(m => m.stockStatus === 'REORDERING')) {
      item.stockStatus = 'REORDERING';
    } else if (item.materials.some(m => m.stockStatus === 'OVERMAX')) {
      item.stockStatus = 'OVERMAX';
    } else {
      item.stockStatus = 'NORMAL';
    }
  });

  return Array.from(itemMap.values());
}

