import React, { useState, useEffect } from 'react';
import { Material } from '../../types/stock';
import { Drawer } from '../common/Drawer';
import { NumericInput } from '../common/NumericInput';
import { useStock } from '../../context/StockContext';
import { useToast } from '../../context/ToastContext';
import {
  MinusCircle,
  ArrowRight,
  PackageMinus,
  Lock,
  Building2,
  Package,
  Layers,
  FileText,
  Truck,
  AlertTriangle,
  Info,
} from 'lucide-react';

interface GoodsIssueDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  material: Material | null;
}

export const GoodsIssueDrawer: React.FC<GoodsIssueDrawerProps> = ({
  isOpen,
  onClose,
  material,
}) => {
  const { getItemStock, createGoodsIssue } = useStock();
  const { addToast } = useToast();

  // Qty must default to -1 and always remain negative
  const [qty, setQty] = useState<number>(-1);
  const [qtyInputStr, setQtyInputStr] = useState<string>('-1');
  const [price, setPrice] = useState<number>(0);
  const [type] = useState<string>('Adjust Stock'); // Fixed to 'Adjust Stock'
  const [lot, setLot] = useState<string>('');
  const [batchNo, setBatchNo] = useState<string>('');
  const [serialNumber, setSerialNumber] = useState<string>('');
  const [supplier, setSupplier] = useState<string>('');
  const [comment, setComment] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const currentStock = material ? getItemStock(material.id) : 0;
  // Live calculation: Qty is negative, so stockAfter is currentStock + qty
  const stockAfter = currentStock + (qty < 0 ? qty : 0);
  const isBelowZero = stockAfter < 0;
  const isInvalidQty = qty >= 0;

  useEffect(() => {
    if (material) {
      setQty(-1);
      setQtyInputStr('-1');
      setPrice(material.standardPrice || 0);
      const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
      setBatchNo(`B${dateStr}`);
      setLot('');
      setSerialNumber('');
      setSupplier('');
      setComment('');
      setError('');
    }
  }, [material, isOpen]);

  if (!material) return null;

  const handleQtyChange = (valStr: string) => {
    setQtyInputStr(valStr);
    setError('');

    // If user types standard positive number like "5", auto-format to negative "-5" or parse
    if (valStr.trim() === '' || valStr.trim() === '-') {
      setQty(0);
      return;
    }

    let parsed = parseInt(valStr, 10);
    if (!isNaN(parsed)) {
      if (parsed > 0) {
        // Enforce negative
        parsed = -parsed;
        setQtyInputStr(parsed.toString());
      }
      setQty(parsed);

      if (parsed >= 0) {
        setError('Qty must always remain negative (e.g. -1, -2, -5, -10). Positive or zero values are not allowed.');
      } else if (currentStock + parsed < 0) {
        setError(`Resulting stock cannot be below zero. Maximum available to issue is ${currentStock} ${material.unit}.`);
      }
    }
  };

  const handleQuickPreset = (negativeVal: number) => {
    const val = negativeVal > 0 ? -negativeVal : negativeVal;
    setQty(val);
    setQtyInputStr(val.toString());
    setError('');

    if (currentStock + val < 0) {
      setError(`Resulting stock cannot be below zero. Maximum available to issue is ${currentStock} ${material.unit}.`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (qty >= 0) {
      setError('Qty must always remain negative (e.g. -1, -2, -5, -10). Positive or zero values are not allowed.');
      return;
    }

    if (currentStock + qty < 0) {
      setError(`Insufficient stock. Resulting stock cannot be below zero (Current: ${currentStock} ${material.unit}, Attempted issue: ${Math.abs(qty)} ${material.unit}).`);
      return;
    }

    if (currentStock <= 0) {
      setError('Cannot perform Goods Issue. Current stock is 0.');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      const result = createGoodsIssue({
        materialId: material.id,
        quantity: Math.abs(qty),
        pricePerUnit: price,
        type: 'Adjust Stock',
        lotNo: lot.trim() || undefined,
        batchNo: batchNo.trim() || undefined,
        serialNo: serialNumber.trim() || undefined,
        supplier: supplier.trim() || undefined,
        comment: comment.trim() || undefined,
        process: 'Stock Balance > GI',
      });

      setIsSubmitting(false);

      if (result.success) {
        addToast(
          `Goods Issue (${qty} ${material.unit}) completed for ${material.materialCode}`,
          'success'
        );
        onClose();
      } else {
        setError(result.error || 'Failed to process Goods Issue');
      }
    }, 150);
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="GOODS ISSUE (GI)"
      subtitle={`Item-level Stock Outward for ${material.materialCode}`}
      widthClass="max-w-xl"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-app-secondary dark:text-app-darkSecondary hover:text-app-text rounded-xl border border-app-border dark:border-app-darkBorder hover:bg-app-bg dark:hover:bg-app-darkBorder/40 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || isInvalidQty || isBelowZero || currentStock <= 0}
            className="px-5 py-2 text-xs font-bold text-white bg-gi hover:bg-red-700 rounded-xl shadow-md shadow-red-600/20 transition-all disabled:opacity-50 flex items-center gap-1.5"
          >
            <MinusCircle className="w-4 h-4" />
            <span>{isSubmitting ? 'Submitting GI...' : 'Submit GI'}</span>
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* LOCKED READ-ONLY FIELDS SECTION */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-subtle space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>Locked Material Attributes (Read-Only)</span>
            </div>
            <span className="text-[10px] font-semibold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full">
              Item-Level Action
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Plant */}
            <div className="bg-white dark:bg-app-darkSurface p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
              <span className="text-[10px] font-bold uppercase tracking-wider text-app-muted flex items-center gap-1">
                <Building2 className="w-3 h-3" /> Plant
              </span>
              <p className="font-mono font-bold text-xs text-app-text dark:text-app-darkText mt-1">
                {material.plant}
              </p>
            </div>

            {/* Material Code */}
            <div className="bg-white dark:bg-app-darkSurface p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
              <span className="text-[10px] font-bold uppercase tracking-wider text-app-muted flex items-center gap-1">
                <Package className="w-3 h-3" /> Material
              </span>
              <p className="font-mono font-bold text-xs text-brand-blue mt-1">
                {material.materialCode}
              </p>
            </div>

            {/* Storage Location */}
            <div className="bg-white dark:bg-app-darkSurface p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
              <span className="text-[10px] font-bold uppercase tracking-wider text-app-muted flex items-center gap-1">
                <Layers className="w-3 h-3" /> Location / Bin
              </span>
              <p className="font-mono text-xs text-app-secondary dark:text-app-darkSecondary truncate mt-1">
                {material.storageLocation || '-'} / {material.storageBin || '-'}
              </p>
            </div>
          </div>

          {/* Description */}
          <div className="bg-white dark:bg-app-darkSurface p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
            <span className="text-[10px] font-bold uppercase tracking-wider text-app-muted flex items-center gap-1">
              <FileText className="w-3 h-3" /> Description
            </span>
            <p className="text-xs font-semibold text-app-text dark:text-app-darkText mt-0.5">
              {material.description}
            </p>
          </div>
        </div>

        {/* REAL-TIME PREVIEW BANNER */}
        <div className={`p-4 rounded-2xl border flex items-center justify-between shadow-subtle transition-all ${
          isBelowZero || currentStock <= 0
            ? 'bg-red-50 dark:bg-red-950/40 border-gi/50'
            : 'bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/40 dark:to-orange-950/40 border-gi/30'
        }`}>
          <div>
            <span className="text-[10px] font-bold text-app-secondary dark:text-app-darkSecondary uppercase tracking-wider block">
              Current Stock
            </span>
            <span className="text-lg font-mono font-bold text-app-text dark:text-app-darkText">
              {currentStock} <span className="text-xs font-normal text-app-muted">{material.unit}</span>
            </span>
          </div>

          <div className="flex items-center gap-2 font-mono font-bold text-gi text-sm">
            <span>GI</span>
            <span className="bg-white dark:bg-app-darkSurface px-2.5 py-1 rounded-lg border border-gi/30 shadow-sm text-gi">
              {qty < 0 ? qty : 0} {material.unit}
            </span>
            <ArrowRight className="w-4 h-4 text-gi mx-1" />
          </div>

          <div className="text-right">
            <span className="text-[10px] font-bold text-gi uppercase tracking-wider block">
              After Transaction
            </span>
            <span className={`text-xl font-mono font-bold ${isBelowZero ? 'text-gi underline' : 'text-app-text dark:text-app-darkText'}`}>
              {stockAfter} <span className="text-xs font-normal text-app-muted">{material.unit}</span>
            </span>
          </div>
        </div>

        {/* INSUFFICIENT STOCK WARNING */}
        {isBelowZero && (
          <div className="p-3.5 rounded-xl bg-gi-bg dark:bg-gi-darkBg border border-gi/30 flex items-start gap-3 animate-fade-in">
            <AlertTriangle className="w-5 h-5 text-gi shrink-0 mt-0.5" />
            <div className="text-xs text-gi">
              <p className="font-bold">Insufficient Stock Warning</p>
              <p className="mt-0.5 font-mono">
                Available: {currentStock} {material.unit} | Requested Issue: {Math.abs(qty)} {material.unit}
              </p>
              <p className="mt-1 text-[11px] text-gi/90">
                Prevented submission: Resulting stock would fall below zero ({stockAfter} {material.unit}).
              </p>
            </div>
          </div>
        )}

        {/* ZERO STOCK WARNING */}
        {currentStock <= 0 && (
          <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800 dark:text-amber-300">
              <p className="font-bold">Out of Stock</p>
              <p className="mt-0.5">
                Current available stock is 0. Goods Issue cannot be submitted for this material.
              </p>
            </div>
          </div>
        )}

        {/* EDITABLE FIELDS */}
        <div className="p-4 rounded-2xl bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder space-y-4 shadow-subtle">
          <h4 className="text-xs font-bold text-app-text dark:text-app-darkText uppercase tracking-wider pb-1.5 border-b border-app-border dark:border-app-darkBorder flex items-center gap-1.5">
            <PackageMinus className="w-4 h-4 text-gi" />
            <span>Goods Issue Parameters</span>
          </h4>

          {/* Quantity & Quick Selector */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-app-secondary dark:text-app-darkSecondary uppercase tracking-wider">
                Issue Quantity (Always Negative) <span className="text-gi">*</span>
              </label>
              <div className="flex items-center gap-1">
                {[-1, -2, -5, -10, -20].map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleQuickPreset(preset)}
                    className="px-2 py-0.5 text-[10px] font-mono font-bold bg-gi-bg dark:bg-gi-darkBg text-gi hover:bg-gi hover:text-white rounded-md transition-colors"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative flex items-center">
              <input
                type="text"
                value={qtyInputStr}
                onChange={e => handleQtyChange(e.target.value)}
                placeholder="e.g. -1, -2, -5"
                className={`w-full px-3 py-2 text-sm bg-white dark:bg-app-darkSurface border rounded-lg transition-colors outline-none font-mono pr-12 font-bold ${
                  error || isBelowZero || isInvalidQty
                    ? 'border-gi focus:ring-1 focus:ring-gi text-gi'
                    : 'border-app-border dark:border-app-darkBorder text-gi focus:border-brand-blue'
                }`}
              />
              <span className="absolute right-3 text-xs font-medium text-app-muted pointer-events-none">
                {material.unit}
              </span>
            </div>

            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-app-muted">
              <Info className="w-3.5 h-3.5 text-app-muted" />
              <span>Qty must always remain negative (e.g. -1, -2, -5, -10). Positive or zero is disallowed.</span>
            </div>

            {error && <p className="text-xs text-gi mt-1 font-medium">{error}</p>}
          </div>

          {/* Price & Fixed Type Dropdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <NumericInput
              label="Price (Unit Price)"
              prefix="฿"
              allowDecimals={true}
              min={0}
              value={price}
              onChange={setPrice}
            />

            <div>
              <label className="block text-xs font-semibold text-app-secondary dark:text-app-darkSecondary mb-1.5 uppercase tracking-wider">
                Type (Fixed) <span className="text-gi">*</span>
              </label>
              <select
                value={type}
                disabled={true}
                className="w-full px-3 py-2 text-sm bg-slate-100 dark:bg-slate-800 border border-app-border dark:border-app-darkBorder rounded-lg text-app-text dark:text-app-darkText outline-none cursor-not-allowed font-medium"
              >
                <option value="Adjust Stock">Adjust Stock</option>
              </select>
            </div>
          </div>

          {/* Batch, Lot, Serial Number */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-app-secondary dark:text-app-darkSecondary mb-1 uppercase tracking-wider">
                Batch No.
              </label>
              <input
                type="text"
                value={batchNo}
                onChange={e => setBatchNo(e.target.value.toUpperCase())}
                placeholder="e.g. B260908"
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder rounded-lg font-mono text-app-text dark:text-app-darkText outline-none focus:border-brand-blue"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-app-secondary dark:text-app-darkSecondary mb-1 uppercase tracking-wider">
                Lot
              </label>
              <input
                type="text"
                value={lot}
                onChange={e => setLot(e.target.value)}
                placeholder="e.g. LOT-A"
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder rounded-lg font-mono text-app-text dark:text-app-darkText outline-none focus:border-brand-blue"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-app-secondary dark:text-app-darkSecondary mb-1 uppercase tracking-wider">
                Serial Number
              </label>
              <input
                type="text"
                value={serialNumber}
                onChange={e => setSerialNumber(e.target.value)}
                placeholder="Optional S/N"
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder rounded-lg font-mono text-app-text dark:text-app-darkText outline-none focus:border-brand-blue"
              />
            </div>
          </div>

          {/* Supplier */}
          <div>
            <label className="block text-xs font-semibold text-app-secondary dark:text-app-darkSecondary mb-1 uppercase tracking-wider flex items-center gap-1">
              <Truck className="w-3.5 h-3.5 text-app-muted" /> Supplier
            </label>
            <input
              type="text"
              value={supplier}
              onChange={e => setSupplier(e.target.value)}
              placeholder="e.g. SKF Bearing Co., Ltd."
              className="w-full px-3 py-2 text-xs sm:text-sm bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder rounded-lg text-app-text dark:text-app-darkText outline-none focus:border-brand-blue"
            />
          </div>

          {/* Comment */}
          <div>
            <label className="block text-xs font-semibold text-app-secondary dark:text-app-darkSecondary mb-1 uppercase tracking-wider">
              Comment / Audit Note
            </label>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              rows={2}
              placeholder="Optional remarks regarding stock issue..."
              className="w-full px-3 py-2 text-xs sm:text-sm bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder rounded-lg text-app-text dark:text-app-darkText outline-none focus:border-brand-blue resize-none"
            />
          </div>
        </div>
      </form>
    </Drawer>
  );
};
