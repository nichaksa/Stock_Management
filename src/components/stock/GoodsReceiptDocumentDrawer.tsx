import React, { useState, useEffect } from 'react';
import { Drawer } from '../common/Drawer';
import { Material, TransactionItem } from '../../types/stock';
import { useStock } from '../../context/StockContext';
import { useToast } from '../../context/ToastContext';
import { SAMPLE_PURCHASE_REQUISITIONS } from '../../mock/samplePRs';
import {
  PackagePlus,
  Plus,
  Trash2,
  FileDown,
  Building2,
  QrCode,
  Sparkles,
  Info,
  RefreshCw,
  Search,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface GoodsReceiptDocumentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  preSelectedMaterial?: Material | null;
}

export const GoodsReceiptDocumentDrawer: React.FC<GoodsReceiptDocumentDrawerProps> = ({
  isOpen,
  onClose,
  preSelectedMaterial,
}) => {
  const { materials, createDocumentGoodsReceipt } = useStock();
  const { addToast } = useToast();

  // Document Header State
  const [plant, setPlant] = useState<string>('DEMO');
  const [grNumber, setGrNumber] = useState<string>('');
  const [prId, setPrId] = useState<string>('');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
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
  const [itemType, setItemType] = useState<string>('Spare Part');
  const [itemSupplier, setItemSupplier] = useState<string>('');
  const [itemLocation, setItemLocation] = useState<string>('MAIN');
  const [itemBin, setItemBin] = useState<string>('');
  const [itemComment, setItemComment] = useState<string>('');

  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Generate new GR document number
  const generateNewGrNumber = () => {
    const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const num = `GR-${dateStr}-${Math.floor(100 + Math.random() * 900)}`;
    setGrNumber(num);
  };

  useEffect(() => {
    if (isOpen) {
      generateNewGrNumber();
      setPlant(preSelectedMaterial ? preSelectedMaterial.plant : 'DEMO');
      setPrId('');
      setReferenceNumber(`PO-2026-${Math.floor(1000 + Math.random() * 9000)}`);
      setDocumentComment('');
      setError('');

      if (preSelectedMaterial) {
        setSelectedMatId(preSelectedMaterial.id);
        setItemDescription(preSelectedMaterial.description);
        setItemPrice(preSelectedMaterial.standardPrice || 0);
        setItemType(preSelectedMaterial.materialType || 'Spare Part');
        setItemLocation(preSelectedMaterial.storageLocation || 'MAIN');
        setItemBin(preSelectedMaterial.storageBin || '');
        setItemLines([
          {
            materialId: preSelectedMaterial.id,
            materialCode: preSelectedMaterial.materialCode,
            description: preSelectedMaterial.description,
            lot: `L${new Date().toISOString().slice(2, 10).replace(/-/g, '')}`,
            batchNumber: `B${new Date().toISOString().slice(2, 10).replace(/-/g, '')}`,
            serialNumber: '',
            quantity: 1,
            price: preSelectedMaterial.standardPrice || 0,
            type: preSelectedMaterial.materialType || 'Spare Part',
            supplier: 'HBM Sensors Ltd.',
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
          setItemType(first.materialType || 'Spare Part');
          setItemLocation(first.storageLocation || 'MAIN');
          setItemBin(first.storageBin || '');
        }
      }
    }
  }, [isOpen, preSelectedMaterial, materials]);

  // When selected material changes in dropdown
  const handleMaterialSelect = (matId: string) => {
    setSelectedMatId(matId);
    const mat = materials.find(m => m.id === matId);
    if (mat) {
      setItemDescription(mat.description);
      setItemPrice(mat.standardPrice || 0);
      setItemType(mat.materialType || 'Spare Part');
      setItemLocation(mat.storageLocation || 'MAIN');
      setItemBin(mat.storageBin || '');
    }
  };

  // Load sample PR items into the document lines table
  const handleLoadPrItems = () => {
    let targetPR = SAMPLE_PURCHASE_REQUISITIONS.find(p => p.prId.toLowerCase() === prId.trim().toLowerCase());

    if (!targetPR) {
      // Pick the first PR matching the plant or default PR
      targetPR = SAMPLE_PURCHASE_REQUISITIONS.find(p => p.plant === plant) || SAMPLE_PURCHASE_REQUISITIONS[0];
    }

    setPrId(targetPR.prId);
    setPlant(targetPR.plant);
    setItemLines(prev => [...prev, ...targetPR!.items]);
    addToast(`Loaded ${targetPR.items.length} items from ${targetPR.prId} (${targetPR.department})`, 'success');
  };

  // Add individual item to document line items
  const handleAddItemLine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMatId) {
      setError('Please select a material.');
      return;
    }
    if (itemQty <= 0) {
      setError('Quantity must be greater than 0.');
      return;
    }

    const mat = materials.find(m => m.id === selectedMatId);
    if (!mat) return;

    const lineTotal = itemQty * itemPrice;
    const newLine: Omit<TransactionItem, 'id'> = {
      materialId: mat.id,
      materialCode: mat.materialCode,
      description: itemDescription || mat.description,
      lot: itemLot.trim() || undefined,
      batchNumber: itemBatch.trim() || undefined,
      serialNumber: itemSerial.trim() || undefined,
      quantity: itemQty,
      price: itemPrice,
      type: itemType || mat.materialType,
      supplier: itemSupplier.trim() || undefined,
      storageLocation: itemLocation || mat.storageLocation,
      storageBin: itemBin || mat.storageBin,
      comment: itemComment.trim() || undefined,
      unit: mat.unit || 'EA',
      totalPrice: lineTotal,
    };

    setItemLines(prev => [...prev, newLine]);
    setError('');

    // Reset draft input for next item
    setItemQty(1);
    setItemSerial('');
    setItemComment('');
    addToast(`Added ${mat.materialCode} to Item Lines`, 'info');
  };

  const handleRemoveLine = (index: number) => {
    setItemLines(prev => prev.filter((_, i) => i !== index));
  };

  // Total summary calculations
  const totalQuantity = itemLines.reduce((sum, item) => sum + item.quantity, 0);
  const totalValue = itemLines.reduce((sum, item) => sum + (item.totalPrice || item.quantity * item.price), 0);

  // Submit entire document
  const handleSubmitDocument = () => {
    if (itemLines.length === 0) {
      setError('Please add at least one material line before submitting.');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      const result = createDocumentGoodsReceipt({
        plant,
        referenceNumber: referenceNumber.trim() || undefined,
        prId: prId.trim() || undefined,
        comment: documentComment.trim() || undefined,
        items: itemLines,
      });

      setIsSubmitting(false);

      if (result.success && result.document) {
        try {
          confetti({
            particleCount: 45,
            spread: 60,
            origin: { y: 0.8 },
            colors: ['#16A34A', '#2563EB', '#22C55E'],
          });
        } catch {}

        addToast(`Goods Receipt Document ${result.document.transactionNumber} created with ${itemLines.length} items!`, 'success');
        onClose();
      } else {
        setError(result.error || 'Failed to submit Goods Receipt document.');
      }
    }, 200);
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Create Goods Receipt (GR) Document"
      subtitle="Receive multiple inventory materials into plant stock under one document header."
      widthClass="max-w-3xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-xs">
            <span className="text-app-muted">Total Lines: </span>
            <strong className="text-app-text dark:text-app-darkText font-mono mr-3">{itemLines.length}</strong>
            <span className="text-app-muted">Total Qty: </span>
            <strong className="text-gr font-mono mr-3">+{totalQuantity}</strong>
            <span className="text-app-muted">Total Value: </span>
            <strong className="text-emerald-600 dark:text-emerald-400 font-mono">฿{totalValue.toLocaleString()}</strong>
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
              className="px-5 py-2 text-xs font-bold rounded-xl bg-gr hover:bg-green-700 active:scale-95 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-subtle flex items-center gap-1.5"
            >
              <PackagePlus className="w-4 h-4" />
              <span>{isSubmitting ? 'Posting...' : 'Submit GR Document'}</span>
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-gi text-xs font-medium flex items-center gap-2">
            <Info className="w-4 h-4 shrink-0" />
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
            <span className="text-[11px] font-mono font-bold text-gr">
              {grNumber}
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

            {/* Auto-generated GR Number */}
            <div>
              <label className="block font-semibold text-app-text dark:text-app-darkText mb-1">
                GR Number (Auto)
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  readOnly
                  value={grNumber}
                  className="w-full h-9 pl-3 pr-8 rounded-xl border border-app-border dark:border-app-darkBorder bg-app-bg dark:bg-app-darkBg font-mono text-xs font-bold text-brand-blue outline-none"
                />
                <button
                  type="button"
                  onClick={generateNewGrNumber}
                  title="Generate new number"
                  className="absolute right-2 p-1 text-app-muted hover:text-brand-blue"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Reference Number */}
            <div>
              <label className="block font-semibold text-app-text dark:text-app-darkText mb-1">
                Reference / PO No.
              </label>
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="e.g. PO-2026-9042"
                className="w-full h-9 px-3 rounded-xl border border-app-border dark:border-app-darkBorder bg-white dark:bg-app-darkBg text-xs text-app-text dark:text-app-darkText outline-none focus:border-brand-blue"
              />
            </div>
          </div>

          {/* PR ID & Load PR Items button */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block font-semibold text-app-text dark:text-app-darkText mb-1">
                PR ID (Purchase Requisition ID)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={prId}
                  onChange={(e) => setPrId(e.target.value)}
                  placeholder="e.g. PR-2026-9042"
                  className="flex-1 h-9 px-3 rounded-xl border border-app-border dark:border-app-darkBorder bg-white dark:bg-app-darkBg text-xs font-mono text-app-text dark:text-app-darkText outline-none focus:border-brand-blue"
                />
                <button
                  type="button"
                  onClick={handleLoadPrItems}
                  className="h-9 px-3 rounded-xl bg-brand-softBlue dark:bg-blue-950/60 text-brand-blue border border-brand-blue/30 text-xs font-bold hover:bg-brand-blue hover:text-white transition-all flex items-center gap-1.5 shrink-0"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>Load PR Items</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-app-text dark:text-app-darkText mb-1">
                Document Comment / Remark
              </label>
              <input
                type="text"
                value={documentComment}
                onChange={(e) => setDocumentComment(e.target.value)}
                placeholder="General receipt notes or delivery remarks"
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
              <Plus className="w-3.5 h-3.5 text-gr" />
              <span>Add Material Line</span>
            </h4>
            <span className="text-[10px] text-app-muted">
              Inventory will update only when document is submitted
            </span>
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
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.materialCode} - {m.description} ({m.unit})
                  </option>
                ))}
              </select>
            </div>

            {/* Quantity */}
            <div>
              <label className="block font-semibold text-app-text dark:text-app-darkText mb-1">
                Receipt Qty *
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={itemQty}
                onChange={(e) => setItemQty(Math.max(1, Number(e.target.value)))}
                className="w-full h-9 px-3 rounded-xl border border-app-border dark:border-app-darkBorder bg-white dark:bg-app-darkBg font-mono text-xs font-bold text-gr outline-none focus:border-gr"
              />
            </div>

            {/* Price */}
            <div>
              <label className="block font-semibold text-app-text dark:text-app-darkText mb-1">
                Unit Price (฿)
              </label>
              <input
                type="number"
                min="0"
                value={itemPrice}
                onChange={(e) => setItemPrice(Math.max(0, Number(e.target.value)))}
                className="w-full h-9 px-3 rounded-xl border border-app-border dark:border-app-darkBorder bg-white dark:bg-app-darkBg font-mono text-xs text-app-text dark:text-app-darkText outline-none focus:border-brand-blue"
              />
            </div>

            {/* Lot */}
            <div>
              <label className="block font-semibold text-app-text dark:text-app-darkText mb-1">
                Lot Number
              </label>
              <input
                type="text"
                value={itemLot}
                onChange={(e) => setItemLot(e.target.value)}
                placeholder="e.g. L260908"
                className="w-full h-9 px-3 rounded-xl border border-app-border dark:border-app-darkBorder bg-white dark:bg-app-darkBg text-xs font-mono text-app-text dark:text-app-darkText outline-none focus:border-brand-blue"
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
                placeholder="e.g. B260908"
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

            {/* Supplier */}
            <div>
              <label className="block font-semibold text-app-text dark:text-app-darkText mb-1">
                Supplier
              </label>
              <input
                type="text"
                value={itemSupplier}
                onChange={(e) => setItemSupplier(e.target.value)}
                placeholder="Supplier name"
                className="w-full h-9 px-3 rounded-xl border border-app-border dark:border-app-darkBorder bg-white dark:bg-app-darkBg text-xs text-app-text dark:text-app-darkText outline-none focus:border-brand-blue"
              />
            </div>

            {/* Type */}
            <div>
              <label className="block font-semibold text-app-text dark:text-app-darkText mb-1">
                Type
              </label>
              <input
                type="text"
                value={itemType}
                onChange={(e) => setItemType(e.target.value)}
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
              <span>Add Item Line</span>
            </button>
          </div>
        </form>

        {/* 3. ITEM LINES TABLE */}
        <div className="p-4 rounded-2xl bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder shadow-subtle space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-app-border dark:border-app-darkBorder">
            <h4 className="text-xs font-bold uppercase tracking-wider text-app-text dark:text-app-darkText">
              Document Item Lines ({itemLines.length})
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
                  <th className="py-2.5 px-3">Lot / Batch</th>
                  <th className="py-2.5 px-3 text-right">Qty</th>
                  <th className="py-2.5 px-3 text-right">Price</th>
                  <th className="py-2.5 px-3 text-right">Total (฿)</th>
                  <th className="py-2.5 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border dark:divide-app-darkBorder bg-white dark:bg-app-darkSurface">
                {itemLines.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-app-muted">
                      No material lines added yet. Use "Load PR Items" or "Add Item Line" above.
                    </td>
                  </tr>
                ) : (
                  itemLines.map((line, idx) => (
                    <tr key={idx} className="hover:bg-app-bg/50 dark:hover:bg-app-darkBorder/30">
                      <td className="py-2.5 px-3 text-app-muted font-mono">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-brand-blue">{line.materialCode}</td>
                      <td className="py-2.5 px-3">
                        <span className="font-medium text-app-text dark:text-app-darkText block truncate max-w-xs">{line.description}</span>
                        {line.supplier && <span className="text-[10px] text-app-muted block">{line.supplier}</span>}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-app-secondary">
                        {line.lot || '-'}/{line.batchNumber || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-gr">
                        +{line.quantity} {line.unit}
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Drawer>
  );
};
