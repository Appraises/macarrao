import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { verifyEmail } from '../src/services/api';
import { Button } from '../components/UI';
import { CheckCircle, XCircle, Loader } from 'lucide-react';

export const VerifyEmail: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

    useEffect(() => {
        if (!token) {
            setStatus('error');
            return;
        }

        verifyEmail(token)
            .then(() => setStatus('success'))
            .catch(() => setStatus('error'));
    }, [token]);

    return (
        <div className="min-h-[80vh] flex items-center justify-center px-4">
            <div className="w-full max-w-md bg-dark-900 border border-dark-700 rounded-2xl p-8 shadow-2xl text-center">
                {status === 'loading' && (
                    <>
                        <Loader className="w-16 h-16 text-brand-500 animate-spin mx-auto mb-6" />
                        <h2 className="text-2xl font-bold text-white mb-2">Verificando...</h2>
                    </>
                )}
                {status === 'success' && (
                    <>
                        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-6" />
                        <h2 className="text-2xl font-bold text-white mb-2">Email Verificado!</h2>
                        <p className="text-gray-400 mb-6">Sua conta foi ativada com sucesso. Agora você pode contribuir com termos.</p>
                        <Button onClick={() => navigate('/')}>Ir para Home</Button>
                    </>
                )}
                {status === 'error' && (
                    <>
                        <XCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
                        <h2 className="text-2xl font-bold text-white mb-2">Falha na Verificação</h2>
                        <p className="text-gray-400 mb-6">O link pode ser inválido ou ter expirado.</p>
                        <Button onClick={() => navigate('/login')}>Voltar para Login</Button>
                    </>
                )}
            </div>
        </div>
    );
};
