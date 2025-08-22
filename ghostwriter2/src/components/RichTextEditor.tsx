import React, { useRef, useCallback, useEffect, useMemo } from 'react';
import FormattingToolbar from './FormattingToolbar';
import './RichTextEditor.css';
import { calculateWordCount, sanitizeHtmlContent } from '../types/shared';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string, wordCount: number) => void;
  placeholder?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  content,
  onChange,
  placeholder = "Begin your story..."
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  // Handle content changes with debouncing
  const handleInput = useCallback(() => {
    if (!editorRef.current) return;
    
    const htmlContent = sanitizeHtmlContent(editorRef.current.innerHTML);
    const wordCount = calculateWordCount(htmlContent);
    
    onChange(htmlContent, wordCount);
  }, [onChange]);

  // Handle Tab key for indentation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      
      // Insert 5 spaces at cursor position
      const selection = window.getSelection();
      if (!selection || !editorRef.current) return;
      
      const range = selection.getRangeAt(0);
      const spaces = document.createTextNode('\u00A0\u00A0\u00A0\u00A0\u00A0'); // 5 non-breaking spaces
      
      range.deleteContents();
      range.insertNode(spaces);
      
      // Move cursor after the inserted spaces
      range.setStartAfter(spaces);
      range.setEndAfter(spaces);
      selection.removeAllRanges();
      selection.addRange(range);
      
      handleInput();
    }
  }, [handleInput]);

  // Handle focus events (minimal functionality kept for potential future use)
  const handleFocus = useCallback(() => {
    // Toolbar is now always visible
  }, []);

  const handleBlur = useCallback(() => {
    // Toolbar remains visible
  }, []);

  // Format text
  const formatText = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  }, [handleInput]);

  // Apply spacing
  const applySpacing = useCallback((property: string, value: string) => {
    const selection = window.getSelection();
    if (!selection || !editorRef.current) return;

    if (selection.isCollapsed) {
      // Apply to entire editor
      editorRef.current.style.setProperty(property, value);
    } else {
      // Apply to selected text
      const range = selection.getRangeAt(0);
      const span = document.createElement('span');
      span.style.setProperty(property, value);
      
      try {
        range.surroundContents(span);
      } catch (e) {
        // Fallback for complex selections
        const contents = range.extractContents();
        span.appendChild(contents);
        range.insertNode(span);
      }
    }
    
    handleInput();
  }, [handleInput]);

  // Set up event listeners - fix memory leak by removing dependency on handleInput
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const inputHandler = () => {
      if (!editor) return;
      
      const htmlContent = sanitizeHtmlContent(editor.innerHTML);
      const wordCount = calculateWordCount(htmlContent);
      
      onChange(htmlContent, wordCount);
    };

    editor.addEventListener('input', inputHandler);

    return () => {
      editor.removeEventListener('input', inputHandler);
    };
  }, [onChange]);

  // Update content when prop changes (chapter switching)
  const sanitizedContent = useMemo(() => sanitizeHtmlContent(content), [content]);
  
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== sanitizedContent) {
      editorRef.current.innerHTML = sanitizedContent;
      console.log('RichTextEditor: Updated content from prop change:', sanitizedContent.substring(0, 100) + '...');
    }
  }, [sanitizedContent]);

  return (
    <div className="rich-text-editor">
      <div className="toolbar-row">
        <FormattingToolbar
          onFormat={formatText}
          onSpacing={applySpacing}
        />
      </div>
      
      <div
        ref={editorRef}
        className="rich-editor"
        contentEditable
        suppressContentEditableWarning
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        data-placeholder={placeholder}
        role="textbox"
        aria-multiline="true"
        aria-label="Story content editor"
        aria-describedby="editor-help"
      />
      <div id="editor-help" className="sr-only">
        Use the formatting toolbar to style your text. Press Tab for indentation.
      </div>
    </div>
  );
};

export default RichTextEditor;