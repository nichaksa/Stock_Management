import React, { useState } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PermissionKey } from '../types/auth';

// Layout
import { Header } from '../components/layout/Header';
import { Sidebar } from '../components/layout/Sidebar';

// Pages
import { LoginPage } from '../pages/auth/LoginPage';
import { HomePage } from '../pages/home/HomePage';
import { MasterDataPage } from '../pages/stock/MasterDataPage';
import { StockBalancePage } from '../pages/stock/StockBalancePage';
import { TransactionPage } from '../pages/stock/TransactionPage';
import { InventoryReportPage } from '../pages/stock/InventoryReportPage';
import { UserManagementPage } from '../pages/admin/UserManagementPage';
import { RoleManagementPage } from '../pages/admin/RoleManagementPage';
import { AccessDeniedPage } from '../pages/common/AccessDeniedPage';
import { ComingSoonPage } from '../pages/common/ComingSoonPage';

// Authenticated Layout Wrapper
const AppLayout: React.FC = () => {
  const { currentUser } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-app-bg dark:bg-app-darkBg flex flex-col font-sans transition-colors duration-150">
      <Header
        onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isSidebarCollapsed={isSidebarCollapsed}
      />
      <div className="flex flex-1 relative">
        <Sidebar isCollapsed={isSidebarCollapsed} />
        <main
          className={`flex-1 transition-all duration-200 p-4 sm:p-6 lg:p-8 min-w-0 ${
            isSidebarCollapsed ? 'ml-16' : 'ml-60'
          }`}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
};

// Route Guard with Permission verification
const ProtectedRoute: React.FC<{ permission?: PermissionKey; element: React.ReactElement }> = ({
  permission,
  element,
}) => {
  const { currentUser, hasPermission } = useAuth();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (permission && !hasPermission(permission)) {
    return <AccessDeniedPage />;
  }

  return element;
};

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Login Route */}
      <Route path="/login" element={<LoginPage />} />

      {/* Authenticated Layout */}
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomePage />} />

        {/* Stock Management Routes */}
        <Route
          path="/stock/master-data"
          element={<ProtectedRoute permission="MASTER_VIEW" element={<MasterDataPage />} />}
        />
        <Route
          path="/stock/balance"
          element={<ProtectedRoute permission="STOCK_BALANCE_VIEW" element={<StockBalancePage />} />}
        />
        <Route
          path="/stock/transaction"
          element={<ProtectedRoute permission="TRANSACTION_VIEW" element={<TransactionPage />} />}
        />
        <Route
          path="/stock/inventory-report"
          element={<ProtectedRoute permission="INVENTORY_REPORT_VIEW" element={<InventoryReportPage />} />}
        />

        {/* Administration Routes */}
        <Route
          path="/admin/users"
          element={<ProtectedRoute permission="USER_MANAGEMENT" element={<UserManagementPage />} />}
        />
        <Route
          path="/admin/roles"
          element={<ProtectedRoute permission="ROLE_MANAGEMENT" element={<RoleManagementPage />} />}
        />

        {/* Enterprise Modules */}
        <Route
          path="/modules/:moduleName"
          element={<ComingSoonPage />}
        />

        {/* Access Denied */}
        <Route path="/access-denied" element={<AccessDeniedPage />} />

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
};
