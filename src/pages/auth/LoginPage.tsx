import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { ArrowRight, Lock, User as UserIcon, ShieldAlert } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { t } = useLanguage();
  const { addToast } = useToast();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please enter both username and password.');
      return;
    }

    setIsLoading(true);
    setError('');

    setTimeout(() => {
      const result = login(username, password);
      setIsLoading(false);

      if (result.success) {
        addToast('Signed in successfully', 'success');
        navigate('/');
      } else {
        setError(result.error || 'Authentication failed. Please check your credentials.');
      }
    }, 250);
  };

  return (
    <div className="min-h-screen bg-app-bg dark:bg-app-darkBg flex flex-col justify-center items-center p-4 selection:bg-brand-softBlue selection:text-brand-blue">
      {/* Background industrial pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#2563eb15_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10 animate-fade-in">
        {/* Card */}
        <div className="bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder rounded-2xl shadow-modal p-8 sm:p-10">
          {/* Logo & Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-brand-blue text-white font-bold text-xl mb-4 shadow-sm">
              Z
            </div>
            <h1 className="text-2xl font-bold text-app-text dark:text-app-darkText tracking-tight">
              ZYCODA
            </h1>
            <p className="text-xs font-mono text-brand-blue uppercase tracking-widest mt-0.5">
              Stock Management OS
            </p>
            <div className="mt-3">
              <p className="text-xs text-app-secondary dark:text-app-darkSecondary">
                {t('sign_in_desc')}
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-gi-bg dark:bg-gi-darkBg border border-gi/30 flex items-start gap-2.5 animate-fade-in text-xs text-gi font-medium">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-app-secondary dark:text-app-darkSecondary mb-1.5 uppercase tracking-wider">
                {t('username')}
              </label>
              <div className="relative flex items-center">
                <UserIcon className="absolute left-3.5 w-4 h-4 text-app-muted pointer-events-none" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  autoComplete="username"
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder rounded-xl text-app-text dark:text-app-darkText placeholder-app-muted focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-colors font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-app-secondary dark:text-app-darkSecondary mb-1.5 uppercase tracking-wider">
                {t('password')}
              </label>
              <div className="relative flex items-center">
                <Lock className="absolute left-3.5 w-4 h-4 text-app-muted pointer-events-none" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-white dark:bg-app-darkSurface border border-app-border dark:border-app-darkBorder rounded-xl text-app-text dark:text-app-darkText placeholder-app-muted focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-colors font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-brand-blue hover:bg-brand-hoverBlue focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-offset-2 transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <span>{isLoading ? 'Authenticating...' : t('sign_in')}</span>
              {!isLoading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          {/* Footer note */}
          <div className="mt-8 pt-4 border-t border-app-border dark:border-app-darkBorder text-center">
            <p className="text-[11px] text-app-muted dark:text-app-darkMuted">
              Factory Authentication Gateway · Authorized Access Only
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
