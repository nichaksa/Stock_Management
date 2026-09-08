import React, { useState } from 'react';
import { User } from '../../types/auth';
import { Modal } from '../common/Modal';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { KeyRound } from 'lucide-react';

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
}

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({
  isOpen,
  onClose,
  user,
}) => {
  const { resetUserPassword } = useAuth();
  const { addToast } = useToast();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!user) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 4) {
      setError("Password must be at least 4 characters long");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      const res = resetUserPassword(user.id, newPassword);
      setIsSubmitting(false);

      if (res.success) {
        addToast(`Password for @${user.username} has been reset successfully`, 'success');
        setNewPassword("");
        setConfirmPassword("");
        onClose();
      } else {
        setError(res.error || "Failed to reset password");
      }
    }, 200);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Reset Password"
      subtitle={`Set a new temporary or permanent password for @${user.username}`}
      maxWidthClass="max-w-md"
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
            {isSubmitting ? "Resetting..." : "Reset Password"}
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 rounded-xl bg-app-bg dark:bg-app-darkBg border border-app-border dark:border-app-darkBorder flex items-center gap-3">
          <div className="p-2 rounded-lg bg-brand-softBlue dark:bg-blue-950/60 text-brand-blue">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-app-text dark:text-app-darkText">{user.fullName}</p>
            <p className="text-[11px] text-app-muted font-mono">@{user.username} · {user.department}</p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-app-secondary dark:text-app-darkSecondary mb-1 uppercase tracking-wider">
            New Password <span className="text-gi">*</span>
          </label>
          <input
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            placeholder="Enter new password"
            className="w-full px-3 py-2 text-xs sm:text-sm bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder rounded-lg text-app-text dark:text-app-darkText outline-none focus:border-brand-blue"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-app-secondary dark:text-app-darkSecondary mb-1 uppercase tracking-wider">
            Confirm New Password <span className="text-gi">*</span>
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            className="w-full px-3 py-2 text-xs sm:text-sm bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder rounded-lg text-app-text dark:text-app-darkText outline-none focus:border-brand-blue"
          />
        </div>

        {error && <p className="text-xs text-gi font-medium">{error}</p>}
      </form>
    </Modal>
  );
};
