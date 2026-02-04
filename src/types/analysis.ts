export interface AnalysisResult {
  summary: string;
  sentiment: 'BULLISH' | 'BEARISH' | 'MIXED' | 'NEUTRAL';
  quickFacts: QuickFacts;
  investorDocs: LinkItem[];
  keyPriorities: string[];
  growthInitiatives: string[];
  techNews: LinkItem[];
  caseStudies: LinkItem[];
  competitorMentions: CompetitorMentionItem[];
  leadershipChanges: LeadershipChangeItem[];
  maActivity: MAItem[];
  regulatoryLandscape: RegulatoryBodyMention[];
  regulatoryEvents: RegulatoryEventItem[];
  sources: string[];
}

export interface RegulatoryBodyMention {
  body: string; // e.g., SEC, FINRA, FCA, CFTC, ESMA
  context: string; // Brief description of the regulatory relationship
  url?: string; // Source URL
}

export interface RegulatoryEventSource {
  url: string;
  title?: string; // Source title/headline
  regulatoryBody?: string; // May differ between sources
}

export interface RegulatoryEventItem {
  date: string; // Year or specific date
  regulatoryBody: string; // Primary regulator
  eventType: 'fine' | 'penalty' | 'settlement' | 'enforcement' | 'investigation' | 'consent' | 'order' | 'action' | 'other';
  amount?: string; // Fine/penalty amount if applicable
  description: string; // Brief summary of the event
  url: string; // Primary link to news article or official source
  sources?: RegulatoryEventSource[]; // Additional sources for the same event
}

export interface QuickFacts {
  employeeCount?: string;
  headquarters?: string;
  industry?: string;
  founded?: string;
  ceo?: string;
  marketCap?: string;
  [key: string]: string | undefined;
}

export interface LinkItem {
  title: string;
  url: string;
  summary?: string;
}

export interface MAItem {
  year: string;
  type: string;
  target: string;
  dealValue?: string;
  rationale?: string;
}

export interface CompetitorMentionItem {
  competitorName: string;
  mentionType: 'customer' | 'partner' | 'comparison' | 'case_study' | 'press_release' | 'integration' | 'other';
  title: string;
  url: string;
  date?: string;
  summary: string;
}

export interface LeadershipChangeItem {
  name: string;
  role: string;
  changeType: 'appointed' | 'promoted' | 'departed' | 'expanded_role';
  date?: string;
  previousRole?: string;
  source?: string;
  url?: string;
}

export type ProviderName = 'openai' | 'anthropic' | 'gemini' | 'perplexity';

export interface ModelInfo {
  id: string;
  name: string;
  description: string;
}

export interface ProviderInfo {
  name: string;
  description: string;
  supportsWebGrounding: boolean;
  keyUrl: string;
  icon: string;
  models: ModelInfo[];
  defaultModel: string;
}

export const PROVIDER_INFO: Record<ProviderName, ProviderInfo> = {
  gemini: {
    name: 'Google Gemini',
    description: 'Fast and intelligent with Tavily search',
    supportsWebGrounding: false,
    keyUrl: 'https://aistudio.google.com/apikey',
    icon: 'sparkles',
    models: [
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: 'Fast and intelligent (recommended)' },
      { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', description: 'Fastest, low cost' },
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', description: 'Most capable' },
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', description: 'Legacy (retiring Mar 2026)' }
    ],
    defaultModel: 'gemini-2.5-flash'
  },
  perplexity: {
    name: 'Perplexity',
    description: 'Built-in web search with citations',
    supportsWebGrounding: true,
    keyUrl: 'https://www.perplexity.ai/settings/api',
    icon: 'search',
    models: [
      { id: 'sonar-pro', name: 'Sonar Pro', description: 'Most capable with search' },
      { id: 'sonar', name: 'Sonar', description: 'Fast with search' },
      { id: 'sonar-reasoning-pro', name: 'Sonar Reasoning Pro', description: 'Advanced reasoning' },
      { id: 'sonar-reasoning', name: 'Sonar Reasoning', description: 'Reasoning with search' }
    ],
    defaultModel: 'sonar-pro'
  },
  openai: {
    name: 'OpenAI',
    description: 'GPT models for high-quality analysis',
    supportsWebGrounding: false,
    keyUrl: 'https://platform.openai.com/api-keys',
    icon: 'brain',
    models: [
      { id: 'gpt-5.2', name: 'GPT-5.2', description: 'Most capable' },
      { id: 'gpt-5-mini', name: 'GPT-5 Mini', description: 'Fast and efficient' },
      { id: 'gpt-4o', name: 'GPT-4o', description: 'Fast and capable' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Lightweight' }
    ],
    defaultModel: 'gpt-5.2'
  },
  anthropic: {
    name: 'Anthropic Claude',
    description: 'Nuanced business analysis',
    supportsWebGrounding: false,
    keyUrl: 'https://console.anthropic.com/settings/keys',
    icon: 'message-square',
    models: [
      { id: 'claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5', description: 'Best balance of intelligence and speed (recommended)' },
      { id: 'claude-opus-4-5-20251101', name: 'Claude Opus 4.5', description: 'Most intelligent, complex reasoning' },
      { id: 'claude-haiku-4-5-20251201', name: 'Claude Haiku 4.5', description: 'Fastest, near-frontier performance' },
      { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', description: 'Previous generation' }
    ],
    defaultModel: 'claude-sonnet-4-5-20250929'
  }
};
