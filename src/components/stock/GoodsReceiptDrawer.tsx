import React, { useState, useEffect } from 'react';
import { Material } from '../../types/stock';
import { Drawer } from '../common/Drawer';
import { NumericInput } from '../common/NumericInput';
import { useStock } from '../../context/StockContext';
import { useToast } from '../../context/ToastContext';
import { PlusCircle, ArrowRight, PackagePlus } from 'lucide-react';
import confetti from 'canvas-confetti';

interface GoodsReceiptDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  material: Material | null;
}

export const GoodsReceiptDrawer: React.FC<GoodsReceiptDrawerProps> = ({
  isOpen,
  onClose,
  material,
}) => {
  const { getItemStock, createGoodsReceipt } = useStock();
  const { addToast } = useToast();

  const [quantity, setQuantity] = useState(1);
  const [pricePerUnit, setPricePerUnit] = useState(0);
  const [batchNo, setBatchNo] = useState("");
  const [serialNo, setSerialNo] = useState("");
  const [lotNo, setLotNo] = useState("");
  const [storageLocation, setStorageLocation] = useState("");
  const [storageBin, setStorageBin] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [process, setProcess] = useState("PO Receipt");
  const [comment, setComment] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const currentStock = material ? getItemStock(material.id) : 0;
  const stockAfter = currentStock + (quantity || 0);

  useEffect(() => {
    if (material) {
      setQuantity(1);
      setPricePerUnit(material.standardPrice || 0);
      const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
      setBatchNo(`B${dateStr}`);
      setSerialNo("");
      setLotNo("");
      setStorageLocation(material.storageLocation || "MAIN");
      setStorageBin(material.storageBin || "");
      setReferenceNo(`PO-2026-${Math.floor(1000 + Math.random() * 9000)}`);
      setProcess("PO Receipt");
      setComment("");
      setError("");
    }
  }, [material, isOpen]);

  if (!material) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity <= 0) {
      setError("Receipt quantity must be greater than 0");
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      const result = createGoodsReceipt({
        materialId: material.id,
        quantity,
        pricePerUnit,
        batchNo: batchNo.trim() || undefined,
        serialNo: serialNo.trim() || undefined,
        lotNo: lotNo.trim() || undefined,
        storageLocation: storageLocation.trim() || undefined,
        storageBin: storageBin.trim() || undefined,
        referenceNo: referenceNo.trim() || undefined,
        process: process.trim() || undefined,
        comment: comment.trim() || undefined,
      });

      setIsSubmitting(false);

      if (result.success) {
        // Trigger subtle celebration
        try {
          confetti({
            particleCount: 40,
            spread: 60,
            origin: { y: 0.8 },
            colors: ['#16A34A', '#2563EB', '#22C55E']
          });
        } catch {}

        addToast(`Goods Receipt (+${quantity} ${material.unit}) completed for ${material.materialCode}`, 'success');
        onClose();
      } else {
        setError(result.error || "Failed to process Goods Receipt");
      }
    }, 200);
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="GOODS RECEIPT (GR)"
      subtitle={`Receive physical stock into warehouse for ${material.materialCode}`}
      widthClass="max-w-xl"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-app-secondary dark:text-app-darkSecondary hover:text-app-text rounded-lg border border-app-border dark:border-app-darkBorder transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || quantity <= 0}
            className="px-5 py-2 text-xs font-semibold text-white bg-gr hover:bg-green-700 rounded-lg shadow-sm transition-all disabled:opacity-50 flex items-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{isSubmitting ? "Processing..." : "Confirm Goods Receipt"}</span>
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Material Summary Header Card */}
        <div className="p-4 rounded-2xl bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder shadow-subtle flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gr-bg dark:bg-gr-darkBg border border-gr/20 flex items-center justify-center shrink-0">
            <PackagePlus className="w-6 h-6 text-gr" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-xs bg-brand-softBlue dark:bg-blue-950/60 text-brand-blue px-2 py-0.5 rounded">
                {material.materialCode}
              </span>
              <span className="text-[11px] text-app-muted font-semibold">
                Plant: {material.plant}
              </span>
            </div>
            <p className="text-xs font-semibold text-app-text dark:text-app-darkText truncate mt-1">
              {material.description}
            </p>
          </div>
        </div>

        {/* Live Calculation Preview Banner */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-gr-bg to-emerald-50 dark:from-gr-darkBg dark:to-emerald-950/20 border border-gr/30 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-app-secondary dark:text-app-darkSecondary uppercase tracking-wider block">
              Current Stock
            </span>
            <span className="text-lg font-mono font-bold text-app-text dark:text-app-darkText">
              {currentStock} <span className="text-xs font-normal text-app-muted">{material.unit}</span>
            </span>
          </div>

          <div className="flex items-center gap-2 font-mono font-bold text-gr text-sm">
            <span>+</span>
            <span className="bg-white dark:bg-app-darkSurface px-2.5 py-1 rounded-lg border border-gr/30 shadow-sm">
              +{quantity || 0}
            </span>
            <ArrowRight className="w-4 h-4 text-gr mx-1" />
          </div>

          <div className="text-right">
            <span className="text-[10px] font-bold text-gr uppercase tracking-wider block">
              Stock After Receipt
            </span>
            <span className="text-xl font-mono font-bold text-gr">
              {stockAfter} <span className="text-xs font-normal text-gr/80">{material.unit}</span>
            </span>
          </div>
        </div>

        {/* Inputs */}
        <div className="p-4 rounded-2xl bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder space-y-3.5 shadow-subtle">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <NumericInput
              label="Receipt Quantity"
              required={true}
              suffix={material.unit}
              min={1}
              value={quantity}
              onChange={setQuantity}
              error={error}
            />

            <NumericInput
              label="Unit Price"
              prefix="฿"
              allowDecimals={true}
              min={0}
              value={pricePerUnit}
              onChange={setPricePerUnit}
            />

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
                Serial No. (S/N)
              </label>
              <input
                type="text"
                value={serialNo}
                onChange={e => setSerialNo(e.target.value)}
                placeholder="Optional serial"
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder rounded-lg font-mono text-app-text dark:text-app-darkText outline-none focus:border-brand-blue"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-app-secondary dark:text-app-darkSecondary mb-1 uppercase tracking-wider">
                Lot No.
              </label>
              <input
                type="text"
                value={lotNo}
                onChange={e => setLotNo(e.target.value)}
                placeholder="Optional lot"
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder rounded-lg font-mono text-app-text dark:text-app-darkText outline-none focus:border-brand-blue"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-app-secondary dark:text-app-darkSecondary mb-1 uppercase tracking-wider">
                Storage Location (SLoc)
              </label>
              <input
                type="text"
                value={storageLocation}
                onChange={e => setStorageLocation(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder rounded-lg font-mono text-app-text dark:text-app-darkText outline-none focus:border-brand-blue"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-app-secondary dark:text-app-darkSecondary mb-1 uppercase tracking-wider">
                Storage Bin
              </label>
              <input
                type="text"
                value={storageBin}
                onChange={e => setStorageBin(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder rounded-lg font-mono text-app-text dark:text-app-darkText outline-none focus:border-brand-blue"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-app-secondary dark:text-app-darkSecondary mb-1 uppercase tracking-wider">
                PO / Reference No.
              </label>
              <input
                type="text"
                value={referenceNo}
                onChange={e => setReferenceNo(e.target.value)}
                placeholder="e.g. PO-2026-001"
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder rounded-lg font-mono text-app-text dark:text-app-darkText outline-none focus:border-brand-blue"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-app-secondary dark:text-app-darkSecondary mb-1 uppercase tracking-wider">
                Process / Transaction Type
              </label>
              <input
                type="text"
                value={process}
                onChange={e => setProcess(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder rounded-lg text-app-text dark:text-app-darkText outline-none focus:border-brand-blue"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-app-secondary dark:text-app-darkSecondary mb-1 uppercase tracking-wider">
                Comment / Notes
              </label>
              <textarea
                rows={2}
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Reason or vendor receipt note..."
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder rounded-lg text-app-text dark:text-app-darkText outline-none focus:border-brand-blue"
              />
            </div>
          </div>
        </div>
      </form>
    </Drawer>
  );
};
