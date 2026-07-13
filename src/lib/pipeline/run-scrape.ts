import { createAdminClient } from '@/lib/supabase/admin';
import { runAllScrapers } from '@/lib/scrapers/registry';
import type { SourceRunResult } from '@/lib/scrapers/registry';
import { extractLead } from '@/lib/extraction/extract-lead';
import { sendLeadNotification } from '@/lib/notifications/email';
import type { Lead } from '@/types/database';
import 'server-only';

export interface PipelineResult {
  scraped: number;
  extracted: number;
  inserted: number;
  notified: number;
  errors: string[];
  sourceResults: SourceRunResult[];
  duration_ms: number;
}

/**
 * Validate that all critical environment variables are set.
 * Throws a clear, specific error message if any are missing.
 */
function validateEnvironment(): void {
  const required: Array<{ key: string; label: string }> = [
    { key: 'NEXT_PUBLIC_SUPABASE_URL', label: 'Supabase URL' },
    { key: 'SUPABASE_SERVICE_ROLE_KEY', label: 'Supabase Service Role Key' },
  ];

  const optional: Array<{ key: string; label: string }> = [
    { key: 'GROQ_API_KEY', label: 'Groq API Key (needed for AI extraction)' },
    { key: 'RESEND_API_KEY', label: 'Resend API Key (needed for email notifications)' },
    { key: 'NOTIFY_EMAIL', label: 'Notification email address' },
  ];

  const missing: string[] = [];
  for (const { key, label } of required) {
    if (!process.env[key]) {
      missing.push(`${key} — ${label}`);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missing.join('\n')}\n\n` +
      'Set these in your Vercel Dashboard → Project → Settings → Environment Variables, then redeploy.'
    );
  }

  // Warn about optional but important vars
  for (const { key, label } of optional) {
    if (!process.env[key]) {
      console.warn(`[Pipeline] WARNING: ${key} is not set — ${label}`);
    }
  }
}

/**
 * End-to-end scrape pipeline:
 * 1. Validate environment
 * 2. Run all enabled scrapers
 * 3. Filter & deduplicate results
 * 4. Extract structured data via LLM
 * 5. Insert new leads into Supabase
 * 6. Send email notifications for high-relevance leads
 * 7. Log the run into scrape_runs table
 *
 * This runs within Vercel's 60-second function timeout (Hobby plan).
 * To stay within Groq's ~30 RPM limit, we process items sequentially
 * with a 2.2s delay between extractions.
 */
export async function runScrape(triggerType: 'manual' | 'cron' = 'manual'): Promise<PipelineResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  let scraped = 0;
  let extracted = 0;
  let inserted = 0;
  let notified = 0;
  let sourceResults: SourceRunResult[] = [];
  let sourcesRan: string[] = [];

  // Step 0: Validate environment
  validateEnvironment();

  const supabase = createAdminClient();

  // Step 1: Run all scrapers
  console.log('[Pipeline] Starting scrape run...');
  const scraperResults = await runAllScrapers();
  scraped = scraperResults.totalItems;
  sourceResults = scraperResults.sourceResults;
  sourcesRan = scraperResults.sourcesRan;

  for (const result of scraperResults.results) {
    for (const error of result.errors) {
      errors.push(`${result.sourceName}: ${error}`);
    }
  }

  console.log(`[Pipeline] Scraped ${scraped} items from ${scraperResults.enabledSources} sources`);

  // Step 2: Collect all scraped items with their source info
  const allItems = scraperResults.results.flatMap((result) => {
    return result.items.map((item) => ({
      ...item,
      sourceName: result.sourceName,
    }));
  });

  if (allItems.length === 0) {
    console.log('[Pipeline] No items to process');
    const duration_ms = Date.now() - startTime;
    await logScrapeRun(supabase, {
      duration_ms, sourcesRan, sourceResults,
      scraped, extracted, inserted, notified, errors, triggerType,
    });
    return { scraped, extracted, inserted, notified, errors, sourceResults, duration_ms };
  }

  // Step 3: Deduplicate against existing leads by source_url
  const sourceUrls = allItems.map((item) => item.sourceUrl);
  const { data: existingLeads } = await supabase
    .from('leads')
    .select('source_url')
    .in('source_url', sourceUrls);

  const existingUrls = new Set((existingLeads || []).map((l: { source_url: string }) => l.source_url));
  const newItems = allItems.filter((item) => !existingUrls.has(item.sourceUrl));

  console.log(`[Pipeline] ${newItems.length} new items after deduplication (${allItems.length - newItems.length} duplicates skipped)`);

  // Step 4: Look up source IDs
  const { data: sources } = await supabase.from('sources').select('id, name');
  const sourceIdMap = new Map((sources || []).map((s: { id: string; name: string }) => [s.name, s.id]));

  // Step 5: Extract and insert leads
  // Process sequentially to respect Groq rate limits
  // Cap at 15 items per run to stay within Vercel's 60s timeout
  const MAX_ITEMS_PER_RUN = 15;
  const itemsToProcess = newItems.slice(0, MAX_ITEMS_PER_RUN);

  if (newItems.length > MAX_ITEMS_PER_RUN) {
    console.warn(`[Pipeline] Capping extraction at ${MAX_ITEMS_PER_RUN} items (${newItems.length} total). Remaining will be processed in next run.`);
    errors.push(`Capped at ${MAX_ITEMS_PER_RUN} items — ${newItems.length - MAX_ITEMS_PER_RUN} deferred to next run`);
  }

  for (const item of itemsToProcess) {
    try {
      // Check if we're approaching the timeout (leave 10s buffer)
      if (Date.now() - startTime > 48000) {
        console.warn('[Pipeline] Approaching timeout, stopping extraction');
        errors.push('Stopped early due to Vercel 60s timeout limit');
        break;
      }

      const sourceId = sourceIdMap.get(item.sourceName) || null;

      const leadData = await extractLead({
        rawText: item.rawText,
        sourceName: item.sourceName,
        sourceId: sourceId || '',
        sourceUrl: item.sourceUrl,
      });
      extracted++;

      // Insert into Supabase
      const { data: insertedLead, error: insertError } = await supabase
        .from('leads')
        .insert(leadData)
        .select()
        .single();

      if (insertError) {
        errors.push(`Insert failed for "${leadData.project_name}": ${insertError.message}`);
        console.error('[Pipeline] Insert error:', insertError.message);
        continue;
      }

      inserted++;

      // Step 6: Send notification for high-relevance leads
      if (insertedLead && insertedLead.relevance_score >= 7) {
        try {
          await sendLeadNotification(insertedLead as Lead);
          notified++;
        } catch (notifyErr) {
          const msg = notifyErr instanceof Error ? notifyErr.message : String(notifyErr);
          console.warn(`[Pipeline] Email notification failed: ${msg}`);
          // Don't add to errors array — notification failure shouldn't be a pipeline error
        }
      }

      // Rate limit delay: 2.2 seconds between Groq API calls
      // This keeps us well under the 30 RPM free tier limit
      if (itemsToProcess.indexOf(item) < itemsToProcess.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 2200));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`Extraction/insert failed for ${item.sourceUrl}: ${message}`);
      console.error('[Pipeline] Item processing error:', message);
    }
  }

  const duration_ms = Date.now() - startTime;
  console.log(`[Pipeline] Complete: ${inserted} leads inserted, ${notified} notifications sent (${duration_ms}ms)`);

  // Step 7: Log the scrape run
  await logScrapeRun(supabase, {
    duration_ms, sourcesRan, sourceResults,
    scraped, extracted, inserted, notified, errors, triggerType,
  });

  return { scraped, extracted, inserted, notified, errors, sourceResults, duration_ms };
}

/**
 * Log a scrape run into the scrape_runs table.
 * Fails silently if the table doesn't exist yet.
 */
async function logScrapeRun(
  supabase: ReturnType<typeof createAdminClient>,
  data: {
    duration_ms: number;
    sourcesRan: string[];
    sourceResults: SourceRunResult[];
    scraped: number;
    extracted: number;
    inserted: number;
    notified: number;
    errors: string[];
    triggerType: string;
  }
): Promise<void> {
  try {
    // Build items_per_source JSONB
    const itemsPerSource: Record<string, number> = {};
    for (const sr of data.sourceResults) {
      if (!sr.isPlaceholder) {
        itemsPerSource[sr.sourceName] = sr.itemCount;
      }
    }

    await supabase.from('scrape_runs').insert({
      duration_ms: data.duration_ms,
      sources_ran: data.sourcesRan.filter((s) =>
        !data.sourceResults.find((sr) => sr.sourceName === s && sr.isPlaceholder)
      ),
      items_per_source: itemsPerSource,
      total_scraped: data.scraped,
      total_extracted: data.extracted,
      total_inserted: data.inserted,
      total_notified: data.notified,
      errors: data.errors.length > 0 ? data.errors : null,
      trigger_type: data.triggerType,
    });
    console.log('[Pipeline] Scrape run logged to scrape_runs table');
  } catch (err) {
    // Don't crash if scrape_runs table doesn't exist yet
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[Pipeline] Could not log scrape run (table may not exist yet): ${msg}`);
  }
}
