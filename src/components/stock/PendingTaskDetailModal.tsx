import React from 'react';
import { Modal } from '../common/Modal';
import { PendingTask, WorkflowStatus } from '../../types/stock';
import { formatDateTime } from '../../utils/dateRange';
import {
  CheckCircle2,
  Clock,
  Building2,
  User,
  Calendar,
  Layers,
  FileText,
  DollarSign,
  AlertOctagon,
  XCircle,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';

interface PendingTaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: PendingTask | null;
  onAdvanceWorkflow: (taskId: string, nextStatus: WorkflowStatus) => void;
  onRejectWorkflow: (taskId: string, rejectType: 'REJECTED_STORE' | 'REJECTED_MAINTENANCE', reason: string) => void;
}

export const PendingTaskDetailModal: React.FC<PendingTaskDetailModalProps> = ({
  isOpen,
  onClose,
  task,
  onAdvanceWorkflow,
  onRejectWorkflow,
}) => {
  const { language } = useLanguage();
  const { currentUser } = useAuth();
  const isTh = language === 'th';

  if (!task) return null;

  const getStatusBadge = (status: WorkflowStatus) => {
    switch (status) {
      case 'PENDING':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-300 dark:bg-amber-950/50 dark:text-amber-300">Pending Review</span>;
      case 'CREATED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-brand-blue border border-blue-300 dark:bg-blue-950/50 dark:text-blue-300">PickList Created</span>;
      case 'ACCEPT':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-300 dark:bg-purple-950/50 dark:text-purple-300">Store Accepted</span>;
      case 'FINISH':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-300 dark:bg-indigo-950/50 dark:text-indigo-300">Picking Finished</span>;
      case 'CONFIRM':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300">Confirmed & Issued</span>;
      case 'REJECTED_STORE':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-300 dark:bg-rose-950/50 dark:text-rose-300">Rejected by Store</span>;
      case 'REJECTED_MAINTENANCE':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-300 dark:bg-rose-950/50 dark:text-rose-300">Rejected by Maintenance</span>;
      default:
        return null;
    }
  };

  const isRejected = task.status === 'REJECTED_STORE' || task.status === 'REJECTED_MAINTENANCE';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${task.taskNo} - ${task.title}`}
      maxWidthClass="max-w-4xl"
    >
      <div className="space-y-6">
        {/* HEADER INFORMATION STRIP */}
        <div className="p-4 rounded-2xl bg-app-bg dark:bg-app-darkBg border border-app-border dark:border-app-darkBorder grid grid-cols-2 sm:grid-cols-4 gap-3.5 text-xs">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-app-muted block">Cost Center</span>
            <span className="font-mono font-bold text-app-text dark:text-app-darkText mt-0.5 block truncate">
              {task.costCenter}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-app-muted block">Location / Plant</span>
            <span className="font-mono font-bold text-app-text dark:text-app-darkText mt-0.5 block truncate">
              {task.location}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-app-muted block">PickList / Job Order</span>
            <span className="font-mono font-bold text-brand-blue mt-0.5 block truncate">
              {task.picklistNo} ({task.jobOrderNo})
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-app-muted block">Total Valuation</span>
            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block text-sm">
              ฿{task.totalValue.toLocaleString()}
            </span>
          </div>
        </div>

        {/* METRICS BAR: TIME PENDING & REQUEST DETAILS */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5 text-app-secondary dark:text-app-darkSecondary">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span>Time Pending: <strong className="text-app-text dark:text-app-darkText">{task.timePending}</strong></span>
            </div>
            <div className="flex items-center gap-1.5 text-app-secondary dark:text-app-darkSecondary">
              <Calendar className="w-3.5 h-3.5 text-brand-blue" />
              <span>Requested Delivery: <strong className="text-app-text dark:text-app-darkText">{formatDateTime(task.requestedDeliveryDate)}</strong></span>
            </div>
            <div className="flex items-center gap-1.5 text-app-secondary dark:text-app-darkSecondary">
              <User className="w-3.5 h-3.5 text-indigo-500" />
              <span>Requested By: <strong className="text-app-text dark:text-app-darkText">{task.requestedBy}</strong> ({task.requestedDepartment})</span>
            </div>
          </div>
          <div>{getStatusBadge(task.status)}</div>
        </div>

        {/* WORKFLOW TIMELINE */}
        <div className="p-4 rounded-2xl bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder shadow-subtle space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-app-muted">
            {isTh ? 'ขั้นตอนการดำเนินงาน (Workflow Timeline)' : 'Workflow Progression & Audit Trail'}
          </h4>

          {isRejected ? (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2.5">
              <AlertOctagon className="w-5 h-5 shrink-0 text-gi" />
              <div>
                <span className="font-bold block">
                  Workflow Terminated: {task.status === 'REJECTED_STORE' ? 'Rejected by Store' : 'Rejected by Maintenance'}
                </span>
                <span className="text-[11px] opacity-90">{task.rejectReason || 'Request did not meet storage allocation criteria.'}</span>
              </div>
            </div>
          ) : (
            <div className="relative flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
              {task.timeline.map((step, idx) => {
                const isCurrent = step.active;
                const isDone = step.completed;

                return (
                  <div key={step.step} className="flex-1 relative flex sm:flex-col items-center sm:text-center gap-3 sm:gap-2">
                    {/* Circle Node */}
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-all ${
                        isDone
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : isCurrent
                          ? 'bg-brand-blue text-white ring-4 ring-blue-100 dark:ring-blue-950'
                          : 'bg-app-bg dark:bg-app-darkBg border border-app-border dark:border-app-darkBorder text-app-muted'
                      }`}
                    >
                      {isDone ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                    </div>

                    {/* Step Label & Responsible User */}
                    <div className="min-w-0">
                      <span className={`text-xs block font-bold truncate ${isDone || isCurrent ? 'text-app-text dark:text-app-darkText' : 'text-app-muted'}`}>
                        {step.label}
                      </span>
                      {step.timestamp && (
                        <span className="text-[10px] text-app-muted font-mono block">
                          {step.timestamp}
                        </span>
                      )}
                      {step.responsibleUser && (
                        <span className="text-[10px] font-semibold text-brand-blue truncate block">
                          👤 {step.responsibleUser}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* MATERIAL LINES TABLE */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-app-text dark:text-app-darkText">
              {isTh ? 'รายการวัสดุ / อะไหล่ในใบเบิก' : 'Material Line Items'} ({task.materialLines.length} Items)
            </h4>
          </div>

          <div className="overflow-x-auto rounded-xl border border-app-border dark:border-app-darkBorder max-h-60">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-app-bg dark:bg-app-darkBg text-app-secondary dark:text-app-darkSecondary uppercase font-semibold text-[10px] tracking-wider border-b border-app-border dark:border-app-darkBorder">
                <tr>
                  <th className="py-2.5 px-3">Material Code</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3">Element / IO-No</th>
                  <th className="py-2.5 px-3 text-right">Quantity</th>
                  <th className="py-2.5 px-3 text-right">Price / Unit</th>
                  <th className="py-2.5 px-3 text-right">Total Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border dark:divide-app-darkBorder bg-white dark:bg-app-darkSurface">
                {task.materialLines.map((line) => (
                  <tr key={line.id} className="hover:bg-app-bg/50 dark:hover:bg-app-darkBorder/30">
                    <td className="py-2.5 px-3 font-mono font-bold text-brand-blue">
                      {line.materialCode}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-medium text-app-text dark:text-app-darkText block truncate max-w-xs">{line.description}</span>
                      {line.comment && <span className="text-[10px] text-app-muted italic block truncate max-w-xs">{line.comment}</span>}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-app-secondary dark:text-app-darkSecondary">
                      {line.element || '-'} / {line.ioNo || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-app-text dark:text-app-darkText">
                      {line.quantity} {line.unit}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-app-secondary dark:text-app-darkSecondary">
                      ฿{line.pricePerUnit.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-app-text dark:text-app-darkText">
                      ฿{line.totalPrice.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* WORKFLOW ACTION BUTTONS */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-app-border dark:border-app-darkBorder">
          <div className="flex items-center gap-2">
            {!isRejected && task.status !== 'CONFIRM' && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    const reason = prompt('Enter reason for store rejection:') || 'Rejected by Store';
                    onRejectWorkflow(task.id, 'REJECTED_STORE', reason);
                    onClose();
                  }}
                  className="px-3 py-2 text-xs font-semibold rounded-xl text-gi hover:bg-gi-bg border border-red-200 dark:border-red-900 transition-colors"
                >
                  Reject by Store
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const reason = prompt('Enter reason for maintenance rejection:') || 'Rejected by Maintenance';
                    onRejectWorkflow(task.id, 'REJECTED_MAINTENANCE', reason);
                    onClose();
                  }}
                  className="px-3 py-2 text-xs font-semibold rounded-xl text-gi hover:bg-gi-bg border border-red-200 dark:border-red-900 transition-colors"
                >
                  Reject by Maintenance
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-app-border dark:border-app-darkBorder bg-white dark:bg-app-darkSurface text-app-secondary hover:text-app-text transition-colors shadow-subtle"
            >
              Close
            </button>

            {task.status === 'PENDING' && (
              <button
                type="button"
                onClick={() => {
                  onAdvanceWorkflow(task.id, 'CREATED');
                  onClose();
                }}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-brand-blue text-white hover:bg-brand-darkBlue transition-colors shadow-subtle flex items-center gap-1.5"
              >
                <span>Approve & Create PickList</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {task.status === 'CREATED' && (
              <button
                type="button"
                onClick={() => {
                  onAdvanceWorkflow(task.id, 'ACCEPT');
                  onClose();
                }}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-purple-600 text-white hover:bg-purple-700 transition-colors shadow-subtle flex items-center gap-1.5"
              >
                <span>Accept & Begin Picking</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {task.status === 'ACCEPT' && (
              <button
                type="button"
                onClick={() => {
                  onAdvanceWorkflow(task.id, 'FINISH');
                  onClose();
                }}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-subtle flex items-center gap-1.5"
              >
                <span>Finish Picking</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {task.status === 'FINISH' && (
              <button
                type="button"
                onClick={() => {
                  onAdvanceWorkflow(task.id, 'CONFIRM');
                  onClose();
                }}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-subtle flex items-center gap-1.5"
              >
                <span>Confirm & Issue Stock</span>
                <CheckCircle2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
