import { NextResponse } from 'next/server';
import { runScrape } from '@/lib/pipeline/run-scrape';

/**
 * GET /api/cron/scrape
 * Vercel Cron Job endpoint — runs the full scrape pipeline.
 * Authenticated via CRON_SECRET (sent by Vercel as Authorization: Bearer <secret>).
 *
 * Vercel Hobby plan: max 60s execution, once-per-day cron minimum.
 * Vercel Pro plan: max 300s execution, every 10 min minimum.
 */
export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runScrape('cron');
    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[CronScrape] Pipeline error:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
