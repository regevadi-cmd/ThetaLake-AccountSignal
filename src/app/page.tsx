'use client';

import { useState, useCallback } from 'react';
import { Building2, Sparkles, History, Bookmark, Trash2, Clock, RefreshCw, Database } from 'lucide-react';
import { Header, CompanyInfo } from '@/components/layout/Header';
import { AnalysisDashboard } from '@/components/analysis/AnalysisDashboard';
import { DashboardSkeleton } from '@/components/analysis/DashboardSkeleton';
import { ApiKeyModal } from '@/components/auth/ApiKeyModal';
import { AboutModal } from '@/components/AboutModal';
import { GuestBanner } from '@/components/auth/GuestBanner';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useApiKeys } from '@/lib/hooks/useApiKeys';
import { useServerSettings } from '@/lib/hooks/useServerSettings';
import { useSearchHistory } from '@/lib/hooks/useSearchHistory';
import { useBookmarks } from '@/lib/hooks/useBookmarks';
import { ProviderName, AnalysisResult, PROVIDER_INFO } from '@/types/analysis';
import { AnalyzeResponse, ApiError } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Toaster, toast } from 'sonner';

// Common company ticker mappings
const COMPANY_TICKERS: Record<string, string> = {
  apple: 'AAPL',
  microsoft: 'MSFT',
  google: 'GOOGL',
  alphabet: 'GOOGL',
  amazon: 'AMZN',
  meta: 'META',
  facebook: 'META',
  tesla: 'TSLA',
  nvidia: 'NVDA',
  netflix: 'NFLX',
  disney: 'DIS',
  walmart: 'WMT',
  jpmorgan: 'JPM',
  'bank of america': 'BAC',
  visa: 'V',
  mastercard: 'MA',
  'coca-cola': 'KO',
  pepsi: 'PEP',
  pepsico: 'PEP',
  intel: 'INTC',
  amd: 'AMD',
  ibm: 'IBM',
  oracle: 'ORCL',
  salesforce: 'CRM',
  adobe: 'ADBE',
  cisco: 'CSCO',
  'at&t': 'T',
  verizon: 'VZ',
  't-mobile': 'TMUS',
  boeing: 'BA',
  airbus: 'EADSY',
  ford: 'F',
  'general motors': 'GM',
  toyota: 'TM',
  honda: 'HMC',
  volkswagen: 'VWAGY',
  nike: 'NKE',
  adidas: 'ADDYY',
  starbucks: 'SBUX',
  'mcdonald\'s': 'MCD',
  uber: 'UBER',
  lyft: 'LYFT',
  airbnb: 'ABNB',
  spotify: 'SPOT',
  zoom: 'ZM',
  slack: 'WORK',
  shopify: 'SHOP',
  square: 'SQ',
  block: 'SQ',
  paypal: 'PYPL',
  stripe: '',
  palantir: 'PLTR',
  snowflake: 'SNOW',
  coinbase: 'COIN',
  robinhood: 'HOOD'
};

// Helper function to format relative time
function getRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  const weeks = Math.floor(diff / 604800000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  if (weeks < 4) return `${weeks}w ago`;
  return new Date(timestamp).toLocaleDateString();
}

// Check if data is considered stale (older than 24 hours)
function isDataStale(timestamp: number): boolean {
  const ONE_DAY = 24 * 60 * 60 * 1000;
  return Date.now() - timestamp > ONE_DAY;
}

function getTicker(companyName: string): string | undefined {
  const normalized = companyName.toLowerCase().trim();

  // Try exact match first
  if (COMPANY_TICKERS[normalized]) {
    return COMPANY_TICKERS[normalized];
  }

  // Try partial matching - check if company name contains any known company
  for (const [key, ticker] of Object.entries(COMPANY_TICKERS)) {
    if (ticker && (normalized.includes(key) || key.includes(normalized))) {
      return ticker;
    }
  }

  // Try word-by-word matching for multi-word company names
  const words = normalized.split(/\s+/);
  for (const word of words) {
    if (word.length >= 3 && COMPANY_TICKERS[word]) {
      return COMPANY_TICKERS[word];
    }
  }

  return undefined;
}

