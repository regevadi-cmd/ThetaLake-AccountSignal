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

// Competitor companies to search for mentions
const COMPETITOR_DOMAINS = [
  'thetalake.com',
  'smarsh.com',
  'globalrelay.com',
  'nice.com',
  'verint.com',
  'arctera.io',
  'veritas.com',
  'proofpoint.com',
  'shieldfc.com',
  'behavox.com',
  'digitalreasoning.com',
  'mimecast.com',
  'zlti.com'
];

const COMPETITOR_NAMES: Record<string, string> = {
  'thetalake.com': 'Theta Lake',
  'smarsh.com': 'Smarsh',
  'globalrelay.com': 'Global Relay',
  'nice.com': 'NICE',
  'verint.com': 'Verint',
  'arctera.io': 'Arctera',
  'veritas.com': 'Veritas',
  'proofpoint.com': 'Proofpoint',
  'shieldfc.com': 'Shield',
  'behavox.com': 'Behavox',
  'digitalreasoning.com': 'Digital Reasoning',
  'mimecast.com': 'Mimecast',
  'zlti.com': 'ZL Technologies'
};

export interface CompetitorMention {
  competitorName: string;
  title: string;
  url: string;
  summary: string;
  mentionType: 'customer' | 'partner' | 'case_study' | 'press_release' | 'integration' | 'other';
}

function inferMentionType(url: string, content: string): CompetitorMention['mentionType'] {
  const urlLower = url.toLowerCase();
  const contentLower = content.toLowerCase();

  if (urlLower.includes('case-study') || urlLower.includes('casestudy') || urlLower.includes('customer-story') || contentLower.includes('case study')) {
    return 'case_study';
  }
  if (urlLower.includes('integration') || urlLower.includes('connector') || contentLower.includes('integration') || contentLower.includes('integrates')) {
    return 'integration' as CompetitorMention['mentionType'];
  }
  if (urlLower.includes('customer') || urlLower.includes('client') || contentLower.includes('customer')) {
    return 'customer';
  }
  if (urlLower.includes('partner') || contentLower.includes('partner')) {
    return 'partner';
  }
  if (urlLower.includes('press') || urlLower.includes('news') || urlLower.includes('blog')) {
    return 'press_release';
  }
  return 'other';
}

// Check if content is about technology activity (not finance/advisory)
function isTechnologyRelated(content: string, title: string): boolean {
  const text = (content + ' ' + title).toLowerCase();

  // Technology-related keywords
  const techKeywords = [
    'integration', 'platform', 'solution', 'software', 'deploy', 'implement',
    'compliance', 'archiving', 'capture', 'surveillance', 'monitor', 'analyze',
    'ai', 'machine learning', 'automation', 'api', 'connector', 'plugin',
    'customer', 'use case', 'case study', 'product', 'feature', 'launch',
    'partnership', 'technology partner', 'tech partner', 'certified'
  ];

  // Finance/advisory keywords to exclude
  const financeKeywords = [
    'advisory board', 'board member', 'board of directors', 'co-author',
    'investment bank', 'financial advisor', 'underwriter', 'ipo',
    'sec filing', 'regulatory filing', 'proxy statement', 'securities',
    'conference speaker', 'panel discussion', 'webinar speaker',
    'industry report co-author', 'white paper co-author'
  ];

  // Check if it has tech keywords and doesn't have finance keywords
  const hasTechKeyword = techKeywords.some(kw => text.includes(kw));
  const hasFinanceKeyword = financeKeywords.some(kw => text.includes(kw));

  return hasTechKeyword && !hasFinanceKeyword;
}

