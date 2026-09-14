import React, { useState, useEffect } from 'react';
import { Material, MaterialRequestPriority, MaterialRequestItem, RequestType } from '../../types/stock';
import { useStock } from '../../context/StockContext';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { ItemSelectionModal, SelectedItemPayload } from './ItemSelectionModal';
import { getCurrentStock } from '../../utils/stockCalculation';
import { getAllPlants } from '../../utils/plantStoreMaster';
import {
  X,
  Plus,
  Trash2,
  Package,
  Layers,
  Building2,
  AlertCircle,
  Clock,
  Sparkles,
  Tag,
  CheckCircle2,
  ArrowRight,
  ShoppingCart,
  Calendar,
  FileText,
  FilePlus,
  HelpCircle,
  Search,
  Boxes,
} from 'lucide-react';

interface CreateRequestDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (requestNo: string) => void;
  initialType?: RequestType;
}

export const CreateRequestDrawer: React.FC<CreateRequestDrawerProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialType = 'MATERIAL_REQUEST',
}) => {
  const { materials, createMaterialRequest, transactions } = useStock();
  const { currentUser } = useAuth();
  const { t, language } = useLanguage();
  const isTh = language === 'th';

  const plantOptions = React.useMemo(() => getAllPlants(materials), [materials]);

  const [requestType, setRequestType] = useState<RequestType>(initialType);
  const [step, setStep] = useState<1 | 2>(1);

  // Sync initialType when drawer opens
  useEffect(() => {
    if (isOpen) {
      setRequestType(initialType);
      setStep(1);
    }
  }, [isOpen, initialType]);

  // General details
  const [plant, setPlant] = useState(currentUser?.plant || 'PLANT-01');
  const [department, setDepartment] = useState(currentUser?.department || 'Maintenance');
  const [costCenter, setCostCenter] = useState('CC-MAIN-101');
  const [jobOrderNo, setJobOrderNo] = useState('');
  const [workOrderNo, setWorkOrderNo] = useState('');
  const [priority, setPriority] = useState<MaterialRequestPriority>('MEDIUM');
  const [title, setTitle] = useState('');
  const [purpose, setPurpose] = useState('');
  const [requiredDate, setRequiredDate] = useState('');
  const [additionalNote, setAdditionalNote] = useState('');

  // Item lines
  const [items, setItems] = useState<
    (Omit<MaterialRequestItem, 'id'> & { id: string; availableStock: number })[]
  >([]);

  // Custom Item Form state (especially useful for PR)
  const [showCustomItemForm, setShowCustomItemForm] = useState(false);
  const [customItemCode, setCustomItemCode] = useState('');
  const [customItemDesc, setCustomItemDesc] = useState('');
  const [customItemQty, setCustomItemQty] = useState('1');
  const [customItemUnit, setCustomItemUnit] = useState('PC');
  const [customItemPrice, setCustomItemPrice] = useState('0');

  const [isItemPickerOpen, setIsItemPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSelectItemPayload = (payload: SelectedItemPayload) => {
    const existingIndex = items.findIndex(
      it => it.materialId === payload.material.id && (it.lot || '') === (payload.lot || '')
    );
    if (existingIndex >= 0) {
      setError(
        isTh
          ? `พัสดุ/ล็อตนี้ (${payload.material.materialCode}${payload.lot ? ` / ${payload.lot}` : ''}) ถูกเพิ่มในรายการแล้ว`
          : `Item (${payload.material.materialCode}${payload.lot ? ` / ${payload.lot}` : ''}) is already added in the request.`
      );
      return;
    }

    const price = payload.material.standardPrice || 0;
    const newItem: Omit<MaterialRequestItem, 'id'> & { id: string; availableStock: number } = {
      id: `line-${Date.now()}-${items.length}`,
      materialId: payload.material.id,
      materialCode: payload.material.materialCode,
      description: payload.material.description,
      itemCode: payload.itemCode,
      itemName: payload.itemName,
      selectionMode: payload.selectedMode,
      requestedQuantity: 1,
      issuedQuantity: 0,
      unit: payload.material.unit,
      pricePerUnit: price,
      totalPrice: price,
      storageLocation: payload.storageLocation || payload.material.storageLocation,
      storageBin: payload.storageBin || payload.material.storageBin,
      lot: payload.lot,
      batchNumber: payload.batchNumber,
      availableStock: payload.availableStock,
      remarks: '',
    };

    setItems(prev => [...prev, newItem]);
    setError(null);
  };

  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customItemDesc.trim()) {
      setError(isTh ? 'กรุณาระบุรายละเอียดพัสดุ' : 'Please enter item description.');
      return;
    }
    const qty = parseFloat(customItemQty) || 1;
    const price = parseFloat(customItemPrice) || 0;
    const code = customItemCode.trim().toUpperCase() || `ITEM-REQ-${Date.now().toString().slice(-4)}`;

    const newItem: Omit<MaterialRequestItem, 'id'> & { id: string; availableStock: number } = {
      id: `custom-line-${Date.now()}-${items.length}`,
      materialId: `custom-mat-${Date.now()}`,
      materialCode: code,
      description: customItemDesc.trim(),
      requestedQuantity: qty,
      issuedQuantity: 0,
      unit: customItemUnit.trim().toUpperCase() || 'PC',
      pricePerUnit: price,
      totalPrice: qty * price,
      availableStock: 0,
      remarks: requestType === 'PURCHASE_REQUISITION' ? 'Requisition for purchasing' : 'Custom requisition item',
    };

    setItems(prev => [...prev, newItem]);
    setCustomItemCode('');
    setCustomItemDesc('');
    setCustomItemQty('1');
    setCustomItemPrice('0');
    setShowCustomItemForm(false);
    setError(null);
  };

  const handleUpdateQty = (id: string, qtyStr: string) => {
    const qty = parseFloat(qtyStr) || 0;
    setItems(prev =>
      prev.map(it => {
        if (it.id === id) {
          return {
            ...it,
            requestedQuantity: qty,
            totalPrice: qty * it.pricePerUnit,
          };
        }
        return it;
      })
    );
  };

  const handleUpdateRemarks = (id: string, remarks: string) => {
    setItems(prev => prev.map(it => (it.id === id ? { ...it, remarks } : it)));
  };

  const handleRemoveItem = (id: string) => {
    setItems(prev => prev.filter(it => it.id !== id));
  };

  const totalQuantity = items.reduce((sum, it) => sum + it.requestedQuantity, 0);
  const totalEstimatedValue = items.reduce((sum, it) => sum + it.totalPrice, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError(isTh ? 'กรุณาระบุหัวข้อคำขอ' : 'Please enter request title/purpose.');
      return;
    }

    if (requestType === 'PURCHASE_REQUISITION' && !requiredDate) {
      setError(isTh ? 'กรุณาระบุวันที่ต้องการใช้งาน (Required Date)' : 'Please specify Required Date.');
      return;
    }

    if (items.length === 0) {
      setError(isTh ? 'กรุณาเลือกหรือระบุพัสดุอย่างน้อย 1 รายการ' : 'Please add at least 1 item.');
      return;
    }

    const hasZeroQty = items.some(it => it.requestedQuantity <= 0);
    if (hasZeroQty) {
      setError(
        isTh ? 'จำนวนขอของทุกรายการต้องมากกว่า 0' : 'Requested quantity must be greater than 0.'
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const res = createMaterialRequest({
        requestType,
        plant,
        department,
        costCenter,
        jobOrderNo: jobOrderNo.trim() || undefined,
        workOrderNo: workOrderNo.trim() || undefined,
        priority,
        title: title.trim(),
        purpose: purpose.trim() || title.trim(),
        requiredDate: requiredDate || undefined,
        additionalNote: additionalNote.trim() || undefined,
        requestedBy: currentUser?.username || 'user',
        requesterName: currentUser?.fullName || currentUser?.username || 'User',
        items: items.map(it => ({
          id: it.id,
          materialId: it.materialId,
          materialCode: it.materialCode,
          description: it.description,
          itemCode: it.itemCode,
          itemName: it.itemName,
          selectionMode: it.selectionMode,
          availableStockAtRequest: it.availableStock,
          requestedQuantity: it.requestedQuantity,
          issuedQuantity: 0,
          unit: it.unit,
          pricePerUnit: it.pricePerUnit,
          totalPrice: it.totalPrice,
          lot: it.lot,
          batchNumber: it.batchNumber,
          storageLocation: it.storageLocation,
          storageBin: it.storageBin,
          remarks: it.remarks,
        })),
        totalQuantity,
        totalEstimatedValue,
      });

      if (!res.success || !res.request) {
        setError(res.error || 'Failed to create requisition.');
        setIsSubmitting(false);
        return;
      }

      if (onSuccess) {
        onSuccess(res.request.requestNo);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isPR = requestType === 'PURCHASE_REQUISITION';

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs flex justify-end animate-fadeIn">
        <div className="bg-white dark:bg-app-darkSurface w-full max-w-2xl h-full shadow-2xl flex flex-col overflow-hidden border-l border-app-border dark:border-app-darkBorder animate-slideLeft">
          {/* HEADER */}
          <div className="p-5 border-b border-app-border dark:border-app-darkBorder flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold transition-colors ${
                  isPR
                    ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400'
                    : 'bg-brand-softBlue dark:bg-blue-950 text-brand-blue'
                }`}
              >
                {isPR ? <ShoppingCart className="w-5 h-5" /> : <Package className="w-5 h-5" />}
              </div>
              <div>
                <h2 className="text-lg font-bold text-app-text dark:text-app-darkText">
                  {isPR
                    ? isTh
                      ? 'สร้างใบขอซื้อ (Purchase Requisition - PR)'
                      : 'Create Purchase Requisition (PR)'
                    : isTh
                    ? 'สร้างใบขอเบิกพัสดุ (Material Request)'
                    : 'Create Material Request'}
                </h2>
                <p className="text-xs text-app-secondary dark:text-app-darkSecondary">
                  {isPR
                    ? isTh
                      ? 'ส่งคำขอซื้อพัสดุ/สินค้า ให้คลังตรวจสอบสต็อกคงเหลือและส่งต่อฝ่ายจัดซื้อ'
                      : 'Request procurement for items not in stock or requiring new purchase'
                    : isTh
                    ? 'ขอเบิกของจากคลังโรงงาน พร้อมตรวจสอบสต็อกจริงก่อนเบิก'
                    : 'Requisition items from plant store with live stock availability verification'}
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

          {/* REQUEST TYPE SELECTOR SWITCH */}
          <div className="px-5 pt-3 pb-2 border-b border-app-border dark:border-app-darkBorder bg-app-bg/30 dark:bg-app-darkBg/30">
            <label className="text-[11px] font-bold text-app-muted uppercase tracking-wider block mb-1.5">
              {isTh ? 'ประเภทคำขอ (Request Type)' : 'Request Type'}
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-app-bg dark:bg-app-darkBg rounded-xl border border-app-border dark:border-app-darkBorder">
              <button
                type="button"
                onClick={() => setRequestType('MATERIAL_REQUEST')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                  !isPR
                    ? 'bg-brand-blue text-white shadow-sm'
                    : 'text-app-secondary dark:text-app-darkSecondary hover:text-app-text hover:bg-white/40 dark:hover:bg-app-darkSurface/40'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                <span>{isTh ? 'ขอเบิกพัสดุ (Material Request)' : 'Material Request'}</span>
              </button>
              <button
                type="button"
                onClick={() => setRequestType('PURCHASE_REQUISITION')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                  isPR
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'text-app-secondary dark:text-app-darkSecondary hover:text-app-text hover:bg-white/40 dark:hover:bg-app-darkSurface/40'
                }`}
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>{isTh ? 'ขอซื้อ (Purchase Requisition - PR)' : 'Purchase Requisition (PR)'}</span>
              </button>
            </div>
          </div>

          {/* STEPPER HEADER */}
          <div className="px-5 py-2.5 border-b border-app-border dark:border-app-darkBorder bg-app-bg/50 dark:bg-app-darkBg/50 flex items-center gap-3 text-xs">
            <button
              type="button"
              onClick={() => setStep(1)}
              className={`flex items-center gap-2 font-bold px-3 py-1.5 rounded-lg transition-all ${
                step === 1
                  ? isPR
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'bg-brand-blue text-white shadow-sm'
                  : 'text-app-secondary dark:text-app-darkSecondary hover:text-app-text'
              }`}
            >
              <span>1. General Details</span>
            </button>
            <ArrowRight className="w-3.5 h-3.5 text-app-muted" />
            <button
              type="button"
              onClick={() => setStep(2)}
              className={`flex items-center gap-2 font-bold px-3 py-1.5 rounded-lg transition-all ${
                step === 2
                  ? isPR
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'bg-brand-blue text-white shadow-sm'
                  : 'text-app-secondary dark:text-app-darkSecondary hover:text-app-text'
              }`}
            >
              <span>2. Select Items ({items.length})</span>
            </button>
          </div>

          {/* FORM CONTENT */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">
            {error && (
              <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900/60 text-xs text-red-600 dark:text-red-400 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {step === 1 ? (
              <div className="space-y-4 animate-fadeIn">
                {/* PLANT & DEPT */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-xs font-bold text-app-text dark:text-app-darkText block mb-1">
                      {isTh ? 'โรงงาน (Plant)' : 'Target Plant'} *
                    </label>
                    <select
                      value={plant}
                      onChange={e => setPlant(e.target.value)}
                      className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-app-border dark:border-app-darkBorder bg-app-bg dark:bg-app-darkBg text-app-text dark:text-app-darkText focus:outline-none"
                    >
                      {plantOptions.map(p => (
                        <option key={p.code} value={p.code}>{p.label || p.name || p.code}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-app-text dark:text-app-darkText block mb-1">
                      {isTh ? 'แผนกผู้ขอ (Department)' : 'Department'} *
                    </label>
                    <input
                      type="text"
                      value={department}
                      onChange={e => setDepartment(e.target.value)}
                      required
                      className="w-full text-xs px-3 py-2 rounded-xl border border-app-border dark:border-app-darkBorder bg-app-bg dark:bg-app-darkBg text-app-text dark:text-app-darkText focus:outline-none"
                    />
                  </div>
                </div>

                {/* COST CENTER & PRIORITY */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-xs font-bold text-app-text dark:text-app-darkText block mb-1">
                      Cost Center
                    </label>
                    <input
                      type="text"
                      value={costCenter}
                      onChange={e => setCostCenter(e.target.value)}
                      placeholder="e.g. CC-MAIN-101"
                      className="w-full text-xs font-mono px-3 py-2 rounded-xl border border-app-border dark:border-app-darkBorder bg-app-bg dark:bg-app-darkBg text-app-text dark:text-app-darkText focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-app-text dark:text-app-darkText block mb-1">
                      {isTh ? 'ระดับความสำคัญ (Priority)' : 'Priority'} *
                    </label>
                    <select
                      value={priority}
                      onChange={e => setPriority(e.target.value as MaterialRequestPriority)}
                      className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-app-border dark:border-app-darkBorder bg-app-bg dark:bg-app-darkBg text-app-text dark:text-app-darkText focus:outline-none"
                    >
                      <option value="LOW">Low (ปกติ)</option>
                      <option value="MEDIUM">Medium (ปานกลาง)</option>
                      <option value="HIGH">High (ด่วน)</option>
                      <option value="URGENT">🚨 URGENT (ด่วนมาก)</option>
                    </select>
                  </div>
                </div>

                {/* REQUIRED DATE (FOR PR) & JOB/WORK ORDER */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-xs font-bold text-app-text dark:text-app-darkText block mb-1">
                      {isTh ? 'วันที่ต้องการใช้งาน (Required Date)' : 'Required Date'}{' '}
                      {isPR && <span className="text-amber-500">*</span>}
                    </label>
                    <input
                      type="date"
                      value={requiredDate}
                      onChange={e => setRequiredDate(e.target.value)}
                      required={isPR}
                      className={`w-full text-xs px-3 py-2 rounded-xl border bg-app-bg dark:bg-app-darkBg text-app-text dark:text-app-darkText focus:outline-none ${
                        isPR && !requiredDate
                          ? 'border-amber-400 dark:border-amber-600'
                          : 'border-app-border dark:border-app-darkBorder'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-app-text dark:text-app-darkText block mb-1">
                      Job / Work Order No.
                    </label>
                    <input
                      type="text"
                      value={jobOrderNo || workOrderNo}
                      onChange={e => {
                        setJobOrderNo(e.target.value);
                        setWorkOrderNo(e.target.value);
                      }}
                      placeholder="e.g. JO-26-8801 / WO-9942"
                      className="w-full text-xs font-mono px-3 py-2 rounded-xl border border-app-border dark:border-app-darkBorder bg-app-bg dark:bg-app-darkBg text-app-text dark:text-app-darkText focus:outline-none"
                    />
                  </div>
                </div>

                {/* TITLE & PURPOSE */}
                <div className="space-y-3 pt-1">
                  <div>
                    <label className="text-xs font-bold text-app-text dark:text-app-darkText block mb-1">
                      {isPR
                        ? isTh
                          ? 'หัวข้อขอซื้อ / วัตถุประสงค์ (Requisition Title)'
                          : 'PR Title / Purpose'
                        : isTh
                        ? 'หัวข้อคำขอเบิก (Title / Purpose)'
                        : 'Requisition Title'} *
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      placeholder={
                        isPR
                          ? 'e.g. Urgent Purchase for Pneumatic Valves replacement'
                          : 'e.g. Conveyor 3 Motor Bearings Replacement'
                      }
                      required
                      className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-app-border dark:border-app-darkBorder bg-app-bg dark:bg-app-darkBg text-app-text dark:text-app-darkText focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-app-text dark:text-app-darkText block mb-1">
                      {isTh ? 'รายละเอียดและเหตุผลความจำเป็น' : 'Detailed Purpose & Justification'}
                    </label>
                    <textarea
                      rows={2}
                      value={purpose}
                      onChange={e => setPurpose(e.target.value)}
                      placeholder="e.g. Routine maintenance overhaul for packaging machine line #2..."
                      className="w-full text-xs px-3 py-2 rounded-xl border border-app-border dark:border-app-darkBorder bg-app-bg dark:bg-app-darkBg text-app-text dark:text-app-darkText focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-app-text dark:text-app-darkText block mb-1">
                      {isTh ? 'หมายเหตุเพิ่มเติม (Additional Note)' : 'Additional Note'}
                    </label>
                    <input
                      type="text"
                      value={additionalNote}
                      onChange={e => setAdditionalNote(e.target.value)}
                      placeholder="e.g. Preferred supplier or technical specs..."
                      className="w-full text-xs px-3 py-2 rounded-xl border border-app-border dark:border-app-darkBorder bg-app-bg dark:bg-app-darkBg text-app-text dark:text-app-darkText focus:outline-none"
                    />
                  </div>
                </div>

                {/* NOTE ON WORKFLOW */}
                <div
                  className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                    isPR
                      ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60 text-amber-700 dark:text-amber-400'
                      : 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/60 text-brand-blue'
                  }`}
                >
                  <Clock className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <strong>
                      {isPR
                        ? isTh
                          ? 'Purchase Requisition (PR) Workflow:'
                          : 'Purchase Requisition (PR) Workflow:'
                        : isTh
                        ? 'Material Request Workflow:'
                        : 'Material Request Workflow:'}
                    </strong>
                    <p className="text-[11px] text-app-secondary dark:text-app-darkSecondary mt-0.5">
                      {isPR
                        ? isTh
                          ? 'เมื่อสร้าง PR คำขอจะส่งไปยัง Store เพื่อตรวจสอบสต็อก หากไม่มีของในคลัง Store จะกด "Proceed to Purchasing" เพื่อส่งต่อฝ่ายจัดซื้อ'
                          : 'Request will be sent to Store for stock verification. If unavailable, Store proceeds PR to Purchasing.'
                        : isTh
                        ? 'การสร้าง Request ยังไม่ตัดยอดสต็อกทันที สต็อกจะถูกตัดเมื่อผ่านการอนุมัติและ Store ดำเนินการ "Issue Goods" ตามขั้นตอน'
                        : 'Stock is deducted only when Store approves and issues the items.'}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4 animate-fadeIn">
                {/* TOOLBAR TO ADD ITEMS */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-app-text dark:text-app-darkText">
                      Requested Items ({items.length})
                    </h3>
                    <p className="text-[11px] text-app-muted">
                      Target Plant: <strong>{plant}</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowCustomItemForm(prev => !prev)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-app-border dark:border-app-darkBorder hover:bg-app-bg dark:hover:bg-app-darkBg text-app-text dark:text-app-darkText text-xs font-bold transition-all"
                    >
                      <FilePlus className="w-3.5 h-3.5 text-amber-500" />
                      <span>{isTh ? '+ ระบุเอง (Custom Item)' : '+ Custom Item'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsItemPickerOpen(true)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white text-xs font-bold shadow-sm transition-all ${
                        isPR ? 'bg-amber-500 hover:bg-amber-600' : 'bg-brand-blue hover:bg-blue-600'
                      }`}
                    >
                      <Search className="w-3.5 h-3.5" />
                      <span>{isTh ? '+ เลือกพัสดุ (Select Item)' : '+ Select Item'}</span>
                    </button>
                  </div>
                </div>

                {/* CUSTOM ITEM FORM INLINE ACCORDION */}
                {showCustomItemForm && (
                  <div className="p-4 rounded-2xl border-2 border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20 space-y-3 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                        <ShoppingCart className="w-3.5 h-3.5" />
                        <span>{isTh ? 'เพิ่มรายการพัสดุ / สินค้าสั่งซื้อใหม่' : 'Add Custom Requisition Line'}</span>
                      </h4>
                      <button
                        type="button"
                        onClick={() => setShowCustomItemForm(false)}
                        className="text-app-muted hover:text-app-text"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div className="sm:col-span-2">
                        <label className="text-[10px] font-bold text-app-muted uppercase block mb-1">
                          {isTh ? 'ชื่อรายการ / คำอธิบายสินค้า *' : 'Item Description *'}
                        </label>
                        <input
                          type="text"
                          value={customItemDesc}
                          onChange={e => setCustomItemDesc(e.target.value)}
                          placeholder="e.g. Solenoid Valve 24VDC SMC-102"
                          className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-app-border dark:border-app-darkBorder bg-white dark:bg-app-darkSurface text-app-text dark:text-app-darkText focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-app-muted uppercase block mb-1">
                          {isTh ? 'รหัสพัสดุ (ถ้ามี)' : 'Item Code / Part No.'}
                        </label>
                        <input
                          type="text"
                          value={customItemCode}
                          onChange={e => setCustomItemCode(e.target.value)}
                          placeholder="e.g. PART-8802"
                          className="w-full text-xs font-mono px-2.5 py-1.5 rounded-lg border border-app-border dark:border-app-darkBorder bg-white dark:bg-app-darkSurface text-app-text dark:text-app-darkText focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2.5">
                      <div>
                        <label className="text-[10px] font-bold text-app-muted uppercase block mb-1">
                          {isTh ? 'จำนวน' : 'Quantity'} *
                        </label>
                        <input
                          type="number"
                          min="1"
                          step="any"
                          value={customItemQty}
                          onChange={e => setCustomItemQty(e.target.value)}
                          className="w-full text-xs font-mono font-bold px-2.5 py-1.5 rounded-lg border border-app-border dark:border-app-darkBorder bg-white dark:bg-app-darkSurface text-app-text dark:text-app-darkText focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-app-muted uppercase block mb-1">
                          {isTh ? 'หน่วยนับ (Unit)' : 'Unit'}
                        </label>
                        <input
                          type="text"
                          value={customItemUnit}
                          onChange={e => setCustomItemUnit(e.target.value)}
                          placeholder="PC, SET, BOX"
                          className="w-full text-xs uppercase px-2.5 py-1.5 rounded-lg border border-app-border dark:border-app-darkBorder bg-white dark:bg-app-darkSurface text-app-text dark:text-app-darkText focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-app-muted uppercase block mb-1">
                          {isTh ? 'ราคาประเมิน/หน่วย (฿)' : 'Est. Price/Unit'}
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={customItemPrice}
                          onChange={e => setCustomItemPrice(e.target.value)}
                          className="w-full text-xs font-mono px-2.5 py-1.5 rounded-lg border border-app-border dark:border-app-darkBorder bg-white dark:bg-app-darkSurface text-app-text dark:text-app-darkText focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleAddCustomItem}
                        className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-sm transition-all"
                      >
                        {isTh ? 'เพิ่มรายการนี้' : 'Add Custom Line'}
                      </button>
                    </div>
                  </div>
                )}

                {/* ITEM LINES LIST */}
                {items.length === 0 ? (
                  <div className="p-8 rounded-2xl border-2 border-dashed border-app-border dark:border-app-darkBorder text-center">
                    <Package className="w-10 h-10 text-app-muted mx-auto mb-2" />
                    <p className="text-sm font-bold text-app-text dark:text-app-darkText">
                      {isTh ? 'ยังไม่มีรายการพัสดุในคำขอนี้' : 'No items added yet'}
                    </p>
                    <p className="text-xs text-app-muted mt-0.5 mb-3">
                      {isPR
                        ? 'Click "+ Custom Item" to specify requested purchases or browse Master Data'
                        : 'Click "+ Browse Store Items" to select items and check available stock'}
                    </p>
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsItemPickerOpen(true)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white text-xs font-bold transition-all ${
                          isPR ? 'bg-amber-500 hover:bg-amber-600' : 'bg-brand-blue hover:bg-blue-600'
                        }`}
                      >
                        <Search className="w-3.5 h-3.5" />
                        <span>{isTh ? 'เลือกพัสดุ (Select Item)' : 'Select Item'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCustomItemForm(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-app-border dark:border-app-darkBorder hover:bg-app-bg dark:hover:bg-app-darkBg text-app-text dark:text-app-darkText text-xs font-bold transition-all"
                      >
                        <FilePlus className="w-3.5 h-3.5 text-amber-500" />
                        <span>{isTh ? 'ระบุรายการเอง' : 'Custom Item'}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {items.map(line => (
                      <div
                        key={line.id}
                        className="p-4 rounded-2xl border border-app-border dark:border-app-darkBorder bg-app-bg/50 dark:bg-app-darkBg/50 space-y-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-bold text-xs text-brand-blue">
                                {line.materialCode}
                              </span>
                              {line.itemName && (
                                <span className="font-semibold text-xs text-app-text dark:text-app-darkText">
                                  ({line.itemName})
                                </span>
                              )}
                              {line.selectionMode === 'LOT' || line.lot ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 text-[10px] font-bold border border-purple-200 dark:border-purple-900/60">
                                  <Tag className="w-2.5 h-2.5" />
                                  By Lot: {line.lot || 'Specific Lot'}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-brand-blue text-[10px] font-bold border border-blue-200 dark:border-blue-900/60">
                                  <Package className="w-2.5 h-2.5" />
                                  By Material
                                </span>
                              )}
                              {line.availableStock !== undefined && (
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    line.availableStock <= 0
                                      ? 'bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900'
                                      : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900'
                                  }`}
                                >
                                  Stock: {line.availableStock} {line.unit}
                                </span>
                              )}
                            </div>
                            <h4 className="text-xs font-semibold text-app-text dark:text-app-darkText mt-1 truncate">
                              {line.description}
                            </h4>
                            <div className="flex items-center gap-3 text-[11px] text-app-muted mt-1">
                              <span>
                                SLoc: <strong>{line.storageLocation || 'STORE-A'}</strong> ({line.storageBin || 'BIN-01'})
                              </span>
                              {line.pricePerUnit > 0 && (
                                <span>
                                  Price: <strong>฿{line.pricePerUnit.toLocaleString()}</strong>/{line.unit}
                                </span>
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveItem(line.id)}
                            className="p-1.5 rounded-lg text-app-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors"
                            title="Remove Line"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* LINE INPUTS */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 border-t border-app-border dark:border-app-darkBorder">
                          <div>
                            <label className="text-[10px] font-bold text-app-muted uppercase block mb-1">
                              Requested Qty ({line.unit}) *
                            </label>
                            <input
                              type="number"
                              min="1"
                              step="any"
                              value={line.requestedQuantity || ''}
                              onChange={e => handleUpdateQty(line.id, e.target.value)}
                              required
                              className="w-full text-xs font-mono font-bold px-2.5 py-1.5 rounded-lg border border-app-border dark:border-app-darkBorder bg-white dark:bg-app-darkSurface text-app-text dark:text-app-darkText focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-app-muted uppercase block mb-1">
                              Line Remarks / Note
                            </label>
                            <input
                              type="text"
                              value={line.remarks || ''}
                              onChange={e => handleUpdateRemarks(line.id, e.target.value)}
                              placeholder="e.g. Urgent machine replacement"
                              className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-app-border dark:border-app-darkBorder bg-white dark:bg-app-darkSurface text-app-text dark:text-app-darkText focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* ESTIMATED TOTAL */}
                    <div className="p-3.5 rounded-2xl bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder flex items-center justify-between text-xs">
                      <div>
                        <span className="text-app-muted">Total Lines:</span>{' '}
                        <strong>{items.length}</strong> ·{' '}
                        <span className="text-app-muted">Total Quantity:</span>{' '}
                        <strong>{totalQuantity}</strong>
                      </div>
                      <div>
                        <span className="text-app-muted">Est. Value:</span>{' '}
                        <strong
                          className={`text-sm font-mono ${
                            isPR ? 'text-amber-600 dark:text-amber-400' : 'text-brand-blue'
                          }`}
                        >
                          ฿{totalEstimatedValue.toLocaleString()}
                        </strong>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </form>

          {/* FOOTER ACTIONS */}
          <div className="p-4 border-t border-app-border dark:border-app-darkBorder bg-app-bg dark:bg-app-darkBg flex items-center justify-between gap-3">
            {step === 1 ? (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-app-border dark:border-app-darkBorder text-xs font-bold hover:bg-white dark:hover:bg-app-darkSurface transition-colors"
                >
                  {isTh ? 'ยกเลิก' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className={`px-5 py-2 rounded-xl text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2 ${
                    isPR ? 'bg-amber-500 hover:bg-amber-600' : 'bg-brand-blue hover:bg-blue-600'
                  }`}
                >
                  <span>{isTh ? 'ถัดไป: เลือกรายการ' : 'Next: Select Items'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2 rounded-xl border border-app-border dark:border-app-darkBorder text-xs font-bold hover:bg-white dark:hover:bg-app-darkSurface transition-colors"
                >
                  {isTh ? 'ย้อนกลับ' : 'Back'}
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting || items.length === 0}
                  className={`px-5 py-2 rounded-xl text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2 disabled:opacity-50 ${
                    isPR ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {isSubmitting
                      ? 'Submitting...'
                      : isPR
                      ? isTh
                        ? 'ส่งใบขอซื้อ (Submit PR)'
                        : 'Submit Purchase Requisition'
                      : isTh
                      ? 'ส่งใบขอเบิก (Submit Request)'
                      : 'Submit Material Request'}
                  </span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* SHARED ITEM SELECTION MODAL (BY MATERIAL / BY LOT) */}
      <ItemSelectionModal
        isOpen={isItemPickerOpen}
        onClose={() => setIsItemPickerOpen(false)}
        onSelect={handleSelectItemPayload}
        targetPlant={plant !== 'All Plants' ? plant : undefined}
        title={
          isPR
            ? isTh
              ? 'เลือกรายการพัสดุสำหรับขอจัดซื้อ (PR Item Selector)'
              : 'Select Item for Purchase Requisition'
            : isTh
            ? 'เลือกรายการพัสดุสำหรับขอเบิก (MR Item Selector)'
            : 'Select Item for Material Request'
        }
      />
    </>
  );
};

