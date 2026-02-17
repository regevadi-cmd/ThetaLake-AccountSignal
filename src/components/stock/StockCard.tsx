'use client';

import { useEffect, useState, useCallback } from 'react';
import { TrendingUp, TrendingDown, RefreshCw, Search, ChevronRight } from 'lucide-react';
import { CompanyInfo } from '@/components/layout/Header';
import { SectionCard } from '../analysis/SectionCard';
import { Skeleton } from '@/components/ui/skeleton';

interface StockData {
  ticker: string;
  companyName: string;
  price: number;
  previousClose: number;
  change: number;
  changePercent: number;
  currency: string;
  marketState: string;
  dayHigh: number;
  dayLow: number;
  dayOpen: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  volume: number;
  avgVolume: number;
  marketCap?: number;
  history: {
    timestamps: number[];
    prices: number[];
    range: string;
    rangeLabel: string;
  };
}

interface TickerOption {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
}

interface StockCardProps {
  ticker?: string;
  companyName?: string;
  companyInfo?: CompanyInfo | null;
  className?: string;
}

type TimeRange = '1d' | '5d' | '1mo' | 'ytd' | '1y' | '2y' | '5y';

const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: '1d', label: '1D' },
  { value: '5d', label: '5D' },
  { value: '1mo', label: '1M' },
  { value: 'ytd', label: 'YTD' },
  { value: '1y', label: '1Y' },
  { value: '2y', label: '2Y' },
  { value: '5y', label: '5Y' },
];

function formatNumber(num: number): string {
  if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
  return num.toFixed(2);
}

function formatCurrency(num: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
}

function formatDate(timestamp: number, range: string): string {
  const date = new Date(timestamp);
  if (range === '1d') {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  } else if (range === '5d' || range === '1mo') {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  }
}

// Improved SVG chart with axes
function StockChart({
  data,
  timestamps,
  isPositive,
  range,
  currency
}: {
  data: number[];
  timestamps: number[];
  isPositive: boolean;
  range: string;
  currency: string;
}) {
  if (!data || data.length < 2) {
    return (
      <div className="w-full h-[200px] flex items-center justify-center text-muted-foreground text-sm">
        Insufficient data for chart
      </div>
    );
  }

  const width = 600;
  const height = 200;
  const padding = { top: 20, right: 60, bottom: 35, left: 10 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const minPrice = Math.min(...data);
  const maxPrice = Math.max(...data);
  const priceRange = maxPrice - minPrice || 1;

  // Add padding to price range
  const pricePadding = priceRange * 0.1;
  const adjustedMin = minPrice - pricePadding;
  const adjustedMax = maxPrice + pricePadding;
  const adjustedRange = adjustedMax - adjustedMin;

  // Generate chart points
  const points = data.map((price, i) => {
    const x = padding.left + (i / (data.length - 1)) * chartWidth;
    const y = padding.top + chartHeight - ((price - adjustedMin) / adjustedRange) * chartHeight;
    return { x, y, price, timestamp: timestamps[i] };
  });

  const pathD = `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`;
  const fillPathD = `M ${padding.left},${padding.top + chartHeight} L ${points.map(p => `${p.x},${p.y}`).join(' L ')} L ${padding.left + chartWidth},${padding.top + chartHeight} Z`;

  const color = isPositive ? '#10b981' : '#ef4444';
  const gradientId = `chart-gradient-${isPositive ? 'green' : 'red'}-${Math.random().toString(36).substr(2, 9)}`;

  // Y-axis labels (5 price levels)
  const yLabels = Array.from({ length: 5 }, (_, i) => {
    const price = adjustedMin + (adjustedRange * (4 - i)) / 4;
    const y = padding.top + (chartHeight * i) / 4;
    return { price, y };
  });

  // X-axis labels (5-6 time labels)
  const xLabelCount = 6;
  const xLabels = Array.from({ length: xLabelCount }, (_, i) => {
    const index = Math.floor((i / (xLabelCount - 1)) * (timestamps.length - 1));
    const x = padding.left + (index / (data.length - 1)) * chartWidth;
    return { timestamp: timestamps[index], x };
  });

  return (
    <div className="w-full">
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        className="overflow-visible"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {yLabels.map((label, i) => (
          <line
            key={`grid-${i}`}
            x1={padding.left}
            y1={label.y}
            x2={padding.left + chartWidth}
            y2={label.y}
            className="stroke-border"
            strokeWidth="1"
            strokeDasharray="4,4"
            opacity="0.5"
          />
        ))}

        {/* Gradient fill area */}
        <path d={fillPathD} fill={`url(#${gradientId})`} />

        {/* Line */}
        <path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Start point */}
        <circle
          cx={points[0].x}
          cy={points[0].y}
          r="3"
          fill={color}
        />

        {/* End point with glow */}
        <circle
          cx={points[points.length - 1].x}
          cy={points[points.length - 1].y}
          r="6"
          fill={color}
          opacity="0.3"
        />
        <circle
          cx={points[points.length - 1].x}
          cy={points[points.length - 1].y}
          r="4"
          fill={color}
          stroke="white"
          strokeWidth="2"
        />

        {/* Y-axis labels (right side) */}
        {yLabels.map((label, i) => (
          <text
            key={`y-label-${i}`}
            x={padding.left + chartWidth + 8}
            y={label.y + 4}
            className="fill-muted-foreground"
            fontSize="11"
            fontFamily="system-ui"
          >
            {formatCurrency(label.price, currency).replace(/\.00$/, '')}
          </text>
        ))}

        {/* X-axis labels */}
        {xLabels.map((label, i) => (
          <text
            key={`x-label-${i}`}
            x={label.x}
            y={height - 8}
            className="fill-muted-foreground"
            fontSize="10"
            fontFamily="system-ui"
            textAnchor="middle"
          >
            {formatDate(label.timestamp, range)}
          </text>
        ))}
      </svg>
    </div>
  );
}

