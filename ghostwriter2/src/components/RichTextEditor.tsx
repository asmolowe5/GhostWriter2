import React, { useRef, useCallback, useEffect } from 'react';
import FormattingToolbar from './FormattingToolbar';
import './RichTextEditor.css';

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
  // Handle content changes
  const handleInput = useCallback(() => {
    if (!editorRef.current) return;
    
    const htmlContent = editorRef.current.innerHTML;
    const textContent = editorRef.current.textContent || '';
    
    // Calculate word count
    const words = textContent.trim().split(/\s+/).filter(word => word.length > 0);
    const wordCount = textContent.trim() === '' ? 0 : words.length;
    
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

  // Set up event listeners
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.addEventListener('input', handleInput);

    return () => {
      editor.removeEventListener('input', handleInput);
    };
  }, [handleInput]);

  // Update content when prop changes (chapter switching)
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== content) {
      editorRef.current.innerHTML = content;
      console.log('RichTextEditor: Updated content from prop change:', content.substring(0, 100) + '...');
    }
  }, [content]);

  return (
    <div className="rich-text-editor">
      <FormattingToolbar
        onFormat={formatText}
        onSpacing={applySpacing}
      />
      
      <div
        ref={editorRef}
        className="rich-editor"
        contentEditable
        suppressContentEditableWarning
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        data-placeholder={placeholder}
      />
    </div>
  );
};

export default RichTextEditor;