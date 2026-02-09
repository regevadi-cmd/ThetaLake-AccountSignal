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
  const response = await claudeSearch(
    `"${companyName}" investor presentation latest investor day`,
    apiKey,
    { maxResults: 1, includeAnswer: false }
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

export interface ClaudeCompetitorMention {
  competitorName: string;
  title: string;
  url: string;
  summary: string;
  mentionType: 'customer' | 'partner' | 'case_study' | 'press_release' | 'integration' | 'other';
  confidence?: number;    // 0-100 confidence score from anti-hallucination system
  unverified?: boolean;   // true if 60-74 confidence (show warning badge)
}

// Competitor domain mappings for URL validation
const COMPETITOR_DOMAINS: Record<string, string[]> = {
  'Smarsh': ['smarsh.com'],
  'Global Relay': ['globalrelay.com'],
  'NICE': ['nice.com', 'niceactimize.com'],
  'Verint': ['verint.com'],
  'Arctera': ['arctera.io'],
  'Veritas': ['veritas.com'],
  'Proofpoint': ['proofpoint.com'],
  'Shield': ['shieldfc.com'],
  'Behavox': ['behavox.com'],
  'Mimecast': ['mimecast.com'],
  'ZL Technologies': ['zlti.com'],
  'Digital Reasoning': ['digitalreasoning.com'],
};

// Validate URL belongs to claimed competitor
function isValidCompetitorUrl(url: string, competitorName: string): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    const validDomains = COMPETITOR_DOMAINS[competitorName] || [];

    return validDomains.some(domain => {
      const domainLower = domain.toLowerCase();
      return hostname === domainLower ||
             hostname.endsWith('.' + domainLower) ||
             hostname === 'www.' + domainLower;
    });
  } catch {
    return false;
  }
}

// Check if URL is a generic listing/index page (likely hallucinated)
function isGenericListingPage(url: string): boolean {
  try {
    const path = new URL(url).pathname.toLowerCase();

    // Reject URLs that end with generic listing paths
    const genericPatterns = [
      /\/customers\/?$/,
      /\/clients\/?$/,
      /\/case-studies\/?$/,
      /\/case-study\/?$/,
      /\/resources\/?$/,
      /\/resources\/case-studies\/?$/,
      /\/success-stories\/?$/,
      /\/testimonials\/?$/,
      /\/partners\/?$/,
      /\/integrations\/?$/,
      /\/solutions\/?$/,
      /\/industries\/?$/,
      /\/news\/?$/,
      /\/press\/?$/,
      /\/blog\/?$/,
      /\/us\/resources\/case-studies\/?$/, // Proofpoint specific
    ];

    for (const pattern of genericPatterns) {
      if (pattern.test(path)) {
        return true;
      }
    }

    // Also reject very short paths (likely index pages)
    const pathParts = path.split('/').filter(p => p.length > 0);
    if (pathParts.length <= 1) {
      return true;
    }

    return false;
  } catch {
    return true; // Invalid URL, reject it
  }
}

// Validate URL actually exists, returns 200, and contains the company name
async function validateUrlAndContent(url: string, companyName: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      }
    });

    clearTimeout(timeout);

    if (response.status !== 200) {
      console.warn(`URL returned status ${response.status}: ${url}`);
      return false;
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      return false;
    }

    const text = await response.text();
    const companyLower = companyName.toLowerCase();
    const textLower = text.toLowerCase();

    if (!textLower.includes(companyLower)) {
      console.warn(`Company name "${companyName}" not found in page: ${url}`);
      return false;
    }

    // Check for soft 404
    const soft404Indicators = ['page not found', '404', 'not found', 'no longer available'];
    for (const indicator of soft404Indicators) {
      if (textLower.includes(indicator)) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

export async function claudeSearchCompetitorMentions(
  companyName: string,
  apiKey: string
): Promise<ClaudeCompetitorMention[]> {
  const { scoreAndFilterResults, generateCompetitorSearchQueries } = await import('./antiHallucination');

  const client = new Anthropic({ apiKey });
  const mentions: ClaudeCompetitorMention[] = [];
  const seenUrls = new Set<string>();

  // Iterate through all competitors
  for (const [competitorName] of Object.entries(COMPETITOR_DOMAINS)) {
    try {
      // Use targeted queries
      const queries = generateCompetitorSearchQueries(companyName, competitorName);
      const query = queries[0]; // Use the press release query (most reliable)

      const systemPrompt = `You are a research assistant. Search for business relationships between "${companyName}" and "${competitorName}".

Look for:
- Press releases about partnerships or customer relationships
- News articles about deployments or implementations
- Case studies mentioning "${companyName}" as a customer

Return as JSON:
{
  "results": [
    {"title": "...", "url": "...", "content": "snippet of relevant content..."}
  ]
}

IMPORTANT:
- Only include REAL results with actual, working URLs
- Do not fabricate or guess URLs
- Only include results where "${companyName}" is explicitly mentioned
- Focus on press releases from businesswire.com, prnewswire.com, or news sites`;

      const response = await client.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 2048,
        tools: [
          {
            type: 'web_search_20250305' as const,
            name: 'web_search',
            max_uses: 2,
          },
        ] as unknown as Anthropic.Tool[],
        messages: [
          {
            role: 'user',
            content: query,
          },
        ],
        system: systemPrompt,
      });

      // Extract results from response
      const rawResults: { title: string; url: string; content: string }[] = [];

      for (const block of response.content) {
        if (block.type === 'text') {
          try {
            const jsonMatch = block.text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              if (parsed.results && Array.isArray(parsed.results)) {
                for (const r of parsed.results) {
                  if (r.title && r.url) {
                    rawResults.push({
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

      if (rawResults.length === 0) continue;

      // Apply anti-hallucination scoring
      const scoredResults = scoreAndFilterResults(
        rawResults.map(r => ({
          title: r.title,
          url: r.url,
          content: r.content,
          score: 0.8, // Claude results assumed to have decent relevance
        })),
        companyName,
        competitorName,
        {
          minConfidence: 60,
          maxResults: 2,
          debug: process.env.NODE_ENV === 'development'
        }
      );

      for (const result of scoredResults) {
        if (seenUrls.has(result.url)) continue;
        seenUrls.add(result.url);

        // Infer mention type
        let mentionType: ClaudeCompetitorMention['mentionType'] = 'other';
        const urlLower = result.url.toLowerCase();
        const contentLower = result.content.toLowerCase();

        if (urlLower.includes('case-study') || contentLower.includes('case study')) {
          mentionType = 'case_study';
        } else if (urlLower.includes('press') || urlLower.includes('news') || urlLower.includes('businesswire') || urlLower.includes('prnewswire')) {
          mentionType = 'press_release';
        } else if (contentLower.includes('partner')) {
          mentionType = 'partner';
        } else if (contentLower.includes('customer') || contentLower.includes('client')) {
          mentionType = 'customer';
        } else if (contentLower.includes('integration') || contentLower.includes('integrates')) {
          mentionType = 'integration';
        }

        mentions.push({
          competitorName,
          title: result.title,
          url: result.url,
          summary: result.content.substring(0, 150) + (result.content.length > 150 ? '...' : ''),
          mentionType,
          confidence: result.confidence,
          unverified: result.unverified,
        });
      }
    } catch (err) {
      console.warn(`Failed to search Claude for ${competitorName}:`, err);
    }
  }

  // Sort by confidence
  mentions.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));

  return mentions.slice(0, 10);
}
