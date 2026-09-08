import React, { useState, useEffect } from 'react';
import { Material } from '../../types/stock';
import { Drawer } from '../common/Drawer';
import { NumericInput } from '../common/NumericInput';
import { useStock } from '../../context/StockContext';
import { useToast } from '../../context/ToastContext';
import { Sliders, ArrowRight, CheckCircle2 } from 'lucide-react';

interface StockAdjustmentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  material: Material | null;
}

type AdjustmentMode = 'INCREASE' | 'DECREASE' | 'SET_ACTUAL';

const REASON_OPTIONS = [
  "Physical Stock Count Adjustment",
  "Damaged Goods Write-off",
  "Expired Material Scrap",
  "System Discrepancy Correction",
  "Vendor Return Calibration",
  "Audit Re-alignment",
];

export const StockAdjustmentDrawer: React.FC<StockAdjustmentDrawerProps> = ({
  isOpen,
  onClose,
  material,
}) => {
  const { getItemStock, createStockAdjustment } = useStock();
  const { addToast } = useToast();

  const [adjustmentType, setAdjustmentType] = useState<AdjustmentMode>('SET_ACTUAL');
  const [quantity, setQuantity] = useState(0);
  const [reason, setReason] = useState(REASON_OPTIONS[0]);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const currentStock = material ? getItemStock(material.id) : 0;

  useEffect(() => {
    if (material) {
      setAdjustmentType('SET_ACTUAL');
      setQuantity(currentStock);
      setReason(REASON_OPTIONS[0]);
      setComment("");
      setError("");
    }
  }, [material, currentStock, isOpen]);

  if (!material) return null;

  let delta = 0;
  let stockAfter = currentStock;

  if (adjustmentType === 'INCREASE') {
    delta = quantity || 0;
    stockAfter = currentStock + delta;
  } else if (adjustmentType === 'DECREASE') {
    delta = -(quantity || 0);
    stockAfter = Math.max(0, currentStock - (quantity || 0));
  } else if (adjustmentType === 'SET_ACTUAL') {
    delta = (quantity || 0) - currentStock;
    stockAfter = Math.max(0, quantity || 0);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (adjustmentType !== 'SET_ACTUAL' && quantity <= 0) {
      setError("Quantity must be greater than 0");
      return;
    }
    if (adjustmentType === 'SET_ACTUAL' && quantity < 0) {
      setError("Actual quantity cannot be negative");
      return;
    }
    if (delta === 0) {
      setError("Adjustment results in no change to current stock.");
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      const result = createStockAdjustment({
        materialId: material.id,
        adjustmentType,
        quantity,
        reason,
        comment: comment.trim() || undefined,
      });

      setIsSubmitting(false);

      if (result.success) {
        addToast(`Stock for ${material.materialCode} adjusted to ${stockAfter} ${material.unit}`, 'success');
        onClose();
      } else {
        setError(result.error || "Failed to adjust stock");
      }
    }, 200);
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="ADJUST STOCK"
      subtitle={`Calibrate physical ledger inventory for ${material.materialCode}`}
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
            disabled={isSubmitting || delta === 0}
            className="px-5 py-2 text-xs font-semibold text-white bg-brand-blue hover:bg-brand-hoverBlue rounded-lg shadow-sm transition-all disabled:opacity-50 flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isSubmitting ? "Processing..." : "Commit Stock Adjustment"}</span>
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Material Info Card */}
        <div className="p-4 rounded-2xl bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder shadow-subtle flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800/40 flex items-center justify-center shrink-0">
            <Sliders className="w-6 h-6 text-purple-600 dark:text-purple-400" />
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
        <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 border border-purple-200 dark:border-purple-800/40 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-app-secondary dark:text-app-darkSecondary uppercase tracking-wider block">
              Stock Before
            </span>
            <span className="text-lg font-mono font-bold text-app-text dark:text-app-darkText">
              {currentStock} <span className="text-xs font-normal text-app-muted">{material.unit}</span>
            </span>
          </div>

          <div className="flex items-center gap-2 font-mono font-bold text-sm">
            <span className={`px-2.5 py-1 rounded-lg border shadow-sm ${
              delta > 0
                ? 'bg-gr-bg text-gr border-gr/30'
                : delta < 0
                ? 'bg-gi-bg text-gi border-gi/30'
                : 'bg-white dark:bg-app-darkSurface text-app-muted border-app-border'
            }`}>
              {delta > 0 ? `+${delta}` : `${delta}`} {material.unit}
            </span>
            <ArrowRight className="w-4 h-4 text-purple-600 mx-1" />
          </div>

          <div className="text-right">
            <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider block">
              Stock After
            </span>
            <span className="text-xl font-mono font-bold text-purple-700 dark:text-purple-300">
              {stockAfter} <span className="text-xs font-normal text-purple-600/70">{material.unit}</span>
            </span>
          </div>
        </div>

        {/* Type Selector & Input */}
        <div className="p-4 rounded-2xl bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder space-y-3.5 shadow-subtle">
          <div>
            <label className="block text-xs font-semibold text-app-secondary dark:text-app-darkSecondary mb-1.5 uppercase tracking-wider">
              Adjustment Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { type: 'SET_ACTUAL' as AdjustmentMode, label: 'Set Actual Qty' },
                { type: 'INCREASE' as AdjustmentMode, label: 'Increase (+)' },
                { type: 'DECREASE' as AdjustmentMode, label: 'Decrease (-)' },
              ].map(mode => (
                <button
                  key={mode.type}
                  type="button"
                  onClick={() => {
                    setAdjustmentType(mode.type);
                    if (mode.type === 'SET_ACTUAL') setQuantity(currentStock);
                    else setQuantity(1);
                  }}
                  className={`py-2 px-2 text-xs font-semibold rounded-lg border transition-all ${
                    adjustmentType === mode.type
                      ? 'bg-brand-softBlue dark:bg-blue-950/60 border-brand-blue text-brand-blue shadow-sm'
                      : 'bg-white dark:bg-app-darkSurface border-app-border dark:border-app-darkBorder text-app-secondary hover:text-app-text hover:bg-app-bg'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          <NumericInput
            label={adjustmentType === 'SET_ACTUAL' ? 'New Actual Quantity' : 'Adjustment Delta Quantity'}
            required={true}
            suffix={material.unit}
            min={0}
            value={quantity}
            onChange={setQuantity}
            error={error}
          />

          <div>
            <label className="block text-xs font-semibold text-app-secondary dark:text-app-darkSecondary mb-1 uppercase tracking-wider">
              Adjustment Reason <span className="text-gi">*</span>
            </label>
            <select
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder rounded-lg text-app-text dark:text-app-darkText outline-none focus:border-brand-blue"
            >
              {REASON_OPTIONS.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-app-secondary dark:text-app-darkSecondary mb-1 uppercase tracking-wider">
              Audit Note / Observation
            </label>
            <textarea
              rows={3}
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Provide reason or audit log context..."
              className="w-full px-3 py-2 text-xs sm:text-sm bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder rounded-lg text-app-text dark:text-app-darkText outline-none focus:border-brand-blue"
            />
          </div>
        </div>
      </form>
    </Drawer>
  );
};
