/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './index.tsx',
    './App.tsx',
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          950: '#020617',
          900: '#0f172a',
          850: '#1e293b',
          800: '#1e293b',
          700: '#334155',
        },
        brand: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },
        ocean: {
          400: '#38bdf8',
          500: '#0ea5e9',
          900: '#0c4a6e',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Rajdhani', 'sans-serif'],
      },
      boxShadow: {
        subtle: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        card: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.15)',
        'glow-brand': '0 0 20px rgba(14, 165, 233, 0.25)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        marquee: 'marquee 60s linear infinite',
        'marquee-reverse': 'marqueeReverse 60s linear infinite',
        'pass-left': 'passLeft 35s linear infinite',
        'pass-right': 'passRight 35s linear infinite',
        'pass-up': 'passUp 35s linear infinite',
        'pass-down': 'passDown 35s linear infinite',
        'pass-diagonal-1': 'passDiagonal1 40s linear infinite',
        'pass-diagonal-2': 'passDiagonal2 40s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-100%)' },
        },
        marqueeReverse: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0%)' },
        },
        passLeft: {
          '0%': { transform: 'translateX(100vw)' },
          '100%': { transform: 'translateX(-100vw)' },
        },
        passRight: {
          '0%': { transform: 'translateX(-100vw)' },
          '100%': { transform: 'translateX(100vw)' },
        },
        passUp: {
          '0%': { transform: 'translateY(100vh)' },
          '100%': { transform: 'translateY(-100vh)' },
        },
        passDown: {
          '0%': { transform: 'translateY(-100vh)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        passDiagonal1: {
          '0%': { transform: 'translate(-50vw, -50vh)' },
          '100%': { transform: 'translate(100vw, 100vh)' },
        },
        passDiagonal2: {
          '0%': { transform: 'translate(100vw, -50vh)' },
          '100%': { transform: 'translate(-50vw, 100vh)' },
        },
      },
    },
  },
  plugins: [],
};
