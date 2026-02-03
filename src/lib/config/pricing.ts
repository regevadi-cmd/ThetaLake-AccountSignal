/**
 * AI and Search Provider Pricing Configuration
 * Prices are in USD per 1 million tokens (for AI) or per query (for search)
 * Updated: February 2026
 */

export interface ModelPricing {
  inputPer1M: number;  // USD per 1M input tokens
  outputPer1M: number; // USD per 1M output tokens
}

export interface SearchPricing {
  perQuery: number; // USD per search query
}

// AI Model Pricing (USD per 1M tokens)
export const AI_PRICING: Record<string, Record<string, ModelPricing>> = {
  gemini: {
    'gemini-2.5-flash': { inputPer1M: 0.075, outputPer1M: 0.30 },
    'gemini-2.5-flash-lite': { inputPer1M: 0.02, outputPer1M: 0.10 },
    'gemini-2.5-pro': { inputPer1M: 1.25, outputPer1M: 5.00 },
    'gemini-2.0-flash': { inputPer1M: 0.10, outputPer1M: 0.40 },
    // Default fallback
    default: { inputPer1M: 0.10, outputPer1M: 0.40 },
  },
  openai: {
    'gpt-5.2': { inputPer1M: 5.00, outputPer1M: 15.00 },
    'gpt-5-mini': { inputPer1M: 0.60, outputPer1M: 2.40 },
    'gpt-4o': { inputPer1M: 2.50, outputPer1M: 10.00 },
    'gpt-4o-mini': { inputPer1M: 0.15, outputPer1M: 0.60 },
    default: { inputPer1M: 2.50, outputPer1M: 10.00 },
  },
  anthropic: {
    'claude-sonnet-4-20250514': { inputPer1M: 3.00, outputPer1M: 15.00 },
    'claude-3-5-sonnet-20241022': { inputPer1M: 3.00, outputPer1M: 15.00 },
    'claude-3-5-haiku-20241022': { inputPer1M: 0.80, outputPer1M: 4.00 },
    'claude-3-opus-20240229': { inputPer1M: 15.00, outputPer1M: 75.00 },
    default: { inputPer1M: 3.00, outputPer1M: 15.00 },
  },
  perplexity: {
    'sonar-pro': { inputPer1M: 3.00, outputPer1M: 15.00 },
    'sonar': { inputPer1M: 1.00, outputPer1M: 1.00 },
    'sonar-reasoning-pro': { inputPer1M: 2.00, outputPer1M: 8.00 },
    'sonar-reasoning': { inputPer1M: 1.00, outputPer1M: 5.00 },
    default: { inputPer1M: 3.00, outputPer1M: 15.00 },
  },
};

// Search Provider Pricing (USD per query)
export const SEARCH_PRICING: Record<string, SearchPricing> = {
  tavily: { perQuery: 0.01 },
  websearchapi: { perQuery: 0.005 },
  none: { perQuery: 0 },
};

// Number of Tavily queries per analysis (approximate)
export const TAVILY_QUERIES_PER_ANALYSIS = 7; // news, case studies, info, investor docs, competitors, leadership, regulatory

/**
 * Calculate AI cost based on token usage
 */
export function calculateAICost(
  provider: string,
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const providerPricing = AI_PRICING[provider] || AI_PRICING.gemini;
  const modelPricing = providerPricing[model] || providerPricing.default;

  const inputCost = (inputTokens / 1_000_000) * modelPricing.inputPer1M;
  const outputCost = (outputTokens / 1_000_000) * modelPricing.outputPer1M;

  return inputCost + outputCost;
}

/**
 * Calculate search cost based on number of queries
 */
export function calculateSearchCost(
  provider: string,
  queryCount: number
): number {
  const pricing = SEARCH_PRICING[provider] || SEARCH_PRICING.none;
  return queryCount * pricing.perQuery;
}

/**
 * Estimate tokens from text (rough approximation: 1 token ≈ 4 characters)
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Format cost for display
 */
export function formatCost(cost: number): string {
  if (cost < 0.01) {
    return `$${cost.toFixed(4)}`;
  }
  return `$${cost.toFixed(2)}`;
}
