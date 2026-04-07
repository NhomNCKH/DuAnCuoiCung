import React from 'react';
import { motion } from 'framer-motion';
import { StatCard as StatCardType } from '@/types/ui';

interface StatCardProps extends StatCardType {
  index?: number;
}

export function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  change, 
  color, 
  bgColor = 'bg-white', 
  index = 0 
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`${bgColor} rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow`}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-blue-50">
          <Icon className={`w-6 h-6 text-emerald-600`} />
        </div>
        {change && (
          <span className="text-sm text-emerald-600 font-medium">{change}</span>
        )}
      </div>
      <h3 className="text-2xl font-bold text-gray-800 mb-1">{value}</h3>
      <p className="text-gray-600 text-sm">{label}</p>
    </motion.div>
  );
}