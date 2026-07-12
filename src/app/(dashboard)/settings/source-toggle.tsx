'use client';

import { useState } from 'react';

export default function SourceToggle({ sourceId, initialEnabled }: { sourceId: string, initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);

  const toggle = async () => {
    const newState = !enabled;
    setEnabled(newState);

    await fetch('/api/settings/sources', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: sourceId, enabled: newState })
    });
  };

  return (
    <div
      className={`toggle-switch ${enabled ? 'active' : ''}`}
      onClick={toggle}
      role="switch"
      aria-checked={enabled}
    />
  );
}
