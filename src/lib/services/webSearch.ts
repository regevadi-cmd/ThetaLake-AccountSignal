export interface WebSearchResult {
  title: string;
  url: string;
  description: string;
  content?: string;
  position: number;
  score: number;
}

export interface WebSearchResponse {
  answer?: string;
  organic: WebSearchResult[];
  responseTime: number;
}

export interface WebSearchOptions {
  maxResults?: number;
  includeContent?: boolean;
  includeAnswer?: boolean;
  timeframe?: 'day' | 'week' | 'month' | 'year';
}

const WEB_SEARCH_API_URL = 'https://api.websearchapi.ai/ai-search';

export async function searchWeb(
  query: string,
  apiKey: string,
  options: WebSearchOptions = {}
): Promise<WebSearchResponse> {
  const {
    maxResults = 10,
    includeContent = true,
    includeAnswer = true,
    timeframe = 'month'
  } = options;

  const response = await fetch(WEB_SEARCH_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      query,
      maxResults,
      includeContent,
      contentLength: 'medium',
      contentFormat: 'markdown',
      country: 'us',
      language: 'en',
      timeframe,
      includeAnswer,
      safeSearch: true
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`WebSearchAPI error: ${error}`);
  }

  return response.json();
}

export async function searchCompanyNews(
  companyName: string,
  apiKey: string
): Promise<WebSearchResult[]> {
  const response = await searchWeb(
    `${companyName} latest news technology AI`,
    apiKey,
    { maxResults: 10, includeContent: false, includeAnswer: false, timeframe: 'month' }
  );
  return response.organic;
}

export async function searchCompanyCaseStudies(
  companyName: string,
  apiKey: string
): Promise<WebSearchResult[]> {
  const response = await searchWeb(
    `${companyName} case study customer success AWS Microsoft Google Salesforce`,
    apiKey,
    { maxResults: 5, includeContent: false, includeAnswer: false, timeframe: 'year' }
  );
  return response.organic;
}

export async function searchCompanyInfo(
  companyName: string,
  apiKey: string
): Promise<{ answer: string; sources: WebSearchResult[] }> {
  const response = await searchWeb(
    `${companyName} company overview business strategy recent developments`,
    apiKey,
    { maxResults: 5, includeContent: true, includeAnswer: true, timeframe: 'month' }
  );
  return {
    answer: response.answer || '',
    sources: response.organic
  };
}

export async function searchInvestorDocuments(
  companyName: string,
  apiKey: string
): Promise<WebSearchResult[]> {
  const response = await searchWeb(
    `${companyName} investor relations annual report 10-K SEC filing earnings`,
    apiKey,
    { maxResults: 5, includeContent: false, includeAnswer: false, timeframe: 'year' }
  );
  return response.organic;
}

export async function searchInvestorPresentation(
  companyName: string,
  apiKey: string
): Promise<WebSearchResult[]> {
  const response = await searchWeb(
    `"${companyName}" investor presentation latest investor day`,
    apiKey,
    { maxResults: 1, includeContent: false, includeAnswer: false, timeframe: 'year' }
  );
  return response.organic;
}
