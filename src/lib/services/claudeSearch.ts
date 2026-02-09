import Anthropic from '@anthropic-ai/sdk';

export interface ClaudeSearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

export interface ClaudeSearchResponse {
  query: string;
  answer?: string;
  results: ClaudeSearchResult[];
}

/**
 * Perform a web search using Claude's built-in web search tool
 * Powered by Brave Search
 */
export async function claudeSearch(
  query: string,
  apiKey: string,
  options: {
    maxResults?: number;
    includeAnswer?: boolean;
  } = {}
): Promise<ClaudeSearchResponse> {
  const { maxResults = 10, includeAnswer = true } = options;

  const client = new Anthropic({ apiKey });

  const systemPrompt = includeAnswer
    ? `You are a research assistant. Search the web for the query and provide:
1. A brief, factual answer summarizing the key findings
2. Extract the most relevant search results

Format your response as JSON:
{
  "answer": "Your summary here",
  "results": [
    {"title": "...", "url": "...", "content": "snippet of relevant content..."}
  ]
}

Return up to ${maxResults} most relevant results. Only include results directly relevant to the query.`
    : `You are a research assistant. Search the web for the query and extract the most relevant search results.

Format your response as JSON:
{
  "results": [
    {"title": "...", "url": "...", "content": "snippet of relevant content..."}
  ]
}

Return up to ${maxResults} most relevant results. Only include results directly relevant to the query.`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 4096,
    tools: [
      {
        type: 'web_search_20250305' as const,
        name: 'web_search',
        max_uses: 3,
      },
    ] as unknown as Anthropic.Tool[],
    messages: [
      {
        role: 'user',
        content: `Search for: ${query}`,
      },
    ],
    system: systemPrompt,
  });

  // Extract citations and text from the response
  const results: ClaudeSearchResult[] = [];
  let answer = '';

  for (const block of response.content) {
    if (block.type === 'text') {
      // Try to parse JSON response
      try {
        const jsonMatch = block.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.answer) {
            answer = parsed.answer;
          }
          if (parsed.results && Array.isArray(parsed.results)) {
            for (const r of parsed.results) {
              if (r.title && r.url) {
                results.push({
                  title: r.title,
                  url: r.url,
                  content: r.content || '',
                  score: 1.0,
                });
              }
            }
          }
        }
      } catch {
        // If JSON parsing fails, use the text as the answer
        answer = block.text;
      }
    }
  }

  // Also extract citations if available
  if ('citations' in response && Array.isArray(response.citations)) {
    for (const citation of response.citations as Array<{ url?: string; title?: string; cited_text?: string }>) {
      if (citation.url && !results.find(r => r.url === citation.url)) {
        results.push({
          title: citation.title || '',
          url: citation.url,
          content: citation.cited_text || '',
          score: 0.9,
        });
      }
    }
  }

  return {
    query,
    answer: answer || undefined,
    results: results.slice(0, maxResults),
  };
}

export async function claudeSearchCompanyNews(
  companyName: string,
  apiKey: string
): Promise<ClaudeSearchResult[]> {
  const response = await claudeSearch(
    `${companyName} latest news technology AI developments`,
    apiKey,
    { maxResults: 10, includeAnswer: false }
  );
  return response.results;
}

export async function claudeSearchCaseStudies(
  companyName: string,
  apiKey: string
): Promise<ClaudeSearchResult[]> {
  const response = await claudeSearch(
    `${companyName} case study customer success story`,
    apiKey,
    { maxResults: 5, includeAnswer: false }
  );
  return response.results;
}

export async function claudeSearchCompanyInfo(
  companyName: string,
  apiKey: string
): Promise<{ answer: string; sources: ClaudeSearchResult[] }> {
  const response = await claudeSearch(
    `${companyName} company overview business strategy recent developments`,
    apiKey,
    { maxResults: 5, includeAnswer: true }
  );
  return {
    answer: response.answer || '',
    sources: response.results,
  };
}

export async function claudeSearchInvestorDocs(
  companyName: string,
  apiKey: string
): Promise<ClaudeSearchResult[]> {
  const response = await claudeSearch(
    `${companyName} investor relations SEC filing annual report 10-K`,
    apiKey,
    { maxResults: 5, includeAnswer: false }
  );
  return response.results;
}

export async function claudeSearchInvestorPresentation(
  companyName: string,
  apiKey: string
): Promise<ClaudeSearchResult[]> {
  const currentYear = new Date().getFullYear();
  const response = await claudeSearch(
    `"${companyName}" investor presentation OR investor day filetype:pdf OR site:ir OR site:investor ${currentYear} OR ${currentYear - 1}`,
    apiKey,
    { maxResults: 5, includeAnswer: false }
  );
  return response.results;
}

export async function claudeSearchLeadershipChanges(
  companyName: string,
  apiKey: string
): Promise<ClaudeSearchResult[]> {
  const currentYear = new Date().getFullYear();
  const response = await claudeSearch(
    `"${companyName}" executive leadership appointments CEO CFO CTO ${currentYear - 2}..${currentYear}`,
    apiKey,
    { maxResults: 10, includeAnswer: false }
  );
  return response.results;
}

