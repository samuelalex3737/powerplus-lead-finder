import { createAdminClient } from '@/lib/supabase/admin';
import type { Lead } from '@/types/database';
import LeadCard from '@/components/lead-card';
import FilterBar from '@/components/filter-bar';
import ScrapeButton from '@/components/scrape-button';

export const dynamic = 'force-dynamic';

interface DashboardProps {
  searchParams: Promise<{
    filter?: string;
    industry?: string;
    emirate?: string;
    page?: string;
  }>;
}

export default async function DashboardPage({ searchParams }: DashboardProps) {
  const params = await searchParams;
  const supabase = createAdminClient();

  let query = supabase
    .from('leads')
    .select('*, sources(name, type)', { count: 'exact' });

  // Apply filters
  if (params.filter === 'high') {
    query = query.gte('relevance_score', 7);
  }
  if (params.industry) {
    query = query.eq('industry', params.industry);
  }
  if (params.emirate) {
    query = query.eq('location_emirate', params.emirate);
  }

  const page = Math.max(1, parseInt(params.page || '1'));
  const limit = 20;
  const from = (page - 1) * limit;

  const { data: leads, count } = await query
    .order('created_at', { ascending: false })
    .range(from, from + limit - 1);

  const totalPages = Math.ceil((count || 0) / limit);

  return (
    <>
      <header className="dashboard-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 1200, margin: '0 auto' }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, fontFamily: 'Outfit, sans-serif' }}>Dashboard</h1>
            <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>
              {count || 0} lead{count !== 1 ? 's' : ''} tracked
            </p>
          </div>
          <ScrapeButton />
        </div>
      </header>

      <main className="dashboard-content">
        <FilterBar />

        {leads && leads.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {(leads as Lead[]).map((lead) => (
              <LeadCard key={lead.id} lead={lead} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">📡</div>
            <h3>No leads yet</h3>
            <p>Click &quot;Scrape Now&quot; to search for generator opportunities, or add a lead manually.</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24 }}>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <a
                key={p}
                href={`?${new URLSearchParams({ ...params, page: String(p) }).toString()}`}
                className={`filter-chip ${p === page ? 'active' : ''}`}
                style={{ minWidth: 36, textAlign: 'center' }}
              >
                {p}
              </a>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
