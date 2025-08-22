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