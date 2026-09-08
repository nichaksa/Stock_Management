import React, { useState } from 'react';
import { Role } from '../../types/auth';
import { PageLayout } from '../../components/layout/PageLayout';
import { DataTable, Column } from '../../components/common/DataTable';
import { RoleFormModal } from '../../components/admin/RoleFormModal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { Plus, Edit2, Shield, Lock, Trash2 } from 'lucide-react';

export const RoleManagementPage: React.FC = () => {
  const { roles, deleteRole } = useAuth();
  const { t } = useLanguage();
  const { addToast } = useToast();

  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [roleToEdit, setRoleToEdit] = useState<Role | null>(null);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);

  const handleConfirmDelete = () => {
    if (!roleToDelete) return;
    const res = deleteRole(roleToDelete.id);
    if (res.success) {
      addToast(`Role "${roleToDelete.name}" deleted successfully`, 'success');
      setRoleToDelete(null);
    } else {
      addToast(res.error || "Failed to delete role", 'error');
    }
  };

  const tableColumns: Column<Role>[] = [
    {
      id: 'name',
      header: 'Role Name',
      className: 'min-w-[160px]',
      accessor: (r) => (
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-brand-blue shrink-0" />
          <div>
            <span className="font-bold text-xs text-app-text dark:text-app-darkText block">
              {r.name}
            </span>
            {r.isSystem && (
              <span className="text-[10px] bg-brand-softBlue dark:bg-blue-950/60 text-brand-blue px-1.5 py-0.2 rounded font-semibold inline-flex items-center gap-1 mt-0.5">
                <Lock className="w-2.5 h-2.5" /> System Built-in
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      id: 'description',
      header: 'Description',
      className: 'min-w-[260px]',
      accessor: (r) => (
        <span className="text-xs text-app-secondary dark:text-app-darkSecondary">
          {r.description || '-'}
        </span>
      ),
    },
    {
      id: 'permissions',
      header: 'Assigned Permissions',
      align: 'center',
      className: 'w-36',
      accessor: (r) => (
        <span className="font-mono text-xs font-bold text-brand-blue px-2.5 py-1 rounded-full bg-brand-softBlue dark:bg-blue-950/60 border border-brand-blue/20">
          {r.permissions.length} Permissions
        </span>
      ),
    },
    {
      id: 'actions',
      header: t('actions'),
      align: 'right',
      className: 'w-24',
      accessor: (r) => (
        <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => {
              setRoleToEdit(r);
              setIsRoleModalOpen(true);
            }}
            className="p-1.5 rounded-lg text-app-secondary hover:text-brand-blue hover:bg-brand-softBlue dark:hover:bg-blue-950/40 transition-colors"
            title="Edit Permissions"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          {!r.isSystem && (
            <button
              type="button"
              onClick={() => setRoleToDelete(r)}
              className="p-1.5 rounded-lg text-app-secondary hover:text-gi hover:bg-gi-bg dark:hover:bg-gi-darkBg transition-colors"
              title="Delete Role"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <PageLayout
      title={t('role_permission')}
      subtitle="Configure role profiles and granular module permission matrix"
      actions={
        <button
          type="button"
          onClick={() => {
            setRoleToEdit(null);
            setIsRoleModalOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-brand-blue hover:bg-brand-hoverBlue text-white shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Create Role</span>
        </button>
      }
    >
      <div className="space-y-4">
        <DataTable
          data={roles}
          columns={tableColumns}
          keyExtractor={(r) => r.id}
          emptyTitle="No Roles Configured"
        />
      </div>

      <RoleFormModal
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
        roleToEdit={roleToEdit}
      />

      <ConfirmDialog
        isOpen={Boolean(roleToDelete)}
        onClose={() => setRoleToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Role"
        message={`Are you sure you want to delete the "${roleToDelete?.name}" role?`}
        confirmText="Delete Role"
        type="danger"
      />
    </PageLayout>
  );
};