export interface ClaudeRegulatoryEvent {
  date: string;
  regulatoryBody: string;
  eventType: 'fine' | 'penalty' | 'settlement' | 'enforcement' | 'investigation' | 'consent' | 'order' | 'action' | 'other';
  amount?: string;
  description: string;
  url: string;
}

export async function claudeSearchRegulatoryEvents(
  companyName: string,
  apiKey: string
): Promise<ClaudeRegulatoryEvent[]> {
  const client = new Anthropic({ apiKey });

  const systemPrompt = `You are a regulatory compliance researcher. Search for SEC, FINRA, DOJ, FCA, and other regulatory enforcement actions, fines, penalties, and settlements involving the specified company.

For each regulatory event found, extract:
- date: The date or year of the event
- regulatoryBody: The regulatory body (SEC, FINRA, DOJ, FCA, CFTC, OCC, FDIC, etc.)
- eventType: One of: fine, penalty, settlement, enforcement, investigation, consent, order, action, other
- amount: The fine/penalty amount if mentioned (e.g., "$15 million")
- description: Brief description of the violation or event
- url: The source URL

Return as JSON array:
{
  "events": [
    {"date": "2023", "regulatoryBody": "SEC", "eventType": "settlement", "amount": "$100 million", "description": "...", "url": "..."}
  ]
}

Only include REAL, verified regulatory events with actual source URLs. Do not fabricate events.`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 4096,
    tools: [
      {
        type: 'web_search_20250305' as const,
        name: 'web_search',
        max_uses: 5,
      },
    ] as unknown as Anthropic.Tool[],
    messages: [
      {
        role: 'user',
        content: `Search for regulatory enforcement actions, fines, penalties, and settlements involving "${companyName}" from SEC, FINRA, DOJ, FCA, and other regulators in the past 5 years.`,
      },
    ],
    system: systemPrompt,
  });

  const events: ClaudeRegulatoryEvent[] = [];

  for (const block of response.content) {
    if (block.type === 'text') {
      try {
        const jsonMatch = block.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.events && Array.isArray(parsed.events)) {
            for (const e of parsed.events) {
              if (e.regulatoryBody && e.description && e.url) {
                events.push({
                  date: e.date || 'Recent',
                  regulatoryBody: e.regulatoryBody,
                  eventType: e.eventType || 'other',
                  amount: e.amount,
                  description: e.description,
                  url: e.url,
                });
              }
            }
          }
        }
      } catch {
        // JSON parsing failed, skip
      }
    }
  }

  return events.slice(0, 10);
}

/**
 * Consolidated competitor search using Claude web search.
 * Uses 2-3 broad queries instead of 24 narrow ones.
 * Returns raw search results for AI extraction to process.
 */
export async function claudeConsolidatedCompetitorSearch(
  companyName: string,
  competitors: string[],
  apiKey: string
): Promise<{ title: string; url: string; content: string }[]> {
  if (competitors.length === 0) return [];

  const client = new Anthropic({ apiKey });
  const competitorList = competitors.join(', ');

  const systemPrompt = `You are a research assistant. Search for any content where "${companyName}" and these compliance/archiving vendors appear together: ${competitorList}.

Look for case studies, press releases, partnership announcements, integration pages, customer stories, news articles, or any content — from the vendor, from "${companyName}" itself, or from third-party sources — mentioning both together.

Return as JSON:
{
  "results": [
    {"title": "...", "url": "...", "content": "snippet of relevant content..."}
  ]
}

IMPORTANT:
- Only include REAL results with actual, working URLs
- Do not fabricate or guess URLs
- Only include results where "${companyName}" and a vendor are both explicitly mentioned
- Sources can be vendor sites, company sites, news outlets, press wire services, etc.`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      tools: [
        {
          type: 'web_search_20250305' as const,
          name: 'web_search',
          max_uses: 5,
        },
      ] as unknown as Anthropic.Tool[],
      messages: [
        {
          role: 'user',
          content: `Search for business relationships, partnerships, integrations, and customer mentions between "${companyName}" and these competitors: ${competitorList}`,
        },
      ],
      system: systemPrompt,
    });

    const seenUrls = new Set<string>();
    const results: { title: string; url: string; content: string }[] = [];

    for (const block of response.content) {
      if (block.type === 'text') {
        try {
          const jsonMatch = block.text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.results && Array.isArray(parsed.results)) {
              for (const r of parsed.results) {
                if (r.title && r.url && !seenUrls.has(r.url)) {
                  seenUrls.add(r.url);
                  results.push({
                    title: r.title,
                    url: r.url,
                    content: r.content || '',
                  });
                }
              }
            }
          }
        } catch {
          // JSON parsing failed
        }
      }
    }

    return results;
  } catch (err) {
    console.warn(`Claude consolidated competitor search failed for ${companyName}:`, err);
    return [];
  }
}
