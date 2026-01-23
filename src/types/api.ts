import { AnalysisResult, ProviderName } from './analysis';

export interface AnalyzeRequest {
  companyName: string;
  provider?: ProviderName;
  model?: string;
  apiKey?: string;
  webSearchApiKey?: string;
  tavilyApiKey?: string;
  forceRefresh?: boolean; // Skip cache and run fresh analysis
}

export interface CacheMetadata {
  analyzedAt: string; // ISO timestamp
  analyzedBy?: string; // User email who ran the analysis
  provider: ProviderName;
  model?: string;
  ageMinutes: number; // How old the cached data is
}

export interface AnalyzeResponse {
  data: AnalysisResult;
  cached: boolean;
  cacheMetadata?: CacheMetadata; // Present when cached=true
  provider: ProviderName;
  webSearchUsed?: boolean;
  webSearchError?: string;
}

export interface StockData {
  ticker: string;
  price: number;
  previousClose: number;
  change: number;
  changePercent: number;
  currency: string;
  marketState: string;
}

export interface ApiError {
  error: string;
  code?: string;
}
