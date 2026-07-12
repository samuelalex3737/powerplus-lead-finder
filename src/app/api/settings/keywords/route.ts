import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const { keyword } = await request.json();
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('keywords')
      .insert({ keyword, enabled: true })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ keyword: data });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const supabase = createAdminClient();

    if (id) {
      const { error } = await supabase.from('keywords').delete().eq('id', id);
      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
