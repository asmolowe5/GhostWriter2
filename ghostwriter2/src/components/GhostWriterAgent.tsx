import React, { useState, useRef, useEffect } from 'react';
import './GhostWriterAgent.css';

interface Suggestion {
  id: string;
  type: 'continuation' | 'improvement' | 'idea' | 'question';
  text: string;
  preview?: string;
  confidence: number;
}

interface GhostWriterAgentProps {
  isActive: boolean;
  currentText: string;
  onTextInsert: (text: string) => void;
  onTextReplace: (oldText: string, newText: string) => void;
  onActivate: () => void;
  onDeactivate: () => void;
}

const GhostWriterAgent: React.FC<GhostWriterAgentProps> = ({
  isActive,
  currentText,
  onTextInsert,
  onTextReplace,
  onActivate,
  onDeactivate
}) => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [ghostMessage, setGhostMessage] = useState("I'm here to help with your writing...");
  const [hoveredSuggestion, setHoveredSuggestion] = useState<string | null>(null);
  const ghostRef = useRef<HTMLDivElement>(null);

  // Simulate AI thinking and generating suggestions
  const generateSuggestions = () => {
    if (!currentText.trim()) {
      setSuggestions([]);
      setGhostMessage("Start writing, and I'll offer suggestions...");
      return;
    }

    setIsThinking(true);
    setGhostMessage("Analyzing your writing...");

    // Simulate AI processing time
    setTimeout(() => {
      const mockSuggestions: Suggestion[] = [
        {
          id: '1',
          type: 'continuation',
          text: 'Continue this scene with dialogue',
          preview: 'The character could respond with emotional depth...',
          confidence: 0.9
        },
        {
          id: '2',
          type: 'improvement',
          text: 'Enhance the sensory details',
          preview: 'Add visual, auditory, or tactile elements...',
          confidence: 0.8
        },
        {
          id: '3',
          type: 'idea',
          text: 'Introduce plot twist',
          preview: 'What if the character discovers something unexpected?',
          confidence: 0.7
        }
      ];

      setSuggestions(mockSuggestions);
      setIsThinking(false);
      setGhostMessage("I see opportunities in your writing...");
    }, 1500);
  };

  // Auto-generate suggestions when text changes
  useEffect(() => {
    if (isActive && currentText) {
      const timeoutId = setTimeout(generateSuggestions, 2000);
      return () => clearTimeout(timeoutId);
    }
  }, [currentText, isActive]);

  const handleSuggestionClick = (suggestion: Suggestion) => {
    // Simulate applying the suggestion
    const mockImprovement = `[${suggestion.type.toUpperCase()}] ${suggestion.preview}`;
    onTextInsert(`\n\n${mockImprovement}\n`);
    
    // Remove applied suggestion
    setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
    setGhostMessage("Applied! I'll look for more opportunities...");
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'continuation': return '✨';
      case 'improvement': return '💫';
      case 'idea': return '💡';
      case 'question': return '❓';
      default: return '👻';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return '#10b981'; // Green
    if (confidence >= 0.6) return '#f59e0b'; // Yellow
    return '#6b7280'; // Gray
  };

  return (
    <div className={`ghostwriter-agent ${isActive ? 'active' : 'dormant'}`}>
      {/* Ghost Avatar */}
      <div 
        ref={ghostRef}
        className="ghost-avatar"
        onClick={isActive ? onDeactivate : onActivate}
      >
        <div className="ghost-face">👻</div>
        <div className="ghost-glow"></div>
        {isThinking && <div className="thinking-indicator"></div>}
      </div>

      {/* Ghost Panel */}
      {isActive && (
        <div className="ghost-panel">
          <div className="ghost-header">
            <h3 className="ghost-title">GhostWriter</h3>
            <button 
              className="minimize-btn"
              onClick={onDeactivate}
              title="Minimize"
            >
              ⌄
            </button>
          </div>

          {/* Ghost Message */}
          <div className="ghost-message-area">
            <div className="ghost-message">
              <span className="message-text">{ghostMessage}</span>
              {isThinking && (
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              )}
            </div>
          </div>

          {/* Suggestions */}
          <div className="suggestions-area">
            {suggestions.length > 0 && (
              <>
                <h4 className="suggestions-title">Suggestions</h4>
                <div className="suggestions-list">
                  {suggestions.map((suggestion) => (
                    <div
                      key={suggestion.id}
                      className="suggestion-card"
                      onClick={() => handleSuggestionClick(suggestion)}
                      onMouseEnter={() => setHoveredSuggestion(suggestion.id)}
                      onMouseLeave={() => setHoveredSuggestion(null)}
                    >
                      <div className="suggestion-header">
                        <span className="suggestion-icon">
                          {getSuggestionIcon(suggestion.type)}
                        </span>
                        <span className="suggestion-text">{suggestion.text}</span>
                        <div 
                          className="confidence-indicator"
                          style={{ backgroundColor: getConfidenceColor(suggestion.confidence) }}
                        ></div>
                      </div>
                      
                      {(hoveredSuggestion === suggestion.id || suggestion.preview) && (
                        <div className="suggestion-preview">
                          {suggestion.preview}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Ghost Actions */}
          <div className="ghost-actions">
            <button 
              className="ghost-action-btn primary"
              onClick={generateSuggestions}
              disabled={isThinking}
            >
              <span className="action-icon">🔮</span>
              {isThinking ? 'Thinking...' : 'Analyze Text'}
            </button>
            
            <button 
              className="ghost-action-btn secondary"
              onClick={() => setGhostMessage("What would you like me to help with?")}
            >
              <span className="action-icon">💭</span>
              Ask Ghost
            </button>
          </div>

          {/* Ghost Status */}
          <div className="ghost-status">
            <div className="status-indicator">
              <div className="status-dot active"></div>
              <span className="status-text">Watching your writing</span>
            </div>
          </div>
        </div>
      )}

      {/* Floating Suggestions for Inactive State */}
      {!isActive && suggestions.length > 0 && (
        <div className="floating-suggestions">
          <div className="suggestion-notification">
            <span className="notification-icon">💡</span>
            <span className="notification-count">{suggestions.length}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default GhostWriterAgent;