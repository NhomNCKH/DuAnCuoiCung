import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface EnhancedStatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  change?: string;
  color: string;
  bgColor?: string;
  index?: number;
}

export function EnhancedStatCard({ 
  icon: Icon, 
  label, 
  value, 
  change, 
  color, 
  bgColor = 'bg-white', 
  index = 0 
}: EnhancedStatCardProps) {
  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      variants={item}
      className={`${bgColor} rounded-xl p-6 border border-gray-100 hover:shadow-lg transition-shadow`}
    >
      <div className="flex justify-between items-start mb-4">
        <div className={`w-12 h-12 bg-gradient-to-r ${color} rounded-xl flex items-center justify-center shadow-lg`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        {change && (
          <span className="text-sm text-emerald-600 font-medium bg-white px-2 py-1 rounded-full">
            {change}
          </span>
        )}
      </div>
      <h3 className="text-2xl font-bold text-gray-800 mb-1">{value}</h3>
      <p className="text-gray-600 text-sm">{label}</p>
    </motion.div>
  );
}