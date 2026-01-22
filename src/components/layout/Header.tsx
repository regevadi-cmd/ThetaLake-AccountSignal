'use client';

import { useState, useEffect, useRef } from 'react';
import { TrendingUp, Search, Loader2, Settings } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ProviderName, PROVIDER_INFO } from '@/types/analysis';
import { useAuth } from '@/lib/contexts/AuthContext';
import { LoginButton } from '@/components/auth/LoginButton';
import { UserMenu } from '@/components/auth/UserMenu';

export interface CompanyInfo {
  name: string;
  symbol?: string;
  isPublic: boolean;
  publicStatus?: 'public' | 'private' | 'went_private' | 'pre_ipo' | 'unknown';
}

interface CompanySuggestion {
  name: string;
  symbol?: string;
  description?: string;
  isPublic: boolean;
  publicStatus?: 'public' | 'private' | 'went_private' | 'pre_ipo' | 'unknown';
  isCustomSearch?: boolean;
}

interface HeaderProps {
  onSearch: (companyName: string, companyInfo?: CompanyInfo) => void;
  onClearResults?: () => void; // Called when user starts typing to clear old results
  loading: boolean;
  selectedProvider: ProviderName;
  selectedModel: string;
  onSettingsClick: () => void;
  onAboutClick: () => void;
}

