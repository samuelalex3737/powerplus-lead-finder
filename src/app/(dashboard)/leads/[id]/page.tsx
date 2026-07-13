import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { INDUSTRY_LABELS } from '@/types/database';
import StatusUpdater from './status-updater';
import ScoreBadge from '@/components/score-badge';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface LeadPageProps {
  params: Promise<{ id: string }>;
}

export default async function LeadDetailPage({ params }: LeadPageProps) {
  const resolvedParams = await params;
  const supabase = createAdminClient();

  const { data: lead } = await supabase
    .from('leads')
    .select('*, sources(*)')
    .eq('id', resolvedParams.id)
    .single();

  if (!lead) {
    notFound();
  }

  return (
    <>
      <header className="dashboard-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 1200, margin: '0 auto' }}>
          <div>
            <Link href="/" className="btn-ghost" style={{ padding: '4px 8px', marginBottom: 8, display: 'inline-block' }}>
              ← Back to Leads
            </Link>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, fontFamily: 'Outfit, sans-serif' }}>Lead Details</h1>
          </div>
        </div>
      </header>

      <main className="dashboard-content">
        <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
          {lead.explicit_mention === false && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', borderLeft: '4px solid #ef4444', padding: '12px 16px', borderRadius: '0 8px 8px 0', marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 4px', fontSize: 14, color: '#ef4444', fontWeight: 700 }}>⚠️ Background Context Only</h3>
              <p style={{ margin: 0, fontSize: 13, color: '#fca5a5' }}>
                This article was flagged by the system because it matched industry keywords (like infrastructure or expansion), but it <strong>does not explicitly mention</strong> generators, backup power, or power equipment. Ensure you verify the lead manually.
              </p>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20 }}>
            <div>
              <h2 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 8px', color: '#f1f5f9' }}>
                {lead.project_name}
              </h2>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span className="tag tag-industry">{INDUSTRY_LABELS[lead.industry as keyof typeof INDUSTRY_LABELS]}</span>
                {lead.estimated_kva_range && (
                  <span className="tag tag-kva">⚡ {lead.estimated_kva_range}</span>
                )}
              </div>
            </div>
            <ScoreBadge score={lead.relevance_score} />
          </div>

          <div style={{ margin: '24px 0', borderTop: '1px solid rgba(51, 65, 85, 0.5)' }} />

          <div className="detail-grid">
            <div className="detail-item">
              <div className="detail-item-label">Status</div>
              <div className="detail-item-value">
                <StatusUpdater leadId={lead.id} currentStatus={lead.status} />
              </div>
            </div>

            <div className="detail-item">
              <div className="detail-item-label">Buyer Organization</div>
              <div className="detail-item-value">{lead.buyer_organization || 'Not specified'}</div>
            </div>

            <div className="detail-item">
              <div className="detail-item-label">Location</div>
              <div className="detail-item-value">{lead.location_emirate || 'UAE'}</div>
            </div>

            <div className="detail-item">
              <div className="detail-item-label">Deadline</div>
              <div className="detail-item-value">
                {lead.deadline_date ? new Date(lead.deadline_date).toLocaleDateString() : 'No deadline specified'}
              </div>
            </div>

            <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
              <div className="detail-item-label">Contact Information</div>
              <div className="detail-item-value">
                {lead.contact_info ? (
                  <div style={{ whiteSpace: 'pre-wrap', background: 'rgba(30, 41, 59, 0.5)', padding: 12, borderRadius: 8, fontSize: 14 }}>
                    {lead.contact_info}
                  </div>
                ) : (
                  'No contact info extracted.'
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 16px', color: '#f1f5f9' }}>AI Analysis</h3>

          <div style={{ marginBottom: 20 }}>
            <div className="detail-item-label">Summary</div>
            <p style={{ color: '#e2e8f0', lineHeight: 1.6, margin: 0, fontSize: 15 }}>
              {lead.summary || 'No summary available.'}
            </p>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div className="detail-item-label">Source Info</div>
            <div style={{ color: '#cbd5e1', fontSize: 14 }}>
              Found via {(lead as { sources?: { name: string } }).sources?.name || 'Manual Entry'} on {new Date(lead.created_at).toLocaleString()}
              {lead.source_url && (
                <div style={{ marginTop: 8 }}>
                  <a href={lead.source_url} target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa', textDecoration: 'none' }}>
                    View Original Listing ↗
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
