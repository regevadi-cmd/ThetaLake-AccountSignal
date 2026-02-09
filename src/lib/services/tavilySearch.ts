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
  const response = await tavilySearch(
    `"${companyName}" investor presentation latest investor day`,
    apiKey,
    { maxResults: 1, includeAnswer: false }
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
  confidence?: number;    // 0-100 confidence score from anti-hallucination system
  unverified?: boolean;   // true if 60-74 confidence (show warning badge)
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

// Validate that URL actually belongs to the expected competitor domain
function isValidCompetitorUrl(url: string, expectedDomain: string): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    const domainLower = expectedDomain.toLowerCase();

    // Check if hostname matches or is a subdomain of the expected domain
    return hostname === domainLower ||
           hostname.endsWith('.' + domainLower) ||
           hostname === 'www.' + domainLower;
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

    // Check if URL matches any generic pattern
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
    return true; // Invalid URL, reject
  }
}

// Validate URL actually exists, returns 200, and contains the company name
async function validateUrlAndContent(url: string, companyName: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); // 8 second timeout

    // Use GET instead of HEAD - many servers don't handle HEAD properly
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      }
    });

    clearTimeout(timeout);

    // Must be 200 OK (not redirect, not error)
    if (response.status !== 200) {
      console.warn(`URL returned status ${response.status}: ${url}`);
      return false;
    }

    // Check content type is HTML
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      console.warn(`URL is not HTML (${contentType}): ${url}`);
      return false;
    }

    // Get page content and verify company name appears
    const text = await response.text();
    const companyLower = companyName.toLowerCase();
    const textLower = text.toLowerCase();

    // Company name must appear in the actual page content
    if (!textLower.includes(companyLower)) {
      console.warn(`Company name "${companyName}" not found in page content: ${url}`);
      return false;
    }

    // Check for soft 404 indicators
    const soft404Indicators = [
      'page not found',
      'page doesn\'t exist',
      'page does not exist',
      '404',
      'not found',
      'no longer available',
      'has been removed',
      'content unavailable'
    ];

    for (const indicator of soft404Indicators) {
      if (textLower.includes(indicator)) {
        console.warn(`Soft 404 detected (${indicator}): ${url}`);
        return false;
      }
    }

    return true;
  } catch (err) {
    console.warn(`Failed to validate URL: ${url}`, err);
    return false;
  }
}

// Check if content is actually grounded (not hallucinated)
function isGroundedContent(content: string, title: string, companyName: string): boolean {
  const companyLower = companyName.toLowerCase();
  const contentLower = content.toLowerCase();
  const titleLower = title.toLowerCase();

  // Company name must appear in the actual content (not just claimed)
  const companyInContent = contentLower.includes(companyLower);
  const companyInTitle = titleLower.includes(companyLower);

  if (!companyInContent && !companyInTitle) {
    return false;
  }

  // Content must be substantial (not just a generic description)
  if (content.length < 50) {
    return false;
  }

  // Check for signs of hallucination - generic phrases without specifics
  const hallucinationIndicators = [
    'leading provider of',
    'trusted by',
    'helps organizations',
    'enables companies',
    'comprehensive solution',
    'industry-leading',
    'best-in-class',
    'world-class'
  ];

  const genericPhraseCount = hallucinationIndicators.filter(phrase =>
    contentLower.includes(phrase)
  ).length;

  // If content is mostly generic marketing speak without specific details, reject
  if (genericPhraseCount >= 3 && !contentLower.includes(companyLower)) {
    return false;
  }

  // Must have specific verifiable details - names, dates, or concrete facts
  const hasSpecificDetails =
    /\b(20\d{2})\b/.test(content) || // Year mentioned
    /\$[\d,]+/.test(content) || // Dollar amount
    /\d+%/.test(content) || // Percentage
    /\d+ (employees?|users?|customers?|years?)/.test(contentLower) || // Numbers with context
    contentLower.includes('announced') ||
    contentLower.includes('selected') ||
    contentLower.includes('deployed') ||
    contentLower.includes('implemented');

  return hasSpecificDetails || (companyInTitle && companyInContent);
}

export async function tavilySearchCompetitorMentions(
  companyName: string,
  apiKey: string
): Promise<CompetitorMention[]> {
  const mentions: CompetitorMention[] = [];
  const seenUrls = new Set<string>();

  // Import anti-hallucination module
  const { scoreAndFilterResults, generateCompetitorSearchQueries } = await import('./antiHallucination');

  // Search across all competitor sites using better query patterns
  for (const domain of COMPETITOR_DOMAINS) {
    const competitorName = COMPETITOR_NAMES[domain];

    try {
      // Use targeted queries that are less likely to return hallucinated results
      const queries = generateCompetitorSearchQueries(companyName, competitorName);

      // Run first two queries (press releases and announcements)
      const searchResults: TavilySearchResult[] = [];

      for (const query of queries.slice(0, 2)) {
        try {
          const response = await tavilySearch(query, apiKey, {
            maxResults: 3,
            includeAnswer: false,
            searchDepth: 'advanced'
          });
          searchResults.push(...response.results);
        } catch (err) {
          console.warn(`Search query failed: ${query}`, err);
        }
      }

      if (searchResults.length === 0) continue;

      // Apply anti-hallucination scoring
      const scoredResults = scoreAndFilterResults(
        searchResults.map(r => ({
          title: r.title,
          url: r.url,
          content: r.content,
          score: r.score
        })),
        companyName,
        competitorName,
        {
          minConfidence: 60,
          maxResults: 3,
          debug: process.env.NODE_ENV === 'development'
        }
      );

      for (const result of scoredResults) {
        // Skip duplicates
        if (seenUrls.has(result.url)) continue;
        seenUrls.add(result.url);

        // Additional business relationship check
        if (!isBusinessRelationship(result.content, result.title, companyName)) {
          continue;
        }

        mentions.push({
          competitorName,
          title: result.title,
          url: result.url,
          summary: createTechSummary(result.content, companyName),
          mentionType: inferMentionType(result.url, result.content),
          confidence: result.confidence,
          unverified: result.unverified
        });
      }
    } catch (err) {
      console.warn(`Failed to search competitor ${competitorName} for ${companyName}:`, err);
    }
  }

  // Sort by confidence (highest first)
  mentions.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));

  // Return top 10 mentions
  return mentions.slice(0, 10);
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
