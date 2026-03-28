import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface InfoCardProps {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
  actionText?: string;
  onAction?: () => void;
}

export function InfoCard({ title, icon: Icon, children, actionText, onAction }: InfoCardProps) {
  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      variants={item}
      initial="hidden"
      animate="show"
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <Icon className="w-5 h-5 text-blue-600" />
          {title}
        </h2>
        {actionText && onAction && (
          <button 
            onClick={onAction}
            className="text-sm text-blue-700 hover:underline"
          >
            {actionText}
          </button>
        )}
      </div>
      <div className="space-y-3">
        {children}
      </div>
    </motion.div>
  );
}