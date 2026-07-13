import { createAdminClient } from '@/lib/supabase/admin';
import SourceToggle from './source-toggle';
import KeywordManager from './keyword-manager';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const supabase = createAdminClient();

  const { data: sources } = await supabase.from('sources').select('*').order('name');
  const { data: keywords } = await supabase.from('keywords').select('*').order('keyword');

  return (
    <>
      <header className="dashboard-header">
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, fontFamily: 'Outfit, sans-serif' }}>Settings</h1>
        </div>
      </header>

      <main className="dashboard-content">
        <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 16px', color: '#f1f5f9' }}>
            Data Sources
          </h2>
          <p style={{ fontSize: 14, color: '#94a3b8', marginBottom: 20 }}>
            Toggle which platforms the scraper should monitor. Disabled sources show the reason they cannot be activated yet.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {sources?.map((source) => (
              <div key={source.id} style={{
                padding: '16px',
                background: source.enabled
                  ? 'rgba(30, 41, 59, 0.4)'
                  : 'rgba(15, 23, 42, 0.3)',
                borderRadius: 12,
                border: source.enabled
                  ? '1px solid rgba(59, 130, 246, 0.3)'
                  : '1px solid rgba(51, 65, 85, 0.3)',
                opacity: source.enabled ? 1 : 0.7,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: 4 }}>
                      {source.name}
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>
                      {source.type.replace('_', ' ')} · Last checked: {source.last_checked_at ? new Date(source.last_checked_at).toLocaleString() : 'Never'}
                    </div>
                  </div>
                  <SourceToggle sourceId={source.id} initialEnabled={source.enabled} />
                </div>

                {/* Show notes for sources that have them (explains why they're disabled) */}
                {source.notes && (
                  <div style={{
                    marginTop: 10,
                    padding: '8px 12px',
                    background: source.enabled
                      ? 'rgba(59, 130, 246, 0.08)'
                      : 'rgba(245, 158, 11, 0.08)',
                    borderRadius: 8,
                    fontSize: 12,
                    color: source.enabled ? '#93c5fd' : '#fbbf24',
                    lineHeight: 1.5,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 6,
                  }}>
                    <span style={{ flexShrink: 0 }}>{source.enabled ? 'ℹ️' : '⚠️'}</span>
                    <span>{source.notes}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 16px', color: '#f1f5f9' }}>
            Target Keywords
          </h2>
          <p style={{ fontSize: 14, color: '#94a3b8', marginBottom: 20 }}>
            These keywords guide the AI when scraping large classifieds/news sites.
            The scraper also has built-in keywords for common generator demand signals.
          </p>
          <KeywordManager initialKeywords={keywords || []} />
        </div>
      </main>
    </>
  );
}
