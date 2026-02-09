'use client';

import { useState, useEffect } from 'react';
import { ExternalLink, Eye, EyeOff, Check, Settings, Key, Search, Cpu, Loader2, X, CheckCircle2, XCircle, Users, Trash2, Shield, ShieldOff, User, LineChart, Sun, Moon, Monitor, Sliders } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAuth } from '@/lib/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ProviderName, PROVIDER_INFO } from '@/types/analysis';
import { WebSearchProvider } from '@/lib/hooks/useApiKeys';


interface SaveSettings {
  provider: ProviderName;
  model: string;
  apiKey?: string;
  webSearchProvider: WebSearchProvider;
  tavilyKey?: string | null;
  webSearchKey?: string | null;
}

interface UserProfile {
  id: string;
  email: string;
  display_name: string | null;
  role: 'admin' | 'user';
  created_at: string;
}

interface ApiKeyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAdmin?: boolean;
  selectedProvider: ProviderName;
  selectedModel: string;
  currentKey?: string;
  webSearchProvider: WebSearchProvider;
  tavilyApiKey?: string;
  webSearchApiKey?: string;
  onSaveAll: (settings: SaveSettings) => Promise<void>;
}

export function ApiKeyModal({
  open,
  onOpenChange,
  isAdmin = false,
  selectedProvider: initialProvider,
  selectedModel: initialModel,
  currentKey,
  webSearchProvider: initialWebSearchProvider,
  tavilyApiKey,
  webSearchApiKey,
  onSaveAll
}: ApiKeyModalProps) {
  const { theme, setTheme } = useTheme();
  const { user: currentUser } = useAuth();
  const [selectedProvider, setSelectedProvider] = useState<ProviderName>(initialProvider);
  const [selectedModel, setSelectedModel] = useState(initialModel);
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [tavilyKey, setTavilyKey] = useState('');
  const [showTavilyKey, setShowTavilyKey] = useState(false);
  const [webKey, setWebKey] = useState('');
  const [showWebKey, setShowWebKey] = useState(false);
  const [webSearchProvider, setWebSearchProvider] = useState<WebSearchProvider>(initialWebSearchProvider);
  const [activeTab, setActiveTab] = useState<'preferences' | 'provider' | 'websearch' | 'users'>('preferences');
  const [testingKey, setTestingKey] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [togglingRoleUserId, setTogglingRoleUserId] = useState<string | null>(null);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [usersWarning, setUsersWarning] = useState<string | null>(null);
  const [keyTestResult, setKeyTestResult] = useState<{ valid: boolean; error?: string } | null>(null);
  const [testingWebSearch, setTestingWebSearch] = useState(false);
  const [webSearchTestResult, setWebSearchTestResult] = useState<{ valid: boolean; error?: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [stockChartEnabled, setStockChartEnabled] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('marketpulse_show_stock_chart');
    setStockChartEnabled(stored === 'true');
  }, []);

  useEffect(() => {
    if (open) {
      setSelectedProvider(initialProvider);
      setSelectedModel(initialModel);
      setApiKey(currentKey || '');
      setTavilyKey(tavilyApiKey || '');
      setWebKey(webSearchApiKey || '');
      setWebSearchProvider(initialWebSearchProvider);
      setKeyTestResult(null);
      setWebSearchTestResult(null);
      // Load user preferences from localStorage
      const stored = localStorage.getItem('marketpulse_show_stock_chart');
      setStockChartEnabled(stored === 'true');
      // Default to preferences tab for non-admins
      if (!isAdmin) setActiveTab('preferences');
    }
  }, [open, initialProvider, initialModel, currentKey, tavilyApiKey, webSearchApiKey, initialWebSearchProvider, isAdmin]);

  // Reset web search test result when keys change
  useEffect(() => {
    setWebSearchTestResult(null);
  }, [tavilyKey, webKey, webSearchProvider]);

  // Reset test result when API key changes
  useEffect(() => {
    setKeyTestResult(null);
  }, [apiKey, selectedProvider]);

  // Fetch users when switching to users tab
  useEffect(() => {
    if (activeTab === 'users' && users.length === 0) {
      fetchUsers();
    }
  }, [activeTab]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    setUsersError(null);
    setUsersWarning(null);
    try {
      const response = await fetch('/api/admin/users');
      const data = await response.json();

      if (!response.ok) {
        setUsersError(data.error || 'Failed to fetch users');
        setUsers([]);
        return;
      }

      setUsers(data.users || []);
      if (data.warning) {
        setUsersWarning(data.warning);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setUsersError('Network error - failed to fetch users');
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    setDeletingUserId(userId);
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setUsers(users.filter(u => u.id !== userId));
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete user');
      }
    } catch (err) {
      console.error('Failed to delete user:', err);
      alert('Failed to delete user');
    } finally {
      setDeletingUserId(null);
    }
  };

  const toggleRole = async (userId: string, currentRole: 'admin' | 'user') => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    const action = newRole === 'admin' ? 'promote' : 'demote';
    if (!confirm(`Are you sure you want to ${action} this user to ${newRole}?`)) {
      return;
    }

    setTogglingRoleUserId(userId);
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      });

      if (response.ok) {
        setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update user role');
      }
    } catch (err) {
      console.error('Failed to toggle role:', err);
      alert('Failed to update user role');
    } finally {
      setTogglingRoleUserId(null);
    }
  };

  const provider = PROVIDER_INFO[selectedProvider];
  const providers: ProviderName[] = ['gemini', 'perplexity', 'openai', 'anthropic'];

  const testApiKey = async () => {
    if (!apiKey.trim()) return;

    setTestingKey(true);
    setKeyTestResult(null);

    try {
      const response = await fetch('/api/verify-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: selectedProvider,
          apiKey: apiKey.trim()
        })
      });

      const result = await response.json();
      setKeyTestResult(result);
    } catch (err) {
      setKeyTestResult({ valid: false, error: 'Connection failed' });
    } finally {
      setTestingKey(false);
    }
  };

  const testWebSearchKey = async () => {
    const keyToTest = webSearchProvider === 'tavily' ? tavilyKey : webKey;
    if (!keyToTest.trim() || webSearchProvider === 'none') return;

    setTestingWebSearch(true);
    setWebSearchTestResult(null);

    try {
      const response = await fetch('/api/verify-websearch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: webSearchProvider,
          apiKey: keyToTest.trim()
        })
      });

      const result = await response.json();
      setWebSearchTestResult(result);
    } catch (err) {
      setWebSearchTestResult({ valid: false, error: 'Connection failed' });
    } finally {
      setTestingWebSearch(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSaveAll({
        provider: selectedProvider,
        model: selectedModel,
        apiKey: apiKey.trim() || undefined,
        webSearchProvider,
        tavilyKey: tavilyKey.trim() || null,
        webSearchKey: webKey.trim() || null,
      });
      onOpenChange(false);
    } catch {
      // Error already handled in parent
    } finally {
      setSaving(false);
    }
  };

  const getWebSearchKeyForProvider = () => {
    if (webSearchProvider === 'tavily') return tavilyKey;
    if (webSearchProvider === 'claude') return apiKey; // Uses Anthropic API key
    if (webSearchProvider === 'websearchapi') return webKey;
    return '';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background border-border text-foreground sm:max-w-2xl overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Settings className="w-5 h-5 text-muted-foreground" />
            Settings
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Configure your AI provider and web search preferences
          </DialogDescription>
        </DialogHeader>

        {/* Tab Navigation */}
        <div className="flex gap-1 p-1 bg-muted/50 rounded-lg">
          <button
            onClick={() => setActiveTab('preferences')}
            className={`flex-1 flex items-center justify-center gap-2 px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${
              activeTab === 'preferences'
                ? 'bg-accent text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span className="hidden sm:inline">Preferences</span>
            <span className="sm:hidden">Prefs</span>
          </button>
          {isAdmin && (
            <>
              <button
                onClick={() => setActiveTab('provider')}
                className={`flex-1 flex items-center justify-center gap-2 px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                  activeTab === 'provider'
                    ? 'bg-accent text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Cpu className="w-4 h-4" />
                <span className="hidden sm:inline">AI Provider</span>
                <span className="sm:hidden">AI</span>
              </button>
              <button
                onClick={() => setActiveTab('websearch')}
                className={`flex-1 flex items-center justify-center gap-2 px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                  activeTab === 'websearch'
                    ? 'bg-accent text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Search className="w-4 h-4" />
                <span className="hidden sm:inline">Web Search</span>
                <span className="sm:hidden">Search</span>
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`flex-1 flex items-center justify-center gap-2 px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                  activeTab === 'users'
                    ? 'bg-accent text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Users</span>
              </button>
            </>
          )}
        </div>

        {/* Preferences Tab */}
        {activeTab === 'preferences' && mounted && (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Personalize your AccountSignal experience. These settings are saved to this browser.
            </p>

            {/* Theme Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Theme</label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { value: 'light', label: 'Light', icon: Sun },
                  { value: 'dark', label: 'Dark', icon: Moon },
                  { value: 'system', label: 'System', icon: Monitor },
                ] as const).map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setTheme(value)}
                    className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-all ${
                      theme === value
                        ? 'border-emerald-500 bg-emerald-500/10 text-foreground'
                        : 'border-border hover:border-muted-foreground text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Stock Chart Toggle */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Display</label>
              <button
                type="button"
                onClick={() => {
                  const next = !stockChartEnabled;
                  setStockChartEnabled(next);
                  localStorage.setItem('marketpulse_show_stock_chart', String(next));
                }}
                className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all text-left ${
                  stockChartEnabled
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-border hover:border-muted-foreground'
                }`}
              >
                <div className="flex items-center gap-3">
                  <LineChart className={`w-4 h-4 ${stockChartEnabled ? 'text-emerald-400' : 'text-muted-foreground'}`} />
                  <div>
                    <div className="font-medium text-sm text-foreground">Stock Chart</div>
                    <div className="text-xs text-muted-foreground">Show live stock quotes for public companies</div>
                  </div>
                </div>
                <div className={`w-9 h-5 rounded-full transition-colors flex items-center ${
                  stockChartEnabled ? 'bg-emerald-500 justify-end' : 'bg-muted-foreground/40 justify-start'
                }`}>
                  <div className="w-4 h-4 rounded-full bg-white mx-0.5" />
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Provider Tab */}
        {activeTab === 'provider' && (
          <div className="space-y-4 py-2">
            {/* Provider Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">AI Provider</label>
              <div className="grid grid-cols-2 gap-2">
                {providers.map((p) => {
                  const info = PROVIDER_INFO[p];
                  return (
                    <button
                      key={p}
                      onClick={() => setSelectedProvider(p)}
                      className={`flex items-center gap-2 p-3 rounded-lg border transition-all ${
                        selectedProvider === p
                          ? 'border-emerald-500 bg-emerald-500/10 text-foreground'
                          : 'border-border hover:border-muted-foreground text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <div className="flex-1 text-left">
                        <div className="font-medium text-sm">{info.name}</div>
                        {info.supportsWebGrounding && (
                          <div className="text-xs text-emerald-400 mt-0.5">Web grounding</div>
                        )}
                      </div>
                      {selectedProvider === p && (
                        <Check className="w-4 h-4 text-emerald-400" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Model Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Model</label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full bg-card border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              >
                {provider.models.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name} - {model.description}
                  </option>
                ))}
              </select>
            </div>

            {/* API Key Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Key className="w-4 h-4" />
                  {provider.name} API Key
                </label>
                <a
                  href={provider.keyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1"
                >
                  Get key
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={`Enter your ${provider.name} API key`}
                    className="bg-card border-border text-foreground placeholder:text-muted-foreground pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={testApiKey}
                  disabled={!apiKey.trim() || testingKey}
                  className="border-border text-muted-foreground hover:text-foreground hover:bg-accent whitespace-nowrap"
                >
                  {testingKey ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Test'
                  )}
                </Button>
              </div>

              {/* Test Result */}
              {keyTestResult && (
                <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border ${
                  keyTestResult.valid
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-red-500/10 text-red-400 border-red-500/20'
                }`}>
                  {keyTestResult.valid ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Connection successful - API key is valid</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4" />
                      <span>{keyTestResult.error || 'Invalid API key'}</span>
                    </>
                  )}
                </div>
              )}

              {/* Show configured status if no test run */}
              {!keyTestResult && apiKey && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Check className="w-3 h-3" />
                  API key configured - click Test to verify
                </div>
              )}
            </div>

            {/* Web Grounding Status */}
            {provider.supportsWebGrounding ? (
              <div className="flex items-center gap-2 text-sm bg-emerald-500/10 text-emerald-400 px-3 py-2 rounded-lg border border-emerald-500/20">
                <Check className="w-4 h-4" />
                <span>This provider has built-in web search</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm bg-amber-500/10 text-amber-400 px-3 py-2 rounded-lg border border-amber-500/20">
                <Search className="w-4 h-4" />
                <span>Configure web search in the Web Search tab for real-time data</span>
              </div>
            )}

          </div>
        )}

        {/* Web Search Tab */}
        {activeTab === 'websearch' && (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Web search augments AI providers (OpenAI, Anthropic) that don&apos;t have built-in web grounding with real-time data.
            </p>

            {/* Search Engine Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Search Engine</label>
              <div className="space-y-2">
                {/* Tavily Option */}
                <button
                  onClick={() => setWebSearchProvider('tavily')}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                    webSearchProvider === 'tavily'
                      ? 'border-purple-500 bg-purple-500/10'
                      : 'border-border hover:border-muted-foreground'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    webSearchProvider === 'tavily' ? 'border-purple-500' : 'border-muted-foreground/30'
                  }`}>
                    {webSearchProvider === 'tavily' && (
                      <div className="w-2 h-2 rounded-full bg-purple-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm text-foreground">Tavily</div>
                    <div className="text-xs text-muted-foreground">AI-powered search, recommended for accuracy</div>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-400">Recommended</span>
                </button>

                {/* Claude Web Search Option */}
                <button
                  onClick={() => setWebSearchProvider('claude')}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                    webSearchProvider === 'claude'
                      ? 'border-orange-500 bg-orange-500/10'
                      : 'border-border hover:border-muted-foreground'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    webSearchProvider === 'claude' ? 'border-orange-500' : 'border-muted-foreground/30'
                  }`}>
                    {webSearchProvider === 'claude' && (
                      <div className="w-2 h-2 rounded-full bg-orange-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm text-foreground">Claude Web Search</div>
                    <div className="text-xs text-muted-foreground">Uses Anthropic API key, powered by Brave</div>
                  </div>
                </button>

                {/* WebSearchAPI Option */}
                <button
                  onClick={() => setWebSearchProvider('websearchapi')}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                    webSearchProvider === 'websearchapi'
                      ? 'border-cyan-500 bg-cyan-500/10'
                      : 'border-border hover:border-muted-foreground'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    webSearchProvider === 'websearchapi' ? 'border-cyan-500' : 'border-muted-foreground/30'
                  }`}>
                    {webSearchProvider === 'websearchapi' && (
                      <div className="w-2 h-2 rounded-full bg-cyan-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm text-foreground">WebSearchAPI</div>
                    <div className="text-xs text-muted-foreground">Powered by Serper, fast results</div>
                  </div>
                </button>

                {/* None Option */}
                <button
                  onClick={() => setWebSearchProvider('none')}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                    webSearchProvider === 'none'
                      ? 'border-muted-foreground bg-muted'
                      : 'border-border hover:border-muted-foreground'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    webSearchProvider === 'none' ? 'border-muted-foreground' : 'border-muted-foreground/30'
                  }`}>
                    {webSearchProvider === 'none' && (
                      <div className="w-2 h-2 rounded-full bg-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm text-foreground">Disabled</div>
                    <div className="text-xs text-muted-foreground">Use AI knowledge only (no real-time data)</div>
                  </div>
                </button>
              </div>
            </div>

            {/* API Key Input for Selected Provider */}
            {webSearchProvider === 'tavily' && (
              <div className="space-y-2 p-3 bg-purple-500/5 rounded-lg border border-purple-500/20">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-purple-600 dark:text-purple-300 flex items-center gap-2">
                    <Key className="w-4 h-4" />
                    Tavily API Key
                  </label>
                  <a
                    href="https://tavily.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-purple-400 hover:text-purple-300 inline-flex items-center gap-1"
                  >
                    Get key
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showTavilyKey ? 'text' : 'password'}
                      value={tavilyKey}
                      onChange={(e) => setTavilyKey(e.target.value)}
                      placeholder="tvly-..."
                      className="bg-card border-border text-foreground placeholder:text-muted-foreground pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowTavilyKey(!showTavilyKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showTavilyKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={testWebSearchKey}
                    disabled={!tavilyKey.trim() || testingWebSearch}
                    className="border-purple-500/50 text-purple-500 dark:text-purple-300 hover:text-purple-700 dark:hover:text-white hover:bg-purple-500/20 whitespace-nowrap"
                  >
                    {testingWebSearch ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Test'
                    )}
                  </Button>
                </div>
                {/* Test Result */}
                {webSearchTestResult && (
                  <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border ${
                    webSearchTestResult.valid
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-red-500/10 text-red-400 border-red-500/20'
                  }`}>
                    {webSearchTestResult.valid ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Connection successful - Tavily API key is valid</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4" />
                        <span>{webSearchTestResult.error || 'Invalid API key'}</span>
                      </>
                    )}
                  </div>
                )}
                {!webSearchTestResult && tavilyKey && (
                  <div className="flex items-center gap-2 text-xs text-purple-400">
                    <Check className="w-3 h-3" />
                    Tavily API key configured - click Test to verify
                  </div>
                )}
              </div>
            )}

            {webSearchProvider === 'claude' && (
              <div className="space-y-2 p-3 bg-orange-500/5 rounded-lg border border-orange-500/20">
                <div className="flex items-center gap-2 text-sm text-orange-600 dark:text-orange-300">
                  <Key className="w-4 h-4" />
                  <span>Uses your Anthropic API key from the AI Provider tab</span>
                </div>
                {apiKey ? (
                  <div className="flex items-center gap-2 text-xs text-emerald-400">
                    <Check className="w-3 h-3" />
                    Anthropic API key configured
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-amber-400">
                    <Key className="w-3 h-3" />
                    Configure Anthropic API key in the AI Provider tab
                  </div>
                )}
              </div>
            )}

            {webSearchProvider === 'websearchapi' && (
              <div className="space-y-2 p-3 bg-cyan-500/5 rounded-lg border border-cyan-500/20">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-cyan-600 dark:text-cyan-300 flex items-center gap-2">
                    <Key className="w-4 h-4" />
                    WebSearchAPI Key
                  </label>
                  <a
                    href="https://websearchapi.ai"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1"
                  >
                    Get key
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showWebKey ? 'text' : 'password'}
                      value={webKey}
                      onChange={(e) => setWebKey(e.target.value)}
                      placeholder="Enter your WebSearchAPI key"
                      className="bg-card border-border text-foreground placeholder:text-muted-foreground pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowWebKey(!showWebKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showWebKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={testWebSearchKey}
                    disabled={!webKey.trim() || testingWebSearch}
                    className="border-cyan-500/50 text-cyan-600 dark:text-cyan-300 hover:text-cyan-700 dark:hover:text-white hover:bg-cyan-500/20 whitespace-nowrap"
                  >
                    {testingWebSearch ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Test'
                    )}
                  </Button>
                </div>
                {/* Test Result */}
                {webSearchTestResult && (
                  <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border ${
                    webSearchTestResult.valid
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-red-500/10 text-red-400 border-red-500/20'
                  }`}>
                    {webSearchTestResult.valid ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Connection successful - WebSearchAPI key is valid</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4" />
                        <span>{webSearchTestResult.error || 'Invalid API key'}</span>
                      </>
                    )}
                  </div>
                )}
                {!webSearchTestResult && webKey && (
                  <div className="flex items-center gap-2 text-xs text-cyan-400">
                    <Check className="w-3 h-3" />
                    WebSearchAPI key configured - click Test to verify
                  </div>
                )}
              </div>
            )}

            {webSearchProvider !== 'none' && !getWebSearchKeyForProvider() && (
              <div className="flex items-center gap-2 text-sm bg-amber-500/10 text-amber-400 px-3 py-2 rounded-lg border border-amber-500/20">
                <Key className="w-4 h-4" />
                <span>Enter an API key to enable web search</span>
              </div>
            )}

            {webSearchProvider !== 'none' && getWebSearchKeyForProvider() && (
              <div className="flex items-center gap-2 text-sm bg-emerald-500/10 text-emerald-400 px-3 py-2 rounded-lg border border-emerald-500/20">
                <Check className="w-4 h-4" />
                <span>Web search will be used for OpenAI and Anthropic</span>
              </div>
            )}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Manage registered users
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchUsers}
                disabled={loadingUsers}
                className="border-border text-muted-foreground hover:text-foreground"
              >
                {loadingUsers ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Refresh'
                )}
              </Button>
            </div>

            {/* Error message */}
            {usersError && (
              <div className="flex items-center gap-2 text-sm bg-red-500/10 text-red-400 px-3 py-2 rounded-lg border border-red-500/20">
                <XCircle className="w-4 h-4 flex-shrink-0" />
                <span>{usersError}</span>
              </div>
            )}

            {/* Warning message */}
            {usersWarning && (
              <div className="flex items-start gap-2 text-xs bg-amber-500/10 text-amber-400 px-3 py-2 rounded-lg border border-amber-500/20">
                <Shield className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{usersWarning}</span>
              </div>
            )}

            {loadingUsers && users.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>No users found</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 bg-card/50 rounded-lg border border-border"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        user.role === 'admin'
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {user.role === 'admin' ? (
                          <Shield className="w-4 h-4" />
                        ) : (
                          <User className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground truncate">
                            {user.display_name || user.email.split('@')[0]}
                          </span>
                          {user.role === 'admin' && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 flex-shrink-0">
                              Admin
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                        <div className="text-xs text-muted-foreground/70">
                          Joined {new Date(user.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                      {/* Role toggle - hidden for current user */}
                      {currentUser?.id !== user.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleRole(user.id, user.role)}
                          disabled={togglingRoleUserId === user.id}
                          className={`${
                            user.role === 'admin'
                              ? 'text-amber-400 hover:text-amber-300 hover:bg-amber-500/10'
                              : 'text-muted-foreground hover:text-amber-400 hover:bg-amber-500/10'
                          }`}
                          title={user.role === 'admin' ? 'Demote to user' : 'Promote to admin'}
                        >
                          {togglingRoleUserId === user.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : user.role === 'admin' ? (
                            <ShieldOff className="w-4 h-4" />
                          ) : (
                            <Shield className="w-4 h-4" />
                          )}
                        </Button>
                      )}
                      {/* Delete - hidden for admins */}
                      {user.role !== 'admin' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteUser(user.id)}
                          disabled={deletingUserId === user.id}
                          className="text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                        >
                          {deletingUserId === user.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="text-xs text-muted-foreground pt-2 border-t border-border">
              Total: {users.length} user{users.length !== 1 ? 's' : ''} ({users.filter(u => u.role === 'admin').length} admin{users.filter(u => u.role === 'admin').length !== 1 ? 's' : ''})
            </div>
          </div>
        )}

        <div className="flex gap-3 justify-end pt-2 border-t border-border">
          {isAdmin ? (
            <>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="border-border text-muted-foreground hover:text-foreground hover:bg-accent"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-500 text-white btn-scale"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  'Save Settings'
                )}
              </Button>
            </>
          ) : (
            <Button
              onClick={() => onOpenChange(false)}
              className="bg-accent hover:bg-accent/80 text-foreground"
            >
              Close
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
