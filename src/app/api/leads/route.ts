import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { LeadStatus, IndustryType } from '@/types/database';

/**
 * GET /api/leads
 * Fetch leads with optional filters and pagination.
 * Query params: status, industry, emirate, minRelevance, page, limit, sort
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const status = searchParams.get('status') as LeadStatus | null;
  const industry = searchParams.get('industry') as IndustryType | null;
  const emirate = searchParams.get('emirate');
  const minRelevance = parseInt(searchParams.get('minRelevance') || '0');
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')));
  const sort = searchParams.get('sort') || 'created_at';
  const order = searchParams.get('order') || 'desc';

  const supabase = createAdminClient();

  let query = supabase
    .from('leads')
    .select('*, sources(name, type)', { count: 'exact' });

  // Apply filters
  if (status) query = query.eq('status', status);
  if (industry) query = query.eq('industry', industry);
  if (emirate) query = query.eq('location_emirate', emirate);
  if (minRelevance > 0) query = query.gte('relevance_score', minRelevance);

  // Pagination
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, error, count } = await query
    .order(sort, { ascending: order === 'asc' })
    .range(from, to);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    leads: data,
    total: count,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  });
}
