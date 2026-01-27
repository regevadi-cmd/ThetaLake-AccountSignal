import { LeadershipChangeItem } from '@/types/analysis';

interface RawLeadershipArticle {
  title: string;
  url: string;
  content: string;
}

// Reputable sources for leadership news (prioritized)
const REPUTABLE_SOURCES = [
  'reuters.com', 'bloomberg.com', 'wsj.com', 'ft.com', 'cnbc.com',
  'businessinsider.com', 'forbes.com', 'fortune.com', 'barrons.com',
  'marketwatch.com', 'thestreet.com', 'investopedia.com',
  'prnewswire.com', 'businesswire.com', 'globenewswire.com',
  // Company newsrooms are authoritative
  'newsroom.', '.com/newsroom', '/news/', '/press/',
];

// Sources to skip entirely
const SKIP_SOURCES = [
  'linkedin.com', 'facebook.com', 'twitter.com', 'x.com',
  'glassdoor.com', 'indeed.com', 'ziprecruiter.com',
  'wikipedia.org', 'reddit.com',
];

/**
 * Extract date from article title or content
 */
function extractDate(title: string, content: string): string | undefined {
  const text = `${title} ${content}`;

  // Common date patterns
  const patterns = [
    // "January 15, 2024" or "Jan 15, 2024"
    /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},?\s+20\d{2}\b/i,
    // "15 January 2024" or "15 Jan 2024"
    /\b\d{1,2}\s+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+20\d{2}\b/i,
    // "2024-01-15" ISO format
    /\b20\d{2}-\d{2}-\d{2}\b/,
    // "01/15/2024" or "15/01/2024"
    /\b\d{1,2}\/\d{1,2}\/20\d{2}\b/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[0];
    }
  }

  // Try to extract just month and year
  const monthYearMatch = text.match(/\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+20\d{2}\b/i);
  if (monthYearMatch) {
    return monthYearMatch[0];
  }

  return undefined;
}

/**
 * Normalize title for deduplication comparison
 */
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Check if two titles are similar (for deduplication)
 */
function titlesSimilar(title1: string, title2: string): boolean {
  const norm1 = normalizeTitle(title1);
  const norm2 = normalizeTitle(title2);

  // Exact match after normalization
  if (norm1 === norm2) return true;

  // One contains the other (for shortened versions)
  if (norm1.includes(norm2) || norm2.includes(norm1)) return true;

  // Check word overlap (Jaccard similarity > 0.6)
  const words1 = new Set(norm1.split(' ').filter(w => w.length > 2));
  const words2 = new Set(norm2.split(' ').filter(w => w.length > 2));
  const intersection = [...words1].filter(w => words2.has(w)).length;
  const union = new Set([...words1, ...words2]).size;

  if (union > 0 && intersection / union > 0.6) return true;

  return false;
}

/**
 * Convert leadership news articles to displayable items
 * Shows article headlines with links - more reliable than regex name parsing
 * Focuses on last 5 years from reputable sources
 */
export function parseLeadershipArticles(
  articles: RawLeadershipArticle[],
  _companyName: string
): LeadershipChangeItem[] {
  const seenUrls = new Set<string>();
  const seenTitles: string[] = [];

  // Sort articles by source reputation (reputable sources first)
  const sortedArticles = [...articles].sort((a, b) => {
    const aReputable = REPUTABLE_SOURCES.some(s => a.url.toLowerCase().includes(s));
    const bReputable = REPUTABLE_SOURCES.some(s => b.url.toLowerCase().includes(s));
    if (aReputable && !bReputable) return -1;
    if (!aReputable && bReputable) return 1;
    return 0;
  });

  const results: LeadershipChangeItem[] = [];

  for (const article of sortedArticles) {
    // Skip unreliable sources
    if (SKIP_SOURCES.some(s => article.url.toLowerCase().includes(s))) {
      continue;
    }

    // Skip URL duplicates
    if (seenUrls.has(article.url)) {
      continue;
    }
    seenUrls.add(article.url);

    // Clean title - remove site name suffixes
    const title = article.title
      .replace(/\s*[-|]\s*(Reuters|Bloomberg|CNBC|Forbes|WSJ|Yahoo Finance|Business Wire|PR Newswire).*$/i, '')
      .replace(/\s*[-|]\s*[A-Za-z]+\.[a-z]+$/i, '')
      .trim();

    // Skip if title is too similar to one we already have (content deduplication)
    if (seenTitles.some(seen => titlesSimilar(seen, title))) {
      continue;
    }
    seenTitles.push(title);

    // Extract source hostname
    let source = '';
    try {
      source = new URL(article.url).hostname.replace('www.', '');
    } catch {
      source = 'Source';
    }

    // Extract date from article
    const date = extractDate(article.title, article.content || '');

    // Use article title as the display, content as summary
    results.push({
      name: title,
      role: article.content?.substring(0, 180) || '',
      changeType: 'appointed',
      date,
      url: article.url,
      source
    });

    if (results.length >= 6) break;
  }

  return results;
}

