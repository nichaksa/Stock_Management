import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldX, Home, ArrowLeft } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export const AccessDeniedPage: React.FC = () => {
  const { t } = useLanguage();

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gi-bg dark:bg-gi-darkBg border border-gi/20 flex items-center justify-center text-gi mb-4 shadow-subtle animate-fade-in">
        <ShieldX className="w-8 h-8" />
      </div>

      <h1 className="text-2xl font-bold text-app-text dark:text-app-darkText tracking-tight mb-1.5">
        {t('access_denied')}
      </h1>
      <p className="text-sm text-app-secondary dark:text-app-darkSecondary max-w-md mb-6">
        {t('access_denied_desc')}
      </p>

      <Link
        to="/"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-blue hover:bg-brand-hoverBlue text-white font-semibold text-xs shadow-sm transition-all"
      >
        <Home className="w-4 h-4" />
        <span>{t('back_to_home')}</span>
      </Link>
    </div>
  );
};
