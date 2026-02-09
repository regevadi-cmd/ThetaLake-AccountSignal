import { CompetitorMentionItem } from '@/types/analysis';

interface SearchResult {
  title: string;
  url: string;
  content: string;
}

interface ProviderConfig {
  type: 'anthropic' | 'openai' | 'gemini';
  apiKey: string;
  model?: string;
}

interface ExtractedMention {
  competitorName: string;
  mentionType: string;
  title: string;
  url: string;
  summary: string;
}

/**
 * Extract competitor mentions from search results using AI.
 * Every URL in the output must come from the input search results,
 * eliminating hallucinated URLs by design.
 */
export async function extractCompetitorMentions(
  companyName: string,
  competitors: string[],
  searchResults: SearchResult[],
  provider: ProviderConfig
): Promise<CompetitorMentionItem[]> {
  if (searchResults.length === 0) return [];

  // Build numbered list of search results for the prompt
  const resultsList = searchResults
    .map((r, i) => `[${i + 1}] Title: ${r.title} | URL: ${r.url} | Content: ${r.content.substring(0, 300)}`)
    .join('\n');

  const prompt = `Extract mentions where "${companyName}" and a compliance/archiving vendor appear together.

COMPANY BEING ANALYZED: ${companyName}
COMPLIANCE VENDORS TO LOOK FOR: ${competitors.join(', ')}

Find any content — from vendor websites, the company itself, press releases, news articles, or any other source — where "${companyName}" and one of these vendors are mentioned together in a business context (customer relationship, partnership, integration, deployment, case study, comparison, etc.).

SEARCH RESULTS:
${resultsList}

RULES:
- Extract results where "${companyName}" and a vendor appear together in a business context
- The source can be the vendor, the company, a news outlet, or any third party
- The URL field MUST be copied exactly from one of the results above
- Both "${companyName}" AND the vendor name must appear in the content
- Provide a 1-2 sentence summary citing specific evidence from the content
- If no real mentions are found, return an empty array

Return ONLY a JSON array (or empty array if none found):
[{"competitorName":"...","mentionType":"customer|partner|integration|case_study|press_release|comparison|other","title":"...","url":"...","summary":"..."}]`;

  try {
    const responseText = await callProvider(prompt, provider);
    const mentions = parseExtractionResponse(responseText);
    return validateMentions(mentions, searchResults);
  } catch (err) {
    console.warn('Competitor extraction failed:', err);
    return [];
  }
}

async function callProvider(prompt: string, provider: ProviderConfig): Promise<string> {
  switch (provider.type) {
    case 'anthropic':
      return callAnthropic(prompt, provider.apiKey, provider.model);
    case 'openai':
      return callOpenAI(prompt, provider.apiKey, provider.model);
    case 'gemini':
      return callGemini(prompt, provider.apiKey, provider.model);
    default:
      throw new Error(`Unsupported provider: ${provider.type}`);
  }
}

async function callAnthropic(prompt: string, apiKey: string, model?: string): Promise<string> {
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model: model || 'claude-sonnet-4-5-20250929',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  });

  for (const block of response.content) {
    if (block.type === 'text') return block.text;
  }
  return '';
}

async function callOpenAI(prompt: string, apiKey: string, model?: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2048,
      temperature: 0,
    }),
  });

  if (!response.ok) throw new Error(`OpenAI API error: ${response.status}`);
  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

async function callGemini(prompt: string, apiKey: string, model?: string): Promise<string> {
  const modelId = model || 'gemini-2.5-flash';
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 2048, temperature: 0 },
      }),
    }
  );

  if (!response.ok) throw new Error(`Gemini API error: ${response.status}`);
  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

function parseExtractionResponse(text: string): ExtractedMention[] {
  // Find JSON array in response
  const arrayMatch = text.match(/\[[\s\S]*\]/);
  if (!arrayMatch) return [];

  try {
    const parsed = JSON.parse(arrayMatch[0]);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item: unknown): item is ExtractedMention =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as ExtractedMention).competitorName === 'string' &&
        typeof (item as ExtractedMention).url === 'string' &&
        typeof (item as ExtractedMention).title === 'string'
    );
  } catch {
    return [];
  }
}

function validateMentions(
  mentions: ExtractedMention[],
  searchResults: SearchResult[]
): CompetitorMentionItem[] {
  const validMentionTypes = ['customer', 'partner', 'comparison', 'case_study', 'press_release', 'integration', 'other'];
  const validUrls = new Set(searchResults.map(r => r.url));

  return mentions
    .filter(m => validUrls.has(m.url))
    .map(m => ({
      competitorName: m.competitorName,
      mentionType: (validMentionTypes.includes(m.mentionType) ? m.mentionType : 'other') as CompetitorMentionItem['mentionType'],
      title: m.title,
      url: m.url,
      summary: m.summary || '',
    }));
}
