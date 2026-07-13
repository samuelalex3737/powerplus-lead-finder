import { createAdminClient } from '@/lib/supabase/admin';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface ScrapeRun {
  id: string;
  started_at: string;
  duration_ms: number;
  sources_ran: string[];
  items_per_source: Record<string, number>;
  total_scraped: number;
  total_extracted: number;
  total_inserted: number;
  total_notified: number;
  errors: string[];
  trigger_type: 'manual' | 'cron';
}

function formatTimestamp(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  const date = d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const time = d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
  return { date, time };
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function getCardBorderColor(run: ScrapeRun): string {
  if (run.errors && run.errors.length > 0 && run.total_scraped === 0) {
    return '#ef4444'; // red — errors only
  }
  if (run.total_inserted > 0) {
    return '#10b981'; // green — has inserts
  }
  if (run.total_scraped > 0) {
    return '#f59e0b'; // amber — scraped but no inserts
  }
  return 'rgba(51, 65, 85, 0.4)'; // default
}

export default async function ScrapeLogPage() {
  const supabase = createAdminClient();

  let runs: ScrapeRun[] = [];
  let tableError = false;

  try {
    const { data, error } = await supabase
      .from('scrape_runs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(20);

    if (error) {
      // Check for "relation does not exist" (table not created yet)
      if (
        error.message.includes('does not exist') ||
        error.code === '42P01'
      ) {
        tableError = true;
      } else {
        throw error;
      }
    } else {
      runs = (data as ScrapeRun[]) || [];
    }
  } catch {
    tableError = true;
  }

  return (
    <>
      <header className="dashboard-header">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            maxWidth: 1200,
            margin: '0 auto',
          }}
        >
          <div>
            <h1
              style={{
                fontSize: 20,
                fontWeight: 700,
                margin: 0,
                fontFamily: 'Outfit, sans-serif',
              }}
            >
              Scrape Log
            </h1>
            <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>
              Last 20 pipeline runs
            </p>
          </div>
          <Link href="/" className="btn-ghost">
            ← Dashboard
          </Link>
        </div>
      </header>

      <main className="dashboard-content">
        {tableError ? (
          <div className="empty-state">
            <div className="empty-state-icon">🗄️</div>
            <h3>Scrape log table not found</h3>
            <p>
              The <code style={{ color: '#60a5fa' }}>scrape_runs</code> table
              hasn&apos;t been created yet. Run the database migration to set it
              up, then trigger your first scrape.
            </p>
          </div>
        ) : runs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <h3>No scrape runs logged yet</h3>
            <p>
              Click &quot;Scrape Now&quot; on the Dashboard to trigger your first
              run.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {runs.map((run, index) => {
              const borderColor = getCardBorderColor(run);
              const { date, time } = formatTimestamp(run.started_at);
              const hasErrors = run.errors && run.errors.length > 0;
              const itemsPerSource: Record<string, number> =
                typeof run.items_per_source === 'object' &&
                run.items_per_source !== null
                  ? run.items_per_source
                  : {};

              return (
                <div
                  key={run.id}
                  className="glass-card"
                  style={{
                    borderLeft: `4px solid ${borderColor}`,
                    animation: `fadeInUp 0.4s ease-out ${index * 0.04}s both`,
                  }}
                >
                  <div style={{ padding: '18px 22px' }}>
                    {/* Top Row: Timestamp + Trigger Badge + Duration */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 10,
                        marginBottom: 14,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          flexWrap: 'wrap',
                        }}
                      >
                        {/* Timestamp */}
                        <div>
                          <span
                            style={{
                              fontSize: 15,
                              fontWeight: 600,
                              color: '#f1f5f9',
                              fontFamily: 'Outfit, sans-serif',
                            }}
                          >
                            {date}
                          </span>
                          <span
                            style={{
                              fontSize: 13,
                              color: '#94a3b8',
                              marginLeft: 8,
                            }}
                          >
                            {time}
                          </span>
                        </div>

                        {/* Trigger Badge */}
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '3px 10px',
                            borderRadius: 100,
                            fontSize: 11,
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '0.03em',
                            background:
                              run.trigger_type === 'manual'
                                ? 'rgba(59, 130, 246, 0.15)'
                                : 'rgba(139, 92, 246, 0.15)',
                            color:
                              run.trigger_type === 'manual'
                                ? '#60a5fa'
                                : '#a78bfa',
                            border: `1px solid ${
                              run.trigger_type === 'manual'
                                ? 'rgba(59, 130, 246, 0.25)'
                                : 'rgba(139, 92, 246, 0.25)'
                            }`,
                          }}
                        >
                          {run.trigger_type === 'manual' ? 'Manual' : 'Cron'}
                        </span>
                      </div>

                      {/* Duration */}
                      <span
                        style={{
                          fontSize: 13,
                          color: '#94a3b8',
                          fontWeight: 500,
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        ⏱ {formatDuration(run.duration_ms)}
                      </span>
                    </div>

                    {/* Per-Source Breakdown */}
                    {Object.keys(itemsPerSource).length > 0 && (
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 8,
                          marginBottom: 14,
                        }}
                      >
                        {Object.entries(itemsPerSource).map(
                          ([source, count]) => (
                            <span
                              key={source}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '4px 12px',
                                background: 'rgba(30, 41, 59, 0.7)',
                                border: '1px solid rgba(51, 65, 85, 0.5)',
                                borderRadius: 8,
                                fontSize: 12,
                                color: '#cbd5e1',
                              }}
                            >
                              <span style={{ color: '#94a3b8' }}>
                                {source}
                              </span>
                              <span
                                style={{
                                  fontWeight: 700,
                                  color: '#f1f5f9',
                                  fontVariantNumeric: 'tabular-nums',
                                }}
                              >
                                {count}
                              </span>
                            </span>
                          )
                        )}
                      </div>
                    )}

                    {/* Summary Line */}
                    <div
                      style={{
                        fontSize: 14,
                        color: '#cbd5e1',
                        display: 'flex',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 6,
                      }}
                    >
                      <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                        <strong style={{ color: '#f1f5f9' }}>
                          {run.total_scraped}
                        </strong>{' '}
                        scraped
                      </span>
                      <span style={{ color: '#475569' }}>→</span>
                      <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                        <strong style={{ color: '#f1f5f9' }}>
                          {run.total_extracted}
                        </strong>{' '}
                        extracted
                      </span>
                      <span style={{ color: '#475569' }}>→</span>
                      <span
                        style={{
                          fontVariantNumeric: 'tabular-nums',
                          color: '#10b981',
                        }}
                      >
                        <strong>{run.total_inserted}</strong> inserted
                      </span>

                      {run.total_notified > 0 && (
                        <span
                          style={{
                            marginLeft: 8,
                            fontSize: 13,
                            color: '#60a5fa',
                          }}
                        >
                          📧 {run.total_notified} email
                          {run.total_notified !== 1 ? 's' : ''} sent
                        </span>
                      )}
                    </div>

                    {/* Errors Section */}
                    {hasErrors && (
                      <details
                        style={{
                          marginTop: 14,
                          background: 'rgba(239, 68, 68, 0.06)',
                          border: '1px solid rgba(239, 68, 68, 0.2)',
                          borderRadius: 10,
                          overflow: 'hidden',
                        }}
                      >
                        <summary
                          style={{
                            padding: '10px 14px',
                            fontSize: 13,
                            fontWeight: 600,
                            color: '#f87171',
                            cursor: 'pointer',
                            userSelect: 'none',
                            listStyle: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                          }}
                        >
                          <span
                            style={{
                              display: 'inline-block',
                              transition: 'transform 0.2s',
                            }}
                          >
                            ▶
                          </span>
                          ⚠ {run.errors.length} error
                          {run.errors.length !== 1 ? 's' : ''}
                        </summary>
                        <div
                          style={{
                            padding: '0 14px 12px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 6,
                          }}
                        >
                          {run.errors.map((err, i) => (
                            <div
                              key={i}
                              style={{
                                padding: '8px 12px',
                                background: 'rgba(239, 68, 68, 0.08)',
                                borderRadius: 6,
                                fontSize: 12,
                                color: '#fca5a5',
                                fontFamily:
                                  'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
                                lineHeight: 1.5,
                                wordBreak: 'break-word',
                              }}
                            >
                              {err}
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
