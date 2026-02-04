'use client';

import { useState, useEffect, useCallback } from 'react';
import { ProviderName, PROVIDER_INFO } from '@/types/analysis';

const STORAGE_KEY_PREFIX = 'marketpulse_apikey_';
const STORAGE_PROVIDER_KEY = 'marketpulse_selected_provider';
const STORAGE_MODEL_PREFIX = 'marketpulse_selected_model_';
const STORAGE_WEBSEARCH_KEY = 'marketpulse_websearch_apikey';
const STORAGE_TAVILY_KEY = 'marketpulse_tavily_apikey';
const STORAGE_WEBSEARCH_PROVIDER_KEY = 'marketpulse_websearch_provider';

export type WebSearchProvider = 'tavily' | 'claude' | 'websearchapi' | 'none';

export function useApiKeys() {
  const [keys, setKeys] = useState<Record<ProviderName, string | null>>({
    openai: null,
    anthropic: null,
    gemini: null,
    perplexity: null
  });
  const [webSearchApiKey, setWebSearchApiKeyState] = useState<string | null>(null);
  const [tavilyApiKey, setTavilyApiKeyState] = useState<string | null>(null);
  const [selectedProvider, setSelectedProviderState] = useState<ProviderName>('gemini');
  const [webSearchProvider, setWebSearchProviderState] = useState<WebSearchProvider>('tavily');
  const [selectedModels, setSelectedModels] = useState<Record<ProviderName, string>>({
    openai: PROVIDER_INFO.openai.defaultModel,
    anthropic: PROVIDER_INFO.anthropic.defaultModel,
    gemini: PROVIDER_INFO.gemini.defaultModel,
    perplexity: PROVIDER_INFO.perplexity.defaultModel
  });
  const [loaded, setLoaded] = useState(false);

  // Load keys, provider, and models from localStorage on mount
  useEffect(() => {
    const providers: ProviderName[] = ['openai', 'anthropic', 'gemini', 'perplexity'];
    const loadedKeys: Record<ProviderName, string | null> = {
      openai: null,
      anthropic: null,
      gemini: null,
      perplexity: null
    };
    const loadedModels: Record<ProviderName, string> = {
      openai: PROVIDER_INFO.openai.defaultModel,
      anthropic: PROVIDER_INFO.anthropic.defaultModel,
      gemini: PROVIDER_INFO.gemini.defaultModel,
      perplexity: PROVIDER_INFO.perplexity.defaultModel
    };

    providers.forEach((provider) => {
      // Load API key
      const key = localStorage.getItem(`${STORAGE_KEY_PREFIX}${provider}`);
      loadedKeys[provider] = key;

      // Load selected model for this provider
      const model = localStorage.getItem(`${STORAGE_MODEL_PREFIX}${provider}`);
      if (model) {
        loadedModels[provider] = model;
      }
    });

    // Load selected provider
    const savedProvider = localStorage.getItem(STORAGE_PROVIDER_KEY) as ProviderName | null;
    if (savedProvider && providers.includes(savedProvider)) {
      setSelectedProviderState(savedProvider);
    }

    // Load WebSearchAPI key
    const savedWebSearchKey = localStorage.getItem(STORAGE_WEBSEARCH_KEY);
    if (savedWebSearchKey) {
      setWebSearchApiKeyState(savedWebSearchKey);
    }

    // Load Tavily API key
    const savedTavilyKey = localStorage.getItem(STORAGE_TAVILY_KEY);
    if (savedTavilyKey) {
      setTavilyApiKeyState(savedTavilyKey);
    }

    // Load web search provider preference (default to tavily)
    const savedWebSearchProvider = localStorage.getItem(STORAGE_WEBSEARCH_PROVIDER_KEY) as WebSearchProvider | null;
    if (savedWebSearchProvider && ['tavily', 'claude', 'websearchapi', 'none'].includes(savedWebSearchProvider)) {
      setWebSearchProviderState(savedWebSearchProvider);
    }

    setKeys(loadedKeys);
    setSelectedModels(loadedModels);
    setLoaded(true);
  }, []);

  const getKey = useCallback(
    (provider: ProviderName): string | null => {
      return keys[provider];
    },
    [keys]
  );

  const setKey = useCallback((provider: ProviderName, key: string) => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${provider}`, key);
    setKeys((prev) => ({ ...prev, [provider]: key }));
  }, []);

  const removeKey = useCallback((provider: ProviderName) => {
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}${provider}`);
    setKeys((prev) => ({ ...prev, [provider]: null }));
  }, []);

  const hasKey = useCallback(
    (provider: ProviderName): boolean => {
      return !!keys[provider];
    },
    [keys]
  );

  const setSelectedProvider = useCallback((provider: ProviderName) => {
    localStorage.setItem(STORAGE_PROVIDER_KEY, provider);
    setSelectedProviderState(provider);
  }, []);

  const getSelectedModel = useCallback(
    (provider: ProviderName): string => {
      return selectedModels[provider];
    },
    [selectedModels]
  );

  const setSelectedModel = useCallback((provider: ProviderName, model: string) => {
    localStorage.setItem(`${STORAGE_MODEL_PREFIX}${provider}`, model);
    setSelectedModels((prev) => ({ ...prev, [provider]: model }));
  }, []);

  const setWebSearchApiKey = useCallback((key: string | null) => {
    if (key) {
      localStorage.setItem(STORAGE_WEBSEARCH_KEY, key);
    } else {
      localStorage.removeItem(STORAGE_WEBSEARCH_KEY);
    }
    setWebSearchApiKeyState(key);
  }, []);

  const setTavilyApiKey = useCallback((key: string | null) => {
    if (key) {
      localStorage.setItem(STORAGE_TAVILY_KEY, key);
    } else {
      localStorage.removeItem(STORAGE_TAVILY_KEY);
    }
    setTavilyApiKeyState(key);
  }, []);

  const setWebSearchProvider = useCallback((provider: WebSearchProvider) => {
    localStorage.setItem(STORAGE_WEBSEARCH_PROVIDER_KEY, provider);
    setWebSearchProviderState(provider);
  }, []);

  const hasAnyKey = Object.values(keys).some((key) => !!key);

  // Get the active web search API key based on selected provider
  const getActiveWebSearchKey = useCallback((): string | null => {
    if (webSearchProvider === 'tavily') return tavilyApiKey;
    if (webSearchProvider === 'claude') return keys.anthropic; // Uses Anthropic API key
    if (webSearchProvider === 'websearchapi') return webSearchApiKey;
    return null;
  }, [webSearchProvider, tavilyApiKey, webSearchApiKey, keys.anthropic]);

  return {
    keys,
    loaded,
    getKey,
    setKey,
    removeKey,
    hasKey,
    hasAnyKey,
    selectedProvider,
    setSelectedProvider,
    selectedModels,
    getSelectedModel,
    setSelectedModel,
    webSearchApiKey,
    setWebSearchApiKey,
    tavilyApiKey,
    setTavilyApiKey,
    webSearchProvider,
    setWebSearchProvider,
    getActiveWebSearchKey
  };
}
