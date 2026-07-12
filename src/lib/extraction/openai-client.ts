import OpenAI from 'openai';
import { EXTRACTION_SYSTEM_PROMPT, EXTRACTION_USER_PROMPT } from './prompts';
import 'server-only';

interface ExtractedLead {
  project_name: string;
  buyer_organization: string | null;
  location_emirate: string | null;
  estimated_kva_range: string | null;
  industry: string;
  deadline_date: string | null;
  contact_info: string | null;
  relevance_score: number;
  summary: string;
}

/**
 * Extract structured lead data using OpenAI API (fallback).
 * Uses gpt-4o-mini for cost efficiency.
 * Only called when Groq fails (rate limit or server error).
 */
export async function extractWithOpenAI(
  rawText: string,
  sourceName: string
): Promise<ExtractedLead> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set (needed as Groq fallback)');
  }

  const openai = new OpenAI({ apiKey });

  // Truncate very long text to stay within token limits
  const truncatedText = rawText.length > 4000 ? rawText.slice(0, 4000) + '\n[truncated]' : rawText;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
      { role: 'user', content: EXTRACTION_USER_PROMPT(truncatedText, sourceName) },
    ],
    response_format: { type: 'json_object' },
    temperature: 0,
    max_tokens: 1000,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error('OpenAI returned empty response');
  }

  const parsed = JSON.parse(content) as ExtractedLead;

  if (!parsed.project_name || typeof parsed.relevance_score !== 'number') {
    throw new Error('OpenAI response missing required fields');
  }

  parsed.relevance_score = Math.max(1, Math.min(10, Math.round(parsed.relevance_score)));

  return parsed;
}
