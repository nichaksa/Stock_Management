import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MaterialRequest } from '../../types/stock';
import { useStock } from '../../context/StockContext';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  Bell,
  X,
  ArrowRight,
  ClipboardList,
  ShoppingCart,
  Flame,
  CheckCircle2,
  Building2,
  Layers,
  Sparkles,
} from 'lucide-react';

interface NotifPayload {
  id: string;
  request: MaterialRequest;
  timestamp: number;
}

export const StoreApprovalNotifier: React.FC = () => {
  const navigate = useNavigate();
  const { materialRequests } = useStock();
  const { currentUser, hasPermission } = useAuth();
  const { t, language } = useLanguage();
  const isTh = language === 'th';

  const isStoreApprover =
    hasPermission('STORE_APPROVAL') ||
    currentUser?.roleName === 'Store' ||
    currentUser?.roleName === 'Admin';

  const [activeNotifs, setActiveNotifs] = useState<NotifPayload[]>([]);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const isInitialMountRef = useRef<boolean>(true);

  // Total pending store count as dynamic source of truth
  const pendingRequests = materialRequests.filter(
    r => r.status === 'PENDING_APPROVAL' || r.status === 'STORE_REVIEW'
  );
  const pendingCount = pendingRequests.length;

  // Track initial requests to prevent popup barrage on page refresh
  useEffect(() => {
    if (isInitialMountRef.current) {
      materialRequests.forEach(r => seenIdsRef.current.add(r.id));
      isInitialMountRef.current = false;
    }
  }, [materialRequests]);

  // Handler to add a notification
  const handleNewRequest = (request: MaterialRequest) => {
    if (!isStoreApprover) return;
    if (request.status !== 'PENDING_APPROVAL' && request.status !== 'STORE_REVIEW') return;
    if (seenIdsRef.current.has(request.id)) return;

    seenIdsRef.current.add(request.id);

    const payload: NotifPayload = {
      id: `notif-${request.id}-${Date.now()}`,
      request,
      timestamp: Date.now(),
    };

    setActiveNotifs(prev => [payload, ...prev.slice(0, 2)]); // Keep up to 3 popups
  };

  // Listen to in-app custom event
  useEffect(() => {
    const onNewRequestEvent = (e: Event) => {
      const customEvt = e as CustomEvent<MaterialRequest>;
      if (customEvt.detail) {
        handleNewRequest(customEvt.detail);
      }
    };

    window.addEventListener('zycoda-new-request', onNewRequestEvent);
    return () => {
      window.removeEventListener('zycoda-new-request', onNewRequestEvent);
    };
  }, [isStoreApprover]);

  // Also detect if materialRequests changes with unseen pending requests
  useEffect(() => {
    if (isInitialMountRef.current) return;
    if (!isStoreApprover) return;

    pendingRequests.forEach(req => {
      if (!seenIdsRef.current.has(req.id)) {
        handleNewRequest(req);
      }
    });
  }, [materialRequests, isStoreApprover, pendingRequests]);

  const dismissNotif = (notifId: string, reqId: string) => {
    seenIdsRef.current.add(reqId);
    setActiveNotifs(prev => prev.filter(n => n.id !== notifId));
  };

  const handleViewRequest = (req: MaterialRequest, notifId: string) => {
    dismissNotif(notifId, req.id);
    navigate('/stock/approval', { state: { openRequestId: req.id, requestNo: req.requestNo } });
  };

  const handleViewAllPending = () => {
    setActiveNotifs([]);
    navigate('/stock/approval');
  };

  if (!isStoreApprover || activeNotifs.length === 0) {
    return null;
  }

  return (
    <aside
      aria-label="Store Approval Notifications"
      className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-md w-full pointer-events-none px-4"
    >
      {activeNotifs.map(notif => {
        const req = notif.request;
        const isUrgent = req.priority === 'URGENT';
        const isPR = req.requestType === 'PURCHASE_REQUISITION';
        const itemCount = req.items?.length || 1;

        return (
          <div
            key={notif.id}
            className={`pointer-events-auto w-full bg-white dark:bg-app-darkSurface border-2 ${
              isUrgent
                ? 'border-red-500 shadow-2xl ring-4 ring-red-500/20'
                : 'border-red-400/80 dark:border-red-500/60 shadow-modal'
            } rounded-2xl p-4 transition-all duration-300 animate-fade-in`}
          >
            {/* Header: Title + Close Button */}
            <div className="flex items-start justify-between gap-3 pb-2.5 border-b border-app-border dark:border-app-darkBorder">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                </span>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400 flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5" />
                    {t('new_store_request') || (isTh ? 'มีคำขอใหม่ส่งมาให้ Store' : 'New Store Request')}
                  </h4>
                  <p className="text-[11px] text-app-secondary dark:text-app-darkSecondary font-medium">
                    {isTh ? 'มีคำขอใหม่รอการตรวจสอบและอนุมัติ' : 'New request waiting for Store approval'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => dismissNotif(notif.id, req.id)}
                className="text-app-muted hover:text-app-text dark:hover:text-app-darkText p-1 rounded-lg hover:bg-app-bg dark:hover:bg-app-darkBorder transition-colors"
                title={t('dismiss') || 'Dismiss'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Request Summary Content */}
            <div className="mt-3 space-y-2.5">
              {/* Type & Urgent Badges */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold ${
                      isPR
                        ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                        : 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                    }`}
                  >
                    {isPR ? (
                      <>
                        <ShoppingCart className="w-3 h-3" />
                        {t('purchase_requisition_type') || 'Purchase Requisition (PR)'}
                      </>
                    ) : (
                      <>
                        <ClipboardList className="w-3 h-3" />
                        {t('material_request_type') || 'Material Request'}
                      </>
                    )}
                  </span>

                  {isUrgent && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-red-500 text-white animate-pulse shadow-sm">
                      <Flame className="w-3 h-3 fill-current" />
                      🔴 {t('urgent_tag') || 'URGENT'}
                    </span>
                  )}
                </div>

                <span className="font-mono text-xs font-bold text-app-text dark:text-app-darkText">
                  {req.requestNo}
                </span>
              </div>

              {/* Requester & Dept Info */}
              <div className="bg-app-bg dark:bg-app-darkBg p-2.5 rounded-xl text-xs space-y-1 border border-app-border/60 dark:border-app-darkBorder/60">
                <div className="flex items-center justify-between text-app-text dark:text-app-darkText">
                  <span className="text-app-muted dark:text-app-darkMuted text-[11px]">
                    {t('requested_by') || 'Requester'}:
                  </span>
                  <span className="font-semibold">{req.requesterName || req.requestedBy}</span>
                </div>
                <div className="flex items-center justify-between text-app-secondary dark:text-app-darkSecondary text-[11px]">
                  <span>{req.department || 'Production'} • {req.plant}</span>
                  <span className="font-semibold text-app-text dark:text-app-darkText">
                    {itemCount} {isTh ? 'รายการ' : itemCount === 1 ? 'Item' : 'Items'}
                  </span>
                </div>
                {req.title && (
                  <p className="text-[11px] text-app-muted dark:text-app-darkMuted italic truncate pt-0.5 border-t border-app-border/40 dark:border-app-darkBorder/40">
                    "{req.title}"
                  </p>
                )}
              </div>

              {/* Total Pending Count Indicator & Detailed Breakdown */}
              <div className="p-2 rounded-xl bg-red-50/80 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-xs space-y-1">
                <div className="font-bold text-red-600 dark:text-red-400 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-500 inline-block animate-pulse" />
                    {isTh
                      ? `🔴 ${pendingCount} รายการที่ต้องดำเนินการโดย Store`
                      : `🔴 ${pendingCount} Requests Require Store Action`}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-app-secondary dark:text-app-darkSecondary pl-3.5 flex-wrap">
                  <span>
                    Material Request: <strong className="text-brand-blue">{materialRequests.filter(r => (r.requestType || 'MATERIAL_REQUEST') === 'MATERIAL_REQUEST' && (r.status === 'PENDING_APPROVAL' || r.status === 'STORE_REVIEW')).length}</strong>
                  </span>
                  <span>
                    Purchase Requisition (PR): <strong className="text-purple-600 dark:text-purple-400">{materialRequests.filter(r => r.requestType === 'PURCHASE_REQUISITION' && (r.status === 'PENDING_APPROVAL' || r.status === 'STORE_REVIEW')).length}</strong>
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleViewRequest(req, notif.id)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 active:scale-[0.98] shadow-sm transition-all cursor-pointer"
                >
                  <span>{t('view_request') || (isTh ? 'ดูรายละเอียดคำขอ' : 'View Request')}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => dismissNotif(notif.id, req.id)}
                  className="px-3 py-2 rounded-xl text-xs font-medium text-app-secondary dark:text-app-darkSecondary hover:bg-app-bg dark:hover:bg-app-darkBorder border border-app-border dark:border-app-darkBorder transition-colors cursor-pointer"
                >
                  {t('dismiss') || 'Dismiss'}
                </button>
              </div>
            </div>
          </div>
        );
      })}

      {/* If more than 1 notification, provide a quick View All button */}
      {activeNotifs.length > 1 && (
        <button
          type="button"
          onClick={handleViewAllPending}
          className="pointer-events-auto w-full py-2 px-3 bg-app-text dark:bg-app-darkSurface text-white text-xs font-semibold rounded-xl shadow-modal hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5"
        >
          <span>{t('view_all_pending') || 'View All Pending Requests'}</span>
          <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
            {pendingCount}
          </span>
        </button>
      )}
    </aside>
  );
};
