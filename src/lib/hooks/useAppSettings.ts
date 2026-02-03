'use client';

import { useState, useEffect, useCallback } from 'react';
import { AIProvider, WebSearchProvider } from '@/types/database';

export interface AppSettings {
  id?: string;
  default_provider: AIProvider;
  openai_api_key: string | null;
  anthropic_api_key: string | null;
  gemini_api_key: string | null;
  perplexity_api_key: string | null;
  openai_model: string;
  anthropic_model: string;
  gemini_model: string;
  perplexity_model: string;
  web_search_provider: WebSearchProvider;
  tavily_api_key: string | null;
  websearchapi_key: string | null;
  updated_at?: string;
  updated_by?: string | null;
  isAdmin: boolean;
}

interface UseAppSettingsReturn {
  settings: AppSettings | null;
  isLoading: boolean;
  error: string | null;
  isAdmin: boolean;
  refetch: () => Promise<void>;
  updateSettings: (updates: Partial<AppSettings>) => Promise<boolean>;
}

const DEFAULT_SETTINGS: AppSettings = {
  default_provider: 'openai',
  openai_api_key: null,
  anthropic_api_key: null,
  gemini_api_key: null,
  perplexity_api_key: null,
  openai_model: 'gpt-4o',
  anthropic_model: 'claude-sonnet-4-20250514',
  gemini_model: 'gemini-2.5-flash',
  perplexity_model: 'sonar-pro',
  web_search_provider: 'none',
  tavily_api_key: null,
  websearchapi_key: null,
  isAdmin: false,
};

export function useAppSettings(): UseAppSettingsReturn {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/settings');

      if (response.status === 401) {
        // Not authenticated - use defaults
        setSettings(DEFAULT_SETTINGS);
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch settings');
      }

      const data = await response.json();
      setSettings(data);
    } catch (err) {
      console.error('Error fetching settings:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setSettings(DEFAULT_SETTINGS);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateSettings = useCallback(async (updates: Partial<AppSettings>): Promise<boolean> => {
    try {
      setError(null);

      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (response.status === 401) {
        setError('Unauthorized');
        return false;
      }

      if (response.status === 403) {
        setError('Admin access required');
        return false;
      }

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update settings');
      }

      const data = await response.json();
      setSettings(data);
      return true;
    } catch (err) {
      console.error('Error updating settings:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return {
    settings,
    isLoading,
    error,
    isAdmin: settings?.isAdmin ?? false,
    refetch: fetchSettings,
    updateSettings,
  };
}
