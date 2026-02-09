'use client';

import { useState, useRef, useEffect } from 'react';
import { AnalysisResult, ProviderName, PROVIDER_INFO } from '@/types/analysis';
import { CacheMetadata } from '@/types/api';
import { CompanyInfo } from '@/components/layout/Header';
import { SentimentBadge } from './sections/SentimentBadge';
import { ExecutiveSummary } from './sections/ExecutiveSummary';
import { QuickFacts } from './sections/QuickFacts';
import { KeyPriorities } from './sections/KeyPriorities';
import { GrowthInitiatives } from './sections/GrowthInitiatives';
import { InvestorDocuments } from './sections/InvestorDocuments';
import { TechNews } from './sections/TechNews';
import { CaseStudies } from './sections/CaseStudies';
import { CompetitorMentions } from './sections/CompetitorMentions';
import { LeadershipChanges } from './sections/LeadershipChanges';
import { MAActivity } from './sections/MAActivity';
import { RegulatoryLandscape } from './sections/RegulatoryLandscape';
import { RegulatoryEvents } from './sections/RegulatoryEvents';
import { GroundingSources } from './sections/GroundingSources';
import { StockCard } from '../stock/StockCard';
import { Bookmark, BookmarkCheck, Globe, AlertTriangle, Database, RefreshCw, Users, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AnalysisDashboardProps {
  companyName: string;
  companyInfo?: CompanyInfo | null;
  data: AnalysisResult;
  ticker?: string;
  provider: ProviderName;
  isBookmarked: boolean;
  onToggleBookmark: () => void;
  webSearchUsed?: boolean;
  webSearchError?: string | null;
  // Cached data props (local - from bookmarks/history)
  cachedDataTimestamp?: number | null;
  // Shared cache metadata (from server-side cache)
  sharedCacheMetadata?: CacheMetadata | null;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

// Helper function to format relative time
function getRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  return `${days} day${days !== 1 ? 's' : ''} ago`;
}

// Check if data is stale (older than 24 hours)
function isDataStale(timestamp: number): boolean {
  const ONE_DAY = 24 * 60 * 60 * 1000;
  return Date.now() - timestamp > ONE_DAY;
}

export function AnalysisDashboard({
  companyName,
  companyInfo,
  data,
  ticker,
  provider,
  isBookmarked,
  onToggleBookmark,
  webSearchUsed,
  webSearchError,
  cachedDataTimestamp,
  sharedCacheMetadata,
  onRefresh,
  isRefreshing
}: AnalysisDashboardProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [showStockChart, setShowStockChart] = useState(false);
  const dashboardRef = useRef<HTMLDivElement>(null);

  // Listen for stock chart preference changes from localStorage
  useEffect(() => {
    const loadPref = () => {
      setShowStockChart(localStorage.getItem('marketpulse_show_stock_chart') === 'true');
    };
    loadPref();
    window.addEventListener('storage', loadPref);
    // Also poll for same-tab changes (storage event only fires cross-tab)
    const interval = setInterval(loadPref, 1000);
    return () => {
      window.removeEventListener('storage', loadPref);
      clearInterval(interval);
    };
  }, []);

  // Local cache (bookmarks/history)
  const isCached = cachedDataTimestamp !== null && cachedDataTimestamp !== undefined;
  const isStale = isCached && isDataStale(cachedDataTimestamp);

  // Shared cache (server-side)
  const isSharedCache = sharedCacheMetadata !== null && sharedCacheMetadata !== undefined;
  const isSharedCacheStale = isSharedCache && sharedCacheMetadata.ageMinutes > 24 * 60;

  const handleExportPDF = () => {
    // Use browser's native print-to-PDF functionality
    // This is the most reliable cross-browser solution
    window.print();
  };

  return (
    <div ref={dashboardRef} className="space-y-4 sm:space-y-6">
      {/* Company Header */}
      <div className="flex flex-col gap-3 sm:gap-4">
        {/* Company Name + Sentiment */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">{companyName}</h2>
          <SentimentBadge sentiment={data.sentiment} />
        </div>

        {/* Status Badges + Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
          {/* Status badges */}
          <div className="flex flex-wrap items-center gap-2">
            {webSearchUsed && (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-cyan-500/10 border border-cyan-500/30 rounded-full text-cyan-400 text-xs font-medium">
                <Globe className="w-3 h-3" />
                <span className="hidden xs:inline">Web Search</span>
              </div>
            )}
            {webSearchError && (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-400 text-xs font-medium" title={webSearchError}>
                <AlertTriangle className="w-3 h-3" />
                <span className="hidden xs:inline">Search Failed</span>
              </div>
            )}
            {isCached && (
              <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
                isStale
                  ? 'bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400'
                  : 'bg-muted border border-border text-muted-foreground'
              }`}>
                <Database className="w-3 h-3" />
                <span className="hidden sm:inline">Cached {getRelativeTime(cachedDataTimestamp!)}</span>
                <span className="sm:hidden">{getRelativeTime(cachedDataTimestamp!)}</span>
              </div>
            )}
            {isSharedCache && !isCached && (
              <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
                isSharedCacheStale
                  ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                  : 'bg-blue-500/10 border border-blue-500/30 text-blue-400'
              }`}>
                <Users className="w-3 h-3" />
                <span className="hidden sm:inline">
                  Shared {sharedCacheMetadata.ageMinutes < 60
                    ? `${sharedCacheMetadata.ageMinutes}m ago`
                    : sharedCacheMetadata.ageMinutes < 1440
                      ? `${Math.floor(sharedCacheMetadata.ageMinutes / 60)}h ago`
                      : `${Math.floor(sharedCacheMetadata.ageMinutes / 1440)}d ago`}
                </span>
                <span className="sm:hidden">Shared</span>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {(isCached || isSharedCache) && onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={isRefreshing}
                className={`border-border transition-colors h-8 px-2 sm:px-3 ${
                  isStale || isSharedCacheStale
                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/50 hover:bg-emerald-500/30'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                }`}
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline ml-2">Refresh</span>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={onToggleBookmark}
              className={`border-border transition-colors h-8 px-2 sm:px-3 ${
                isBookmarked
                  ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/50 hover:bg-amber-500/30'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              {isBookmarked ? (
                <>
                  <BookmarkCheck className="w-4 h-4" />
                  <span className="hidden sm:inline ml-2">Saved</span>
                </>
              ) : (
                <>
                  <Bookmark className="w-4 h-4" />
                  <span className="hidden sm:inline ml-2">Save</span>
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPDF}
              disabled={isExporting}
              className="border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors h-8 px-2 sm:px-3"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="hidden sm:inline ml-2">Exporting...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline ml-2">PDF</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Stale Data Warning Banner */}
      {isStale && onRefresh && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
          <div className="flex items-center gap-3">
            <Database className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <div>
              <h4 className="text-amber-400 font-medium text-sm">Data may be outdated</h4>
              <p className="text-amber-400/70 text-xs mt-0.5">
                Saved {getRelativeTime(cachedDataTimestamp!)}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="bg-amber-600 hover:bg-amber-500 text-white w-full sm:w-auto"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh Now
          </Button>
        </div>
      )}

      {/* Shared Cache Info Banner */}
      {isSharedCache && !isCached && onRefresh && (
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 rounded-xl ${
          isSharedCacheStale
            ? 'bg-amber-500/10 border border-amber-500/30'
            : 'bg-blue-500/10 border border-blue-500/30'
        }`}>
          <div className="flex items-center gap-3">
            <Users className={`w-5 h-5 flex-shrink-0 ${isSharedCacheStale ? 'text-amber-400' : 'text-blue-400'}`} />
            <div>
              <h4 className={`font-medium text-sm ${isSharedCacheStale ? 'text-amber-400' : 'text-blue-400'}`}>
                {isSharedCacheStale ? 'Shared analysis may be outdated' : 'Using shared analysis'}
              </h4>
              <p className={`text-xs mt-0.5 ${isSharedCacheStale ? 'text-amber-400/70' : 'text-blue-400/70'}`}>
                Analyzed {sharedCacheMetadata.ageMinutes < 60
                  ? `${sharedCacheMetadata.ageMinutes} minutes ago`
                  : sharedCacheMetadata.ageMinutes < 1440
                    ? `${Math.floor(sharedCacheMetadata.ageMinutes / 60)} hours ago`
                    : `${Math.floor(sharedCacheMetadata.ageMinutes / 1440)} days ago`}
                {sharedCacheMetadata.analyzedBy && ` by ${sharedCacheMetadata.analyzedBy}`}
                {' '}using {PROVIDER_INFO[sharedCacheMetadata.provider]?.name || sharedCacheMetadata.provider}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            className={`w-full sm:w-auto ${
              isSharedCacheStale
                ? 'bg-amber-600 hover:bg-amber-500 text-white'
                : 'bg-blue-600 hover:bg-blue-500 text-white'
            }`}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Run Fresh Analysis
          </Button>
        </div>
      )}

      {/* Web Search Error Banner */}
      {webSearchError && (
        <div className="flex items-start gap-3 p-3 sm:p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-amber-400 font-medium text-sm">Web Search Unavailable</h4>
            <p className="text-amber-400/70 text-xs mt-1">{webSearchError}</p>
            <p className="text-muted-foreground text-xs mt-2 hidden sm:block">
              Links in news, case studies, and investor documents may not work.
              Check your WebSearchAPI key in settings, or switch to Gemini/Perplexity for built-in web grounding.
            </p>
          </div>
        </div>
      )}

      {/* Dashboard Grid - Reorganized for better space efficiency */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {/* Row 1: Executive Summary (2/3) + Quick Facts (1/3) */}
        <ExecutiveSummary summary={data.summary} className="xl:col-span-2" />
        <QuickFacts facts={data.quickFacts} />

        {/* Row 2: Stock Chart - Full Width (if enabled) */}
        {showStockChart && (
          <StockCard ticker={ticker} companyName={companyName} companyInfo={companyInfo} className="lg:col-span-2 xl:col-span-3" />
        )}

        {/* Row 3: Strategic Direction */}
        <KeyPriorities priorities={data.keyPriorities} />
        <GrowthInitiatives initiatives={data.growthInitiatives} />
        <MAActivity activity={data.maActivity} />

        {/* Row 4: News & Intelligence */}
        <TechNews news={data.techNews} />
        <LeadershipChanges changes={data.leadershipChanges || []} />
        <CaseStudies studies={data.caseStudies} />

        {/* Row 5: Competitor Mentions & Investor Docs - 50/50 Split */}
        <div className="lg:col-span-2 xl:col-span-3 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <CompetitorMentions mentions={data.competitorMentions || []} />
          <InvestorDocuments documents={data.investorDocs} companyInfo={companyInfo} />
        </div>

        {/* Row 6: Regulatory - 50/50 Split */}
        <div className="lg:col-span-2 xl:col-span-3 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <RegulatoryLandscape regulators={data.regulatoryLandscape || []} />
          <RegulatoryEvents events={data.regulatoryEvents || []} />
        </div>
      </div>

      {/* Grounding Sources */}
      <GroundingSources sources={data.sources} />
    </div>
  );
}