function extractLeadershipFromArticle(
  article: RawLeadershipArticle,
  companyName: string
): LeadershipChangeItem[] {
  const changes: LeadershipChangeItem[] = [];
  const text = `${article.title} ${article.content}`;

  // Extract source hostname
  let source = '';
  try {
    source = new URL(article.url).hostname.replace('www.', '');
  } catch {
    source = 'Source';
  }

  // Common executive titles
  const titlePatterns = [
    'CEO', 'CFO', 'CTO', 'COO', 'CMO', 'CIO', 'CISO', 'CPO', 'CRO',
    'Chief Executive Officer', 'Chief Financial Officer', 'Chief Technology Officer',
    'Chief Operating Officer', 'Chief Marketing Officer', 'Chief Information Officer',
    'Chief Information Security Officer', 'Chief Product Officer', 'Chief Revenue Officer',
    'President', 'Co-President', 'Vice President', 'VP', 'SVP', 'EVP',
    'Senior Vice President', 'Executive Vice President',
    'Managing Director', 'General Manager', 'Director', 'Head of',
    'Chairman', 'Chair', 'Board Member'
  ];

  // Pattern: "[Name] as/to [Role]" or "[Name] to serve as [Role]"
  const asPatterns = [
    /(?:named|appointed|promoted|hired|tapped|elevated)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\s+(?:as|to serve as|to be|to the position of|to the role of)\s+([^,.\n]+)/gi,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\s+(?:has been|was|is)\s+(?:named|appointed|promoted|hired)\s+(?:as\s+)?([^,.\n]+)/gi,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\s+will\s+(?:serve as|be|become)\s+([^,.\n]+)/gi,
  ];

  for (const pattern of asPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const name = cleanName(match[1]);
      const role = cleanRole(match[2], titlePatterns);

      if (isValidName(name) && role && role.length > 2 && role.length < 80 && !isPoliticalRole(role)) {
        changes.push({
          name,
          role,
          changeType: 'appointed',
          url: article.url,
          source
        });
      }
    }
  }

  // Pattern: "[Role], [Name]" or "[Name], [Role]"
  const titleRegex = titlePatterns.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const roleNamePattern = new RegExp(
    `(${titleRegex})(?:\\s+of\\s+[A-Za-z\\s]+)?[,:]\\s*([A-Z][a-z]+(?:\\s+[A-Z][a-z]+){1,3})`,
    'gi'
  );

  let match;
  while ((match = roleNamePattern.exec(text)) !== null) {
    const role = cleanRole(match[1], titlePatterns);
    const name = cleanName(match[2]);

    if (isValidName(name) && role && !isPoliticalRole(role)) {
      // Check if we already have this person
      const exists = changes.some(c =>
        c.name.toLowerCase() === name.toLowerCase()
      );
      if (!exists) {
        changes.push({
          name,
          role,
          changeType: 'appointed',
          url: article.url,
          source
        });
      }
    }
  }

  // If no structured extraction worked, try to find any names with titles mentioned nearby
  if (changes.length === 0) {
    const namePattern = /([A-Z][a-z]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-z]+)/g;
    const names: string[] = [];
    while ((match = namePattern.exec(text)) !== null) {
      const name = cleanName(match[1]);
      if (isValidName(name) && !names.includes(name)) {
        names.push(name);
      }
    }

    // For each valid name, try to find a nearby title
    for (const name of names.slice(0, 3)) {
      for (const title of titlePatterns) {
        if (text.toLowerCase().includes(title.toLowerCase()) && !isPoliticalRole(title)) {
          // Check if name and title are within ~100 chars of each other
          const nameIdx = text.toLowerCase().indexOf(name.toLowerCase());
          const titleIdx = text.toLowerCase().indexOf(title.toLowerCase());
          if (nameIdx !== -1 && titleIdx !== -1 && Math.abs(nameIdx - titleIdx) < 100) {
            changes.push({
              name,
              role: title,
              changeType: 'appointed',
              url: article.url,
              source
            });
            break;
          }
        }
      }
    }
  }

  return changes;
}

