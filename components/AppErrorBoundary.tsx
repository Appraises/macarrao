import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';
import { Link, isRouteErrorResponse, useRouteError } from 'react-router-dom';
import * as Sentry from '@sentry/react';

type ErrorFallbackProps = {
    title?: string;
    message?: string;
    onRetry?: () => void;
};

export const ErrorFallback: React.FC<ErrorFallbackProps> = ({
    title = 'Algo não saiu como esperado',
    message = 'Tivemos um problema ao carregar esta página. Tente novamente ou volte para o início.',
    onRetry,
}) => (
    <main className="flex min-h-[60vh] items-center justify-center bg-dark-950 px-4 py-16 text-gray-200" role="alert">
        <section className="w-full max-w-lg border border-dark-700 bg-dark-900/80 p-6 text-center shadow-2xl sm:p-8">
            <span className="mx-auto grid h-12 w-12 place-items-center border border-brand-500/30 bg-brand-500/10 text-brand-400">
                <AlertTriangle className="h-6 w-6" aria-hidden="true" />
            </span>
            <h1 className="mt-5 text-xl font-black text-white">{title}</h1>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-gray-400">{message}</p>
            <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
                {onRetry ? (
                    <button type="button" onClick={onRetry} className="inline-flex items-center justify-center gap-2 bg-brand-500 px-4 py-2.5 text-xs font-black uppercase tracking-wide text-dark-950 transition-colors hover:bg-brand-300">
                        <RefreshCw className="h-4 w-4" aria-hidden="true" />
                        Tentar novamente
                    </button>
                ) : null}
                <Link to="/" className="inline-flex items-center justify-center gap-2 border border-dark-600 px-4 py-2.5 text-xs font-black uppercase tracking-wide text-gray-300 transition-colors hover:border-brand-400 hover:text-white">
                    <Home className="h-4 w-4" aria-hidden="true" />
                    Ir para o início
                </Link>
            </div>
        </section>
    </main>
);

type AppErrorBoundaryProps = { children: ReactNode };
type AppErrorBoundaryState = { hasError: boolean };

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
    state: AppErrorBoundaryState = { hasError: false };

    static getDerivedStateFromError(): AppErrorBoundaryState {
        return { hasError: true };
    }

    componentDidCatch(error: Error, info: ErrorInfo): void {
        Sentry.captureException(error, { extra: { componentStack: info.componentStack } });
    }

    handleRetry = (): void => {
        this.setState({ hasError: false });
        window.location.reload();
    };

    render(): ReactNode {
        if (this.state.hasError) return <ErrorFallback onRetry={this.handleRetry} />;
        return this.props.children;
    }
}

export const RouteErrorElement: React.FC = () => {
    const error = useRouteError();
    const isNotFound = isRouteErrorResponse(error) && error.status === 404;

    return (
        <ErrorFallback
            title={isNotFound ? 'Página não encontrada' : undefined}
            message={isNotFound ? 'A página que você procura não existe ou foi movida.' : undefined}
            onRetry={() => window.location.reload()}
        />
    );
};
