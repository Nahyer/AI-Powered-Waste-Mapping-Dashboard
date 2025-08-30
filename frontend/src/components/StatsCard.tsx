import React from 'react';

interface StatsCardProps {
  title: string;
  value: string | number;
  color: 'blue' | 'red' | 'orange' | 'green' | 'purple';
  icon?: React.ReactNode;
  change?: {
    value: string;
    trend: 'up' | 'down' | 'neutral';
  };
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, color, icon, change }) => {
  const getColorClasses = () => {
    switch (color) {
      case 'red':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'orange':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'green':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'purple':
        return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'blue':
      default:
        return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  const getTrendIcon = () => {
    if (!change) return null;
    
    switch (change.trend) {
      case 'up':
        return (
          <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l9.2-9.2M17 17V7H7" />
          </svg>
        );
      case 'down':
        return (
          <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 7l-9.2 9.2M7 7v10h10" />
          </svg>
        );
      case 'neutral':
      default:
        return (
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
          </svg>
        );
    }
  };

  return (
    <div className={`bg-white p-6 rounded-lg shadow-lg border transition-all hover:shadow-xl ${getColorClasses()}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center">
            {icon && <div className="mr-3">{icon}</div>}
            <div className="text-3xl font-bold">{value}</div>
          </div>
          <div className="text-sm text-gray-600 mt-1">{title}</div>
          {change && (
            <div className="flex items-center mt-2">
              {getTrendIcon()}
              <span className="text-xs text-gray-500 ml-1">{change.value}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatsCard;
