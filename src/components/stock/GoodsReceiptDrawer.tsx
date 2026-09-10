import React, { useState, useEffect } from 'react';
import { Material } from '../../types/stock';
import { Drawer } from '../common/Drawer';
import { NumericInput } from '../common/NumericInput';
import { useStock } from '../../context/StockContext';
import { useToast } from '../../context/ToastContext';
import {
  PlusCircle,
  ArrowRight,
  PackagePlus,
  Lock,
  Building2,
  Package,
  Layers,
  FileText,
  Truck,
  Hash,
  Barcode,
  Sparkles,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface GoodsReceiptDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  material: Material | null;
}

const GR_TYPES = [
  'คืนของ',
  'Adjust Stock',
  'รับ SP นอกระบบ',
  'รับ SP จาก Project',
] as const;

export const GoodsReceiptDrawer: React.FC<GoodsReceiptDrawerProps> = ({
  isOpen,
  onClose,
  material,
}) => {
  const { getItemStock, createGoodsReceipt } = useStock();
  const { addToast } = useToast();

  const [quantity, setQuantity] = useState<number>(1);
  const [price, setPrice] = useState<number>(0);
  const [type, setType] = useState<string>('Adjust Stock');
  const [lot, setLot] = useState<string>('');
  const [batchNo, setBatchNo] = useState<string>('');
  const [serialNumber, setSerialNumber] = useState<string>('');
  const [supplier, setSupplier] = useState<string>('');
  const [comment, setComment] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const currentStock = material ? getItemStock(material.id) : 0;
  const stockAfter = currentStock + (quantity > 0 ? quantity : 0);

  useEffect(() => {
    if (material) {
      setQuantity(1);
      setPrice(material.standardPrice || 0);
      setType('Adjust Stock');
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

  const handleQuickQty = (amount: number) => {
    setQuantity(prev => Math.max(1, prev + amount));
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity <= 0) {
      setError('Receipt quantity must be greater than zero (> 0)');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      const result = createGoodsReceipt({
        materialId: material.id,
        quantity,
        pricePerUnit: price,
        type,
        lotNo: lot.trim() || undefined,
        batchNo: batchNo.trim() || undefined,
        serialNo: serialNumber.trim() || undefined,
        supplier: supplier.trim() || undefined,
        comment: comment.trim() || undefined,
        process: 'Stock Balance > GR',
      });

      setIsSubmitting(false);

      if (result.success) {
        try {
          confetti({
            particleCount: 45,
            spread: 60,
            origin: { y: 0.8 },
            colors: ['#16A34A', '#2563EB', '#22C55E'],
          });
        } catch {}

        addToast(
          `Goods Receipt (+${quantity} ${material.unit}) completed for ${material.materialCode}`,
          'success'
        );
        onClose();
      } else {
        setError(result.error || 'Failed to process Goods Receipt');
      }
    }, 150);
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="GOODS RECEIPT (GR)"
      subtitle={`Item-level Stock Inward for ${material.materialCode}`}
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
            disabled={isSubmitting || quantity <= 0}
            className="px-5 py-2 text-xs font-bold text-white bg-gr hover:bg-green-700 rounded-xl shadow-md shadow-green-600/20 transition-all disabled:opacity-50 flex items-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{isSubmitting ? 'Submitting GR...' : 'Submit GR'}</span>
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
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/40 dark:to-green-950/40 border border-gr/30 flex items-center justify-between shadow-subtle">
          <div>
            <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider block">
              Current Stock
            </span>
            <span className="text-lg font-mono font-bold text-app-text dark:text-app-darkText">
              {currentStock} <span className="text-xs font-normal text-app-muted">{material.unit}</span>
            </span>
          </div>

          <div className="flex items-center gap-2 font-mono font-bold text-gr text-sm">
            <span>+</span>
            <span className="bg-white dark:bg-app-darkSurface px-2.5 py-1 rounded-lg border border-gr/30 shadow-sm">
              +{quantity > 0 ? quantity : 0}
            </span>
            <ArrowRight className="w-4 h-4 text-gr mx-1" />
          </div>

          <div className="text-right">
            <span className="text-[10px] font-bold text-gr uppercase tracking-wider block">
              After Transaction
            </span>
            <span className="text-xl font-mono font-bold text-gr">
              {stockAfter} <span className="text-xs font-normal text-gr/80">{material.unit}</span>
            </span>
          </div>
        </div>

        {/* EDITABLE FIELDS */}
        <div className="p-4 rounded-2xl bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder space-y-4 shadow-subtle">
          <h4 className="text-xs font-bold text-app-text dark:text-app-darkText uppercase tracking-wider pb-1.5 border-b border-app-border dark:border-app-darkBorder flex items-center gap-1.5">
            <PackagePlus className="w-4 h-4 text-gr" />
            <span>Goods Receipt Parameters</span>
          </h4>

          {/* Quantity & Quick Selector */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-app-secondary dark:text-app-darkSecondary uppercase tracking-wider">
                Receipt Quantity (Qty) <span className="text-gi">*</span>
              </label>
              <div className="flex items-center gap-1">
                {[1, 5, 10, 50, 100].map(inc => (
                  <button
                    key={inc}
                    type="button"
                    onClick={() => handleQuickQty(inc)}
                    className="px-2 py-0.5 text-[10px] font-mono font-bold bg-gr-bg dark:bg-gr-darkBg text-gr hover:bg-gr hover:text-white rounded-md transition-colors"
                  >
                    +{inc}
                  </button>
                ))}
              </div>
            </div>

            <NumericInput
              value={quantity}
              onChange={val => {
                setQuantity(val);
                if (val > 0) setError('');
              }}
              min={1}
              suffix={material.unit}
              error={error}
              required
            />
            {error && <p className="text-xs text-gi mt-1 font-medium">{error}</p>}
          </div>

          {/* Price & Type */}
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
                Type <span className="text-gi">*</span>
              </label>
              <select
                value={type}
                onChange={e => setType(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder rounded-lg text-app-text dark:text-app-darkText outline-none focus:border-brand-blue font-medium"
              >
                {GR_TYPES.map(opt => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
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
              placeholder="Optional remarks regarding stock receipt..."
              className="w-full px-3 py-2 text-xs sm:text-sm bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder rounded-lg text-app-text dark:text-app-darkText outline-none focus:border-brand-blue resize-none"
            />
          </div>
        </div>
      </form>
    </Drawer>
  );
};
