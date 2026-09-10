import React, { useState, useEffect } from 'react';
import { Drawer } from '../common/Drawer';
import { Material, TransactionItem } from '../../types/stock';
import { useStock } from '../../context/StockContext';
import { useToast } from '../../context/ToastContext';
import { ItemFinderModal } from './ItemFinderModal';
import { getCurrentStock, checkDuplicatePrId } from '../../utils/stockCalculation';
import {
  PackagePlus,
  Plus,
  Trash2,
  Building2,
  Search,
  Lock,
  Package,
  Layers,
  FileText,
  Truck,
  Hash,
  Info,
  X,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const GR_ITEM_TYPES = [
  'คืนของ',
  'Adjust Stock',
  'รับ SP นอกระบบ',
  'รับ SP จาก Project',
] as const;

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
  const { materials, transactions, transactionDocuments, createDocumentGoodsReceipt } = useStock();
  const { addToast } = useToast();

  // Document Header State
  const [plant, setPlant] = useState<string>('DEMO');
  const [prId, setPrId] = useState<string>('');
  const [prIdError, setPrIdError] = useState<string>('');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [documentComment, setDocumentComment] = useState<string>('');

  // Added Item Lines State
  const [itemLines, setItemLines] = useState<Omit<TransactionItem, 'id'>[]>([]);

  // Item Finder Modal State
  const [isFinderOpen, setIsFinderOpen] = useState(false);

  // Selected Material for adding line
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);

  // Draft Material Line Inputs
  const [itemQty, setItemQty] = useState<number | string>(1);
  const [itemPrice, setItemPrice] = useState<number | string>(0);
  const [itemType, setItemType] = useState<string>('คืนของ');
  const [itemLot, setItemLot] = useState<string>('');
  const [itemBatch, setItemBatch] = useState<string>('');
  const [itemSerial, setItemSerial] = useState<string>('');
  const [itemSupplier, setItemSupplier] = useState<string>('');
  const [itemLocation, setItemLocation] = useState<string>('MAIN');
  const [itemBin, setItemBin] = useState<string>('');
  const [itemComment, setItemComment] = useState<string>('');

  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Helper to populate draft fields from a selected Material
  const populateFromMaterial = (mat: Material) => {
    setSelectedMaterial(mat);
    setItemPrice(mat.standardPrice || 0);
    setItemLocation(mat.storageLocation || 'MAIN');
    setItemBin(mat.storageBin || '');
    setItemType('คืนของ');
    const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    setItemBatch(`B${dateStr}`);
    setItemLot('');
    setItemSerial('');
    setItemQty(1);
    setItemSupplier('');
    setItemComment('');
  };

  useEffect(() => {
    if (isOpen) {
      setPlant(preSelectedMaterial ? preSelectedMaterial.plant : 'DEMO');
      setPrId('');
      setPrIdError('');
      setReferenceNumber(`PO-2026-${Math.floor(1000 + Math.random() * 9000)}`);
      setDocumentComment('');
      setError('');
      setIsFinderOpen(false);

      if (preSelectedMaterial) {
        populateFromMaterial(preSelectedMaterial);
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
            type: 'คืนของ',
            supplier: '',
            storageLocation: preSelectedMaterial.storageLocation || 'MAIN',
            storageBin: preSelectedMaterial.storageBin || '',
            unit: preSelectedMaterial.unit || 'EA',
            totalPrice: preSelectedMaterial.standardPrice || 0,
          },
        ]);
      } else {
        setItemLines([]);
        if (materials.length > 0) {
          populateFromMaterial(materials[0]);
        } else {
          setSelectedMaterial(null);
        }
      }
    }
  }, [isOpen, preSelectedMaterial, materials]);

  // When a material is selected from the Item Finder Modal
  const handleSelectFromFinder = (mat: Material) => {
    populateFromMaterial(mat);
    // Align header plant if user hasn't modified it
    if (mat.plant && mat.plant !== plant) {
      setPlant(mat.plant);
    }
  };

  // Add individual item to document line items
  const handleAddItemLine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMaterial) {
      setError('Please select a material using the Item Finder.');
      return;
    }
    const numQty = typeof itemQty === 'number' ? itemQty : Number(itemQty);
    if (!numQty || isNaN(numQty) || numQty <= 0) {
      setError('Receipt Quantity must be greater than 0.');
      return;
    }

    const numPrice = typeof itemPrice === 'number' ? itemPrice : (Number(itemPrice) || 0);
    const lineTotal = numQty * numPrice;
    const newLine: Omit<TransactionItem, 'id'> = {
      materialId: selectedMaterial.id,
      materialCode: selectedMaterial.materialCode,
      description: selectedMaterial.description,
      lot: itemLot.trim() || undefined,
      batchNumber: itemBatch.trim() || undefined,
      serialNumber: itemSerial.trim() || undefined,
      quantity: numQty,
      price: numPrice,
      type: itemType, // Selected GR Type: คืนของ | Adjust Stock | รับ SP นอกระบบ | รับ SP จาก Project
      supplier: itemSupplier.trim() || undefined,
      storageLocation: itemLocation || selectedMaterial.storageLocation,
      storageBin: itemBin || selectedMaterial.storageBin,
      comment: itemComment.trim() || undefined,
      unit: selectedMaterial.unit || 'EA',
      totalPrice: lineTotal,
    };

    setItemLines(prev => [...prev, newLine]);
    setError('');

    // Reset draft input for next item
    setItemQty(1);
    setItemSerial('');
    setItemComment('');
    addToast(`Added ${selectedMaterial.materialCode} (${itemType}) to Material Lines`, 'info');
  };

  const handleRemoveLine = (index: number) => {
    setItemLines(prev => prev.filter((_, i) => i !== index));
  };

  // Total summary calculations
  const totalQuantity = itemLines.reduce((sum, item) => sum + item.quantity, 0);
  const totalValue = itemLines.reduce((sum, item) => sum + (item.totalPrice || item.quantity * item.price), 0);

  const handlePrIdChange = (val: string) => {
    setPrId(val);
    if (val.trim()) {
      if (checkDuplicatePrId(val, transactionDocuments, transactions)) {
        setPrIdError('PR ID already exists in the system.');
      } else {
        setPrIdError('');
      }
    } else {
      setPrIdError('');
    }
  };

  const handlePrIdBlur = () => {
    if (prId.trim()) {
      if (checkDuplicatePrId(prId, transactionDocuments, transactions)) {
        setPrIdError('PR ID already exists in the system.');
      } else {
        setPrIdError('');
      }
    } else {
      setPrIdError('');
    }
  };

  // Submit entire document
  const handleSubmitDocument = () => {
    if (itemLines.length === 0) {
      setError('Please add at least one material line before submitting.');
      return;
    }

    if (prId.trim()) {
      if (checkDuplicatePrId(prId, transactionDocuments, transactions)) {
        setPrIdError('PR ID already exists in the system.');
        setError('PR ID already exists in the system.');
        return;
      }
    }

    if (prIdError) {
      setError(prIdError);
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

        addToast(
          `Goods Receipt Document ${result.document.transactionNumber} created with ${itemLines.length} items!`,
          'success'
        );
        onClose();
      } else {
        setError(result.error || 'Failed to submit Goods Receipt document.');
      }
    }, 150);
  };

  // Current stock of selected material for reference
  const currentStock = selectedMaterial
    ? getCurrentStock(selectedMaterial.id, transactions)
    : 0;

  return (
    <>
      <Drawer
        isOpen={isOpen}
        onClose={onClose}
        title="Create Goods Receipt (GR) Document"
        subtitle="Receive multiple inventory materials into plant stock under one document header."
        widthClass="max-w-4xl"
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
                disabled={isSubmitting || itemLines.length === 0 || Boolean(prIdError)}
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

          {/* 1. DOCUMENT HEADER SECTION (NO GR NUMBER DISPLAYED, CLEAN PR ID INPUT) */}
          <div className="p-4 rounded-2xl bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder shadow-subtle space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-app-border dark:border-app-darkBorder">
              <h4 className="text-xs font-bold uppercase tracking-wider text-app-text dark:text-app-darkText flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-brand-blue" />
                <span>Document Header Details</span>
              </h4>
              <span className="text-[10px] text-app-muted font-medium">
                GR Number will be generated automatically on submit
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

              {/* PR ID (Manual Text Input Only) with Duplicate Validation */}
              <div>
                <label className="block font-semibold text-app-text dark:text-app-darkText mb-1">
                  PR ID (Purchase Requisition ID)
                </label>
                <input
                  type="text"
                  value={prId}
                  onChange={(e) => handlePrIdChange(e.target.value)}
                  onBlur={handlePrIdBlur}
                  placeholder="e.g. PR00001234"
                  className={`w-full h-9 px-3 rounded-xl border bg-white dark:bg-app-darkBg text-xs font-mono text-app-text dark:text-app-darkText outline-none transition-colors ${
                    prIdError
                      ? 'border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                      : 'border-app-border dark:border-app-darkBorder focus:border-brand-blue'
                  }`}
                />
                {prIdError && (
                  <p className="mt-1 text-[11px] font-medium text-rose-500 flex items-center gap-1">
                    <span>{prIdError}</span>
                  </p>
                )}
              </div>

              {/* Reference Number / PO No. */}
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

            {/* Document Comment */}
            <div className="pt-1">
              <label className="block font-semibold text-app-text dark:text-app-darkText mb-1 text-xs">
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

          {/* 2. ADD MATERIAL LINE SECTION WITH ITEM FINDER */}
          <form
            onSubmit={handleAddItemLine}
            className="p-4 rounded-2xl bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder shadow-subtle space-y-3.5"
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

            {/* ROW 1: Material Code with Item Finder Button & Description */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              {/* Material Code + Finder Trigger */}
              <div className="sm:col-span-1">
                <label className="block font-semibold text-app-text dark:text-app-darkText mb-1">
                  Material Code *
                </label>
                <div className="flex items-center gap-1.5">
                  <div className="flex-1 h-9 px-3 rounded-xl border border-app-border dark:border-app-darkBorder bg-slate-50 dark:bg-slate-900/60 font-mono font-bold text-xs text-brand-blue flex items-center truncate">
                    {selectedMaterial ? selectedMaterial.materialCode : 'Select item...'}
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsFinderOpen(true)}
                    className="h-9 px-3 rounded-xl bg-brand-softBlue dark:bg-blue-950 text-brand-blue border border-brand-blue/30 text-xs font-bold hover:bg-brand-blue hover:text-white transition-all flex items-center gap-1 shrink-0 shadow-sm"
                    title="Open Material Finder"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>Finder</span>
                  </button>
                </div>
              </div>

              {/* Description (Auto-filled from Master Data) */}
              <div className="sm:col-span-2">
                <label className="block font-semibold text-app-text dark:text-app-darkText mb-1">
                  Description
                </label>
                <input
                  type="text"
                  readOnly
                  value={selectedMaterial ? selectedMaterial.description : ''}
                  placeholder="Material description"
                  className="w-full h-9 px-3 rounded-xl border border-app-border dark:border-app-darkBorder bg-slate-50 dark:bg-slate-900/60 text-xs font-medium text-app-text dark:text-app-darkText outline-none"
                />
              </div>
            </div>

            {/* ROW 2: GR Movement Type Dropdown, Unit, Current Quantity, Standard Price */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              {/* Type Dropdown */}
              <div>
                <label className="block font-semibold text-app-text dark:text-app-darkText mb-1">
                  Type *
                </label>
                <select
                  value={itemType}
                  onChange={(e) => setItemType(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border border-app-border dark:border-app-darkBorder bg-white dark:bg-app-darkBg text-xs font-semibold text-app-text dark:text-app-darkText outline-none focus:border-brand-blue"
                >
                  {GR_ITEM_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* Unit */}
              <div>
                <label className="block font-semibold text-app-text dark:text-app-darkText mb-1">
                  Unit
                </label>
                <input
                  type="text"
                  readOnly
                  value={selectedMaterial ? selectedMaterial.unit : ''}
                  className="w-full h-9 px-3 rounded-xl border border-app-border dark:border-app-darkBorder bg-slate-50 dark:bg-slate-900/60 text-xs font-mono font-bold text-app-text dark:text-app-darkText outline-none"
                />
              </div>

              {/* Current Quantity Reference */}
              <div>
                <label className="block font-semibold text-app-text dark:text-app-darkText mb-1">
                  Current Quantity
                </label>
                <div className="w-full h-9 px-3 rounded-xl border border-app-border dark:border-app-darkBorder bg-slate-50 dark:bg-slate-900/60 text-xs font-mono font-bold text-app-text dark:text-app-darkText flex items-center justify-between">
                  <span>{currentStock.toLocaleString()}</span>
                  <span className="text-[10px] text-app-muted font-normal">{selectedMaterial?.unit || ''}</span>
                </div>
              </div>

              {/* Standard Price / Unit Price */}
              <div>
                <label className="block font-semibold text-app-text dark:text-app-darkText mb-1">
                  Standard Price (฿)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={itemPrice}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '') {
                      setItemPrice('');
                    } else {
                      const parsed = parseFloat(val);
                      setItemPrice(isNaN(parsed) ? '' : parsed);
                    }
                  }}
                  onBlur={() => {
                    if (itemPrice === '' || Number(itemPrice) < 0) {
                      setItemPrice(0);
                    }
                  }}
                  className="w-full h-9 px-3 rounded-xl border border-app-border dark:border-app-darkBorder bg-white dark:bg-app-darkBg font-mono text-xs font-semibold text-app-text dark:text-app-darkText outline-none focus:border-brand-blue"
                />
              </div>
            </div>

            {/* ROW 3: SLoc, Storage Bin, Qty to Receive */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              {/* SLoc */}
              <div>
                <label className="block font-semibold text-app-text dark:text-app-darkText mb-1">
                  SLoc (Storage Location)
                </label>
                <input
                  type="text"
                  value={itemLocation}
                  onChange={(e) => setItemLocation(e.target.value.toUpperCase())}
                  placeholder="e.g. STORE01"
                  className="w-full h-9 px-3 rounded-xl border border-app-border dark:border-app-darkBorder bg-white dark:bg-app-darkBg text-xs font-mono text-app-text dark:text-app-darkText outline-none focus:border-brand-blue"
                />
              </div>

              {/* Storage Bin */}
              <div>
                <label className="block font-semibold text-app-text dark:text-app-darkText mb-1">
                  Storage Bin
                </label>
                <input
                  type="text"
                  value={itemBin}
                  onChange={(e) => setItemBin(e.target.value.toUpperCase())}
                  placeholder="e.g. A-01-02"
                  className="w-full h-9 px-3 rounded-xl border border-app-border dark:border-app-darkBorder bg-white dark:bg-app-darkBg text-xs font-mono text-app-text dark:text-app-darkText outline-none focus:border-brand-blue"
                />
              </div>

              {/* Qty to Receive */}
              <div>
                <label className="block font-semibold text-app-text dark:text-app-darkText mb-1">
                  Qty to Receive *
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={itemQty}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '') {
                      setItemQty('');
                    } else {
                      const parsed = parseInt(val, 10);
                      setItemQty(isNaN(parsed) ? '' : parsed);
                    }
                  }}
                  onBlur={() => {
                    if (itemQty === '' || Number(itemQty) < 1) {
                      setItemQty(1);
                    }
                  }}
                  className="w-full h-9 px-3 rounded-xl border border-app-border dark:border-app-darkBorder bg-white dark:bg-app-darkBg font-mono text-xs font-bold text-gr outline-none focus:border-gr"
                />
              </div>
            </div>

            {/* ROW 4: Lot, Batch No., S/N */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-app-text dark:text-app-darkText mb-1">
                  Lot
                </label>
                <input
                  type="text"
                  value={itemLot}
                  onChange={(e) => setItemLot(e.target.value)}
                  placeholder="e.g. LOT-A"
                  className="w-full h-9 px-3 rounded-xl border border-app-border dark:border-app-darkBorder bg-white dark:bg-app-darkBg text-xs font-mono text-app-text dark:text-app-darkText outline-none focus:border-brand-blue"
                />
              </div>

              <div>
                <label className="block font-semibold text-app-text dark:text-app-darkText mb-1">
                  Batch No.
                </label>
                <input
                  type="text"
                  value={itemBatch}
                  onChange={(e) => setItemBatch(e.target.value.toUpperCase())}
                  placeholder="e.g. B260908"
                  className="w-full h-9 px-3 rounded-xl border border-app-border dark:border-app-darkBorder bg-white dark:bg-app-darkBg text-xs font-mono text-app-text dark:text-app-darkText outline-none focus:border-brand-blue"
                />
              </div>

              <div>
                <label className="block font-semibold text-app-text dark:text-app-darkText mb-1">
                  Serial Number (S/N)
                </label>
                <input
                  type="text"
                  value={itemSerial}
                  onChange={(e) => setItemSerial(e.target.value)}
                  placeholder="Optional S/N"
                  className="w-full h-9 px-3 rounded-xl border border-app-border dark:border-app-darkBorder bg-white dark:bg-app-darkBg text-xs font-mono text-app-text dark:text-app-darkText outline-none focus:border-brand-blue"
                />
              </div>
            </div>

            {/* ROW 5: Supplier & Comment */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
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

              <div>
                <label className="block font-semibold text-app-text dark:text-app-darkText mb-1">
                  Comment
                </label>
                <input
                  type="text"
                  value={itemComment}
                  onChange={(e) => setItemComment(e.target.value)}
                  placeholder="Item line notes"
                  className="w-full h-9 px-3 rounded-xl border border-app-border dark:border-app-darkBorder bg-white dark:bg-app-darkBg text-xs text-app-text dark:text-app-darkText outline-none focus:border-brand-blue"
                />
              </div>
            </div>

            {/* Add Material Line Button */}
            <div className="flex items-center justify-end pt-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setItemQty(1);
                  setItemType('คืนของ');
                  setItemLot('');
                  setItemSerial('');
                  setItemSupplier('');
                  setItemComment('');
                }}
                className="h-9 px-3.5 rounded-xl border border-app-border dark:border-app-darkBorder text-app-secondary hover:text-app-text text-xs font-semibold transition-colors"
              >
                Clear
              </button>
              <button
                type="submit"
                className="h-9 px-4 rounded-xl bg-brand-blue hover:bg-brand-darkBlue text-white text-xs font-bold transition-all shadow-subtle flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Material Line</span>
              </button>
            </div>
          </form>

          {/* 3. ITEM LINES TABLE */}
          <div className="p-4 rounded-2xl bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder shadow-subtle space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-app-border dark:border-app-darkBorder">
              <h4 className="text-xs font-bold uppercase tracking-wider text-app-text dark:text-app-darkText">
                Document Material Lines ({itemLines.length})
              </h4>
              <span className="text-[11px] font-mono text-app-muted">
                Total Value: ฿{totalValue.toLocaleString()}
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-app-border dark:border-app-darkBorder max-h-64">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-app-bg dark:bg-app-darkBg text-app-secondary dark:text-app-darkSecondary uppercase font-semibold text-[10px] tracking-wider border-b border-app-border dark:border-app-darkBorder">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Material Code</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3 text-right">Qty</th>
                    <th className="py-2.5 px-3 text-right">Unit Price</th>
                    <th className="py-2.5 px-3 text-right">Total</th>
                    <th className="py-2.5 px-3">Batch / Lot</th>
                    <th className="py-2.5 px-3">SLoc / Bin</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-app-border dark:divide-app-darkBorder">
                  {itemLines.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-app-muted">
                        No material lines added yet. Use the Item Finder above to add materials.
                      </td>
                    </tr>
                  ) : (
                    itemLines.map((item, idx) => (
                      <tr key={idx} className="hover:bg-app-bg/50 dark:hover:bg-app-darkBorder/30">
                        <td className="py-2 px-3 font-mono text-app-muted">{idx + 1}</td>
                        <td className="py-2 px-3 font-mono font-bold text-brand-blue">
                          {item.materialCode}
                        </td>
                        <td className="py-2 px-3 text-app-text dark:text-app-darkText font-medium truncate max-w-xs">
                          {item.description}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-gr">
                          +{item.quantity} <span className="text-[10px] font-normal text-app-muted">{item.unit}</span>
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-app-text dark:text-app-darkText">
                          ฿{item.price.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                          ฿{(item.totalPrice || item.quantity * item.price).toLocaleString()}
                        </td>
                        <td className="py-2 px-3 font-mono text-app-secondary dark:text-app-darkSecondary">
                          {item.batchNumber || '-'}{item.lot ? ` / ${item.lot}` : ''}
                        </td>
                        <td className="py-2 px-3 font-mono text-app-secondary dark:text-app-darkSecondary">
                          {item.storageLocation || '-'}{item.storageBin ? ` / ${item.storageBin}` : ''}
                        </td>
                        <td className="py-2 px-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                            {item.type || 'คืนของ'}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveLine(idx)}
                            className="p-1 rounded-lg text-app-muted hover:text-gi hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            title="Remove Line"
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

      {/* ITEM FINDER MODAL */}
      <ItemFinderModal
        isOpen={isFinderOpen}
        onClose={() => setIsFinderOpen(false)}
        onSelectMaterial={handleSelectFromFinder}
        currentSelectedId={selectedMaterial?.id}
        plantFilter={plant}
      />
    </>
  );
};
