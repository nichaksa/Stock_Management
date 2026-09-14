import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Material,
  StockTransaction,
  TransactionDocument,
  TransactionItem,
  MaterialRequest,
  MaterialRequestItem,
  MaterialRequestStatus,
  MaterialTransfer,
  StockLotItem,
} from '../types/stock';
import { INITIAL_MATERIALS } from '../mock/materials';
import { INITIAL_TRANSACTIONS } from '../mock/transactions';
import { INITIAL_TRANSACTION_DOCUMENTS } from '../mock/transactionDocuments';
import { INITIAL_MATERIAL_REQUESTS } from '../mock/materialRequests';
import { INITIAL_TRANSFERS } from '../mock/materialTransfers';
import { useAuth } from './AuthContext';
import {
  getCurrentStock,
  calculateStockStatus,
  getLastMovement,
  checkDuplicatePrId,
  checkDuplicatePicklist,
  calculateLotBalances,
} from '../utils/stockCalculation';

export interface ItemIssueLotAllocation {
  lot: string;
  batchNumber?: string;
  storageLocation?: string;
  storageBin?: string;
  quantity: number;
}

export interface ItemIssueSpec {
  itemId: string;
  issueQuantity: number;
  materialId?: string;
  lotAllocations?: ItemIssueLotAllocation[];
}

interface StockContextType {
  materials: Material[];
  transactions: StockTransaction[];
  transactionDocuments: TransactionDocument[];
  materialRequests: MaterialRequest[];
  materialTransfers: MaterialTransfer[];
  getLotBalances: (plant?: string, store?: string) => StockLotItem[];
  addMaterial: (material: Omit<Material, 'id' | 'qrValue' | 'createdAt' | 'updatedAt'>, openingQty: number) => { success: boolean; error?: string; material?: Material };
  updateMaterial: (id: string, updates: Partial<Omit<Material, 'id' | 'materialCode' | 'qrValue' | 'createdAt'>>) => { success: boolean; error?: string };
  deleteMaterial: (id: string) => { success: boolean; error?: string };
  createGoodsReceipt: (data: {
    materialId: string;
    quantity: number;
    pricePerUnit?: number;
    batchNo?: string;
    lotNo?: string;
    expiryDate?: string;
    receivedDate?: string;
    type?: string;
    supplier?: string;
    storageLocation?: string;
    storageBin?: string;
    referenceNo?: string;
    comment?: string;
    process?: string;
  }) => { success: boolean; error?: string; transaction?: StockTransaction; document?: TransactionDocument };
  createGoodsIssue: (data: {
    materialId: string;
    quantity: number;
    pricePerUnit?: number;
    batchNo?: string;
    lotNo?: string;
    type?: string;
    supplier?: string;
    storageLocation?: string;
    storageBin?: string;
    picklist?: string;
    process?: string;
    referenceNo?: string;
    comment?: string;
  }) => { success: boolean; error?: string; transaction?: StockTransaction; document?: TransactionDocument };
  createDocumentGoodsReceipt: (data: {
    transactionNumber?: string;
    plant: string;
    referenceNumber?: string;
    prId?: string;
    comment?: string;
    items: Omit<TransactionItem, 'id'>[];
  }) => { success: boolean; error?: string; document?: TransactionDocument };
  createDocumentGoodsIssue: (data: {
    transactionNumber?: string;
    plant: string;
    referenceNumber?: string;
    picklist?: string;
    comment?: string;
    items: Omit<TransactionItem, 'id'>[];
  }) => { success: boolean; error?: string; document?: TransactionDocument };
  createStockAdjustment: (data: {
    materialId: string;
    adjustmentType: 'INCREASE' | 'DECREASE' | 'SET_ACTUAL';
    quantity: number;
    reason: string;
    comment?: string;
  }) => { success: boolean; error?: string; transaction?: StockTransaction };
  createMaterialRequest: (data: Omit<MaterialRequest, 'id' | 'requestNo' | 'status' | 'createdAt' | 'updatedAt' | 'timeline'>) => { success: boolean; error?: string; request?: MaterialRequest };
  approveMaterialRequest: (id: string, comments?: string) => { success: boolean; error?: string };
  storeReviewPass: (id: string, comments?: string) => { success: boolean; error?: string };
  rejectMaterialRequest: (id: string, reason: string) => { success: boolean; error?: string };
  proceedPurchaseRequisition: (id: string, storeNotes?: string) => { success: boolean; error?: string };
  convertPrToMaterialRequest: (id: string, notes?: string) => { success: boolean; error?: string };
  issueMaterialRequest: (
    id: string,
    itemIssues?: ItemIssueSpec[],
    notes?: string
  ) => { success: boolean; error?: string; document?: TransactionDocument };
  closeMaterialRequest: (id: string) => { success: boolean; error?: string };
  transferMaterial: (data: {
    plant?: string;
    fromPlant?: string;
    fromStore: string;
    toPlant?: string;
    toStore: string;
    materialId: string;
    quantity: number;
    lot?: string;
    batchNumber?: string;
    reason?: string;
    comment?: string;
  }) => { success: boolean; error?: string; transfer?: MaterialTransfer };
  getItemStock: (materialId: string) => number;
  getItemStatus: (materialId: string) => string;
  getItemLastMove: (materialId: string) => StockTransaction | undefined;
  resetStockDemoData: () => void;
}

const StockContext = createContext<StockContextType | undefined>(undefined);

const MATERIALS_STORAGE_KEY = 'zycoda_materials_v1';
const TRANSACTIONS_STORAGE_KEY = 'zycoda_transactions_v1';
const DOCUMENTS_STORAGE_KEY = 'zycoda_documents_v1';
const REQUESTS_STORAGE_KEY = 'zycoda_requests_v1';
const TRANSFERS_STORAGE_KEY = 'zycoda_transfers_v1';

export const generateNextMrNumber = (requests: MaterialRequest[] = []): string => {
  let maxNum = 0;
  const now = new Date();
  const year = String(now.getFullYear()).slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `MR-${year}${month}-`;

  requests.forEach(req => {
    if (req.requestNo && req.requestNo.startsWith(prefix)) {
      const parsed = parseInt(req.requestNo.replace(prefix, ''), 10);
      if (!isNaN(parsed) && parsed > maxNum) {
        maxNum = parsed;
      }
    } else if (req.requestNo) {
      const match = req.requestNo.match(/MR-\d{4}-(\d+)/i);
      if (match) {
        const parsed = parseInt(match[1], 10);
        if (!isNaN(parsed) && parsed > maxNum) maxNum = parsed;
      }
    }
  });

  const nextNum = maxNum + 1;
  return `${prefix}${String(nextNum).padStart(3, '0')}`;
};

export const generateNextPrNumber = (requests: MaterialRequest[] = []): string => {
  let maxNum = 0;
  const now = new Date();
  const year = String(now.getFullYear()).slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `PR-${year}${month}-`;

  requests.forEach(req => {
    if (req.requestNo && req.requestNo.startsWith(prefix)) {
      const parsed = parseInt(req.requestNo.replace(prefix, ''), 10);
      if (!isNaN(parsed) && parsed > maxNum) {
        maxNum = parsed;
      }
    } else if (req.requestNo) {
      const match = req.requestNo.match(/PR-\d{4}-(\d+)/i);
      if (match) {
        const parsed = parseInt(match[1], 10);
        if (!isNaN(parsed) && parsed > maxNum) maxNum = parsed;
      }
    }
  });

  const nextNum = maxNum + 1;
  return `${prefix}${String(nextNum).padStart(3, '0')}`;
};

