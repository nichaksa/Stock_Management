import React, { useState, useEffect } from 'react';
import { Material } from '../../types/stock';
import { Drawer } from '../common/Drawer';
import { NumericInput } from '../common/NumericInput';
import { useStock } from '../../context/StockContext';
import { useToast } from '../../context/ToastContext';
import { MinusCircle, ArrowRight, PackageMinus, AlertTriangle } from 'lucide-react';

interface GoodsIssueDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  material: Material | null;
}

const PROCESS_OPTIONS = [
  "Preventive Maintenance",
  "Breakdown Repair",
  "Line Changeover",
  "Engineering Modification",
  "Calibration Consumption",
  "General Issue",
];

export const GoodsIssueDrawer: React.FC<GoodsIssueDrawerProps> = ({
  isOpen,
  onClose,
  material,
}) => {
  const { getItemStock, createGoodsIssue } = useStock();
  const { addToast } = useToast();

  const [quantity, setQuantity] = useState(1);
  const [batchNo, setBatchNo] = useState("");
  const [serialNo, setSerialNo] = useState("");
  const [lotNo, setLotNo] = useState("");
  const [storageLocation, setStorageLocation] = useState("");
  const [storageBin, setStorageBin] = useState("");
  const [picklist, setPicklist] = useState("");
  const [process, setProcess] = useState("Preventive Maintenance");
  const [referenceNo, setReferenceNo] = useState("");
  const [comment, setComment] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const currentStock = material ? getItemStock(material.id) : 0;
  const isInsufficient = Boolean(material && quantity > currentStock);
  const stockAfter = Math.max(0, currentStock - (quantity || 0));

  useEffect(() => {
    if (material) {
      setQuantity(1);
      const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
      setBatchNo(`B${dateStr}`);
      setSerialNo("");
      setLotNo("");
      setStorageLocation(material.storageLocation || "MAIN");
      setStorageBin(material.storageBin || "");
      setPicklist(`PL-${Math.floor(10000 + Math.random() * 90000)}`);
      setProcess("Preventive Maintenance");
      setReferenceNo(`WO-${dateStr}-${Math.floor(10 + Math.random() * 90)}`);
      setComment("");
      setError("");
    }
  }, [material, isOpen]);

  if (!material) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity <= 0) {
      setError("Issue quantity must be greater than 0");
      return;
    }

    if (quantity > currentStock) {
      setError(`Insufficient Stock. Available: ${currentStock} ${material.unit}, Requested: ${quantity} ${material.unit}`);
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      const result = createGoodsIssue({
        materialId: material.id,
        quantity,
        batchNo: batchNo.trim() || undefined,
        serialNo: serialNo.trim() || undefined,
        lotNo: lotNo.trim() || undefined,
        storageLocation: storageLocation.trim() || undefined,
        storageBin: storageBin.trim() || undefined,
        picklist: picklist.trim() || undefined,
        process: process.trim() || undefined,
        referenceNo: referenceNo.trim() || undefined,
        comment: comment.trim() || undefined,
      });

      setIsSubmitting(false);

      if (result.success) {
        addToast(`Goods Issue (-${quantity} ${material.unit}) completed for ${material.materialCode}`, 'success');
        onClose();
      } else {
        setError(result.error || "Failed to process Goods Issue");
      }
    }, 200);
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="GOODS ISSUE (GI)"
      subtitle={`Issue physical stock out of warehouse for ${material.materialCode}`}
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
            disabled={isSubmitting || quantity <= 0 || isInsufficient || currentStock <= 0}
            className="px-5 py-2 text-xs font-semibold text-white bg-gi hover:bg-red-700 rounded-lg shadow-sm transition-all disabled:opacity-50 flex items-center gap-1.5"
          >
            <MinusCircle className="w-4 h-4" />
            <span>{isSubmitting ? "Processing..." : "Confirm Goods Issue"}</span>
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Material Summary Header Card */}
        <div className="p-4 rounded-2xl bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder shadow-subtle flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gi-bg dark:bg-gi-darkBg border border-gi/20 flex items-center justify-center shrink-0">
            <PackageMinus className="w-6 h-6 text-gi" />
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

        {/* Insufficient Stock Warning if quantity > currentStock */}
        {isInsufficient && (
          <div className="p-3.5 rounded-xl bg-gi-bg dark:bg-gi-darkBg border border-gi/30 flex items-start gap-3 animate-fade-in">
            <AlertTriangle className="w-5 h-5 text-gi shrink-0 mt-0.5" />
            <div className="text-xs text-gi">
              <p className="font-bold">Insufficient Stock</p>
              <p className="mt-0.5 font-mono">
                Available: {currentStock} {material.unit} | Requested: {quantity} {material.unit}
              </p>
              <p className="mt-1 text-[11px] text-gi/90">
                Negative stock balance is strictly prohibited by factory inventory control rules.
              </p>
            </div>
          </div>
        )}

        {/* Live Calculation Preview Banner */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-gi-bg to-red-50 dark:from-gi-darkBg dark:to-red-950/20 border border-gi/30 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-app-secondary dark:text-app-darkSecondary uppercase tracking-wider block">
              Current Stock
            </span>
            <span className="text-lg font-mono font-bold text-app-text dark:text-app-darkText">
              {currentStock} <span className="text-xs font-normal text-app-muted">{material.unit}</span>
            </span>
          </div>

          <div className="flex items-center gap-2 font-mono font-bold text-gi text-sm">
            <span>-</span>
            <span className="bg-white dark:bg-app-darkSurface px-2.5 py-1 rounded-lg border border-gi/30 shadow-sm">
              -{quantity || 0}
            </span>
            <ArrowRight className="w-4 h-4 text-gi mx-1" />
          </div>

          <div className="text-right">
            <span className="text-[10px] font-bold text-gi uppercase tracking-wider block">
              Stock After Issue
            </span>
            <span className={`text-xl font-mono font-bold ${isInsufficient ? 'text-gi underline' : 'text-app-text dark:text-app-darkText'}`}>
              {stockAfter} <span className="text-xs font-normal text-app-muted">{material.unit}</span>
            </span>
          </div>
        </div>

        {/* Inputs */}
        <div className="p-4 rounded-2xl bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder space-y-3.5 shadow-subtle">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <NumericInput
              label="Issue Quantity"
              required={true}
              suffix={material.unit}
              min={1}
              max={currentStock}
              value={quantity}
              onChange={setQuantity}
              error={error}
            />

            <div>
              <label className="block text-xs font-semibold text-app-secondary dark:text-app-darkSecondary mb-1 uppercase tracking-wider">
                Process / Requisition Type <span className="text-gi">*</span>
              </label>
              <select
                value={process}
                onChange={e => setProcess(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder rounded-lg text-app-text dark:text-app-darkText outline-none focus:border-brand-blue"
              >
                {PROCESS_OPTIONS.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-app-secondary dark:text-app-darkSecondary mb-1 uppercase tracking-wider">
                Work Order / Ref No.
              </label>
              <input
                type="text"
                value={referenceNo}
                onChange={e => setReferenceNo(e.target.value)}
                placeholder="e.g. WO-260908-01"
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder rounded-lg font-mono text-app-text dark:text-app-darkText outline-none focus:border-brand-blue"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-app-secondary dark:text-app-darkSecondary mb-1 uppercase tracking-wider">
                Picklist No.
              </label>
              <input
                type="text"
                value={picklist}
                onChange={e => setPicklist(e.target.value)}
                placeholder="e.g. PL-89012"
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder rounded-lg font-mono text-app-text dark:text-app-darkText outline-none focus:border-brand-blue"
              />
            </div>

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

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-app-secondary dark:text-app-darkSecondary mb-1 uppercase tracking-wider">
                Comment / Requisitioner Note
              </label>
              <textarea
                rows={2}
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Describe equipment tag or repair detail..."
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder rounded-lg text-app-text dark:text-app-darkText outline-none focus:border-brand-blue"
              />
            </div>
          </div>
        </div>
      </form>
    </Drawer>
  );
};
