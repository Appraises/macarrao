import React from 'react';
import { Loader2 } from 'lucide-react';

export const Button: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'glow';
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
}> = ({ children, onClick, variant = 'primary', className = '', disabled, type="button" }) => {
  const baseStyle = "relative px-6 py-2.5 rounded-lg font-semibold tracking-wide transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]";
  
  const variants = {
    primary: "bg-brand-500 text-black hover:bg-brand-400 shadow-[0_0_20px_rgba(14,165,233,0.15)] hover:shadow-[0_0_25px_rgba(14,165,233,0.3)]",
    secondary: "bg-dark-800 text-gray-200 border border-dark-700 hover:border-dark-600 hover:bg-dark-700",
    outline: "bg-transparent text-brand-500 border border-brand-500/30 hover:bg-brand-500/10",
    ghost: "text-gray-400 hover:text-white hover:bg-white/5",
    glow: "bg-brand-600 text-white hover:bg-brand-500 shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:shadow-[0_0_25px_rgba(59,130,246,0.6)]",
  };

  return (
    <button 
      type={type}
      onClick={onClick} 
      disabled={disabled}
      className={`${baseStyle} ${variants[variant]} ${className}`}
    >
      {disabled ? <Loader2 className="animate-spin w-4 h-4" /> : children}
    </button>
  );
};

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input
    {...props}
    className={`bg-dark-900 border border-dark-700 rounded-lg px-4 py-3 text-gray-100 placeholder-gray-600 
    focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50
    transition-colors duration-200 ${props.className}`}
  />
);

export const Badge: React.FC<{ children: React.ReactNode; color?: 'brand' | 'blue' | 'purple' | 'gray'; className?: string }> = ({ children, color = 'brand', className = '' }) => {
  const colors = {
    brand: "bg-brand-500/10 text-brand-400 border-brand-500/20",
    blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    purple: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    gray: "bg-dark-800 text-gray-400 border-dark-700",
  };
  
  return (
    <span className={`text-[10px] md:text-xs px-2.5 py-1 rounded-md border ${colors[color]} font-semibold uppercase tracking-wider ${className}`}>
      {children}
    </span>
  );
};