'use client';

import { useState, type FC } from 'react';

const ScrapeButton: FC = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ inserted: number; errors: string[] } | null>(null);

  const handleScrape = async () => {
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch('/api/scrape', { method: 'POST' });
      const data = await res.json();

      if (data.success) {
        setResult({ inserted: data.inserted, errors: data.errors || [] });
        // Reload page after a brief delay to show new leads
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setResult({ inserted: 0, errors: [data.error || 'Scrape failed'] });
      }
    } catch {
      setResult({ inserted: 0, errors: ['Network error'] });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={handleScrape} disabled={loading} className="scrape-btn">
        {loading ? (
          <>
            <span className="spinner" />
            Scraping...
          </>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M1 8a7 7 0 0114 0A7 7 0 011 8z" />
              <path d="M8 4v4l3 2" />
            </svg>
            Scrape Now
          </>
        )}
      </button>

      {result && (
        <div style={{ marginTop: 8, fontSize: 12 }}>
          {result.inserted > 0 ? (
            <span style={{ color: '#34d399' }}>✓ {result.inserted} new leads found</span>
          ) : result.errors.length > 0 ? (
            <span style={{ color: '#f87171' }}>⚠ {result.errors[0]}</span>
          ) : (
            <span style={{ color: '#94a3b8' }}>No new leads found</span>
          )}
        </div>
      )}
    </div>
  );
};

export default ScrapeButton;
