import { NextRequest, NextResponse } from 'next/server';
import { createAIProvider } from '@/lib/ai/factory';
import { AnalyzeRequest, AnalyzeResponse, ApiError, CacheMetadata } from '@/types/api';
import { ProviderName, PROVIDER_INFO, AnalysisResult } from '@/types/analysis';
import { searchCompanyNews, searchCompanyCaseStudies, searchCompanyInfo, searchInvestorDocuments } from '@/lib/services/webSearch';
import { tavilySearchCompanyNews, tavilySearchCaseStudies, tavilySearchCompanyInfo, tavilySearchInvestorDocs, tavilySearchCompetitorMentions, tavilySearchLeadershipChanges, tavilySearchRegulatoryEvents, CompetitorMention, RegulatoryEvent } from '@/lib/services/tavilySearch';
import { createClient } from '@/lib/supabase/server';
import { parseLeadershipArticles } from '@/lib/ai/parseLeadershipNews';

// Cache expiry: 24 hours (in minutes)
const CACHE_EXPIRY_MINUTES = 24 * 60;

// Type for cached analysis record
interface CachedAnalysis {
  id: string;
  company_name: string;
  analysis_data: AnalysisResult;
  provider: string;
  model: string | null;
  web_search_used: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
  creator_email?: string;
}

// Type for server settings
interface ServerSettings {
  default_provider: string;
  openai_api_key: string | null;
  anthropic_api_key: string | null;
  gemini_api_key: string | null;
  perplexity_api_key: string | null;
  openai_model: string;
  anthropic_model: string;
  gemini_model: string;
  perplexity_model: string;
  web_search_provider: string;
  tavily_api_key: string | null;
  websearchapi_key: string | null;
}

// Get API key for a provider from settings
function getProviderApiKey(settings: ServerSettings, provider: ProviderName): string | null {
  switch (provider) {
    case 'openai': return settings.openai_api_key;
    case 'anthropic': return settings.anthropic_api_key;
    case 'gemini': return settings.gemini_api_key;
    case 'perplexity': return settings.perplexity_api_key;
    default: return null;
  }
}

