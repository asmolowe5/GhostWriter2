export interface Chapter {
  id: string;
  number: number;
  title: string;
  content: string;
  wordCount: number;
  isActive: boolean;
  lastModified: Date;
}

export interface NovelProject {
  name: string;
  path: string;
  metadata: import('./electron').NovelMetadata;
}

export interface Suggestion {
  id: string;
  type: 'continuation' | 'improvement' | 'idea' | 'question';
  text: string;
  preview?: string;
  confidence: number;
}

// Utility types for better type safety
export type ChapterId = string;
export type ChapterNumber = number;

// Word count utility function with consistent logic
export const calculateWordCount = (content: string): number => {
  if (!content || content.trim() === '') return 0;
  
  // Create a temporary DOM element to properly extract text from HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = content;
  const textContent = tempDiv.textContent || tempDiv.innerText || '';
  
  // Split by whitespace and filter out empty strings
  const words = textContent.trim().split(/\s+/).filter(word => word.length > 0);
  
  return textContent.trim() === '' ? 0 : words.length;
};

// HTML sanitization utility (basic implementation)
export const sanitizeHtmlContent = (html: string): string => {
  // Create a temporary element to parse HTML
  const temp = document.createElement('div');
  temp.innerHTML = html;
  
  // Remove script tags and other potentially dangerous elements
  const scripts = temp.querySelectorAll('script, object, embed, iframe, meta, link');
  scripts.forEach(script => script.remove());
  
  // Remove dangerous attributes
  const allElements = temp.querySelectorAll('*');
  allElements.forEach(element => {
    const dangerousAttrs = ['onclick', 'onload', 'onerror', 'onmouseover', 'onfocus', 'onblur'];
    dangerousAttrs.forEach(attr => element.removeAttribute(attr));
  });
  
  return temp.innerHTML;
};