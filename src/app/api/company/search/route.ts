import { NextRequest, NextResponse } from 'next/server';

export interface CompanySearchResult {
  name: string;
  symbol?: string;
  description?: string;
  isPublic: boolean;
  publicStatus?: 'public' | 'private' | 'went_private' | 'pre_ipo' | 'unknown';
  isCustomSearch?: boolean; // True if this is a "search anyway" option
  source?: 'known' | 'yahoo' | 'custom';
}

// Common companies for fuzzy matching
// publicStatus: 'public' = currently traded, 'private' = never public, 'went_private' = was public, 'pre_ipo' = planning IPO
const KNOWN_COMPANIES = [
  { name: 'Apple', symbol: 'AAPL', aliases: ['apple inc', 'apple computer'], publicStatus: 'public' as const },
  { name: 'Microsoft', symbol: 'MSFT', aliases: ['microsoft corporation', 'msft'], publicStatus: 'public' as const },
  { name: 'Google', symbol: 'GOOGL', aliases: ['alphabet', 'alphabet inc', 'google llc'], publicStatus: 'public' as const },
  { name: 'Amazon', symbol: 'AMZN', aliases: ['amazon.com', 'amazon inc'], publicStatus: 'public' as const },
  { name: 'Meta', symbol: 'META', aliases: ['facebook', 'meta platforms', 'fb'], publicStatus: 'public' as const },
  { name: 'Tesla', symbol: 'TSLA', aliases: ['tesla motors', 'tesla inc'], publicStatus: 'public' as const },
  { name: 'NVIDIA', symbol: 'NVDA', aliases: ['nvidia corporation'], publicStatus: 'public' as const },
  { name: 'Netflix', symbol: 'NFLX', aliases: ['netflix inc'], publicStatus: 'public' as const },
  { name: 'Disney', symbol: 'DIS', aliases: ['walt disney', 'the walt disney company'], publicStatus: 'public' as const },
  { name: 'Walmart', symbol: 'WMT', aliases: ['walmart inc', 'wal-mart'], publicStatus: 'public' as const },
  { name: 'JPMorgan Chase', symbol: 'JPM', aliases: ['jp morgan', 'jpmorgan', 'chase bank'], publicStatus: 'public' as const },
  { name: 'Bank of America', symbol: 'BAC', aliases: ['bofa', 'boa', 'bankofamerica'], publicStatus: 'public' as const },
  { name: 'Visa', symbol: 'V', aliases: ['visa inc'], publicStatus: 'public' as const },
  { name: 'Mastercard', symbol: 'MA', aliases: ['mastercard inc'], publicStatus: 'public' as const },
  { name: 'Coca-Cola', symbol: 'KO', aliases: ['coke', 'coca cola', 'cocacola'], publicStatus: 'public' as const },
  { name: 'PepsiCo', symbol: 'PEP', aliases: ['pepsi', 'pepsico inc'], publicStatus: 'public' as const },
  { name: 'Intel', symbol: 'INTC', aliases: ['intel corporation'], publicStatus: 'public' as const },
  { name: 'AMD', symbol: 'AMD', aliases: ['advanced micro devices'], publicStatus: 'public' as const },
  { name: 'IBM', symbol: 'IBM', aliases: ['international business machines'], publicStatus: 'public' as const },
  { name: 'Oracle', symbol: 'ORCL', aliases: ['oracle corporation'], publicStatus: 'public' as const },
  { name: 'Salesforce', symbol: 'CRM', aliases: ['salesforce.com', 'salesforce inc'], publicStatus: 'public' as const },
  { name: 'Adobe', symbol: 'ADBE', aliases: ['adobe inc', 'adobe systems'], publicStatus: 'public' as const },
  { name: 'Cisco', symbol: 'CSCO', aliases: ['cisco systems'], publicStatus: 'public' as const },
  { name: 'AT&T', symbol: 'T', aliases: ['att', 'at and t'], publicStatus: 'public' as const },
  { name: 'Verizon', symbol: 'VZ', aliases: ['verizon communications'], publicStatus: 'public' as const },
  { name: 'T-Mobile', symbol: 'TMUS', aliases: ['tmobile', 't mobile'], publicStatus: 'public' as const },
  { name: 'Boeing', symbol: 'BA', aliases: ['the boeing company'], publicStatus: 'public' as const },
  { name: 'Ford', symbol: 'F', aliases: ['ford motor', 'ford motors'], publicStatus: 'public' as const },
  { name: 'General Motors', symbol: 'GM', aliases: ['gm', 'gmc'], publicStatus: 'public' as const },
  { name: 'Toyota', symbol: 'TM', aliases: ['toyota motor'], publicStatus: 'public' as const },
  { name: 'Nike', symbol: 'NKE', aliases: ['nike inc'], publicStatus: 'public' as const },
  { name: 'Starbucks', symbol: 'SBUX', aliases: ['starbucks corporation'], publicStatus: 'public' as const },
  { name: "McDonald's", symbol: 'MCD', aliases: ['mcdonalds', 'mcd'], publicStatus: 'public' as const },
  { name: 'Uber', symbol: 'UBER', aliases: ['uber technologies'], publicStatus: 'public' as const },
  { name: 'Lyft', symbol: 'LYFT', aliases: ['lyft inc'], publicStatus: 'public' as const },
  { name: 'Airbnb', symbol: 'ABNB', aliases: ['air bnb'], publicStatus: 'public' as const },
  { name: 'Spotify', symbol: 'SPOT', aliases: ['spotify technology'], publicStatus: 'public' as const },
  { name: 'Zoom', symbol: 'ZM', aliases: ['zoom video', 'zoom communications'], publicStatus: 'public' as const },
  { name: 'Shopify', symbol: 'SHOP', aliases: ['shopify inc'], publicStatus: 'public' as const },
  { name: 'PayPal', symbol: 'PYPL', aliases: ['paypal holdings'], publicStatus: 'public' as const },
  { name: 'Block', symbol: 'SQ', aliases: ['square', 'square inc'], publicStatus: 'public' as const },
  { name: 'Palantir', symbol: 'PLTR', aliases: ['palantir technologies'], publicStatus: 'public' as const },
  { name: 'Snowflake', symbol: 'SNOW', aliases: ['snowflake inc'], publicStatus: 'public' as const },
  { name: 'Coinbase', symbol: 'COIN', aliases: ['coinbase global'], publicStatus: 'public' as const },
  { name: 'Robinhood', symbol: 'HOOD', aliases: ['robinhood markets'], publicStatus: 'public' as const },
  { name: 'OpenAI', symbol: '', aliases: ['open ai'], publicStatus: 'private' as const },
  { name: 'Anthropic', symbol: '', aliases: [], publicStatus: 'private' as const },
  { name: 'Stripe', symbol: '', aliases: ['stripe inc'], publicStatus: 'pre_ipo' as const },
  { name: 'SpaceX', symbol: '', aliases: ['space x', 'spacex'], publicStatus: 'private' as const },
  { name: 'Twitter', symbol: '', aliases: ['x', 'x corp'], publicStatus: 'went_private' as const },
  { name: 'Dell Technologies', symbol: 'DELL', aliases: ['dell', 'dell inc'], publicStatus: 'public' as const },
  { name: 'Databricks', symbol: '', aliases: [], publicStatus: 'pre_ipo' as const },
  { name: 'Discord', symbol: '', aliases: [], publicStatus: 'private' as const },
  { name: 'Figma', symbol: 'FIG', aliases: ['figma inc'], publicStatus: 'public' as const },
  { name: 'Canva', symbol: '', aliases: [], publicStatus: 'private' as const },
  { name: 'Instacart', symbol: 'CART', aliases: ['maplebear'], publicStatus: 'public' as const },
  { name: 'Reddit', symbol: 'RDDT', aliases: [], publicStatus: 'public' as const },
  // Healthcare & Insurance (Public)
  { name: 'Cigna', symbol: 'CI', aliases: ['cigna healthcare', 'cigna corporation', 'cigna group', 'the cigna group'], publicStatus: 'public' as const },
  { name: 'UnitedHealth Group', symbol: 'UNH', aliases: ['unitedhealth', 'united health', 'united healthcare', 'unitedhealthcare'], publicStatus: 'public' as const },
  { name: 'Elevance Health', symbol: 'ELV', aliases: ['anthem', 'anthem inc', 'wellpoint'], publicStatus: 'public' as const },
  { name: 'Humana', symbol: 'HUM', aliases: ['humana inc'], publicStatus: 'public' as const },
  { name: 'CVS Health', symbol: 'CVS', aliases: ['cvs', 'cvs pharmacy', 'cvs caremark', 'aetna'], publicStatus: 'public' as const },
  { name: 'Centene', symbol: 'CNC', aliases: ['centene corporation'], publicStatus: 'public' as const },
  { name: 'Molina Healthcare', symbol: 'MOH', aliases: ['molina'], publicStatus: 'public' as const },
  // Asset Management & Financial Services (Public)
  { name: 'BlackRock', symbol: 'BLK', aliases: ['blackrock inc', 'black rock'], publicStatus: 'public' as const },
  { name: 'Vanguard Group', symbol: '', aliases: ['vanguard'], publicStatus: 'private' as const },
  { name: 'State Street', symbol: 'STT', aliases: ['state street corporation', 'state street corp'], publicStatus: 'public' as const },
  { name: 'Charles Schwab', symbol: 'SCHW', aliases: ['schwab', 'charles schwab corporation'], publicStatus: 'public' as const },
  { name: 'Morgan Stanley', symbol: 'MS', aliases: ['morgan stanley & co'], publicStatus: 'public' as const },
  { name: 'Goldman Sachs', symbol: 'GS', aliases: ['goldman sachs group', 'goldman'], publicStatus: 'public' as const },
  { name: 'Berkshire Hathaway', symbol: 'BRK.B', aliases: ['berkshire', 'warren buffett'], publicStatus: 'public' as const },
  { name: 'Citigroup', symbol: 'C', aliases: ['citi', 'citibank'], publicStatus: 'public' as const },
  { name: 'Wells Fargo', symbol: 'WFC', aliases: ['wells fargo & company'], publicStatus: 'public' as const },
  { name: 'American Express', symbol: 'AXP', aliases: ['amex', 'american express company'], publicStatus: 'public' as const },
  { name: 'Capital One', symbol: 'COF', aliases: ['capital one financial'], publicStatus: 'public' as const },
  { name: 'T. Rowe Price', symbol: 'TROW', aliases: ['t rowe price', 'troweprice'], publicStatus: 'public' as const },
  { name: 'Franklin Templeton', symbol: 'BEN', aliases: ['franklin resources', 'franklin templeton investments'], publicStatus: 'public' as const },
  { name: 'Invesco', symbol: 'IVZ', aliases: ['invesco ltd'], publicStatus: 'public' as const },
  // Insurance & Financial (Private/Mutual)
  { name: 'MassMutual', symbol: '', aliases: ['mass mutual', 'massachusetts mutual', 'mas mutual', 'massmutual life'], publicStatus: 'private' as const },
  { name: 'State Farm', symbol: '', aliases: ['statefarm'], publicStatus: 'private' as const },
  { name: 'Liberty Mutual', symbol: '', aliases: ['libertymutual'], publicStatus: 'private' as const },
  { name: 'Nationwide', symbol: '', aliases: ['nationwide insurance', 'nationwide mutual'], publicStatus: 'private' as const },
  { name: 'USAA', symbol: '', aliases: [], publicStatus: 'private' as const },
  { name: 'New York Life', symbol: '', aliases: ['ny life', 'newyork life'], publicStatus: 'private' as const },
  { name: 'Northwestern Mutual', symbol: '', aliases: ['northwestern'], publicStatus: 'private' as const },
  { name: 'Fidelity Investments', symbol: '', aliases: ['fidelity'], publicStatus: 'private' as const },
  { name: 'Edward Jones', symbol: '', aliases: [], publicStatus: 'private' as const },
  { name: 'Vanguard', symbol: '', aliases: ['vanguard group'], publicStatus: 'private' as const },
  // More tech private companies
  { name: 'Waymo', symbol: '', aliases: [], publicStatus: 'private' as const },
  { name: 'Cruise', symbol: '', aliases: ['cruise automation'], publicStatus: 'private' as const },
  { name: 'Epic Games', symbol: '', aliases: ['epic', 'fortnite'], publicStatus: 'private' as const },
  { name: 'Valve', symbol: '', aliases: ['valve corporation', 'steam'], publicStatus: 'private' as const },
  { name: 'ByteDance', symbol: '', aliases: ['tiktok', 'bytedance'], publicStatus: 'private' as const },
  { name: 'Shein', symbol: '', aliases: [], publicStatus: 'private' as const },
  { name: 'Klarna', symbol: '', aliases: [], publicStatus: 'pre_ipo' as const },
  { name: 'Revolut', symbol: '', aliases: [], publicStatus: 'private' as const },
  { name: 'Chime', symbol: '', aliases: [], publicStatus: 'private' as const },
  { name: 'Plaid', symbol: '', aliases: [], publicStatus: 'private' as const },
  // Went private
  { name: 'SolarWinds', symbol: 'SWI', aliases: [], publicStatus: 'public' as const },
  { name: 'McAfee', symbol: '', aliases: [], publicStatus: 'went_private' as const },
  { name: 'VMware', symbol: '', aliases: [], publicStatus: 'went_private' as const },
  { name: 'Citrix', symbol: '', aliases: [], publicStatus: 'went_private' as const },
];

