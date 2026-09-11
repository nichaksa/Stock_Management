import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import {
  ArrowRight,
  Lock,
  User as UserIcon,
  ShieldAlert,
  Eye,
  EyeOff,
  Sun,
  Moon,
  Globe,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { addToast } = useToast();
  const isDark = theme === 'dark';
  const isTh = language === 'th';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError(isTh ? 'กรุณากรอกทั้งชื่อผู้ใช้และรหัสผ่าน' : 'Please enter both username and password.');
      return;
    }

    setIsLoading(true);
    setError('');

    setTimeout(() => {
      const result = login(username, password);
      setIsLoading(false);

      if (result.success) {
        addToast(isTh ? 'เข้าสู่ระบบสำเร็จ' : 'Signed in successfully', 'success');
        navigate('/');
      } else {
        setError(result.error || (isTh ? 'การยืนยันตัวตนล้มเหลว ตรวจสอบชื่อผู้ใช้และรหัสผ่าน' : 'Authentication failed. Please check your credentials.'));
      }
    }, 250);
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-slate-50 dark:bg-[#0B1120] flex items-center justify-center p-4 selection:bg-brand-blue selection:text-white transition-colors duration-300">
      {/* AMBIENT BACKGROUND GLOW & MESH */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-500/10 dark:bg-blue-600/15 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-500/10 dark:bg-indigo-600/15 blur-[140px] pointer-events-none" />
      <div className="absolute top-[30%] right-[15%] w-[350px] h-[350px] rounded-full bg-emerald-500/10 dark:bg-emerald-600/10 blur-[100px] pointer-events-none" />

      {/* Industrial geometric dot matrix pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#94a3b830_1px,transparent_1px)] dark:bg-[radial-gradient(#33415540_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

      {/* FIXED TOP-RIGHT CONTROLS: THEME & LANGUAGE */}
      <div className="fixed top-5 right-5 sm:top-6 sm:right-8 z-30 flex items-center gap-2">
        {/* Language Selector */}
        <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-1 shadow-xs">
          <Globe className="w-3.5 h-3.5 text-slate-400 ml-1.5 mr-1" />
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                language === 'en'
                  ? 'bg-brand-blue text-white shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-brand-blue'
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLanguage('th')}
              className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                language === 'th'
                  ? 'bg-brand-blue text-white shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-brand-blue'
              }`}
            >
              TH
            </button>
          </div>
        </div>

        {/* Theme Toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2 sm:p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md text-slate-700 dark:text-slate-300 hover:text-brand-blue transition-all shadow-xs hover:border-brand-blue/40 cursor-pointer"
          title="Toggle theme"
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>
      </div>

      {/* LOGIN SECTION CONTAINER (PORTRAIT BOUNDING BOX: 480–520px W, 560–620px H) */}
      <section className="relative z-10 w-full max-w-[500px] min-h-[580px] max-h-[620px] flex items-center justify-center p-4">
        {/* CENTER LOGIN CARD (COMPACT PORTRAIT: ~400px) */}
        <main className="relative w-full max-w-[400px] mx-auto animate-fade-in">
          {/* Soft Glow halo behind card */}
          <div className="absolute inset-x-4 top-6 bottom-6 bg-gradient-to-b from-blue-600/15 via-indigo-600/10 to-transparent rounded-[24px] blur-xl -z-10 transform scale-95" />

          <div className="bg-white/95 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800/90 rounded-[22px] shadow-[0_10px_35px_-5px_rgba(0,0,0,0.07)] dark:shadow-[0_12px_40px_-8px_rgba(0,0,0,0.5)] py-10 px-7 sm:py-11 sm:px-8 space-y-6">
            {/* Header */}
            <div className="text-center space-y-1.5">
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Sign In to <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-blue via-indigo-600 to-blue-500">ZYCODA</span>
              </h1>

              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-[280px] mx-auto leading-relaxed">
                {t('sign_in_desc')}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3.5 rounded-xl bg-red-50/90 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 flex items-start gap-2.5 animate-fade-in text-xs text-red-600 dark:text-red-400 font-medium">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                  <span className="leading-relaxed">{error}</span>
                </div>
              )}

              {/* Username Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  {t('username')}
                </label>
                <div className="relative group flex items-center">
                  <div className="absolute left-3.5 w-5 h-5 flex items-center justify-center text-slate-400 group-focus-within:text-brand-blue transition-colors pointer-events-none">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={isTh ? 'กรอกชื่อผู้ใช้' : 'Enter username'}
                    autoComplete="username"
                    className="w-full pl-10 pr-4 py-2.5 sm:py-3 text-sm bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:border-brand-blue focus:ring-3 focus:ring-brand-blue/10 transition-all font-medium"
                  />
                </div>
              </div>

              {/* Password Input with Show/Hide Toggle */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  {t('password')}
                </label>
                <div className="relative group flex items-center">
                  <div className="absolute left-3.5 w-5 h-5 flex items-center justify-center text-slate-400 group-focus-within:text-brand-blue transition-colors pointer-events-none">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="w-full pl-10 pr-11 py-2.5 sm:py-3 text-sm bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:border-brand-blue focus:ring-3 focus:ring-brand-blue/10 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Sign In Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 px-5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-brand-blue via-blue-600 to-indigo-600 hover:from-blue-700 hover:via-blue-600 hover:to-indigo-700 active:scale-[0.99] focus:outline-none focus:ring-3 focus:ring-brand-blue/25 transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed group cursor-pointer"
              >
                <span>{isLoading ? (isTh ? 'กำลังตรวจสอบสิทธิ์...' : 'Authenticating...') : t('sign_in')}</span>
                {!isLoading && (
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                )}
              </button>
            </form>
          </div>
        </main>
      </section>
    </div>
  );
};
