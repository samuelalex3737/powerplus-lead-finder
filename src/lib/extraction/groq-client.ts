import Groq from 'groq-sdk';
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

// Models to try in order of preference (Groq frequently deprecates models)
const MODEL_PRIORITY = [
  'meta-llama/llama-4-scout-17b-16e-instruct',
  'qwen/qwen3.6-27b',
  'openai/gpt-oss-20b',
  'deepseek-r1-distill-llama-70b',
];

let cachedModel: string | null = null;

/**
 * Discover the best available model on Groq.
 * Caches the result for the lifetime of the serverless function.
 */
async function getBestModel(groq: Groq): Promise<string> {
  if (cachedModel) return cachedModel;

  try {
    const models = await groq.models.list();
    const availableIds = new Set(models.data.map((m) => m.id));

    for (const preferred of MODEL_PRIORITY) {
      if (availableIds.has(preferred)) {
        cachedModel = preferred;
        console.log(`[GroqClient] Using model: ${preferred}`);
        return preferred;
      }
    }

    // Fallback to first available chat model
    const fallback = models.data.find((m) => m.id.includes('llama') || m.id.includes('qwen'));
    cachedModel = fallback?.id || MODEL_PRIORITY[0];
    console.log(`[GroqClient] Falling back to model: ${cachedModel}`);
    return cachedModel;
  } catch {
    // If model listing fails, try the first preferred model
    cachedModel = MODEL_PRIORITY[0];
    return cachedModel;
  }
}

/**
 * Extract structured lead data from raw text using Groq API.
 * Uses response_format: json_object for reliable structured output.
 * 
 * Rate limit: Groq free tier allows ~30 RPM.
 * The pipeline should use a queue to stay under this limit.
 */
export async function extractWithGroq(
  rawText: string,
  sourceName: string
): Promise<ExtractedLead> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY environment variable is not set');
  }

  const groq = new Groq({ apiKey, maxRetries: 3 });
  const model = await getBestModel(groq);

  // Truncate very long text to stay within token limits
  const truncatedText = rawText.length > 4000 ? rawText.slice(0, 4000) + '\n[truncated]' : rawText;

  const completion = await groq.chat.completions.create({
    model,
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
    throw new Error('Groq returned empty response');
  }

  const parsed = JSON.parse(content) as ExtractedLead;

  // Validate required fields
  if (!parsed.project_name || typeof parsed.relevance_score !== 'number') {
    throw new Error('Groq response missing required fields (project_name, relevance_score)');
  }

  // Clamp relevance score to 1-10
  parsed.relevance_score = Math.max(1, Math.min(10, Math.round(parsed.relevance_score)));

  return parsed;
}
