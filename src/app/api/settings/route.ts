import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Type for settings update
interface AppSettingsUpdate {
  default_provider?: string;
  openai_api_key?: string | null;
  anthropic_api_key?: string | null;
  gemini_api_key?: string | null;
  perplexity_api_key?: string | null;
  openai_model?: string;
  anthropic_model?: string;
  gemini_model?: string;
  perplexity_model?: string;
  web_search_provider?: string;
  tavily_api_key?: string | null;
  websearchapi_key?: string | null;
  updated_by?: string;
}

// Mask API key for display (show first 4 and last 4 chars)
function maskApiKey(key: string | null): string | null {
  if (!key || key.length < 12) return key ? '****' : null;
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}

// GET /api/settings - Get app settings
export async function GET() {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's profile to check role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Type assertion for profile
    const profileData = profile as { role: string };
    const isAdmin = profileData.role === 'admin';

    // Get settings
    const { data: settings, error: settingsError } = await supabase
      .from('app_settings')
      .select('*')
      .single();

    if (settingsError) {
      // If no settings exist, return defaults
      if (settingsError.code === 'PGRST116') {
        return NextResponse.json({
          default_provider: 'openai',
          openai_model: 'gpt-4o',
          anthropic_model: 'claude-sonnet-4-20250514',
          gemini_model: 'gemini-2.5-flash',
          perplexity_model: 'sonar-pro',
          web_search_provider: 'none',
          openai_api_key: null,
          anthropic_api_key: null,
          gemini_api_key: null,
          perplexity_api_key: null,
          tavily_api_key: null,
          websearchapi_key: null,
          isAdmin,
        });
      }
      throw settingsError;
    }

    // Type assertion for settings
    const settingsData = settings as Record<string, unknown>;

    // Mask API keys for non-admins
    const response = {
      ...settingsData,
      isAdmin,
      // Only admins see full API keys
      openai_api_key: isAdmin ? settingsData.openai_api_key : maskApiKey(settingsData.openai_api_key as string | null),
      anthropic_api_key: isAdmin ? settingsData.anthropic_api_key : maskApiKey(settingsData.anthropic_api_key as string | null),
      gemini_api_key: isAdmin ? settingsData.gemini_api_key : maskApiKey(settingsData.gemini_api_key as string | null),
      perplexity_api_key: isAdmin ? settingsData.perplexity_api_key : maskApiKey(settingsData.perplexity_api_key as string | null),
      tavily_api_key: isAdmin ? settingsData.tavily_api_key : maskApiKey(settingsData.tavily_api_key as string | null),
      websearchapi_key: isAdmin ? settingsData.websearchapi_key : maskApiKey(settingsData.websearchapi_key as string | null),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Settings GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/settings - Update app settings (admin only)
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's profile to check role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Type assertion for profile
    const profileData = profile as { role: string };

    if (profileData.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validate and extract only allowed fields
    const updateData: AppSettingsUpdate = {};

    if (body.default_provider) {
      const validProviders = ['openai', 'anthropic', 'gemini', 'perplexity'];
      if (validProviders.includes(body.default_provider)) {
        updateData.default_provider = body.default_provider;
      }
    }

    // Model settings
    if (body.openai_model) updateData.openai_model = body.openai_model;
    if (body.anthropic_model) updateData.anthropic_model = body.anthropic_model;
    if (body.gemini_model) updateData.gemini_model = body.gemini_model;
    if (body.perplexity_model) updateData.perplexity_model = body.perplexity_model;

    // API keys - only update if explicitly provided (allow null to clear)
    if ('openai_api_key' in body) updateData.openai_api_key = body.openai_api_key;
    if ('anthropic_api_key' in body) updateData.anthropic_api_key = body.anthropic_api_key;
    if ('gemini_api_key' in body) updateData.gemini_api_key = body.gemini_api_key;
    if ('perplexity_api_key' in body) updateData.perplexity_api_key = body.perplexity_api_key;

    // Web search settings
    if (body.web_search_provider) {
      const validSearchProviders = ['tavily', 'websearchapi', 'none'];
      if (validSearchProviders.includes(body.web_search_provider)) {
        updateData.web_search_provider = body.web_search_provider;
      }
    }
    if ('tavily_api_key' in body) updateData.tavily_api_key = body.tavily_api_key;
    if ('websearchapi_key' in body) updateData.websearchapi_key = body.websearchapi_key;

    // Set updated_by
    updateData.updated_by = user.id;

    // Check if settings row exists
    const { data: existingSettings } = await supabase
      .from('app_settings')
      .select('id')
      .single();

    // Type assertion
    const existingData = existingSettings as { id: string } | null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let result: { data: any; error: any };
    if (existingData) {
      // Update existing settings
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      result = await (supabase as any)
        .from('app_settings')
        .update(updateData)
        .eq('id', existingData.id)
        .select()
        .single();
    } else {
      // Insert new settings
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      result = await (supabase as any)
        .from('app_settings')
        .insert(updateData)
        .select()
        .single();
    }

    if (result.error) {
      throw result.error;
    }

    return NextResponse.json({
      ...result.data,
      isAdmin: true,
    });
  } catch (error) {
    console.error('Settings PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
