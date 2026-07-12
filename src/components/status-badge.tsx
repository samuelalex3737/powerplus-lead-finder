import type { FC } from 'react';
import { STATUS_LABELS, type LeadStatus } from '@/types/database';

interface StatusBadgeProps {
  status: LeadStatus;
}

const StatusBadge: FC<StatusBadgeProps> = ({ status }) => {
  return (
    <span className={`status-badge status-${status}`}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%',
        background: 'currentColor', display: 'inline-block'
      }} />
      {STATUS_LABELS[status]}
    </span>
  );
};

export default StatusBadge;
