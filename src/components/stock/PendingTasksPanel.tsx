import React, { useState } from 'react';
import { PendingTask, WorkflowStatus } from '../../types/stock';
import { formatDateTime } from '../../utils/dateRange';
import {
  Clock,
  Building2,
  User,
  Eye,
  FileCheck2,
  PackageCheck,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';
import { PendingTaskDetailModal } from './PendingTaskDetailModal';
import { useLanguage } from '../../context/LanguageContext';

interface PendingTasksPanelProps {
  tasks: PendingTask[];
  onAdvanceWorkflow: (taskId: string, nextStatus: WorkflowStatus) => void;
  onRejectWorkflow: (taskId: string, rejectType: 'REJECTED_STORE' | 'REJECTED_MAINTENANCE', reason: string) => void;
  className?: string;
}

export const PendingTasksPanel: React.FC<PendingTasksPanelProps> = ({
  tasks,
  onAdvanceWorkflow,
  onRejectWorkflow,
  className = '',
}) => {
  const { language } = useLanguage();
  const isTh = language === 'th';

  const [selectedTask, setSelectedTask] = useState<PendingTask | null>(null);

  const getStatusBadge = (status: WorkflowStatus) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            Pending
          </span>
        );
      case 'CREATED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-brand-blue border border-blue-300 dark:border-blue-800">
            Created
          </span>
        );
      case 'ACCEPT':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
            Accepted
          </span>
        );
      case 'FINISH':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800">
            Finished
          </span>
        );
      case 'CONFIRM':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            Confirmed
          </span>
        );
      case 'REJECTED_STORE':
      case 'REJECTED_MAINTENANCE':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-950/60 text-gi border border-rose-300 dark:border-rose-800">
            Rejected
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`p-4 sm:p-5 rounded-2xl bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder shadow-subtle flex flex-col justify-between ${className}`}>
      {/* HEADER */}
      <div className="flex items-center justify-between pb-3 border-b border-app-border dark:border-app-darkBorder">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center shrink-0">
            <FileCheck2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-app-text dark:text-app-darkText uppercase tracking-wider">
              {isTh ? 'คำขอเบิก / PickList ที่รอดำเนินการ' : 'Pending Tasks & PickLists'}
            </h3>
            <p className="text-[10px] sm:text-[11px] text-app-muted">
              {isTh ? 'งานเบิกจ่ายและใบขอเบิกอะไหล่ที่อยู่ใน Workflow' : 'Active material requisition workflow orders'}
            </p>
          </div>
        </div>
        <span className="px-2 py-1 rounded-lg bg-app-bg dark:bg-app-darkBg border border-app-border dark:border-app-darkBorder text-xs font-mono font-bold text-brand-blue">
          {tasks.length} Active
        </span>
      </div>

      {/* TASK CARDS GRID */}
      <div className="mt-3.5 space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
        {tasks.length === 0 ? (
          <div className="py-12 text-center text-app-muted text-xs">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500 opacity-80" />
            <span>All stock workflow requests and PickLists have been processed!</span>
          </div>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className="p-3.5 rounded-xl border border-app-border dark:border-app-darkBorder bg-app-bg/60 dark:bg-app-darkBg/60 hover:bg-app-bg dark:hover:bg-app-darkBg hover:border-brand-blue/40 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
            >
              {/* Left Details */}
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-bold text-xs text-brand-blue">
                    {task.taskNo}
                  </span>
                  <span className="text-[11px] font-mono text-app-muted">
                    ({task.picklistNo})
                  </span>
                  {getStatusBadge(task.status)}
                </div>

                <p className="text-xs font-semibold text-app-text dark:text-app-darkText truncate">
                  {task.title}
                </p>

                <div className="flex flex-wrap items-center gap-3 text-[11px] text-app-secondary dark:text-app-darkSecondary">
                  <span className="flex items-center gap-1 font-mono">
                    <Building2 className="w-3 h-3 text-app-muted" />
                    {task.location}
                  </span>
                  <span>·</span>
                  <span className="font-mono font-semibold">
                    {task.itemCount} Items
                  </span>
                  <span>·</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    ฿{task.totalValue.toLocaleString()}
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1 text-app-muted truncate max-w-xs">
                    <User className="w-3 h-3" />
                    {task.requestedBy}
                  </span>
                </div>
              </div>

              {/* Right View Button */}
              <button
                type="button"
                onClick={() => setSelectedTask(task)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder text-app-text dark:text-app-darkText hover:border-brand-blue hover:text-brand-blue shadow-subtle transition-all shrink-0 self-end sm:self-center"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{isTh ? 'ดูรายละเอียด' : 'View'}</span>
              </button>
            </div>
          ))
        )}
      </div>

      {/* DETAIL MODAL */}
      <PendingTaskDetailModal
        isOpen={Boolean(selectedTask)}
        onClose={() => setSelectedTask(null)}
        task={selectedTask}
        onAdvanceWorkflow={(taskId, nextStatus) => {
          onAdvanceWorkflow(taskId, nextStatus);
          setSelectedTask(null);
        }}
        onRejectWorkflow={(taskId, rejectType, reason) => {
          onRejectWorkflow(taskId, rejectType, reason);
          setSelectedTask(null);
        }}
      />
    </div>
  );
};
