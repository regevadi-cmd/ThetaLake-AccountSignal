export interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

export interface TavilySearchResponse {
  query: string;
  answer?: string;
  results: TavilySearchResult[];
  response_time: number;
}

const TAVILY_API_URL = 'https://api.tavily.com/search';

export async function tavilySearch(
  query: string,
  apiKey: string,
  options: {
    searchDepth?: 'basic' | 'advanced';
    maxResults?: number;
    includeAnswer?: boolean;
    includeRawContent?: boolean;
  } = {}
): Promise<TavilySearchResponse> {
  const {
    searchDepth = 'basic',
    maxResults = 10,
    includeAnswer = true,
    includeRawContent = false
  } = options;

  const response = await fetch(TAVILY_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: searchDepth,
      max_results: maxResults,
      include_answer: includeAnswer,
      include_raw_content: includeRawContent
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Tavily API error: ${error}`);
  }

  return response.json();
}

export async function tavilySearchCompanyNews(
  companyName: string,
  apiKey: string
): Promise<TavilySearchResult[]> {
  const response = await tavilySearch(
    `${companyName} latest news technology AI developments`,
    apiKey,
    { maxResults: 10, includeAnswer: false }
  );
  return response.results;
}

export async function tavilySearchCaseStudies(
  companyName: string,
  apiKey: string
): Promise<TavilySearchResult[]> {
  const response = await tavilySearch(
    `${companyName} case study customer success story`,
    apiKey,
    { maxResults: 5, includeAnswer: false }
  );
  return response.results;
}

export async function tavilySearchCompanyInfo(
  companyName: string,
  apiKey: string
): Promise<{ answer: string; sources: TavilySearchResult[] }> {
  const response = await tavilySearch(
    `${companyName} company overview business strategy recent developments`,
    apiKey,
    { maxResults: 5, includeAnswer: true, searchDepth: 'advanced' }
  );
  return {
    answer: response.answer || '',
    sources: response.results
  };
}

export async function tavilySearchInvestorDocs(
  companyName: string,
  apiKey: string
): Promise<TavilySearchResult[]> {
  const response = await tavilySearch(
    `${companyName} investor relations SEC filing annual report 10-K`,
    apiKey,
    { maxResults: 5, includeAnswer: false }
  );
  return response.results;
}

export async function tavilySearchInvestorPresentation(
  companyName: string,
  apiKey: string
): Promise<TavilySearchResult[]> {
  const currentYear = new Date().getFullYear();
  const response = await tavilySearch(
    `"${companyName}" investor presentation OR investor day filetype:pdf OR site:ir OR site:investor ${currentYear} OR ${currentYear - 1}`,
    apiKey,
    { maxResults: 5, includeAnswer: false }
  );
  return response.results;
}

/**
 * Consolidated competitor search: uses 2-3 broad queries instead of 24 narrow ones.
 * Returns raw search results for AI extraction to process.
 */
export async function tavilyConsolidatedCompetitorSearch(
  companyName: string,
  competitors: string[],
  apiKey: string
): Promise<{ title: string; url: string; content: string }[]> {
  if (competitors.length === 0) return [];

  const competitorOR = competitors.map(c => `"${c}"`).join(' OR ');

  const queries = [
    `"${companyName}" (${competitorOR}) partnership OR customer OR integration OR deployment OR case study`,
    `"${companyName}" (${competitorOR}) site:businesswire.com OR site:prnewswire.com OR site:globenewswire.com`,
    `"${companyName}" (${competitorOR}) announces OR selects OR deploys OR partners`,
  ];

  const seenUrls = new Set<string>();
  const results: { title: string; url: string; content: string }[] = [];

  try {
    const responses = await Promise.all(
      queries.map(query =>
        tavilySearch(query, apiKey, {
          maxResults: 10,
          includeAnswer: false,
          searchDepth: 'advanced'
        }).catch(err => {
          console.warn(`Tavily competitor search query failed: ${query}`, err);
          return { query, results: [] as TavilySearchResult[], response_time: 0 };
        })
      )
    );

    for (const response of responses) {
      for (const r of response.results) {
        if (!seenUrls.has(r.url)) {
          seenUrls.add(r.url);
          results.push({ title: r.title, url: r.url, content: r.content });
        }
      }
    }
  } catch (err) {
    console.warn(`Tavily consolidated competitor search failed for ${companyName}:`, err);
  }

  return results;
}

export interface RegulatoryEvent {
  date: string;
  regulatoryBody: string;
  eventType: 'fine' | 'penalty' | 'settlement' | 'enforcement' | 'investigation' | 'consent' | 'order' | 'action' | 'other';
  amount?: string;
  description: string;
  url: string;
}

// Extract regulatory body from text
function extractRegulatoryBody(text: string, url: string): string {
  const textLower = text.toLowerCase();
  const urlLower = url.toLowerCase();

  if (urlLower.includes('sec.gov') || textLower.includes('securities and exchange commission')) return 'SEC';
  if (urlLower.includes('finra.org') || textLower.includes('finra')) return 'FINRA';
  if (textLower.includes('department of justice') || textLower.includes('doj ')) return 'DOJ';
  if (urlLower.includes('fca.org') || textLower.includes('financial conduct authority')) return 'FCA';
  if (textLower.includes('cftc') || textLower.includes('commodity futures')) return 'CFTC';
  if (textLower.includes('occ') || textLower.includes('comptroller of the currency')) return 'OCC';
  if (textLower.includes('federal reserve') || textLower.includes('fed ')) return 'Federal Reserve';
  if (textLower.includes('fdic')) return 'FDIC';
  if (textLower.includes('cfpb') || textLower.includes('consumer financial')) return 'CFPB';
  if (textLower.includes('state attorney') || textLower.includes('attorney general')) return 'State AG';
  if (textLower.includes('nyse') || textLower.includes('new york stock exchange')) return 'NYSE';
  if (textLower.includes('esma')) return 'ESMA';

  return 'Regulatory';
}

// Extract event type from text
function extractEventType(text: string): RegulatoryEvent['eventType'] {
  const textLower = text.toLowerCase();

  if (textLower.includes('fine') || textLower.includes('fined')) return 'fine';
  if (textLower.includes('penalty') || textLower.includes('penalt')) return 'penalty';
  if (textLower.includes('settlement') || textLower.includes('settle') || textLower.includes('agreed to pay')) return 'settlement';
  if (textLower.includes('enforcement action')) return 'enforcement';
  if (textLower.includes('investigation') || textLower.includes('investigating') || textLower.includes('probe')) return 'investigation';
  if (textLower.includes('consent order') || textLower.includes('consent decree')) return 'consent';
  if (textLower.includes('cease and desist') || textLower.includes('order')) return 'order';
  if (textLower.includes('charges') || textLower.includes('charged') || textLower.includes('action against')) return 'action';

  return 'other';
}

// Extract dollar amount from text
function extractAmount(text: string): string | undefined {
  // Match patterns like $15 million, $249M, $1.5 billion, etc.
  const patterns = [
    /\$[\d,]+(?:\.\d+)?\s*(?:billion|bn)/i,
    /\$[\d,]+(?:\.\d+)?\s*(?:million|mn|m)/i,
    /\$[\d,]+(?:\.\d+)?/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[0];
    }
  }

  return undefined;
}

// Extract date from text or URL
function extractDate(text: string, url: string): string {
  // Try to find year-month patterns
  const datePatterns = [
    /(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4}/i,
    /\d{1,2}\/\d{1,2}\/\d{4}/,
    /\d{4}-\d{2}-\d{2}/,
    /(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4}/i,
  ];

  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[0];
    }
  }

  // Try to extract year at minimum
  const yearMatch = text.match(/20[12]\d/);
  if (yearMatch) {
    return yearMatch[0];
  }

  return 'Recent';
}

export async function tavilySearchRegulatoryEvents(
  companyName: string,
  apiKey: string
): Promise<RegulatoryEvent[]> {
  const events: RegulatoryEvent[] = [];

  // Multiple targeted searches for different types of regulatory events
  const searchQueries = [
    `"${companyName}" SEC fine penalty settlement enforcement`,
    `"${companyName}" FINRA fine disciplinary action`,
    `"${companyName}" regulatory penalty settlement million`,
    `"${companyName}" DOJ settlement charges`,
  ];

  try {
    // Run searches in parallel
    const searchPromises = searchQueries.map(query =>
      tavilySearch(query, apiKey, {
        maxResults: 5,
        includeAnswer: false,
        searchDepth: 'advanced'
      })
    );

    const results = await Promise.all(searchPromises);

    // Collect all unique results
    const seenUrls = new Set<string>();

    results.forEach(response => {
      response.results.forEach(result => {
        // Skip duplicates
        if (seenUrls.has(result.url)) return;

        const textLower = (result.title + ' ' + result.content).toLowerCase();
        const companyLower = companyName.toLowerCase();

        // Must mention the company
        if (!textLower.includes(companyLower)) return;

        // Must be about enforcement/fines/penalties
        const hasRegulatoryContent =
          textLower.includes('fine') ||
          textLower.includes('penalty') ||
          textLower.includes('settlement') ||
          textLower.includes('enforcement') ||
          textLower.includes('charges') ||
          textLower.includes('violation') ||
          textLower.includes('consent order') ||
          textLower.includes('investigation');

        if (!hasRegulatoryContent) return;

        // Exclude irrelevant pages
        const urlLower = result.url.toLowerCase();
        if (urlLower.includes('career') || urlLower.includes('job') || urlLower.includes('linkedin.com/jobs')) return;

        seenUrls.add(result.url);

        const fullText = result.title + ' ' + result.content;

        events.push({
          date: extractDate(fullText, result.url),
          regulatoryBody: extractRegulatoryBody(fullText, result.url),
          eventType: extractEventType(fullText),
          amount: extractAmount(fullText),
          description: result.title.length > 100 ? result.title.substring(0, 100) + '...' : result.title,
          url: result.url
        });
      });
    });
  } catch (err) {
    console.warn(`Failed to search regulatory events for ${companyName}:`, err);
  }

  // Sort by most recent (if we can parse dates) and limit to 10
  return events.slice(0, 10);
}

export async function tavilySearchLeadershipChanges(
  companyName: string,
  apiKey: string
): Promise<TavilySearchResult[]> {
  // Search for recent leadership changes (last 5 years)
  const currentYear = new Date().getFullYear();
  const response = await tavilySearch(
    `"${companyName}" executive leadership (appoints OR appointed OR names OR named OR promotes OR hires) (CEO OR CFO OR CTO OR COO OR "Chief Executive" OR "Chief Financial" OR President) ${currentYear - 5}..${currentYear}`,
    apiKey,
    { maxResults: 12, includeAnswer: false, searchDepth: 'advanced' }
  );

  // Filter results to only include actual news/press releases about leadership
  return response.results.filter(result => {
    const urlLower = result.url.toLowerCase();
    const titleLower = result.title.toLowerCase();
    const contentLower = (result.content || '').toLowerCase();

    // Must mention a leadership action
    const hasLeadershipAction = titleLower.includes('appoint') ||
      titleLower.includes('name') ||
      titleLower.includes('hire') ||
      titleLower.includes('join') ||
      titleLower.includes('promote') ||
      titleLower.includes('ceo') ||
      titleLower.includes('cfo') ||
      titleLower.includes('chief') ||
      contentLower.includes('appointed') ||
      contentLower.includes('named as');

    // Exclude job postings, career pages, and low-quality sources
    const isExcludedPage = urlLower.includes('career') ||
      urlLower.includes('/jobs') ||
      urlLower.includes('linkedin.com') ||
      urlLower.includes('indeed.com') ||
      urlLower.includes('glassdoor') ||
      urlLower.includes('ziprecruiter') ||
      urlLower.includes('wikipedia') ||
      urlLower.includes('facebook.com') ||
      urlLower.includes('twitter.com') ||
      titleLower.includes('privacy') ||
      titleLower.includes('cookie');

    return hasLeadershipAction && !isExcludedPage;
  });
}
