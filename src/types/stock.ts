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
  | "ADJUSTMENT"
  | "TRANSFER";

export type PlantOption = "All Plants" | "DEMO" | "PLANT-01" | "PLANT-02";

export interface Material {
  id: string;
  plant: string;
  materialCode: string;
  description: string;
  itemName?: string;
  itemCode?: string;
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
  lotNo?: string;
  lot?: string;
  expiryDate?: string;
  receivedDate?: string;
  picklist?: string;
  process?: string;
  referenceNo?: string;
  referenceNumber?: string;
  type?: string;
  supplier?: string;
  comment?: string;
  fromStore?: string;
  toStore?: string;
  transferRoute?: string;
  transferFromBalanceBefore?: number;
  transferFromBalanceAfter?: number;
  transferToBalanceBefore?: number;
  transferToBalanceAfter?: number;
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
  expiryDate?: string;
  receivedDate?: string;
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

export interface ItemWithStock {
  itemId: string;
  itemCode: string;
  itemName: string;
  description: string;
  unit: string;
  plant: string;
  totalStock: number;
  totalValue: number;
  materialCount: number;
  lotCount: number;
  stockStatus: StockStatus;
  materials: MaterialWithStock[];
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

// ---------------------------------------------------------------------------
// Material Request & Purchase Requisition (PR) Data Models
// ---------------------------------------------------------------------------
export type RequestType = 'MATERIAL_REQUEST' | 'PURCHASE_REQUISITION';

export type MaterialRequestStatus =
  | 'PENDING_APPROVAL'
  | 'STORE_REVIEW'
  | 'APPROVED'
  | 'PARTIALLY_ISSUED'
  | 'ISSUED'
  | 'PROCEEDED_PURCHASING'
  | 'CLOSED'
  | 'REJECTED';

export type MaterialRequestPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface MaterialRequestItem {
  id: string;
  materialId: string;
  materialCode: string;
  description: string;
  requestedQuantity: number;
  unit: string;
  pricePerUnit: number;
  totalPrice: number;
  lot?: string;
  batchNumber?: string;
  storageLocation?: string;
  storageBin?: string;
  remarks?: string;
  issuedQuantity?: number;
  requiredDate?: string;
  itemCode?: string;
  itemName?: string;
  selectionMode?: 'MATERIAL' | 'LOT';
  availableStockAtRequest?: number;
}

export interface RequestTimelineEvent {
  id: string;
  status: MaterialRequestStatus;
  actionTitle: string;
  actorName: string;
  actorRole: string;
  timestamp: string;
  comments?: string;
}

export interface MaterialRequest {
  id: string;
  requestNo: string; // e.g. "MR-2609-001" or "PR-2609-001"
  requestType: RequestType;
  plant: string;
  department: string;
  costCenter: string;
  jobOrderNo?: string;
  workOrderNo?: string;
  priority: MaterialRequestPriority;
  purpose: string;
  title: string;
  requestedBy: string; // username
  requesterName: string; // Full Name
  requiredDate?: string;
  additionalNote?: string;
  storeProceedNotes?: string;
  approverName?: string;
  storeReviewerName?: string;
  issuedByName?: string;
  status: MaterialRequestStatus;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  storeReviewedAt?: string;
  issuedAt?: string;
  closedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  items: MaterialRequestItem[];
  totalQuantity: number;
  totalEstimatedValue: number;
  linkedGiNumber?: string; // e.g. "GI-0006" generated upon issuance
  timeline: RequestTimelineEvent[];
}

// ---------------------------------------------------------------------------
// Granular Lot Item & View Models
// ---------------------------------------------------------------------------
export interface StockLotItem {
  id: string; // composite key e.g. plant-materialId-lot-sloc-bin
  plant: string;
  store: string; // Storage Location / Store Name
  storageLocation: string;
  storageBin: string;
  materialId: string;
  materialCode: string;
  description: string;
  materialType: string;
  unit: string;
  lot: string;
  lotNo?: string;
  batchNumber?: string;
  batchNo?: string;
  quantity: number;
  standardPrice: number;
  totalValue: number;
  receivedDate?: string;
  expiryDate?: string;
  lastUpdated: string;
}

// ---------------------------------------------------------------------------
// Cross-Store Material Transfer
// ---------------------------------------------------------------------------
export interface MaterialTransfer {
  id: string;
  transferNumber: string; // e.g. "TR-2609-001"
  fromPlant: string;
  fromStore: string;
  toPlant: string;
  toStore: string;
  materialId: string;
  materialCode: string;
  description: string;
  quantity: number;
  unit: string;
  lot?: string;
  batchNumber?: string;
  reason?: string;
  comment?: string;
  transferredBy: string;
  createdAt: string;
  status: 'COMPLETED';
}


