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
      className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <Icon className="w-5 h-5 text-emerald-500" />
          {title}
        </h2>
        {actionText && onAction && (
          <button 
            onClick={onAction}
            className="text-emerald-600 text-sm hover:underline"
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