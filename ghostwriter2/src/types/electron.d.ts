export interface ElectronAPI {
  createNovel: (novelName: string) => Promise<{
    success: boolean;
    path?: string;
    error?: string;
    canceled?: boolean;
  }>;
  
  saveChapter: (novelPath: string, chapterNumber: number, content: string) => Promise<{
    success: boolean;
    error?: string;
  }>;
  
  loadChapter: (novelPath: string, chapterNumber: number) => Promise<{
    success: boolean;
    content?: string;
    error?: string;
  }>;
  
  loadNovelMetadata: (novelPath: string) => Promise<{
    success: boolean;
    metadata?: NovelMetadata;
    error?: string;
  }>;
  
  selectNovelFolder: () => Promise<{
    success: boolean;
    path?: string;
    canceled?: boolean;
    error?: string;
  }>;

  // Secure API Key Storage
  storeApiKey: (provider: string, keyName: string, keyValue: string) => Promise<{
    success: boolean;
    id?: string;
    error?: string;
  }>;
  
  retrieveApiKey: (keyId: string) => Promise<{
    success: boolean;
    provider?: string;
    keyName?: string;
    keyValue?: string;
    createdAt?: string;
    error?: string;
  }>;
  
  listApiKeys: () => Promise<{
    success: boolean;
    keys?: Array<{
      id: string;
      provider: string;
      keyName: string;
      createdAt: string;
    }>;
    error?: string;
  }>;
  
  deleteApiKey: (keyId: string) => Promise<{
    success: boolean;
    error?: string;
  }>;
  
  checkEncryptionAvailable: () => Promise<{
    available: boolean;
  }>;

  // Usage Tracking
  trackApiCall: (callData: {
    provider: string;
    endpoint?: string;
    inputTokens?: number;
    outputTokens?: number;
    costUsd?: number;
    responseTimeMs?: number;
    success?: boolean;
    errorMessage?: string;
  }) => Promise<{
    success: boolean;
    callId?: number;
    error?: string;
  }>;

  getUsageStats: (options?: {
    timeframe?: 'today' | 'week' | 'month';
    provider?: string;
  }) => Promise<{
    success: boolean;
    stats?: Array<{
      provider: string;
      total_calls: number;
      total_tokens: number;
      total_cost_usd: number;
    }>;
    error?: string;
  }>;

  checkRateLimit: (provider: string) => Promise<{
    success: boolean;
    allowed?: boolean;
    currentCount?: number;
    limit?: number;
    resetTime?: string;
    error?: string;
  }>;

  incrementRateLimit: (provider: string) => Promise<{
    success: boolean;
    error?: string;
  }>;
}

export interface NovelMetadata {
  title: string;
  created: string;
  lastModified: string;
  chapters: ChapterMetadata[];
}

export interface ChapterMetadata {
  number: number;
  title: string;
  created: string;
  lastModified: string;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}