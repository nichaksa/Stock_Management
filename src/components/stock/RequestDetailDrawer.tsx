import React, { useState, useMemo } from 'react';
import { MaterialRequest, MaterialRequestStatus, Material, StockLotItem, MaterialRequestItem } from '../../types/stock';
import { useStock, ItemIssueSpec, ItemIssueLotAllocation } from '../../context/StockContext';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { MaterialLotViewToggle, InventoryViewMode } from './MaterialLotViewToggle';
import { StatusBadge } from '../common/StatusBadge';
import { getCurrentStock, calculateStockStatus } from '../../utils/stockCalculation';
import {
  X,
  Clock,
  FileCheck2,
  CheckCircle2,
  PackageCheck,
  XCircle,
  AlertTriangle,
  Building2,
  Tag,
  ArrowRight,
  ExternalLink,
  MessageSquare,
  ShieldCheck,
  Package,
  ShoppingCart,
  Calendar,
  Send,
  Sliders,
  Layers,
  Info,
  ChevronRight,
  ChevronDown,
  Search,
  Sparkles,
  Boxes,
  Check,
  RotateCcw,
  Warehouse,
  ArrowUpRight,
} from 'lucide-react';

interface RequestDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  request: MaterialRequest | null;
}

export const RequestDetailDrawer: React.FC<RequestDetailDrawerProps> = ({
  isOpen,
  onClose,
  request,
}) => {
  const {
    materials,
    transactions,
    getLotBalances,
    approveMaterialRequest,
    storeReviewPass,
    rejectMaterialRequest,
    issueMaterialRequest,
    closeMaterialRequest,
    proceedPurchaseRequisition,
    convertPrToMaterialRequest,
    getItemStock,
  } = useStock();
  const { currentUser, hasPermission } = useAuth();
  const { t, language } = useLanguage();
  const isTh = language === 'th';

  // Stock View Mode: 'MATERIAL' | 'LOT'
  const [stockViewMode, setStockViewMode] = useState<InventoryViewMode>('MATERIAL');
  const [stockSearchQuery, setStockSearchQuery] = useState('');
  const [expandedMaterialIds, setExpandedMaterialIds] = useState<Set<string>>(new Set());

  // Modal States
  const [rejectReasonModalOpen, setRejectReasonModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  
  // PR Proceed / Convert Modal states
  const [proceedPrModalOpen, setProceedPrModalOpen] = useState(false);
  const [proceedNotes, setProceedNotes] = useState('');
  const [convertPrModalOpen, setConvertPrModalOpen] = useState(false);
  const [convertPrNotes, setConvertPrNotes] = useState('');

  // MR Issue & Lot Allocation States
  // lotAllocations: [itemId -> [lotKey -> quantity]]
  const [lotAllocations, setLotAllocations] = useState<Record<string, Record<string, number>>>({});
  const [directIssueQtys, setDirectIssueQtys] = useState<Record<string, number>>({});
  const [selectedMatPerItem, setSelectedMatPerItem] = useState<Record<string, string>>({});

  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Active lot balances in this plant (Single Source of Truth)
  const plantLots = useMemo(() => {
    if (!request) return [];
    return getLotBalances(request.plant);
  }, [getLotBalances, request, transactions]);

  if (!isOpen || !request) return null;

  const isPR = request.requestType === 'PURCHASE_REQUISITION';
  const isReadyToIssue = !isPR && (request.status === 'APPROVED' || request.status === 'PARTIALLY_ISSUED');

  const canApprove =
    hasPermission('STORE_APPROVAL') ||
    currentUser?.roleName === 'Admin' ||
    currentUser?.roleName === 'Store' ||
    currentUser?.roleName === 'Manager';

  const canIssue =
    hasPermission('REQUEST_ISSUE') ||
    hasPermission('STORE_APPROVAL') ||
    currentUser?.roleName === 'Admin' ||
    currentUser?.roleName === 'Store';

  const toggleMaterialExpansion = (matId: string) => {
    setExpandedMaterialIds(prev => {
      const next = new Set(prev);
      if (next.has(matId)) next.delete(matId);
      else next.add(matId);
      return next;
    });
  };

  // Helper to find all candidate materials relevant to a requested item
  const getCandidateMaterials = (reqItem: MaterialRequestItem): Material[] => {
    const directMat = materials.find(
      m => m.id === reqItem.materialId || m.materialCode === reqItem.materialCode
    );

    const itemGroup =
      reqItem.itemName ||
      reqItem.itemCode ||
      directMat?.itemName ||
      directMat?.itemCode ||
      (reqItem.description ? reqItem.description.split(',')[0].trim() : '');

    let matches: Material[] = [];

    if (itemGroup) {
      matches = materials.filter(m => {
        if (m.plant && request.plant && m.plant !== request.plant) return false;
        const mGroup = m.itemName || m.itemCode || m.description.split(',')[0].trim();
        return (
          mGroup.toLowerCase() === itemGroup.toLowerCase() ||
          m.id === reqItem.materialId ||
          m.materialCode === reqItem.materialCode
        );
      });
    }

    if (matches.length === 0) {
      if (directMat) matches = [directMat];
      else matches = materials.filter(m => m.plant === request.plant).slice(0, 3);
    }

    // Apply internal search query filter
    if (stockSearchQuery.trim()) {
      const q = stockSearchQuery.toLowerCase().trim();
      matches = matches.filter(m => {
        const matchCode = m.materialCode.toLowerCase().includes(q);
        const matchDesc = m.description.toLowerCase().includes(q);
        const matchItem = (m.itemName || '').toLowerCase().includes(q);
        const matchLots = plantLots.some(
          l => l.materialId === m.id && (l.lotNo || l.lot || '').toLowerCase().includes(q)
        );
        return matchCode || matchDesc || matchItem || matchLots;
      });
    }

    return matches;
  };

  // Helper to calculate total allocated quantity for a requested item
  const getItemTotalAllocated = (itemId: string, remainingNeeded: number): number => {
    const itemAllocMap = lotAllocations[itemId] || {};
    const lotTotal = Object.values(itemAllocMap).reduce((sum, qty) => sum + (qty || 0), 0);
    if (lotTotal > 0) return lotTotal;
    return directIssueQtys[itemId] ?? remainingNeeded;
  };

  // Auto-allocate Lots using FIFO (oldest received lot first)
  const handleAutoAllocateFifo = (reqItem: MaterialRequestItem, candidates: Material[]) => {
    const remainingNeeded = Math.max(0, reqItem.requestedQuantity - (reqItem.issuedQuantity || 0));
    if (remainingNeeded <= 0) return;

    // Collect all lots with stock > 0 across candidates
    const allAvailableLots: StockLotItem[] = [];
    candidates.forEach(m => {
      const lots = plantLots.filter(l => l.materialId === m.id && l.quantity > 0);
      allAvailableLots.push(...lots);
    });

    // Sort FIFO (by receivedDate ascending)
    allAvailableLots.sort((a, b) => {
      const dateA = a.receivedDate ? new Date(a.receivedDate).getTime() : 0;
      const dateB = b.receivedDate ? new Date(b.receivedDate).getTime() : 0;
      return dateA - dateB;
    });

    let needed = remainingNeeded;
    const newAlloc: Record<string, number> = {};

    for (const lot of allAvailableLots) {
      if (needed <= 0) break;
      const key = `${lot.materialId}__${lot.lotNo || lot.lot}__${lot.storageLocation || lot.store || 'MAIN'}`;
      const toTake = Math.min(needed, lot.quantity);
      newAlloc[key] = toTake;
      needed -= toTake;
    }

    setLotAllocations(prev => ({
      ...prev,
      [reqItem.id]: newAlloc,
    }));
    setActionError(null);
  };

  const handleClearAllocation = (itemId: string) => {
    setLotAllocations(prev => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
    setDirectIssueQtys(prev => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
  };

  const handleLotQtyChange = (
    itemId: string,
    lotKey: string,
    maxAvail: number,
    remainingNeeded: number,
    valStr: string
  ) => {
    const val = parseFloat(valStr) || 0;
    const safeVal = Math.max(0, Math.min(val, maxAvail));

    setLotAllocations(prev => {
      const currentItemLots = { ...(prev[itemId] || {}) };
      if (safeVal === 0) {
        delete currentItemLots[lotKey];
      } else {
        currentItemLots[lotKey] = safeVal;
      }
      return {
        ...prev,
        [itemId]: currentItemLots,
      };
    });
    setActionError(null);
  };

  // Workflow Handlers
  const handleApprove = () => {
    setActionError(null);
    setIsProcessing(true);
    const res = approveMaterialRequest(request.id, 'Store / Manager review approved.');
    if (!res.success) {
      setActionError(res.error || 'Failed to approve request');
    } else {
      setActionSuccess('Material Request approved and ready for Goods Issue.');
    }
    setIsProcessing(false);
  };

  const handleStoreReviewPass = () => {
    setActionError(null);
    setIsProcessing(true);
    const res = storeReviewPass(request.id, 'Store inventory physically verified.');
    if (!res.success) {
      setActionError(res.error || 'Failed to update store review');
    }
    setIsProcessing(false);
  };

  const handleReject = () => {
    if (!rejectReason.trim()) {
      setActionError(isTh ? 'กรุณาระบุเหตุผลการปฏิเสธ' : 'Please provide a reason for rejecting the requisition.');
      return;
    }
    setActionError(null);
    setIsProcessing(true);
    const res = rejectMaterialRequest(request.id, rejectReason.trim());
    if (!res.success) {
      setActionError(res.error || 'Failed to reject request');
    } else {
      setRejectReasonModalOpen(false);
      setRejectReason('');
    }
    setIsProcessing(false);
  };

  const handleProceedPR = () => {
    setActionError(null);
    setIsProcessing(true);
    const res = proceedPurchaseRequisition(
      request.id,
      proceedNotes.trim() || 'Store verified stock. Proceeded to Purchasing.'
    );
    if (!res.success) {
      setActionError(res.error || 'Failed to proceed PR to purchasing');
    } else {
      setProceedPrModalOpen(false);
      setProceedNotes('');
      setActionSuccess('PR proceeded to purchasing department.');
    }
    setIsProcessing(false);
  };

  const handleConvertPrToMr = () => {
    setActionError(null);
    setIsProcessing(true);
    const res = convertPrToMaterialRequest(
      request.id,
      convertPrNotes.trim() || 'Existing stock verified in store. Converted to Material Request for issue.'
    );
    if (!res.success) {
      setActionError(res.error || 'Failed to convert PR to Material Request');
    } else {
      setConvertPrModalOpen(false);
      setConvertPrNotes('');
      setActionSuccess('PR converted to Material Request! You can now issue goods directly.');
    }
    setIsProcessing(false);
  };

  const handleExecuteIssue = () => {
    setActionError(null);
    setIsProcessing(true);

    const itemIssues: ItemIssueSpec[] = [];

    for (const reqItem of request.items) {
      const alreadyIssued = reqItem.issuedQuantity || 0;
      const remainingNeeded = Math.max(0, reqItem.requestedQuantity - alreadyIssued);
      if (remainingNeeded <= 0) continue;

      const itemLotMap = lotAllocations[reqItem.id] || {};
      const allocEntries = Object.entries(itemLotMap).filter(([_, qty]) => qty > 0);

      if (allocEntries.length > 0) {
        const lotAllocList: ItemIssueLotAllocation[] = allocEntries.map(([lotKey, qty]) => {
          const parts = lotKey.split('__');
          const matId = parts[0] || reqItem.materialId;
          const lotNo = parts[1] || reqItem.lot || 'LOT-STANDARD';
          const sloc = parts[2] || reqItem.storageLocation || 'MAIN';
          const matchLotObj = plantLots.find(
            l => l.materialId === matId && (l.lotNo || l.lot) === lotNo && (l.storageLocation || l.store) === sloc
          );

          return {
            lot: lotNo,
            batchNumber: matchLotObj?.batchNo || matchLotObj?.batchNumber || lotNo,
            storageLocation: sloc,
            storageBin: matchLotObj?.storageBin || reqItem.storageBin || 'BIN-01',
            quantity: qty,
          };
        });

        const totalQty = lotAllocList.reduce((sum, a) => sum + a.quantity, 0);
        if (totalQty > remainingNeeded) {
          setActionError(
            `Total lot allocated quantity (${totalQty}) exceeds outstanding requested quantity (${remainingNeeded}) for ${reqItem.materialCode}.`
          );
          setIsProcessing(false);
          return;
        }

        itemIssues.push({
          itemId: reqItem.id,
          issueQuantity: totalQty,
          materialId: selectedMatPerItem[reqItem.id] || reqItem.materialId,
          lotAllocations: lotAllocList,
        });
      } else {
        const directQty = directIssueQtys[reqItem.id] ?? remainingNeeded;
        if (directQty > 0) {
          if (directQty > remainingNeeded) {
            setActionError(
              `Issue quantity (${directQty}) exceeds remaining requested quantity (${remainingNeeded}) for ${reqItem.materialCode}.`
            );
            setIsProcessing(false);
            return;
          }

          const targetMatId = selectedMatPerItem[reqItem.id] || reqItem.materialId;
          const matLots = plantLots.filter(l => l.materialId === targetMatId && l.quantity > 0);
          
          if (matLots.length > 0) {
            // Material is lot-controlled: auto-resolve FIFO lots
            let needed = directQty;
            const autoAlloc: ItemIssueLotAllocation[] = [];
            for (const l of matLots) {
              if (needed <= 0) break;
              const take = Math.min(needed, l.quantity);
              autoAlloc.push({
                lot: l.lotNo || l.lot || 'LOT-STANDARD',
                batchNumber: l.batchNo || l.batchNumber,
                storageLocation: l.storageLocation || l.store || 'MAIN',
                storageBin: l.storageBin || 'BIN-01',
                quantity: take,
              });
              needed -= take;
            }

            itemIssues.push({
              itemId: reqItem.id,
              issueQuantity: directQty,
              materialId: targetMatId,
              lotAllocations: autoAlloc,
            });
          } else {
            itemIssues.push({
              itemId: reqItem.id,
              issueQuantity: directQty,
              materialId: targetMatId,
            });
          }
        }
      }
    }

    if (itemIssues.length === 0) {
      setActionError(isTh ? 'กรุณาระบุจำนวนที่จะจ่ายอย่างน้อย 1 รายการ' : 'Please allocate quantity to issue.');
      setIsProcessing(false);
      return;
    }

    const res = issueMaterialRequest(request.id, itemIssues);
    if (!res.success) {
      setActionError(res.error || 'Failed to issue goods');
    } else {
      setActionSuccess(`Goods Issue completed! Document ${res.document?.transactionNumber || ''} created.`);
    }
    setIsProcessing(false);
  };

  const handleClose = () => {
    setActionError(null);
    setIsProcessing(true);
    const res = closeMaterialRequest(request.id);
    if (!res.success) {
      setActionError(res.error || 'Failed to close request');
    }
    setIsProcessing(false);
  };

  const getStatusBadge = (status: MaterialRequestStatus) => {
    switch (status) {
      case 'PENDING_APPROVAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
            <Clock className="w-3.5 h-3.5" />
            <span>Pending Approval</span>
          </span>
        );
      case 'STORE_REVIEW':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/60 text-brand-blue border border-blue-200 dark:border-blue-800">
            <FileCheck2 className="w-3.5 h-3.5" />
            <span>Store Review</span>
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Approved (Ready to Issue)</span>
          </span>
        );
      case 'PARTIALLY_ISSUED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800">
            <Sliders className="w-3.5 h-3.5" />
            <span>Partially Issued</span>
          </span>
        );
      case 'ISSUED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
            <PackageCheck className="w-3.5 h-3.5" />
            <span>Issued</span>
          </span>
        );
      case 'PROCEEDED_PURCHASING':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Proceeded to Purchasing</span>
          </span>
        );
      case 'CLOSED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Closed</span>
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800">
            <XCircle className="w-3.5 h-3.5" />
            <span>Rejected</span>
          </span>
        );
    }
  };

  const mrStages: { key: MaterialRequestStatus; label: string }[] = [
    { key: 'PENDING_APPROVAL', label: 'Create' },
    { key: 'STORE_REVIEW', label: 'Review' },
    { key: 'APPROVED', label: 'Approved' },
    { key: 'ISSUED', label: 'Issued' },
    { key: 'CLOSED', label: 'Closed' },
  ];

  const prStages: { key: MaterialRequestStatus; label: string }[] = [
    { key: 'PENDING_APPROVAL', label: 'PR Created' },
    { key: 'STORE_REVIEW', label: 'Store Review' },
    { key: 'PROCEEDED_PURCHASING', label: 'Purchasing' },
    { key: 'CLOSED', label: 'Done' },
  ];

  const getStageIndex = (st: MaterialRequestStatus) => {
    if (isPR) {
      switch (st) {
        case 'PENDING_APPROVAL':
          return 0;
        case 'STORE_REVIEW':
          return 1;
        case 'PROCEEDED_PURCHASING':
          return 2;
        case 'CLOSED':
          return 3;
        default:
          return -1;
      }
    } else {
      switch (st) {
        case 'PENDING_APPROVAL':
          return 0;
        case 'STORE_REVIEW':
          return 1;
        case 'APPROVED':
          return 2;
        case 'PARTIALLY_ISSUED':
          return 2.5;
        case 'ISSUED':
          return 3;
        case 'CLOSED':
          return 4;
        default:
          return -1;
      }
    }
  };

  const currentStageIndex = getStageIndex(request.status);
  const stagesToRender = isPR ? prStages : mrStages;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs flex justify-end animate-fadeIn">
        <div className="bg-white dark:bg-app-darkSurface w-full max-w-3xl h-full shadow-2xl flex flex-col overflow-hidden border-l border-app-border dark:border-app-darkBorder animate-slideLeft">
          {/* HEADER */}
          <div className="p-5 border-b border-app-border dark:border-app-darkBorder flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                  isPR
                    ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400'
                    : 'bg-brand-softBlue dark:bg-blue-950 text-brand-blue'
                }`}
              >
                {isPR ? <ShoppingCart className="w-5 h-5" /> : <FileCheck2 className="w-5 h-5" />}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-bold text-sm text-brand-blue">
                    {request.requestNo}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                      isPR
                        ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                        : 'bg-blue-50 dark:bg-blue-950/50 text-brand-blue border-blue-200 dark:border-blue-800'
                    }`}
                  >
                    {isPR ? <ShoppingCart className="w-3 h-3" /> : <Package className="w-3 h-3" />}
                    <span>{isPR ? 'Purchase Requisition (PR)' : 'Material Request'}</span>
                  </span>
                  {getStatusBadge(request.status)}
                </div>
                <h2 className="text-base font-bold text-app-text dark:text-app-darkText mt-0.5 truncate">
                  {request.title}
                </h2>
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

          {/* PROGRESS STEPPER */}
          {request.status !== 'REJECTED' && (
            <div className="p-4 border-b border-app-border dark:border-app-darkBorder bg-app-bg/50 dark:bg-app-darkBg/50">
              <div className="flex items-center justify-between relative">
                <div className="absolute left-4 right-4 top-3.5 h-0.5 bg-slate-200 dark:bg-slate-800 -z-0" />
                {stagesToRender.map((stage, idx) => {
                  const isDone = currentStageIndex > idx;
                  const isCurrent = currentStageIndex === idx || (currentStageIndex === 2.5 && idx === 2);
                  return (
                    <div key={stage.key} className="flex flex-col items-center relative z-10">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                          isDone
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : isCurrent
                            ? isPR
                              ? 'bg-amber-500 text-white ring-4 ring-amber-100 dark:ring-amber-950'
                              : 'bg-brand-blue text-white ring-4 ring-blue-100 dark:ring-blue-950'
                            : 'bg-white dark:bg-app-darkSurface text-app-muted border border-app-border dark:border-app-darkBorder'
                        }`}
                      >
                        {isDone ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : idx + 1}
                      </div>
                      <span
                        className={`text-[10px] mt-1 font-semibold ${
                          isCurrent
                            ? isPR
                              ? 'text-amber-600 dark:text-amber-400 font-bold'
                              : 'text-brand-blue font-bold'
                            : isDone
                            ? 'text-app-text dark:text-app-darkText'
                            : 'text-app-muted'
                        }`}
                      >
                        {stage.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* DRAWER BODY */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {actionError && (
              <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900/60 text-xs text-red-600 dark:text-red-400 flex items-start gap-2.5 animate-fade-in">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{actionError}</span>
              </div>
            )}

            {actionSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900/60 text-xs text-emerald-700 dark:text-emerald-300 flex items-start gap-2.5 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                <span>{actionSuccess}</span>
              </div>
            )}

            {/* REQUISITION METADATA */}
            <div className="p-4 rounded-2xl bg-app-bg/60 dark:bg-app-darkBg/60 border border-app-border dark:border-app-darkBorder grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-app-muted block text-[10px] uppercase font-bold">Plant</span>
                <span className="font-mono font-bold text-app-text dark:text-app-darkText">
                  {request.plant}
                </span>
              </div>
              <div>
                <span className="text-app-muted block text-[10px] uppercase font-bold">Department</span>
                <span className="font-semibold text-app-text dark:text-app-darkText">
                  {request.department}
                </span>
              </div>
              <div>
                <span className="text-app-muted block text-[10px] uppercase font-bold">Cost Center</span>
                <span className="font-mono text-app-text dark:text-app-darkText">
                  {request.costCenter}
                </span>
              </div>
              <div>
                <span className="text-app-muted block text-[10px] uppercase font-bold">Requested By</span>
                <span className="font-semibold text-app-text dark:text-app-darkText">
                  {request.requesterName}
                </span>
              </div>
              <div>
                <span className="text-app-muted block text-[10px] uppercase font-bold">Date Created</span>
                <span className="font-mono text-app-text dark:text-app-darkText">
                  {request.createdAt.slice(0, 10)}
                </span>
              </div>
              <div>
                <span className="text-app-muted block text-[10px] uppercase font-bold">Priority</span>
                <span
                  className={`inline-block font-bold uppercase text-[10px] ${
                    request.priority === 'URGENT'
                      ? 'text-red-600'
                      : request.priority === 'HIGH'
                      ? 'text-amber-600'
                      : 'text-brand-blue'
                  }`}
                >
                  {request.priority}
                </span>
              </div>

              {request.requiredDate && (
                <div>
                  <span className="text-app-muted block text-[10px] uppercase font-bold">Required Date</span>
                  <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                    {request.requiredDate}
                  </span>
                </div>
              )}

              {request.linkedGiNumber && (
                <div className="col-span-2 sm:col-span-3">
                  <span className="text-app-muted block text-[10px] uppercase font-bold">
                    Linked Goods Issue (GI Doc)
                  </span>
                  <span className="inline-flex items-center gap-1 font-mono font-bold text-xs text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50 px-2 py-0.5 rounded border border-purple-200 dark:border-purple-800">
                    <PackageCheck className="w-3.5 h-3.5" />
                    {request.linkedGiNumber}
                  </span>
                </div>
              )}
            </div>

            {/* PURPOSE & NOTES */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder space-y-2">
              <div>
                <span className="text-[10px] font-bold uppercase text-app-muted tracking-wider block">
                  Purpose & Justification
                </span>
                <p className="text-xs text-app-text dark:text-app-darkText leading-relaxed mt-0.5">
                  {request.purpose}
                </p>
              </div>

              {request.storeProceedNotes && (
                <div className="pt-2 border-t border-app-border dark:border-app-darkBorder bg-indigo-50/50 dark:bg-indigo-950/20 p-2.5 rounded-xl">
                  <span className="text-[10px] font-bold uppercase text-indigo-700 dark:text-indigo-300 tracking-wider block">
                    Store Proceed / Procurement Note
                  </span>
                  <p className="text-xs text-indigo-900 dark:text-indigo-200 mt-0.5">
                    {request.storeProceedNotes}
                  </p>
                </div>
              )}
            </div>

            {/* =============================================================== */}
            {/* CORE SECTION: STOCK REVIEW & ALLOCATION (BY MATERIAL / BY LOT)   */}
            {/* =============================================================== */}
            <div className="space-y-3.5 pt-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-app-border dark:border-app-darkBorder">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-app-text dark:text-app-darkText flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-brand-blue" />
                    <span>{t('stock_review_title') || 'Stock Review & Allocation'}</span>
                  </h3>
                  <p className="text-[11px] text-app-muted mt-0.5">
                    {isPR
                      ? 'Review physical stock availability By Material or By Lot before procurement decisions.'
                      : 'Review available inventory and allocate Lot balances for Goods Issue.'}
                  </p>
                </div>

                {/* Segmented Control / View Switcher (By Material | By Lot) */}
                <MaterialLotViewToggle
                  viewMode={stockViewMode}
                  onChange={setStockViewMode}
                  size="sm"
                />
              </div>

              {/* Quick Search inside Review Area */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-app-muted absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={stockSearchQuery}
                  onChange={e => setStockSearchQuery(e.target.value)}
                  placeholder={isTh ? 'ค้นหารหัสพัสดุ, รายละเอียด, ล็อต...' : 'Search matching Material code, description, Lot No...'}
                  className="w-full text-xs pl-8 pr-3 py-2 rounded-xl border border-app-border dark:border-app-darkBorder bg-app-bg dark:bg-app-darkBg text-app-text dark:text-app-darkText outline-none focus:border-brand-blue shadow-subtle"
                />
              </div>

              {/* REQUESTED ITEMS WITH STOCK DRILLDOWN */}
              <div className="space-y-4">
                {request.items.map((reqItem, itemIdx) => {
                  const issued = reqItem.issuedQuantity || 0;
                  const remainingNeeded = Math.max(0, reqItem.requestedQuantity - issued);
                  const candidateMaterials = getCandidateMaterials(reqItem);
                  const totalAllocated = getItemTotalAllocated(reqItem.id, remainingNeeded);

                  // Calculate aggregated stock across candidate materials in this plant
                  let totalCandidateStock = 0;
                  candidateMaterials.forEach(m => {
                    const mLots = plantLots.filter(l => l.materialId === m.id && l.quantity > 0);
                    const mStock = mLots.length > 0
                      ? mLots.reduce((sum, l) => sum + l.quantity, 0)
                      : getCurrentStock(m.id, transactions, request.plant);
                    totalCandidateStock += mStock;
                  });

                  const hasStock = totalCandidateStock > 0;

                  return (
                    <div
                      key={reqItem.id || itemIdx}
                      className="rounded-2xl border border-app-border dark:border-app-darkBorder bg-white dark:bg-app-darkSurface shadow-subtle overflow-hidden space-y-0"
                    >
                      {/* ITEM HEADER SUMMARY */}
                      <div className="p-3.5 bg-slate-50/80 dark:bg-slate-900/60 border-b border-app-border dark:border-app-darkBorder flex items-start justify-between gap-3 flex-wrap">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-brand-softBlue dark:bg-blue-950 text-brand-blue border border-blue-200 dark:border-blue-900">
                              Item #{itemIdx + 1}
                            </span>
                            <span className="font-mono font-bold text-xs text-brand-blue">
                              {reqItem.materialCode}
                            </span>
                            {reqItem.lot && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-purple-50 dark:bg-purple-950/60 text-purple-600 text-[10px] font-bold border border-purple-200">
                                <Tag className="w-2.5 h-2.5" />
                                {reqItem.lot}
                              </span>
                            )}
                          </div>
                          <h4 className="text-xs font-bold text-app-text dark:text-app-darkText mt-1">
                            {reqItem.description}
                          </h4>
                          <span className="text-[11px] text-app-muted mt-0.5 block font-mono">
                            Requested Plant: <strong>{request.plant}</strong> · Default SLoc: {reqItem.storageLocation || 'STORE-A'}
                          </span>
                        </div>

                        {/* QUANTITY SUMMARY BADGES */}
                        <div className="flex items-center gap-3 text-right shrink-0">
                          <div>
                            <span className="text-[10px] text-app-muted block uppercase font-bold">
                              Requested
                            </span>
                            <span className="text-xs font-mono font-bold text-app-text dark:text-app-darkText">
                              {reqItem.requestedQuantity} {reqItem.unit}
                            </span>
                          </div>

                          {!isPR && (
                            <div>
                              <span className="text-[10px] text-app-muted block uppercase font-bold">
                                Issued / Remaining
                              </span>
                              <span className="text-xs font-mono">
                                <span className="text-emerald-600 font-bold">{issued}</span>
                                <span className="text-app-muted mx-1">/</span>
                                <span className={remainingNeeded > 0 ? 'text-amber-600 font-bold' : 'text-app-muted'}>
                                  {remainingNeeded} {reqItem.unit}
                                </span>
                              </span>
                            </div>
                          )}

                          <div className="pl-2 border-l border-app-border dark:border-app-darkBorder">
                            <span className="text-[10px] text-app-muted block uppercase font-bold">
                              Plant Stock
                            </span>
                            <span
                              className={`text-xs font-mono font-bold inline-flex items-center gap-1 ${
                                totalCandidateStock >= remainingNeeded
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : totalCandidateStock > 0
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-red-500'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${hasStock ? 'bg-emerald-500' : 'bg-red-500'}`} />
                              {totalCandidateStock} {reqItem.unit}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* DRILLDOWN VIEW BODY */}
                      <div className="p-3.5 space-y-3">
                        {/* PR STOCK VERIFICATION BANNER */}
                        {isPR && (
                          <div
                            className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-3 flex-wrap ${
                              hasStock
                                ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200/80 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                                : 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-200/80 dark:border-amber-800 text-amber-800 dark:text-amber-200'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {hasStock ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              ) : (
                                <Info className="w-4 h-4 text-amber-600 shrink-0" />
                              )}
                              <span>
                                {hasStock ? (
                                  <>
                                    <strong>Available Stock Detected:</strong> {totalCandidateStock} {reqItem.unit} exists in warehouse.
                                    You may fulfill this directly from stock.
                                  </>
                                ) : (
                                  <>
                                    <strong>No Warehouse Stock (0 {reqItem.unit}):</strong> Verified that this item needs purchasing.
                                  </>
                                )}
                              </span>
                            </div>

                            {hasStock && canIssue && (
                              <button
                                type="button"
                                onClick={() => setConvertPrModalOpen(true)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition-all"
                              >
                                <ArrowUpRight className="w-3.5 h-3.5" />
                                <span>{t('convert_pr_to_mr') || 'Fulfill from Stock (Convert to MR)'}</span>
                              </button>
                            )}
                          </div>
                        )}

                        {/* MODE 1: BY MATERIAL (Item -> Material) */}
                        {stockViewMode === 'MATERIAL' && (
                          <div className="space-y-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-app-muted block">
                              Available Materials under Item ({candidateMaterials.length})
                            </span>

                            <div className="divide-y divide-app-border dark:divide-app-darkBorder border border-app-border dark:border-app-darkBorder rounded-xl overflow-hidden">
                              {candidateMaterials.map(m => {
                                const mLots = plantLots.filter(l => l.materialId === m.id && l.quantity > 0);
                                const currentStock = mLots.length > 0
                                  ? mLots.reduce((sum, l) => sum + l.quantity, 0)
                                  : getCurrentStock(m.id, transactions, request.plant);
                                const status = calculateStockStatus(m, currentStock);

                                // Distinct stores containing stock
                                const storeBalances = new Map<string, number>();
                                if (mLots.length > 0) {
                                  mLots.forEach(l => {
                                    const s = l.storageLocation || l.store || 'MAIN';
                                    storeBalances.set(s, (storeBalances.get(s) || 0) + l.quantity);
                                  });
                                } else if (currentStock > 0) {
                                  storeBalances.set(m.storageLocation || 'MAIN', currentStock);
                                }

                                return (
                                  <div
                                    key={m.id}
                                    className="p-3 bg-white dark:bg-app-darkSurface hover:bg-app-bg/50 dark:hover:bg-app-darkBorder/20 transition-colors flex items-center justify-between gap-3 flex-wrap text-xs"
                                  >
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-mono font-bold text-brand-blue">
                                          {m.materialCode}
                                        </span>
                                        <span className="font-semibold text-app-text dark:text-app-darkText truncate">
                                          {m.description}
                                        </span>
                                        <StatusBadge status={status} size="sm" />
                                      </div>

                                      {/* Store Breakdown Badges */}
                                      <div className="flex items-center gap-1.5 mt-1 flex-wrap text-[11px]">
                                        <span className="text-app-muted">Stores:</span>
                                        {storeBalances.size === 0 ? (
                                          <span className="text-app-muted italic">No stock in stores</span>
                                        ) : (
                                          Array.from(storeBalances.entries()).map(([storeCode, qty]) => (
                                            <span
                                              key={storeCode}
                                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-mono text-[11px] text-app-secondary dark:text-app-darkSecondary"
                                            >
                                              <Warehouse className="w-3 h-3 text-app-muted" />
                                              <span>{storeCode}:</span>
                                              <strong className="text-emerald-600 dark:text-emerald-400">{qty} {m.unit}</strong>
                                            </span>
                                          ))
                                        )}
                                      </div>
                                    </div>

                                    <div className="text-right shrink-0">
                                      <span className="text-[10px] uppercase text-app-muted block font-bold">
                                        Material Stock
                                      </span>
                                      <span className="font-mono text-sm font-bold text-app-text dark:text-app-darkText">
                                        <span className={currentStock <= 0 ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}>
                                          {currentStock}
                                        </span>{' '}
                                        <span className="text-xs font-normal text-app-muted">{m.unit}</span>
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* MODE 2: BY LOT (Item -> Material -> Lot Breakdown & Allocation) */}
                        {stockViewMode === 'LOT' && (
                          <div className="space-y-3">
                            {candidateMaterials.map(m => {
                              const mLots = plantLots.filter(l => l.materialId === m.id && l.quantity > 0);
                              const totalMatStock = mLots.reduce((sum, l) => sum + l.quantity, 0);

                              return (
                                <div
                                  key={m.id}
                                  className="rounded-xl border border-app-border dark:border-app-darkBorder bg-app-bg/30 dark:bg-app-darkBg/30 p-3 space-y-2.5"
                                >
                                  {/* Material Header */}
                                  <div className="flex items-center justify-between gap-2 flex-wrap">
                                    <div className="flex items-center gap-2">
                                      <Package className="w-3.5 h-3.5 text-brand-blue" />
                                      <span className="font-mono font-bold text-xs text-brand-blue">
                                        {m.materialCode}
                                      </span>
                                      <span className="text-xs font-medium text-app-text dark:text-app-darkText truncate max-w-sm">
                                        {m.description}
                                      </span>
                                    </div>
                                    <span className="text-xs font-mono font-bold text-app-text dark:text-app-darkText">
                                      Material Total: <span className="text-emerald-600 dark:text-emerald-400">{totalMatStock} {m.unit}</span>
                                    </span>
                                  </div>

                                  {/* LOTS BREAKDOWN TABLE */}
                                  {mLots.length === 0 ? (
                                    <div className="p-2.5 bg-white dark:bg-app-darkSurface rounded-lg text-xs text-app-muted flex items-center gap-2 border border-app-border dark:border-app-darkBorder">
                                      <Info className="w-3.5 h-3.5" />
                                      <span>No active lots with available balance in {request.plant}.</span>
                                    </div>
                                  ) : (
                                    <div className="overflow-x-auto border border-app-border dark:border-app-darkBorder rounded-xl bg-white dark:bg-app-darkSurface">
                                      <table className="w-full text-left text-xs border-collapse">
                                        <thead className="bg-app-bg dark:bg-app-darkBg text-[10px] uppercase font-bold text-app-secondary dark:text-app-darkSecondary border-b border-app-border dark:border-app-darkBorder whitespace-nowrap">
                                          <tr>
                                            <th className="py-2 px-3">Lot No.</th>
                                            <th className="py-2 px-3">Batch No.</th>
                                            <th className="py-2 px-3">Store (SLoc)</th>
                                            <th className="py-2 px-3">Bin</th>
                                            <th className="py-2 px-3 text-right">Available Qty</th>
                                            <th className="py-2 px-3">Expiry Date</th>
                                            {isReadyToIssue && (
                                              <th className="py-2 px-3 text-right text-brand-blue">Issue Allocation</th>
                                            )}
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-app-border dark:divide-app-darkBorder">
                                          {mLots.map(l => {
                                            const lotKey = `${m.id}__${l.lotNo || l.lot}__${l.storageLocation || l.store || 'MAIN'}`;
                                            const currentAllocVal = (lotAllocations[reqItem.id] || {})[lotKey] ?? 0;

                                            return (
                                              <tr key={lotKey} className="hover:bg-app-bg/40 dark:hover:bg-app-darkBorder/20 transition-colors">
                                                <td className="py-2 px-3 font-mono font-bold text-brand-blue whitespace-nowrap">
                                                  {l.lotNo || l.lot}
                                                </td>
                                                <td className="py-2 px-3 font-mono text-app-secondary dark:text-app-darkSecondary whitespace-nowrap">
                                                  {l.batchNo || l.batchNumber || '-'}
                                                </td>
                                                <td className="py-2 px-3 font-mono font-semibold text-app-text dark:text-app-darkText whitespace-nowrap">
                                                  {l.storageLocation || l.store || 'MAIN'}
                                                </td>
                                                <td className="py-2 px-3 font-mono text-app-muted whitespace-nowrap">
                                                  {l.storageBin || 'BIN-01'}
                                                </td>
                                                <td className="py-2 px-3 font-mono font-bold text-right text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                                                  {l.quantity} {l.unit}
                                                </td>
                                                <td className="py-2 px-3 font-mono text-app-muted whitespace-nowrap text-[11px]">
                                                  {l.expiryDate ? (
                                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                                                      <Calendar className="w-2.5 h-2.5" />
                                                      {l.expiryDate}
                                                    </span>
                                                  ) : (
                                                    '-'
                                                  )}
                                                </td>

                                                {/* ALLOCATION INPUT IN READY TO ISSUE STATE */}
                                                {isReadyToIssue && (
                                                  <td className="py-2 px-3 text-right whitespace-nowrap">
                                                    <div className="inline-flex items-center justify-end gap-1.5">
                                                      <input
                                                        type="number"
                                                        min="0"
                                                        max={Math.min(l.quantity, remainingNeeded)}
                                                        step="any"
                                                        value={currentAllocVal === 0 ? '' : currentAllocVal}
                                                        placeholder="0"
                                                        onChange={e =>
                                                          handleLotQtyChange(
                                                            reqItem.id,
                                                            lotKey,
                                                            l.quantity,
                                                            remainingNeeded,
                                                            e.target.value
                                                          )
                                                        }
                                                        className="w-20 text-xs font-mono font-bold px-2 py-1 rounded-lg border border-app-border dark:border-app-darkBorder bg-white dark:bg-app-darkSurface text-app-text dark:text-app-darkText text-right outline-none focus:border-brand-blue"
                                                      />
                                                      <button
                                                        type="button"
                                                        onClick={() =>
                                                          handleLotQtyChange(
                                                            reqItem.id,
                                                            lotKey,
                                                            l.quantity,
                                                            remainingNeeded,
                                                            String(Math.min(l.quantity, remainingNeeded))
                                                          )
                                                        }
                                                        className="px-1.5 py-1 rounded text-[10px] font-bold text-brand-blue bg-blue-50 dark:bg-blue-950 hover:bg-blue-100 transition-colors"
                                                        title="Allocate Max from this Lot"
                                                      >
                                                        Max
                                                      </button>
                                                    </div>
                                                  </td>
                                                )}
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* ALLOCATION CONTROL BAR FOR MATERIAL REQUEST READY TO ISSUE */}
                        {isReadyToIssue && (
                          <div className="p-3 bg-brand-softBlue/30 dark:bg-blue-950/30 rounded-xl border border-blue-200/80 dark:border-blue-900/60 flex items-center justify-between gap-3 flex-wrap text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-app-text dark:text-app-darkText">
                                Allocation Status:
                              </span>
                              <span
                                className={`font-mono font-bold px-2.5 py-0.5 rounded-full text-xs border ${
                                  totalAllocated === remainingNeeded
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300'
                                    : totalAllocated > 0
                                    ? 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-300'
                                    : 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300'
                                }`}
                              >
                                {totalAllocated} / {remainingNeeded} {reqItem.unit}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleAutoAllocateFifo(reqItem, candidateMaterials)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-blue text-white hover:bg-blue-600 text-xs font-bold transition-all shadow-sm"
                              >
                                <Sparkles className="w-3 h-3" />
                                <span>{t('auto_allocate_fifo') || 'Auto Allocate (FIFO)'}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleClearAllocation(reqItem.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-app-border dark:border-app-darkBorder text-app-muted hover:text-app-text text-xs font-medium"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>Reset</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* AUDIT TIMELINE */}
            <div className="space-y-2.5 pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-app-text dark:text-app-darkText">
                Workflow Timeline & History
              </h3>

              <div className="p-4 rounded-2xl bg-app-bg/50 dark:bg-app-darkBg/50 border border-app-border dark:border-app-darkBorder space-y-3">
                {request.timeline.map((event, idx) => (
                  <div key={event.id || idx} className="flex items-start gap-3 text-xs">
                    <div className="w-2 h-2 rounded-full bg-brand-blue mt-1.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-app-text dark:text-app-darkText">
                          {event.actionTitle}
                        </span>
                        <span className="text-[10px] text-app-muted font-mono">
                          {event.timestamp.slice(0, 16).replace('T', ' ')}
                        </span>
                      </div>
                      <p className="text-[11px] text-app-secondary dark:text-app-darkSecondary mt-0.5">
                        By <strong>{event.actorName}</strong> ({event.actorRole})
                      </p>
                      {event.comments && (
                        <p className="text-[11px] text-app-muted italic mt-0.5 bg-white dark:bg-app-darkSurface p-2 rounded-lg border border-app-border dark:border-app-darkBorder">
                          "{event.comments}"
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* FOOTER ACTIONS BY ROLE & STAGE */}
          <div className="p-4 border-t border-app-border dark:border-app-darkBorder bg-app-bg dark:bg-app-darkBg flex items-center justify-between gap-3 flex-wrap">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-app-border dark:border-app-darkBorder text-xs font-bold hover:bg-white dark:hover:bg-app-darkSurface transition-colors"
            >
              Close
            </button>

            <div className="flex items-center gap-2 flex-wrap">
              {/* REJECT BUTTON (Available when pending or review) */}
              {(request.status === 'PENDING_APPROVAL' ||
                request.status === 'STORE_REVIEW' ||
                request.status === 'APPROVED') &&
                (canApprove || canIssue) && (
                  <button
                    type="button"
                    onClick={() => setRejectReasonModalOpen(true)}
                    className="px-3 py-2 rounded-xl bg-red-50 dark:bg-red-950/60 hover:bg-red-100 text-red-600 dark:text-red-400 text-xs font-bold border border-red-200 dark:border-red-900 transition-colors"
                  >
                    {isPR ? 'Reject PR' : 'Reject Request'}
                  </button>
                )}

              {/* PR WORKFLOW ACTIONS */}
              {isPR &&
                (request.status === 'PENDING_APPROVAL' || request.status === 'STORE_REVIEW') &&
                (canApprove || canIssue) && (
                  <button
                    type="button"
                    onClick={() => setProceedPrModalOpen(true)}
                    disabled={isProcessing}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    <span>Proceed to Purchasing (ส่งฝ่ายจัดซื้อ)</span>
                  </button>
                )}

              {/* MR WORKFLOW ACTIONS */}
              {!isPR && request.status === 'PENDING_APPROVAL' && canApprove && (
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={isProcessing}
                  className="px-4 py-2 rounded-xl bg-brand-blue hover:bg-blue-600 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Approve Request</span>
                </button>
              )}

              {!isPR && request.status === 'STORE_REVIEW' && (canApprove || canIssue) && (
                <button
                  type="button"
                  onClick={handleStoreReviewPass}
                  disabled={isProcessing}
                  className="px-4 py-2 rounded-xl bg-brand-blue hover:bg-blue-600 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                >
                  <FileCheck2 className="w-4 h-4" />
                  <span>Store Review Complete</span>
                </button>
              )}

              {/* MR ISSUE GOODS (Direct / Lot Allocated Issuance) */}
              {isReadyToIssue && canIssue && (
                <button
                  type="button"
                  onClick={handleExecuteIssue}
                  disabled={isProcessing}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                >
                  <PackageCheck className="w-4 h-4" />
                  <span>
                    {request.status === 'PARTIALLY_ISSUED'
                      ? 'Issue Allocated / Remaining (จ่ายของ)'
                      : 'Confirm Issue & Deduct Stock (จ่ายของ/ตัดสต็อก)'}
                  </span>
                </button>
              )}

              {/* CLOSE ACTION */}
              {(request.status === 'ISSUED' || request.status === 'PROCEEDED_PURCHASING') && (
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isProcessing}
                  className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Close Requisition</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CONVERT PR TO MATERIAL REQUEST MODAL */}
      {convertPrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder rounded-2xl shadow-2xl w-full max-w-md p-5 space-y-4">
            <div className="flex items-center gap-3 text-emerald-600">
              <PackageCheck className="w-6 h-6" />
              <h3 className="text-base font-bold text-app-text dark:text-app-darkText">
                {isTh ? 'จ่ายจากสต็อกที่มี (เปลี่ยนเป็นใบขอเบิก)' : 'Fulfill from Stock (Convert PR to MR)'}
              </h3>
            </div>

            <p className="text-xs text-app-secondary dark:text-app-darkSecondary">
              {isTh
                ? 'ระบบจะเปลี่ยนประเภทคำขอนี้จาก Purchase Requisition (PR) เป็น Material Request และตั้งสถานะเป็น "Approved" เพื่อให้ Store สามารถตัดจ่ายพัสดุจากสต็อกที่มีได้ทันที'
                : 'This will convert the requisition to a Material Request with status "Approved", allowing you to allocate lots and issue goods directly from stock.'}
            </p>

            <div>
              <label className="text-xs font-bold text-app-text dark:text-app-darkText block mb-1">
                {isTh ? 'บันทึกการแปลงคำขอ' : 'Conversion Note'}
              </label>
              <textarea
                rows={3}
                value={convertPrNotes}
                onChange={e => setConvertPrNotes(e.target.value)}
                placeholder="e.g. Existing inventory verified in STORE-A. Converting to Material Request for immediate issuance."
                className="w-full text-xs p-3 rounded-xl border border-app-border dark:border-app-darkBorder bg-app-bg dark:bg-app-darkBg text-app-text dark:text-app-darkText focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConvertPrModalOpen(false)}
                className="px-3.5 py-1.5 rounded-xl border border-app-border text-xs font-bold hover:bg-app-bg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConvertPrToMr}
                disabled={isProcessing}
                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm"
              >
                Confirm & Convert to MR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PROCEED PR TO PURCHASING MODAL */}
      {proceedPrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder rounded-2xl shadow-2xl w-full max-w-md p-5 space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <ShoppingCart className="w-6 h-6" />
              <h3 className="text-base font-bold text-app-text dark:text-app-darkText">
                {isTh ? 'ส่งคำขอซื้อต่อไปยังฝ่ายจัดซื้อ (Proceed PR)' : 'Proceed PR to Purchasing'}
              </h3>
            </div>

            <p className="text-xs text-app-secondary dark:text-app-darkSecondary">
              {isTh
                ? 'Store ได้ตรวจสอบรายการแล้วว่าไม่มีในคลัง หรือจำเป็นต้องสั่งซื้อใหม่ คำขอนี้จะเปลี่ยนสถานะเป็น "Proceeded to Purchasing"'
                : 'Confirm stock check and route this Purchase Requisition to the Procurement department.'}
            </p>

            <div>
              <label className="text-xs font-bold text-app-text dark:text-app-darkText block mb-1">
                {isTh ? 'บันทึกของ Store / หมายเหตุจัดซื้อ' : 'Store Notes / Procurement Instructions'}
              </label>
              <textarea
                rows={3}
                value={proceedNotes}
                onChange={e => setProceedNotes(e.target.value)}
                placeholder="e.g. Stock verified 0 balance. Recommend supplier FastAuto Co., urgent needed by 2026-09-20..."
                className="w-full text-xs p-3 rounded-xl border border-app-border dark:border-app-darkBorder bg-app-bg dark:bg-app-darkBg text-app-text dark:text-app-darkText focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setProceedPrModalOpen(false)}
                className="px-3.5 py-1.5 rounded-xl border border-app-border text-xs font-bold hover:bg-app-bg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleProceedPR}
                disabled={isProcessing}
                className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-sm"
              >
                Confirm & Proceed PR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECT MODAL */}
      {rejectReasonModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder rounded-2xl shadow-2xl w-full max-w-md p-5 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <XCircle className="w-6 h-6" />
              <h3 className="text-base font-bold">
                {isPR ? 'Reject Purchase Requisition (PR)' : 'Reject Material Request'}
              </h3>
            </div>

            <p className="text-xs text-app-secondary dark:text-app-darkSecondary">
              {isTh
                ? 'กรุณาระบุเหตุผลการปฏิเสธคำขอ (เช่น มีของทดแทนในคลัง, ข้อมูลไม่ครบถ้วน, ซ้ำซ้อน)'
                : 'Please specify the reason for declining this requisition (e.g. Alternative available in stock, missing JO#, duplicate request).'}
            </p>

            <textarea
              rows={3}
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Enter rejection justification..."
              required
              className="w-full text-xs p-3 rounded-xl border border-app-border dark:border-app-darkBorder bg-app-bg dark:bg-app-darkBg text-app-text dark:text-app-darkText focus:outline-none"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectReasonModalOpen(false)}
                className="px-3.5 py-1.5 rounded-xl border border-app-border text-xs font-bold hover:bg-app-bg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={isProcessing || !rejectReason.trim()}
                className="px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold disabled:opacity-50"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
