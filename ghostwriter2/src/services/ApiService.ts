// API Service for Rate Limiting and Usage Tracking

interface ApiCallData {
  provider: string;
  endpoint?: string;
  inputTokens?: number;
  outputTokens?: number;
  costUsd?: number;
  responseTimeMs?: number;
  success?: boolean;
  errorMessage?: string;
}

interface RateLimitResult {
  allowed: boolean;
  currentCount: number;
  limit: number;
  resetTime: string;
  waitTimeMs?: number;
}

// Provider-specific pricing (per 1k tokens)
const PRICING: Record<string, Record<string, { input: number; output: number }>> = {
  openai: {
    'gpt-4': { input: 0.03, output: 0.06 },
    'gpt-3.5-turbo': { input: 0.001, output: 0.002 },
  },
  claude: {
    'claude-3-opus': { input: 0.015, output: 0.075 },
    'claude-3-sonnet': { input: 0.003, output: 0.015 },
    'claude-3-haiku': { input: 0.00025, output: 0.00125 },
  },
  gemini: {
    'gemini-pro': { input: 0.0005, output: 0.0015 },
  },
  grok: {
    'grok-beta': { input: 0.005, output: 0.015 },
  }
};

class ApiService {
  private static instance: ApiService;

  public static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }

  // Check if API call is allowed (rate limiting)
  async checkRateLimit(provider: string): Promise<RateLimitResult> {
    if (!window.electronAPI) {
      throw new Error('Electron API not available');
    }

    try {
      const result = await window.electronAPI.checkRateLimit(provider);
      
      if (result.success) {
        return {
          allowed: result.allowed || false,
          currentCount: result.currentCount || 0,
          limit: result.limit || 60,
          resetTime: result.resetTime || new Date().toISOString(),
          waitTimeMs: result.allowed ? 0 : 60000 // Wait 1 minute if rate limited
        };
      } else {
        throw new Error(result.error || 'Failed to check rate limit');
      }
    } catch (error) {
      console.error('Error checking rate limit:', error);
      // Default to allowing the request if check fails
      return {
        allowed: true,
        currentCount: 0,
        limit: 60,
        resetTime: new Date().toISOString()
      };
    }
  }

  // Increment rate limit counter
  async incrementRateLimit(provider: string): Promise<boolean> {
    if (!window.electronAPI) {
      return false;
    }

    try {
      const result = await window.electronAPI.incrementRateLimit(provider);
      return result.success;
    } catch (error) {
      console.error('Error incrementing rate limit:', error);
      return false;
    }
  }

  // Track API call usage
  async trackApiCall(data: ApiCallData): Promise<boolean> {
    if (!window.electronAPI) {
      return false;
    }

    try {
      const result = await window.electronAPI.trackApiCall(data);
      return result.success;
    } catch (error) {
      console.error('Error tracking API call:', error);
      return false;
    }
  }

  // Calculate cost for API call
  calculateCost(provider: string, model: string, inputTokens: number, outputTokens: number): number {
    const providerPricing = PRICING[provider];
    if (!providerPricing) {
      console.warn(`Unknown provider: ${provider}`);
      return 0;
    }

    const modelPricing = providerPricing[model];
    if (!modelPricing) {
      console.warn(`Unknown model for ${provider}: ${model}`);
      return 0;
    }

    const inputCost = (inputTokens / 1000) * modelPricing.input;
    const outputCost = (outputTokens / 1000) * modelPricing.output;
    
    return inputCost + outputCost;
  }

  // Get usage statistics
  async getUsageStats(timeframe: 'today' | 'week' | 'month' = 'today', provider?: string) {
    if (!window.electronAPI) {
      throw new Error('Electron API not available');
    }

    try {
      const result = await window.electronAPI.getUsageStats({ timeframe, provider });
      
      if (result.success) {
        return result.stats || [];
      } else {
        throw new Error(result.error || 'Failed to get usage stats');
      }
    } catch (error) {
      console.error('Error getting usage stats:', error);
      return [];
    }
  }

  // Wait for rate limit reset if needed
  async waitForRateLimit(rateLimitResult: RateLimitResult): Promise<void> {
    if (rateLimitResult.allowed || !rateLimitResult.waitTimeMs) {
      return;
    }

    console.log(`Rate limited. Waiting ${rateLimitResult.waitTimeMs}ms...`);
    return new Promise(resolve => {
      setTimeout(resolve, rateLimitResult.waitTimeMs);
    });
  }

  // Safe API call wrapper with rate limiting and tracking
  async safeApiCall<T>(
    provider: string,
    model: string,
    apiCallFunction: () => Promise<T>,
    options: {
      estimatedInputTokens?: number;
      estimatedOutputTokens?: number;
      endpoint?: string;
    } = {}
  ): Promise<T> {
    const startTime = Date.now();
    const { estimatedInputTokens = 0, estimatedOutputTokens = 0, endpoint = 'chat' } = options;

    // Check rate limit
    const rateLimitResult = await this.checkRateLimit(provider);
    if (!rateLimitResult.allowed) {
      await this.waitForRateLimit(rateLimitResult);
    }

    // Increment rate limit counter
    await this.incrementRateLimit(provider);

    try {
      // Make the API call
      const response = await apiCallFunction();
      const responseTime = Date.now() - startTime;

      // Calculate cost (use estimated tokens for now, real implementation would get actual from response)
      const cost = this.calculateCost(provider, model, estimatedInputTokens, estimatedOutputTokens);

      // Track successful call
      await this.trackApiCall({
        provider,
        endpoint,
        inputTokens: estimatedInputTokens,
        outputTokens: estimatedOutputTokens,
        costUsd: cost,
        responseTimeMs: responseTime,
        success: true
      });

      return response;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      // Track failed call
      await this.trackApiCall({
        provider,
        endpoint,
        inputTokens: estimatedInputTokens,
        outputTokens: 0,
        costUsd: 0,
        responseTimeMs: responseTime,
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });

      throw error;
    }
  }

  // Check if user is approaching limits (for warnings)
  async checkUsageLimits(): Promise<{
    warnings: string[];
    dailyCost: number;
    weeklyCost: number;
    monthlyRequests: number;
  }> {
    const warnings: string[] = [];
    
    try {
      const todayStats = await this.getUsageStats('today');
      const weekStats = await this.getUsageStats('week');
      const monthStats = await this.getUsageStats('month');

      const dailyCost = todayStats.reduce((sum, stat) => sum + stat.total_cost_usd, 0);
      const weeklyCost = weekStats.reduce((sum, stat) => sum + stat.total_cost_usd, 0);
      const monthlyRequests = monthStats.reduce((sum, stat) => sum + stat.total_calls, 0);

      // Generate warnings based on usage patterns
      if (dailyCost > 10) {
        warnings.push(`High daily cost: $${dailyCost.toFixed(2)}`);
      }

      if (weeklyCost > 50) {
        warnings.push(`High weekly cost: $${weeklyCost.toFixed(2)}`);
      }

      if (monthlyRequests > 1000) {
        warnings.push(`High monthly usage: ${monthlyRequests} requests`);
      }

      // Check for rapid usage increases
      const averageDailyCost = weeklyCost / 7;
      if (dailyCost > averageDailyCost * 3) {
        warnings.push('Usage spike detected - 3x daily average');
      }

      return {
        warnings,
        dailyCost,
        weeklyCost,
        monthlyRequests
      };
    } catch (error) {
      console.error('Error checking usage limits:', error);
      return {
        warnings: ['Failed to check usage limits'],
        dailyCost: 0,
        weeklyCost: 0,
        monthlyRequests: 0
      };
    }
  }
}

export default ApiService;