export function Header({
  onSearch,
  onClearResults,
  loading,
  selectedProvider,
  selectedModel,
  onSettingsClick,
  onAboutClick
}: HeaderProps) {
  const { isAuthenticated, isAdmin, isLoading: authLoading } = useAuth();
  const [searchInput, setSearchInput] = useState('');
  const [suggestions, setSuggestions] = useState<CompanySuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [selectedCompany, setSelectedCompany] = useState<CompanySuggestion | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch company suggestions
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (searchInput.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      setIsSearching(false);
      return;
    }

    // Don't fetch suggestions if input matches selected company (analysis already started)
    if (selectedCompany && searchInput === selectedCompany.name) {
      setIsSearching(false);
      return;
    }

    // Clear selected company when user types something different
    if (selectedCompany && searchInput !== selectedCompany.name) {
      setSelectedCompany(null);
    }

    setIsSearching(true);

    debounceRef.current = setTimeout(async () => {
      try {
        const response = await fetch(`/api/company/search?q=${encodeURIComponent(searchInput.trim())}`);
        if (response.ok) {
          const data = await response.json();
          const results = data.results || [];
          setSuggestions(results);
          // Always show dropdown if we have results (including custom search option)
          setShowSuggestions(results.length > 0);
          setSelectedIndex(-1);
        }
      } catch (err) {
        console.error('Company search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchInput, selectedCompany]);

  // Close suggestions when clicking outside (but not when clicking Analyze button)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // Don't close if clicking on the Analyze button (let form submit handle it)
      if (target.closest('button[type="submit"]')) {
        return;
      }
      if (searchRef.current && !searchRef.current.contains(target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim() || loading) return;

    // IMPORTANT: The Search/Select button NEVER starts analysis directly
    // It only shows suggestions - user must click a suggestion to analyze

    // If suggestions are visible, keep them visible (don't do anything else)
    if (showSuggestions && suggestions.length > 0) {
      inputRef.current?.focus();
      return;
    }

    // If we already have suggestions but dropdown is hidden, show them
    if (suggestions.length > 0) {
      setShowSuggestions(true);
      setSelectedIndex(-1); // Don't auto-select anything
      inputRef.current?.focus();
      return;
    }

    // If still loading suggestions, wait
    if (isSearching) {
      inputRef.current?.focus();
      return;
    }

    // No suggestions yet - fetch them
    if (searchInput.trim().length >= 2) {
      setIsSearching(true);
      try {
        const response = await fetch(`/api/company/search?q=${encodeURIComponent(searchInput.trim())}`);
        if (response.ok) {
          const data = await response.json();
          const results = data.results || [];
          setSuggestions(results);
          if (results.length > 0) {
            setShowSuggestions(true);
            setSelectedIndex(-1); // Don't auto-select - require explicit click
          }
        }
      } catch (err) {
        console.error('Company search error:', err);
      } finally {
        setIsSearching(false);
      }
      inputRef.current?.focus();
    }
  };

  const handleSelectSuggestion = (suggestion: CompanySuggestion) => {
    setSearchInput(suggestion.name);
    setSelectedCompany(suggestion);
    setShowSuggestions(false);
    setSuggestions([]);
    // Start analysis immediately when user explicitly selects a company
    onSearch(suggestion.name, {
      name: suggestion.name,
      symbol: suggestion.symbol,
      isPublic: suggestion.isPublic,
      publicStatus: suggestion.publicStatus
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      handleSelectSuggestion(suggestions[selectedIndex]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const currentProviderInfo = PROVIDER_INFO[selectedProvider];
  const currentModelInfo = currentProviderInfo.models.find(m => m.id === selectedModel);

  return (
    <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-lg border-b border-zinc-800">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
        {/* Mobile: Stack vertically, Desktop: Single row */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          {/* Top Row: Logo + Auth (mobile), Logo only (desktop) */}
          <div className="flex items-center justify-between sm:justify-start gap-3 flex-shrink-0">
            {/* Logo */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-white">MarketPulse</h1>
                <p className="text-xs text-zinc-500 hidden sm:block">Corporate Intelligence</p>
              </div>
            </div>

            {/* Auth Section - Mobile: Show in top row */}
            <div className="flex sm:hidden items-center gap-2">
              {!authLoading && (
                isAuthenticated ? (
                  <UserMenu onSettingsClick={isAdmin ? onSettingsClick : undefined} onAboutClick={onAboutClick} />
                ) : (
                  <LoginButton />
                )
              )}
            </div>
          </div>

          {/* Search Form - Full width on mobile */}
          <form onSubmit={handleSubmit} className="flex-1 sm:max-w-2xl">
            <div className="relative flex gap-2">
              <div className="relative flex-1" ref={searchRef}>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-zinc-500 z-10" />
                <Input
                  ref={inputRef}
                  type="text"
                  value={searchInput}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    setSearchInput(newValue);
                    if (newValue.trim() && onClearResults) {
                      onClearResults();
                    }
                  }}
                  onKeyDown={handleKeyDown}
                  onFocus={() => suggestions.length > 0 && !selectedCompany && setShowSuggestions(true)}
                  placeholder="Search company..."
                  className="pl-9 sm:pl-10 h-10 sm:h-11 text-sm sm:text-base bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-emerald-500"
                />

                {/* Company Suggestions Dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-50 overflow-hidden max-h-[60vh] overflow-y-auto">
                    <div className="text-xs text-emerald-400 px-3 py-2 border-b border-zinc-800 bg-emerald-500/10 sticky top-0">
                      👆 Tap to select:
                    </div>
                    {suggestions.map((suggestion, index) => (
                      <button
                        key={`${suggestion.name}-${suggestion.isCustomSearch ? 'custom' : 'known'}`}
                        type="button"
                        onClick={() => handleSelectSuggestion(suggestion)}
                        className={`w-full flex items-center justify-between px-3 py-3 sm:py-2.5 text-left transition-colors ${
                          suggestion.isCustomSearch ? 'border-t border-zinc-800' : ''
                        } ${
                          index === selectedIndex
                            ? 'bg-emerald-500/20 text-white'
                            : 'hover:bg-zinc-800 active:bg-zinc-700 text-zinc-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {suggestion.isCustomSearch && (
                            <Search className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                          )}
                          <span className={`font-medium truncate ${suggestion.isCustomSearch ? 'text-cyan-400' : ''}`}>
                            {suggestion.name}
                          </span>
                          {suggestion.symbol && !suggestion.isCustomSearch && (
                            <span className="text-emerald-400 text-sm flex-shrink-0">{suggestion.symbol}</span>
                          )}
                        </div>
                        <span className={`text-xs ml-2 flex-shrink-0 hidden sm:inline ${suggestion.isCustomSearch ? 'text-cyan-400/70' : 'text-zinc-500'}`}>
                          {suggestion.description}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Provider/Model Display - Hidden on mobile, shown on desktop */}
              {isAdmin && (
                <Button
                  variant="outline"
                  onClick={onSettingsClick}
                  className="hidden md:flex bg-zinc-900 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white justify-between gap-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{currentProviderInfo.name}</span>
                    <span className="text-zinc-500">•</span>
                    <span className="text-zinc-400">{currentModelInfo?.name || selectedModel}</span>
                  </div>
                  {currentProviderInfo.supportsWebGrounding && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" title="Web search" />
                  )}
                  <Settings className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                </Button>
              )}

              {/* Provider/Model Display (non-admin - read only) - Hidden on mobile */}
              {!isAdmin && isAuthenticated && (
                <div className="hidden md:flex items-center gap-2 px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-sm">
                  <span className="font-medium text-zinc-300">{currentProviderInfo.name}</span>
                  <span className="text-zinc-500">•</span>
                  <span className="text-zinc-400">{currentModelInfo?.name || selectedModel}</span>
                  {currentProviderInfo.supportsWebGrounding && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" title="Web search" />
                  )}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading || !searchInput.trim() || isSearching}
                className="bg-emerald-600 hover:bg-emerald-500 text-white btn-scale h-10 sm:h-11 px-3 sm:px-4"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isSearching ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4 sm:hidden" />
                )}
                <span className="hidden sm:inline">
                  {loading ? '' : isSearching ? 'Searching...' : showSuggestions ? 'Select' : 'Search'}
                </span>
              </Button>
            </div>
          </form>

          {/* Auth Section - Desktop: Show in main row */}
          <div className="hidden sm:flex items-center gap-3 flex-shrink-0">
            {!authLoading && (
              isAuthenticated ? (
                <UserMenu onSettingsClick={isAdmin ? onSettingsClick : undefined} onAboutClick={onAboutClick} />
              ) : (
                <LoginButton />
              )
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
