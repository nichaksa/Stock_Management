import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Material, StockTransaction, TransactionDocument, TransactionItem } from '../types/stock';
import { INITIAL_MATERIALS } from '../mock/materials';
import { INITIAL_TRANSACTIONS } from '../mock/transactions';
import { INITIAL_TRANSACTION_DOCUMENTS } from '../mock/transactionDocuments';
import { useAuth } from './AuthContext';
import { getCurrentStock, calculateStockStatus, getLastMovement, checkDuplicatePrId, checkDuplicatePicklist } from '../utils/stockCalculation';

interface StockContextType {
  materials: Material[];
  transactions: StockTransaction[];
  transactionDocuments: TransactionDocument[];
  addMaterial: (material: Omit<Material, 'id' | 'qrValue' | 'createdAt' | 'updatedAt'>, openingQty: number) => { success: boolean; error?: string; material?: Material };
  updateMaterial: (id: string, updates: Partial<Omit<Material, 'id' | 'materialCode' | 'qrValue' | 'createdAt'>>) => { success: boolean; error?: string };
  deleteMaterial: (id: string) => { success: boolean; error?: string };
  createGoodsReceipt: (data: {
    materialId: string;
    quantity: number;
    pricePerUnit?: number;
    batchNo?: string;
    serialNo?: string;
    lotNo?: string;
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
    serialNo?: string;
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
  createStockAdjustment: (data: {
    materialId: string;
    adjustmentType: 'INCREASE' | 'DECREASE' | 'SET_ACTUAL';
    quantity: number;
    reason: string;
    comment?: string;
  }) => { success: boolean; error?: string; transaction?: StockTransaction };
  createDocumentGoodsReceipt: (docData: {
    plant: string;
    referenceNumber?: string;
    prId?: string;
    comment?: string;
    items: Omit<TransactionItem, 'id'>[];
  }) => { success: boolean; error?: string; document?: TransactionDocument };
  createDocumentGoodsIssue: (docData: {
    plant: string;
    referenceNumber?: string;
    picklist?: string;
    comment?: string;
    items: Omit<TransactionItem, 'id'>[];
  }) => { success: boolean; error?: string; document?: TransactionDocument };
  getItemStock: (materialId: string) => number;
  getItemStatus: (materialId: string) => string;
  getItemLastMove: (materialId: string) => StockTransaction | undefined;
  resetStockDemoData: () => void;
}

const StockContext = createContext<StockContextType | undefined>(undefined);

const MATERIALS_STORAGE_KEY = 'zycoda_materials_v1';
const TRANSACTIONS_STORAGE_KEY = 'zycoda_transactions_v1';
const DOCUMENTS_STORAGE_KEY = 'zycoda_documents_v1';

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
    serialNo?: string;
    lotNo?: string;
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
      serialNo: data.serialNo,
      serialNumber: data.serialNo,
      lotNo: data.lotNo,
      lot: data.lotNo,
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
          serialNumber: data.serialNo,
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
    serialNo?: string;
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
      serialNo: data.serialNo,
      serialNumber: data.serialNo,
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
          serialNumber: data.serialNo,
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
        serialNo: item.serialNumber,
        serialNumber: item.serialNumber,
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
        serialNo: item.serialNumber,
        serialNumber: item.serialNumber,
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

  const resetStockDemoData = () => {
    setMaterials(INITIAL_MATERIALS);
    setTransactions(INITIAL_TRANSACTIONS);
    setTransactionDocuments(INITIAL_TRANSACTION_DOCUMENTS);
    localStorage.setItem(MATERIALS_STORAGE_KEY, JSON.stringify(INITIAL_MATERIALS));
    localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(INITIAL_TRANSACTIONS));
    localStorage.setItem(DOCUMENTS_STORAGE_KEY, JSON.stringify(INITIAL_TRANSACTION_DOCUMENTS));
    resetAuthData();
  };

  return (
    <StockContext.Provider
      value={{
        materials,
        transactions,
        transactionDocuments,
        addMaterial,
        updateMaterial,
        deleteMaterial,
        createGoodsReceipt,
        createGoodsIssue,
        createStockAdjustment,
        createDocumentGoodsReceipt,
        createDocumentGoodsIssue,
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
