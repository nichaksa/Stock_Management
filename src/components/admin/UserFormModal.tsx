import React, { useState, useEffect } from 'react';
import { User } from '../../types/auth';
import { Modal } from '../common/Modal';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  userToEdit?: User | null;
}

const DEPARTMENTS = [
  "Store",
  "Maintenance",
  "Production",
  "Purchasing",
  "Engineering",
  "Management",
  "System",
];

const PLANTS = ["DEMO", "PLANT-01", "PLANT-02"];

export const UserFormModal: React.FC<UserFormModalProps> = ({
  isOpen,
  onClose,
  userToEdit,
}) => {
  const isEdit = Boolean(userToEdit);
  const { roles, addUser, updateUser } = useAuth();
  const { addToast } = useToast();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("Store");
  const [plant, setPlant] = useState("DEMO");
  const [roleId, setRoleId] = useState("");
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (userToEdit) {
      setUsername(userToEdit.username);
      setFullName(userToEdit.fullName);
      setEmployeeId(userToEdit.employeeId || "");
      setEmail(userToEdit.email || "");
      setDepartment(userToEdit.department || "Store");
      setPlant(userToEdit.plant || "DEMO");
      setRoleId(userToEdit.roleId);
      setStatus(userToEdit.status);
    } else {
      setUsername("");
      setPassword("");
      setConfirmPassword("");
      setFullName("");
      setEmployeeId("");
      setEmail("");
      setDepartment("Store");
      setPlant("DEMO");
      setRoleId(roles[1]?.id || roles[0]?.id || "");
      setStatus("ACTIVE");
    }
    setErrors({});
  }, [userToEdit, roles, isOpen]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!username.trim()) errs.username = "Username is required";
    if (!fullName.trim()) errs.fullName = "Full Name is required";
    if (!department) errs.department = "Department is required";
    if (!roleId) errs.roleId = "Role is required";

    if (!isEdit) {
      if (!password) errs.password = "Password is required";
      else if (password.length < 4) errs.password = "Password must be at least 4 characters";
      if (password !== confirmPassword) errs.confirmPassword = "Passwords do not match";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setTimeout(() => {
      if (isEdit && userToEdit) {
        const res = updateUser(userToEdit.id, {
          fullName: fullName.trim(),
          employeeId: employeeId.trim() || undefined,
          email: email.trim() || undefined,
          department,
          plant,
          roleId,
          status,
        });

        setIsSubmitting(false);
        if (res.success) {
          addToast(`User ${username} updated successfully`, 'success');
          onClose();
        } else {
          addToast(res.error || 'Failed to update user', 'error');
        }
      } else {
        const res = addUser({
          username: username.trim(),
          password,
          fullName: fullName.trim(),
          employeeId: employeeId.trim() || undefined,
          email: email.trim() || undefined,
          department,
          plant,
          roleId,
          status,
        });

        setIsSubmitting(false);
        if (res.success) {
          addToast(`User ${username.trim()} created successfully`, 'success');
          onClose();
        } else {
          setErrors({ username: res.error || 'Failed to create user' });
        }
      }
    }, 200);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "Edit User Account" : "Add New User"}
      subtitle={isEdit ? `Update credentials & permissions for @${userToEdit?.username}` : "Provision a new operator or staff member account"}
      maxWidthClass="max-w-xl"
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
            {isSubmitting ? "Saving..." : isEdit ? "Update User" : "Create User"}
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-semibold text-app-secondary dark:text-app-darkSecondary mb-1 uppercase tracking-wider">
              Username <span className="text-gi">*</span>
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              disabled={isEdit}
              placeholder="e.g. store01"
              className={`w-full px-3 py-2 text-xs sm:text-sm bg-white dark:bg-app-darkSurface border rounded-lg font-mono outline-none ${
                isEdit
                  ? 'bg-app-bg dark:bg-app-darkBg text-app-secondary cursor-not-allowed opacity-80 border-app-border dark:border-app-darkBorder'
                  : errors.username
                  ? 'border-gi text-gi'
                  : 'border-app-border dark:border-app-darkBorder text-app-text dark:text-app-darkText focus:border-brand-blue'
              }`}
            />
            {errors.username && <p className="mt-1 text-xs text-gi">{errors.username}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-app-secondary dark:text-app-darkSecondary mb-1 uppercase tracking-wider">
              Full Name <span className="text-gi">*</span>
            </label>
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="e.g. Somsak Jaidee"
              className="w-full px-3 py-2 text-xs sm:text-sm bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder rounded-lg text-app-text dark:text-app-darkText outline-none focus:border-brand-blue"
            />
            {errors.fullName && <p className="mt-1 text-xs text-gi">{errors.fullName}</p>}
          </div>

          {!isEdit && (
            <>
              <div>
                <label className="block text-xs font-semibold text-app-secondary dark:text-app-darkSecondary mb-1 uppercase tracking-wider">
                  Password <span className="text-gi">*</span>
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder rounded-lg text-app-text dark:text-app-darkText outline-none focus:border-brand-blue"
                />
                {errors.password && <p className="mt-1 text-xs text-gi">{errors.password}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-app-secondary dark:text-app-darkSecondary mb-1 uppercase tracking-wider">
                  Confirm Password <span className="text-gi">*</span>
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder rounded-lg text-app-text dark:text-app-darkText outline-none focus:border-brand-blue"
                />
                {errors.confirmPassword && <p className="mt-1 text-xs text-gi">{errors.confirmPassword}</p>}
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-app-secondary dark:text-app-darkSecondary mb-1 uppercase tracking-wider">
              Employee ID
            </label>
            <input
              type="text"
              value={employeeId}
              onChange={e => setEmployeeId(e.target.value)}
              placeholder="e.g. EMP-1042"
              className="w-full px-3 py-2 text-xs sm:text-sm bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder rounded-lg font-mono text-app-text dark:text-app-darkText outline-none focus:border-brand-blue"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-app-secondary dark:text-app-darkSecondary mb-1 uppercase tracking-wider">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="name@company.com"
              className="w-full px-3 py-2 text-xs sm:text-sm bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder rounded-lg text-app-text dark:text-app-darkText outline-none focus:border-brand-blue"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-app-secondary dark:text-app-darkSecondary mb-1 uppercase tracking-wider">
              Department <span className="text-gi">*</span>
            </label>
            <select
              value={department}
              onChange={e => setDepartment(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder rounded-lg text-app-text dark:text-app-darkText outline-none focus:border-brand-blue"
            >
              {DEPARTMENTS.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-app-secondary dark:text-app-darkSecondary mb-1 uppercase tracking-wider">
              Plant Assignment
            </label>
            <select
              value={plant}
              onChange={e => setPlant(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder rounded-lg text-app-text dark:text-app-darkText outline-none focus:border-brand-blue"
            >
              {PLANTS.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-app-secondary dark:text-app-darkSecondary mb-1 uppercase tracking-wider">
              Role & Permission <span className="text-gi">*</span>
            </label>
            <select
              value={roleId}
              onChange={e => setRoleId(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder rounded-lg text-app-text dark:text-app-darkText outline-none focus:border-brand-blue"
            >
              {roles.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-app-secondary dark:text-app-darkSecondary mb-1 uppercase tracking-wider">
              Status <span className="text-gi">*</span>
            </label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as "ACTIVE" | "INACTIVE")}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder rounded-lg text-app-text dark:text-app-darkText outline-none focus:border-brand-blue"
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
          </div>
        </div>
      </form>
    </Modal>
  );
};
