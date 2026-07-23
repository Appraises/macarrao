import React from 'react';
import { Link } from 'react-router-dom';

export interface LegalNavigationItem {
  id: string;
  label: string;
}

interface LegalDocumentProps {
  title: string;
  description: string;
  version: string;
  effectiveDate: string;
  navigation: LegalNavigationItem[];
  children: React.ReactNode;
}

export const LegalDocument: React.FC<LegalDocumentProps> = ({
  title,
  description,
  version,
  effectiveDate,
  navigation,
  children,
}) => (
  <div className="w-full">
    <header className="border-b border-dark-800 bg-dark-900/40">
      <div className="max-w-6xl mx-auto px-4 py-14 md:py-20">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-400 mb-4">Legal e transparência</p>
        <h1 className="text-3xl md:text-5xl font-bold text-white mb-5">{title}</h1>
        <p className="text-base md:text-lg text-gray-400 max-w-3xl leading-relaxed">{description}</p>
        <div className="flex flex-wrap gap-x-6 gap-y-2 mt-7 text-xs text-gray-500">
          <span>Em vigor desde {effectiveDate}</span>
          <span>Versão {version}</span>
        </div>
      </div>
    </header>

    <div className="max-w-6xl mx-auto px-4 py-12 md:py-16 grid lg:grid-cols-[220px_minmax(0,1fr)] gap-10 lg:gap-16">
      <aside className="lg:sticky lg:top-32 lg:self-start" aria-label="Nesta página">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-500 mb-4">Nesta página</p>
        <nav className="flex lg:flex-col gap-2 overflow-x-auto pb-2 lg:pb-0">
          {navigation.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className="text-sm text-gray-400 hover:text-brand-400 transition-colors py-1.5 whitespace-nowrap lg:whitespace-normal"
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div className="hidden lg:block border-t border-dark-800 mt-6 pt-5 text-sm">
          <Link to="/termos" className="block text-gray-500 hover:text-white mb-2">Termos de Uso</Link>
          <Link to="/privacidade" className="block text-gray-500 hover:text-white">Privacidade</Link>
        </div>
      </aside>

      <article className="legal-copy min-w-0 space-y-12">{children}</article>
    </div>
  </div>
);

export const LegalSection: React.FC<{
  id: string;
  title: string;
  children: React.ReactNode;
}> = ({ id, title, children }) => (
  <section id={id} className="scroll-mt-32 border-b border-dark-800 pb-12 last:border-b-0">
    <h2 className="text-2xl font-bold text-white mb-5">{title}</h2>
    <div className="space-y-4 text-gray-300 leading-relaxed">{children}</div>
  </section>
);
