import { User } from '../types/auth';

export const INITIAL_USERS: User[] = [
  {
    id: "usr-admin-01",
    username: "Admin",
    password: "Admin",
    fullName: "System Administrator",
    employeeId: "EMP-0001",
    email: "admin@zycoda.internal",
    department: "System",
    plant: "DEMO",
    roleId: "role-admin",
    status: "ACTIVE",
    lastLogin: "2026-09-08T08:30:00.000Z",
    createdAt: "2026-08-01T00:00:00.000Z",
  },
];
