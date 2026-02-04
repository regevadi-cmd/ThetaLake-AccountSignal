import Anthropic from '@anthropic-ai/sdk';
import { BaseAIProvider, AIProviderConfig } from './base';
import { AnalysisResult } from '@/types/analysis';
import { parseTaggedResponse } from '../parser';

export class AnthropicProvider extends BaseAIProvider {
  readonly name = 'anthropic';
  readonly supportsWebGrounding = false;

  private client: Anthropic;

  constructor(config: AIProviderConfig) {
    super(config);
    this.client = new Anthropic({ apiKey: this.apiKey });
  }

  getDefaultModel(): string {
    return 'claude-sonnet-4-5-20250929';
  }

  async analyzeCompany(companyName: string): Promise<AnalysisResult> {
    const message = await this.client.messages.create({
      model: this.model,
      max_tokens: 4000,
      system: 'You are a corporate intelligence analyst. Provide comprehensive, factual analysis based on your knowledge.',
      messages: [
        {
          role: 'user',
          content: this.getAnalysisPrompt(companyName)
        }
      ]
    });

    const textBlock = message.content.find((block) => block.type === 'text');
    const text = textBlock && textBlock.type === 'text' ? textBlock.text : '';
    return parseTaggedResponse(text);
  }
}
