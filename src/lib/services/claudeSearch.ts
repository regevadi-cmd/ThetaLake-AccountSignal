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
