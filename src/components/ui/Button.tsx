import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { ButtonVariant } from '@/types/ui';

const buttonVariants = {
  primary: 'bg-blue-700 text-white hover:bg-blue-800',
  secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200',
  outline: 'border border-blue-600 text-blue-700 hover:bg-blue-50',
  ghost: 'text-blue-700 hover:bg-blue-50',
  danger: 'bg-red-500 text-white hover:bg-red-600'
};

const buttonSizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2',
  lg: 'px-6 py-3 text-lg'
};

export function Button({ 
  variant = 'primary', 
  size = 'md', 
  loading = false, 
  disabled = false, 
  children, 
  onClick,
  className,
  ...props 
}: ButtonVariant & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'onClick'>) {
  const baseClasses = 'inline-flex items-center justify-center rounded-xl font-medium transition-all focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const classes = `${baseClasses} ${buttonVariants[variant]} ${buttonSizes[size]} ${className || ''}`;

  return (
    <motion.button
      whileHover={!disabled && !loading ? { scale: 1.02 } : {}}
      whileTap={!disabled && !loading ? { scale: 0.98 } : {}}
      className={classes}
      disabled={disabled || loading}
      onClick={onClick}
      {...(props as any)}
    >
      {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
      {children}
    </motion.button>
  );
}