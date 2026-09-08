import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Material, StockTransaction } from '../types/stock';
import { INITIAL_MATERIALS } from '../mock/materials';
import { INITIAL_TRANSACTIONS } from '../mock/transactions';
import { useAuth } from './AuthContext';
import { getCurrentStock, calculateStockStatus, getLastMovement } from '../utils/stockCalculation';

interface StockContextType {
  materials: Material[];
  transactions: StockTransaction[];
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
    storageLocation?: string;
    storageBin?: string;
    referenceNo?: string;
    comment?: string;
    process?: string;
  }) => { success: boolean; error?: string; transaction?: StockTransaction };
  createGoodsIssue: (data: {
    materialId: string;
    quantity: number;
    batchNo?: string;
    serialNo?: string;
    lotNo?: string;
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
  getItemStock: (materialId: string) => number;
  getItemStatus: (materialId: string) => string;
  getItemLastMove: (materialId: string) => StockTransaction | undefined;
  resetStockDemoData: () => void;
}

const StockContext = createContext<StockContextType | undefined>(undefined);

const MATERIALS_STORAGE_KEY = 'zycoda_materials_v1';
const TRANSACTIONS_STORAGE_KEY = 'zycoda_transactions_v1';

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

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem(MATERIALS_STORAGE_KEY, JSON.stringify(materials));
  }, [materials]);

  useEffect(() => {
    localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(transactions));
  }, [transactions]);

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
        process: "Initial Stock",
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

    const price = data.pricePerUnit !== undefined ? data.pricePerUnit : mat.standardPrice;

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
      process: data.process || "Goods Receipt",
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
    batchNo?: string;
    serialNo?: string;
    lotNo?: string;
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
      pricePerUnit: mat.standardPrice,
      totalPrice: data.quantity * (mat.standardPrice || 0),
      storageLocation: data.storageLocation || mat.storageLocation,
      storageBin: data.storageBin || mat.storageBin,
      batchNo: data.batchNo,
      serialNo: data.serialNo,
      lotNo: data.lotNo,
      picklist: data.picklist,
      process: data.process || "Goods Issue",
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
      process: data.reason,
      comment: data.comment,
      createdBy: currentUser?.username || "Admin",
      createdAt: now,
    };

    setTransactions(prev => [adjTx, ...prev]);
    return { success: true, transaction: adjTx };
  };

  const resetStockDemoData = () => {
    setMaterials(INITIAL_MATERIALS);
    setTransactions(INITIAL_TRANSACTIONS);
    localStorage.setItem(MATERIALS_STORAGE_KEY, JSON.stringify(INITIAL_MATERIALS));
    localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(INITIAL_TRANSACTIONS));
    resetAuthData();
  };

  return (
    <StockContext.Provider
      value={{
        materials,
        transactions,
        addMaterial,
        updateMaterial,
        deleteMaterial,
        createGoodsReceipt,
        createGoodsIssue,
        createStockAdjustment,
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
