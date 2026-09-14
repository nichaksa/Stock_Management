export type PermissionKey =
  // Stock Management
  | "MASTER_VIEW"
  | "MASTER_CREATE"
  | "MASTER_EDIT"
  | "STOCK_BALANCE_VIEW"
  | "REQUEST_VIEW"
  | "REQUEST_CREATE"
  | "STORE_APPROVAL"
  | "REQUEST_ISSUE"
  | "TRANSFER_CREATE"
  | "GR_CREATE"
  | "GI_CREATE"
  | "STOCK_ADJUST"
  | "MOVEMENT_HISTORY_VIEW"
  | "TRANSACTION_VIEW"
  | "INVENTORY_REPORT_VIEW"
  // Administration
  | "USER_MANAGEMENT"
  | "ROLE_MANAGEMENT"
  // Enterprise Modules
  | "MPROS_VIEW"
  | "WORK_PERMIT_VIEW"
  | "UNSAFE_VIEW"
  | "ZSENSOR_VIEW"
  | "ZPAP_VIEW";

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: PermissionKey[];
  isSystem?: boolean;
}

export interface User {
  id: string;
  username: string;
  password?: string;
  fullName: string;
  employeeId?: string;
  email?: string;
  department: string;
  plant?: string;
  roleId: string;
  status: "ACTIVE" | "INACTIVE";
  lastLogin?: string;
  createdAt: string;
}

export interface SessionUser {
  id: string;
  username: string;
  fullName: string;
  employeeId?: string;
  email?: string;
  department: string;
  plant?: string;
  roleId: string;
  roleName: string;
  permissions: PermissionKey[];
  status: "ACTIVE" | "INACTIVE";
}
