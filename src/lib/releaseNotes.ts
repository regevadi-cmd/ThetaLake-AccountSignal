export interface ReleaseNote {
  version: string;
  date: string;
  highlights: string[];
  changes?: {
    category: 'Added' | 'Fixed' | 'Changed' | 'Removed';
    items: string[];
  }[];
}

export const releaseNotes: ReleaseNote[] = [
  {
    version: '1.2.1',
    date: '2026-02-05',
    highlights: [
      'Anti-hallucination filtering for competitor mentions',
      'URL validation with content verification',
    ],
    changes: [
      {
        category: 'Fixed',
        items: [
          'Competitor mentions no longer show hallucinated/fabricated results',
          'URLs are now validated by fetching actual page content',
          'Company name must appear in both URL path and page content',
          '404 errors and soft 404s are now properly detected and filtered',
          'Generic listing pages (/customers/, /case-studies/) are rejected',
        ],
      },
      {
        category: 'Changed',
        items: [
          'Competitor mentions require stricter validation before display',
          'Build number now updates correctly with each deployment',
        ],
      },
    ],
  },
  {
    version: '1.2.0',
    date: '2026-02-05',
    highlights: [
      'PDF export functionality',
      'Enhanced Claude Search with regulatory events',
      'Improved UI for regulatory landscape',
    ],
    changes: [
      {
        category: 'Added',
        items: [
          'PDF export using browser\'s native print-to-PDF',
          'Regulatory events search for Claude Search provider',
          'Competitor mentions search for Claude Search provider',
          'Release notes viewer in About modal',
        ],
      },
      {
        category: 'Fixed',
        items: [
          'Build info now displays correctly in About modal (was showing "unknown")',
          'Claude Web Search selection now saves properly in settings',
          'Model display bug - was showing gpt-4o when using Anthropic Claude',
          'Status messages now show correct model and search engine during analysis',
        ],
      },
      {
        category: 'Changed',
        items: [
          'Regulatory body labels shortened to acronyms (e.g., ESMA instead of full name)',
          'Competitor mentions filtering improved to focus on business relationships',
        ],
      },
    ],
  },
  {
    version: '1.1.5',
    date: '2025-02-04',
    highlights: [
      'Usage tracking and analytics',
      'Claude model updates',
    ],
    changes: [
      {
        category: 'Added',
        items: [
          'Usage tracking feature for monitoring API calls',
          'Claude Web Search option using Brave Search',
        ],
      },
      {
        category: 'Changed',
        items: [
          'Updated Claude models to latest versions',
        ],
      },
    ],
  },
  {
    version: '1.1.0',
    date: '2025-01-30',
    highlights: [
      'Multi-provider AI support',
      'Shared caching system',
      'User authentication',
    ],
    changes: [
      {
        category: 'Added',
        items: [
          'Support for OpenAI, Anthropic, Google Gemini, and Perplexity',
          'Shared analysis cache across users',
          'Supabase authentication integration',
          'Bookmarks and history functionality',
          'Settings persistence per user',
        ],
      },
    ],
  },
  {
    version: '1.0.0',
    date: '2025-01-25',
    highlights: [
      'Initial release',
      'AI-powered company analysis',
      'Real-time stock data',
    ],
    changes: [
      {
        category: 'Added',
        items: [
          'Company search with autocomplete',
          'AI-generated executive summaries',
          'Real-time stock data and charts',
          'Key priorities and growth initiatives',
          'M&A activity tracking',
          'Leadership changes monitoring',
          'Regulatory landscape overview',
          'Tech news and case studies',
          'Investor documents discovery',
        ],
      },
    ],
  },
];
