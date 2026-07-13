'use client';

import { useState, type FC } from 'react';

interface SourceResult {
  sourceName: string;
  itemCount: number;
  errors: string[];
  isPlaceholder: boolean;
}

interface ScrapeResult {
  success: boolean;
  scraped: number;
  extracted: number;
  inserted: number;
  notified: number;
  errors: string[];
  sourceResults: SourceResult[];
  duration_ms: number;
  error?: string;
}

const ScrapeButton: FC = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScrapeResult | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const handleScrape = async () => {
    setLoading(true);
    setResult(null);
    setShowDetails(false);

    try {
      const res = await fetch('/api/scrape', { method: 'POST' });
      const data = await res.json();
      setResult(data);

      // Reload page after a delay if we got new leads
      if (data.success && data.inserted > 0) {
        setTimeout(() => window.location.reload(), 2500);
      }
    } catch {
      setResult({
        success: false,
        scraped: 0, extracted: 0, inserted: 0, notified: 0,
        errors: ['Network error — check your connection'],
        sourceResults: [],
        duration_ms: 0,
        error: 'Network error',
      });
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
        <div style={{ marginTop: 12, fontSize: 13 }}>
          {/* Summary line */}
          {result.success ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {result.inserted > 0 ? (
                <span style={{ color: '#34d399', fontWeight: 600 }}>
                  ✓ {result.inserted} new lead{result.inserted !== 1 ? 's' : ''} found
                </span>
              ) : result.scraped > 0 ? (
                <span style={{ color: '#94a3b8' }}>
                  Scraped {result.scraped} items — no new leads (all duplicates or filtered)
                </span>
              ) : (
                <span style={{ color: '#94a3b8' }}>
                  No items found from active sources
                </span>
              )}
            </div>
          ) : (
            <span style={{ color: '#f87171', fontWeight: 600 }}>
              ⚠ {result.error || 'Pipeline failed'}
            </span>
          )}

          {/* Duration */}
          {result.duration_ms > 0 && (
            <div style={{ color: '#64748b', fontSize: 11, marginTop: 4 }}>
              Completed in {(result.duration_ms / 1000).toFixed(1)}s
            </div>
          )}

          {/* Per-source breakdown toggle */}
          {result.sourceResults && result.sourceResults.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <button
                onClick={() => setShowDetails(!showDetails)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#3b82f6', fontSize: 12, padding: 0,
                  textDecoration: 'underline',
                }}
              >
                {showDetails ? 'Hide details' : 'Show source details'}
              </button>

              {showDetails && (
                <div style={{
                  marginTop: 8, padding: 12,
                  background: 'rgba(15, 23, 42, 0.6)',
                  borderRadius: 8, border: '1px solid rgba(51, 65, 85, 0.4)',
                }}>
                  {result.sourceResults
                    .filter((sr) => !sr.isPlaceholder)
                    .map((sr) => (
                    <div key={sr.sourceName} style={{
                      display: 'flex', justifyContent: 'space-between',
                      alignItems: 'center', padding: '4px 0',
                      borderBottom: '1px solid rgba(51, 65, 85, 0.3)',
                    }}>
                      <span style={{ color: '#e2e8f0', fontSize: 12 }}>{sr.sourceName}</span>
                      {sr.errors.length > 0 ? (
                        <span style={{ color: '#f87171', fontSize: 11 }}>
                          ✗ {sr.errors[0].slice(0, 50)}
                        </span>
                      ) : (
                        <span style={{ color: '#34d399', fontSize: 11 }}>
                          {sr.itemCount} item{sr.itemCount !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  ))}

                  {/* Show errors */}
                  {result.errors.length > 0 && (
                    <div style={{ marginTop: 8, padding: 8, background: 'rgba(239, 68, 68, 0.1)', borderRadius: 6 }}>
                      <div style={{ color: '#f87171', fontSize: 11, fontWeight: 600, marginBottom: 4 }}>
                        Warnings:
                      </div>
                      {result.errors.map((err, i) => (
                        <div key={i} style={{ color: '#fca5a5', fontSize: 11, marginBottom: 2 }}>
                          • {err}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ScrapeButton;
