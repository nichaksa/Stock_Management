import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export const Breadcrumbs: React.FC = () => {
  const location = useLocation();
  const { t } = useLanguage();

  const path = location.pathname;

  const getBreadcrumbItems = () => {
    if (path === '/') {
      return [{ label: t('home'), path: '/' }];
    }

    if (path.startsWith('/stock/master-data')) {
      return [
        { label: t('home'), path: '/' },
        { label: t('stock_management'), path: '/stock/master-data' },
        { label: t('master_data'), path: '/stock/master-data' },
      ];
    }

    if (path.startsWith('/stock/balance')) {
      return [
        { label: t('home'), path: '/' },
        { label: t('stock_management'), path: '/stock/balance' },
        { label: t('stock_balance'), path: '/stock/balance' },
      ];
    }

    if (path.startsWith('/stock/transaction')) {
      return [
        { label: t('home'), path: '/' },
        { label: t('stock_management'), path: '/stock/transaction' },
        { label: t('transaction'), path: '/stock/transaction' },
      ];
    }

    if (path.startsWith('/stock/inventory-report')) {
      return [
        { label: t('home'), path: '/' },
        { label: t('stock_management'), path: '/stock/inventory-report' },
        { label: t('inventory_report'), path: '/stock/inventory-report' },
      ];
    }

    if (path.startsWith('/admin/users')) {
      return [
        { label: t('home'), path: '/' },
        { label: t('administration'), path: '/admin/users' },
        { label: t('user_management'), path: '/admin/users' },
      ];
    }

    if (path.startsWith('/admin/roles')) {
      return [
        { label: t('home'), path: '/' },
        { label: t('administration'), path: '/admin/roles' },
        { label: t('role_permission'), path: '/admin/roles' },
      ];
    }

    if (path.startsWith('/modules/')) {
      const moduleName = path.split('/')[2];
      return [
        { label: t('home'), path: '/' },
        { label: t('enterprise_modules'), path: '/' },
        { label: moduleName.toUpperCase(), path },
      ];
    }

    return [{ label: t('home'), path: '/' }];
  };

  const items = getBreadcrumbItems();

  return (
    <nav className="flex items-center gap-1.5 text-xs text-app-muted dark:text-app-darkMuted mb-2">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <React.Fragment key={index}>
            {index > 0 && <ChevronRight className="w-3.5 h-3.5 text-app-muted/60 shrink-0" />}
            {isLast ? (
              <span className="font-semibold text-app-text dark:text-app-darkText">
                {item.label}
              </span>
            ) : (
              <Link
                to={item.path}
                className="hover:text-brand-blue transition-colors flex items-center gap-1"
              >
                {index === 0 && <Home className="w-3 h-3" />}
                <span>{item.label}</span>
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