export function StockCard({ ticker: initialTicker, companyName, companyInfo, className = "xl:col-span-2" }: StockCardProps) {
  const [data, setData] = useState<StockData | null>(null);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualTicker, setManualTicker] = useState('');
  const [activeTicker, setActiveTicker] = useState(initialTicker || '');
  const [tickerOptions, setTickerOptions] = useState<TickerOption[]>([]);
  const [showOptions, setShowOptions] = useState(false);
  const [selectedRange, setSelectedRange] = useState<TimeRange>('1y');
  const [chartLoading, setChartLoading] = useState(false);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  // Check if company is known to be private
  const isPrivate = companyInfo && (
    companyInfo.publicStatus === 'private' ||
    companyInfo.publicStatus === 'went_private' ||
    companyInfo.publicStatus === 'pre_ipo'
  );

  const searchTickers = async (query: string) => {
    if (!query) return;

    try {
      setSearching(true);
      const response = await fetch(`/api/stock/search?q=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error('Search failed');
      const { results } = await response.json();

      if (results.length === 1) {
        fetchData(results[0].symbol, selectedRange);
      } else if (results.length > 1) {
        setTickerOptions(results);
        setShowOptions(true);
      } else {
        setError('No stock tickers found for this company');
      }
    } catch (err) {
      console.error('Ticker search error:', err);
    } finally {
      setSearching(false);
    }
  };

  const fetchData = useCallback(async (tickerToFetch: string, range: TimeRange = selectedRange) => {
    if (!tickerToFetch) return;

    try {
      setChartLoading(true);
      if (!data) setLoading(true);
      setError(null);
      setShowOptions(false);

      const response = await fetch(`/api/stock/${encodeURIComponent(tickerToFetch)}?range=${range}`);
      if (!response.ok) {
        throw new Error('Failed to fetch stock data');
      }
      const stockData = await response.json();
      setData(stockData);
      setActiveTicker(tickerToFetch);
      setLastFetched(new Date());
    } catch (err) {
      setError('Unable to load stock data');
      console.error('Stock fetch error:', err);
    } finally {
      setLoading(false);
      setChartLoading(false);
    }
  }, [data, selectedRange]);

  useEffect(() => {
    if (isPrivate) return;

    if (initialTicker) {
      setActiveTicker(initialTicker);
      fetchData(initialTicker, selectedRange);
    } else if (companyName) {
      searchTickers(companyName);
    }
  }, [initialTicker, companyName, isPrivate]);

  const handleRangeChange = (range: TimeRange) => {
    setSelectedRange(range);
    if (activeTicker) {
      fetchData(activeTicker, range);
    }
  };

  const handleManualSearch = () => {
    if (manualTicker.trim()) {
      const query = manualTicker.trim();
      if (query.length <= 5 && query === query.toUpperCase()) {
        fetchData(query);
      } else {
        searchTickers(query);
      }
    }
  };

  const handleSelectTicker = (ticker: string) => {
    setShowOptions(false);
    fetchData(ticker);
  };

  // For confirmed private companies, don't show the stock card at all
  if (isPrivate) {
    return null;
  }

  // Show loading skeleton
  if ((loading || searching) && !data && !showOptions) {
    return (
      <SectionCard title="Stock Quote" icon={TrendingUp} color="emerald" className={className}>
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Search className="w-4 h-4 animate-pulse" />
            {searching ? `Searching for ${companyName || 'ticker'}...` : 'Loading stock data...'}
          </div>
          <Skeleton className="h-12 w-32 bg-muted" />
          <Skeleton className="h-[200px] w-full bg-muted" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-8 bg-muted" />
            <Skeleton className="h-8 bg-muted" />
          </div>
        </div>
      </SectionCard>
    );
  }

  // Show ticker options when multiple matches found
  if (showOptions && tickerOptions.length > 0) {
    return (
      <SectionCard title="Stock Quote" icon={TrendingUp} color="emerald" className={className}>
        <div className="py-2">
          <div className="text-muted-foreground text-sm mb-4">
            Multiple tickers found for <span className="text-foreground font-medium">{companyName}</span>. Select one:
          </div>
          <div className="space-y-2">
            {tickerOptions.map((option) => (
              <button
                key={option.symbol}
                onClick={() => handleSelectTicker(option.symbol)}
                className="w-full flex items-center justify-between p-3 bg-accent/50 hover:bg-accent border border-input hover:border-emerald-500/50 rounded-lg transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-emerald-400 font-bold text-lg">{option.symbol}</span>
                  <div className="text-left">
                    <div className="text-foreground/90 text-sm">{option.name}</div>
                    <div className="text-muted-foreground text-xs">{option.exchange} · {option.type}</div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-emerald-400 transition-colors" />
              </button>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-border">
            <div className="text-muted-foreground text-xs mb-2">Or enter a different ticker:</div>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualTicker}
                onChange={(e) => setManualTicker(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleManualSearch()}
                placeholder="e.g. AAPL"
                className="flex-1 px-3 py-2 bg-accent border border-input rounded-lg text-foreground text-sm placeholder-muted-foreground focus:outline-none focus:border-emerald-500"
              />
              <button
                onClick={handleManualSearch}
                disabled={loading || !manualTicker.trim()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-muted disabled:text-muted-foreground text-white text-sm rounded-lg transition-colors"
              >
                Load
              </button>
            </div>
          </div>
        </div>
      </SectionCard>
    );
  }

  // Show ticker input when no ticker available or error
  if (!data) {
    return (
      <SectionCard title="Stock Quote" icon={TrendingUp} color="emerald" className={className}>
        <div className="py-4">
          {error && (
            <div className="text-red-400 text-sm mb-4 text-center">{error}</div>
          )}
          <div className="text-muted-foreground text-sm mb-3 text-center">
            {companyName ? `Enter stock ticker for ${companyName}` : 'Enter a stock ticker symbol'}
          </div>
          <div className="flex gap-2 max-w-xs mx-auto">
            <input
              type="text"
              value={manualTicker}
              onChange={(e) => setManualTicker(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleManualSearch()}
              placeholder="e.g. AAPL, MSFT"
              className="flex-1 px-3 py-2 bg-accent border border-input rounded-lg text-foreground text-sm placeholder-muted-foreground focus:outline-none focus:border-emerald-500"
            />
            <button
              onClick={handleManualSearch}
              disabled={loading || !manualTicker.trim()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-muted disabled:text-muted-foreground text-white text-sm rounded-lg transition-colors"
            >
              {loading ? 'Loading...' : 'Load'}
            </button>
          </div>
          <div className="text-muted-foreground/70 text-xs mt-3 text-center">
            Common tickers: AAPL, MSFT, GOOGL, AMZN, META, TSLA, NVDA
          </div>
        </div>
      </SectionCard>
    );
  }

  const isTodayPositive = data.change >= 0;
  const startPrice = data.history.prices.length > 0 ? data.history.prices[0] : data.price;
  const rangeChange = ((data.price - startPrice) / startPrice) * 100;
  const isRangePositive = rangeChange >= 0;

  return (
    <SectionCard title="Stock Quote" icon={TrendingUp} color="emerald" className={className}>
      <div className="space-y-4">
        {/* Header: Ticker, Price, Market State */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold text-foreground">{data.ticker}</span>
            <span
              className={`text-xs px-2 py-1 rounded ${
                data.marketState === 'REGULAR'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : data.marketState === 'PRE' || data.marketState === 'PREPRE'
                  ? 'bg-amber-500/20 text-amber-400'
                  : data.marketState === 'POST' || data.marketState === 'POSTPOST'
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {data.marketState === 'REGULAR' ? 'Market Open'
                : data.marketState === 'PRE' || data.marketState === 'PREPRE' ? 'Pre-Market'
                : data.marketState === 'POST' || data.marketState === 'POSTPOST' ? 'After Hours'
                : 'Market Closed'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {lastFetched && (
              <span className="text-muted-foreground text-xs hidden sm:inline">
                {lastFetched.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              </span>
            )}
            <button
              onClick={() => fetchData(activeTicker)}
              disabled={loading || chartLoading}
              className="flex items-center gap-1.5 text-muted-foreground hover:text-emerald-500 px-3 py-2 sm:px-2 sm:py-1.5 rounded-lg hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/30 transition-colors disabled:opacity-50"
              title="Refresh stock quote"
            >
              <RefreshCw className={`w-4 h-4 ${loading || chartLoading ? 'animate-spin' : ''}`} />
              <span className="text-xs font-medium hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Current Price & Change */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <div className="text-3xl sm:text-4xl font-bold text-foreground">
              {formatCurrency(data.price, data.currency)}
            </div>
            <div className={`flex flex-wrap items-center gap-1 sm:gap-2 mt-1 ${isTodayPositive ? 'text-emerald-400' : 'text-red-400'}`}>
              {isTodayPositive ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              <span className="font-semibold text-sm sm:text-base">
                {isTodayPositive ? '+' : ''}{formatCurrency(data.change, data.currency)} ({isTodayPositive ? '+' : ''}{data.changePercent.toFixed(2)}%)
              </span>
              <span className="text-muted-foreground text-xs sm:text-sm">Today</span>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <div className="text-muted-foreground text-xs">Prev Close</div>
            <div className="text-foreground/80 text-sm sm:text-base">{formatCurrency(data.previousClose, data.currency)}</div>
          </div>
        </div>

        {/* Time Range Selector */}
        <div className="flex items-center gap-0.5 sm:gap-1 bg-card/50 rounded-lg p-1 overflow-x-auto">
          {TIME_RANGES.map((range) => (
            <button
              key={range.value}
              onClick={() => handleRangeChange(range.value)}
              disabled={chartLoading}
              className={`flex-1 min-w-[40px] px-2 sm:px-3 py-2 sm:py-1.5 text-xs font-medium rounded-md transition-colors ${
                selectedRange === range.value
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>

        {/* Chart */}
        <div className="bg-card/30 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">
              Price History ({data.history.rangeLabel})
            </div>
            <div className={`text-sm font-medium ${isRangePositive ? 'text-emerald-400' : 'text-red-400'}`}>
              {isRangePositive ? '+' : ''}{rangeChange.toFixed(2)}%
            </div>
          </div>
          {chartLoading ? (
            <div className="h-[200px] flex items-center justify-center">
              <RefreshCw className="w-6 h-6 text-muted-foreground animate-spin" />
            </div>
          ) : data.history.prices.length >= 2 ? (
            <StockChart
              data={data.history.prices}
              timestamps={data.history.timestamps}
              isPositive={isRangePositive}
              range={data.history.range}
              currency={data.currency}
            />
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
              Insufficient historical data available
            </div>
          )}
        </div>

        {/* Key Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 text-sm">
          <div className="bg-card/30 rounded-lg p-2 sm:p-3">
            <div className="text-muted-foreground text-xs">Open</div>
            <div className="text-foreground/90 font-medium mt-1 text-xs sm:text-sm">{formatCurrency(data.dayOpen, data.currency)}</div>
          </div>
          <div className="bg-card/30 rounded-lg p-2 sm:p-3">
            <div className="text-muted-foreground text-xs">Volume</div>
            <div className="text-foreground/90 font-medium mt-1 text-xs sm:text-sm">{formatNumber(data.volume)}</div>
          </div>
          <div className="bg-card/30 rounded-lg p-2 sm:p-3">
            <div className="text-muted-foreground text-xs">Avg Vol</div>
            <div className="text-foreground/90 font-medium mt-1 text-xs sm:text-sm">{formatNumber(data.avgVolume)}</div>
          </div>
          <div className="bg-card/30 rounded-lg p-2 sm:p-3">
            <div className="text-muted-foreground text-xs">Day High</div>
            <div className="text-foreground/90 font-medium mt-1 text-xs sm:text-sm">{formatCurrency(data.dayHigh, data.currency)}</div>
          </div>
        </div>

        {/* Price Ranges */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-sm">
          <div className="bg-card/30 rounded-lg p-2 sm:p-3">
            <div className="text-muted-foreground text-xs">Day Range</div>
            <div className="text-foreground/90 font-medium mt-1 text-xs sm:text-sm">
              {formatCurrency(data.dayLow, data.currency)} - {formatCurrency(data.dayHigh, data.currency)}
            </div>
            <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden relative">
              <div
                className="h-full bg-gradient-to-r from-red-500 via-muted-foreground to-emerald-500"
                style={{ width: '100%' }}
              />
              <div
                className="absolute top-0 w-1 h-1.5 bg-foreground rounded-full"
                style={{
                  left: `${Math.max(0, Math.min(100, ((data.price - data.dayLow) / (data.dayHigh - data.dayLow || 1)) * 100))}%`,
                  transform: 'translateX(-50%)'
                }}
              />
            </div>
          </div>
          <div className="bg-card/30 rounded-lg p-2 sm:p-3">
            <div className="text-muted-foreground text-xs">52 Week Range</div>
            <div className="text-foreground/90 font-medium mt-1 text-xs sm:text-sm">
              {formatCurrency(data.fiftyTwoWeekLow, data.currency)} - {formatCurrency(data.fiftyTwoWeekHigh, data.currency)}
            </div>
            <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden relative">
              <div
                className="h-full bg-gradient-to-r from-red-500 via-muted-foreground to-emerald-500"
                style={{ width: '100%' }}
              />
              <div
                className="absolute top-0 w-1 h-1.5 bg-foreground rounded-full"
                style={{
                  left: `${Math.max(0, Math.min(100, ((data.price - data.fiftyTwoWeekLow) / (data.fiftyTwoWeekHigh - data.fiftyTwoWeekLow || 1)) * 100))}%`,
                  transform: 'translateX(-50%)'
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
