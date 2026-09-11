import { Material, StockTransaction } from '../types/stock';
import { getCurrentStock, calculateStockStatus, getLastMovement } from './stockCalculation';
import { formatDateTime } from './dateRange';

function downloadCsvFile(csvContent: string, filename: string) {
  // UTF-8 BOM for Excel support
  const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCsvCell(cell: any): string {
  if (cell === null || cell === undefined) return '""';
  const str = String(cell).replace(/"/g, '""');
  return `"${str}"`;
}

export function exportMasterDataToCsv(materials: Material[], _transactions: StockTransaction[], filename = "zycoda_master_data.csv") {
  const headers = [
    "Plant",
    "Material Code",
    "Description",
    "Material Type",
    "Unit",
    "Standard Price",
    "Min Stock",
    "Max Stock",
    "ROP",
    "Lead Time (Days)",
    "Storage Location",
    "Storage Bin",
    "Last Update",
    "QR Payload"
  ];

  const rows = materials.map(m => [
    m.plant,
    m.materialCode,
    m.description,
    m.materialType,
    m.unit,
    m.standardPrice,
    m.min,
    m.max,
    m.rop,
    m.leadTime,
    m.storageLocation,
    m.storageBin,
    formatDateTime(m.updatedAt || m.createdAt),
    m.qrValue
  ]);

  const csv = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map(row => row.map(escapeCsvCell).join(','))
  ].join('\r\n');

  downloadCsvFile(csv, filename);
}

export function exportTransactionsToCsv(transactions: StockTransaction[], filename = "zycoda_stock_transactions.csv") {
  const headers = [
    "Document No",
    "Date Time",
    "Plant",
    "Material Code",
    "Type",
    "Movement",
    "Balance Before",
    "Balance After",
    "User",
    "Storage Location",
    "Storage Bin",
    "Batch No",
    "Serial No",
    "Lot No",
    "Process",
    "Reference No",
    "Comment"
  ];

  const rows = transactions.map(tx => [
    tx.documentNo,
    formatDateTime(tx.createdAt),
    tx.plant,
    tx.materialCode,
    tx.transactionType,
    tx.quantity > 0 ? `+${tx.quantity}` : `${tx.quantity}`,
    tx.balanceBefore,
    tx.balanceAfter,
    tx.createdBy,
    tx.storageLocation || "-",
    tx.storageBin || "-",
    tx.batchNo || "-",
    tx.serialNo || "-",
    tx.lotNo || "-",
    tx.process || "-",
    tx.referenceNo || "-",
    tx.comment || "-"
  ]);

  const csv = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map(row => row.map(escapeCsvCell).join(','))
  ].join('\r\n');

  downloadCsvFile(csv, filename);
}

export function exportInventoryReportToCsv(materials: Material[], transactions: StockTransaction[], filename = "zycoda_inventory_report.csv") {
  const headers = [
    "Plant",
    "Material Code",
    "Description",
    "Type",
    "Current Stock",
    "Unit",
    "Standard Unit Price",
    "Total Inventory Value",
    "Min",
    "ROP",
    "Max",
    "Stock Status",
    "Lead Time (Days)",
    "Storage Location",
    "Storage Bin",
    "Last Movement Date",
    "Last Movement Type"
  ];

  const rows = materials.map(m => {
    const currentQty = getCurrentStock(m.id, transactions);
    const status = calculateStockStatus(m, currentQty);
    const lastMove = getLastMovement(m.id, transactions);
    const totalVal = currentQty * (m.standardPrice || 0);

    return [
      m.plant,
      m.materialCode,
      m.description,
      m.materialType,
      currentQty,
      m.unit,
      m.standardPrice,
      totalVal.toFixed(2),
      m.min,
      m.rop,
      m.max,
      status,
      m.leadTime,
      m.storageLocation,
      m.storageBin,
      lastMove ? formatDateTime(lastMove.createdAt) : "No Movement",
      lastMove ? lastMove.transactionType : "-"
    ];
  });

  const csv = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map(row => row.map(escapeCsvCell).join(','))
  ].join('\r\n');

  downloadCsvFile(csv, filename);
}
