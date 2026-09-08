import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Material, StockTransaction, TransactionDocument, TransactionItem } from '../types/stock';
import { INITIAL_MATERIALS } from '../mock/materials';
import { INITIAL_TRANSACTIONS } from '../mock/transactions';
import { INITIAL_TRANSACTION_DOCUMENTS } from '../mock/transactionDocuments';
import { useAuth } from './AuthContext';
import { getCurrentStock, calculateStockStatus, getLastMovement } from '../utils/stockCalculation';

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
  }) => { success: boolean; error?: string; transaction?: StockTransaction };
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
  }) => { success: boolean; error?: string; transaction?: StockTransaction };
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
      return saved ? JSON.parse(saved) : INITIAL_TRANSACTIONS;
    } catch {
      return INITIAL_TRANSACTIONS;
    }
  });

  const [transactionDocuments, setTransactionDocuments] = useState<TransactionDocument[]>(() => {
    try {
      const saved = localStorage.getItem(DOCUMENTS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : INITIAL_TRANSACTION_DOCUMENTS;
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
  }): { success: boolean; error?: string; transaction?: StockTransaction } => {
    const mat = materials.find(m => m.id === data.materialId);
    if (!mat) return { success: false, error: "Material not found" };
    if (data.quantity <= 0) return { success: false, error: "Quantity must be greater than 0" };

    const currentStock = getCurrentStock(mat.id, transactions);
    const balanceAfter = currentStock + data.quantity;
    const now = new Date().toISOString();
    const docNo = `GR-${now.slice(2, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;

    const price = data.pricePerUnit !== undefined ? data.pricePerUnit : (mat.standardPrice || 0);

    const grTx: StockTransaction = {
      id: `tx-gr-${Date.now()}`,
      documentNo: docNo,
      plant: mat.plant,
      materialId: mat.id,
      materialCode: mat.materialCode,
      transactionType: "GR",
      quantity: data.quantity,
      balanceBefore: currentStock,
      balanceAfter: balanceAfter,
      pricePerUnit: price,
      totalPrice: data.quantity * (price || 0),
      storageLocation: data.storageLocation || mat.storageLocation,
      storageBin: data.storageBin || mat.storageBin,
      batchNo: data.batchNo,
      serialNo: data.serialNo,
      lotNo: data.lotNo,
      type: data.type || "Adjust Stock",
      supplier: data.supplier,
      process: data.process || "Stock Balance > GR",
      referenceNo: data.referenceNo,
      comment: data.comment,
      createdBy: currentUser?.username || "Admin",
      createdAt: now,
    };

    setTransactions(prev => [grTx, ...prev]);
    return { success: true, transaction: grTx };
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
  }): { success: boolean; error?: string; transaction?: StockTransaction } => {
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

    const balanceAfter = currentStock - data.quantity;
    const now = new Date().toISOString();
    const docNo = `GI-${now.slice(2, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;
    const price = data.pricePerUnit !== undefined ? data.pricePerUnit : (mat.standardPrice || 0);

    const giTx: StockTransaction = {
      id: `tx-gi-${Date.now()}`,
      documentNo: docNo,
      plant: mat.plant,
      materialId: mat.id,
      materialCode: mat.materialCode,
      transactionType: "GI",
      quantity: -data.quantity, // Negative for Goods Issue
      balanceBefore: currentStock,
      balanceAfter: balanceAfter,
      pricePerUnit: price,
      totalPrice: data.quantity * (price || 0),
      storageLocation: data.storageLocation || mat.storageLocation,
      storageBin: data.storageBin || mat.storageBin,
      batchNo: data.batchNo,
      serialNo: data.serialNo,
      lotNo: data.lotNo,
      type: data.type || "Adjust Stock",
      supplier: data.supplier,
      picklist: data.picklist,
      process: data.process || "Stock Balance > GI",
      referenceNo: data.referenceNo,
      comment: data.comment,
      createdBy: currentUser?.username || "Admin",
      createdAt: now,
    };

    setTransactions(prev => [giTx, ...prev]);
    return { success: true, transaction: giTx };
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

    const now = new Date().toISOString();
    const dateStr = now.slice(2, 10).replace(/-/g, '');
    const grNumber = `GR-${dateStr}-${Math.floor(100 + Math.random() * 900)}`;
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
        plant: docData.plant || mat.plant,
        materialId: mat.id,
        materialCode: mat.materialCode,
        transactionType: 'GR',
        quantity: item.quantity,
        balanceBefore: currentStock,
        balanceAfter: balanceAfter,
        pricePerUnit: price,
        totalPrice: lineTotal,
        storageLocation: transItem.storageLocation,
        storageBin: transItem.storageBin,
        batchNo: item.batchNumber,
        serialNo: item.serialNumber,
        lotNo: item.lot,
        type: item.type || 'Adjust Stock',
        supplier: item.supplier,
        process: 'Transaction > GR',
        referenceNo: docData.referenceNumber,
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
    const dateStr = now.slice(2, 10).replace(/-/g, '');
    const giNumber = `GI-${dateStr}-${Math.floor(100 + Math.random() * 900)}`;
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
        plant: docData.plant || mat.plant,
        materialId: mat.id,
        materialCode: mat.materialCode,
        transactionType: 'GI',
        quantity: -item.quantity, // Negative for GI movement
        balanceBefore: currentStock,
        balanceAfter: balanceAfter,
        pricePerUnit: price,
        totalPrice: lineTotal,
        storageLocation: transItem.storageLocation,
        storageBin: transItem.storageBin,
        batchNo: item.batchNumber,
        serialNo: item.serialNumber,
        lotNo: item.lot,
        type: item.type || 'Adjust Stock',
        supplier: item.supplier,
        picklist: docData.picklist,
        process: 'Transaction > GI',
        referenceNo: docData.referenceNumber,
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
