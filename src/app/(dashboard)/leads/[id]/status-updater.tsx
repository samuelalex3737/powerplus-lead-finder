'use client';

import { useState } from 'react';
import type { LeadStatus } from '@/types/database';
import { STATUS_LABELS } from '@/types/database';

interface Props {
  leadId: string;
  currentStatus: LeadStatus;
}

export default function StatusUpdater({ leadId, currentStatus }: Props) {
  const [status, setStatus] = useState<LeadStatus>(currentStatus);
  const [loading, setLoading] = useState(false);

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as LeadStatus;
    setStatus(newStatus);
    setLoading(true);

    try {
      await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch (err) {
      console.error('Failed to update status', err);
      setStatus(currentStatus); // revert on error
    } finally {
      setLoading(false);
    }
  };

  return (
    <select
      value={status}
      onChange={handleChange}
      disabled={loading}
      className="status-select"
    >
      {(Object.entries(STATUS_LABELS) as [LeadStatus, string][]).map(([val, label]) => (
        <option key={val} value={val}>
          {label}
        </option>
      ))}
    </select>
  );
}
