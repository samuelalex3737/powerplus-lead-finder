import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { LeadInsert } from '@/types/database';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const supabase = createAdminClient();

    // Find 'manual' source
    const { data: source } = await supabase
      .from('sources')
      .select('id')
      .eq('type', 'manual')
      .single();

    const insertData: LeadInsert = {
      project_name: data.project_name,
      buyer_organization: data.buyer_organization || null,
      location_emirate: data.location_emirate || null,
      industry: data.industry || 'other',
      estimated_kva_range: data.estimated_kva_range || null,
      deadline_date: data.deadline_date || null,
      source_url: data.source_url || null,
      contact_info: data.contact_info || null,
      summary: data.summary || null,
      source_id: source?.id || null,
      relevance_score: 10, // Manual leads are highly relevant
      status: 'new',
    };

    const { error } = await supabase.from('leads').insert(insertData);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Manual insert error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
