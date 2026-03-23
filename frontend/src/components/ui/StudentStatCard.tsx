import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface StudentStatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  badge: string;
  subtitle?: string;
  index?: number;
}

export function StudentStatCard({ 
  icon: Icon, 
  label, 
  value, 
  badge, 
  subtitle,
  index = 0 
}: StudentStatCardProps) {
  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <motion.div 
      variants={item} 
      className="bg-white rounded-xl p-4 shadow-sm border border-emerald-100"
    >
      <div className="flex items-center justify-between mb-2">
        <Icon className="w-8 h-8 text-emerald-500" />
        <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
          {badge}
        </span>
      </div>
      <div className="text-2xl font-bold text-gray-800">{value}</div>
      <div className="text-sm text-gray-500">{label}</div>
      {subtitle && (
        <div className="mt-2 text-xs text-emerald-600">{subtitle}</div>
      )}
    </motion.div>
  );
}