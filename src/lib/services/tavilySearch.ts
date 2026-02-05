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

// Check if content describes a real business relationship (deployment, partnership, customer)
function isBusinessRelationship(content: string, title: string, companyName: string): boolean {
  const text = (content + ' ' + title).toLowerCase();
  const companyLower = companyName.toLowerCase();

  // STRONG relationship indicators - company must be subject/object of these actions
  const relationshipPatterns = [
    // Deployment/usage patterns
    `${companyLower} deploys`, `${companyLower} uses`, `${companyLower} chose`,
    `${companyLower} selected`, `${companyLower} implements`, `${companyLower} adopted`,
    `deployed by ${companyLower}`, `used by ${companyLower}`, `chosen by ${companyLower}`,
    `selected by ${companyLower}`, `implemented by ${companyLower}`,
    // Partnership patterns
    `${companyLower} partners`, `${companyLower} and`, `partner with ${companyLower}`,
    `partnership with ${companyLower}`, `alliance with ${companyLower}`,
    // Customer patterns
    `${companyLower} customer`, `customer ${companyLower}`, `client ${companyLower}`,
    // Case study patterns
    'case study', 'success story', 'customer story',
    // Integration patterns
    `${companyLower} integration`, `integrates with ${companyLower}`,
    // Announcement patterns
    'announces', 'announcement', 'press release', 'jointly'
  ];

  // Check if any relationship pattern exists
  const hasRelationshipPattern = relationshipPatterns.some(pattern => text.includes(pattern));

  // EXCLUSION patterns - these indicate it's NOT a real business relationship
  const exclusionPatterns = [
    // People/bios
    'executive', 'leadership', 'team member', 'biography', 'profile',
    'leads the', 'oversees', 'responsible for', 'experience at',
    'previously at', 'former', 'joined from', 'worked at', 'career',
    'ceo', 'cfo', 'cto', 'coo', 'vp of', 'evp', 'svp', 'director of',
    'chief', 'president', 'founder', 'co-founder',
    // Investment/funding (not technology relationship)
    'funded by', 'invested', 'portfolio company', 'venture', 'capital',
    'acquisition of', 'acquired by', 'merger', 'ipo', 'valuation',
    // Events/speaking
    'speaker', 'keynote', 'panel', 'webinar', 'conference', 'event',
    'presentation', 'fireside chat',
    // Generic mentions
    'such as', 'including', 'like', 'similar to', 'compared to',
    'competitor', 'alternative', 'vs', 'versus'
  ];

  const hasExclusionPattern = exclusionPatterns.some(pattern => text.includes(pattern));

  return hasRelationshipPattern && !hasExclusionPattern;
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
  // Focus specifically on deployments, partnerships, case studies, press releases
  const searchPromises = COMPETITOR_DOMAINS.map(async (domain) => {
    try {
      // More specific search query focused on business relationships
      const response = await tavilySearch(
        `"${companyName}" site:${domain} (customer OR "case study" OR deploys OR partnership OR "press release" OR announcement)`,
        apiKey,
        { maxResults: 3, includeAnswer: false, searchDepth: 'advanced' }
      );

      // Strict filtering for actual business relationships
      const relevantResults = response.results.filter(result => {
        const urlLower = result.url.toLowerCase();
        const titleLower = result.title.toLowerCase();
        const contentLower = result.content.toLowerCase();
        const companyLower = companyName.toLowerCase();

        // Must mention the company name
        const mentionsCompany = titleLower.includes(companyLower) ||
          contentLower.includes(companyLower);

        if (!mentionsCompany) return false;

        // STRICT URL exclusions - reject these page types entirely
        const isExcludedPage = urlLower.match(
          /(career|job|team|leadership|executive|people|staff|management|about-us|about\/|contact|pricing|demo|login|signup|privacy|terms|webinar|event|conference|speaker|press-kit|media-kit|investor|board|governance)/
        );

        if (isExcludedPage) return false;

        // STRICT content check - must describe a real business relationship
        const isRealRelationship = isBusinessRelationship(result.content, result.title, companyName);

        // Also accept if URL clearly indicates case study or customer content
        const isCustomerContent = urlLower.match(/(case-study|casestudy|customer-story|customer-success|customers\/|clients\/)/);

        return isRealRelationship || isCustomerContent;
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