export const generateNextTransferNumber = (transfers: MaterialTransfer[] = []): string => {
  let maxNum = 0;
  const now = new Date();
  const year = String(now.getFullYear()).slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `TR-${year}${month}-`;

  transfers.forEach(tr => {
    if (tr.transferNumber && tr.transferNumber.startsWith(prefix)) {
      const parsed = parseInt(tr.transferNumber.replace(prefix, ''), 10);
      if (!isNaN(parsed) && parsed > maxNum) {
        maxNum = parsed;
      }
    } else if (tr.transferNumber) {
      const match = tr.transferNumber.match(/TR-\d{4}-(\d+)/i);
      if (match) {
        const parsed = parseInt(match[1], 10);
        if (!isNaN(parsed) && parsed > maxNum) maxNum = parsed;
      }
    }
  });

  const nextNum = maxNum + 1;
  return `${prefix}${String(nextNum).padStart(3, '0')}`;
};

// Legacy date-format GR & GI number mapping for clean backward compatibility
const LEGACY_GR_MAP: Record<string, string> = {
  'GR-260828-001': 'GR-0001',
  'GR-260902-001': 'GR-0002',
  'GR-260906-001': 'GR-0003',
  'GR-260906-002': 'GR-0004',
  'GR-260907-001': 'GR-0005',
};

const LEGACY_GI_MAP: Record<string, string> = {
  'GI-260825-003': 'GI-0001',
  'GI-260825-001': 'GI-0002',
  'GI-260828-002': 'GI-0003',
  'GI-260830-001': 'GI-0004',
  'GI-260901-004': 'GI-0005',
  'GI-260904-001': 'GI-0006',
  'GI-260904-005': 'GI-0007',
  'GI-260904-012': 'GI-0008',
  'GI-260905-008': 'GI-0009',
  'GI-260906-006': 'GI-0010',
  'GI-260906-022': 'GI-0011',
};

export const generateNextGrNumber = (
  documents: TransactionDocument[] = [],
  transactions: StockTransaction[] = []
): string => {
  let maxNum = 0;

  const scanNumber = (numStr?: string) => {
    if (!numStr) return;
    const match = numStr.match(/^GR-(\d+)$/i);
    if (match) {
      const parsed = parseInt(match[1], 10);
      if (!isNaN(parsed) && parsed > maxNum) {
        maxNum = parsed;
      }
    }
  };

  documents.forEach(doc => {
    if (doc.transactionType === 'GR' || (doc.transactionNumber && doc.transactionNumber.toUpperCase().startsWith('GR-'))) {
      scanNumber(doc.transactionNumber);
    }
  });

  transactions.forEach(tx => {
    if (tx.transactionType === 'GR') {
      scanNumber(tx.documentNo);
      scanNumber(tx.transactionNumber);
    }
  });

  const nextNum = maxNum + 1;
  return `GR-${String(nextNum).padStart(4, '0')}`;
};

export const generateNextGiNumber = (
  documents: TransactionDocument[] = [],
  transactions: StockTransaction[] = []
): string => {
  let maxNum = 0;

  const scanNumber = (numStr?: string) => {
    if (!numStr) return;
    const match = numStr.match(/^GI-(\d+)$/i);
    if (match) {
      const parsed = parseInt(match[1], 10);
      if (!isNaN(parsed) && parsed > maxNum) {
        maxNum = parsed;
      }
    }
  };

  documents.forEach(doc => {
    if (doc.transactionType === 'GI' || (doc.transactionNumber && doc.transactionNumber.toUpperCase().startsWith('GI-'))) {
      scanNumber(doc.transactionNumber);
    }
  });

  transactions.forEach(tx => {
    if (tx.transactionType === 'GI') {
      scanNumber(tx.documentNo);
      scanNumber(tx.transactionNumber);
    }
  });

  const nextNum = maxNum + 1;
  return `GI-${String(nextNum).padStart(4, '0')}`;
};

const normalizeTransactions = (list: StockTransaction[]): StockTransaction[] => {
  return list.map(tx => {
    let docNo = tx.documentNo;
    let txNo = tx.transactionNumber;
    if (docNo && LEGACY_GR_MAP[docNo]) docNo = LEGACY_GR_MAP[docNo];
    if (txNo && LEGACY_GR_MAP[txNo]) txNo = LEGACY_GR_MAP[txNo];
    if (docNo && LEGACY_GI_MAP[docNo]) docNo = LEGACY_GI_MAP[docNo];
    if (txNo && LEGACY_GI_MAP[txNo]) txNo = LEGACY_GI_MAP[txNo];
    return {
      ...tx,
      documentNo: docNo,
      transactionNumber: txNo,
    };
  });
};

const normalizeDocuments = (list: TransactionDocument[]): TransactionDocument[] => {
  return list.map(doc => {
    let txNo = doc.transactionNumber;
    if (txNo && LEGACY_GR_MAP[txNo]) txNo = LEGACY_GR_MAP[txNo];
    if (txNo && LEGACY_GI_MAP[txNo]) txNo = LEGACY_GI_MAP[txNo];
    return {
      ...doc,
      transactionNumber: txNo,
    };
  });
};

function normalizeMaterialRequests(list: MaterialRequest[]): MaterialRequest[] {
  if (!Array.isArray(list) || list.length === 0) return INITIAL_MATERIAL_REQUESTS;
  return list.map(req => {
    let reqType = req.requestType;
    if (!reqType) {
      reqType = req.requestNo?.toUpperCase().startsWith('PR-') ? 'PURCHASE_REQUISITION' : 'MATERIAL_REQUEST';
    }
    const normalizedItems = (req.items || []).map(it => ({
      ...it,
      issuedQuantity:
        it.issuedQuantity !== undefined
          ? it.issuedQuantity
          : req.status === 'ISSUED'
          ? it.requestedQuantity
          : 0,
    }));
    return {
      ...req,
      requestType: reqType,
      items: normalizedItems,
    };
  });
}

