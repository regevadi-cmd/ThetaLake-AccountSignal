import { LeadershipChangeItem } from '@/types/analysis';

interface RawLeadershipArticle {
  title: string;
  url: string;
  content: string;
}

/**
 * Parse leadership news articles to extract individual leadership changes
 * Uses pattern matching to extract names and roles from article content
 */
export function parseLeadershipArticles(
  articles: RawLeadershipArticle[],
  companyName: string
): LeadershipChangeItem[] {
  const changes: LeadershipChangeItem[] = [];
  const seenPeople = new Set<string>();

  for (const article of articles) {
    const extracted = extractLeadershipFromArticle(article, companyName);
    for (const change of extracted) {
      // Deduplicate by name+role
      const key = `${change.name.toLowerCase()}-${change.role.toLowerCase()}`;
      if (!seenPeople.has(key)) {
        seenPeople.add(key);
        changes.push(change);
      }
    }
  }

  return changes.slice(0, 8); // Limit to 8 results
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

      if (isValidName(name) && role && role.length > 2 && role.length < 80) {
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

    if (isValidName(name) && role) {
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
        if (text.toLowerCase().includes(title.toLowerCase())) {
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
  // Partial phrases
  'adviser to', 'advisor to', 'counsel to', 'assistant to',
  'head of', 'director of', 'manager of', 'leader of',
  // Company name patterns
  'inc announces', 'corp announces', 'llc announces', 'ltd announces',
];

function isValidName(name: string): boolean {
  const nameLower = name.toLowerCase().trim();

  // Check against fake names
  if (FAKE_NAMES.some(fake => nameLower === fake || nameLower.includes(fake))) {
    return false;
  }

  // Check against non-name phrases (titles, places, headline words)
  if (NOT_NAMES.some(phrase => nameLower === phrase || nameLower.startsWith(phrase) || nameLower.endsWith(phrase))) {
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

  // Reject if any part is a common title word
  const titleWords = ['chief', 'vice', 'president', 'director', 'officer', 'manager', 'executive', 'senior', 'head', 'board', 'adviser', 'advisor', 'counsel', 'assistant', 'announces', 'appoints', 'names', 'hires', 'promoted', 'appointed'];
  if (parts.some(p => titleWords.includes(p.toLowerCase()))) {
    return false;
  }

  // Reasonable length
  if (name.length < 5 || name.length > 40) {
    return false;
  }

  return true;
}
