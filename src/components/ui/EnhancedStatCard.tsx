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
  compact?: boolean;
  tone?: "blue" | "green" | "yellow" | "red";
}

export function EnhancedStatCard({ 
  icon: Icon, 
  label, 
  value, 
  change, 
  color, 
  bgColor = 'bg-white', 
  index = 0,
  compact = false,
  tone,
}: EnhancedStatCardProps) {
  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };
  const toneStyles: Record<NonNullable<EnhancedStatCardProps["tone"]>, { light: string; dark: string }> = {
    blue: { light: "#2563eb", dark: "#3b82f6" },
    green: { light: "#16a34a", dark: "#22c55e" },
    yellow: { light: "#d97706", dark: "#f59e0b" },
    red: { light: "#dc2626", dark: "#ef4444" },
  };
  const iconBgStyle = tone ? { backgroundColor: toneStyles[tone].light } : undefined;
  const iconBgStyleDark = tone ? ({ "--stat-icon-dark-bg": toneStyles[tone].dark } as React.CSSProperties) : undefined;

  return (
    <motion.div
      variants={item}
      className={`${bgColor} rounded-2xl border border-slate-200 shadow-sm transition-shadow ${compact ? "p-3.5" : "p-5"}`}
    >
      <div className={`flex ${compact ? "items-center justify-start gap-2.5 mb-2" : "justify-between items-start mb-4"}`}>
        <div
          className={`${compact ? "w-9 h-9 rounded-lg" : "w-12 h-12 rounded-xl"} ${tone ? "stat-icon-tone" : `bg-gradient-to-r ${color}`} flex items-center justify-center shadow-lg`}
          style={{ ...iconBgStyle, ...iconBgStyleDark }}
        >
          <Icon className={`${compact ? "w-4.5 h-4.5" : "w-6 h-6"} text-white`} />
        </div>
        {compact ? (
          <h3 className="text-xl font-bold text-slate-900 leading-none">{value}</h3>
        ) : null}
        {change && (
          <span className="text-sm text-blue-700 font-medium bg-blue-50 px-2 py-1 rounded-full">
            {change}
          </span>
        )}
      </div>
      {!compact ? <h3 className="text-2xl mb-1 font-bold text-slate-900">{value}</h3> : null}
      <p className={`${compact ? "text-xs" : "text-sm"} text-slate-600`}>{label}</p>
    </motion.div>
  );
}