export default function Home() {
  const { isAuthenticated, isAdmin, isLoading: authLoading } = useAuth();
  const {
    settings: serverSettings,
    loaded: serverSettingsLoaded,
    selectedProvider: serverProvider,
    getSelectedModel: getServerModel,
    hasKey: serverHasKey,
    webSearchProvider: serverWebSearchProvider,
    refreshSettings
  } = useServerSettings();
  const [loading, setLoading] = useState(false);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [analysisData, setAnalysisData] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [activeTab, setActiveTab] = useState('search');
  const [webSearchUsed, setWebSearchUsed] = useState(false);
  const [webSearchError, setWebSearchError] = useState<string | null>(null);
  // Track if current data is from cache (bookmark/history)
  const [cachedDataTimestamp, setCachedDataTimestamp] = useState<number | null>(null);

  const {
    getKey,
    setKey,
    hasKey,
    loaded: keysLoaded,
    selectedProvider,
    setSelectedProvider,
    getSelectedModel,
    setSelectedModel,
    webSearchApiKey,
    setWebSearchApiKey,
    tavilyApiKey,
    setTavilyApiKey,
    webSearchProvider,
    setWebSearchProvider
  } = useApiKeys();
  const localSelectedModel = getSelectedModel(selectedProvider);
  const { history, addToHistory, removeFromHistory, clearHistory, loaded: historyLoaded } = useSearchHistory();
  const { bookmarks, addBookmark, removeBookmark, isBookmarked, getBookmark, loaded: bookmarksLoaded } = useBookmarks();

  // Use server settings when authenticated, local settings otherwise (for admin editing)
  const effectiveProvider = isAuthenticated ? serverProvider : selectedProvider;
  const effectiveModel = isAuthenticated ? getServerModel(effectiveProvider) : localSelectedModel;
  const effectiveHasKey = isAuthenticated ? serverHasKey(effectiveProvider) : hasKey(effectiveProvider);
  const effectiveWebSearchProvider = isAuthenticated ? serverWebSearchProvider : webSearchProvider;

  const handleSearch = useCallback(
    async (company: string, info?: CompanyInfo) => {
      // Check authentication first
      if (!isAuthenticated) {
        toast.error('Please sign in to analyze companies');
        return;
      }

      setLoading(true);
      setError(null);
      setCompanyName(company);
      setCompanyInfo(info || null);
      setAnalysisData(null);
      setCachedDataTimestamp(null); // Fresh data, not from cache
      setActiveTab('search');

      try {
        // For authenticated users, the server uses its own settings
        // We just send the company name, server handles provider/model/keys
        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyName: company
          })
        });

        const data = await response.json();

        if (!response.ok) {
          const errorData = data as ApiError;
          throw new Error(errorData.error || 'Analysis failed');
        }

        const successData = data as AnalyzeResponse;
        setAnalysisData(successData.data);
        setWebSearchUsed(successData.webSearchUsed || false);
        setWebSearchError(successData.webSearchError || null);

        // Save to history using effective provider
        addToHistory(company, effectiveProvider, successData.data);

        const webSearchNote = successData.webSearchUsed ? ' with web search' : '';
        toast.success(`Analysis complete using ${PROVIDER_INFO[effectiveProvider].name}${webSearchNote}`);

        // Show warning if web search failed
        if (successData.webSearchError) {
          toast.warning(successData.webSearchError, { duration: 5000 });
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Analysis failed';
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [isAuthenticated, effectiveProvider, addToHistory]
  );

  const handleLoadFromHistory = useCallback((item: typeof history[0]) => {
    setCompanyName(item.companyName);
    setAnalysisData(item.data);
    setCachedDataTimestamp(item.timestamp);
    setWebSearchUsed(false);
    setWebSearchError(null);
    setActiveTab('search');
    toast.success(`Loaded ${item.companyName} from history (${getRelativeTime(item.timestamp)})`);
  }, []);

  const handleLoadFromBookmark = useCallback((item: typeof bookmarks[0]) => {
    setCompanyName(item.companyName);
    setAnalysisData(item.data);
    setCachedDataTimestamp(item.timestamp);
    setWebSearchUsed(false);
    setWebSearchError(null);
    setActiveTab('search');
    toast.success(`Loaded ${item.companyName} from bookmarks (${getRelativeTime(item.timestamp)})`);
  }, []);

  const handleToggleBookmark = useCallback(() => {
    if (!companyName || !analysisData) return;

    if (isBookmarked(companyName)) {
      const bookmark = getBookmark(companyName);
      if (bookmark) {
        removeBookmark(bookmark.id);
        toast.success('Removed from bookmarks');
      }
    } else {
      addBookmark(companyName, selectedProvider, analysisData);
      toast.success('Added to bookmarks');
    }
  }, [companyName, analysisData, selectedProvider, isBookmarked, getBookmark, removeBookmark, addBookmark]);

  const handleSettingsClick = () => {
    // Only allow admins to open settings
    if (isAdmin) {
      setShowApiKeyModal(true);
    }
  };

  const handleRefresh = useCallback(() => {
    if (companyName) {
      // Re-run the search with fresh data
      handleSearch(companyName, companyInfo || undefined);
    }
  }, [companyName, companyInfo, handleSearch]);

  const handleSaveAllSettings = async (settings: {
    provider: ProviderName;
    model: string;
    apiKey?: string;
    webSearchProvider: 'tavily' | 'websearchapi' | 'none';
    tavilyKey?: string | null;
    webSearchKey?: string | null;
  }) => {
    // Save all settings to server API for admin
    try {
      const payload: Record<string, unknown> = {
        default_provider: settings.provider,
        [`${settings.provider}_model`]: settings.model,
        web_search_provider: settings.webSearchProvider,
      };

      // Only include API key if provided (not empty)
      if (settings.apiKey) {
        payload[`${settings.provider}_api_key`] = settings.apiKey;
      }

      // Include web search keys if provided
      if (settings.tavilyKey !== undefined) {
        payload.tavily_api_key = settings.tavilyKey;
      }
      if (settings.webSearchKey !== undefined) {
        payload.websearchapi_key = settings.webSearchKey;
      }

      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save settings');
      }

      // Refresh server settings to update UI
      await refreshSettings();
      toast.success('Settings saved successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save settings';
      toast.error(errorMessage);
      throw err; // Re-throw so modal knows save failed
    }
  };

  const loaded = keysLoaded && historyLoaded && bookmarksLoaded && !authLoading && serverSettingsLoaded;

  if (!loaded) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="animate-pulse text-zinc-500">Loading...</div>
      </div>
    );
  }

  const ticker = companyName ? getTicker(companyName) : undefined;

  return (
    <div className="min-h-screen bg-zinc-950">
      <Toaster
        position="top-right"
        theme="dark"
        toastOptions={{
          style: {
            background: '#18181b',
            border: '1px solid #27272a',
            color: '#fafafa'
          }
        }}
      />

      <Header
        onSearch={handleSearch}
        onClearResults={() => {
          // Clear old results when user starts typing a new search
          setCompanyName(null);
          setCompanyInfo(null);
          setAnalysisData(null);
          setCachedDataTimestamp(null);
          setError(null);
        }}
        loading={loading}
        selectedProvider={effectiveProvider}
        selectedModel={effectiveModel}
        onSettingsClick={handleSettingsClick}
        onAboutClick={() => setShowAboutModal(true)}
      />

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Guest Banner */}
        <GuestBanner />

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400">
            {error}
          </div>
        )}

        {/* Tabs for Search / History / Bookmarks */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="bg-zinc-900 border border-zinc-800">
            <TabsTrigger value="search" className="data-[state=active]:bg-zinc-800">
              Search
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-zinc-800">
              <History className="w-4 h-4 mr-2" />
              History ({history.length})
            </TabsTrigger>
            <TabsTrigger value="bookmarks" className="data-[state=active]:bg-zinc-800">
              <Bookmark className="w-4 h-4 mr-2" />
              Bookmarks ({bookmarks.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="mt-6">
            {!analysisData && !loading && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center mb-6">
                  <Building2 className="w-10 h-10 text-zinc-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Search for a Company</h2>
                <p className="text-zinc-500 max-w-md mb-6">
                  Enter a company name above to get comprehensive intelligence including financials,
                  technology trends, competitive analysis, and M&A activity.
                </p>

                {/* Status based on auth state */}
                {!isAuthenticated && (
                  <p className="text-amber-400 text-sm">
                    Sign in above to start analyzing companies
                  </p>
                )}

                {isAuthenticated && !isAdmin && (
                  <p className="text-emerald-400 text-sm flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    Ready to analyze using {PROVIDER_INFO[effectiveProvider].name}
                  </p>
                )}

                {isAdmin && !effectiveHasKey && (
                  <button
                    onClick={() => setShowApiKeyModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors btn-scale"
                  >
                    <Sparkles className="w-4 h-4" />
                    Configure {PROVIDER_INFO[effectiveProvider].name} API Key
                  </button>
                )}

                {isAdmin && effectiveHasKey && (
                  <p className="text-emerald-400 text-sm flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    {PROVIDER_INFO[effectiveProvider].name} API key configured
                  </p>
                )}

                {/* Recent Searches Quick Access */}
                {history.length > 0 && (
                  <div className="mt-8 w-full max-w-md">
                    <h3 className="text-sm font-medium text-zinc-400 mb-3">Recent Searches</h3>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {history.slice(0, 5).map((item) => (
                        <button
                          key={item.id}
                          onClick={() => handleLoadFromHistory(item)}
                          className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-full text-sm text-zinc-300 hover:text-white transition-colors"
                        >
                          {item.companyName}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {loading && (
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-zinc-400">
                    Analyzing {companyName} with {PROVIDER_INFO[effectiveProvider].name}
                    {!PROVIDER_INFO[effectiveProvider].supportsWebGrounding &&
                     effectiveWebSearchProvider !== 'none' && (
                      <span className="text-cyan-400"> + {effectiveWebSearchProvider === 'tavily' ? 'Tavily' : 'WebSearchAPI'}</span>
                    )}
                    ...
                  </span>
                </div>
                <DashboardSkeleton />
              </div>
            )}

            {analysisData && companyName && !loading && (
              <AnalysisDashboard
                companyName={companyName}
                companyInfo={companyInfo}
                data={analysisData}
                ticker={ticker}
                provider={effectiveProvider}
                isBookmarked={isBookmarked(companyName)}
                onToggleBookmark={handleToggleBookmark}
                webSearchUsed={webSearchUsed}
                webSearchError={webSearchError}
                cachedDataTimestamp={cachedDataTimestamp}
                onRefresh={handleRefresh}
                isRefreshing={loading}
              />
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Search History</h2>
                {history.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearHistory}
                    className="border-zinc-700 text-zinc-400 hover:text-red-400 hover:border-red-500/50"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear All
                  </Button>
                )}
              </div>

              {history.length === 0 ? (
                <div className="text-center py-12 text-zinc-500">
                  <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No search history yet</p>
                  <p className="text-sm mt-1">Your searches will appear here</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div>
                          <h3 className="font-medium text-white">{item.companyName}</h3>
                          <div className="flex items-center gap-2 text-sm text-zinc-500 mt-1">
                            <Clock className="w-3 h-3" />
                            {new Date(item.timestamp).toLocaleDateString()}
                            <span className="text-zinc-600">•</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                              item.sentiment === 'BULLISH' ? 'bg-emerald-500/20 text-emerald-400' :
                              item.sentiment === 'BEARISH' ? 'bg-red-500/20 text-red-400' :
                              'bg-zinc-700 text-zinc-400'
                            }`}>
                              {item.sentiment}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleLoadFromHistory(item)}
                          className="border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800"
                        >
                          View
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFromHistory(item.id)}
                          className="text-zinc-500 hover:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="bookmarks" className="mt-6">
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-white">Bookmarks</h2>

              {bookmarks.length === 0 ? (
                <div className="text-center py-12 text-zinc-500">
                  <Bookmark className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No bookmarks yet</p>
                  <p className="text-sm mt-1">Save companies to quickly access them later</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {bookmarks.map((item) => {
                    const stale = isDataStale(item.timestamp);
                    return (
                      <div
                        key={item.id}
                        className={`flex items-center justify-between p-4 bg-zinc-900/50 border rounded-xl hover:border-zinc-700 transition-colors ${
                          stale ? 'border-amber-500/30' : 'border-zinc-800'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            stale ? 'bg-amber-500/20' : 'bg-amber-500/20'
                          }`}>
                            {stale ? (
                              <Database className="w-5 h-5 text-amber-400" />
                            ) : (
                              <Bookmark className="w-5 h-5 text-amber-400" />
                            )}
                          </div>
                          <div>
                            <h3 className="font-medium text-white">{item.companyName}</h3>
                            <div className="flex items-center gap-2 text-sm text-zinc-500 mt-1">
                              <Clock className="w-3 h-3" />
                              <span className={stale ? 'text-amber-400' : ''}>
                                {getRelativeTime(item.timestamp)}
                              </span>
                              {stale && (
                                <span className="text-amber-400 text-xs">(outdated)</span>
                              )}
                              <span className="text-zinc-600">•</span>
                              <span className={`text-xs px-1.5 py-0.5 rounded ${
                                item.sentiment === 'BULLISH' ? 'bg-emerald-500/20 text-emerald-400' :
                                item.sentiment === 'BEARISH' ? 'bg-red-500/20 text-red-400' :
                                'bg-zinc-700 text-zinc-400'
                              }`}>
                                {item.sentiment}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {stale && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                // Load the bookmark first, then trigger refresh
                                handleLoadFromBookmark(item);
                                // Small delay to let the state update, then trigger search
                                setTimeout(() => {
                                  handleSearch(item.companyName);
                                }, 100);
                              }}
                              className="border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/20"
                            >
                              <RefreshCw className="w-4 h-4 mr-1" />
                              Refresh
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleLoadFromBookmark(item)}
                            className="border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800"
                          >
                            View
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              removeBookmark(item.id);
                              toast.success('Removed from bookmarks');
                            }}
                            className="text-zinc-500 hover:text-red-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <footer className="border-t border-zinc-800 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center text-zinc-600 text-sm">
          MarketPulse - Corporate Intelligence Platform powered by AI
        </div>
      </footer>

      {/* Settings Modal - Admin only */}
      {isAdmin && (
        <ApiKeyModal
          open={showApiKeyModal}
          onOpenChange={setShowApiKeyModal}
          selectedProvider={effectiveProvider}
          selectedModel={effectiveModel}
          currentKey={serverSettings.openai_api_key || serverSettings.anthropic_api_key || serverSettings.gemini_api_key || serverSettings.perplexity_api_key || ''}
          webSearchProvider={effectiveWebSearchProvider}
          tavilyApiKey={serverSettings.tavily_api_key || undefined}
          webSearchApiKey={serverSettings.websearchapi_key || undefined}
          onSaveAll={handleSaveAllSettings}
        />
      )}

      {/* About Modal */}
      <AboutModal
        open={showAboutModal}
        onOpenChange={setShowAboutModal}
      />
    </div>
  );
}
