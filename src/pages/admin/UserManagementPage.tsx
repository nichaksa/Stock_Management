import React, { useState, useMemo } from 'react';
import { User } from '../../types/auth';
import { PageLayout } from '../../components/layout/PageLayout';
import { SearchInput } from '../../components/common/SearchInput';
import { FilterSelect } from '../../components/common/FilterSelect';
import { DataTable, Column, SortDirection } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { UserFormModal } from '../../components/admin/UserFormModal';
import { ResetPasswordModal } from '../../components/admin/ResetPasswordModal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { formatDateTime } from '../../utils/dateRange';
import {
  Plus,
  Edit2,
  KeyRound,
  Trash2,
  Power,
  Shield,
  Building2,
  Users,
} from 'lucide-react';

export const UserManagementPage: React.FC = () => {
  const { users, roles, deleteUser, toggleUserStatus } = useAuth();
  const { t } = useLanguage();
  const { addToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedRole, setSelectedRole] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  const [sortColumn, setSortColumn] = useState<string | null>('username');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Modals & Dialogs
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isResetPwdOpen, setIsResetPwdOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [userForReset, setUserForReset] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [userToToggle, setUserToToggle] = useState<User | null>(null);

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      if (selectedDept !== 'ALL' && u.department !== selectedDept) return false;
      if (selectedRole !== 'ALL' && u.roleId !== selectedRole) return false;
      if (selectedStatus !== 'ALL' && u.status !== selectedStatus) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matches =
          u.username.toLowerCase().includes(query) ||
          u.fullName.toLowerCase().includes(query) ||
          u.employeeId?.toLowerCase().includes(query) ||
          u.email?.toLowerCase().includes(query) ||
          u.department.toLowerCase().includes(query);
        if (!matches) return false;
      }
      return true;
    });
  }, [users, selectedDept, selectedRole, selectedStatus, searchQuery]);

  const sortedUsers = useMemo(() => {
    if (!sortColumn || !sortDirection) return filteredUsers;

    return [...filteredUsers].sort((a, b) => {
      let valA = (a as any)[sortColumn] || '';
      let valB = (b as any)[sortColumn] || '';
      if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
      }
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredUsers, sortColumn, sortDirection]);

  const handleSortChange = (colId: string) => {
    if (sortColumn !== colId) {
      setSortColumn(colId);
      setSortDirection('asc');
    } else if (sortDirection === 'asc') {
      setSortDirection('desc');
    } else {
      setSortColumn(null);
      setSortDirection(null);
    }
  };

  const handleConfirmDelete = () => {
    if (!userToDelete) return;
    const res = deleteUser(userToDelete.id);
    if (res.success) {
      addToast(`User @${userToDelete.username} deleted`, 'success');
      setUserToDelete(null);
    } else {
      addToast(res.error || 'Failed to delete user', 'error');
    }
  };

  const handleConfirmToggleStatus = () => {
    if (!userToToggle) return;
    const res = toggleUserStatus(userToToggle.id);
    if (res.success) {
      addToast(`User @${userToToggle.username} status updated`, 'success');
      setUserToToggle(null);
    } else {
      addToast(res.error || 'Failed to update user status', 'error');
    }
  };

  const tableColumns: Column<User>[] = [
    {
      id: 'username',
      header: t('username'),
      sortable: true,
      className: 'min-w-[120px]',
      accessor: (u) => (
        <span className="font-mono font-bold text-xs text-brand-blue">
          @{u.username}
        </span>
      ),
    },
    {
      id: 'fullName',
      header: t('full_name'),
      sortable: true,
      className: 'min-w-[160px]',
      accessor: (u) => (
        <div>
          <span className="text-xs font-semibold text-app-text dark:text-app-darkText block">
            {u.fullName}
          </span>
          {u.email && <span className="text-[11px] text-app-muted">{u.email}</span>}
        </div>
      ),
    },
    {
      id: 'employeeId',
      header: t('employee_id'),
      sortable: true,
      className: 'min-w-[100px]',
      accessor: (u) => (
        <span className="font-mono text-xs text-app-secondary dark:text-app-darkSecondary">
          {u.employeeId || '-'}
        </span>
      ),
    },
    {
      id: 'department',
      header: t('department'),
      sortable: true,
      accessor: (u) => (
        <span className="text-xs text-app-text dark:text-app-darkText">
          {u.department}
        </span>
      ),
    },
    {
      id: 'roleId',
      header: t('role'),
      sortable: true,
      accessor: (u) => {
        const role = roles.find(r => r.id === u.roleId);
        return (
          <span className="inline-flex items-center gap-1 font-medium text-xs text-brand-blue">
            <Shield className="w-3 h-3" />
            {role ? role.name : 'Unknown Role'}
          </span>
        );
      },
    },
    {
      id: 'plant',
      header: t('plant'),
      sortable: true,
      accessor: (u) => (
        <span className="font-mono text-xs text-app-secondary dark:text-app-darkSecondary">
          {u.plant || 'All'}
        </span>
      ),
    },
    {
      id: 'status',
      header: t('status'),
      align: 'center',
      className: 'w-24',
      accessor: (u) => <StatusBadge status={u.status} size="sm" />,
    },
    {
      id: 'lastLogin',
      header: t('last_login'),
      sortable: true,
      className: 'min-w-[130px]',
      accessor: (u) => (
        <span className="font-mono text-[11px] text-app-muted">
          {formatDateTime(u.lastLogin)}
        </span>
      ),
    },
    {
      id: 'actions',
      header: t('actions'),
      align: 'right',
      className: 'min-w-[150px]',
      accessor: (u) => (
        <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => {
              setUserToEdit(u);
              setIsUserModalOpen(true);
            }}
            className="p-1.5 rounded-lg text-app-secondary hover:text-brand-blue hover:bg-brand-softBlue dark:hover:bg-blue-950/40 transition-colors"
            title="Edit User"
          >
            <Edit2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => {
              setUserForReset(u);
              setIsResetPwdOpen(true);
            }}
            className="p-1.5 rounded-lg text-app-secondary hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
            title="Reset Password"
          >
            <KeyRound className="w-4 h-4" />
          </button>

          {u.username !== 'Admin' && (
            <>
              <button
                type="button"
                onClick={() => setUserToToggle(u)}
                className={`p-1.5 rounded-lg transition-colors ${
                  u.status === 'ACTIVE'
                    ? 'text-app-secondary hover:text-warn hover:bg-warn-bg dark:hover:bg-warn-darkBg'
                    : 'text-app-secondary hover:text-gr hover:bg-gr-bg dark:hover:bg-gr-darkBg'
                }`}
                title={u.status === 'ACTIVE' ? "Deactivate User" : "Activate User"}
              >
                <Power className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setUserToDelete(u)}
                className="p-1.5 rounded-lg text-app-secondary hover:text-gi hover:bg-gi-bg dark:hover:bg-gi-darkBg transition-colors"
                title="Delete User"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <PageLayout
      title={t('user_management')}
      subtitle="Provision and manage system operators, technicians, and administrators"
      actions={
        <button
          type="button"
          onClick={() => {
            setUserToEdit(null);
            setIsUserModalOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-brand-blue hover:bg-brand-hoverBlue text-white shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>{t('add_user')}</span>
        </button>
      }
    >
      <div className="space-y-4">
        {/* TOOLBAR */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder shadow-subtle flex flex-col lg:flex-row items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto flex-1">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search user, name, email, employee ID..."
              className="w-full sm:w-72"
            />

            <FilterSelect
              label={t('department')}
              value={selectedDept}
              onChange={setSelectedDept}
              options={[
                { value: 'ALL', label: 'All Departments' },
                { value: 'Store', label: 'Store' },
                { value: 'Maintenance', label: 'Maintenance' },
                { value: 'Production', label: 'Production' },
                { value: 'Purchasing', label: 'Purchasing' },
                { value: 'Engineering', label: 'Engineering' },
                { value: 'System', label: 'System' },
              ]}
              className="w-44"
            />

            <FilterSelect
              label={t('role')}
              value={selectedRole}
              onChange={setSelectedRole}
              options={[
                { value: 'ALL', label: 'All Roles' },
                ...roles.map(r => ({ value: r.id, label: r.name })),
              ]}
              className="w-44"
            />
          </div>

          <div className="text-xs text-app-muted font-mono self-end lg:self-center">
            {filteredUsers.length} User Accounts
          </div>
        </div>

        {/* USERS TABLE */}
        <DataTable
          data={sortedUsers}
          columns={tableColumns}
          keyExtractor={(u) => u.id}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onSortChange={handleSortChange}
          emptyTitle="No Users Found"
          emptyDescription="No user accounts match your search filters."
          emptyType="generic"
        />
      </div>

      {/* MODALS */}
      <UserFormModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        userToEdit={userToEdit}
      />

      <ResetPasswordModal
        isOpen={isResetPwdOpen}
        onClose={() => setIsResetPwdOpen(false)}
        user={userForReset}
      />

      <ConfirmDialog
        isOpen={Boolean(userToDelete)}
        onClose={() => setUserToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete User Account"
        message={`Are you sure you want to permanently delete @${userToDelete?.username} (${userToDelete?.fullName})? This action cannot be undone.`}
        confirmText="Delete User"
        type="danger"
      />

      <ConfirmDialog
        isOpen={Boolean(userToToggle)}
        onClose={() => setUserToToggle(null)}
        onConfirm={handleConfirmToggleStatus}
        title={userToToggle?.status === 'ACTIVE' ? "Deactivate User" : "Activate User"}
        message={`Are you sure you want to ${userToToggle?.status === 'ACTIVE' ? 'deactivate' : 'activate'} user @${userToToggle?.username}?`}
        confirmText={userToToggle?.status === 'ACTIVE' ? "Deactivate" : "Activate"}
        type={userToToggle?.status === 'ACTIVE' ? "warning" : "info"}
      />
    </PageLayout>
  );
};
