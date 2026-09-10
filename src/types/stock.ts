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
  documentId?: string;
  documentNo: string;
  transactionNumber?: string;
  plant: string;
  materialId: string;
  materialCode: string;
  description?: string;
  source?: 'ITEM_LEVEL' | 'DOCUMENT_LEVEL' | string;
  transactionType: TransactionType;
  quantity: number; // positive for OPENING/GR, negative for GI, +/- for ADJUSTMENT
  balanceBefore: number;
  balanceAfter: number;
  pricePerUnit?: number;
  price?: number;
  totalPrice?: number;
  storageLocation?: string;
  storageBin?: string;
  batchNo?: string;
  batchNumber?: string;
  serialNo?: string;
  serialNumber?: string;
  lotNo?: string;
  lot?: string;
  picklist?: string;
  process?: string;
  referenceNo?: string;
  referenceNumber?: string;
  type?: string;
  supplier?: string;
  comment?: string;
  createdBy: string;
  createdAt: string; // ISO 8601 string
}

export interface TransactionItem {
  id: string;
  materialId: string;
  materialCode: string;
  description: string;
  lot?: string;
  batchNumber?: string;
  serialNumber?: string;
  quantity: number; // positive quantity entered by user
  price: number;
  type?: string;
  comment?: string;
  supplier?: string;
  storageLocation?: string;
  storageBin?: string;
  unit?: string;
  totalPrice?: number;
}

export interface TransactionDocument {
  id: string;
  transactionNumber: string; // e.g. "GR-0001" or "GI-0001"
  transactionType: TransactionType; // "GR" | "GI" | "OPENING" | "ADJUSTMENT"
  plant: string;
  referenceNumber?: string;
  prId?: string;
  picklist?: string;
  createdDateTime: string;
  createdBy: string;
  comment?: string;
  status: 'COMPLETED' | 'POSTED' | 'DRAFT' | 'CANCELLED';
  items: TransactionItem[];
  totalQuantity: number;
  totalValue: number;
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

export type WorkflowStatus =
  | 'PENDING'
  | 'CREATED'
  | 'ACCEPT'
  | 'FINISH'
  | 'CONFIRM'
  | 'REJECTED_STORE'
  | 'REJECTED_MAINTENANCE';

export interface TaskMaterialLine {
  id: string;
  materialCode: string;
  description: string;
  element?: string;
  ioNo?: string;
  comment?: string;
  unit: string;
  quantity: number;
  pricePerUnit: number;
  totalPrice: number;
}

export interface WorkflowStep {
  step: 'PENDING' | 'CREATED' | 'ACCEPT' | 'FINISH' | 'CONFIRM';
  label: string;
  completed: boolean;
  active: boolean;
  timestamp?: string;
  responsibleUser?: string;
}

export interface PendingTask {
  id: string;
  taskNo: string;
  picklistNo: string;
  jobOrderNo: string;
  title: string;
  type: 'Factory Requisition' | 'Maintenance Request' | 'Emergency Repair' | 'Routine Overhaul';
  costCenter: string;
  location: string;
  plant: string;
  itemCount: number;
  totalValue: number;
  requestedBy: string;
  requestedDepartment: string;
  createdAt: string;
  timePending: string;
  requestedDeliveryDate: string;
  status: WorkflowStatus;
  rejectReason?: string;
  materialLines: TaskMaterialLine[];
  timeline: WorkflowStep[];
}

