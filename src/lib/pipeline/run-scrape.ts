import { createAdminClient } from '@/lib/supabase/admin';
import { runAllScrapers } from '@/lib/scrapers/registry';
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
  duration_ms: number;
}

/**
 * End-to-end scrape pipeline:
 * 1. Run all enabled scrapers
 * 2. Filter & deduplicate results
 * 3. Extract structured data via LLM
 * 4. Insert new leads into Supabase
 * 5. Send email notifications for high-relevance leads
 *
 * This runs within Vercel's 60-second function timeout (Hobby plan).
 * To stay within Groq's ~30 RPM limit, we process items sequentially
 * with a 2.2s delay between extractions.
 */
export async function runScrape(): Promise<PipelineResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  let scraped = 0;
  let extracted = 0;
  let inserted = 0;
  let notified = 0;

  const supabase = createAdminClient();

  // Step 1: Run all scrapers
  console.log('[Pipeline] Starting scrape run...');
  const scraperResults = await runAllScrapers();
  scraped = scraperResults.totalItems;

  for (const result of scraperResults.results) {
    for (const error of result.errors) {
      errors.push(`${result.sourceName}: ${error}`);
    }
  }

  console.log(`[Pipeline] Scraped ${scraped} items from ${scraperResults.enabledSources} sources`);

  // Step 2: Collect all scraped items with their source info
  const allItems = scraperResults.results.flatMap((result) => {
    // Find the source ID from the scraper result
    return result.items.map((item) => ({
      ...item,
      sourceName: result.sourceName,
      // sourceId will be looked up from the scrapers
    }));
  });

  if (allItems.length === 0) {
    console.log('[Pipeline] No items to process');
    return { scraped, extracted, inserted, notified, errors, duration_ms: Date.now() - startTime };
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
  // Cap at 20 items per run to stay within Vercel's 60s timeout
  const MAX_ITEMS_PER_RUN = 20;
  const itemsToProcess = newItems.slice(0, MAX_ITEMS_PER_RUN);

  if (newItems.length > MAX_ITEMS_PER_RUN) {
    console.warn(`[Pipeline] Capping extraction at ${MAX_ITEMS_PER_RUN} items (${newItems.length} total). Remaining will be processed in next run.`);
  }

  for (const item of itemsToProcess) {
    try {
      // Check if we're approaching the timeout (leave 10s buffer)
      if (Date.now() - startTime > 50000) {
        console.warn('[Pipeline] Approaching timeout, stopping extraction');
        errors.push('Stopped early due to timeout limit');
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
        await sendLeadNotification(insertedLead as Lead);
        notified++;
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

  return { scraped, extracted, inserted, notified, errors, duration_ms };
}