function cleanName(name: string): string {
  return name
    .trim()
    .replace(/^(Mr\.|Ms\.|Mrs\.|Dr\.)\s*/i, '')
    .replace(/\s+/g, ' ');
}

function cleanRole(role: string, validTitles: string[]): string {
  let cleaned = role
    .trim()
    .replace(/^(the|a|an)\s+/i, '')
    .replace(/\s+/g, ' ')
    .replace(/[,;.]$/, '');

  // Truncate at common stop words
  const stopWords = [' and ', ' while ', ' where ', ' who ', ' effective ', ' starting ', ' beginning '];
  for (const stop of stopWords) {
    const idx = cleaned.toLowerCase().indexOf(stop);
    if (idx > 0) {
      cleaned = cleaned.substring(0, idx);
    }
  }

  // Ensure it contains a valid title keyword
  const hasTitle = validTitles.some(t =>
    cleaned.toLowerCase().includes(t.toLowerCase())
  );

  if (!hasTitle && cleaned.length > 40) {
    return '';
  }

  return cleaned;
}

// Common fake/placeholder names that LLMs often generate
const FAKE_NAMES = [
  'john doe', 'jane doe', 'john smith', 'jane smith',
  'bob smith', 'alice smith', 'mary smith', 'james smith',
  'michael johnson', 'sarah johnson', 'david williams', 'jennifer brown',
  'robert jones', 'patricia davis', 'william miller', 'linda wilson',
  'example person', 'sample name', 'test user', 'placeholder'
];

// Words/phrases that look like names but aren't (titles, places, common headline words)
const NOT_NAMES = [
  // Job titles that look like names
  'vice president', 'chief executive', 'chief operating', 'chief financial',
  'chief technology', 'chief marketing', 'chief information', 'chief product',
  'chief revenue', 'chief people', 'chief strategy', 'chief legal',
  'managing director', 'general manager', 'senior director', 'executive director',
  'senior vice', 'executive vice', 'group vice', 'regional vice',
  'board member', 'board director', 'advisory board',
  // Common headline fragments
  'white house', 'wall street', 'silicon valley', 'new york', 'los angeles',
  'san francisco', 'announces new', 'names new', 'appoints new', 'hires new',
  'promoted to', 'steps down', 'steps up', 'takes over', 'joins as',
  'company announces', 'firm announces', 'corporation announces',
  'changes chair', 'names chair', 'elects chair', 'appoints chair',
  // Partial phrases
  'adviser to', 'advisor to', 'counsel to', 'assistant to',
  'head of', 'director of', 'manager of', 'leader of',
  // Company name patterns
  'inc announces', 'corp announces', 'llc announces', 'ltd announces',
  // Webpage elements
  'your privacy', 'privacy policy', 'cookie policy', 'terms of', 'sign in',
  'sign up', 'subscribe now', 'read more', 'learn more', 'click here',
  'breaking news', 'latest news', 'top stories', 'related articles',
  // Common research/analyst firms (not people)
  'argus research', 'morningstar research', 'goldman sachs', 'morgan stanley',
  'jp morgan', 'bank of america', 'wells fargo', 'citigroup', 'barclays',
  'credit suisse', 'deutsche bank', 'ubs research', 'jefferies research',
];

