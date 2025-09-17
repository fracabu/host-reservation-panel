import React from 'react';
import { Status } from '../types';

interface StatusBadgeProps {
  status: Status;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getStatusConfig = (status: Status) => {
    switch (status) {
      case Status.OK:
        return {
          label: 'OK',
          className: 'bg-green-100 text-green-800'
        };
      case Status.Cancelled:
        return {
          label: 'Cancellata',
          className: 'bg-red-100 text-red-800'
        };
      case Status.NoShow:
        return {
          label: 'Mancata presentazione',
          className: 'bg-yellow-100 text-yellow-800'
        };
      default:
        return {
          label: status,
          className: 'bg-gray-100 text-gray-800'
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
};

export default StatusBadge;