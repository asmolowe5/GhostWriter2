import React, { useState } from 'react';
import './ChapterList.css';

interface Chapter {
  id: string;
  title: string;
  wordCount: number;
  isActive: boolean;
  lastModified: Date;
}

interface ChapterListProps {
  chapters: Chapter[];
  onChapterSelect: (chapterId: string) => void;
  onChapterCreate: () => void;
  onChapterDelete: (chapterId: string) => void;
  onChapterRename: (chapterId: string, newTitle: string) => void;
}

const ChapterList: React.FC<ChapterListProps> = ({
  chapters,
  onChapterSelect,
  onChapterCreate,
  onChapterDelete,
  onChapterRename
}) => {
  const [editingChapter, setEditingChapter] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const startEditing = (chapter: Chapter) => {
    setEditingChapter(chapter.id);
    setEditTitle(chapter.title);
  };

  const finishEditing = () => {
    if (editingChapter && editTitle.trim()) {
      onChapterRename(editingChapter, editTitle.trim());
    }
    setEditingChapter(null);
    setEditTitle('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      finishEditing();
    } else if (e.key === 'Escape') {
      setEditingChapter(null);
      setEditTitle('');
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="chapter-list">
      <div className="chapter-list-header">
        <h2 className="chapter-list-title">Chapters</h2>
        <button 
          className="new-chapter-btn"
          onClick={onChapterCreate}
          title="Add new chapter"
        >
          <span className="plus-icon">+</span>
        </button>
      </div>

      <div className="chapter-list-content">
        {chapters.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📖</div>
            <p className="empty-text">No chapters yet</p>
            <p className="empty-subtext">Create your first chapter to get started</p>
          </div>
        ) : (
          <div className="chapters">
            {chapters.map((chapter, index) => (
              <div
                key={chapter.id}
                className={`chapter-item ${chapter.isActive ? 'active' : ''}`}
                onClick={() => onChapterSelect(chapter.id)}
              >
                <div className="chapter-number">{index + 1}</div>
                
                <div className="chapter-content">
                  {editingChapter === chapter.id ? (
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onBlur={finishEditing}
                      onKeyDown={handleKeyPress}
                      className="chapter-title-input"
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <h3 
                      className="chapter-title"
                      onDoubleClick={() => startEditing(chapter)}
                    >
                      {chapter.title}
                    </h3>
                  )}
                  
                  <div className="chapter-meta">
                    <span className="chapter-words">
                      {chapter.wordCount.toLocaleString()} words
                    </span>
                    <span className="chapter-date">
                      {formatDate(chapter.lastModified)}
                    </span>
                  </div>
                </div>

                <div className="chapter-actions">
                  <button
                    className="chapter-action-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      startEditing(chapter);
                    }}
                    title="Rename chapter"
                  >
                    ✏️
                  </button>
                  <button
                    className="chapter-action-btn delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`Delete "${chapter.title}"?`)) {
                        onChapterDelete(chapter.id);
                      }
                    }}
                    title="Delete chapter"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="chapter-list-footer">
        <div className="project-stats">
          <span className="total-chapters">
            {chapters.length} {chapters.length === 1 ? 'chapter' : 'chapters'}
          </span>
          <span className="total-words">
            {chapters.reduce((sum, ch) => sum + ch.wordCount, 0).toLocaleString()} total words
          </span>
        </div>
      </div>
    </div>
  );
};

export default ChapterList;