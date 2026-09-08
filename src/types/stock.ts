export type StockStatus =
  | "NORMAL"
  | "REORDERING"
  | "OVERMAX"
  | "UNDERMIN"
  | "OUT_OF_STOCK";

export type TransactionType =
  | "OPENING"
  | "GR"
  | "GI"
  | "ADJUSTMENT";

export type PlantOption = "All Plants" | "DEMO" | "PLANT-01" | "PLANT-02";

export interface Material {
  id: string;
  plant: string;
  materialCode: string;
  description: string;
  materialType: string;
  standardPrice: number;
  unit: string;
  min: number;
  max: number;
  rop: number;
  leadTime: number; // in days
  storageLocation: string;
  storageBin: string;
  image?: string;
  qrValue: string;
  createdAt: string;
  updatedAt: string;
}

export interface StockTransaction {
  id: string;
  documentNo: string;
  plant: string;
  materialId: string;
  materialCode: string;
  transactionType: TransactionType;
  quantity: number; // positive for OPENING/GR, negative for GI, +/- for ADJUSTMENT
  balanceBefore: number;
  balanceAfter: number;
  pricePerUnit?: number;
  totalPrice?: number;
  storageLocation?: string;
  storageBin?: string;
  batchNo?: string;
  serialNo?: string;
  lotNo?: string;
  picklist?: string;
  process?: string;
  referenceNo?: string;
  comment?: string;
  createdBy: string;
  createdAt: string; // ISO 8601 string
}

export interface MaterialWithStock extends Material {
  currentStock: number;
  stockStatus: StockStatus;
  lastMovement?: StockTransaction;
  totalValue: number;
}

export interface DateRange {
  startDate: string; // ISO string e.g. "2026-08-01T00:00:00"
  endDate: string;   // ISO string e.g. "2026-09-08T23:59:59"
  label?: string;
}

export type PresetRangeKey =
  | "today"
  | "yesterday"
  | "this_week"
  | "last_week"
  | "31_days_ago"
  | "this_month"
  | "last_month"
  | "this_year"
  | "custom";
