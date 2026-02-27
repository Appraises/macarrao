import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../src/services/api';
import { Button, Input } from '../components/UI';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';

export const ForgotPassword: React.FC = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await forgotPassword(email);
            setSubmitted(true);
        } catch (err) {
            setError('Ocorreu um erro. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-dark-950 px-4">
                <div className="max-w-md w-full bg-dark-900 p-8 rounded-2xl border border-dark-800 shadow-2xl text-center">
                    <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-8 h-8 text-green-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Verifique seu Email</h2>
                    <p className="text-gray-400 mb-8">
                        Se existir uma conta com o email <strong>{email}</strong>, enviamos um link para redefinir sua senha.
                    </p>
                    <Link to="/login">
                        <Button variant="outline" className="w-full">
                            Voltar para Login
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-dark-950 px-4">
            <div className="max-w-md w-full bg-dark-900 p-8 rounded-2xl border border-dark-800 shadow-2xl">
                <Link to="/login" className="inline-flex items-center text-gray-500 hover:text-white mb-6 transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Voltar
                </Link>

                <h2 className="text-2xl font-bold text-white mb-2">Esqueceu a senha?</h2>
                <p className="text-gray-400 mb-8">
                    Digite seu email e enviaremos um link para você redefinir sua senha.
                </p>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg mb-6 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                            <Input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="pl-10 w-full"
                                placeholder="seu@email.com"
                                required
                            />
                        </div>
                    </div>

                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? 'Enviando...' : 'Enviar Link de Recuperação'}
                    </Button>
                </form>
            </div>
        </div>
    );
};