// Calculate similarity score between two strings (Levenshtein-based)
function similarity(s1: string, s2: string): number {
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;

  if (longer.length === 0) return 1.0;

  const editDistance = levenshtein(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshtein(s1: string, s2: string): number {
  const costs: number[] = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
  }

  if (query.length > 200) {
    return NextResponse.json({ error: 'Query must be 200 characters or fewer' }, { status: 400 });
  }

  const normalizedQuery = query.toLowerCase().trim();

  // Find matching companies
  const matches: { company: typeof KNOWN_COMPANIES[0]; score: number }[] = [];

  for (const company of KNOWN_COMPANIES) {
    // Check exact match with name
    if (company.name.toLowerCase() === normalizedQuery) {
      matches.push({ company, score: 1.0 });
      continue;
    }

    // Check aliases
    const aliasMatch = company.aliases.some(alias => alias.toLowerCase() === normalizedQuery);
    if (aliasMatch) {
      matches.push({ company, score: 0.95 });
      continue;
    }

    // Check if query contains company name or vice versa
    if (company.name.toLowerCase().includes(normalizedQuery) ||
        normalizedQuery.includes(company.name.toLowerCase())) {
      matches.push({ company, score: 0.85 });
      continue;
    }

    // Calculate similarity score
    const nameScore = similarity(company.name.toLowerCase(), normalizedQuery);
    const aliasScores = company.aliases.map(alias => similarity(alias.toLowerCase(), normalizedQuery));
    const maxAliasScore = aliasScores.length > 0 ? Math.max(...aliasScores) : 0;
    const bestScore = Math.max(nameScore, maxAliasScore);

    if (bestScore >= 0.5) {
      matches.push({ company, score: bestScore });
    }
  }

  // Sort by score and take top 5
  matches.sort((a, b) => b.score - a.score);
  const topMatches = matches.slice(0, 5);

  const getStatusDescription = (company: typeof KNOWN_COMPANIES[0]): string => {
    switch (company.publicStatus) {
      case 'public':
        return company.symbol ? `${company.symbol} - Publicly traded` : 'Publicly traded';
      case 'private':
        return 'Private company';
      case 'went_private':
        return 'Formerly public (went private)';
      case 'pre_ipo':
        return 'Private (IPO expected)';
    }
  };

  const results: CompanySearchResult[] = topMatches.map(m => ({
    name: m.company.name,
    symbol: m.company.symbol || undefined,
    description: getStatusDescription(m.company),
    isPublic: m.company.publicStatus === 'public',
    publicStatus: m.company.publicStatus,
    source: 'known' as const
  }));

  // Check if we have an exact or very close match
  const hasExactMatch = matches.length > 0 && matches[0].score >= 0.9;

  // If hardcoded results are weak, also query Yahoo Finance for additional results
  if (topMatches.length === 0 || topMatches[0]?.score < 0.9 || topMatches.length < 3) {
    try {
      const yahooResponse = await fetch(
        `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(normalizedQuery)}&quotesCount=8&newsCount=0&enableFuzzyQuery=true&quotesQueryId=tss_match_phrase_query`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
          }
        }
      );
      if (yahooResponse.ok) {
        const yahooData = await yahooResponse.json();
        for (const quote of yahooData.quotes || []) {
          const name = (quote.shortname || quote.longname || quote.symbol) as string;
          if (!name) continue;

          // Skip if already in results (match by symbol or name similarity)
          const alreadyPresent = results.some(r =>
            (r.symbol && r.symbol === quote.symbol) ||
            r.name.toLowerCase() === name.toLowerCase()
          );
          if (alreadyPresent) continue;

          const isEquity = quote.quoteType === 'EQUITY';
          const exchange = (quote.exchange || '') as string;

          results.push({
            name,
            symbol: isEquity ? (quote.symbol as string) : undefined,
            description: isEquity
              ? `${quote.symbol} - ${exchange}`
              : `${(quote.quoteType as string) || 'Company'}`,
            isPublic: isEquity,
            publicStatus: isEquity ? 'public' : 'private',
            source: 'yahoo' as const
          });
        }
      }
    } catch {
      // Yahoo Finance failed, continue with hardcoded results only
    }
  }

  // Cap total results at 8 (hardcoded + Yahoo combined)
  const cappedResults = results.slice(0, 8);

  // Capitalize query for display
  const capitalizedQuery = query.trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

  // Always add a "search anyway" option if the query doesn't exactly match the top result
  const queryMatchesTopResult = cappedResults.length > 0 &&
    cappedResults[0].name.toLowerCase() === query.toLowerCase().trim();

  if (!queryMatchesTopResult && query.trim().length >= 2) {
    // Add the custom search option at the end
    cappedResults.push({
      name: capitalizedQuery,
      description: 'Search for this company',
      isPublic: true, // Assume public, will be determined during analysis
      publicStatus: 'unknown',
      isCustomSearch: true,
      source: 'custom' as const
    });
  }

  return NextResponse.json({
    results: cappedResults,
    exactMatch: hasExactMatch
  });
}
