import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '../components/UI';
import { Seo } from '../components/Seo';
import { Ghost } from 'lucide-react';
import { sanitizeAnalyticsPath, trackAnalyticsEvent } from '../src/lib/analytics';

export const NotFound: React.FC = () => {
  const location = useLocation();
  useEffect(() => {
    trackAnalyticsEvent('404', { path: sanitizeAnalyticsPath(location.pathname) });
  }, [location.pathname]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-24 min-h-[60vh] flex flex-col items-center justify-center text-center">
      <Seo title="Página não encontrada" noindex />
      <Ghost className="w-20 h-20 text-brand-500/60 mb-6" />
      <p className="text-7xl font-black text-brand-500 mb-2">404</p>
      <h1 className="text-2xl font-bold text-white mb-3">Página não encontrada</h1>
      <p className="text-gray-400 max-w-md mb-8">
        A página que você procura não existe, foi movida ou o link está incorreto.
      </p>
      <Link to="/">
        <Button>Voltar ao início</Button>
      </Link>
    </div>
  );
};
