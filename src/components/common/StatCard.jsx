import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  trendLabel,
  color = 'indigo',
  delay = 0 
}) {
  const colorClasses = {
    indigo: 'from-indigo-500 to-indigo-600 shadow-indigo-200',
    purple: 'from-purple-500 to-purple-600 shadow-purple-200',
    blue: 'from-blue-500 to-blue-600 shadow-blue-200',
    green: 'from-emerald-500 to-emerald-600 shadow-emerald-200',
    orange: 'from-orange-500 to-orange-600 shadow-orange-200',
    pink: 'from-pink-500 to-pink-600 shadow-pink-200',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="text-3xl font-bold text-slate-800 mt-2">{value}</p>
          {trend !== undefined && (
            <div className="flex items-center gap-1 mt-2">
              <span className={cn(
                "text-sm font-medium",
                trend >= 0 ? "text-emerald-600" : "text-red-500"
              )}>
                {trend >= 0 ? '+' : ''}{trend}%
              </span>
              {trendLabel && (
                <span className="text-xs text-slate-400">{trendLabel}</span>
              )}
            </div>
          )}
        </div>
        {Icon && (
          <div className={cn(
            "w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg",
            colorClasses[color]
          )}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        )}
      </div>
    </motion.div>
  );
}