import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { runScrape } from '@/lib/pipeline/run-scrape';

/**
 * POST /api/scrape
 * Manual scrape trigger from dashboard "Scrape Now" button.
 * Authenticated via session cookie (same as middleware).
 */
export const maxDuration = 60; // Allow up to 60s for Vercel serverless execution

export async function POST() {
  // Verify session
  const cookieStore = await cookies();
  const session = cookieStore.get('session_token');

  if (!session || session.value !== process.env.SESSION_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runScrape('manual');
    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[ManualScrape] Pipeline error:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
