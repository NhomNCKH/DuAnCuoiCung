import React from 'react';
import { LucideIcon } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: LucideIcon;
}

export function Input({ 
  label, 
  error, 
  icon: Icon, 
  className = '', 
  ...props 
}: InputProps) {
  const baseClasses = 'w-full py-4 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-slate-800 placeholder-slate-400 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const inputClasses = Icon 
    ? `${baseClasses} pl-12 pr-4` 
    : `${baseClasses} px-4`;

  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        )}
        <input
          className={`${inputClasses} ${className}`}
          {...props}
        />
      </div>
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}