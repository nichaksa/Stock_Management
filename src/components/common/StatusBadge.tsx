import React from 'react';
import { StockStatus } from '../../types/stock';
import { useLanguage } from '../../context/LanguageContext';

interface StatusBadgeProps {
  status: StockStatus | 'ACTIVE' | 'INACTIVE' | 'OPENING' | 'GR' | 'GI' | 'ADJUSTMENT' | string;
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md', showDot = true }) => {
  const { language } = useLanguage();

  const getStyleAndLabel = () => {
    switch (status) {
      case 'NORMAL':
        return {
          bg: 'bg-gr-bg dark:bg-gr-darkBg',
          text: 'text-gr dark:text-gr-dark',
          border: 'border-gr/30 dark:border-gr/40',
          dot: 'bg-gr',
          label: language === 'th' ? 'ปกติ' : 'NORMAL',
        };
      case 'REORDERING':
        return {
          bg: 'bg-warn-bg dark:bg-warn-darkBg',
          text: 'text-warn dark:text-warn-dark',
          border: 'border-warn/30 dark:border-warn/40',
          dot: 'bg-warn',
          label: language === 'th' ? 'สั่งซื้อเพิ่ม' : 'REORDERING',
        };
      case 'OVERMAX':
        return {
          bg: 'bg-purple-50 dark:bg-purple-950/40',
          text: 'text-purple-700 dark:text-purple-300',
          border: 'border-purple-200 dark:border-purple-800/60',
          dot: 'bg-purple-600 dark:bg-purple-400',
          label: language === 'th' ? 'เกินพิกัด' : 'OVERMAX',
        };
      case 'UNDERMIN':
        return {
          bg: 'bg-amber-50 dark:bg-amber-950/40',
          text: 'text-amber-700 dark:text-amber-300',
          border: 'border-amber-200 dark:border-amber-800/60',
          dot: 'bg-amber-600 dark:bg-amber-400',
          label: language === 'th' ? 'ต่ำกว่าเกณฑ์' : 'UNDERMIN',
        };
      case 'OUT_OF_STOCK':
        return {
          bg: 'bg-gi-bg dark:bg-gi-darkBg',
          text: 'text-gi dark:text-gi-dark',
          border: 'border-gi/30 dark:border-gi/40',
          dot: 'bg-gi',
          label: language === 'th' ? 'สินค้าหมด' : 'OUT OF STOCK',
        };
      case 'ACTIVE':
        return {
          bg: 'bg-gr-bg dark:bg-gr-darkBg',
          text: 'text-gr dark:text-gr-dark',
          border: 'border-gr/30 dark:border-gr/40',
          dot: 'bg-gr',
          label: language === 'th' ? 'ใช้งาน' : 'ACTIVE',
        };
      case 'INACTIVE':
        return {
          bg: 'bg-gray-100 dark:bg-gray-800',
          text: 'text-gray-600 dark:text-gray-400',
          border: 'border-gray-300 dark:border-gray-700',
          dot: 'bg-gray-400',
          label: language === 'th' ? 'ระงับการใช้' : 'INACTIVE',
        };
      case 'GR':
        return {
          bg: 'bg-gr-bg dark:bg-gr-darkBg',
          text: 'text-gr dark:text-gr-dark',
          border: 'border-gr/30 dark:border-gr/40',
          dot: 'bg-gr',
          label: 'GR (Receipt)',
        };
      case 'GI':
        return {
          bg: 'bg-gi-bg dark:bg-gi-darkBg',
          text: 'text-gi dark:text-gi-dark',
          border: 'border-gi/30 dark:border-gi/40',
          dot: 'bg-gi',
          label: 'GI (Issue)',
        };
      case 'OPENING':
        return {
          bg: 'bg-brand-softBlue dark:bg-blue-950/50',
          text: 'text-brand-blue dark:text-blue-400',
          border: 'border-brand-blue/30 dark:border-blue-800/60',
          dot: 'bg-brand-blue',
          label: 'OPENING',
        };
      case 'ADJUSTMENT':
        return {
          bg: 'bg-indigo-50 dark:bg-indigo-950/40',
          text: 'text-indigo-700 dark:text-indigo-300',
          border: 'border-indigo-200 dark:border-indigo-800/60',
          dot: 'bg-indigo-600 dark:bg-indigo-400',
          label: 'ADJUSTMENT',
        };
      default:
        return {
          bg: 'bg-gray-50 dark:bg-gray-800',
          text: 'text-gray-700 dark:text-gray-300',
          border: 'border-gray-200 dark:border-gray-700',
          dot: 'bg-gray-500',
          label: status,
        };
    }
  };

  const { bg, text, border, dot, label } = getStyleAndLabel();

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 font-medium',
    md: 'text-xs px-2.5 py-1 font-medium',
    lg: 'text-sm px-3 py-1.5 font-semibold',
  }[size];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border whitespace-nowrap tracking-wide font-sans ${bg} ${text} ${border} ${sizeClasses}`}
    >
      {showDot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />}
      {label}
    </span>
  );
};
