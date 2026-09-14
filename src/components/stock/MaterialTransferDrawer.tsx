import React, { useState, useEffect, useMemo } from 'react';
import { Material } from '../../types/stock';
import { useStock } from '../../context/StockContext';
import { useLanguage } from '../../context/LanguageContext';
import { ItemFinderModal } from './ItemFinderModal';
import { getCurrentStock } from '../../utils/stockCalculation';
import {
  X,
  ArrowRight,
  Package,
  Tag,
  Building2,
  AlertCircle,
  HelpCircle,
  Store,
  Search,
} from 'lucide-react';

import { getAllPlants, getStoresForPlant } from '../../utils/plantStoreMaster';

interface MaterialTransferDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedMaterial?: Material | null;
}

export const MaterialTransferDrawer: React.FC<MaterialTransferDrawerProps> = ({
  isOpen,
  onClose,
  preselectedMaterial,
}) => {
  const { transferMaterial, materials, transactions, getLotBalances } = useStock();
  const { t, language } = useLanguage();
  const isTh = language === 'th';

  // Plant is the single plant context where the transfer is taking place
  const [plant, setPlant] = useState('PLANT-01');
  const [fromStore, setFromStore] = useState('');
  const [toStore, setToStore] = useState('');

  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [selectedLot, setSelectedLot] = useState<string | undefined>(undefined);
  const [selectedBatch, setSelectedBatch] = useState<string | undefined>(undefined);
  const [availableStock, setAvailableStock] = useState<number>(0);

  const [transferQty, setTransferQty] = useState<string>('');
  const [reason, setReason] = useState('Store Rebalancing');
  const [comment, setComment] = useState('');

  const [isItemPickerOpen, setIsItemPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Destination Stores: From Store Master of selected Plant (Can include stores with 0 stock)
  const destinationStores = useMemo(() => {
    return getStoresForPlant(plant, materials).map(s => ({
      value: s.code,
      label: s.label || s.code,
    }));
  }, [plant, materials]);

  // 2. Source Stores: Derived strictly from actual current stock balance (> 0) for selected Material in selected Plant
  const availableSourceStores = useMemo(() => {
    if (!selectedMaterial) return [];
    
    // Get lots with positive balance for this material in this plant
    const plantLots = getLotBalances(plant).filter(
      l => (l.materialId === selectedMaterial.id || l.materialCode === selectedMaterial.materialCode) && l.quantity > 0
    );

    const storeMap = new Map<string, { storeCode: string; availableQty: number; unit: string; lots: typeof plantLots }>();
    
    plantLots.forEach(l => {
      const storeCode = l.store || l.storageLocation || 'MAIN';
      if (!storeMap.has(storeCode)) {
        storeMap.set(storeCode, {
          storeCode,
          availableQty: 0,
          unit: l.unit || selectedMaterial.unit || 'EA',
          lots: [],
        });
      }
      const entry = storeMap.get(storeCode)!;
      entry.availableQty += l.quantity;
      entry.lots.push(l);
    });

    return Array.from(storeMap.values()).filter(s => s.availableQty > 0);
  }, [selectedMaterial, plant, getLotBalances]);

  // 3. Source Lots: Lots with positive balance in the selected From Store
  const sourceLots = useMemo(() => {
    if (!selectedMaterial || !fromStore) return [];
    return getLotBalances(plant, fromStore).filter(
      l => (l.materialId === selectedMaterial.id || l.materialCode === selectedMaterial.materialCode) && l.quantity > 0
    );
  }, [selectedMaterial, plant, fromStore, getLotBalances]);

  // Handle preselected material when drawer opens
  useEffect(() => {
    if (preselectedMaterial) {
      setSelectedMaterial(preselectedMaterial);
      const targetPlant = preselectedMaterial.plant || 'PLANT-01';
      setPlant(targetPlant);

      // Compute available source stores for this material in target plant
      const plantLots = getLotBalances(targetPlant).filter(
        l => (l.materialId === preselectedMaterial.id || l.materialCode === preselectedMaterial.materialCode) && l.quantity > 0
      );

      const storeMap = new Map<string, number>();
      plantLots.forEach(l => {
        const s = l.store || l.storageLocation || 'MAIN';
        storeMap.set(s, (storeMap.get(s) || 0) + l.quantity);
      });

      const validSources = Array.from(storeMap.entries()).filter(([_, qty]) => qty > 0).map(([s]) => s);
      const chosenFrom = validSources.includes(preselectedMaterial.storageLocation || '')
        ? preselectedMaterial.storageLocation!
        : validSources[0] || '';

      setFromStore(chosenFrom);

      // Choose a destination store from the plant master different from fromStore
      const plantDestStores = getStoresForPlant(targetPlant, materials).map(s => s.code);
      const chosenTo = plantDestStores.find(s => s !== chosenFrom) || plantDestStores[0] || 'STORE-B';
      setToStore(chosenTo);
      setSelectedLot(undefined);
      setSelectedBatch(undefined);
      setTransferQty('');
      setError(null);
    }
  }, [preselectedMaterial, materials, getLotBalances]);

  // When selectedMaterial changes via ItemPicker
  const handleSelectMaterial = (material: Material) => {
    setSelectedMaterial(material);
    setSelectedLot(undefined);
    setSelectedBatch(undefined);
    setTransferQty('');
    setError(null);

    const targetPlant = material.plant || plant;
    setPlant(targetPlant);

    // Compute source stores with available stock for this material
    const plantLots = getLotBalances(targetPlant).filter(
      l => (l.materialId === material.id || l.materialCode === material.materialCode) && l.quantity > 0
    );

    const storeMap = new Map<string, number>();
    plantLots.forEach(l => {
      const s = l.store || l.storageLocation || 'MAIN';
      storeMap.set(s, (storeMap.get(s) || 0) + l.quantity);
    });

    const validSources = Array.from(storeMap.entries()).filter(([_, qty]) => qty > 0).map(([s]) => s);
    const chosenFrom = validSources.includes(material.storageLocation || '')
      ? material.storageLocation!
      : validSources[0] || '';

    setFromStore(chosenFrom);

    const plantDestStores = getStoresForPlant(targetPlant, materials).map(s => s.code);
    const chosenTo = plantDestStores.find(s => s !== chosenFrom) || plantDestStores[0] || 'STORE-B';
    setToStore(chosenTo);
  };

  // When plant changes, re-evaluate From Store (stock-based) and To Store (master-based)
  const handlePlantChange = (newPlant: string) => {
    setPlant(newPlant);
    setSelectedLot(undefined);
    setSelectedBatch(undefined);
    setTransferQty('');
    setError(null);

    const plantDestStores = getStoresForPlant(newPlant, materials).map(s => s.code);

    if (selectedMaterial) {
      const plantLots = getLotBalances(newPlant).filter(
        l => (l.materialId === selectedMaterial.id || l.materialCode === selectedMaterial.materialCode) && l.quantity > 0
      );

      const storeMap = new Map<string, number>();
      plantLots.forEach(l => {
        const s = l.store || l.storageLocation || 'MAIN';
        storeMap.set(s, (storeMap.get(s) || 0) + l.quantity);
      });

      const validSources = Array.from(storeMap.entries()).filter(([_, qty]) => qty > 0).map(([s]) => s);
      const chosenFrom = validSources[0] || '';
      setFromStore(chosenFrom);

      const chosenTo = plantDestStores.find(s => s !== chosenFrom) || plantDestStores[0] || 'STORE-B';
      setToStore(chosenTo);
    } else {
      setFromStore('');
      setToStore(plantDestStores[0] || 'STORE-B');
    }
  };

  // When From Store changes, update available lots and adjust To Store if it equals From Store
  const handleFromStoreChange = (newFrom: string) => {
    setFromStore(newFrom);
    setSelectedLot(undefined);
    setSelectedBatch(undefined);
    setTransferQty('');
    setError(null);

    if (toStore === newFrom) {
      const alt = destinationStores.find(s => s.value !== newFrom)?.value;
      if (alt) setToStore(alt);
    }
  };

  // Recalculate available stock in source store whenever material, lot, plant, or fromStore changes
  useEffect(() => {
    if (!selectedMaterial || !fromStore) {
      setAvailableStock(0);
      return;
    }

    const matchingLots = getLotBalances(plant, fromStore).filter(
      l => (l.materialId === selectedMaterial.id || l.materialCode === selectedMaterial.materialCode) && l.quantity > 0
    );

    if (selectedLot && selectedLot !== 'AUTO') {
      const specificLot = matchingLots.find(l => l.lot === selectedLot || l.lotNo === selectedLot);
      setAvailableStock(specificLot ? specificLot.quantity : 0);
    } else {
      const totalInStore = matchingLots.reduce((sum, l) => sum + l.quantity, 0);
      setAvailableStock(totalInStore);
    }
  }, [selectedMaterial, selectedLot, plant, fromStore, getLotBalances]);

  if (!isOpen) return null;

  const isSameStore = Boolean(fromStore && toStore && fromStore === toStore);
  const hasNoSourceStock = Boolean(selectedMaterial && availableSourceStores.length === 0);
  const qtyNumber = parseFloat(transferQty);
  const isQtyExceeded = !isNaN(qtyNumber) && qtyNumber > availableStock;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedMaterial) {
      setError(isTh ? 'กรุณาเลือกพัสดุที่ต้องการโอนย้าย' : 'Please select a material to transfer.');
      return;
    }

    if (!fromStore) {
      setError(
        isTh
          ? 'ไม่พบคลังต้นทางที่มีสต็อกคงเหลือสำหรับพัสดุนี้'
          : 'No source store with available stock is selected.'
      );
      return;
    }

    if (!toStore) {
      setError(isTh ? 'กรุณาเลือกคลังปลายทาง' : 'Please select a destination store.');
      return;
    }

    // Prevent Same Store Transfer
    if (fromStore === toStore) {
      setError(
        isTh
          ? 'คลังต้นทางและคลังปลายทางต้องไม่เป็นคลังเดียวกัน'
          : 'Source store and destination store cannot be the same.'
      );
      return;
    }

    const qty = parseFloat(transferQty);
    if (isNaN(qty) || qty <= 0) {
      setError(
        isTh ? 'กรุณากรอกจำนวนโอนย้ายที่มากกว่า 0' : 'Transfer quantity must be greater than 0.'
      );
      return;
    }

    // Stock Validation
    if (qty > availableStock) {
      setError(
        isTh
          ? `จำนวนที่ต้องการโอนย้าย (${qty} ${selectedMaterial.unit}) เกินสต็อกที่มีอยู่ในคลังต้นทาง (${availableStock} ${selectedMaterial.unit})`
          : `Transfer quantity cannot exceed available stock (${availableStock} ${selectedMaterial.unit}).`
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const res = transferMaterial({
        plant,
        fromPlant: plant,
        fromStore,
        toPlant: plant,
        toStore,
        materialId: selectedMaterial.id,
        quantity: qty,
        lot: selectedLot && selectedLot !== 'AUTO' ? selectedLot : undefined,
        batchNumber: selectedBatch,
        reason,
        comment,
      });

      if (!res.success) {
        setError(res.error || 'Failed to complete material transfer.');
        setIsSubmitting(false);
        return;
      }

      onClose();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs flex justify-end animate-fadeIn">
        <div className="bg-white dark:bg-app-darkSurface w-full max-w-xl h-full shadow-2xl flex flex-col overflow-hidden border-l border-app-border dark:border-app-darkBorder animate-slideLeft">
          {/* HEADER */}
          <div className="p-5 border-b border-app-border dark:border-app-darkBorder flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center font-bold">
                <ArrowRight className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-app-text dark:text-app-darkText">
                  {t('material_transfer_title') || 'Stock Transfer / โอนย้ายพัสดุ'}
                </h2>
                <p className="text-xs text-app-secondary dark:text-app-darkSecondary">
                  {isTh
                    ? 'โอนย้ายพัสดุระหว่างคลังภายในโรงงานเดียวกัน (Same Plant Internal Transfer)'
                    : 'Internal Store Transfer within the same Plant with preserved Lot & Batch'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-app-muted hover:text-app-text dark:hover:text-app-darkText hover:bg-app-bg dark:hover:bg-app-darkBg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* FORM BODY */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">
            {error && (
              <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900/60 text-xs text-red-600 dark:text-red-400 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* 1. ITEM / MATERIAL SELECTOR (USING SHARED ITEMFINDERMODAL) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-app-text dark:text-app-darkText">
                  {isTh ? '1. เลือกพัสดุที่ต้องการโอนย้าย (Select Material)' : '1. Material to Transfer'} *
                </label>
                <button
                  type="button"
                  onClick={() => setIsItemPickerOpen(true)}
                  className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>{isTh ? '+ เลือกพัสดุ (Select Item)' : '+ Select Item'}</span>
                </button>
              </div>

              {selectedMaterial ? (
                <div className="p-4 rounded-2xl bg-purple-50/50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/60 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="font-mono font-bold text-xs text-purple-600 dark:text-purple-400">
                        {selectedMaterial.materialCode}
                      </span>
                      <h4 className="text-sm font-bold text-app-text dark:text-app-darkText mt-0.5">
                        {selectedMaterial.description}
                      </h4>
                      <p className="text-xs text-app-secondary dark:text-app-darkSecondary mt-0.5">
                        Type: {selectedMaterial.materialType} · Unit: {selectedMaterial.unit} · Default Plant: {selectedMaterial.plant || '-'}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMaterial(null);
                        setFromStore('');
                        setSelectedLot(undefined);
                        setSelectedBatch(undefined);
                        setTransferQty('');
                      }}
                      className="p-1 rounded-lg text-app-muted hover:text-red-500 hover:bg-red-50 transition-colors"
                      title="Clear Selection"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => setIsItemPickerOpen(true)}
                  className="p-6 rounded-2xl border-2 border-dashed border-app-border dark:border-app-darkBorder text-center cursor-pointer hover:border-purple-500 hover:bg-purple-50/20 dark:hover:bg-purple-950/20 transition-all"
                >
                  <Package className="w-8 h-8 text-app-muted mx-auto mb-2" />
                  <p className="text-xs font-semibold text-app-text dark:text-app-darkText">
                    {isTh
                      ? 'คลิกเพื่อเลือกพัสดุ (Shared Item Selector เดียวกันกับ GR / GI)'
                      : 'Click to select material (Unified Item Selector)'}
                  </p>
                  <p className="text-[11px] text-app-muted mt-0.5">
                    Browse Master Data with full multi-column filters and real-time stock
                  </p>
                </div>
              )}
            </div>

            {/* 2. TRANSFER ROUTE CONTAINER */}
            <div className="p-4 rounded-2xl bg-app-bg/60 dark:bg-app-darkBg/60 border border-app-border dark:border-app-darkBorder space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-app-muted flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-purple-600" />
                  {isTh ? '2. เส้นทางโอนย้าย (Plant ➔ From Store ➔ Lot ➔ To Store)' : '2. Transfer Route (Plant ➔ From Store ➔ Lot ➔ To Store)'}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-300 border border-purple-200 dark:border-purple-800/40">
                  Same Plant Only
                </span>
              </div>

              {/* 2.1 PLANT SELECTOR */}
              <div className="p-3 rounded-xl bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-app-text dark:text-app-darkText flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-brand-blue" />
                    <span>{isTh ? 'Plant (โรงงาน)' : 'Plant'} *</span>
                  </label>
                  <span className="text-[10px] text-app-muted font-medium">
                    {isTh ? 'โอนย้ายภายในโรงงานเดียวกัน' : 'Transfer within this Plant'}
                  </span>
                </div>
                <select
                  value={plant}
                  onChange={e => handlePlantChange(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-app-border dark:border-app-darkBorder bg-app-bg dark:bg-app-darkBg text-app-text dark:text-app-darkText focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                >
                  {getAllPlants(materials).map(p => (
                    <option key={p.code} value={p.code}>
                      {p.label || p.name || p.code}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2.2 FROM STORE (SOURCE STORE - DERIVED STRICTLY FROM ACTUAL STOCK BALANCE > 0) */}
              <div className="p-3 rounded-xl bg-white dark:bg-app-darkSurface border border-blue-200 dark:border-blue-900/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-brand-blue uppercase flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5" />
                    {isTh ? 'From Store (คลังต้นทาง — เฉพาะคลังที่มีสต็อก)' : 'From Store (Source Store — Stock > 0)'} *
                  </span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-brand-blue">
                    Plant: {plant}
                  </span>
                </div>

                <select
                  value={fromStore}
                  onChange={e => handleFromStoreChange(e.target.value)}
                  disabled={!selectedMaterial || availableSourceStores.length === 0}
                  className={`w-full text-xs font-semibold px-2.5 py-2 rounded-lg border ${
                    !selectedMaterial || availableSourceStores.length === 0
                      ? 'border-app-border dark:border-app-darkBorder bg-app-bg dark:bg-app-darkBg opacity-80 cursor-not-allowed text-app-muted'
                      : 'border-blue-300 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-950/20 text-app-text dark:text-app-darkText focus:ring-2 focus:ring-brand-blue/30'
                  } focus:outline-none`}
                >
                  {!selectedMaterial ? (
                    <option value="">{isTh ? '-- กรุณาเลือกพัสดุก่อน --' : '-- Please select Material first --'}</option>
                  ) : availableSourceStores.length === 0 ? (
                    <option value="">{isTh ? '-- ไม่พบสต็อกในโรงงานนี้ --' : '-- No Available Stock in this Plant --'}</option>
                  ) : (
                    availableSourceStores.map(s => (
                      <option key={`from-${s.storeCode}`} value={s.storeCode}>
                        {s.storeCode} — Available: {s.availableQty} {s.unit}
                      </option>
                    ))
                  )}
                </select>

                {/* NO STOCK ALERT BANNER */}
                {hasNoSourceStock && (
                  <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-[11px] text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {isTh
                        ? `ไม่พบสต็อกคงเหลือสำหรับพัสดุนี้ใน ${plant} กรุณาเลือก Plant อื่นที่มีสต็อก`
                        : `No available stock found for this material in ${plant}. Please select another Plant with balance.`}
                    </span>
                  </div>
                )}
              </div>

              {/* 2.3 LOT SELECTION (IF APPLICABLE IN SELECTED FROM STORE) */}
              {selectedMaterial && fromStore && (
                <div className="p-3 rounded-xl bg-white dark:bg-app-darkSurface border border-purple-200 dark:border-purple-900/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-purple-600" />
                      <span>{isTh ? 'Lot / Batch ในคลังต้นทาง' : 'Lot / Batch in Source Store'}</span>
                    </label>
                    <span className="text-[10px] text-app-muted">
                      {sourceLots.length > 0 ? `${sourceLots.length} lot(s) with stock` : 'Standard Lot'}
                    </span>
                  </div>

                  {sourceLots.length > 0 ? (
                    <select
                      value={selectedLot || 'AUTO'}
                      onChange={e => {
                        const val = e.target.value;
                        if (val === 'AUTO') {
                          setSelectedLot(undefined);
                          setSelectedBatch(undefined);
                        } else {
                          setSelectedLot(val);
                          const lotObj = sourceLots.find(l => l.lot === val || l.lotNo === val);
                          setSelectedBatch(lotObj?.batchNumber || lotObj?.batchNo);
                        }
                      }}
                      className="w-full text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-purple-300 dark:border-purple-800 bg-purple-50/30 dark:bg-purple-950/20 text-app-text dark:text-app-darkText focus:outline-none"
                    >
                      {sourceLots.length > 1 && (
                        <option value="AUTO">
                          {isTh
                            ? `ทุก Lot (อัตโนมัติ FIFO) — รวม ${sourceLots.reduce((sum, l) => sum + l.quantity, 0)} ${selectedMaterial?.unit}`
                            : `All Lots (Auto FIFO) — Total ${sourceLots.reduce((sum, l) => sum + l.quantity, 0)} ${selectedMaterial?.unit}`}
                        </option>
                      )}
                      {sourceLots.map(l => (
                        <option key={l.lot || l.id} value={l.lot}>
                          {l.lot} — {l.quantity} {selectedMaterial?.unit} (Batch: {l.batchNumber || l.batchNo || '-'})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="text-xs text-app-muted bg-app-bg dark:bg-app-darkBg p-2 rounded-lg font-mono">
                      Lot: {selectedLot || 'Standard / Unbatched'} · Preserved at destination
                    </div>
                  )}

                  {/* LIVE AVAILABLE STOCK BADGE */}
                  <div className="flex items-center justify-between pt-1.5 border-t border-purple-100 dark:border-purple-900/40 text-xs">
                    <span className="text-app-muted">
                      {isTh ? `ยอดคงเหลือพร้อมโอนจาก ${fromStore}:` : `Available stock in ${fromStore}:`}
                    </span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {availableStock.toLocaleString()} {selectedMaterial.unit}
                    </span>
                  </div>
                </div>
              )}

              {/* 2.4 TO STORE (DESTINATION STORE - FROM STORE MASTER OF SAME PLANT) */}
              <div className="p-3 rounded-xl bg-white dark:bg-app-darkSurface border border-purple-200 dark:border-purple-900/60 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-600 uppercase flex items-center gap-1">
                    <Store className="w-3.5 h-3.5" />
                    {isTh ? 'To Store (คลังปลายทาง — จาก Store Master)' : 'To Store (Destination Store — Store Master)'} *
                  </span>
                  <span className="text-[10px] font-mono text-purple-600">{plant}</span>
                </div>
                <select
                  value={toStore}
                  onChange={e => {
                    setToStore(e.target.value);
                    setError(null);
                  }}
                  className={`w-full text-xs font-semibold px-2.5 py-2 rounded-lg border ${
                    isSameStore
                      ? 'border-red-400 bg-red-50/50 dark:bg-red-950/30 text-red-600'
                      : 'border-app-border dark:border-app-darkBorder bg-app-bg dark:bg-app-darkBg text-app-text dark:text-app-darkText'
                  } focus:outline-none`}
                >
                  {destinationStores.map(s => (
                    <option key={`to-${s.value}`} value={s.value}>
                      {s.label} {s.value === fromStore ? `(${isTh ? 'คลังต้นทาง - ห้ามเลือกซ้ำ' : 'Source - Same Store'})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* SAME STORE WARNING BANNER */}
              {isSameStore && (
                <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>
                    {isTh
                      ? 'คลังต้นทางและคลังปลายทางต้องไม่เป็นคลังเดียวกัน (Source Store and Destination Store cannot be the same.)'
                      : 'Source Store and Destination Store cannot be the same.'}
                  </span>
                </div>
              )}
            </div>

            {/* 3. TRANSFER QUANTITY */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-app-text dark:text-app-darkText">
                  {t('transfer_quantity') || 'Transfer Quantity'} *
                </label>
                {selectedMaterial && (
                  <span className="text-xs text-app-muted font-medium">
                    Max Available: <strong className="text-emerald-600 dark:text-emerald-400">{availableStock}</strong> {selectedMaterial.unit}
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max={availableStock || undefined}
                  step="any"
                  value={transferQty}
                  onChange={e => setTransferQty(e.target.value)}
                  placeholder="e.g. 5"
                  required
                  disabled={availableStock <= 0}
                  className={`w-full text-sm font-mono font-bold px-3 py-2 rounded-xl border ${
                    isQtyExceeded
                      ? 'border-rose-500 bg-rose-50/40 dark:bg-rose-950/20 text-rose-600 focus:ring-rose-500/30'
                      : 'border-app-border dark:border-app-darkBorder bg-app-bg dark:bg-app-darkBg text-app-text dark:text-app-darkText focus:ring-purple-500/30'
                  } focus:outline-none focus:ring-2`}
                />
                {selectedMaterial && (
                  <span className="absolute right-3 top-2.5 text-xs font-bold text-app-muted uppercase">
                    {selectedMaterial.unit}
                  </span>
                )}
              </div>

              {isQtyExceeded && (
                <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                  {isTh
                    ? `จำนวนที่ต้องการโอนย้ายไม่สามารถเกินสต็อกที่มีอยู่ (${availableStock} ${selectedMaterial?.unit})`
                    : `Transfer quantity cannot exceed available stock (${availableStock} ${selectedMaterial?.unit}).`}
                </p>
              )}
            </div>

            {/* 4. REASON & COMMENT */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-app-text dark:text-app-darkText block mb-1">
                  {isTh ? 'เหตุผลการโอนย้าย' : 'Transfer Reason'} *
                </label>
                <select
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-app-border dark:border-app-darkBorder bg-app-bg dark:bg-app-darkBg text-app-text dark:text-app-darkText focus:outline-none"
                >
                  <option value="Store Rebalancing">Store Rebalancing (ปรับสมดุลสต็อกระหว่างคลัง)</option>
                  <option value="Internal Store Shift">Internal Store Shift (ย้ายตำแหน่งจัดเก็บภายในโรงงาน)</option>
                  <option value="Scheduled Maintenance Project">Scheduled Maintenance Project (งานบำรุงรักษาตามแผน)</option>
                  <option value="Consolidation">Consolidation (รวมคลังสินค้า)</option>
                  <option value="Other">Other Reason</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-app-text dark:text-app-darkText block mb-1">
                  {isTh ? 'บันทึกเพิ่มเติม / หมายเหตุ' : 'Comments & Remarks'}
                </label>
                <textarea
                  rows={2}
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder={
                    isTh
                      ? 'ระบุชื่อผู้ขนย้าย หรือเลขอ้างอิงการจัดส่ง...'
                      : 'Operator name, truck number, or additional audit remarks...'
                  }
                  className="w-full text-xs px-3 py-2 rounded-xl border border-app-border dark:border-app-darkBorder bg-app-bg dark:bg-app-darkBg text-app-text dark:text-app-darkText focus:outline-none"
                />
              </div>
            </div>

            {/* AUDIT & BUSINESS RULE NOTE */}
            <div className="p-3.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/60 text-xs text-purple-700 dark:text-purple-300 flex items-start gap-2.5">
              <HelpCircle className="w-4 h-4 shrink-0 mt-0.5 text-purple-600" />
              <div>
                <strong>{isTh ? 'กฎการโอนย้ายสต็อก (Stock Transfer Rules):' : 'Stock Transfer Rules:'}</strong>
                <p className="text-[11px] text-purple-600/90 dark:text-purple-300/80 mt-0.5">
                  {isTh
                    ? '• คลังต้นทาง (From Store) แสดงเฉพาะคลังที่มีสต็อกคงเหลือจริงของพัสดุรายการนี้เท่านั้น'
                    : '• Source Store (From Store) only displays stores where the selected material has actual positive stock.'}
                </p>
                <p className="text-[11px] text-purple-600/90 dark:text-purple-300/80 mt-0.5">
                  {isTh
                    ? '• การโอนย้ายทำได้เฉพาะระหว่าง Store ภายในโรงงาน (Plant) เดียวกันเท่านั้น ไม่สามารถโอนข้าม Plant ได้'
                    : '• Transfer is only permitted between stores within the same plant (Plant A/Store A ➔ Plant A/Store B).'}
                </p>
                <p className="text-[11px] text-purple-600/90 dark:text-purple-300/80 mt-0.5">
                  {isTh
                    ? '• ข้อมูล Lot Number และ Batch จะถูกส่งต่อไปยังคลังปลายทางอย่างสมบูรณ์โดยไม่สร้าง Lot ใหม่'
                    : '• Lot and Batch identities are strictly preserved at destination without creating new lots.'}
                </p>
              </div>
            </div>
          </form>

          {/* FOOTER ACTIONS */}
          <div className="p-4 border-t border-app-border dark:border-app-darkBorder bg-app-bg dark:bg-app-darkBg flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-app-border dark:border-app-darkBorder text-xs font-bold hover:bg-white dark:hover:bg-app-darkSurface transition-colors"
            >
              {isTh ? 'ยกเลิก' : 'Cancel'}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={
                isSubmitting ||
                isSameStore ||
                !selectedMaterial ||
                !fromStore ||
                !toStore ||
                availableStock <= 0 ||
                !transferQty ||
                Number(transferQty) <= 0 ||
                Number(transferQty) > availableStock
              }
              className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowRight className="w-4 h-4" />
              <span>{isSubmitting ? 'Transferring...' : isTh ? 'ยืนยันการโอนย้าย' : 'Execute Transfer'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* SHARED ITEM FINDER MODAL (EXACT SAME AS TRANSACTION GR / GI, MATERIAL REQUEST, PR) */}
      <ItemFinderModal
        isOpen={isItemPickerOpen}
        onClose={() => setIsItemPickerOpen(false)}
        onSelectMaterial={handleSelectMaterial}
        plantFilter={plant !== 'All Plants' ? plant : undefined}
      />
    </>
  );
};
