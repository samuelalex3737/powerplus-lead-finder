import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function PATCH(request: Request) {
  try {
    const { id, enabled } = await request.json();
    const supabase = createAdminClient();

    const { error } = await supabase
      .from('sources')
      .update({ enabled })
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