export const StockProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, resetAuthData } = useAuth();

  const [materials, setMaterials] = useState<Material[]>(() => {
    try {
      const saved = localStorage.getItem(MATERIALS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : INITIAL_MATERIALS;
    } catch {
      return INITIAL_MATERIALS;
    }
  });

  const [transactions, setTransactions] = useState<StockTransaction[]>(() => {
    try {
      const saved = localStorage.getItem(TRANSACTIONS_STORAGE_KEY);
      return saved ? normalizeTransactions(JSON.parse(saved)) : INITIAL_TRANSACTIONS;
    } catch {
      return INITIAL_TRANSACTIONS;
    }
  });

  const [transactionDocuments, setTransactionDocuments] = useState<TransactionDocument[]>(() => {
    try {
      const saved = localStorage.getItem(DOCUMENTS_STORAGE_KEY);
      return saved ? normalizeDocuments(JSON.parse(saved)) : INITIAL_TRANSACTION_DOCUMENTS;
    } catch {
      return INITIAL_TRANSACTION_DOCUMENTS;
    }
  });

  const [materialRequests, setMaterialRequests] = useState<MaterialRequest[]>(() => {
    try {
      const saved = localStorage.getItem(REQUESTS_STORAGE_KEY);
      return saved ? normalizeMaterialRequests(JSON.parse(saved)) : INITIAL_MATERIAL_REQUESTS;
    } catch {
      return INITIAL_MATERIAL_REQUESTS;
    }
  });

  const [materialTransfers, setMaterialTransfers] = useState<MaterialTransfer[]>(() => {
    try {
      const saved = localStorage.getItem(TRANSFERS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : INITIAL_TRANSFERS;
    } catch {
      return INITIAL_TRANSFERS;
    }
  });

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem(MATERIALS_STORAGE_KEY, JSON.stringify(materials));
  }, [materials]);

  useEffect(() => {
    localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem(DOCUMENTS_STORAGE_KEY, JSON.stringify(transactionDocuments));
  }, [transactionDocuments]);

  useEffect(() => {
    localStorage.setItem(REQUESTS_STORAGE_KEY, JSON.stringify(materialRequests));
  }, [materialRequests]);

  useEffect(() => {
    localStorage.setItem(TRANSFERS_STORAGE_KEY, JSON.stringify(materialTransfers));
  }, [materialTransfers]);

  const getLotBalances = useCallback(
    (plant?: string, store?: string): StockLotItem[] => {
      return calculateLotBalances(materials, transactions, plant, store);
    },
    [materials, transactions]
  );

  const getItemStock = useCallback((materialId: string): number => {
    return getCurrentStock(materialId, transactions);
  }, [transactions]);

  const getItemStatus = useCallback((materialId: string): string => {
    const mat = materials.find(m => m.id === materialId);
    if (!mat) return "NORMAL";
    const qty = getCurrentStock(materialId, transactions);
    return calculateStockStatus(mat, qty);
  }, [materials, transactions]);

  const getItemLastMove = useCallback((materialId: string): StockTransaction | undefined => {
    return getLastMovement(materialId, transactions);
  }, [transactions]);

  const addMaterial = (
    materialData: Omit<Material, 'id' | 'qrValue' | 'createdAt' | 'updatedAt'>,
    openingQty: number = 0
  ): { success: boolean; error?: string; material?: Material } => {
    const trimmedCode = materialData.materialCode.trim().toUpperCase();

    if (materials.some(m => m.materialCode.trim().toUpperCase() === trimmedCode)) {
      return { success: false, error: `Material Code "${trimmedCode}" already exists.` };
    }

    const now = new Date().toISOString();
    const newMaterialId = `mat-${Date.now()}`;
    const newMaterial: Material = {
      ...materialData,
      id: newMaterialId,
      materialCode: trimmedCode,
      qrValue: `MATERIAL:${trimmedCode}`,
      createdAt: now,
      updatedAt: now,
    };

    setMaterials(prev => [newMaterial, ...prev]);

    // Section 33 & 91: If Opening Quantity > 0, create OPENING transaction. If = 0, DO NOT create transaction.
    if (openingQty > 0) {
      const docNo = `OP-${now.slice(2, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;
      const openingTx: StockTransaction = {
        id: `tx-${Date.now()}`,
        documentNo: docNo,
        plant: newMaterial.plant,
        materialId: newMaterialId,
        materialCode: trimmedCode,
        transactionType: "OPENING",
        quantity: openingQty,
        balanceBefore: 0,
        balanceAfter: openingQty,
        pricePerUnit: newMaterial.standardPrice,
        totalPrice: openingQty * (newMaterial.standardPrice || 0),
        storageLocation: newMaterial.storageLocation,
        storageBin: newMaterial.storageBin,
        process: "Opening Balance",
        type: "Opening Balance",
        referenceNo: "SYS-INIT",
        comment: "Opening balance on material registration",
        createdBy: currentUser?.username || "Admin",
        createdAt: now,
      };

      setTransactions(prev => [openingTx, ...prev]);
    }

    return { success: true, material: newMaterial };
  };

  const updateMaterial = (
    id: string,
    updates: Partial<Omit<Material, 'id' | 'materialCode' | 'qrValue' | 'createdAt'>>
  ): { success: boolean; error?: string } => {
    const matIndex = materials.findIndex(m => m.id === id);
    if (matIndex === -1) {
      return { success: false, error: "Material not found" };
    }

    const now = new Date().toISOString();
    setMaterials(prev =>
      prev.map(m => (m.id === id ? { ...m, ...updates, updatedAt: now } : m))
    );

    return { success: true };
  };

  const deleteMaterial = (id: string): { success: boolean; error?: string } => {
    const mat = materials.find(m => m.id === id);
    if (!mat) return { success: false, error: "Material not found" };

    setMaterials(prev => prev.filter(m => m.id !== id));
    setTransactions(prev => prev.filter(t => t.materialId !== id));
    return { success: true };
  };

  const createGoodsReceipt = (data: {
    materialId: string;
    quantity: number;
    pricePerUnit?: number;
    batchNo?: string;
    lotNo?: string;
    expiryDate?: string;
    receivedDate?: string;
    type?: string;
    supplier?: string;
    storageLocation?: string;
    storageBin?: string;
    referenceNo?: string;
    comment?: string;
    process?: string;
  }): { success: boolean; error?: string; transaction?: StockTransaction; document?: TransactionDocument } => {
    const mat = materials.find(m => m.id === data.materialId);
    if (!mat) return { success: false, error: "Material not found" };
    if (data.quantity <= 0) return { success: false, error: "Quantity must be greater than 0" };

    const currentStock = getCurrentStock(mat.id, transactions);
    const balanceAfter = currentStock + data.quantity;
    const now = new Date().toISOString();
    const docNo = generateNextGrNumber(transactionDocuments, transactions);
    const docId = `doc-gr-${Date.now()}`;
    const price = data.pricePerUnit !== undefined ? data.pricePerUnit : (mat.standardPrice || 0);
    const lineTotal = data.quantity * (price || 0);

    const grTx: StockTransaction = {
      id: `tx-gr-${Date.now()}`,
      documentId: docId,
      documentNo: docNo,
      transactionNumber: docNo,
      plant: mat.plant,
      materialId: mat.id,
      materialCode: mat.materialCode,
      description: mat.description,
      source: "ITEM_LEVEL",
      transactionType: "GR",
      quantity: data.quantity,
      balanceBefore: currentStock,
      balanceAfter: balanceAfter,
      pricePerUnit: price,
      price: price,
      totalPrice: lineTotal,
      storageLocation: data.storageLocation || mat.storageLocation,
      storageBin: data.storageBin || mat.storageBin,
      batchNo: data.batchNo,
      batchNumber: data.batchNo,
      lotNo: data.lotNo,
      lot: data.lotNo,
      expiryDate: data.expiryDate,
      receivedDate: data.receivedDate || now.slice(0, 10),
      type: data.type || "Adjust Stock",
      supplier: data.supplier,
      process: data.process || "Stock Balance > GR",
      referenceNo: data.referenceNo,
      referenceNumber: data.referenceNo,
      comment: data.comment,
      createdBy: currentUser?.username || "Admin",
      createdAt: now,
    };

    const newDoc: TransactionDocument = {
      id: docId,
      transactionNumber: docNo,
      transactionType: "GR",
      plant: mat.plant,
      referenceNumber: data.referenceNo,
      createdDateTime: now,
      createdBy: currentUser?.username || "Admin",
      comment: data.comment,
      status: "COMPLETED",
      items: [
        {
          id: `item-gr-${Date.now()}`,
          materialId: mat.id,
          materialCode: mat.materialCode,
          description: mat.description,
          lot: data.lotNo,
          batchNumber: data.batchNo,
          expiryDate: data.expiryDate,
          receivedDate: data.receivedDate || now.slice(0, 10),
          quantity: data.quantity,
          price: price,
          type: data.type || "Adjust Stock",
          supplier: data.supplier,
          comment: data.comment,
          storageLocation: data.storageLocation || mat.storageLocation,
          storageBin: data.storageBin || mat.storageBin,
          unit: mat.unit,
          totalPrice: lineTotal,
        },
      ],
      totalQuantity: data.quantity,
      totalValue: lineTotal,
    };

    setTransactions(prev => [grTx, ...prev]);
    setTransactionDocuments(prev => [newDoc, ...prev]);
    return { success: true, transaction: grTx, document: newDoc };
  };

  const createGoodsIssue = (data: {
    materialId: string;
    quantity: number;
    pricePerUnit?: number;
    batchNo?: string;
    lotNo?: string;
    type?: string;
    supplier?: string;
    storageLocation?: string;
    storageBin?: string;
    picklist?: string;
    process?: string;
    referenceNo?: string;
    comment?: string;
  }): { success: boolean; error?: string; transaction?: StockTransaction; document?: TransactionDocument } => {
    const mat = materials.find(m => m.id === data.materialId);
    if (!mat) return { success: false, error: "Material not found" };
    if (data.quantity <= 0) return { success: false, error: "Quantity must be greater than 0" };

    const currentStock = getCurrentStock(mat.id, transactions);
    if (data.quantity > currentStock) {
      return {
        success: false,
        error: `Insufficient Stock. Available: ${currentStock} ${mat.unit}, Requested: ${data.quantity} ${mat.unit}`,
      };
    }

    if (data.picklist && data.picklist.trim()) {
      if (checkDuplicatePicklist(data.picklist, transactionDocuments, transactions)) {
        return {
          success: false,
          error: 'PickList number already exists in the system.',
        };
      }
    }

    const balanceAfter = currentStock - data.quantity;
    const now = new Date().toISOString();
    const docNo = generateNextGiNumber(transactionDocuments, transactions);
    const docId = `doc-gi-${Date.now()}`;
    const price = data.pricePerUnit !== undefined ? data.pricePerUnit : (mat.standardPrice || 0);
    const lineTotal = data.quantity * (price || 0);

    const giTx: StockTransaction = {
      id: `tx-gi-${Date.now()}`,
      documentId: docId,
      documentNo: docNo,
      transactionNumber: docNo,
      plant: mat.plant,
      materialId: mat.id,
      materialCode: mat.materialCode,
      description: mat.description,
      source: "ITEM_LEVEL",
      transactionType: "GI",
      quantity: -data.quantity, // Negative for Goods Issue movement
      balanceBefore: currentStock,
      balanceAfter: balanceAfter,
      pricePerUnit: price,
      price: price,
      totalPrice: lineTotal,
      storageLocation: data.storageLocation || mat.storageLocation,
      storageBin: data.storageBin || mat.storageBin,
      batchNo: data.batchNo,
      batchNumber: data.batchNo,
      lotNo: data.lotNo,
      lot: data.lotNo,
      type: data.type || "Adjust Stock",
      supplier: data.supplier,
      picklist: data.picklist,
      process: data.process || "Stock Balance > GI",
      referenceNo: data.referenceNo,
      referenceNumber: data.referenceNo,
      comment: data.comment,
      createdBy: currentUser?.username || "Admin",
      createdAt: now,
    };

    const newDoc: TransactionDocument = {
      id: docId,
      transactionNumber: docNo,
      transactionType: "GI",
      plant: mat.plant,
      referenceNumber: data.referenceNo,
      createdDateTime: now,
      createdBy: currentUser?.username || "Admin",
      comment: data.comment,
      status: "COMPLETED",
      items: [
        {
          id: `item-gi-${Date.now()}`,
          materialId: mat.id,
          materialCode: mat.materialCode,
          description: mat.description,
          lot: data.lotNo,
          batchNumber: data.batchNo,
          quantity: data.quantity, // Positive line quantity
          price: price,
          type: data.type || "Adjust Stock",
          supplier: data.supplier,
          comment: data.comment,
          storageLocation: data.storageLocation || mat.storageLocation,
          storageBin: data.storageBin || mat.storageBin,
          unit: mat.unit,
          totalPrice: lineTotal,
        },
      ],
      totalQuantity: data.quantity,
      totalValue: lineTotal,
    };

    setTransactions(prev => [giTx, ...prev]);
    setTransactionDocuments(prev => [newDoc, ...prev]);
    return { success: true, transaction: giTx, document: newDoc };
  };

  const createStockAdjustment = (data: {
    materialId: string;
    adjustmentType: 'INCREASE' | 'DECREASE' | 'SET_ACTUAL';
    quantity: number;
    reason: string;
    comment?: string;
  }): { success: boolean; error?: string; transaction?: StockTransaction } => {
    const mat = materials.find(m => m.id === data.materialId);
    if (!mat) return { success: false, error: "Material not found" };

    const currentStock = getCurrentStock(mat.id, transactions);
    let delta = 0;
    let balanceAfter = currentStock;

    if (data.adjustmentType === 'INCREASE') {
      if (data.quantity <= 0) return { success: false, error: "Increase quantity must be greater than 0" };
      delta = data.quantity;
      balanceAfter = currentStock + delta;
    } else if (data.adjustmentType === 'DECREASE') {
      if (data.quantity <= 0) return { success: false, error: "Decrease quantity must be greater than 0" };
      delta = -data.quantity;
      balanceAfter = Math.max(0, currentStock + delta);
    } else if (data.adjustmentType === 'SET_ACTUAL') {
      if (data.quantity < 0) return { success: false, error: "Actual quantity cannot be negative" };
      delta = data.quantity - currentStock;
      balanceAfter = data.quantity;
    }

    const now = new Date().toISOString();
    const docNo = `ADJ-${now.slice(2, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;

    const adjTx: StockTransaction = {
      id: `tx-adj-${Date.now()}`,
      documentNo: docNo,
      plant: mat.plant,
      materialId: mat.id,
      materialCode: mat.materialCode,
      transactionType: "ADJUSTMENT",
      quantity: delta,
      balanceBefore: currentStock,
      balanceAfter: balanceAfter,
      pricePerUnit: mat.standardPrice,
      totalPrice: Math.abs(delta) * (mat.standardPrice || 0),
      storageLocation: mat.storageLocation,
      storageBin: mat.storageBin,
      process: "Adjustment",
      type: data.reason,
      comment: data.comment,
      createdBy: currentUser?.username || "Admin",
      createdAt: now,
    };

    setTransactions(prev => [adjTx, ...prev]);
    return { success: true, transaction: adjTx };
  };

  const createDocumentGoodsReceipt = (docData: {
    plant: string;
    referenceNumber?: string;
    prId?: string;
    comment?: string;
    items: Omit<TransactionItem, 'id'>[];
  }): { success: boolean; error?: string; document?: TransactionDocument } => {
    if (!docData.items || docData.items.length === 0) {
      return { success: false, error: 'GR document must contain at least 1 item line.' };
    }

    if (docData.prId && docData.prId.trim()) {
      if (checkDuplicatePrId(docData.prId, transactionDocuments, transactions)) {
        return { success: false, error: 'PR ID already exists in the system.' };
      }
    }

    const now = new Date().toISOString();
    const grNumber = generateNextGrNumber(transactionDocuments, transactions);
    const docId = `doc-gr-${Date.now()}`;

    const generatedItems: TransactionItem[] = [];
    const generatedMovements: StockTransaction[] = [];

    let totalQty = 0;
    let totalVal = 0;
    let runningTx = [...transactions];

    for (let i = 0; i < docData.items.length; i++) {
      const item = docData.items[i];
      const mat = materials.find(m => m.id === item.materialId || m.materialCode === item.materialCode);
      if (!mat) {
        return { success: false, error: `Material not found: ${item.materialCode}` };
      }
      if (item.quantity <= 0) {
        return { success: false, error: `Quantity must be greater than 0 for ${item.materialCode}` };
      }

      const currentStock = getCurrentStock(mat.id, runningTx);
      const balanceAfter = currentStock + item.quantity;
      const price = item.price !== undefined ? item.price : (mat.standardPrice || 0);
      const lineTotal = item.quantity * price;

      totalQty += item.quantity;
      totalVal += lineTotal;

      const itemId = `item-gr-${Date.now()}-${i}`;
      const transItem: TransactionItem = {
        ...item,
        id: itemId,
        materialId: mat.id,
        materialCode: mat.materialCode,
        description: item.description || mat.description,
        price,
        totalPrice: lineTotal,
        storageLocation: item.storageLocation || mat.storageLocation,
        storageBin: item.storageBin || mat.storageBin,
        unit: mat.unit,
      };
      generatedItems.push(transItem);

      const movementTx: StockTransaction = {
        id: `tx-gr-${Date.now()}-${i}`,
        documentId: docId,
        documentNo: grNumber,
        transactionNumber: grNumber,
        plant: docData.plant || mat.plant,
        materialId: mat.id,
        materialCode: mat.materialCode,
        description: mat.description,
        source: 'DOCUMENT_LEVEL',
        transactionType: 'GR',
        quantity: item.quantity,
        balanceBefore: currentStock,
        balanceAfter: balanceAfter,
        pricePerUnit: price,
        price: price,
        totalPrice: lineTotal,
        storageLocation: transItem.storageLocation,
        storageBin: transItem.storageBin,
        batchNo: item.batchNumber,
        batchNumber: item.batchNumber,
        lotNo: item.lot,
        lot: item.lot,
        type: item.type || 'Adjust Stock',
        supplier: item.supplier,
        process: 'Transaction > GR',
        referenceNo: docData.referenceNumber,
        referenceNumber: docData.referenceNumber,
        comment: item.comment || docData.comment,
        createdBy: currentUser?.username || 'Admin',
        createdAt: now,
      };

      generatedMovements.push(movementTx);
      runningTx = [movementTx, ...runningTx];
    }

    const newDoc: TransactionDocument = {
      id: docId,
      transactionNumber: grNumber,
      transactionType: 'GR',
      plant: docData.plant,
      referenceNumber: docData.referenceNumber,
      prId: docData.prId,
      createdDateTime: now,
      createdBy: currentUser?.username || 'Admin',
      comment: docData.comment,
      status: 'COMPLETED',
      items: generatedItems,
      totalQuantity: totalQty,
      totalValue: totalVal,
    };

    setTransactions(prev => [...generatedMovements, ...prev]);
    setTransactionDocuments(prev => [newDoc, ...prev]);

    return { success: true, document: newDoc };
  };

  const createDocumentGoodsIssue = (docData: {
    plant: string;
    referenceNumber?: string;
    picklist?: string;
    comment?: string;
    items: Omit<TransactionItem, 'id'>[];
  }): { success: boolean; error?: string; document?: TransactionDocument } => {
    if (!docData.items || docData.items.length === 0) {
      return { success: false, error: 'GI document must contain at least 1 item line.' };
    }

    if (docData.picklist && docData.picklist.trim()) {
      if (checkDuplicatePicklist(docData.picklist, transactionDocuments, transactions)) {
        return { success: false, error: 'PickList number already exists in the system.' };
      }
    }

    // Pre-validate all item lines against available stock
    for (const item of docData.items) {
      const mat = materials.find(m => m.id === item.materialId || m.materialCode === item.materialCode);
      if (!mat) {
        return { success: false, error: `Material not found: ${item.materialCode}` };
      }
      if (item.quantity <= 0) {
        return { success: false, error: `Quantity must be greater than 0 for ${item.materialCode}` };
      }
      const currentStock = getCurrentStock(mat.id, transactions);
      if (item.quantity > currentStock) {
        return {
          success: false,
          error: `Insufficient Stock for Material ${mat.materialCode}: Available: ${currentStock} ${mat.unit}, Requested: ${item.quantity} ${mat.unit}`,
        };
      }
    }

    const now = new Date().toISOString();
    const giNumber = generateNextGiNumber(transactionDocuments, transactions);
    const docId = `doc-gi-${Date.now()}`;

    const generatedItems: TransactionItem[] = [];
    const generatedMovements: StockTransaction[] = [];

    let totalQty = 0;
    let totalVal = 0;
    let runningTx = [...transactions];

    for (let i = 0; i < docData.items.length; i++) {
      const item = docData.items[i];
      const mat = materials.find(m => m.id === item.materialId || m.materialCode === item.materialCode)!;
      const currentStock = getCurrentStock(mat.id, runningTx);
      const balanceAfter = currentStock - item.quantity;
      const price = item.price !== undefined ? item.price : (mat.standardPrice || 0);
      const lineTotal = item.quantity * price;

      totalQty += item.quantity;
      totalVal += lineTotal;

      const itemId = `item-gi-${Date.now()}-${i}`;
      const transItem: TransactionItem = {
        ...item,
        id: itemId,
        materialId: mat.id,
        materialCode: mat.materialCode,
        description: item.description || mat.description,
        price,
        totalPrice: lineTotal,
        storageLocation: item.storageLocation || mat.storageLocation,
        storageBin: item.storageBin || mat.storageBin,
        unit: mat.unit,
      };
      generatedItems.push(transItem);

      const movementTx: StockTransaction = {
        id: `tx-gi-${Date.now()}-${i}`,
        documentId: docId,
        documentNo: giNumber,
        transactionNumber: giNumber,
        plant: docData.plant || mat.plant,
        materialId: mat.id,
        materialCode: mat.materialCode,
        description: mat.description,
        source: 'DOCUMENT_LEVEL',
        transactionType: 'GI',
        quantity: -item.quantity, // Negative for GI movement
        balanceBefore: currentStock,
        balanceAfter: balanceAfter,
        pricePerUnit: price,
        price: price,
        totalPrice: lineTotal,
        storageLocation: transItem.storageLocation,
        storageBin: transItem.storageBin,
        batchNo: item.batchNumber,
        batchNumber: item.batchNumber,
        lotNo: item.lot,
        lot: item.lot,
        type: item.type || 'Adjust Stock',
        supplier: item.supplier,
        picklist: docData.picklist,
        process: 'Transaction > GI',
        referenceNo: docData.referenceNumber,
        referenceNumber: docData.referenceNumber,
        comment: item.comment || docData.comment,
        createdBy: currentUser?.username || 'Admin',
        createdAt: now,
      };

      generatedMovements.push(movementTx);
      runningTx = [movementTx, ...runningTx];
    }

    const newDoc: TransactionDocument = {
      id: docId,
      transactionNumber: giNumber,
      transactionType: 'GI',
      plant: docData.plant,
      referenceNumber: docData.referenceNumber,
      picklist: docData.picklist,
      createdDateTime: now,
      createdBy: currentUser?.username || 'Admin',
      comment: docData.comment,
      status: 'COMPLETED',
      items: generatedItems,
      totalQuantity: totalQty,
      totalValue: totalVal,
    };

    setTransactions(prev => [...generatedMovements, ...prev]);
    setTransactionDocuments(prev => [newDoc, ...prev]);

    return { success: true, document: newDoc };
  };

  // Material Request & Purchase Requisition Handlers
  const createMaterialRequest = (
    reqData: Omit<MaterialRequest, 'id' | 'requestNo' | 'status' | 'createdAt' | 'updatedAt' | 'timeline'>
  ): { success: boolean; error?: string; request?: MaterialRequest } => {
    if (!reqData.items || reqData.items.length === 0) {
      return { success: false, error: 'Request must contain at least 1 item.' };
    }

    const reqType = reqData.requestType || 'MATERIAL_REQUEST';
    const now = new Date().toISOString();
    const reqNo =
      reqType === 'PURCHASE_REQUISITION'
        ? generateNextPrNumber(materialRequests)
        : generateNextMrNumber(materialRequests);
    const id = `req-${Date.now()}`;

    const actionTitle =
      reqType === 'PURCHASE_REQUISITION'
        ? 'Purchase Requisition Created'
        : 'Material Request Created';

    const comments =
      reqType === 'PURCHASE_REQUISITION'
        ? `Created PR for ${reqData.items.length} items (${reqData.priority} priority). Routed to Store for review.`
        : `Created requisition for ${reqData.items.length} items (${reqData.priority} priority).`;

    const newRequest: MaterialRequest = {
      ...reqData,
      id,
      requestNo: reqNo,
      requestType: reqType,
      status: 'PENDING_APPROVAL',
      createdAt: now,
      updatedAt: now,
      items: reqData.items.map(it => ({
        ...it,
        issuedQuantity: it.issuedQuantity || 0,
      })),
      timeline: [
        {
          id: `tl-${Date.now()}`,
          status: 'PENDING_APPROVAL',
          actionTitle,
          actorName: reqData.requesterName || currentUser?.fullName || currentUser?.username || 'User',
          actorRole: currentUser?.roleName || 'Requester',
          timestamp: now,
          comments,
        },
      ],
    };

    setMaterialRequests(prev => [newRequest, ...prev]);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('zycoda-new-request', { detail: newRequest }));
    }
    return { success: true, request: newRequest };
  };

  const approveMaterialRequest = (
    id: string,
    comments?: string
  ): { success: boolean; error?: string } => {
    const target = materialRequests.find(r => r.id === id);
    if (!target) return { success: false, error: 'Request not found' };

    const now = new Date().toISOString();
    const actorName = currentUser?.fullName || currentUser?.username || 'Manager';
    const actorRole = currentUser?.roleName || 'Approver';

    const updated: MaterialRequest = {
      ...target,
      status: 'STORE_REVIEW',
      approverName: actorName,
      approvedAt: now,
      updatedAt: now,
      timeline: [
        {
          id: `tl-${Date.now()}`,
          status: 'STORE_REVIEW',
          actionTitle: 'Request Approved',
          actorName,
          actorRole,
          timestamp: now,
          comments: comments || 'Approved requisition and forwarded to Store for review.',
        },
        ...target.timeline,
      ],
    };

    setMaterialRequests(prev => prev.map(r => (r.id === id ? updated : r)));
    return { success: true };
  };

  const storeReviewPass = (
    id: string,
    comments?: string
  ): { success: boolean; error?: string } => {
    const target = materialRequests.find(r => r.id === id);
    if (!target) return { success: false, error: 'Request not found' };

    const now = new Date().toISOString();
    const actorName = currentUser?.fullName || currentUser?.username || 'Store Staff';
    const actorRole = currentUser?.roleName || 'Store';

    const updated: MaterialRequest = {
      ...target,
      status: 'APPROVED',
      storeReviewerName: actorName,
      storeReviewedAt: now,
      updatedAt: now,
      timeline: [
        {
          id: `tl-${Date.now()}`,
          status: 'APPROVED',
          actionTitle: 'Store Review Passed',
          actorName,
          actorRole,
          timestamp: now,
          comments: comments || 'Store stock verified and ready for goods issue.',
        },
        ...target.timeline,
      ],
    };

    setMaterialRequests(prev => prev.map(r => (r.id === id ? updated : r)));
    return { success: true };
  };

  const rejectMaterialRequest = (
    id: string,
    reason: string
  ): { success: boolean; error?: string } => {
    const target = materialRequests.find(r => r.id === id);
    if (!target) return { success: false, error: 'Request not found' };
    if (!reason.trim()) return { success: false, error: 'Rejection reason is required' };

    const now = new Date().toISOString();
    const actorName = currentUser?.fullName || currentUser?.username || 'Approver';
    const actorRole = currentUser?.roleName || 'Staff';

    const updated: MaterialRequest = {
      ...target,
      status: 'REJECTED',
      rejectedAt: now,
      rejectionReason: reason,
      updatedAt: now,
      timeline: [
        {
          id: `tl-${Date.now()}`,
          status: 'REJECTED',
          actionTitle: target.requestType === 'PURCHASE_REQUISITION' ? 'PR Rejected' : 'Request Rejected',
          actorName,
          actorRole,
          timestamp: now,
          comments: reason,
        },
        ...target.timeline,
      ],
    };

    setMaterialRequests(prev => prev.map(r => (r.id === id ? updated : r)));
    return { success: true };
  };

  const proceedPurchaseRequisition = (
    id: string,
    notes?: string
  ): { success: boolean; error?: string } => {
    const target = materialRequests.find(r => r.id === id);
    if (!target) return { success: false, error: 'Request not found' };

    const now = new Date().toISOString();
    const actorName = currentUser?.fullName || currentUser?.username || 'Store Staff';
    const actorRole = currentUser?.roleName || 'Store';

    const updated: MaterialRequest = {
      ...target,
      status: 'PROCEEDED_PURCHASING',
      storeReviewerName: actorName,
      storeReviewedAt: now,
      storeProceedNotes: notes,
      updatedAt: now,
      timeline: [
        {
          id: `tl-${Date.now()}`,
          status: 'PROCEEDED_PURCHASING',
          actionTitle: 'Store Reviewed & Proceeded to Purchasing',
          actorName,
          actorRole,
          timestamp: now,
          comments:
            notes ||
            'Store stock and alternatives evaluated. Verified purchasing necessity and proceeded to Purchasing process.',
        },
        ...target.timeline,
      ],
    };

    setMaterialRequests(prev => prev.map(r => (r.id === id ? updated : r)));
    return { success: true };
  };

  const convertPrToMaterialRequest = (
    id: string,
    notes?: string
  ): { success: boolean; error?: string } => {
    const target = materialRequests.find(r => r.id === id);
    if (!target) return { success: false, error: 'Request not found' };

    const now = new Date().toISOString();
    const actorName = currentUser?.fullName || currentUser?.username || 'Store Staff';
    const actorRole = currentUser?.roleName || 'Store';

    const updated: MaterialRequest = {
      ...target,
      requestType: 'MATERIAL_REQUEST',
      status: 'APPROVED',
      storeReviewerName: actorName,
      storeReviewedAt: now,
      storeProceedNotes: notes || 'PR converted to Material Request by Store after stock verification.',
      updatedAt: now,
      timeline: [
        {
          id: `tl-${Date.now()}`,
          status: 'APPROVED',
          actionTitle: 'PR Redirected & Converted to Material Request',
          actorName,
          actorRole,
          timestamp: now,
          comments:
            notes ||
            'Stock availability confirmed. Converted PR into an approved Material Request for stock issuance.',
        },
        ...target.timeline,
      ],
    };

    setMaterialRequests(prev => prev.map(r => (r.id === id ? updated : r)));
    return { success: true };
  };

  const issueMaterialRequest = (
    id: string,
    itemIssues?: ItemIssueSpec[],
    notes?: string
  ): { success: boolean; error?: string; document?: TransactionDocument } => {
    const target = materialRequests.find(r => r.id === id);
    if (!target) return { success: false, error: 'Request not found' };

    // Build list of items to issue, accommodating multiple lot allocations per item
    const giItems: Omit<TransactionItem, 'id'>[] = [];
    const itemIssuedAmounts: Record<string, number> = {};

    for (const it of target.items) {
      const alreadyIssued = it.issuedQuantity || 0;
      const remaining = Math.max(0, it.requestedQuantity - alreadyIssued);

      const spec = itemIssues?.find(s => s.itemId === it.id);
      const toIssue = spec ? Math.max(0, spec.issueQuantity) : remaining;

      if (toIssue <= 0) continue;

      if (toIssue > remaining) {
        return {
          success: false,
          error: `Issue quantity (${toIssue} ${it.unit}) cannot exceed remaining requested quantity (${remaining} ${it.unit}) for ${it.materialCode}.`,
        };
      }

      // Find the material
      const targetMatId = spec?.materialId || it.materialId;
      const mat = materials.find(m => m.id === targetMatId || m.materialCode === it.materialCode) || {
        id: it.materialId,
        materialCode: it.materialCode,
        description: it.description,
        standardPrice: it.pricePerUnit,
        unit: it.unit,
        plant: target.plant,
        storageLocation: it.storageLocation,
        storageBin: it.storageBin,
      };

      if (spec?.lotAllocations && spec.lotAllocations.length > 0) {
        const totalAllocated = spec.lotAllocations.reduce((sum, a) => sum + Math.max(0, a.quantity), 0);
        if (totalAllocated <= 0) continue;

        if (totalAllocated > toIssue) {
          return {
            success: false,
            error: `Total lot allocated quantity (${totalAllocated}) cannot exceed intended issue quantity (${toIssue}) for ${it.materialCode}.`,
          };
        }

        for (const alloc of spec.lotAllocations) {
          if (alloc.quantity <= 0) continue;
          giItems.push({
            materialId: mat.id,
            materialCode: mat.materialCode,
            description: mat.description,
            quantity: alloc.quantity,
            price: mat.standardPrice || it.pricePerUnit,
            totalPrice: alloc.quantity * (mat.standardPrice || it.pricePerUnit),
            lot: alloc.lot,
            batchNumber: alloc.batchNumber || alloc.lot,
            storageLocation: alloc.storageLocation || it.storageLocation || mat.storageLocation || 'MAIN',
            storageBin: alloc.storageBin || it.storageBin || mat.storageBin || 'BIN-01',
            comment: it.remarks,
            unit: mat.unit || it.unit,
          });
        }
        itemIssuedAmounts[it.id] = totalAllocated;
      } else {
        const available = getCurrentStock(mat.id, transactions);
        if (toIssue > available) {
          return {
            success: false,
            error: `Insufficient available stock for ${it.materialCode}. Available: ${available} ${it.unit}, Trying to issue: ${toIssue} ${it.unit}.`,
          };
        }

        giItems.push({
          materialId: mat.id,
          materialCode: mat.materialCode,
          description: mat.description,
          quantity: toIssue,
          price: mat.standardPrice || it.pricePerUnit,
          totalPrice: toIssue * (mat.standardPrice || it.pricePerUnit),
          lot: it.lot,
          batchNumber: it.batchNumber,
          storageLocation: it.storageLocation || mat.storageLocation || 'MAIN',
          storageBin: it.storageBin || mat.storageBin || 'BIN-01',
          comment: it.remarks,
          unit: it.unit,
        });
        itemIssuedAmounts[it.id] = toIssue;
      }
    }

    if (giItems.length === 0) {
      return { success: false, error: 'No items or quantities to issue.' };
    }

    // Execute Goods Issue document creation
    const giDocResult = createDocumentGoodsIssue({
      plant: target.plant,
      referenceNumber: target.requestNo,
      picklist: target.jobOrderNo || target.workOrderNo || target.requestNo,
      comment: notes || `Material Request Issuance (${target.requestNo}): ${target.purpose}`,
      items: giItems,
    });

    if (!giDocResult.success || !giDocResult.document) {
      return { success: false, error: giDocResult.error || 'Failed to issue goods' };
    }

    const now = new Date().toISOString();
    const actorName = currentUser?.fullName || currentUser?.username || 'Store Staff';
    const actorRole = currentUser?.roleName || 'Store';
    const giNumber = giDocResult.document.transactionNumber;

    // Update item issued quantities
    const updatedItems = target.items.map(it => {
      const newlyIssued = itemIssuedAmounts[it.id] || 0;
      return {
        ...it,
        issuedQuantity: (it.issuedQuantity || 0) + newlyIssued,
      };
    });

    const isFullyIssued = updatedItems.every(
      it => (it.issuedQuantity || 0) >= it.requestedQuantity
    );
    const newStatus: MaterialRequestStatus = isFullyIssued ? 'ISSUED' : 'PARTIALLY_ISSUED';
    const actionTitle = isFullyIssued
      ? `Goods Fully Issued (${giNumber})`
      : `Goods Partially Issued (${giNumber})`;

    const updated: MaterialRequest = {
      ...target,
      status: newStatus,
      issuedByName: actorName,
      issuedAt: now,
      linkedGiNumber: giNumber,
      updatedAt: now,
      items: updatedItems,
      timeline: [
        {
          id: `tl-${Date.now()}`,
          status: newStatus,
          actionTitle,
          actorName,
          actorRole,
          timestamp: now,
          comments:
            notes ||
            `Issued items under Goods Issue Document ${giNumber}. Stock ledger and balances updated.`,
        },
        ...target.timeline,
      ],
    };

    setMaterialRequests(prev => prev.map(r => (r.id === id ? updated : r)));
    return { success: true, document: giDocResult.document };
  };

  const closeMaterialRequest = (
    id: string
  ): { success: boolean; error?: string } => {
    const target = materialRequests.find(r => r.id === id);
    if (!target) return { success: false, error: 'Request not found' };

    const now = new Date().toISOString();
    const actorName = currentUser?.fullName || currentUser?.username || 'Store Staff';
    const actorRole = currentUser?.roleName || 'Store';

    const updated: MaterialRequest = {
      ...target,
      status: 'CLOSED',
      closedAt: now,
      updatedAt: now,
      timeline: [
        {
          id: `tl-${Date.now()}`,
          status: 'CLOSED',
          actionTitle: 'Request Closed',
          actorName,
          actorRole,
          timestamp: now,
          comments: 'Requisition completed and closed.',
        },
        ...target.timeline,
      ],
    };

    setMaterialRequests(prev => prev.map(r => (r.id === id ? updated : r)));
    return { success: true };
  };

  // Cross-Store Transfer Handler with Lot Preservation (Internal Store Transfer within Same Plant)
  const transferMaterial = (data: {
    plant?: string;
    fromPlant?: string;
    fromStore: string;
    toPlant?: string;
    toStore: string;
    materialId: string;
    quantity: number;
    lot?: string;
    batchNumber?: string;
    reason?: string;
    comment?: string;
  }): { success: boolean; error?: string; transfer?: MaterialTransfer } => {
    const activePlant = data.plant || data.fromPlant || 'PLANT-01';
    const targetPlant = data.toPlant || activePlant;

    // RULE 1: Stock Transfer must NOT allow users to transfer materials across different Plants.
    if (activePlant !== targetPlant) {
      return {
        success: false,
        error: 'Inter-plant transfer is not permitted. Stock Transfer can only occur between stores within the same plant.',
      };
    }

    // RULE 4: Prevent Same Store Transfer
    if (data.fromStore === data.toStore) {
      return {
        success: false,
        error: 'Source Store and Destination Store cannot be the same.',
      };
    }

    const mat = materials.find(m => m.id === data.materialId);
    if (!mat) return { success: false, error: 'Material not found.' };

    if (data.quantity <= 0) {
      return { success: false, error: 'Transfer quantity must be greater than 0.' };
    }

    // Check available stock specifically in source plant and source store
    const lotBalances = getLotBalances(activePlant, data.fromStore);
    const matchingLots = lotBalances.filter(l => l.materialId === mat.id);
    let availableInSource = 0;
    let sourceLot = matchingLots.find(l => !data.lot || l.lot === data.lot);

    if (data.lot) {
      const specificLot = matchingLots.find(l => l.lot === data.lot);
      availableInSource = specificLot ? specificLot.quantity : 0;
      sourceLot = specificLot;
    } else {
      availableInSource = matchingLots.reduce((sum, l) => sum + l.quantity, 0);
      if (availableInSource === 0 && mat.plant === activePlant && mat.storageLocation === data.fromStore) {
        availableInSource = getCurrentStock(mat.id, transactions);
      }
    }

    if (data.quantity > availableInSource) {
      return {
        success: false,
        error: `Insufficient stock in ${activePlant} / ${data.fromStore}. Available: ${availableInSource} ${mat.unit}, Requested: ${data.quantity} ${mat.unit}`,
      };
    }

    const now = new Date().toISOString();
    const transferNo = generateNextTransferNumber(materialTransfers);
    const preservedLot = data.lot || sourceLot?.lot || 'LOT-2608-01';
    const preservedBatch = data.batchNumber || sourceLot?.batchNumber || 'B-2608';
    const actorName = currentUser?.fullName || currentUser?.username || 'Store Staff';

    const sourceCurrent = availableInSource;
    const price = mat.standardPrice || 0;

    // Calculate destination store balance before for accurate audit ledger
    const destLotBalances = getLotBalances(activePlant, data.toStore);
    const destLots = destLotBalances.filter(l => l.materialId === mat.id);
    const destBalanceBefore = data.lot
      ? (destLots.find(l => l.lot === preservedLot)?.quantity || 0)
      : destLots.reduce((sum, l) => sum + l.quantity, 0);

    // 1. Source Store Debit Tx (Outbound GI)
    const debitTx: StockTransaction = {
      id: `tx-tr-out-${Date.now()}`,
      documentNo: transferNo,
      transactionNumber: transferNo,
      referenceNo: transferNo,
      referenceNumber: transferNo,
      plant: activePlant,
      materialId: mat.id,
      materialCode: mat.materialCode,
      description: mat.description,
      source: 'Transfer',
      transactionType: 'GI',
      quantity: -data.quantity,
      balanceBefore: sourceCurrent,
      balanceAfter: Math.max(0, sourceCurrent - data.quantity),
      pricePerUnit: price,
      price,
      totalPrice: data.quantity * price,
      storageLocation: data.fromStore,
      storageBin: mat.storageBin,
      lotNo: preservedLot,
      lot: preservedLot,
      batchNo: preservedBatch,
      batchNumber: preservedBatch,
      process: 'Store Transfer (Outbound GI)',
      comment: `Transfer to ${data.toStore} (${activePlant}). Reason: ${data.reason || 'Store Rebalance'}. Note: ${data.comment || ''}`,
      fromStore: data.fromStore,
      toStore: data.toStore,
      transferRoute: `${data.fromStore} → ${data.toStore}`,
      transferFromBalanceBefore: sourceCurrent,
      transferFromBalanceAfter: Math.max(0, sourceCurrent - data.quantity),
      transferToBalanceBefore: destBalanceBefore,
      transferToBalanceAfter: destBalanceBefore + data.quantity,
      createdBy: actorName,
      createdAt: now,
    };

    // 2. Dest Store Credit Tx (Inbound GR) - preserves EXACT lot & batch identity
    const creditTx: StockTransaction = {
      id: `tx-tr-in-${Date.now()}`,
      documentNo: transferNo,
      transactionNumber: transferNo,
      referenceNo: transferNo,
      referenceNumber: transferNo,
      plant: activePlant,
      materialId: mat.id,
      materialCode: mat.materialCode,
      description: mat.description,
      source: 'Transfer',
      transactionType: 'GR',
      quantity: data.quantity,
      balanceBefore: destBalanceBefore,
      balanceAfter: destBalanceBefore + data.quantity,
      pricePerUnit: price,
      price,
      totalPrice: data.quantity * price,
      storageLocation: data.toStore,
      storageBin: mat.storageBin,
      lotNo: preservedLot,
      lot: preservedLot,
      batchNo: preservedBatch,
      batchNumber: preservedBatch,
      process: 'Store Transfer (Inbound GR)',
      comment: `Transferred from ${data.fromStore} (${activePlant}). Reason: ${data.reason || 'Store Rebalance'}. Note: ${data.comment || ''}`,
      fromStore: data.fromStore,
      toStore: data.toStore,
      transferRoute: `${data.fromStore} → ${data.toStore}`,
      transferFromBalanceBefore: sourceCurrent,
      transferFromBalanceAfter: Math.max(0, sourceCurrent - data.quantity),
      transferToBalanceBefore: destBalanceBefore,
      transferToBalanceAfter: destBalanceBefore + data.quantity,
      createdBy: actorName,
      createdAt: now,
    };

    // 3. New Transfer Document Record
    const newTransfer: MaterialTransfer = {
      id: `tr-${Date.now()}`,
      transferNumber: transferNo,
      fromPlant: activePlant,
      fromStore: data.fromStore,
      toPlant: activePlant,
      toStore: data.toStore,
      materialId: mat.id,
      materialCode: mat.materialCode,
      description: mat.description,
      quantity: data.quantity,
      unit: mat.unit,
      lot: preservedLot,
      batchNumber: preservedBatch,
      reason: data.reason,
      comment: data.comment,
      transferredBy: actorName,
      createdAt: now,
      status: 'COMPLETED',
    };

    // 4. Transaction Document for Ledger
    const newDoc: TransactionDocument = {
      id: `doc-tr-${Date.now()}`,
      transactionNumber: transferNo,
      transactionType: 'TRANSFER',
      plant: activePlant,
      referenceNumber: `TR:${data.fromStore}->${data.toStore}`,
      createdDateTime: now,
      createdBy: actorName,
      comment: data.comment || `Transfer ${data.fromStore} → ${data.toStore}`,
      status: 'COMPLETED',
      items: [
        {
          id: `item-tr-${Date.now()}`,
          materialId: mat.id,
          materialCode: mat.materialCode,
          description: mat.description,
          lot: preservedLot,
          batchNumber: preservedBatch,
          quantity: data.quantity,
          price: price,
          type: 'Store Transfer',
          storageLocation: `${data.fromStore} → ${data.toStore}`,
          unit: mat.unit,
          totalPrice: data.quantity * price,
        },
      ],
      totalQuantity: data.quantity,
      totalValue: data.quantity * price,
    };

    setTransactions(prev => [debitTx, creditTx, ...prev]);
    setMaterialTransfers(prev => [newTransfer, ...prev]);
    setTransactionDocuments(prev => [newDoc, ...prev]);

    return { success: true, transfer: newTransfer };
  };

  const resetStockDemoData = () => {
    setMaterials(INITIAL_MATERIALS);
    setTransactions(INITIAL_TRANSACTIONS);
    setTransactionDocuments(INITIAL_TRANSACTION_DOCUMENTS);
    setMaterialRequests(INITIAL_MATERIAL_REQUESTS);
    setMaterialTransfers(INITIAL_TRANSFERS);
    localStorage.setItem(MATERIALS_STORAGE_KEY, JSON.stringify(INITIAL_MATERIALS));
    localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(INITIAL_TRANSACTIONS));
    localStorage.setItem(DOCUMENTS_STORAGE_KEY, JSON.stringify(INITIAL_TRANSACTION_DOCUMENTS));
    localStorage.setItem(REQUESTS_STORAGE_KEY, JSON.stringify(INITIAL_MATERIAL_REQUESTS));
    localStorage.setItem(TRANSFERS_STORAGE_KEY, JSON.stringify(INITIAL_TRANSFERS));
    resetAuthData();
  };

  return (
    <StockContext.Provider
      value={{
        materials,
        transactions,
        transactionDocuments,
        materialRequests,
        materialTransfers,
        getLotBalances,
        addMaterial,
        updateMaterial,
        deleteMaterial,
        createGoodsReceipt,
        createGoodsIssue,
        createStockAdjustment,
        createDocumentGoodsReceipt,
        createDocumentGoodsIssue,
        createMaterialRequest,
        approveMaterialRequest,
        storeReviewPass,
        rejectMaterialRequest,
        proceedPurchaseRequisition,
        convertPrToMaterialRequest,
        issueMaterialRequest,
        closeMaterialRequest,
        transferMaterial,
        getItemStock,
        getItemStatus,
        getItemLastMove,
        resetStockDemoData,
      }}
    >
      {children}
    </StockContext.Provider>
  );
};

export const useStock = () => {
  const context = useContext(StockContext);
  if (!context) throw new Error('useStock must be used within a StockProvider');
  return context;
};