// Create a concise technology-focused summary
function createTechSummary(content: string, companyName: string): string {
  const contentLower = content.toLowerCase();
  const companyLower = companyName.toLowerCase();

  // Try to extract the most relevant sentence mentioning the company
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
  const relevantSentence = sentences.find(s =>
    s.toLowerCase().includes(companyLower) &&
    (s.toLowerCase().includes('partner') ||
     s.toLowerCase().includes('customer') ||
     s.toLowerCase().includes('integration') ||
     s.toLowerCase().includes('deploy') ||
     s.toLowerCase().includes('use') ||
     s.toLowerCase().includes('solution'))
  );

  if (relevantSentence) {
    return relevantSentence.trim().substring(0, 150) + (relevantSentence.length > 150 ? '...' : '');
  }

  // Fallback to first 150 chars
  return content.substring(0, 150).trim() + (content.length > 150 ? '...' : '');
}

export async function tavilySearchCompetitorMentions(
  companyName: string,
  apiKey: string
): Promise<CompetitorMention[]> {
  const mentions: CompetitorMention[] = [];

  // Search for the company across all competitor domains in parallel
  // Focus on technology-related content: integrations, partnerships, customer deployments
  const searchPromises = COMPETITOR_DOMAINS.map(async (domain) => {
    try {
      // Search for technology-focused content
      const response = await tavilySearch(
        `"${companyName}" site:${domain} (integration OR customer OR partner OR deploys OR platform OR solution OR compliance OR archiving)`,
        apiKey,
        { maxResults: 3, includeAnswer: false, searchDepth: 'advanced' }
      );

      // Filter results to only include technology-related content
      const relevantResults = response.results.filter(result => {
        const titleLower = result.title.toLowerCase();
        const contentLower = result.content.toLowerCase();
        const companyLower = companyName.toLowerCase();

        // Must mention the company name in title or prominently in content
        const mentionsCompany = titleLower.includes(companyLower) ||
          contentLower.includes(companyLower);

        // Exclude generic pages like careers, about, contact, pricing
        const isGenericPage = result.url.toLowerCase().match(/(career|job|about-us|contact|pricing|demo|login|signup|privacy|terms|webinar|event|conference)/);

        // Must be technology-related, not finance/advisory
        const isTechContent = isTechnologyRelated(result.content, result.title);

        return mentionsCompany && !isGenericPage && isTechContent;
      });

      return relevantResults.map(result => ({
        competitorName: COMPETITOR_NAMES[domain] || domain,
        title: result.title,
        url: result.url,
        summary: createTechSummary(result.content, companyName),
        mentionType: inferMentionType(result.url, result.content)
      }));
    } catch (err) {
      // Silently fail for individual competitor searches
      console.warn(`Failed to search ${domain} for ${companyName}:`, err);
      return [];
    }
  });

  const results = await Promise.all(searchPromises);
  results.forEach(competitorResults => {
    mentions.push(...competitorResults);
  });

  return mentions;
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
  const response = await tavilySearch(
    `"${companyName}" (appoints OR appointed OR names OR named OR promotes OR promoted OR hires OR hired OR joins) (CEO OR CFO OR CTO OR COO OR CMO OR "Chief" OR President OR "Vice President" OR Director OR Executive)`,
    apiKey,
    { maxResults: 10, includeAnswer: false, searchDepth: 'advanced' }
  );

  // Filter results to only include actual news/press releases about leadership
  return response.results.filter(result => {
    const urlLower = result.url.toLowerCase();
    const titleLower = result.title.toLowerCase();

    // Must be a news/press release type page
    const isRelevantPage = urlLower.includes('news') ||
      urlLower.includes('press') ||
      urlLower.includes('announce') ||
      urlLower.includes('blog') ||
      urlLower.includes('businesswire') ||
      urlLower.includes('prnewswire') ||
      urlLower.includes('globenewswire') ||
      titleLower.includes('appoint') ||
      titleLower.includes('name') ||
      titleLower.includes('hire') ||
      titleLower.includes('join') ||
      titleLower.includes('promote');

    // Exclude job postings and career pages
    const isJobPage = urlLower.includes('career') ||
      urlLower.includes('job') ||
      urlLower.includes('linkedin.com/jobs') ||
      urlLower.includes('indeed.com') ||
      urlLower.includes('glassdoor');

    return isRelevantPage && !isJobPage;
  });
}
