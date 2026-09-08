import { Role, PermissionKey } from '../types/auth';

export const ALL_PERMISSIONS: { key: PermissionKey; label: string; group: string }[] = [
  // Stock Management
  { key: "MASTER_VIEW", label: "View Master Data", group: "STOCK MANAGEMENT" },
  { key: "MASTER_CREATE", label: "Create Material", group: "STOCK MANAGEMENT" },
  { key: "MASTER_EDIT", label: "Edit Material", group: "STOCK MANAGEMENT" },
  { key: "STOCK_BALANCE_VIEW", label: "View Stock Balance", group: "STOCK MANAGEMENT" },
  { key: "GR_CREATE", label: "Create Goods Receipt (GR)", group: "STOCK MANAGEMENT" },
  { key: "GI_CREATE", label: "Create Goods Issue (GI)", group: "STOCK MANAGEMENT" },
  { key: "STOCK_ADJUST", label: "Adjust Stock", group: "STOCK MANAGEMENT" },
  { key: "MOVEMENT_HISTORY_VIEW", label: "View Movement History", group: "STOCK MANAGEMENT" },
  { key: "TRANSACTION_VIEW", label: "View All Transactions", group: "STOCK MANAGEMENT" },
  { key: "INVENTORY_REPORT_VIEW", label: "View Inventory Report", group: "STOCK MANAGEMENT" },

  // Administration
  { key: "USER_MANAGEMENT", label: "User Management", group: "ADMINISTRATION" },
  { key: "ROLE_MANAGEMENT", label: "Role & Permission Management", group: "ADMINISTRATION" },

  // Enterprise Modules
  { key: "MPROS_VIEW", label: "M-Pros Access", group: "ENTERPRISE MODULES" },
  { key: "WORK_PERMIT_VIEW", label: "Work Permit Access", group: "ENTERPRISE MODULES" },
  { key: "UNSAFE_VIEW", label: "Unsafe Module Access", group: "ENTERPRISE MODULES" },
  { key: "ZSENSOR_VIEW", label: "Z-Sensor Access", group: "ENTERPRISE MODULES" },
  { key: "ZPAP_VIEW", label: "Z-PAP Access", group: "ENTERPRISE MODULES" },
];

export const INITIAL_ROLES: Role[] = [
  {
    id: "role-admin",
    name: "Admin",
    description: "Full system administration and inventory control access",
    permissions: ALL_PERMISSIONS.map(p => p.key),
    isSystem: true,
  },
  {
    id: "role-store-op",
    name: "Store Operator",
    description: "Daily warehouse store operations: Master, Balance, GR, GI, Adjust, Reports",
    permissions: [
      "MASTER_VIEW",
      "MASTER_CREATE",
      "MASTER_EDIT",
      "STOCK_BALANCE_VIEW",
      "GR_CREATE",
      "GI_CREATE",
      "STOCK_ADJUST",
      "MOVEMENT_HISTORY_VIEW",
      "TRANSACTION_VIEW",
      "INVENTORY_REPORT_VIEW",
    ],
  },
  {
    id: "role-store-view",
    name: "Store Viewer",
    description: "Read-only access to stock balances, master data, and transaction logs",
    permissions: [
      "MASTER_VIEW",
      "STOCK_BALANCE_VIEW",
      "MOVEMENT_HISTORY_VIEW",
      "TRANSACTION_VIEW",
      "INVENTORY_REPORT_VIEW",
    ],
  },
  {
    id: "role-maintenance",
    name: "Maintenance",
    description: "Technicians and engineers who requisition parts and manage PM",
    permissions: [
      "MASTER_VIEW",
      "STOCK_BALANCE_VIEW",
      "GI_CREATE",
      "MOVEMENT_HISTORY_VIEW",
      "MPROS_VIEW",
      "WORK_PERMIT_VIEW",
    ],
  },
  {
    id: "role-production",
    name: "Production",
    description: "Production line operators and supervisors",
    permissions: [
      "MASTER_VIEW",
      "STOCK_BALANCE_VIEW",
      "GI_CREATE",
      "UNSAFE_VIEW",
    ],
  },
  {
    id: "role-purchasing",
    name: "Purchasing",
    description: "Procurement department tracking inventory value, reorder lists, and GR",
    permissions: [
      "MASTER_VIEW",
      "STOCK_BALANCE_VIEW",
      "GR_CREATE",
      "TRANSACTION_VIEW",
      "INVENTORY_REPORT_VIEW",
    ],
  },
];
