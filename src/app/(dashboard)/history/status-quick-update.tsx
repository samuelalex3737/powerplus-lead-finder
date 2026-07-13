'use client';

import { useState, useCallback } from 'react';
import type { LeadStatus } from '@/types/database';

interface StatusQuickUpdateProps {
  leadId: string;
  currentStatus: LeadStatus;
}

const STATUS_OPTIONS: { value: LeadStatus; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'quoted', label: 'Quoted' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
];

export default function StatusQuickUpdate({ leadId, currentStatus }: StatusQuickUpdateProps) {
  const [status, setStatus] = useState<LeadStatus>(currentStatus);
  const [saving, setSaving] = useState(false);
  const [showCheck, setShowCheck] = useState(false);
  const [error, setError] = useState(false);

  const handleChange = useCallback(async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as LeadStatus;
    setStatus(newStatus);
    setSaving(true);
    setError(false);

    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error('Failed to update');

      setShowCheck(true);
      setTimeout(() => setShowCheck(false), 1500);
    } catch {
      setError(true);
      setStatus(currentStatus);
      setTimeout(() => setError(false), 2000);
    } finally {
      setSaving(false);
    }
  }, [leadId, currentStatus]);

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <select
        value={status}
        onChange={handleChange}
        disabled={saving}
        style={{
          background: '#1e293b',
          color: '#e2e8f0',
          border: '1px solid rgba(51, 65, 85, 0.6)',
          borderRadius: 8,
          padding: '6px 28px 6px 10px',
          fontSize: 13,
          fontFamily: 'Inter, sans-serif',
          cursor: saving ? 'wait' : 'pointer',
          outline: 'none',
          appearance: 'none',
          WebkitAppearance: 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 8px center',
          opacity: saving ? 0.6 : 1,
          transition: 'border-color 0.2s ease, opacity 0.2s ease',
        }}
        onFocus={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(51, 65, 85, 0.6)'; }}
      >
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* Success checkmark */}
      {showCheck && (
        <span
          style={{
            color: '#22c55e',
            fontSize: 16,
            fontWeight: 700,
            animation: 'fadeInOut 1.5s ease forwards',
          }}
        >
          ✓
        </span>
      )}

      {/* Error indicator */}
      {error && (
        <span
          style={{
            color: '#ef4444',
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          Failed
        </span>
      )}

      <style>{`
        @keyframes fadeInOut {
          0% { opacity: 0; transform: scale(0.5); }
          20% { opacity: 1; transform: scale(1.2); }
          40% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
