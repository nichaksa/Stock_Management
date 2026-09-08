import { Material, StockTransaction, StockStatus } from '../types/stock';

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
