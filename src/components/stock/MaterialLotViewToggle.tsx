import React from 'react';
import { Package, Layers } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export type InventoryViewMode = 'MATERIAL' | 'LOT';

interface MaterialLotViewToggleProps {
  viewMode: InventoryViewMode;
  onChange: (mode: InventoryViewMode) => void;
  className?: string;
  size?: 'sm' | 'md';
}

export const MaterialLotViewToggle: React.FC<MaterialLotViewToggleProps> = ({
  viewMode,
  onChange,
  className = '',
  size = 'md',
}) => {
  const { t } = useLanguage();

  const isSmall = size === 'sm';

  return (
    <div
      className={`inline-flex items-center p-1 rounded-xl bg-app-bg dark:bg-app-darkBg border border-app-border dark:border-app-darkBorder shadow-inner ${className}`}
      role="group"
      aria-label="View Switcher"
    >
      <button
        type="button"
        onClick={() => onChange('MATERIAL')}
        className={`flex items-center gap-1.5 rounded-lg font-bold transition-all ${
          isSmall ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-xs sm:text-sm'
        } ${
          viewMode === 'MATERIAL'
            ? 'bg-white dark:bg-app-darkSurface text-brand-blue shadow-sm ring-1 ring-app-border dark:ring-app-darkBorder'
            : 'text-app-secondary dark:text-app-darkSecondary hover:text-app-text dark:hover:text-app-darkText'
        }`}
      >
        <Package className={isSmall ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
        <span>{t('material_view') || 'Material View'}</span>
      </button>

      <button
        type="button"
        onClick={() => onChange('LOT')}
        className={`flex items-center gap-1.5 rounded-lg font-bold transition-all ${
          isSmall ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-xs sm:text-sm'
        } ${
          viewMode === 'LOT'
            ? 'bg-white dark:bg-app-darkSurface text-brand-blue shadow-sm ring-1 ring-app-border dark:ring-app-darkBorder'
            : 'text-app-secondary dark:text-app-darkSecondary hover:text-app-text dark:hover:text-app-darkText'
        }`}
      >
        <Layers className={isSmall ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
        <span>{t('lot_view') || 'Lot View'}</span>
      </button>
    </div>
  );
};
