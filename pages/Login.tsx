import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Gamepad2, Twitch, Mail, User as UserIcon, Lock, ArrowRight, AlertCircle } from 'lucide-react';
import { Button } from '../components/UI';
import { User } from '../types';
import { login, registerUser } from '../src/services/api';

import { useAuth } from '../src/context/AuthContext';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login: authLogin } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let response;
      if (isRegistering) {
        if (password !== confirmPassword) {
          throw { response: { data: { error: 'As senhas não coincidem.' } } };
        }
        response = await registerUser({ name, email, password });
        setRegistrationSuccess(true);
        setLoading(false);
        return; // Stop here to show success message
      } else {
        response = await login({ email, password });
      }

      if (response && response.token) {
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        authLogin(response.user);
        navigate('/');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || 'Falha na autenticação. Verifique seus dados.');
    } finally {
      if (!isRegistering) setLoading(false);
    }
  };

  const handleMockLogin = () => {
    // Simulating a login response
    const mockUser: User = {
      id: 'u1',
      name: 'PlayerOne',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
      level: 12,
      role: 'USER',
      email: 'mock@example.com',
      createdAt: new Date().toISOString(),
      badges: ['Beta Tester', 'Contributor']
    };
    authLogin(mockUser);
    navigate('/contribuir'); // Redirect back to contribute or home
  };

  if (registrationSuccess) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-dark-900 border border-dark-700 rounded-2xl p-8 shadow-2xl text-center">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Mail className="w-8 h-8 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">Verifique seu Email</h2>
          <p className="text-gray-400 mb-6">
            Enviamos um link de confirmação para <strong>{email}</strong>.
            Por favor, verifique sua caixa de entrada (e spam) para ativar sua conta.
          </p>
          <Button onClick={() => { setIsRegistering(false); setRegistrationSuccess(false); }}>
            Voltar para Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-dark-900 border border-dark-700 rounded-2xl p-8 shadow-2xl relative overflow-hidden">

        {/* Decorative background elements */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-500 via-brand-400 to-brand-600"></div>
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-brand-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-dark-800 rounded-xl border border-dark-700 flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Gamepad2 className="w-8 h-8 text-brand-500" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            {isRegistering ? 'Crie sua conta' : 'Bem-vindo de volta'}
          </h1>
          <p className="text-gray-400 text-sm">
            {isRegistering
              ? 'Junte-se à comunidade e comece a contribuir.'
              : 'Conecte-se para contribuir com o dicionário e subir de nível.'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegistering && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase ml-1">Nome de Usuário</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-3.5 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nick gamer"
                  className="w-full bg-dark-950 border border-dark-700 rounded-xl py-3 pl-10 pr-4 text-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all outline-none placeholder-gray-600"
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase ml-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3.5 w-5 h-5 text-gray-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full bg-dark-950 border border-dark-700 rounded-xl py-3 pl-10 pr-4 text-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all outline-none placeholder-gray-600"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase ml-1">Senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3.5 w-5 h-5 text-gray-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-dark-950 border border-dark-700 rounded-xl py-3 pl-10 pr-4 text-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all outline-none placeholder-gray-600"
              />
            </div>
          </div>

          {isRegistering && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase ml-1">Confirmar Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 w-5 h-5 text-gray-500" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-dark-950 border border-dark-700 rounded-xl py-3 pl-10 pr-4 text-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all outline-none placeholder-gray-600"
                />
              </div>
            </div>
          )}

          {!isRegistering && (
            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-xs font-bold text-brand-400 hover:text-brand-300 transition-colors">
                Esqueci minha senha
              </Link>
            </div>
          )}

          <Button
            type="submit"
            className="w-full h-12 text-base mt-2"
            disabled={loading}
          >
            {loading ? 'Processando...' : (isRegistering ? 'Criar Conta' : 'Entrar')}
            {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-400">
            {isRegistering ? 'Já tem uma conta?' : 'Não tem uma conta?'}
            <button
              onClick={() => setIsRegistering(!isRegistering)}
              className="ml-1 text-brand-400 font-bold hover:text-brand-300 hover:underline transition-colors"
            >
              {isRegistering ? 'Fazer Login' : 'Registrar-se'}
            </button>
          </p>
        </div>

        <div className="relative py-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-dark-700"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-dark-900 px-2 text-gray-500">Ou entre com</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleMockLogin}
            className="py-2.5 px-4 bg-[#5865F2]/10 border border-[#5865F2]/20 hover:bg-[#5865F2]/20 text-[#5865F2] rounded-lg font-bold transition-all flex items-center justify-center gap-2 text-sm"
          >
            <Gamepad2 className="w-4 h-4" />
            Discord
          </button>

          <button
            onClick={handleMockLogin}
            className="py-2.5 px-4 bg-[#9146FF]/10 border border-[#9146FF]/20 hover:bg-[#9146FF]/20 text-[#9146FF] rounded-lg font-bold transition-all flex items-center justify-center gap-2 text-sm"
          >
            <Twitch className="w-4 h-4" />
            Twitch
          </button>
        </div>
      </div>
    </div>
  );
};
