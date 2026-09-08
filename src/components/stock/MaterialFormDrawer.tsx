import React, { useState, useEffect } from 'react';
import { Material } from '../../types/stock';
import { Drawer } from '../common/Drawer';
import { NumericInput } from '../common/NumericInput';
import { useStock } from '../../context/StockContext';
import { useToast } from '../../context/ToastContext';
import { Upload, Image as ImageIcon, CheckCircle2, AlertCircle } from 'lucide-react';

interface MaterialFormDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialMaterial?: Material | null; // If present -> Edit mode, if null -> Add mode
}

const PLANT_OPTIONS = ["DEMO", "PLANT-01", "PLANT-02"];
const TYPE_OPTIONS = ["Spare Part", "Mechanical", "Electrical", "Instrument", "Pneumatic", "Consumable", "Raw Material"];
const UNIT_OPTIONS = ["EA", "PC", "SET", "BOX", "KG", "METER", "ROLL"];
const SLOC_OPTIONS = ["MAIN", "SPARE", "MAINT", "WH01", "WH02", "BUFFER"];

export const MaterialFormDrawer: React.FC<MaterialFormDrawerProps> = ({
  isOpen,
  onClose,
  initialMaterial,
}) => {
  const isEdit = Boolean(initialMaterial);
  const { addMaterial, updateMaterial } = useStock();
  const { addToast } = useToast();

  const [plant, setPlant] = useState("DEMO");
  const [materialCode, setMaterialCode] = useState("");
  const [description, setDescription] = useState("");
  const [materialType, setMaterialType] = useState("Spare Part");
  const [unit, setUnit] = useState("EA");

  const [standardPrice, setStandardPrice] = useState(0);
  const [openingQty, setOpeningQty] = useState(0);

  const [min, setMin] = useState(1);
  const [max, setMax] = useState(10);
  const [rop, setRop] = useState(3);
  const [leadTime, setLeadTime] = useState(7);

  const [storageLocation, setStorageLocation] = useState("MAIN");
  const [storageBin, setStorageBin] = useState("");
  const [image, setImage] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialMaterial) {
      setPlant(initialMaterial.plant);
      setMaterialCode(initialMaterial.materialCode);
      setDescription(initialMaterial.description);
      setMaterialType(initialMaterial.materialType);
      setUnit(initialMaterial.unit);
      setStandardPrice(initialMaterial.standardPrice || 0);
      setMin(initialMaterial.min);
      setMax(initialMaterial.max);
      setRop(initialMaterial.rop);
      setLeadTime(initialMaterial.leadTime || 0);
      setStorageLocation(initialMaterial.storageLocation || "MAIN");
      setStorageBin(initialMaterial.storageBin || "");
      setImage(initialMaterial.image || "");
    } else {
      // Defaults for new material
      setPlant("DEMO");
      setMaterialCode("");
      setDescription("");
      setMaterialType("Spare Part");
      setUnit("EA");
      setStandardPrice(0);
      setOpeningQty(0);
      setMin(2);
      setMax(10);
      setRop(4);
      setLeadTime(14);
      setStorageLocation("MAIN");
      setStorageBin("A01-01");
      setImage("");
    }
    setErrors({});
  }, [initialMaterial, isOpen]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.match(/^image\/(png|jpeg|webp)$/)) {
      addToast('Supported image formats: PNG, JPG, WebP', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const validate = () => {
    const errs: Record<string, string> = {};

    if (!plant) errs.plant = "Plant is required";
    if (!materialCode.trim()) errs.materialCode = "Material Code is required";
    if (!description.trim()) errs.description = "Description is required";
    if (!materialType) errs.materialType = "Material Type is required";
    if (!unit) errs.unit = "Unit of measure is required";

    if (standardPrice < 0) errs.standardPrice = "Price must be >= 0";
    if (!isEdit && openingQty < 0) errs.openingQty = "Opening quantity must be >= 0";

    if (min < 0) errs.min = "Min stock must be >= 0";
    if (max < 0) errs.max = "Max stock must be >= 0";
    if (rop < 0) errs.rop = "ROP must be >= 0";
    if (leadTime < 0) errs.leadTime = "Lead time must be >= 0";

    if (min > max) {
      errs.min = "Min Stock cannot exceed Max Stock";
      errs.max = "Max Stock must be greater than or equal to Min Stock";
    }

    if (rop < min || rop > max) {
      // Optional soft warning or constraint
      if (rop < min) errs.rop = "ROP should normally be >= Min Stock";
      if (rop > max) errs.rop = "ROP cannot exceed Max Stock";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);

    setTimeout(() => {
      if (isEdit && initialMaterial) {
        const result = updateMaterial(initialMaterial.id, {
          plant,
          description: description.trim(),
          materialType,
          unit,
          standardPrice,
          min,
          max,
          rop,
          leadTime,
          storageLocation,
          storageBin: storageBin.trim(),
          image: image || undefined,
        });

        setIsSubmitting(false);
        if (result.success) {
          addToast(`Material "${materialCode}" updated successfully`, 'success');
          onClose();
        } else {
          addToast(result.error || 'Failed to update material', 'error');
        }
      } else {
        const result = addMaterial(
          {
            plant,
            materialCode: materialCode.trim(),
            description: description.trim(),
            materialType,
            unit,
            standardPrice,
            min,
            max,
            rop,
            leadTime,
            storageLocation,
            storageBin: storageBin.trim(),
            image: image || undefined,
          },
          openingQty
        );

        setIsSubmitting(false);
        if (result.success) {
          addToast(`Material "${materialCode.trim()}" created successfully`, 'success');
          onClose();
        } else {
          addToast(result.error || 'Failed to create material', 'error');
        }
      }
    }, 200);
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "Edit Material" : "Add New Material"}
      subtitle={isEdit ? `Update specifications for ${initialMaterial?.materialCode}` : "Register a new spare part into master catalog"}
      widthClass="max-w-2xl"
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
            disabled={isSubmitting}
            className="px-5 py-2 text-xs font-semibold text-white bg-brand-blue hover:bg-brand-hoverBlue rounded-lg shadow-sm transition-all disabled:opacity-50"
          >
            {isSubmitting ? "Saving..." : isEdit ? "Update Material" : "Save Material"}
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* SECTION 01: MASTER IDENTIFICATION */}
        <div className="p-4 rounded-2xl bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder space-y-3.5 shadow-subtle">
          <div className="flex items-center gap-2 pb-2 border-b border-app-border dark:border-app-darkBorder">
            <span className="text-[11px] font-mono font-bold text-brand-blue bg-brand-softBlue dark:bg-blue-950/60 px-2 py-0.5 rounded">
              01
            </span>
            <h4 className="text-xs font-bold text-app-text dark:text-app-darkText uppercase tracking-wider">
              Master Identification
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-app-secondary dark:text-app-darkSecondary mb-1 uppercase tracking-wider">
                Plant <span className="text-gi">*</span>
              </label>
              <select
                value={plant}
                onChange={e => setPlant(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder rounded-lg text-app-text dark:text-app-darkText outline-none focus:border-brand-blue"
              >
                {PLANT_OPTIONS.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-app-secondary dark:text-app-darkSecondary mb-1 uppercase tracking-wider">
                Material Code <span className="text-gi">*</span>
              </label>
              <input
                type="text"
                value={materialCode}
                onChange={e => setMaterialCode(e.target.value.toUpperCase())}
                disabled={isEdit}
                placeholder="e.g. C203001000"
                className={`w-full px-3 py-2 text-xs sm:text-sm bg-white dark:bg-app-darkSurface border rounded-lg font-mono outline-none ${
                  isEdit
                    ? 'bg-app-bg dark:bg-app-darkBg cursor-not-allowed opacity-80 text-app-secondary border-app-border dark:border-app-darkBorder'
                    : errors.materialCode
                    ? 'border-gi focus:ring-1 focus:ring-gi text-gi'
                    : 'border-app-border dark:border-app-darkBorder text-app-text dark:text-app-darkText focus:border-brand-blue'
                }`}
              />
              {errors.materialCode && <p className="mt-1 text-xs text-gi">{errors.materialCode}</p>}
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-app-secondary dark:text-app-darkSecondary mb-1 uppercase tracking-wider">
                Description / Specification <span className="text-gi">*</span>
              </label>
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="e.g. LOADCELL,50KG,1Z6FC3/50KG-1,HBM"
                className={`w-full px-3 py-2 text-xs sm:text-sm bg-white dark:bg-app-darkSurface border rounded-lg outline-none ${
                  errors.description
                    ? 'border-gi focus:ring-1 focus:ring-gi'
                    : 'border-app-border dark:border-app-darkBorder text-app-text dark:text-app-darkText focus:border-brand-blue'
                }`}
              />
              {errors.description && <p className="mt-1 text-xs text-gi">{errors.description}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-app-secondary dark:text-app-darkSecondary mb-1 uppercase tracking-wider">
                Material Type <span className="text-gi">*</span>
              </label>
              <select
                value={materialType}
                onChange={e => setMaterialType(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder rounded-lg text-app-text dark:text-app-darkText outline-none focus:border-brand-blue"
              >
                {TYPE_OPTIONS.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-app-secondary dark:text-app-darkSecondary mb-1 uppercase tracking-wider">
                Unit of Measure <span className="text-gi">*</span>
              </label>
              <select
                value={unit}
                onChange={e => setUnit(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder rounded-lg text-app-text dark:text-app-darkText outline-none focus:border-brand-blue"
              >
                {UNIT_OPTIONS.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* SECTION 02: COST & INITIAL BALANCE */}
        <div className="p-4 rounded-2xl bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder space-y-3.5 shadow-subtle">
          <div className="flex items-center gap-2 pb-2 border-b border-app-border dark:border-app-darkBorder">
            <span className="text-[11px] font-mono font-bold text-brand-blue bg-brand-softBlue dark:bg-blue-950/60 px-2 py-0.5 rounded">
              02
            </span>
            <h4 className="text-xs font-bold text-app-text dark:text-app-darkText uppercase tracking-wider">
              Cost & Initial Balance
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <NumericInput
              label="Standard Unit Price"
              prefix="฿"
              allowDecimals={true}
              min={0}
              value={standardPrice}
              onChange={setStandardPrice}
              error={errors.standardPrice}
            />

            {!isEdit ? (
              <NumericInput
                label="Opening Quantity"
                suffix={unit}
                min={0}
                value={openingQty}
                onChange={setOpeningQty}
                error={errors.openingQty}
              />
            ) : (
              <div className="p-3 rounded-xl bg-app-bg dark:bg-app-darkBg border border-app-border dark:border-app-darkBorder flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-app-muted block">Stock Ledger</span>
                  <span className="text-xs text-app-secondary dark:text-app-darkSecondary">
                    Stock quantity is managed via Goods Movement (GR / GI / Adjust).
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SECTION 03: STOCK CONTROL RULES */}
        <div className="p-4 rounded-2xl bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder space-y-3.5 shadow-subtle">
          <div className="flex items-center gap-2 pb-2 border-b border-app-border dark:border-app-darkBorder">
            <span className="text-[11px] font-mono font-bold text-brand-blue bg-brand-softBlue dark:bg-blue-950/60 px-2 py-0.5 rounded">
              03
            </span>
            <h4 className="text-xs font-bold text-app-text dark:text-app-darkText uppercase tracking-wider">
              Stock Control Rules
            </h4>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <NumericInput
              label="Min Stock"
              required={true}
              min={0}
              value={min}
              onChange={setMin}
              error={errors.min}
            />
            <NumericInput
              label="ROP (Reorder)"
              required={true}
              min={0}
              value={rop}
              onChange={setRop}
              error={errors.rop}
            />
            <NumericInput
              label="Max Stock"
              required={true}
              min={0}
              value={max}
              onChange={setMax}
              error={errors.max}
            />
            <NumericInput
              label="Lead Time"
              suffix="Days"
              min={0}
              value={leadTime}
              onChange={setLeadTime}
              error={errors.leadTime}
            />
          </div>
        </div>

        {/* SECTION 04: WAREHOUSE STORAGE LOCATION */}
        <div className="p-4 rounded-2xl bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder space-y-3.5 shadow-subtle">
          <div className="flex items-center gap-2 pb-2 border-b border-app-border dark:border-app-darkBorder">
            <span className="text-[11px] font-mono font-bold text-brand-blue bg-brand-softBlue dark:bg-blue-950/60 px-2 py-0.5 rounded">
              04
            </span>
            <h4 className="text-xs font-bold text-app-text dark:text-app-darkText uppercase tracking-wider">
              Warehouse Storage Location
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-app-secondary dark:text-app-darkSecondary mb-1 uppercase tracking-wider">
                Storage Location (SLoc)
              </label>
              <select
                value={storageLocation}
                onChange={e => setStorageLocation(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder rounded-lg text-app-text dark:text-app-darkText outline-none focus:border-brand-blue"
              >
                {SLOC_OPTIONS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-app-secondary dark:text-app-darkSecondary mb-1 uppercase tracking-wider">
                Storage Bin
              </label>
              <input
                type="text"
                value={storageBin}
                onChange={e => setStorageBin(e.target.value.toUpperCase())}
                placeholder="e.g. A01-01"
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder rounded-lg font-mono text-app-text dark:text-app-darkText outline-none focus:border-brand-blue"
              />
            </div>
          </div>
        </div>

        {/* SECTION 05: PRODUCT IMAGE */}
        <div className="p-4 rounded-2xl bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder space-y-3.5 shadow-subtle">
          <div className="flex items-center gap-2 pb-2 border-b border-app-border dark:border-app-darkBorder">
            <span className="text-[11px] font-mono font-bold text-brand-blue bg-brand-softBlue dark:bg-blue-950/60 px-2 py-0.5 rounded">
              05
            </span>
            <h4 className="text-xs font-bold text-app-text dark:text-app-darkText uppercase tracking-wider">
              Product Image
            </h4>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="w-24 h-24 rounded-xl border border-app-border dark:border-app-darkBorder bg-app-bg dark:bg-app-darkBg flex items-center justify-center overflow-hidden shrink-0">
              {image ? (
                <img src={image} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <ImageIcon className="w-8 h-8 text-app-muted" />
              )}
            </div>

            <div className="flex-1 w-full space-y-2">
              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-app-border dark:border-app-darkBorder bg-app-bg/50 dark:bg-app-darkBg/50 hover:bg-app-bg text-xs font-semibold text-app-text dark:text-app-darkText cursor-pointer transition-colors">
                <Upload className="w-4 h-4 text-brand-blue" />
                <span>Upload Image (PNG, JPG, WebP)</span>
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
              <p className="text-[11px] text-app-muted dark:text-app-darkMuted">
                Or paste an image URL directly:
              </p>
              <input
                type="url"
                value={image}
                onChange={e => setImage(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-1.5 text-xs bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder rounded-lg text-app-text dark:text-app-darkText outline-none focus:border-brand-blue"
              />
            </div>
          </div>
        </div>
      </form>
    </Drawer>
  );
};
