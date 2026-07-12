import { extractWithGroq } from './groq-client';
import { extractWithOpenAI } from './openai-client';
import type { LeadInsert, IndustryType } from '@/types/database';
import 'server-only';

const VALID_INDUSTRIES: IndustryType[] = [
  'construction', 'oil_gas', 'healthcare', 'data_centre',
  'hospitality', 'infrastructure', 'telecom', 'other',
];

interface ExtractionInput {
  rawText: string;
  sourceName: string;
  sourceId: string;
  sourceUrl: string;
}

/**
 * Extract structured lead data from raw text.
 * Tries Groq first (free, fast), falls back to OpenAI on failure.
 * Returns a typed LeadInsert ready for Supabase insertion.
 */
export async function extractLead(input: ExtractionInput): Promise<LeadInsert> {
  let extracted;

  try {
    extracted = await extractWithGroq(input.rawText, input.sourceName);
    console.log(`[ExtractLead] Groq extraction succeeded for: ${extracted.project_name}`);
  } catch (groqError) {
    const groqMsg = groqError instanceof Error ? groqError.message : String(groqError);
    console.warn(`[ExtractLead] Groq failed (${groqMsg}), trying OpenAI fallback...`);

    try {
      extracted = await extractWithOpenAI(input.rawText, input.sourceName);
      console.log(`[ExtractLead] OpenAI fallback succeeded for: ${extracted.project_name}`);
    } catch (openaiError) {
      const openaiMsg = openaiError instanceof Error ? openaiError.message : String(openaiError);
      console.error(`[ExtractLead] Both Groq and OpenAI failed. Groq: ${groqMsg}, OpenAI: ${openaiMsg}`);

      // Return a minimal lead so the data isn't lost
      return {
        project_name: input.rawText.slice(0, 100).trim() || 'Untitled Lead',
        source_id: input.sourceId,
        source_url: input.sourceUrl,
        raw_text: input.rawText,
        relevance_score: 3,
        summary: 'AI extraction failed — manual review needed',
        industry: 'other',
        status: 'new',
      };
    }
  }

  // Validate industry enum
  const industry: IndustryType = VALID_INDUSTRIES.includes(extracted.industry as IndustryType)
    ? (extracted.industry as IndustryType)
    : 'other';

  return {
    project_name: extracted.project_name,
    buyer_organization: extracted.buyer_organization,
    location_emirate: extracted.location_emirate,
    estimated_kva_range: extracted.estimated_kva_range,
    industry,
    deadline_date: extracted.deadline_date,
    contact_info: extracted.contact_info,
    source_id: input.sourceId,
    source_url: input.sourceUrl,
    raw_text: input.rawText,
    relevance_score: extracted.relevance_score,
    summary: extracted.summary,
    status: 'new',
  };
}
