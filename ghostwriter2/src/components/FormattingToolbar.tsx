import React, { useState, useCallback, memo } from 'react';
import FormatButton from './FormatButton';
import './FormattingToolbar.css';

interface FormattingToolbarProps {
  onFormat: (command: string, value?: string) => void;
  onSpacing: (property: string, value: string) => void;
}

const FormattingToolbar: React.FC<FormattingToolbarProps> = ({
  onFormat,
  onSpacing
}) => {
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());
  const [lineHeight, setLineHeight] = useState('1.7');
  const [paragraphSpacing, setParagraphSpacing] = useState('1em');

  // Check active formats
  const checkActiveFormats = useCallback(() => {
    const formats = new Set<string>();
    
    if (document.queryCommandState('bold')) formats.add('bold');
    if (document.queryCommandState('italic')) formats.add('italic');
    if (document.queryCommandState('underline')) formats.add('underline');
    if (document.queryCommandState('strikethrough')) formats.add('strikethrough');
    if (document.queryCommandState('justifyLeft')) formats.add('left');
    if (document.queryCommandState('justifyCenter')) formats.add('center');
    if (document.queryCommandState('justifyRight')) formats.add('right');
    if (document.queryCommandState('justifyFull')) formats.add('justify');
    
    setActiveFormats(formats);
  }, []);

  // Handle formatting
  const handleFormat = useCallback((command: string, value?: string) => {
    onFormat(command, value);
    setTimeout(checkActiveFormats, 50);
  }, [onFormat, checkActiveFormats]);

  // Check active formats on mount and when toolbar is shown
  React.useEffect(() => {
    checkActiveFormats();
  }, [checkActiveFormats]);

  // Handle line height change
  const handleLineHeight = useCallback((value: string) => {
    setLineHeight(value);
    onSpacing('line-height', value);
  }, [onSpacing]);

  // Handle paragraph spacing change
  const handleParagraphSpacing = useCallback((value: string) => {
    setParagraphSpacing(value);
    onSpacing('margin-bottom', value);
  }, [onSpacing]);

  return (
    <div 
      className="formatting-toolbar fixed-toolbar"
      onMouseDown={(e) => e.preventDefault()} // Prevent editor blur
      role="toolbar"
      aria-label="Text formatting toolbar"
    >
      <div className="toolbar-section">
        <div className="toolbar-group">
          <span className="toolbar-ghost">👻</span>
          <div className="toolbar-divider" />
        </div>

        {/* Text Formatting */}
        <div className="toolbar-group">
          <FormatButton
            icon="B"
            title="Bold"
            isActive={activeFormats.has('bold')}
            onClick={() => handleFormat('bold')}
            className="format-bold"
          />
          <FormatButton
            icon="I"
            title="Italic"
            isActive={activeFormats.has('italic')}
            onClick={() => handleFormat('italic')}
            className="format-italic"
          />
          <FormatButton
            icon="U"
            title="Underline"
            isActive={activeFormats.has('underline')}
            onClick={() => handleFormat('underline')}
            className="format-underline"
          />
          <FormatButton
            icon="S"
            title="Strikethrough"
            isActive={activeFormats.has('strikethrough')}
            onClick={() => handleFormat('strikethrough')}
            className="format-strikethrough"
          />
        </div>

        <div className="toolbar-divider" />

        {/* Alignment */}
        <div className="toolbar-group">
          <FormatButton
            icon="⫷"
            title="Align Left"
            isActive={activeFormats.has('left')}
            onClick={() => handleFormat('justifyLeft')}
          />
          <FormatButton
            icon="≡"
            title="Align Center"
            isActive={activeFormats.has('center')}
            onClick={() => handleFormat('justifyCenter')}
          />
          <FormatButton
            icon="⫸"
            title="Align Right"
            isActive={activeFormats.has('right')}
            onClick={() => handleFormat('justifyRight')}
          />
          <FormatButton
            icon="≣"
            title="Justify"
            isActive={activeFormats.has('justify')}
            onClick={() => handleFormat('justifyFull')}
          />
        </div>

        <div className="toolbar-divider" />

        {/* Spacing Controls */}
        <div className="toolbar-group spacing-controls">
          <div className="spacing-control">
            <label className="spacing-label">Line</label>
            <select
              value={lineHeight}
              onChange={(e) => handleLineHeight(e.target.value)}
              className="spacing-select"
              title="Line Height"
              aria-label="Line height"
            >
              <option value="1.2">1.2</option>
              <option value="1.4">1.4</option>
              <option value="1.5">1.5</option>
              <option value="1.6">1.6</option>
              <option value="1.7">1.7</option>
              <option value="1.8">1.8</option>
              <option value="2.0">2.0</option>
              <option value="2.5">2.5</option>
            </select>
          </div>
          
          <div className="spacing-control">
            <label className="spacing-label">Para</label>
            <select
              value={paragraphSpacing}
              onChange={(e) => handleParagraphSpacing(e.target.value)}
              className="spacing-select"
              title="Paragraph Spacing"
              aria-label="Paragraph spacing"
            >
              <option value="0.5em">0.5</option>
              <option value="0.75em">0.75</option>
              <option value="1em">1.0</option>
              <option value="1.25em">1.25</option>
              <option value="1.5em">1.5</option>
              <option value="2em">2.0</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(FormattingToolbar);