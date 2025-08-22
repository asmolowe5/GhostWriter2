/**
 * Validation utilities for user inputs and data
 */

export const ValidationRules = {
  NOVEL_NAME: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 100,
    FORBIDDEN_CHARS: /[<>:"/\\|?*]/g // Forbidden characters for file names
  },
  CHAPTER_TITLE: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 200
  },
  CONTENT: {
    MAX_LENGTH: 1000000 // 1MB character limit
  }
} as const;

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validates novel name
 */
export function validateNovelName(name: string): ValidationResult {
  const errors: string[] = [];
  
  if (!name || name.trim().length === 0) {
    errors.push('Novel name is required');
  } else {
    const trimmedName = name.trim();
    
    if (trimmedName.length < ValidationRules.NOVEL_NAME.MIN_LENGTH) {
      errors.push(`Novel name must be at least ${ValidationRules.NOVEL_NAME.MIN_LENGTH} character(s)`);
    }
    
    if (trimmedName.length > ValidationRules.NOVEL_NAME.MAX_LENGTH) {
      errors.push(`Novel name must be no more than ${ValidationRules.NOVEL_NAME.MAX_LENGTH} characters`);
    }
    
    if (ValidationRules.NOVEL_NAME.FORBIDDEN_CHARS.test(trimmedName)) {
      errors.push('Novel name contains invalid characters. Please avoid: < > : " / \\ | ? *');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates chapter title
 */
export function validateChapterTitle(title: string): ValidationResult {
  const errors: string[] = [];
  
  if (!title || title.trim().length === 0) {
    errors.push('Chapter title is required');
  } else {
    const trimmedTitle = title.trim();
    
    if (trimmedTitle.length < ValidationRules.CHAPTER_TITLE.MIN_LENGTH) {
      errors.push(`Chapter title must be at least ${ValidationRules.CHAPTER_TITLE.MIN_LENGTH} character(s)`);
    }
    
    if (trimmedTitle.length > ValidationRules.CHAPTER_TITLE.MAX_LENGTH) {
      errors.push(`Chapter title must be no more than ${ValidationRules.CHAPTER_TITLE.MAX_LENGTH} characters`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates content length
 */
export function validateContentLength(content: string): ValidationResult {
  const errors: string[] = [];
  
  if (content.length > ValidationRules.CONTENT.MAX_LENGTH) {
    errors.push(`Content is too long. Maximum allowed length is ${ValidationRules.CONTENT.MAX_LENGTH.toLocaleString()} characters`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Sanitizes filename for safe file system operations
 */
export function sanitizeFileName(fileName: string): string {
  return fileName
    .trim()
    .replace(ValidationRules.NOVEL_NAME.FORBIDDEN_CHARS, '_')
    .replace(/\s+/g, ' ')
    .substring(0, ValidationRules.NOVEL_NAME.MAX_LENGTH);
}

/**
 * Checks if ElectronAPI is available
 */
export function isElectronAPIAvailable(): boolean {
  return typeof window !== 'undefined' && 
         window.electronAPI !== undefined &&
         typeof window.electronAPI === 'object';
}

/**
 * Generic error handler for async operations
 */
export async function handleAsyncOperation<T>(
  operation: () => Promise<T>,
  errorMessage: string = 'An error occurred'
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const data = await operation();
    return { success: true, data };
  } catch (error) {
    console.error(errorMessage, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : errorMessage 
    };
  }
}