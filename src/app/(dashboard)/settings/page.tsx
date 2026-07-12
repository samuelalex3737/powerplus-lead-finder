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
            Toggle which platforms the scraper should monitor.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {sources?.map((source) => (
              <div key={source.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'rgba(30, 41, 59, 0.4)', borderRadius: 12, border: '1px solid rgba(51, 65, 85, 0.4)' }}>
                <div>
                  <div style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: 4 }}>{source.name}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>
                    {source.type.replace('_', ' ')} · Last checked: {source.last_checked_at ? new Date(source.last_checked_at).toLocaleString() : 'Never'}
                  </div>
                </div>
                <SourceToggle sourceId={source.id} initialEnabled={source.enabled} />
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
          </p>
          <KeywordManager initialKeywords={keywords || []} />
        </div>
      </main>
    </>
  );
}
