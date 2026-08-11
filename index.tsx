import { ViteReactSSG } from 'vite-react-ssg';
import { routes } from './App';
import './index.css';
import { initSentry } from './src/lib/sentry';
import { installStaticLoaderFetchGuard } from './src/lib/staticLoaderFetchGuard';

initSentry();
installStaticLoaderFetchGuard();

// ViteReactSSG handles client-side hydration in the browser and static
// rendering at build time. The route config lives in App.tsx.
export const createRoot = ViteReactSSG({ routes });
