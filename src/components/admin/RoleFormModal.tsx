import React, { useState, useEffect } from 'react';
import { Role, PermissionKey } from '../../types/auth';
import { ALL_PERMISSIONS } from '../../mock/roles';
import { Modal } from '../common/Modal';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Check, Shield } from 'lucide-react';

interface RoleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  roleToEdit?: Role | null;
}

export const RoleFormModal: React.FC<RoleFormModalProps> = ({
  isOpen,
  onClose,
  roleToEdit,
}) => {
  const isEdit = Boolean(roleToEdit);
  const { addRole, updateRole } = useAuth();
  const { addToast } = useToast();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [permissions, setPermissions] = useState<PermissionKey[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (roleToEdit) {
      setName(roleToEdit.name);
      setDescription(roleToEdit.description || "");
      setPermissions(roleToEdit.permissions);
    } else {
      setName("");
      setDescription("");
      setPermissions([]);
    }
    setErrors({});
  }, [roleToEdit, isOpen]);

  const togglePermission = (key: PermissionKey) => {
    if (permissions.includes(key)) {
      setPermissions(prev => prev.filter(p => p !== key));
    } else {
      setPermissions(prev => [...prev, key]);
    }
  };

  const toggleAllInGroup = (groupKeys: PermissionKey[]) => {
    const allSelected = groupKeys.every(k => permissions.includes(k));
    if (allSelected) {
      setPermissions(prev => prev.filter(p => !groupKeys.includes(p)));
    } else {
      const merged = new Set([...permissions, ...groupKeys]);
      setPermissions(Array.from(merged));
    }
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Role Name is required";
    if (permissions.length === 0) errs.permissions = "Select at least one permission";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setTimeout(() => {
      if (isEdit && roleToEdit) {
        const res = updateRole(roleToEdit.id, {
          name: name.trim(),
          description: description.trim(),
          permissions,
        });

        setIsSubmitting(false);
        if (res.success) {
          addToast(`Role "${name}" updated successfully`, 'success');
          onClose();
        } else {
          addToast(res.error || "Failed to update role", 'error');
        }
      } else {
        const res = addRole({
          name: name.trim(),
          description: description.trim(),
          permissions,
        });

        setIsSubmitting(false);
        if (res.success) {
          addToast(`Role "${name}" created successfully`, 'success');
          onClose();
        } else {
          setErrors({ name: res.error || "Failed to create role" });
        }
      }
    }, 200);
  };

  // Group permissions
  const groups: Record<string, typeof ALL_PERMISSIONS> = {};
  ALL_PERMISSIONS.forEach(p => {
    if (!groups[p.group]) groups[p.group] = [];
    groups[p.group].push(p);
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "Edit Role & Permissions" : "Create New Role"}
      subtitle="Configure modular access controls and permission bounds"
      maxWidthClass="max-w-2xl"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-app-secondary dark:text-app-darkSecondary hover:text-app-text rounded-lg border border-app-border dark:border-app-darkBorder transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-5 py-2 text-xs font-semibold text-white bg-brand-blue hover:bg-brand-hoverBlue rounded-lg shadow-sm transition-all disabled:opacity-50"
          >
            {isSubmitting ? "Saving..." : isEdit ? "Update Role" : "Create Role"}
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-3">
          <div>
            <label className="block text-xs font-semibold text-app-secondary dark:text-app-darkSecondary mb-1 uppercase tracking-wider">
              Role Name <span className="text-gi">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Warehouse Shift Lead"
              className="w-full px-3 py-2 text-xs sm:text-sm bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder rounded-lg text-app-text dark:text-app-darkText outline-none focus:border-brand-blue"
            />
            {errors.name && <p className="mt-1 text-xs text-gi">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-app-secondary dark:text-app-darkSecondary mb-1 uppercase tracking-wider">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Role responsibilities and department scope..."
              className="w-full px-3 py-2 text-xs sm:text-sm bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder rounded-lg text-app-text dark:text-app-darkText outline-none focus:border-brand-blue"
            />
          </div>
        </div>

        {/* Permission Matrix */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between pb-1 border-b border-app-border dark:border-app-darkBorder">
            <h4 className="text-xs font-bold text-app-text dark:text-app-darkText uppercase tracking-wider flex items-center gap-2">
              <Shield className="w-4 h-4 text-brand-blue" />
              <span>Permission Matrix</span>
            </h4>
            <span className="text-[11px] font-mono text-app-muted">
              {permissions.length}/{ALL_PERMISSIONS.length} Assigned
            </span>
          </div>

          {errors.permissions && (
            <p className="text-xs text-gi font-medium">{errors.permissions}</p>
          )}

          <div className="space-y-3.5 max-h-72 overflow-y-auto pr-1">
            {Object.entries(groups).map(([groupTitle, perms]) => {
              const groupKeys = perms.map(p => p.key);
              const allChecked = groupKeys.every(k => permissions.includes(k));

              return (
                <div
                  key={groupTitle}
                  className="p-3 rounded-xl bg-app-bg/50 dark:bg-app-darkBg/50 border border-app-border dark:border-app-darkBorder space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-app-secondary dark:text-app-darkSecondary tracking-wider uppercase">
                      {groupTitle}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleAllInGroup(groupKeys)}
                      className="text-[10px] font-semibold text-brand-blue hover:underline"
                    >
                      {allChecked ? "Deselect All" : "Select All"}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {perms.map(p => {
                      const isChecked = permissions.includes(p.key);
                      return (
                        <button
                          key={p.key}
                          type="button"
                          onClick={() => togglePermission(p.key)}
                          className={`flex items-center gap-2.5 p-2 rounded-lg text-xs transition-colors text-left ${
                            isChecked
                              ? 'bg-white dark:bg-app-darkSurface text-app-text dark:text-app-darkText shadow-subtle border border-brand-blue/30'
                              : 'text-app-secondary dark:text-app-darkSecondary hover:bg-white/60 dark:hover:bg-app-darkSurface/60'
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                              isChecked
                                ? 'bg-brand-blue border-brand-blue text-white'
                                : 'border-app-border dark:border-app-darkBorder bg-white dark:bg-app-darkSurface'
                            }`}
                          >
                            {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <span className="truncate">{p.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </form>
    </Modal>
  );
};