// Get model for a provider from settings
function getProviderModel(settings: ServerSettings, provider: ProviderName): string {
  switch (provider) {
    case 'openai': return settings.openai_model || 'gpt-4o';
    case 'anthropic': return settings.anthropic_model || 'claude-sonnet-4-20250514';
    case 'gemini': return settings.gemini_model || 'gemini-2.0-flash';
    case 'perplexity': return settings.perplexity_model || 'sonar-pro';
    default: return 'gpt-4o';
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: AnalyzeRequest = await request.json();
    const {
      companyName,
      provider: clientProvider,
      model: clientModel,
      apiKey: clientApiKey,
      webSearchApiKey: clientWebSearchApiKey,
      tavilyApiKey: clientTavilyApiKey,
      forceRefresh = false
    } = body;

    // Validate input
    if (!companyName?.trim()) {
      return NextResponse.json<ApiError>(
        { error: 'Company name is required' },
        { status: 400 }
      );
    }

    // Fetch server settings from Supabase
    const supabase = await createClient();

    // Get current user for cache attribution
    const { data: { user } } = await supabase.auth.getUser();

    // Check for cached analysis (unless forceRefresh is true)
    const companyNameLower = companyName.trim().toLowerCase();

    if (!forceRefresh) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: cachedAnalysis } = await (supabase as any)
        .from('company_analyses')
        .select(`
          *,
          creator:profiles!company_analyses_created_by_fkey(email)
        `)
        .eq('company_name_lower', companyNameLower)
        .single();

      if (cachedAnalysis) {
        const cached = cachedAnalysis as CachedAnalysis & { creator: { email: string } | null };
        const updatedAt = new Date(cached.updated_at);
        const ageMinutes = Math.floor((Date.now() - updatedAt.getTime()) / 60000);

        // Return cached data with metadata
        const cacheMetadata: CacheMetadata = {
          analyzedAt: cached.updated_at,
          analyzedBy: cached.creator?.email || undefined,
          provider: cached.provider as ProviderName,
          model: cached.model || undefined,
          ageMinutes
        };

        console.log(`Returning cached analysis for "${companyName}" (${ageMinutes} minutes old)`);

        return NextResponse.json<AnalyzeResponse>({
          data: cached.analysis_data,
          cached: true,
          cacheMetadata,
          provider: cached.provider as ProviderName,
          webSearchUsed: cached.web_search_used
        });
      }
    }
    const { data: settings } = await supabase
      .from('app_settings')
      .select('*')
      .single();

    // Type assertion for settings
    const serverSettings = settings as ServerSettings | null;

    // Determine provider - use server default if not specified by client
    const provider = clientProvider || serverSettings?.default_provider || 'openai';

    if (!['openai', 'anthropic', 'gemini', 'perplexity'].includes(provider)) {
      return NextResponse.json<ApiError>(
        { error: 'Valid provider is required (openai, anthropic, gemini, or perplexity)' },
        { status: 400 }
      );
    }

    // Get API key - prefer server settings, fall back to client-provided (for local dev)
    const apiKey = (serverSettings ? getProviderApiKey(serverSettings, provider as ProviderName) : null) || clientApiKey;

    if (!apiKey?.trim()) {
      return NextResponse.json<ApiError>(
        { error: 'API key not configured. Please contact an administrator.' },
        { status: 401 }
      );
    }

    // Get model - prefer client-specified, then server settings, then default
    const model = clientModel || (serverSettings ? getProviderModel(serverSettings, provider as ProviderName) : undefined);

    // Get web search keys - prefer server settings
    const webSearchProvider = serverSettings?.web_search_provider || 'none';
    const tavilyApiKey = serverSettings?.tavily_api_key || clientTavilyApiKey;
    const webSearchApiKey = serverSettings?.websearchapi_key || clientWebSearchApiKey;

    const providerInfo = PROVIDER_INFO[provider as ProviderName];
    const useTavily = !providerInfo.supportsWebGrounding && webSearchProvider === 'tavily' && !!tavilyApiKey;
    const useWebSearchApi = !providerInfo.supportsWebGrounding && webSearchProvider === 'websearchapi' && !!webSearchApiKey;
    const shouldUseWebSearch = useTavily || useWebSearchApi;
    let webSearchData = null;
    let webSearchError: string | null = null;
    const webSearchProviderName = useTavily ? 'Tavily' : 'WebSearchAPI';

    // If provider doesn't have native web grounding and we have a web search API key,
    // fetch real-time web data to augment the analysis
    if (shouldUseWebSearch) {
      try {
        if (useTavily) {
          // Use Tavily for web search
          const [newsResults, caseStudyResults, infoResults, investorDocsResults, competitorMentionsResults, leadershipResults, regulatoryResults] = await Promise.all([
            tavilySearchCompanyNews(companyName.trim(), tavilyApiKey!),
            tavilySearchCaseStudies(companyName.trim(), tavilyApiKey!),
            tavilySearchCompanyInfo(companyName.trim(), tavilyApiKey!),
            tavilySearchInvestorDocs(companyName.trim(), tavilyApiKey!),
            tavilySearchCompetitorMentions(companyName.trim(), tavilyApiKey!),
            tavilySearchLeadershipChanges(companyName.trim(), tavilyApiKey!),
            tavilySearchRegulatoryEvents(companyName.trim(), tavilyApiKey!)
          ]);

          webSearchData = {
            news: newsResults.map(r => ({ title: r.title, url: r.url, description: r.content })),
            caseStudies: caseStudyResults.map(r => ({ title: r.title, url: r.url, description: r.content })),
            info: { sources: infoResults.sources.map(r => ({ title: r.title, url: r.url, description: r.content })) },
            investorDocs: investorDocsResults.map(r => ({ title: r.title, url: r.url, description: r.content })),
            competitorMentions: competitorMentionsResults,
            leadershipChanges: leadershipResults.map(r => ({ title: r.title, url: r.url, description: r.content })),
            regulatoryEvents: regulatoryResults
          };
        } else {
          // Use WebSearchAPI for web search
          const [newsResults, caseStudyResults, infoResults, investorDocsResults] = await Promise.all([
            searchCompanyNews(companyName.trim(), webSearchApiKey!),
            searchCompanyCaseStudies(companyName.trim(), webSearchApiKey!),
            searchCompanyInfo(companyName.trim(), webSearchApiKey!),
            searchInvestorDocuments(companyName.trim(), webSearchApiKey!)
          ]);

          webSearchData = {
            news: newsResults,
            caseStudies: caseStudyResults,
            info: infoResults,
            investorDocs: investorDocsResults
          };
        }
      } catch (err) {
        // Log but don't fail - web search is an enhancement
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.warn(`${webSearchProviderName} error (non-fatal):`, errorMessage);

        // Parse the error to give a user-friendly message
        if (errorMessage.includes('Forbidden') || errorMessage.includes('401') || errorMessage.includes('403') || errorMessage.includes('Invalid API Key')) {
          webSearchError = `${webSearchProviderName} key is invalid or expired`;
        } else if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
          webSearchError = `${webSearchProviderName} rate limit exceeded`;
        } else if (errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT')) {
          webSearchError = `${webSearchProviderName} request timed out`;
        } else {
          webSearchError = `${webSearchProviderName} failed: ` + errorMessage.substring(0, 100);
        }
      }
    }

    // Create provider and execute analysis with optional model override
    const aiProvider = createAIProvider(provider as ProviderName, apiKey, { model });
    const analysis = await aiProvider.analyzeCompany(companyName.trim());

    // If we have web search data, merge it with the analysis results
    if (webSearchData) {
      // Replace placeholder news with real web search results
      if (webSearchData.news.length > 0) {
        analysis.techNews = webSearchData.news.map(item => ({
          title: item.title,
          url: item.url,
          summary: item.description
        }));
      }

      // Replace placeholder case studies with real web search results
      if (webSearchData.caseStudies.length > 0) {
        analysis.caseStudies = webSearchData.caseStudies.map(item => ({
          title: item.title,
          url: item.url,
          summary: item.description
        }));
      }

      // Replace placeholder investor docs with real web search results
      if (webSearchData.investorDocs.length > 0) {
        analysis.investorDocs = webSearchData.investorDocs.map(item => ({
          title: item.title,
          url: item.url,
          summary: item.description
        }));
      }

      // Replace competitor mentions with real web search results (Tavily only)
      if (webSearchData.competitorMentions && webSearchData.competitorMentions.length > 0) {
        analysis.competitorMentions = webSearchData.competitorMentions.map((item: CompetitorMention) => ({
          competitorName: item.competitorName,
          mentionType: item.mentionType,
          title: item.title,
          url: item.url,
          summary: item.summary
        }));
      }

      // Replace leadership changes with real web search results (Tavily only)
      if (webSearchData.leadershipChanges && webSearchData.leadershipChanges.length > 0) {
        // Filter out irrelevant pages first
        const filteredArticles = webSearchData.leadershipChanges
          .filter((item: { title: string; url: string; description: string }) => {
            const urlLower = item.url.toLowerCase();
            return !urlLower.includes('career') && !urlLower.includes('job') && !urlLower.includes('linkedin.com/jobs');
          })
          .map((item: { title: string; url: string; description: string }) => ({
            title: item.title,
            url: item.url,
            content: item.description || ''
          }));

        // Parse articles to extract actual names and roles
        const parsedChanges = parseLeadershipArticles(filteredArticles, companyName.trim());

        if (parsedChanges.length > 0) {
          analysis.leadershipChanges = parsedChanges;
        } else {
          // Fallback: show article titles if parsing found nothing
          analysis.leadershipChanges = filteredArticles.slice(0, 6).map((item) => {
            let source = '';
            try {
              source = new URL(item.url).hostname.replace('www.', '');
            } catch {
              source = 'Source';
            }
            return {
              name: item.title,
              role: item.content?.substring(0, 150) || '',
              changeType: 'appointed' as const,
              url: item.url,
              source
            };
          });
        }
      }

      // Replace regulatory events with real web search results (Tavily only)
      if (webSearchData.regulatoryEvents && webSearchData.regulatoryEvents.length > 0) {
        analysis.regulatoryEvents = webSearchData.regulatoryEvents.map((event: RegulatoryEvent) => ({
          date: event.date,
          regulatoryBody: event.regulatoryBody,
          eventType: event.eventType,
          amount: event.amount,
          description: event.description,
          url: event.url
        }));
        console.log(`Found ${webSearchData.regulatoryEvents.length} regulatory events for ${companyName}`);
      }

      // Add web search sources to sources list
      const webSources = [
        ...webSearchData.news.map(n => n.url),
        ...webSearchData.caseStudies.map(c => c.url),
        ...webSearchData.investorDocs.map(d => d.url),
        ...webSearchData.info.sources.map(s => s.url),
        ...(webSearchData.competitorMentions || []).map((c: CompetitorMention) => c.url),
        ...(webSearchData.regulatoryEvents || []).map((e: RegulatoryEvent) => e.url)
      ].filter(Boolean);

      if (webSources.length > 0) {
        analysis.sources = [...new Set([...analysis.sources, ...webSources])];
      }
    }

    // Log web search status for debugging
    if (shouldUseWebSearch) {
      console.log(`${webSearchProviderName} status:`, webSearchData ? 'SUCCESS' : `FAILED: ${webSearchError}`);
    }

    // Save analysis to shared cache
    const webSearchUsed = shouldUseWebSearch && webSearchData !== null;
    try {
      // Use upsert to handle both new and refresh cases
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('company_analyses')
        .upsert({
          company_name: companyName.trim(),
          company_name_lower: companyNameLower,
          analysis_data: analysis,
          provider: provider,
          model: model || null,
          web_search_used: webSearchUsed,
          created_by: user?.id || null,
          updated_at: new Date().toISOString(),
          updated_by: user?.id || null
        }, {
          onConflict: 'company_name_lower'
        });

      console.log(`Cached analysis for "${companyName}"`);
    } catch (cacheError) {
      // Don't fail the request if caching fails
      console.warn('Failed to cache analysis:', cacheError);
    }

    return NextResponse.json<AnalyzeResponse>({
      data: analysis,
      cached: false,
      provider: provider as ProviderName,
      webSearchUsed,
      webSearchError: webSearchError || undefined
    });
  } catch (error) {
    console.error('Analysis error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Analysis failed';

    // Check for common API key errors
    if (errorMessage.includes('401') || errorMessage.includes('Unauthorized') || errorMessage.includes('invalid_api_key')) {
      return NextResponse.json<ApiError>(
        { error: 'Invalid API key. Please check your credentials.' },
        { status: 401 }
      );
    }

    if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
      return NextResponse.json<ApiError>(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    return NextResponse.json<ApiError>(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
