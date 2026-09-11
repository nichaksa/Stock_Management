import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Menu,
  Home,
  FileBarChart2,
  HelpCircle,
  Sun,
  Moon,
  Globe,
  Bell,
  User as UserIcon,
  LogOut,
  RefreshCw,
  ChevronDown,
  Shield,
  Building2,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { useStock } from '../../context/StockContext';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { Modal } from '../common/Modal';

interface HeaderProps {
  onToggleSidebar: () => void;
  isSidebarCollapsed: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const navigate = useNavigate();
  const { currentUser, logout, hasPermission } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, toggleLanguage, t } = useLanguage();
  const { addToast } = useToast();
  const { resetStockDemoData } = useStock();

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
      if (reportRef.current && !reportRef.current.contains(e.target as Node)) {
        setIsReportOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    addToast('You have signed out successfully.', 'info');
    navigate('/login');
  };

  const handleResetDemo = () => {
    resetStockDemoData();
    setIsResetConfirmOpen(false);
    setIsProfileOpen(false);
    addToast('All demo materials, transactions, and users have been reset to initial factory state.', 'success');
  };

  // Filter report options according to permissions
  const reportOptions = [
    { label: "M-Pros - Dashboard", path: "/modules/m-pros", perm: "MPROS_VIEW" },
    { label: "M-Pros - Dashboard Analysis", path: "/modules/m-pros", perm: "MPROS_VIEW" },
    { label: "WorkPermit - Dashboard", path: "/modules/work-permit", perm: "WORK_PERMIT_VIEW" },
    { label: "Unsafe - Dashboard", path: "/modules/unsafe", perm: "UNSAFE_VIEW" },
    { label: "Z-PAP - Alarm Realtime", path: "/modules/z-pap", perm: "ZPAP_VIEW" },
    { label: "Z-PAP - Alarm Management", path: "/modules/z-pap", perm: "ZPAP_VIEW" },
    { label: "Stock - Inventory Report", path: "/stock/inventory-report", perm: "INVENTORY_REPORT_VIEW" },
  ].filter(r => hasPermission(r.perm as any));

  return (
    <>
      <header className="h-16 px-4 border-b border-[#E5EAF1] dark:border-app-darkBorder bg-white dark:bg-app-darkSurface sticky top-0 z-40 flex items-center justify-between shadow-subtle shrink-0">
        {/* LEFT SECTION */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="p-2 rounded-lg text-app-secondary dark:text-app-darkSecondary hover:text-app-text dark:hover:text-app-darkText hover:bg-app-bg dark:hover:bg-app-darkBorder transition-colors focus:outline-none"
            aria-label="Toggle Sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Logo / Brand */}
          <Link to="/" className="flex items-center gap-2.5 mr-2">
            <div className="w-8 h-8 rounded-lg bg-brand-blue flex items-center justify-center text-white font-bold text-base shadow-sm">
              Z
            </div>
            <div className="hidden md:block">
              <span className="font-bold text-sm tracking-wider text-app-text dark:text-app-darkText">
                ZYCODA
              </span>
              <span className="text-[10px] text-app-muted dark:text-app-darkMuted block -mt-1 font-mono tracking-widest uppercase">
                Stock OS
              </span>
            </div>
          </Link>

          {/* Home shortcut */}
          <Link
            to="/"
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-app-secondary dark:text-app-darkSecondary hover:text-app-text dark:hover:text-app-darkText hover:bg-app-bg dark:hover:bg-app-darkBorder rounded-lg transition-colors"
          >
            <Home className="w-4 h-4 text-app-muted" />
            <span>{t('home')}</span>
          </Link>

          {/* Report Dropdown */}
          {reportOptions.length > 0 && (
            <div className="relative" ref={reportRef}>
              <button
                type="button"
                onClick={() => setIsReportOpen(!isReportOpen)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-app-secondary dark:text-app-darkSecondary hover:text-app-text dark:hover:text-app-darkText hover:bg-app-bg dark:hover:bg-app-darkBorder rounded-lg transition-colors"
              >
                <FileBarChart2 className="w-4 h-4 text-app-muted" />
                <span>{t('reports')}</span>
                <ChevronDown className="w-3 h-3 text-app-muted" />
              </button>

              {isReportOpen && (
                <div className="absolute left-0 mt-1.5 w-64 bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder rounded-xl shadow-modal z-40 py-1.5 animate-fade-in">
                  <div className="px-3 py-1 text-[10px] font-semibold text-app-muted uppercase tracking-wider">
                    Quick Reports
                  </div>
                  {reportOptions.map((opt, i) => (
                    <Link
                      key={i}
                      to={opt.path}
                      onClick={() => setIsReportOpen(false)}
                      className="block px-3 py-1.5 text-xs text-app-text dark:text-app-darkText hover:bg-brand-softBlue dark:hover:bg-blue-950/40 hover:text-brand-blue transition-colors"
                    >
                      {opt.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Help Button */}
          <button
            type="button"
            onClick={() => setIsHelpOpen(true)}
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-app-secondary dark:text-app-darkSecondary hover:text-app-text dark:hover:text-app-darkText hover:bg-app-bg dark:hover:bg-app-darkBorder rounded-lg transition-colors"
          >
            <HelpCircle className="w-4 h-4 text-app-muted" />
            <span>{t('help')}</span>
          </button>
        </div>

        {/* RIGHT SECTION */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Language Selector */}
          <div className="inline-flex items-center rounded-lg border border-app-border dark:border-app-darkBorder bg-app-bg dark:bg-app-darkBg p-0.5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                language === 'en'
                  ? 'bg-brand-blue text-white shadow-xs font-bold'
                  : 'text-app-secondary dark:text-app-darkSecondary hover:text-app-text dark:hover:text-app-darkText'
              }`}
              title="Switch to English"
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLanguage('th')}
              className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                language === 'th'
                  ? 'bg-brand-blue text-white shadow-xs font-bold'
                  : 'text-app-secondary dark:text-app-darkSecondary hover:text-app-text dark:hover:text-app-darkText'
              }`}
              title="เปลี่ยนเป็นภาษาไทย"
            >
              TH
            </button>
          </div>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-lg text-app-secondary dark:text-app-darkSecondary hover:text-app-text dark:hover:text-app-darkText hover:bg-app-bg dark:hover:bg-app-darkBorder transition-colors cursor-pointer"
            title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
          >
            {theme === 'light' ? (
              <Moon className="w-4 h-4 text-app-secondary" />
            ) : (
              <Sun className="w-4 h-4 text-amber-400" />
            )}
          </button>

          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="p-2 rounded-lg text-app-secondary dark:text-app-darkSecondary hover:text-app-text dark:hover:text-app-darkText hover:bg-app-bg dark:hover:bg-app-darkBorder transition-colors relative"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-gi ring-2 ring-white dark:ring-app-darkSurface" />
            </button>

            {isNotifOpen && (
              <div className="absolute right-0 mt-1.5 w-80 bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder rounded-2xl shadow-modal z-40 p-3 animate-fade-in">
                <div className="flex items-center justify-between pb-2 border-b border-app-border dark:border-app-darkBorder">
                  <span className="text-xs font-semibold text-app-text dark:text-app-darkText">
                    Stock Alerts
                  </span>
                  <span className="text-[10px] bg-gi-bg text-gi px-1.5 py-0.5 rounded font-bold">
                    3 Alerts
                  </span>
                </div>
                <div className="mt-2 space-y-2 text-xs">
                  <div className="p-2 rounded-lg bg-gi-bg/60 dark:bg-gi-darkBg border border-gi/20">
                    <p className="font-semibold text-gi">Out of Stock Alert</p>
                    <p className="text-app-secondary dark:text-app-darkSecondary text-[11px] mt-0.5">
                      LOADCELL 2T Philips (C203001004) reached 0 EA.
                    </p>
                  </div>
                  <div className="p-2 rounded-lg bg-warn-bg/60 dark:bg-warn-darkBg border border-warn/20">
                    <p className="font-semibold text-warn">Reorder Level Reached</p>
                    <p className="text-app-secondary dark:text-app-darkSecondary text-[11px] mt-0.5">
                      FLOWMETER 80MM (C203001010) is below ROP threshold.
                    </p>
                  </div>
                  <div className="p-2 rounded-lg bg-brand-softBlue/60 dark:bg-blue-950/40 border border-brand-blue/20">
                    <p className="font-semibold text-brand-blue">System Active</p>
                    <p className="text-app-secondary dark:text-app-darkSecondary text-[11px] mt-0.5">
                      Stock engine synced with local storage ledger.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* User Profile */}
          <div className="relative" ref={profileRef}>
            <button
              type="button"
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-app-bg dark:hover:bg-app-darkBorder border border-transparent hover:border-app-border dark:hover:border-app-darkBorder transition-all"
            >
              <div className="w-8 h-8 rounded-lg bg-brand-softBlue dark:bg-blue-950 text-brand-blue font-bold flex items-center justify-center text-xs border border-brand-blue/20">
                {currentUser?.fullName ? currentUser.fullName.slice(0, 2).toUpperCase() : 'AD'}
              </div>
              <div className="hidden lg:block text-left">
                <div className="text-xs font-semibold text-app-text dark:text-app-darkText leading-tight">
                  {currentUser?.fullName || currentUser?.username}
                </div>
                <div className="text-[10px] text-app-secondary dark:text-app-darkSecondary">
                  {currentUser?.roleName}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-app-muted dark:text-app-darkMuted hidden sm:block" />
            </button>

            {isProfileOpen && (
              <div className="absolute right-0 mt-1.5 w-64 bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder rounded-2xl shadow-modal z-40 p-2.5 animate-fade-in">
                <div className="px-2.5 py-2 border-b border-app-border dark:border-app-darkBorder mb-1.5">
                  <p className="text-xs font-bold text-app-text dark:text-app-darkText">
                    {currentUser?.fullName}
                  </p>
                  <p className="text-[11px] text-app-muted dark:text-app-darkMuted font-mono">
                    @{currentUser?.username}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1 text-[10px]">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-app-bg dark:bg-app-darkBg text-app-secondary dark:text-app-darkSecondary border border-app-border dark:border-app-darkBorder">
                      <Shield className="w-2.5 h-2.5 text-brand-blue" />
                      {currentUser?.roleName}
                    </span>
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-app-bg dark:bg-app-darkBg text-app-secondary dark:text-app-darkSecondary border border-app-border dark:border-app-darkBorder">
                      <Building2 className="w-2.5 h-2.5 text-brand-blue" />
                      {currentUser?.department}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsResetConfirmOpen(true)}
                  className="w-full flex items-center gap-2 px-2.5 py-2 text-xs text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-lg transition-colors text-left"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{t('reset_demo_data')}</span>
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-2.5 py-2 text-xs text-gi hover:bg-gi-bg dark:hover:bg-gi-darkBg rounded-lg transition-colors text-left mt-0.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{t('logout')}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Reset Demo Data Confirm Dialog */}
      <ConfirmDialog
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={handleResetDemo}
        title="Reset All Demo Data"
        message="This will restore all materials, stock transactions, users, and roles to the initial factory baseline. Any modifications you made will be cleared."
        confirmText="Reset to Defaults"
        type="warning"
      />

      {/* Help Modal */}
      <Modal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        title="ZYCODA Stock Management Help & Reference"
        subtitle="Industrial Factory Spare Part & Material Operating System"
        maxWidthClass="max-w-xl"
      >
        <div className="space-y-4 text-xs text-app-secondary dark:text-app-darkSecondary leading-relaxed">
          <div className="p-3 rounded-xl bg-brand-softBlue/60 dark:bg-blue-950/40 border border-brand-blue/20">
            <h4 className="font-semibold text-brand-blue mb-1">System Principles</h4>
            <p>
              This system records real spare-part lifecycle movements. Stock quantities are never edited directly in master data—they are derived strictly from traceable transactions (Opening Balance, Goods Receipt, Goods Issue, and Stock Adjustment).
            </p>
          </div>

          <div>
            <h5 className="font-semibold text-app-text dark:text-app-darkText mb-1">Stock Status Criteria:</h5>
            <ul className="space-y-1 list-disc pl-4">
              <li><strong className="text-gi">OUT OF STOCK</strong>: Quantity ≤ 0</li>
              <li><strong className="text-purple-600">OVERMAX</strong>: Quantity &gt; Max Stock threshold</li>
              <li><strong className="text-amber-600">UNDERMIN</strong>: Quantity &lt; Min Stock threshold</li>
              <li><strong className="text-warn">REORDERING</strong>: Quantity ≤ Reorder Point (ROP)</li>
              <li><strong className="text-gr">NORMAL</strong>: Healthy balance within acceptable boundaries</li>
            </ul>
          </div>

          <div>
            <h5 className="font-semibold text-app-text dark:text-app-darkText mb-1">Testing Flow:</h5>
            <ol className="space-y-1 list-decimal pl-4">
              <li>Create custom store users from <strong>Administration &gt; User Management</strong>.</li>
              <li>Create materials in <strong>Master Data</strong> with optional Opening Quantity.</li>
              <li>Perform Goods Receipt (+GR) or Goods Issue (-GI) in <strong>Stock Balance</strong>.</li>
              <li>Inspect real-time starting balance graphs and expandable history in <strong>Material Detail</strong>.</li>
            </ol>
          </div>
        </div>
      </Modal>
    </>
  );
};
