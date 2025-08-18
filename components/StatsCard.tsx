import React from 'react';

interface StatsCardProps {
  title: string;
  value: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value }) => {
  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-5">
        <dl>
          <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
          <dd className="mt-1 text-3xl font-semibold text-gray-900">{value}</dd>
        </dl>
      </div>
    </div>
  );
};

export default StatsCard;
