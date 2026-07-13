import { createAdminClient } from '@/lib/supabase/admin';
import type { Lead, LeadStatus, IndustryType } from '@/types/database';
import Link from 'next/link';
import StatusQuickUpdate from './status-quick-update';

export const dynamic = 'force-dynamic';

const ITEMS_PER_PAGE = 25;

const INDUSTRY_OPTIONS: { value: IndustryType; label: string }[] = [
  { value: 'construction', label: 'Construction' },
  { value: 'oil_gas', label: 'Oil & Gas' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'data_centre', label: 'Data Centre' },
  { value: 'hospitality', label: 'Hospitality' },
  { value: 'infrastructure', label: 'Infrastructure' },
  { value: 'telecom', label: 'Telecom' },
  { value: 'other', label: 'Other' },
];

const STATUS_OPTIONS: { value: LeadStatus; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'quoted', label: 'Quoted' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
];

function getScoreColor(score: number): string {
  if (score >= 7) return '#22c55e';
  if (score >= 4) return '#f59e0b';
  return '#ef4444';
}

function getStatusBadgeStyle(status: LeadStatus): React.CSSProperties {
  const colors: Record<LeadStatus, { bg: string; text: string }> = {
    new: { bg: 'rgba(59, 130, 246, 0.15)', text: '#60a5fa' },
    contacted: { bg: 'rgba(168, 85, 247, 0.15)', text: '#c084fc' },
    quoted: { bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24' },
    won: { bg: 'rgba(34, 197, 94, 0.15)', text: '#4ade80' },
    lost: { bg: 'rgba(239, 68, 68, 0.15)', text: '#f87171' },
  };
  const c = colors[status];
  return {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 600,
    background: c.bg,
    color: c.text,
    textTransform: 'capitalize',
    letterSpacing: '0.02em',
  };
}

function formatIndustry(industry: string): string {
  return industry.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

interface HistoryPageProps {
  searchParams: Promise<{
    q?: string;
    status?: string;
    industry?: string;
    from_date?: string;
    to_date?: string;
    page?: string;
  }>;
}

export default async function HistoryPage({ searchParams }: HistoryPageProps) {
  const params = await searchParams;
  const supabase = createAdminClient();

  let query = supabase
    .from('leads')
    .select('*, sources(name, type)', { count: 'exact' });

  // Apply search filter
  if (params.q) {
    query = query.or(
      `project_name.ilike.%${params.q}%,buyer_organization.ilike.%${params.q}%`
    );
  }

  // Apply status filter
  if (params.status) {
    query = query.eq('status', params.status);
  }

  // Apply industry filter
  if (params.industry) {
    query = query.eq('industry', params.industry);
  }

  // Apply date range filters
  if (params.from_date) {
    query = query.gte('created_at', params.from_date);
  }
  if (params.to_date) {
    query = query.lte('created_at', params.to_date);
  }

  // Pagination
  const page = Math.max(1, parseInt(params.page || '1'));
  const from = (page - 1) * ITEMS_PER_PAGE;

  const { data: leads, count } = await query
    .order('created_at', { ascending: false })
    .range(from, from + ITEMS_PER_PAGE - 1);

  const totalPages = Math.ceil((count || 0) / ITEMS_PER_PAGE);
  const totalCount = count || 0;

  // Build pagination URL helper
  function buildPageUrl(pageNum: number): string {
    const p = new URLSearchParams();
    if (params.q) p.set('q', params.q);
    if (params.status) p.set('status', params.status);
    if (params.industry) p.set('industry', params.industry);
    if (params.from_date) p.set('from_date', params.from_date);
    if (params.to_date) p.set('to_date', params.to_date);
    p.set('page', String(pageNum));
    return `/history?${p.toString()}`;
  }

  /* ——— Shared inline styles ——— */

  const inputStyle: React.CSSProperties = {
    background: '#1e293b',
    color: '#e2e8f0',
    border: '1px solid rgba(51, 65, 85, 0.6)',
    borderRadius: 8,
    padding: '8px 12px',
    fontSize: 14,
    fontFamily: 'Inter, sans-serif',
    outline: 'none',
    width: '100%',
    transition: 'border-color 0.2s ease',
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    appearance: 'none' as const,
    WebkitAppearance: 'none' as const,
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 10px center',
    paddingRight: 32,
    cursor: 'pointer',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 4,
    display: 'block',
    fontWeight: 500,
  };

  return (
    <>
      {/* ——— Header ——— */}
      <header className="dashboard-header">
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, fontFamily: 'Outfit, sans-serif' }}>
            History
          </h1>
          <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>
            {totalCount.toLocaleString()} past inquir{totalCount !== 1 ? 'ies' : 'y'} found
          </p>
        </div>
      </header>

      <main className="dashboard-content">
        {/* ——— Search & Filter Form ——— */}
        <div
          className="glass-card"
          style={{ padding: 20, marginBottom: 24 }}
        >
          <form action="/history" method="GET">
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 14,
                alignItems: 'end',
              }}
            >
              {/* Search input */}
              <div style={{ gridColumn: 'span 2' }}>
                <label style={labelStyle} htmlFor="history-q">
                  Search
                </label>
                <input
                  id="history-q"
                  type="text"
                  name="q"
                  placeholder="Search by project or buyer..."
                  defaultValue={params.q || ''}
                  style={inputStyle}
                />
              </div>

              {/* Status filter */}
              <div>
                <label style={labelStyle} htmlFor="history-status">
                  Status
                </label>
                <select
                  id="history-status"
                  name="status"
                  defaultValue={params.status || ''}
                  style={selectStyle}
                >
                  <option value="">All Statuses</option>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Industry filter */}
              <div>
                <label style={labelStyle} htmlFor="history-industry">
                  Industry
                </label>
                <select
                  id="history-industry"
                  name="industry"
                  defaultValue={params.industry || ''}
                  style={selectStyle}
                >
                  <option value="">All Industries</option>
                  {INDUSTRY_OPTIONS.map((ind) => (
                    <option key={ind.value} value={ind.value}>
                      {ind.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* From date */}
              <div>
                <label style={labelStyle} htmlFor="history-from">
                  From Date
                </label>
                <input
                  id="history-from"
                  type="date"
                  name="from_date"
                  defaultValue={params.from_date || ''}
                  style={{ ...inputStyle, colorScheme: 'dark' }}
                />
              </div>

              {/* To date */}
              <div>
                <label style={labelStyle} htmlFor="history-to">
                  To Date
                </label>
                <input
                  id="history-to"
                  type="date"
                  name="to_date"
                  defaultValue={params.to_date || ''}
                  style={{ ...inputStyle, colorScheme: 'dark' }}
                />
              </div>

              {/* Submit */}
              <div>
                <button
                  type="submit"
                  style={{
                    width: '100%',
                    padding: '9px 20px',
                    background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 600,
                    fontFamily: 'Inter, sans-serif',
                    cursor: 'pointer',
                    transition: 'opacity 0.2s ease',
                  }}
                >
                  Search
                </button>
              </div>
            </div>

            {/* Active filters summary */}
            {(params.q || params.status || params.industry || params.from_date || params.to_date) && (
              <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, color: '#64748b' }}>Active filters:</span>
                {params.q && (
                  <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 999, background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>
                    &quot;{params.q}&quot;
                  </span>
                )}
                {params.status && (
                  <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 999, background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', textTransform: 'capitalize' }}>
                    {params.status}
                  </span>
                )}
                {params.industry && (
                  <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 999, background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80' }}>
                    {formatIndustry(params.industry)}
                  </span>
                )}
                {params.from_date && (
                  <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 999, background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
                    From {params.from_date}
                  </span>
                )}
                {params.to_date && (
                  <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 999, background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
                    To {params.to_date}
                  </span>
                )}
                <Link
                  href="/history"
                  style={{ fontSize: 12, color: '#ef4444', textDecoration: 'none', marginLeft: 4 }}
                >
                  Clear all ✕
                </Link>
              </div>
            )}
          </form>
        </div>

        {/* ——— Results ——— */}
        {leads && leads.length > 0 ? (
          <>
            {/* Desktop table */}
            <div
              className="glass-card"
              style={{ padding: 0, overflow: 'hidden', marginBottom: 24 }}
            >
              <div style={{ overflowX: 'auto' }}>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: 14,
                    fontFamily: 'Inter, sans-serif',
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        borderBottom: '1px solid rgba(51, 65, 85, 0.5)',
                        textAlign: 'left',
                      }}
                    >
                      <th style={{ padding: '14px 16px', color: '#94a3b8', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Date
                      </th>
                      <th style={{ padding: '14px 16px', color: '#94a3b8', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Project
                      </th>
                      <th style={{ padding: '14px 16px', color: '#94a3b8', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Industry
                      </th>
                      <th style={{ padding: '14px 16px', color: '#94a3b8', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>
                        Score
                      </th>
                      <th style={{ padding: '14px 16px', color: '#94a3b8', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Status
                      </th>
                      <th style={{ padding: '14px 16px', color: '#94a3b8', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(leads as Lead[]).map((lead, idx) => (
                      <tr
                        key={lead.id}
                        className="history-row"
                        style={{
                          borderBottom:
                            idx < leads.length - 1
                              ? '1px solid rgba(51, 65, 85, 0.3)'
                              : 'none',
                        }}
                      >
                        {/* Date */}
                        <td style={{ padding: '12px 16px', color: '#94a3b8', fontSize: 13, whiteSpace: 'nowrap' }}>
                          {new Date(lead.created_at).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>

                        {/* Project */}
                        <td style={{ padding: '12px 16px' }}>
                          <Link
                            href={`/leads/${lead.id}`}
                            className="history-project-link"
                            style={{
                              color: '#e2e8f0',
                              textDecoration: 'none',
                              fontWeight: 500,
                            }}
                          >
                            {lead.project_name}
                          </Link>
                          {lead.buyer_organization && (
                            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                              {lead.buyer_organization}
                            </div>
                          )}
                        </td>

                        {/* Industry */}
                        <td style={{ padding: '12px 16px', color: '#cbd5e1', fontSize: 13 }}>
                          {formatIndustry(lead.industry)}
                        </td>

                        {/* Score */}
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: 32,
                              height: 32,
                              borderRadius: '50%',
                              background: `${getScoreColor(lead.relevance_score)}18`,
                              color: getScoreColor(lead.relevance_score),
                              fontWeight: 700,
                              fontSize: 14,
                            }}
                          >
                            {lead.relevance_score}
                          </span>
                        </td>

                        {/* Status */}
                        <td style={{ padding: '12px 16px' }}>
                          <span style={getStatusBadgeStyle(lead.status)}>
                            {lead.status}
                          </span>
                        </td>

                        {/* Quick Update */}
                        <td style={{ padding: '12px 16px' }}>
                          <StatusQuickUpdate
                            leadId={lead.id}
                            currentStatus={lead.status}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile cards (hidden on desktop via CSS-in-JS media query workaround) */}
            <div className="history-mobile-cards" style={{ display: 'none', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
              {(leads as Lead[]).map((lead) => (
                <div
                  key={lead.id}
                  className="glass-card"
                  style={{ padding: 16 }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div>
                      <Link
                        href={`/leads/${lead.id}`}
                        style={{ color: '#e2e8f0', textDecoration: 'none', fontWeight: 600, fontSize: 15 }}
                      >
                        {lead.project_name}
                      </Link>
                      {lead.buyer_organization && (
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                          {lead.buyer_organization}
                        </div>
                      )}
                    </div>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 30,
                        height: 30,
                        borderRadius: '50%',
                        background: `${getScoreColor(lead.relevance_score)}18`,
                        color: getScoreColor(lead.relevance_score),
                        fontWeight: 700,
                        fontSize: 13,
                        flexShrink: 0,
                      }}
                    >
                      {lead.relevance_score}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>
                      {new Date(lead.created_at).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                    <span style={{ color: 'rgba(51, 65, 85, 0.6)' }}>·</span>
                    <span style={{ fontSize: 12, color: '#cbd5e1' }}>
                      {formatIndustry(lead.industry)}
                    </span>
                    <span style={{ color: 'rgba(51, 65, 85, 0.6)' }}>·</span>
                    <span style={getStatusBadgeStyle(lead.status)}>
                      {lead.status}
                    </span>
                  </div>

                  <StatusQuickUpdate leadId={lead.id} currentStatus={lead.status} />
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="glass-card" style={{ padding: 48, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🔍</div>
            <h3 style={{ fontSize: 18, fontWeight: 600, color: '#f1f5f9', margin: '0 0 8px', fontFamily: 'Outfit, sans-serif' }}>
              No leads found
            </h3>
            <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>
              {params.q || params.status || params.industry || params.from_date || params.to_date
                ? 'Try adjusting your search filters to find more results.'
                : 'There are no leads in the system yet.'}
            </p>
          </div>
        )}

        {/* ——— Pagination ——— */}
        {totalPages > 1 && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 6,
              flexWrap: 'wrap',
            }}
          >
            {/* Previous button */}
            {page > 1 && (
              <Link
                href={buildPageUrl(page - 1)}
                style={{
                  padding: '8px 14px',
                  background: 'rgba(30, 41, 59, 0.6)',
                  border: '1px solid rgba(51, 65, 85, 0.5)',
                  borderRadius: 8,
                  color: '#e2e8f0',
                  textDecoration: 'none',
                  fontSize: 13,
                  fontWeight: 500,
                  transition: 'background 0.15s ease',
                }}
              >
                ← Prev
              </Link>
            )}

            {/* Page numbers */}
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => {
                // Show first, last, current, and pages around current
                if (p === 1 || p === totalPages) return true;
                if (Math.abs(p - page) <= 2) return true;
                return false;
              })
              .reduce<(number | 'ellipsis')[]>((acc, p, idx, arr) => {
                if (idx > 0) {
                  const prev = arr[idx - 1];
                  if (p - prev > 1) {
                    acc.push('ellipsis');
                  }
                }
                acc.push(p);
                return acc;
              }, [])
              .map((item, idx) =>
                item === 'ellipsis' ? (
                  <span
                    key={`ellipsis-${idx}`}
                    style={{ padding: '8px 4px', color: '#64748b', fontSize: 13 }}
                  >
                    …
                  </span>
                ) : (
                  <Link
                    key={item}
                    href={buildPageUrl(item)}
                    style={{
                      padding: '8px 14px',
                      background:
                        item === page
                          ? 'linear-gradient(135deg, #3b82f6, #06b6d4)'
                          : 'rgba(30, 41, 59, 0.6)',
                      border:
                        item === page
                          ? '1px solid transparent'
                          : '1px solid rgba(51, 65, 85, 0.5)',
                      borderRadius: 8,
                      color: item === page ? '#fff' : '#e2e8f0',
                      textDecoration: 'none',
                      fontSize: 13,
                      fontWeight: item === page ? 700 : 500,
                      minWidth: 40,
                      textAlign: 'center',
                      display: 'inline-block',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    {item}
                  </Link>
                )
              )}

            {/* Next button */}
            {page < totalPages && (
              <Link
                href={buildPageUrl(page + 1)}
                style={{
                  padding: '8px 14px',
                  background: 'rgba(30, 41, 59, 0.6)',
                  border: '1px solid rgba(51, 65, 85, 0.5)',
                  borderRadius: 8,
                  color: '#e2e8f0',
                  textDecoration: 'none',
                  fontSize: 13,
                  fontWeight: 500,
                  transition: 'background 0.15s ease',
                }}
              >
                Next →
              </Link>
            )}
          </div>
        )}

        {/* Show current range info */}
        {totalCount > 0 && (
          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <span style={{ fontSize: 12, color: '#64748b' }}>
              Showing {from + 1}–{Math.min(from + ITEMS_PER_PAGE, totalCount)} of {totalCount.toLocaleString()}
            </span>
          </div>
        )}
      </main>

      {/* Responsive styles: hide desktop table on mobile, show mobile cards */}
      <style>{`
        @media (max-width: 768px) {
          .glass-card table {
            display: none !important;
          }
          .history-mobile-cards {
            display: flex !important;
          }
          form [style*="grid-column: span 2"] {
            grid-column: span 1 !important;
          }
        }
        @media (min-width: 769px) {
          .history-mobile-cards {
            display: none !important;
          }
        }
        .history-row {
          transition: background 0.15s ease;
        }
        .history-row:hover {
          background: rgba(30, 41, 59, 0.4);
        }
        .history-project-link:hover {
          color: #60a5fa !important;
        }
      `}</style>
    </>
  );
}