// Company name suffixes and patterns that indicate it's not a person's name
const COMPANY_INDICATORS = [
  'research', 'capital', 'partners', 'holdings', 'group', 'fund', 'trust',
  'investments', 'securities', 'financial', 'consulting', 'advisors',
  'associates', 'solutions', 'services', 'management', 'ventures',
  'analytics', 'technologies', 'systems', 'networks', 'media', 'global',
  'international', 'corp', 'inc', 'llc', 'ltd', 'plc', 'sa', 'ag',
];

// Well-known public figures who are NOT company executives
const PUBLIC_FIGURES = [
  // US Politicians
  'joe biden', 'donald trump', 'barack obama', 'kamala harris', 'mike pence',
  'nancy pelosi', 'mitch mcconnell', 'chuck schumer', 'kevin mccarthy',
  'hillary clinton', 'bill clinton', 'george bush', 'george w bush',
  // World Leaders
  'justin trudeau', 'boris johnson', 'rishi sunak', 'emmanuel macron',
  'angela merkel', 'vladimir putin', 'xi jinping',
  // Tech celebrities (often mentioned in articles but not as executives)
  'elon musk', // unless actually at the company
];

// Government/political roles that should be filtered out
const POLITICAL_ROLES = [
  'president of the united states', 'vice president of the united states',
  'senator', 'congressman', 'congresswoman', 'representative',
  'secretary of', 'minister of', 'prime minister', 'governor',
  'mayor', 'ambassador', 'white house', 'administration',
];

function isValidName(name: string): boolean {
  const nameLower = name.toLowerCase().trim();

  // Check against fake names
  if (FAKE_NAMES.some(fake => nameLower === fake || nameLower.includes(fake))) {
    return false;
  }

  // Check against well-known public figures
  if (PUBLIC_FIGURES.some(figure => nameLower === figure)) {
    return false;
  }

  // Check against non-name phrases (titles, places, headline words, webpage elements)
  if (NOT_NAMES.some(phrase => nameLower === phrase || nameLower.startsWith(phrase) || nameLower.endsWith(phrase))) {
    return false;
  }

  // Check if it looks like a company name (contains company indicators)
  if (COMPANY_INDICATORS.some(indicator => nameLower.includes(indicator))) {
    return false;
  }

  // Must have at least first and last name
  const parts = name.split(/\s+/);
  if (parts.length < 2) {
    return false;
  }

  // Each part should start with capital letter
  if (!parts.every(p => /^[A-Z]/.test(p))) {
    return false;
  }

  // First name should be at least 2 characters (catches "A Smith" type errors)
  if (parts[0].length < 2) {
    return false;
  }

  // Last name should be at least 2 characters
  if (parts[parts.length - 1].length < 2) {
    return false;
  }

  // Reject if any part is a common title word or action word
  const titleWords = [
    'chief', 'vice', 'president', 'director', 'officer', 'manager', 'executive',
    'senior', 'head', 'board', 'adviser', 'advisor', 'counsel', 'assistant',
    'announces', 'appoints', 'names', 'hires', 'promoted', 'appointed',
    'changes', 'elects', 'nominates', 'selects', 'picks', 'taps',
    'privacy', 'policy', 'terms', 'cookie', 'subscribe', 'breaking', 'latest'
  ];
  if (parts.some(p => titleWords.includes(p.toLowerCase()))) {
    return false;
  }

  // Reasonable length
  if (name.length < 5 || name.length > 40) {
    return false;
  }

  return true;
}

// Check if a role is a political/government role (not corporate)
function isPoliticalRole(role: string): boolean {
  const roleLower = role.toLowerCase();

  // Check for political role keywords
  if (POLITICAL_ROLES.some(pr => roleLower.includes(pr))) {
    return true;
  }

  // "President" alone (not "President of [Company]" or "Co-President") is likely political
  if (roleLower === 'president' || roleLower === 'the president') {
    return true;
  }

  return false;
}
