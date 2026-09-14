import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home,
  Database,
  Layers,
  ArrowLeftRight,
  FileSpreadsheet,
  Users,
  ShieldCheck,
  Cpu,
  FileCheck2,
  AlertOctagon,
  Radio,
  Activity,
  Boxes,
  ShieldAlert,
  ClipboardList,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useStock } from '../../context/StockContext';
import { PermissionKey } from '../../types/auth';

interface SidebarProps {
  isCollapsed: boolean;
}

interface NavItem {
  name: string;
  path: string;
  icon: React.ReactNode;
  permission?: PermissionKey;
}

interface NavSection {
  title: string;
  permissionCheck?: (hasPermission: (perm: PermissionKey) => boolean) => boolean;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed }) => {
  const { hasPermission, currentUser } = useAuth();
  const { t } = useLanguage();
  const { materialRequests } = useStock();

  const isStoreApprover = hasPermission('STORE_APPROVAL') || currentUser?.roleName === 'Store' || currentUser?.roleName === 'Admin';
  const pendingStoreCount = React.useMemo(() => {
    if (!isStoreApprover) return 0;
    return materialRequests.filter(
      r => r.status === 'PENDING_APPROVAL' || r.status === 'STORE_REVIEW'
    ).length;
  }, [materialRequests, isStoreApprover]);

  const sections: NavSection[] = [
    {
      title: t('stock_management'),
      items: [
        {
          name: t('master_data'),
          path: '/stock/master-data',
          icon: <Database className="w-4 h-4" />,
          permission: 'MASTER_VIEW',
        },
        {
          name: t('material_request') || 'Material Request',
          path: '/stock/request',
          icon: <ClipboardList className="w-4 h-4" />,
          permission: 'REQUEST_VIEW',
        },
        {
          name: t('store_approval') || 'Store Approval',
          path: '/stock/approval',
          icon: <FileCheck2 className="w-4 h-4 text-brand-blue" />,
          permission: 'STORE_APPROVAL',
        },
        {
          name: t('stock_balance'),
          path: '/stock/balance',
          icon: <Layers className="w-4 h-4" />,
          permission: 'STOCK_BALANCE_VIEW',
        },
        {
          name: t('transaction'),
          path: '/stock/transaction',
          icon: <ArrowLeftRight className="w-4 h-4" />,
          permission: 'TRANSACTION_VIEW',
        },
        {
          name: t('inventory_report'),
          path: '/stock/inventory-report',
          icon: <FileSpreadsheet className="w-4 h-4" />,
          permission: 'INVENTORY_REPORT_VIEW',
        },
      ],
    },
    {
      title: t('enterprise_modules'),
      items: [
        {
          name: 'M-Pros',
          path: '/modules/m-pros',
          icon: <Cpu className="w-4 h-4" />,
          permission: 'MPROS_VIEW',
        },
        {
          name: 'Work Permit',
          path: '/modules/work-permit',
          icon: <FileCheck2 className="w-4 h-4" />,
          permission: 'WORK_PERMIT_VIEW',
        },
        {
          name: 'Unsafe',
          path: '/modules/unsafe',
          icon: <AlertOctagon className="w-4 h-4" />,
          permission: 'UNSAFE_VIEW',
        },
        {
          name: 'Z-Sensor',
          path: '/modules/z-sensor',
          icon: <Radio className="w-4 h-4" />,
          permission: 'ZSENSOR_VIEW',
        },
        {
          name: 'Z-PAP',
          path: '/modules/z-pap',
          icon: <Activity className="w-4 h-4" />,
          permission: 'ZPAP_VIEW',
        },
      ],
    },
    {
      title: t('administration'),
      items: [
        {
          name: t('user_management'),
          path: '/admin/users',
          icon: <Users className="w-4 h-4" />,
          permission: 'USER_MANAGEMENT',
        },
        {
          name: t('role_permission'),
          path: '/admin/roles',
          icon: <ShieldCheck className="w-4 h-4" />,
          permission: 'ROLE_MANAGEMENT',
        },
      ],
    },
  ];

  return (
    <aside
      className={`fixed left-0 top-16 h-[calc(100vh-64px)] bg-white dark:bg-app-darkSurface border-r border-[#E5EAF1] dark:border-app-darkBorder z-30 transition-all duration-200 flex flex-col ${isCollapsed ? 'w-16' : 'w-60'
        }`}
    >
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-2.5 space-y-4">
        {/* Home Item */}
        <div>
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all group relative ${isActive
                ? 'bg-brand-blue text-white shadow-sm font-semibold'
                : 'text-app-secondary dark:text-app-darkSecondary hover:bg-app-bg dark:hover:bg-app-darkBorder hover:text-app-text dark:hover:text-app-darkText'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Home className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-app-muted group-hover:text-app-text dark:group-hover:text-app-darkText'}`} />
                {!isCollapsed && <span className="truncate">{t('home')}</span>}

                {/* Collapsed Tooltip */}
                {isCollapsed && (
                  <div className="absolute left-full ml-2 px-2.5 py-1 bg-app-text dark:bg-app-darkSurface text-white dark:text-app-darkText text-xs rounded-lg shadow-modal whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                    {t('home')}
                  </div>
                )}
              </>
            )}
          </NavLink>
        </div>

        {/* Section Groups */}
        {sections.map((section, idx) => {
          // Filter items by permission
          const visibleItems = section.items.filter(
            item => !item.permission || hasPermission(item.permission)
          );

          if (visibleItems.length === 0) return null;

          return (
            <div key={idx} className="space-y-1">
              {!isCollapsed && (
                <div className="px-3 py-1 text-[10px] font-bold text-app-muted dark:text-app-darkMuted uppercase tracking-wider">
                  {section.title}
                </div>
              )}
              {isCollapsed && (
                <div className="w-8 mx-auto border-t border-app-border dark:border-app-darkBorder my-2" />
              )}

              {visibleItems.map(item => {
                const isApproval = item.path === '/stock/approval';
                const showBadge = isApproval && pendingStoreCount > 0;

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all group relative ${isActive
                        ? 'bg-brand-blue text-white shadow-sm font-semibold'
                        : 'text-app-secondary dark:text-app-darkSecondary hover:bg-app-bg dark:hover:bg-app-darkBorder hover:text-app-text dark:hover:text-app-darkText'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span className={`relative shrink-0 ${isActive ? 'text-white' : 'text-app-muted group-hover:text-app-text dark:group-hover:text-app-darkText'}`}>
                          {item.icon}
                          {/* Collapsed Badge Dot / Count */}
                          {isCollapsed && showBadge && (
                            <span className="absolute -top-1.5 -right-2 min-w-[15px] h-[15px] px-1 text-[9px] font-bold bg-red-500 text-white rounded-full flex items-center justify-center ring-2 ring-white dark:ring-app-darkSurface shadow-sm animate-pulse">
                              {pendingStoreCount > 99 ? '99+' : pendingStoreCount}
                            </span>
                          )}
                        </span>
                        {!isCollapsed && (
                          <div className="flex items-center justify-between flex-1 min-w-0">
                            <span className="truncate">{item.name}</span>
                            {showBadge && (
                              <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[11px] font-bold text-white bg-red-500 dark:bg-red-600 rounded-full shadow-sm">
                                {pendingStoreCount}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Tooltip on collapsed hover */}
                        {isCollapsed && (
                          <div className="absolute left-full ml-2 px-2.5 py-1 bg-app-text dark:bg-app-darkSurface text-white dark:text-app-darkText text-xs rounded-lg shadow-modal whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 flex items-center gap-1.5">
                            <span>{item.name}</span>
                            {showBadge && (
                              <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                {pendingStoreCount}
                              </span>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Footer Info / Plant badge */}
      {!isCollapsed && (
        <div className="p-3 border-t border-app-border dark:border-app-darkBorder bg-app-bg/50 dark:bg-app-darkBg/50 text-[11px] text-app-muted dark:text-app-darkMuted flex items-center justify-between">
          <span className="font-mono">v2.6 Enterprise</span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-gr" />
            Connected
          </span>
        </div>
      )}
    </aside>
  );
};
