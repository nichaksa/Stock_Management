import React from 'react';
import { AlertTriangle, Trash2, RefreshCw, AlertCircle } from 'lucide-react';
import { Modal } from './Modal';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "danger",
  isLoading = false,
}) => {
  const getIcon = () => {
    switch (type) {
      case 'danger':
        return <Trash2 className="w-6 h-6 text-gi" />;
      case 'warning':
        return <AlertTriangle className="w-6 h-6 text-warn" />;
      default:
        return <AlertCircle className="w-6 h-6 text-brand-blue" />;
    }
  };

  const getConfirmBtnClass = () => {
    switch (type) {
      case 'danger':
        return 'bg-gi hover:bg-red-700 text-white shadow-sm';
      case 'warning':
        return 'bg-warn hover:bg-amber-700 text-white shadow-sm';
      default:
        return 'bg-brand-blue hover:bg-brand-hoverBlue text-white shadow-sm';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidthClass="max-w-md"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-xs font-semibold text-app-secondary dark:text-app-darkSecondary hover:text-app-text dark:hover:text-app-darkText bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder rounded-lg transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${getConfirmBtnClass()} ${
              isLoading ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            {isLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
            {confirmText}
          </button>
        </>
      }
    >
      <div className="flex items-start gap-4">
        <div
          className={`p-3 rounded-xl shrink-0 ${
            type === 'danger'
              ? 'bg-gi-bg dark:bg-gi-darkBg'
              : type === 'warning'
              ? 'bg-warn-bg dark:bg-warn-darkBg'
              : 'bg-brand-softBlue dark:bg-blue-950/40'
          }`}
        >
          {getIcon()}
        </div>
        <div>
          <h4 className="text-sm font-semibold text-app-text dark:text-app-darkText">
            {title}
          </h4>
          <p className="text-xs text-app-secondary dark:text-app-darkSecondary mt-1 leading-relaxed">
            {message}
          </p>
        </div>
      </div>
    </Modal>
  );
};
