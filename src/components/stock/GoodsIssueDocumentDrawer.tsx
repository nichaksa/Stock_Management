import React, { useState, useEffect } from 'react';
import { Drawer } from '../common/Drawer';
import { Material, TransactionItem } from '../../types/stock';
import { useStock } from '../../context/StockContext';
import { useToast } from '../../context/ToastContext';
import {
  PackageMinus,
  Plus,
  Trash2,
  Building2,
  AlertTriangle,
  Info,
  RefreshCw,
  Layers,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface GoodsIssueDocumentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  preSelectedMaterial?: Material | null;
}

export const GoodsIssueDocumentDrawer: React.FC<GoodsIssueDocumentDrawerProps> = ({
  isOpen,
  onClose,
  preSelectedMaterial,
}) => {
  const { materials, transactions, getItemStock, createDocumentGoodsIssue } = useStock();
  const { addToast } = useToast();

  // Document Header State
  const [plant, setPlant] = useState<string>('DEMO');
  const [giNumber, setGiNumber] = useState<string>('');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [picklist, setPicklist] = useState<string>('');
  const [documentComment, setDocumentComment] = useState<string>('');

  // Added Item Lines State
  const [itemLines, setItemLines] = useState<Omit<TransactionItem, 'id'>[]>([]);

  // Draft Single Item Addition State
  const [selectedMatId, setSelectedMatId] = useState<string>('');
  const [itemDescription, setItemDescription] = useState<string>('');
  const [itemLot, setItemLot] = useState<string>('');
  const [itemBatch, setItemBatch] = useState<string>('');
  const [itemSerial, setItemSerial] = useState<string>('');
  const [itemQty, setItemQty] = useState<number>(1);
  const [itemPrice, setItemPrice] = useState<number>(0);
  const [itemLocation, setItemLocation] = useState<string>('MAIN');
  const [itemBin, setItemBin] = useState<string>('');
  const [itemComment, setItemComment] = useState<string>('');

  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const generateNewGiNumber = () => {
    const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const num = `GI-${dateStr}-${Math.floor(100 + Math.random() * 900)}`;
    setGiNumber(num);
  };

  useEffect(() => {
    if (isOpen) {
      generateNewGiNumber();
      setPlant(preSelectedMaterial ? preSelectedMaterial.plant : 'DEMO');
      setReferenceNumber(`WO-2026-${Math.floor(100 + Math.random() * 900)}`);
      setPicklist(`PL-${Math.floor(10000 + Math.random() * 90000)}`);
      setDocumentComment('');
      setError('');

      if (preSelectedMaterial) {
        setSelectedMatId(preSelectedMaterial.id);
        setItemDescription(preSelectedMaterial.description);
        setItemPrice(preSelectedMaterial.standardPrice || 0);
        setItemLocation(preSelectedMaterial.storageLocation || 'MAIN');
        setItemBin(preSelectedMaterial.storageBin || '');
        setItemLines([
          {
            materialId: preSelectedMaterial.id,
            materialCode: preSelectedMaterial.materialCode,
            description: preSelectedMaterial.description,
            lot: '',
            batchNumber: `B${new Date().toISOString().slice(2, 10).replace(/-/g, '')}`,
            serialNumber: '',
            quantity: 1,
            price: preSelectedMaterial.standardPrice || 0,
            type: preSelectedMaterial.materialType || 'Spare Part',
            storageLocation: preSelectedMaterial.storageLocation || 'MAIN',
            storageBin: preSelectedMaterial.storageBin || '',
            unit: preSelectedMaterial.unit || 'EA',
            totalPrice: preSelectedMaterial.standardPrice || 0,
          },
        ]);
      } else {
        setItemLines([]);
        if (materials.length > 0) {
          const first = materials[0];
          setSelectedMatId(first.id);
          setItemDescription(first.description);
          setItemPrice(first.standardPrice || 0);
          setItemLocation(first.storageLocation || 'MAIN');
          setItemBin(first.storageBin || '');
        }
      }
    }
  }, [isOpen, preSelectedMaterial, materials]);

  const handleMaterialSelect = (matId: string) => {
    setSelectedMatId(matId);
    const mat = materials.find(m => m.id === matId);
    if (mat) {
      setItemDescription(mat.description);
      setItemPrice(mat.standardPrice || 0);
      setItemLocation(mat.storageLocation || 'MAIN');
      setItemBin(mat.storageBin || '');
    }
  };

  const selectedMaterialObj = materials.find(m => m.id === selectedMatId);
  const currentAvailableStock = selectedMaterialObj ? getItemStock(selectedMaterialObj.id) : 0;

  // Add individual item to document line items
  const handleAddItemLine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMatId) {
      setError('Please select a material.');
      return;
    }
    if (itemQty <= 0) {
      setError('Withdrawal quantity must be greater than 0.');
      return;
    }

    const mat = materials.find(m => m.id === selectedMatId);
    if (!mat) return;

    // Check availability
    const available = getItemStock(mat.id);
    if (itemQty > available) {
      setError(`Insufficient Stock for ${mat.materialCode}. Available: ${available} ${mat.unit}, Requested: ${itemQty} ${mat.unit}`);
      return;
    }

    const lineTotal = itemQty * itemPrice;
    const newLine: Omit<TransactionItem, 'id'> = {
      materialId: mat.id,
      materialCode: mat.materialCode,
      description: itemDescription || mat.description,
      lot: itemLot.trim() || undefined,
      batchNumber: itemBatch.trim() || undefined,
      serialNumber: itemSerial.trim() || undefined,
      quantity: itemQty, // Always positive number entered by user!
      price: itemPrice,
      type: mat.materialType,
      storageLocation: itemLocation || mat.storageLocation,
      storageBin: itemBin || mat.storageBin,
      comment: itemComment.trim() || undefined,
      unit: mat.unit || 'EA',
      totalPrice: lineTotal,
    };

    setItemLines(prev => [...prev, newLine]);
    setError('');

    // Reset draft
    setItemQty(1);
    setItemSerial('');
    setItemComment('');
    addToast(`Added ${mat.materialCode} to Issue Lines`, 'info');
  };

  const handleRemoveLine = (index: number) => {
    setItemLines(prev => prev.filter((_, i) => i !== index));
  };

  const totalQuantity = itemLines.reduce((sum, item) => sum + item.quantity, 0);
  const totalValue = itemLines.reduce((sum, item) => sum + (item.totalPrice || item.quantity * item.price), 0);

  // Submit entire document
  const handleSubmitDocument = () => {
    if (itemLines.length === 0) {
      setError('Please add at least one material line before submitting.');
      return;
    }

    // Pre-validate all lines
    for (const line of itemLines) {
      const mat = materials.find(m => m.id === line.materialId);
      if (mat) {
        const stock = getItemStock(mat.id);
        if (line.quantity > stock) {
          setError(`Insufficient Stock for Material ${mat.materialCode}: Available: ${stock} ${mat.unit}, Requested: ${line.quantity} ${mat.unit}`);
          return;
        }
      }
    }

    setIsSubmitting(true);
    setTimeout(() => {
      const result = createDocumentGoodsIssue({
        plant,
        referenceNumber: referenceNumber.trim() || undefined,
        picklist: picklist.trim() || undefined,
        comment: documentComment.trim() || undefined,
        items: itemLines,
      });

      setIsSubmitting(false);

      if (result.success && result.document) {
        try {
          confetti({
            particleCount: 40,
            spread: 60,
            origin: { y: 0.8 },
            colors: ['#DC2626', '#2563EB', '#F59E0B'],
          });
        } catch {}

        addToast(`Goods Issue Document ${result.document.transactionNumber} processed (-${totalQuantity} units)!`, 'success');
        onClose();
      } else {
        setError(result.error || 'Failed to submit Goods Issue document.');
      }
    }, 200);
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Create Goods Issue (GI) Document"
      subtitle="Withdraw multiple materials from plant inventory under one document header."
      widthClass="max-w-3xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-xs">
            <span className="text-app-muted">Total Lines: </span>
            <strong className="text-app-text dark:text-app-darkText font-mono mr-3">{itemLines.length}</strong>
            <span className="text-app-muted">Total Qty: </span>
            <strong className="text-gi font-mono mr-3">-{totalQuantity}</strong>
            <span className="text-app-muted">Total Value: </span>
            <strong className="text-app-text dark:text-app-darkText font-mono">฿{totalValue.toLocaleString()}</strong>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-app-border dark:border-app-darkBorder text-app-secondary hover:text-app-text transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmitDocument}
              disabled={isSubmitting || itemLines.length === 0}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-gi hover:bg-red-700 active:scale-95 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-subtle flex items-center gap-1.5"
            >
              <PackageMinus className="w-4 h-4" />
              <span>{isSubmitting ? 'Posting...' : 'Submit GI Document'}</span>
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-gi text-xs font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 1. DOCUMENT HEADER SECTION */}
        <div className="p-4 rounded-2xl bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder shadow-subtle space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-app-border dark:border-app-darkBorder">
            <h4 className="text-xs font-bold uppercase tracking-wider text-app-text dark:text-app-darkText flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-brand-blue" />
              <span>Document Header Details</span>
            </h4>
            <span className="text-[11px] font-mono font-bold text-gi">
              {giNumber}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {/* Plant */}
            <div>
              <label className="block font-semibold text-app-text dark:text-app-darkText mb-1">
                Plant / โรงงาน *
              </label>
              <select
                value={plant}
                onChange={(e) => setPlant(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-app-border dark:border-app-darkBorder bg-app-bg dark:bg-app-darkBg text-xs font-semibold text-app-text dark:text-app-darkText outline-none focus:border-brand-blue"
              >
                <option value="DEMO">DEMO</option>
                <option value="PLANT-01">PLANT-01</option>
                <option value="PLANT-02">PLANT-02</option>
              </select>
            </div>

            {/* Auto-generated GI Number */}
            <div>
              <label className="block font-semibold text-app-text dark:text-app-darkText mb-1">
                GI Number (Auto)
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  readOnly
                  value={giNumber}
                  className="w-full h-9 pl-3 pr-8 rounded-xl border border-app-border dark:border-app-darkBorder bg-app-bg dark:bg-app-darkBg font-mono text-xs font-bold text-gi outline-none"
                />
                <button
                  type="button"
                  onClick={generateNewGiNumber}
                  title="Generate new number"
                  className="absolute right-2 p-1 text-app-muted hover:text-brand-blue"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Reference Number / Work Order */}
            <div>
              <label className="block font-semibold text-app-text dark:text-app-darkText mb-1">
                Reference / Work Order No.
              </label>
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="e.g. WO-2026-0925"
                className="w-full h-9 px-3 rounded-xl border border-app-border dark:border-app-darkBorder bg-white dark:bg-app-darkBg text-xs text-app-text dark:text-app-darkText outline-none focus:border-brand-blue"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block font-semibold text-app-text dark:text-app-darkText mb-1">
                PickList / Requisition No.
              </label>
              <input
                type="text"
                value={picklist}
                onChange={(e) => setPicklist(e.target.value)}
                placeholder="e.g. PL-88210"
                className="w-full h-9 px-3 rounded-xl border border-app-border dark:border-app-darkBorder bg-white dark:bg-app-darkBg text-xs font-mono text-app-text dark:text-app-darkText outline-none focus:border-brand-blue"
              />
            </div>

            <div>
              <label className="block font-semibold text-app-text dark:text-app-darkText mb-1">
                Document Comment / Purpose
              </label>
              <input
                type="text"
                value={documentComment}
                onChange={(e) => setDocumentComment(e.target.value)}
                placeholder="e.g. Line 1 Emergency breakdown repair"
                className="w-full h-9 px-3 rounded-xl border border-app-border dark:border-app-darkBorder bg-white dark:bg-app-darkBg text-xs text-app-text dark:text-app-darkText outline-none focus:border-brand-blue"
              />
            </div>
          </div>
        </div>

        {/* 2. ADD ITEM FORM SECTION */}
        <form
          onSubmit={handleAddItemLine}
          className="p-4 rounded-2xl bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder shadow-subtle space-y-3"
        >
          <div className="flex items-center justify-between pb-2 border-b border-app-border dark:border-app-darkBorder">
            <h4 className="text-xs font-bold uppercase tracking-wider text-app-text dark:text-app-darkText flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-gi" />
              <span>Add Withdrawal Line</span>
            </h4>
            {selectedMaterialObj && (
              <span className="text-[11px] font-mono">
                Available Stock:{' '}
                <strong className={currentAvailableStock > 0 ? 'text-brand-blue' : 'text-gi'}>
                  {currentAvailableStock} {selectedMaterialObj.unit}
                </strong>
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {/* Material Selector */}
            <div className="sm:col-span-2">
              <label className="block font-semibold text-app-text dark:text-app-darkText mb-1">
                Material Code / พัสดุ *
              </label>
              <select
                value={selectedMatId}
                onChange={(e) => handleMaterialSelect(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-app-border dark:border-app-darkBorder bg-app-bg dark:bg-app-darkBg font-mono text-xs font-semibold text-app-text dark:text-app-darkText outline-none focus:border-brand-blue"
              >
                {materials.map((m) => {
                  const stock = getItemStock(m.id);
                  return (
                    <option key={m.id} value={m.id}>
                      {m.materialCode} - {m.description} (Avail: {stock} {m.unit})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Qty (User enters positive number!) */}
            <div>
              <label className="block font-semibold text-app-text dark:text-app-darkText mb-1">
                Issue Qty (Positive Number) *
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={itemQty}
                onChange={(e) => setItemQty(Math.max(1, Number(e.target.value)))}
                className="w-full h-9 px-3 rounded-xl border border-app-border dark:border-app-darkBorder bg-white dark:bg-app-darkBg font-mono text-xs font-bold text-gi outline-none focus:border-gi"
              />
            </div>

            {/* Batch */}
            <div>
              <label className="block font-semibold text-app-text dark:text-app-darkText mb-1">
                Batch No.
              </label>
              <input
                type="text"
                value={itemBatch}
                onChange={(e) => setItemBatch(e.target.value)}
                placeholder="e.g. B260902"
                className="w-full h-9 px-3 rounded-xl border border-app-border dark:border-app-darkBorder bg-white dark:bg-app-darkBg text-xs font-mono text-app-text dark:text-app-darkText outline-none focus:border-brand-blue"
              />
            </div>

            {/* S/N */}
            <div>
              <label className="block font-semibold text-app-text dark:text-app-darkText mb-1">
                Serial No. (S/N)
              </label>
              <input
                type="text"
                value={itemSerial}
                onChange={(e) => setItemSerial(e.target.value)}
                placeholder="Optional S/N"
                className="w-full h-9 px-3 rounded-xl border border-app-border dark:border-app-darkBorder bg-white dark:bg-app-darkBg text-xs font-mono text-app-text dark:text-app-darkText outline-none focus:border-brand-blue"
              />
            </div>

            {/* Line Comment */}
            <div>
              <label className="block font-semibold text-app-text dark:text-app-darkText mb-1">
                Line Remarks
              </label>
              <input
                type="text"
                value={itemComment}
                onChange={(e) => setItemComment(e.target.value)}
                placeholder="e.g. Replace worn bearing"
                className="w-full h-9 px-3 rounded-xl border border-app-border dark:border-app-darkBorder bg-white dark:bg-app-darkBg text-xs text-app-text dark:text-app-darkText outline-none focus:border-brand-blue"
              />
            </div>
          </div>

          <div className="flex items-center justify-end pt-2">
            <button
              type="submit"
              className="h-9 px-4 rounded-xl bg-brand-blue hover:bg-brand-darkBlue text-white text-xs font-bold transition-all shadow-subtle flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Issue Line</span>
            </button>
          </div>
        </form>

        {/* 3. ITEM LINES TABLE */}
        <div className="p-4 rounded-2xl bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder shadow-subtle space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-app-border dark:border-app-darkBorder">
            <h4 className="text-xs font-bold uppercase tracking-wider text-app-text dark:text-app-darkText">
              Issue Lines ({itemLines.length})
            </h4>
            <span className="text-[11px] font-mono text-app-muted">
              Total Value: ฿{totalValue.toLocaleString()}
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-app-border dark:border-app-darkBorder max-h-60">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-app-bg dark:bg-app-darkBg text-app-secondary dark:text-app-darkSecondary uppercase font-semibold text-[10px] tracking-wider border-b border-app-border dark:border-app-darkBorder">
                <tr>
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Material Code</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3">Available</th>
                  <th className="py-2.5 px-3 text-right">Requested Qty</th>
                  <th className="py-2.5 px-3 text-right">Unit Price</th>
                  <th className="py-2.5 px-3 text-right">Total (฿)</th>
                  <th className="py-2.5 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border dark:divide-app-darkBorder bg-white dark:bg-app-darkSurface">
                {itemLines.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-app-muted">
                      No material withdrawal lines added yet. Use form above to add items.
                    </td>
                  </tr>
                ) : (
                  itemLines.map((line, idx) => {
                    const avail = getItemStock(line.materialId);
                    const isExceeded = line.quantity > avail;

                    return (
                      <tr key={idx} className="hover:bg-app-bg/50 dark:hover:bg-app-darkBorder/30">
                        <td className="py-2.5 px-3 text-app-muted font-mono">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-brand-blue">{line.materialCode}</td>
                        <td className="py-2.5 px-3">
                          <span className="font-medium text-app-text dark:text-app-darkText block truncate max-w-xs">{line.description}</span>
                          {line.comment && <span className="text-[10px] text-app-muted block">{line.comment}</span>}
                        </td>
                        <td className="py-2.5 px-3 font-mono">
                          <span className={avail < line.quantity ? 'text-gi font-bold' : 'text-app-secondary'}>
                            {avail} {line.unit}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-gi">
                          -{line.quantity} {line.unit}
                          {isExceeded && (
                            <span className="block text-[10px] text-gi font-semibold">Exceeds stock!</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-app-secondary">
                          ฿{line.price.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-app-text dark:text-app-darkText">
                          ฿{(line.totalPrice || line.quantity * line.price).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveLine(idx)}
                            className="p-1 text-app-muted hover:text-gi rounded transition-colors"
                            title="Remove line"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Drawer>
  );
};
