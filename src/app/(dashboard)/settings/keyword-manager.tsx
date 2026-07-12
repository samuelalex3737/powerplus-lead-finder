'use client';

import { useState } from 'react';

export default function KeywordManager({ initialKeywords }: { initialKeywords: { id: string, keyword: string }[] }) {
  const [keywords, setKeywords] = useState(initialKeywords);
  const [newKeyword, setNewKeyword] = useState('');
  const [loading, setLoading] = useState(false);

  const addKeyword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyword.trim()) return;

    setLoading(true);
    const res = await fetch('/api/settings/keywords', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword: newKeyword.trim() })
    });

    if (res.ok) {
      const added = await res.json();
      setKeywords([...keywords, added.keyword]);
      setNewKeyword('');
    }
    setLoading(false);
  };

  const deleteKeyword = async (id: string) => {
    setKeywords(keywords.filter(k => k.id !== id));
    await fetch(`/api/settings/keywords?id=${id}`, { method: 'DELETE' });
  };

  return (
    <div>
      <form onSubmit={addKeyword} style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <input
          type="text"
          value={newKeyword}
          onChange={(e) => setNewKeyword(e.target.value)}
          placeholder="e.g. diesel generator, cummins 500kva"
          className="form-input"
          disabled={loading}
        />
        <button type="submit" className="btn-primary" disabled={loading || !newKeyword.trim()}>
          Add
        </button>
      </form>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        {keywords.map(kw => (
          <div key={kw.id} style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px',
            background: 'rgba(30, 41, 59, 0.8)', border: '1px solid #334155', borderRadius: 8,
            fontSize: 13, color: '#e2e8f0'
          }}>
            {kw.keyword}
            <button
              onClick={() => deleteKeyword(kw.id)}
              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 2 }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
