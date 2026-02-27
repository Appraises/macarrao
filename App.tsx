import React, { useState } from 'react';
import { HashRouter, Routes, Route, Link, useNavigate, Navigate } from 'react-router-dom';
import { Home } from './pages/Home';
import { TermDetail } from './pages/TermDetail';
import { Contribute } from './pages/Contribute';
import { Login } from './pages/Login';
import { VerifyEmail } from './pages/VerifyEmail';
import { Games } from './pages/Games';
import { GameDetail } from './pages/GameDetail';
import { Profile } from './pages/Profile';
import { Esports } from './pages/Esports';
import { MatchDetail } from './pages/MatchDetail';
import { TournamentDetail } from './pages/TournamentDetail';
import { News as NewsPage } from './pages/News';
import { NewsDetail } from './pages/NewsDetail';
import { Settings as SettingsPage } from './pages/Settings';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { DashboardLogin } from './pages/DASHBOARD/DashboardLogin';
import { DashboardLayout } from './pages/DASHBOARD/DashboardLayout';
import { Overview } from './pages/DASHBOARD/Overview';
import { Contributions } from './pages/DASHBOARD/Contributions';
import { TermsList } from './pages/DASHBOARD/Terms';
import { UsersList } from './pages/DASHBOARD/Users';
import { News } from './pages/DASHBOARD/News';
import { Button } from './components/UI';
import { PlusCircle, Menu, X, Twitter, Instagram, Facebook, Youtube, User as UserIcon, LogOut, Settings, Home as HomeIcon, Gamepad2, Newspaper, Trophy } from 'lucide-react';
import { User } from './types';
import { AuthProvider, useAuth } from './src/context/AuthContext';

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleContributeClick = () => {
    setMobileMenuOpen(false);
    navigate('/contribuir');
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-dark-950 border-b border-white/5 shadow-2xl">
      <div className="w-full px-3 md:px-6 h-24 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex-shrink-0 flex items-center gap-2 group mr-4">
          <div className="flex flex-col">
            <span className="text-2xl font-bold font-display text-white tracking-wide leading-none group-hover:text-brand-400 transition-colors uppercase">Dicionário Gamer</span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center justify-center gap-12 flex-1">
          <Link to="/" className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400 hover:text-brand-400 transition-all duration-300 hover:drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]">Início</Link>
          <Link to="/games" className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400 hover:text-brand-400 transition-all duration-300 hover:drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]">Jogos</Link>
          <Link to="/news" className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400 hover:text-brand-400 transition-all duration-300 hover:drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]">Notícias</Link>
          <Link to="/esports" className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400 hover:text-brand-400 transition-all duration-300 hover:drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]">E-Sports</Link>
        </nav>

        {/* Actions */}
        <div className="hidden md:flex items-center gap-4 flex-shrink-0">
          <Button onClick={handleContributeClick} className="text-xs uppercase tracking-wider bg-brand-500 text-black hover:bg-brand-400 border-none shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:shadow-[0_0_25px_rgba(59,130,246,0.5)] font-bold">
            <PlusCircle className="w-4 h-4 text-black" />
            Contribuir
          </Button>

          {user ? (
            <div className="relative group">
              <button
                className="flex items-center gap-3 pl-4 border-l border-white/10 hover:bg-white/5 transition-colors p-2 rounded-lg"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)} // Reusing mobile menu state or creating new one? Better create new one.
              >
                <div className="text-right hidden lg:block">
                  <p className="text-xs font-bold text-white">{user.name}</p>
                  <p className="text-[10px] text-brand-400">Lvl {user.level}</p>
                </div>
                <img src={user.avatar} alt={user.name} className="w-9 h-9 rounded-full border border-dark-700" />
              </button>

              {/* Dropdown */}
              <div className="absolute right-0 top-full mt-2 w-48 bg-dark-900 border border-dark-700 rounded-xl shadow-xl overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top-right z-50">
                <div className="p-2 space-y-1">
                  <Link to="/perfil" className="flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:bg-dark-800 hover:text-white rounded-lg transition-colors">
                    <UserIcon className="w-4 h-4" />
                    Perfil
                  </Link>
                  <Link to="/settings" className="flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:bg-dark-800 hover:text-white rounded-lg transition-colors">
                    <Settings className="w-4 h-4" />
                    Configurações
                  </Link>
                  <div className="h-px bg-dark-700 my-1"></div>
                  <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-lg transition-colors">
                    <LogOut className="w-4 h-4" />
                    Sair
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <Link to="/login" className="text-xs font-bold uppercase tracking-wider text-gray-300 hover:text-white px-4 py-2 border border-white/10 rounded hover:bg-white/5 transition-colors flex items-center gap-2">
              <UserIcon className="w-3 h-3" />
              Entrar
            </Link>
          )}
        </div>

        {/* Mobile Toggle */}
        <button
          className="md:hidden text-gray-400 hover:text-white p-2 hover:bg-white/10 rounded-lg transition-colors"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu */}
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-dark-950/90 backdrop-blur-xl animate-in fade-in duration-200 flex flex-col">
          {/* Mobile Header */}
          <div className="flex items-center justify-between px-6 h-24 border-b border-white/5">
            <span className="text-2xl font-bold font-display text-white tracking-wide uppercase">Menu</span>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 bg-white/5 rounded-lg text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Mobile Nav Links */}
          <div className="flex-1 flex flex-col justify-center px-8 gap-6 overflow-y-auto">
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="group flex items-center gap-4 text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gray-400 to-gray-600 hover:from-brand-400 hover:to-brand-600 transition-all duration-300"
            >
              <HomeIcon className="w-8 h-8 text-gray-600 group-hover:text-brand-500 transition-colors" />
              Início
            </Link>
            <Link
              to="/games"
              onClick={() => setMobileMenuOpen(false)}
              className="group flex items-center gap-4 text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gray-400 to-gray-600 hover:from-brand-400 hover:to-brand-600 transition-all duration-300"
            >
              <Gamepad2 className="w-8 h-8 text-gray-600 group-hover:text-brand-500 transition-colors" />
              Jogos
            </Link>
            <Link
              to="/news"
              onClick={() => setMobileMenuOpen(false)}
              className="group flex items-center gap-4 text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gray-400 to-gray-600 hover:from-brand-400 hover:to-brand-600 transition-all duration-300"
            >
              <Newspaper className="w-8 h-8 text-gray-600 group-hover:text-brand-500 transition-colors" />
              Notícias
            </Link>
            <Link
              to="/esports"
              onClick={() => setMobileMenuOpen(false)}
              className="group flex items-center gap-4 text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gray-400 to-gray-600 hover:from-brand-400 hover:to-brand-600 transition-all duration-300"
            >
              <Trophy className="w-8 h-8 text-gray-600 group-hover:text-brand-500 transition-colors" />
              E-Sports
            </Link>

            <div className="h-px bg-white/10 my-4 w-full"></div>

            <Button onClick={handleContributeClick} className="w-full py-4 text-lg bg-brand-600 text-white shadow-[0_0_20px_rgba(14,165,233,0.3)]">
              <PlusCircle className="w-5 h-5 mr-2" />
              Contribuir
            </Button>
          </div>

          {/* Mobile Footer / User */}
          <div className="p-6 border-t border-white/5 bg-black/20">
            {user ? (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  <img src={user.avatar} alt={user.name} className="w-12 h-12 rounded-full border-2 border-brand-500" />
                  <div>
                    <p className="text-lg font-bold text-white">{user.name}</p>
                    <p className="text-xs text-brand-400 font-bold uppercase tracking-wider">Nível {user.level}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Link to="/perfil" onClick={() => setMobileMenuOpen(false)} className="flex items-center justify-center gap-2 p-3 rounded-lg bg-white/5 hover:bg-white/10 text-sm font-bold text-gray-300 transition-colors">
                    <UserIcon className="w-4 h-4" /> Perfil
                  </Link>
                  <Link to="/settings" onClick={() => setMobileMenuOpen(false)} className="flex items-center justify-center gap-2 p-3 rounded-lg bg-white/5 hover:bg-white/10 text-sm font-bold text-gray-300 transition-colors">
                    <Settings className="w-4 h-4" /> Config
                  </Link>
                </div>
                <button onClick={logout} className="w-full p-3 rounded-lg border border-red-500/30 text-red-400 font-bold uppercase text-xs hover:bg-red-500/10 transition-colors">
                  Sair da Conta
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center w-full py-4 border border-white/20 rounded-xl text-white font-bold uppercase tracking-wider hover:bg-white/10 transition-colors"
              >
                Fazer Login
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

const Footer: React.FC = () => (
  <footer className="border-t border-white/5 bg-dark-950 relative z-10 mt-auto pt-20 pb-10">
    <div className="max-w-7xl mx-auto px-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-24">

        {/* Column 1: Brand & Social */}
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold font-display text-white tracking-wide uppercase">
              Dicionário <span className="text-brand-500">Gamer</span>
            </span>
          </div>
          <p className="text-gray-500 text-sm leading-relaxed font-medium max-w-xs">
            Um dicionário feito de gamers para gamers. Aprenda todo o vocabulário complexo dos jogos em um lugar só, de maneira simples e intuitiva.
          </p>
          <div className="flex gap-4 pt-2">
            <a href="#" className="w-10 h-10 rounded-lg bg-dark-900 border border-dark-800 flex items-center justify-center text-gray-500 hover:text-white hover:border-brand-500/30 hover:bg-dark-800 transition-all group">
              <Twitter className="w-5 h-5" />
            </a>
            <a href="#" className="w-10 h-10 rounded-lg bg-dark-900 border border-dark-800 flex items-center justify-center text-gray-500 hover:text-white hover:border-brand-500/30 hover:bg-dark-800 transition-all group">
              <Instagram className="w-5 h-5" />
            </a>
            <a href="#" className="w-10 h-10 rounded-lg bg-dark-900 border border-dark-800 flex items-center justify-center text-gray-500 hover:text-white hover:border-brand-500/30 hover:bg-dark-800 transition-all group">
              <Facebook className="w-5 h-5" />
            </a>
            <a href="#" className="w-10 h-10 rounded-lg bg-dark-900 border border-dark-800 flex items-center justify-center text-gray-500 hover:text-white hover:border-brand-500/30 hover:bg-dark-800 transition-all group">
              <Youtube className="w-5 h-5" />
            </a>
          </div>
        </div>

        {/* Column 2: Outros */}
        <div>
          <h4 className="text-brand-500 font-bold text-lg mb-8 flex items-center gap-2">
            Outros
          </h4>
          <ul className="space-y-4">
            <li><Link to="/" className="text-gray-500 hover:text-white transition-colors text-sm font-medium block hover:translate-x-1 transform duration-200">Página Principal</Link></li>
            <li><Link to="/games" className="text-gray-500 hover:text-white transition-colors text-sm font-medium block hover:translate-x-1 transform duration-200">Jogos</Link></li>
            <li><Link to="/contribuir" className="text-gray-500 hover:text-white transition-colors text-sm font-medium block hover:translate-x-1 transform duration-200">Enviar Palavras</Link></li>
            <li><a href="#" className="text-gray-500 hover:text-white transition-colors text-sm font-medium block hover:translate-x-1 transform duration-200">Suporte</a></li>
            <li><a href="#" className="text-gray-500 hover:text-white transition-colors text-sm font-medium block hover:translate-x-1 transform duration-200">Reportar Palavras</a></li>
          </ul>
        </div>

        {/* Column 3: Legal */}
        <div>
          <h4 className="text-brand-500 font-bold text-lg mb-8 flex items-center gap-2">
            Termos e Privacidade
          </h4>
          <ul className="space-y-4">
            <li><a href="#" className="text-gray-500 hover:text-white transition-colors text-sm font-medium block hover:translate-x-1 transform duration-200">Termos e Condições</a></li>
            <li><a href="#" className="text-gray-500 hover:text-white transition-colors text-sm font-medium block hover:translate-x-1 transform duration-200">Privacidade</a></li>
          </ul>
        </div>

      </div>

      <div className="border-t border-white/5 mt-16 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="text-gray-600 text-xs">
          &copy; {new Date().getFullYear()} Dicionário Gamer. Todos os direitos reservados.
        </p>
        <div className="flex gap-6">
          <span className="w-2 h-2 rounded-full bg-brand-500 shadow-[0_0_10px_rgba(14,165,233,0.5)]"></span>
        </div>
      </div>
    </div>
  </footer>
);

const AppContent: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen bg-dark-950 text-gray-200 font-sans selection:bg-brand-500/30 selection:text-brand-100 overflow-x-hidden">
      {/* Global Background Effects */}
      <div className="fixed inset-0 bg-grid pointer-events-none z-0"></div>
      <div className="fixed top-0 left-0 w-full h-full bg-gradient-to-b from-transparent via-transparent to-dark-950/80 pointer-events-none z-0"></div>

      <Header />

      <main className="flex-grow relative z-10 flex flex-col">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/games" element={<Games />} />
          <Route path="/games/:slug" element={<GameDetail />} />
          <Route path="/news" element={<NewsPage />} />
          <Route path="/news/:id" element={<NewsDetail />} />
          <Route path="/esports" element={<Esports />} />
          <Route path="/esports/match/:id" element={<MatchDetail />} />
          <Route path="/esports/tournament/:id" element={<TournamentDetail />} />
          <Route path="/term/:slug" element={<TermDetail />} />
          <Route path="/perfil" element={<Profile />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/contribuir" element={<Contribute />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
        </Routes>
      </main>

      <Footer />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          {/* Dashboard Routes - Independent Layout */}
          <Route path="/dashboard/login" element={<DashboardLogin />} />
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<Navigate to="/dashboard/overview" replace />} />
            <Route path="overview" element={<Overview />} />
            <Route path="contributions" element={<Contributions />} />
            <Route path="users" element={<UsersList />} />
            <Route path="terms" element={<TermsList />} />
            <Route path="news" element={<News />} />
          </Route>

          {/* Main App Routes - Default Layout */}
          <Route path="*" element={<AppContent />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
};

export default App;