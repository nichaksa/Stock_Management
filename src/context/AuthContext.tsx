import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Role, SessionUser, PermissionKey } from '../types/auth';
import { INITIAL_USERS } from '../mock/users';
import { INITIAL_ROLES } from '../mock/roles';

interface AuthContextType {
  currentUser: SessionUser | null;
  users: User[];
  roles: Role[];
  login: (username: string, password: string) => { success: boolean; error?: string };
  logout: () => void;
  hasPermission: (permission: PermissionKey) => boolean;
  hasAnyPermission: (permissions: PermissionKey[]) => boolean;
  addUser: (userData: Omit<User, 'id' | 'createdAt'>) => { success: boolean; error?: string; user?: User };
  updateUser: (id: string, updates: Partial<Omit<User, 'id' | 'username' | 'createdAt'>>) => { success: boolean; error?: string };
  deleteUser: (id: string) => { success: boolean; error?: string };
  toggleUserStatus: (id: string) => { success: boolean; error?: string };
  resetUserPassword: (id: string, newPassword: string) => { success: boolean; error?: string };
  addRole: (roleData: Omit<Role, 'id'>) => { success: boolean; error?: string };
  updateRole: (id: string, updates: Partial<Omit<Role, 'id' | 'isSystem'>>) => { success: boolean; error?: string };
  deleteRole: (id: string) => { success: boolean; error?: string };
  resetAuthData: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USERS_STORAGE_KEY = 'zycoda_users_v1';
const ROLES_STORAGE_KEY = 'zycoda_roles_v1';
const SESSION_STORAGE_KEY = 'zycoda_session_v1';

function migrateRoles(savedRoles: Role[]): Role[] {
  if (!Array.isArray(savedRoles) || savedRoles.length === 0) {
    return INITIAL_ROLES;
  }

  // Ensure all initial system roles exist and contain latest permissions
  const updatedRoles = savedRoles.map(savedRole => {
    const initialRole = INITIAL_ROLES.find(
      r => r.id === savedRole.id || r.name.toLowerCase() === savedRole.name.toLowerCase()
    );
    if (initialRole) {
      const mergedPerms = Array.from(new Set([...(savedRole.permissions || []), ...initialRole.permissions]));
      return {
        ...savedRole,
        id: initialRole.id,
        name: initialRole.name,
        description: initialRole.description,
        permissions: mergedPerms,
      };
    }
    return savedRole;
  });

  // Ensure no missing initial roles
  INITIAL_ROLES.forEach(initRole => {
    if (!updatedRoles.some(r => r.id === initRole.id)) {
      updatedRoles.push(initRole);
    }
  });

  return updatedRoles;
}

function migrateUsers(savedUsers: User[]): User[] {
  if (!Array.isArray(savedUsers) || savedUsers.length === 0) {
    return INITIAL_USERS;
  }
  return savedUsers.map(u => {
    if (u.roleId === 'role-store-op' || u.roleId === 'role-store-view') {
      return { ...u, roleId: 'role-store' };
    }
    return u;
  });
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [roles, setRoles] = useState<Role[]>(() => {
    try {
      const saved = localStorage.getItem(ROLES_STORAGE_KEY);
      return saved ? migrateRoles(JSON.parse(saved)) : INITIAL_ROLES;
    } catch {
      return INITIAL_ROLES;
    }
  });

  const [users, setUsers] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem(USERS_STORAGE_KEY);
      return saved ? migrateUsers(JSON.parse(saved)) : INITIAL_USERS;
    } catch {
      return INITIAL_USERS;
    }
  });

  const [currentUser, setCurrentUser] = useState<SessionUser | null>(() => {
    try {
      const saved = localStorage.getItem(SESSION_STORAGE_KEY);
      if (!saved) return null;
      const user: SessionUser = JSON.parse(saved);
      if (user.roleId === 'role-store-op' || user.roleId === 'role-store-view') {
        user.roleId = 'role-store';
        user.roleName = 'Store';
      }
      return user;
    } catch {
      return null;
    }
  });

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem(ROLES_STORAGE_KEY, JSON.stringify(roles));
  }, [roles]);

  useEffect(() => {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    if (currentUser) {
      const activeRole = roles.find(r => r.id === currentUser.roleId);
      if (activeRole && JSON.stringify(currentUser.permissions) !== JSON.stringify(activeRole.permissions)) {
        setCurrentUser(prev => prev ? {
          ...prev,
          roleName: activeRole.name,
          permissions: activeRole.permissions,
        } : null);
      }
    }
  }, [roles, currentUser?.roleId]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  }, [currentUser]);

  const login = (username: string, password: string): { success: boolean; error?: string } => {
    const trimmedUser = username.trim();
    const user = users.find(u => u.username.toLowerCase() === trimmedUser.toLowerCase());

    if (!user) {
      return { success: false, error: "Invalid username or password" };
    }

    if (user.password !== password) {
      return { success: false, error: "Invalid username or password" };
    }

    if (user.status !== "ACTIVE") {
      return { success: false, error: "This user account is currently deactivated. Please contact your system administrator." };
    }

    const userRole = roles.find(r => r.id === user.roleId) || {
      id: "unknown",
      name: "Custom Role",
      permissions: [] as PermissionKey[],
      description: ""
    };

    const session: SessionUser = {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      employeeId: user.employeeId,
      email: user.email,
      department: user.department,
      plant: user.plant,
      roleId: user.roleId,
      roleName: userRole.name,
      permissions: userRole.permissions,
      status: user.status,
    };

    // Update lastLogin in state
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, lastLogin: new Date().toISOString() } : u));
    setCurrentUser(session);

    return { success: true };
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem(SESSION_STORAGE_KEY);
  };

  const hasPermission = useCallback((permission: PermissionKey): boolean => {
    if (!currentUser) return false;
    const activeRole = roles.find(r => r.id === currentUser.roleId);
    if (activeRole) {
      return activeRole.permissions.includes(permission);
    }
    return (currentUser.permissions || []).includes(permission);
  }, [currentUser, roles]);

  const hasAnyPermission = useCallback((perms: PermissionKey[]): boolean => {
    if (!currentUser) return false;
    const activeRole = roles.find(r => r.id === currentUser.roleId);
    const userPerms = activeRole ? activeRole.permissions : (currentUser.permissions || []);
    return perms.some(p => userPerms.includes(p));
  }, [currentUser, roles]);

  const addUser = (userData: Omit<User, 'id' | 'createdAt'>): { success: boolean; error?: string; user?: User } => {
    const trimmedUsername = userData.username.trim();
    if (users.some(u => u.username.toLowerCase() === trimmedUsername.toLowerCase())) {
      return { success: false, error: `Username "${trimmedUsername}" is already taken.` };
    }

    const newUser: User = {
      ...userData,
      id: `usr-${Date.now()}`,
      username: trimmedUsername,
      createdAt: new Date().toISOString(),
    };

    setUsers(prev => [newUser, ...prev]);
    return { success: true, user: newUser };
  };

  const updateUser = (id: string, updates: Partial<Omit<User, 'id' | 'username' | 'createdAt'>>): { success: boolean; error?: string } => {
    const userIndex = users.findIndex(u => u.id === id);
    if (userIndex === -1) {
      return { success: false, error: "User not found" };
    }

    setUsers(prev => prev.map(u => (u.id === id ? { ...u, ...updates } : u)));

    // If current logged-in user is updated, update session as well
    if (currentUser && currentUser.id === id) {
      const updatedRole = updates.roleId ? roles.find(r => r.id === updates.roleId) : null;
      setCurrentUser(prev => {
        if (!prev) return null;
        return {
          ...prev,
          ...updates,
          roleName: updatedRole ? updatedRole.name : prev.roleName,
          permissions: updatedRole ? updatedRole.permissions : prev.permissions,
        };
      });
    }

    return { success: true };
  };

  const deleteUser = (id: string): { success: boolean; error?: string } => {
    const targetUser = users.find(u => u.id === id);
    if (!targetUser) return { success: false, error: "User not found" };
    if (targetUser.username === 'Admin') {
      return { success: false, error: "Cannot delete initial system Admin account" };
    }
    if (currentUser?.id === id) {
      return { success: false, error: "Cannot delete currently logged-in user" };
    }

    setUsers(prev => prev.filter(u => u.id !== id));
    return { success: true };
  };

  const toggleUserStatus = (id: string): { success: boolean; error?: string } => {
    const targetUser = users.find(u => u.id === id);
    if (!targetUser) return { success: false, error: "User not found" };
    if (targetUser.username === 'Admin') {
      return { success: false, error: "Cannot deactivate system Admin account" };
    }
    if (currentUser?.id === id) {
      return { success: false, error: "Cannot deactivate currently logged-in user" };
    }

    const newStatus: "ACTIVE" | "INACTIVE" = targetUser.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    setUsers(prev => prev.map(u => u.id === id ? { ...u, status: newStatus } : u));
    return { success: true };
  };

  const resetUserPassword = (id: string, newPassword: string): { success: boolean; error?: string } => {
    const targetUser = users.find(u => u.id === id);
    if (!targetUser) return { success: false, error: "User not found" };

    setUsers(prev => prev.map(u => u.id === id ? { ...u, password: newPassword } : u));
    return { success: true };
  };

  const addRole = (roleData: Omit<Role, 'id'>): { success: boolean; error?: string } => {
    const newRole: Role = {
      ...roleData,
      id: `role-${Date.now()}`,
    };
    setRoles(prev => [...prev, newRole]);
    return { success: true };
  };

  const updateRole = (id: string, updates: Partial<Omit<Role, 'id' | 'isSystem'>>): { success: boolean; error?: string } => {
    setRoles(prev => prev.map(r => (r.id === id ? { ...r, ...updates } : r)));

    // Refresh current user session permissions if their role was modified
    if (currentUser && currentUser.roleId === id && updates.permissions) {
      setCurrentUser(prev => prev ? { ...prev, permissions: updates.permissions! } : null);
    }

    return { success: true };
  };

  const deleteRole = (id: string): { success: boolean; error?: string } => {
    const role = roles.find(r => r.id === id);
    if (!role) return { success: false, error: "Role not found" };
    if (role.isSystem) return { success: false, error: "System role cannot be deleted" };
    if (users.some(u => u.roleId === id)) {
      return { success: false, error: "Cannot delete role assigned to existing users" };
    }

    setRoles(prev => prev.filter(r => r.id !== id));
    return { success: true };
  };

  const resetAuthData = () => {
    setUsers(INITIAL_USERS);
    setRoles(INITIAL_ROLES);
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(INITIAL_USERS));
    localStorage.setItem(ROLES_STORAGE_KEY, JSON.stringify(INITIAL_ROLES));
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        users,
        roles,
        login,
        logout,
        hasPermission,
        hasAnyPermission,
        addUser,
        updateUser,
        deleteUser,
        toggleUserStatus,
        resetUserPassword,
        addRole,
        updateRole,
        deleteRole,
        resetAuthData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
