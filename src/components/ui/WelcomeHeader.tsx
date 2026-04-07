import React from 'react';
import { motion } from 'framer-motion';

interface WelcomeHeaderProps {
  userName?: string;
  title: string;
  subtitle: string;
  date?: string;
}

export function WelcomeHeader({ userName, title, subtitle, date }: WelcomeHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-6 text-white bg-blue-600"
    >
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-2">
            {title} {userName && `, ${userName}`}!
          </h1>
          <p className="text-white/85">
            {subtitle}
          </p>
        </div>
        {date && (
          <div className="bg-white/15 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold">{date}</div>
            <div className="text-xs text-white/80">Hôm nay</div>
          </div>
        )}
      </div>
    </motion.div>
  );
}