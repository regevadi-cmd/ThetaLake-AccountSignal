'use client';

import { useState, useEffect, useCallback } from 'react';
import { ProviderName, PROVIDER_INFO } from '@/types/analysis';
import { useAuth } from '@/lib/contexts/AuthContext';

export type WebSearchProvider = 'tavily' | 'websearchapi' | 'none';

interface ServerSettings {
  default_provider: ProviderName;
  openai_model: string;
  anthropic_model: string;
  gemini_model: string;
  perplexity_model: string;
  web_search_provider: WebSearchProvider;
  // API keys are masked for non-admins, so we just check if they exist
  openai_api_key: string | null;
  anthropic_api_key: string | null;
  gemini_api_key: string | null;
  perplexity_api_key: string | null;
  tavily_api_key: string | null;
  websearchapi_key: string | null;
  isAdmin: boolean;
}

const DEFAULT_SETTINGS: ServerSettings = {
  default_provider: 'openai',
  openai_model: PROVIDER_INFO.openai.defaultModel,
  anthropic_model: PROVIDER_INFO.anthropic.defaultModel,
  gemini_model: PROVIDER_INFO.gemini.defaultModel,
  perplexity_model: PROVIDER_INFO.perplexity.defaultModel,
  web_search_provider: 'none',
  openai_api_key: null,
  anthropic_api_key: null,
  gemini_api_key: null,
  perplexity_api_key: null,
  tavily_api_key: null,
  websearchapi_key: null,
  isAdmin: false,
};

export function useServerSettings() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [settings, setSettings] = useState<ServerSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch settings from server when authenticated
  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      setSettings(DEFAULT_SETTINGS);
      setLoaded(true);
      return;
    }

    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/settings');
        if (response.ok) {
          const data = await response.json();
          setSettings({
            default_provider: data.default_provider || 'openai',
            openai_model: data.openai_model || PROVIDER_INFO.openai.defaultModel,
            anthropic_model: data.anthropic_model || PROVIDER_INFO.anthropic.defaultModel,
            gemini_model: data.gemini_model || PROVIDER_INFO.gemini.defaultModel,
            perplexity_model: data.perplexity_model || PROVIDER_INFO.perplexity.defaultModel,
            web_search_provider: data.web_search_provider || 'none',
            openai_api_key: data.openai_api_key,
            anthropic_api_key: data.anthropic_api_key,
            gemini_api_key: data.gemini_api_key,
            perplexity_api_key: data.perplexity_api_key,
            tavily_api_key: data.tavily_api_key,
            websearchapi_key: data.websearchapi_key,
            isAdmin: data.isAdmin || false,
          });
        } else if (response.status === 401) {
          // Not authenticated, use defaults
          setSettings(DEFAULT_SETTINGS);
        } else {
          setError('Failed to load settings');
        }
      } catch (err) {
        console.error('Error fetching settings:', err);
        setError('Failed to load settings');
      } finally {
        setLoaded(true);
      }
    };

    fetchSettings();
  }, [isAuthenticated, authLoading]);

  // Get the current provider
  const selectedProvider = settings.default_provider;

  // Get model for a provider
  const getSelectedModel = useCallback((provider: ProviderName): string => {
    switch (provider) {
      case 'openai': return settings.openai_model;
      case 'anthropic': return settings.anthropic_model;
      case 'gemini': return settings.gemini_model;
      case 'perplexity': return settings.perplexity_model;
    }
  }, [settings]);

  // Check if provider has an API key configured
  const hasKey = useCallback((provider: ProviderName): boolean => {
    switch (provider) {
      case 'openai': return !!settings.openai_api_key;
      case 'anthropic': return !!settings.anthropic_api_key;
      case 'gemini': return !!settings.gemini_api_key;
      case 'perplexity': return !!settings.perplexity_api_key;
    }
  }, [settings]);

  // Refresh settings from server
  const refreshSettings = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const response = await fetch('/api/settings');
      if (response.ok) {
        const data = await response.json();
        setSettings({
          default_provider: data.default_provider || 'openai',
          openai_model: data.openai_model || PROVIDER_INFO.openai.defaultModel,
          anthropic_model: data.anthropic_model || PROVIDER_INFO.anthropic.defaultModel,
          gemini_model: data.gemini_model || PROVIDER_INFO.gemini.defaultModel,
          perplexity_model: data.perplexity_model || PROVIDER_INFO.perplexity.defaultModel,
          web_search_provider: data.web_search_provider || 'none',
          openai_api_key: data.openai_api_key,
          anthropic_api_key: data.anthropic_api_key,
          gemini_api_key: data.gemini_api_key,
          perplexity_api_key: data.perplexity_api_key,
          tavily_api_key: data.tavily_api_key,
          websearchapi_key: data.websearchapi_key,
          isAdmin: data.isAdmin || false,
        });
      }
    } catch (err) {
      console.error('Error refreshing settings:', err);
    }
  }, [isAuthenticated]);

  return {
    settings,
    loaded,
    error,
    selectedProvider,
    getSelectedModel,
    hasKey,
    webSearchProvider: settings.web_search_provider,
    isAdmin: settings.isAdmin,
    refreshSettings,
  };
}
