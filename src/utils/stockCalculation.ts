import { Material, StockTransaction, StockStatus, TransactionDocument } from '../types/stock';

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
 */
export function getCurrentStock(materialId: string, transactions: StockTransaction[]): number {
  const itemTx = transactions
    .filter(t => t.materialId === materialId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  if (itemTx.length === 0) return 0;
  // Last transaction's balanceAfter is the current stock
  return itemTx[itemTx.length - 1].balanceAfter;
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
 * Uses all historical transactions created on or before targetDateTimeStr.
 */
export function getStockAtDateTime(
  materialId: string,
  transactions: StockTransaction[],
  targetDateTimeStr: string
): number {
  const targetTime = new Date(targetDateTimeStr).getTime();
  
  const priorTransactions = transactions
    .filter(t => t.materialId === materialId && new Date(t.createdAt).getTime() <= targetTime)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  if (priorTransactions.length === 0) {
    return 0;
  }

  return priorTransactions[priorTransactions.length - 1].balanceAfter;
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
  selectedPlant: string = 'All Plants'
): MovementGranularPoint[] {
  const startTime = new Date(startDateTimeStr).getTime();
  const endTime = new Date(endDateTimeStr).getTime();

  const inRangeTx = transactions.filter(t => {
    if (selectedPlant !== 'All Plants' && t.plant !== selectedPlant) return false;
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

