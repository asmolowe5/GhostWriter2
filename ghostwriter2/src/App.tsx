import React, { useState, useEffect, useCallback, useMemo } from 'react';
import RichTextEditor from './components/RichTextEditor';
import ChapterList from './components/ChapterList';
import GhostWriterAgent from './components/GhostWriterAgent';
import NovelNameModal from './components/NovelNameModal';
import SettingsModal from './components/SettingsModal';
import ErrorBoundary from './components/ErrorBoundary';
import { NotificationProvider, useNotifications } from './components/NotificationSystem';
import './App.css';
import { NovelMetadata, ChapterMetadata } from './types/electron';
import { Chapter, NovelProject, calculateWordCount } from './types/shared';
import { useDebounce } from './hooks/useDebounce';
import { validateNovelName, validateChapterTitle, isElectronAPIAvailable, handleAsyncOperation } from './utils/validation';

function AppContent() {
  const { addNotification } = useNotifications();
  const [currentProject, setCurrentProject] = useState<NovelProject | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [currentChapterId, setCurrentChapterId] = useState('1');
  const [isGhostWriterActive, setIsGhostWriterActive] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [showNovelNameModal, setShowNovelNameModal] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitleValue, setEditingTitleValue] = useState('');
  const [recentNovels, setRecentNovels] = useState<Array<{name: string; path: string; lastOpened: string}>>([]);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const currentChapter = chapters.find(ch => ch.id === currentChapterId);
  const content = currentChapter?.content || '';
  // Calculate word count dynamically from actual content
  const wordCount = useMemo(() => calculateWordCount(content), [content]);
  
  // Debounce content changes for auto-save
  const debouncedContent = useDebounce(content, 1000);

  // Load recent novels from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('ghostwriter-recent-novels');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setRecentNovels(parsed.slice(0, 5)); // Keep only 5 most recent
      } catch (error) {
        console.error('Error loading recent novels:', error);
      }
    }
  }, []);

  // Add novel to recent list
  const addToRecentNovels = useCallback((name: string, path: string) => {
    const newEntry = {
      name,
      path,
      lastOpened: new Date().toISOString()
    };

    setRecentNovels(prev => {
      // Remove if already exists
      const filtered = prev.filter(novel => novel.path !== path);
      // Add to beginning
      const updated = [newEntry, ...filtered].slice(0, 5); // Keep only 5 most recent
      
      // Save to localStorage
      localStorage.setItem('ghostwriter-recent-novels', JSON.stringify(updated));
      
      return updated;
    });
  }, []);

  // Open a recent novel
  const openRecentNovel = async (novelPath: string, novelName: string) => {
    if (!window.electronAPI) return;

    try {
      const metadata = await window.electronAPI.loadNovelMetadata(novelPath);
      if (metadata.success && metadata.metadata) {
        const project: NovelProject = {
          name: novelName,
          path: novelPath,
          metadata: metadata.metadata
        };
        
        setCurrentProject(project);
        addToRecentNovels(novelName, novelPath);
        
        // Load chapters from metadata
        const loadedChapters = metadata.metadata.chapters.map((chapterMeta, index) => ({
          id: chapterMeta.number.toString(),
          number: chapterMeta.number,
          title: chapterMeta.title,
          content: '', // Will be loaded when selected
          wordCount: 0, // Will be calculated when content loads
          isActive: index === 0,
          lastModified: new Date(chapterMeta.lastModified)
        }));
        
        if (loadedChapters.length === 0) {
          // No chapters exist, create first one
          const initialChapter: Chapter = {
            id: '1',
            number: 1,
            title: 'Chapter 1',
            content: '',
            wordCount: 0,
            isActive: true,
            lastModified: new Date()
          };
          setChapters([initialChapter]);
          setCurrentChapterId('1');
        } else {
          setChapters(loadedChapters);
          setCurrentChapterId(loadedChapters[0].id);
          // Load first chapter content
          const firstChapterContent = await loadChapterContent(loadedChapters[0].number);
          setChapters(prev => prev.map(ch => 
            ch.id === loadedChapters[0].id 
              ? { ...ch, content: firstChapterContent, wordCount: calculateWordCount(firstChapterContent) }
              : ch
          ));
        }
      } else {
        alert('Failed to load novel metadata: ' + (metadata.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error opening recent novel:', error);
      alert('Error opening novel: ' + error);
    }
  };

  // Auto-save functionality
  const saveCurrentChapter = useCallback(async () => {
    if (!currentProject || !currentChapter || !window.electronAPI) return;

    try {
      // Convert HTML content to plain text for markdown storage
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = currentChapter.content;
      const plainTextContent = tempDiv.textContent || tempDiv.innerText || '';
      
      console.log(`Saving chapter ${currentChapter.number} with ${plainTextContent.length} characters`);
      
      const result = await window.electronAPI.saveChapter(
        currentProject.path,
        currentChapter.number,
        plainTextContent
      );
      
      if (!result.success) {
        console.error('Failed to save chapter:', result.error);
      } else {
        console.log(`Chapter ${currentChapter.number} saved successfully`);
      }
    } catch (error) {
      console.error('Error saving chapter:', error);
    }
  }, [currentProject, currentChapter]);

  // Auto-save when debounced content changes
  useEffect(() => {
    if (autoSaveEnabled && currentChapter && currentProject && debouncedContent) {
      saveCurrentChapter();
    }
  }, [debouncedContent, autoSaveEnabled, currentChapter, currentProject, saveCurrentChapter]);

  // Load chapter content when switching chapters
  const loadChapterContent = useCallback(async (chapterNumber: number) => {
    if (!currentProject || !window.electronAPI) return '';

    try {
      const result = await window.electronAPI.loadChapter(currentProject.path, chapterNumber);
      if (result.success) {
        return result.content || '';
      }
    } catch (error) {
      console.error('Error loading chapter:', error);
    }
    return '';
  }, [currentProject]);

  const handleContentChange = useCallback(async (htmlContent: string, newWordCount: number) => {
    // Only update the current chapter's content
    setChapters(prev => prev.map(chapter => {
      if (chapter.id === currentChapterId) {
        console.log(`Updating chapter ${chapter.number} content, wordCount: ${newWordCount}`);
        return {
          ...chapter,
          content: htmlContent,
          wordCount: newWordCount,
          lastModified: new Date()
        };
      }
      return chapter; // Leave other chapters unchanged
    }));
  }, [currentChapterId]);

  const handleChapterSelect = async (chapterId: string) => {
    // Save current chapter before switching
    if (autoSaveEnabled && currentChapter) {
      await saveCurrentChapter();
    }

    // Load new chapter content from disk
    const chapter = chapters.find(ch => ch.id === chapterId);
    if (chapter) {
      const diskContent = await loadChapterContent(chapter.number);
      
      // Update chapters state - set new chapter as active and load its content
      setChapters(prev => prev.map(ch => ({
        ...ch,
        isActive: ch.id === chapterId,
        // Only update the content of the chapter we're switching TO
        content: ch.id === chapterId ? diskContent : ch.content
      })));
      
      setCurrentChapterId(chapterId);
      console.log(`Switched to chapter ${chapter.number}, loaded content:`, diskContent.substring(0, 100) + '...');
    }
  };

  const handleChapterCreate = async () => {
    if (!currentProject) return;

    // Save current chapter before creating new one
    if (autoSaveEnabled && currentChapter) {
      await saveCurrentChapter();
    }

    const newChapterNumber = Math.max(...chapters.map(ch => ch.number), 0) + 1;
    const newChapterId = Date.now().toString();
    const newChapter: Chapter = {
      id: newChapterId,
      number: newChapterNumber,
      title: `Chapter ${newChapterNumber}`,
      content: '',
      wordCount: 0,
      isActive: true,
      lastModified: new Date()
    };
    
    // Add new chapter and set all others as inactive
    setChapters(prev => [
      ...prev.map(ch => ({ ...ch, isActive: false })),
      newChapter
    ]);
    
    // Immediately select and open the new chapter
    setCurrentChapterId(newChapterId);
    console.log(`Created and opened new chapter ${newChapterNumber}`);
  };

  const handleChapterDelete = (chapterId: string) => {
    if (chapters.length <= 1) return;
    
    setChapters(prev => {
      const filtered = prev.filter(ch => ch.id !== chapterId);
      if (chapterId === currentChapterId && filtered.length > 0) {
        setCurrentChapterId(filtered[0].id);
        return filtered.map((ch, index) => ({
          ...ch,
          isActive: index === 0
        }));
      }
      return filtered;
    });
  };

  const handleChapterRename = useCallback((chapterId: string, newTitle: string) => {
    const validation = validateChapterTitle(newTitle);
    if (!validation.isValid) {
      addNotification({
        type: 'error',
        title: 'Invalid Chapter Title',
        message: validation.errors.join('. ')
      });
      return;
    }

    setChapters(prev => prev.map(ch => 
      ch.id === chapterId ? { ...ch, title: newTitle.trim() } : ch
    ));
    
    addNotification({
      type: 'success',
      title: 'Chapter Renamed',
      message: `Chapter renamed to "${newTitle.trim()}"`
    });
  }, [addNotification]);

  const handleTitleClick = () => {
    if (currentChapter) {
      setEditingTitleValue(currentChapter.title);
      setIsEditingTitle(true);
    }
  };

  const handleTitleSave = useCallback(() => {
    if (currentChapter && editingTitleValue.trim()) {
      handleChapterRename(currentChapter.id, editingTitleValue.trim());
      setIsEditingTitle(false);
    }
  }, [currentChapter, editingTitleValue, handleChapterRename]);

  const handleTitleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleSave();
    } else if (e.key === 'Escape') {
      setIsEditingTitle(false);
      setEditingTitleValue('');
    }
  }, [handleTitleSave]);

  const handleGhostTextInsert = useCallback((text: string) => {
    const newContent = content + text;
    const newWordCount = calculateWordCount(newContent);
    handleContentChange(newContent, newWordCount);
  }, [content, handleContentChange]);

  const handleGhostTextReplace = useCallback((oldText: string, newText: string) => {
    const newContent = content.replace(oldText, newText);
    const newWordCount = calculateWordCount(newContent);
    handleContentChange(newContent, newWordCount);
  }, [content, handleContentChange]);

  // Project management functions
  const handleCreateNovelClick = () => {
    console.log('Create novel clicked, electronAPI available:', !!window.electronAPI);
    
    if (!isElectronAPIAvailable()) {
      addNotification({
        type: 'error',
        title: 'Electron API Not Available',
        message: 'Please restart the application to enable file operations.'
      });
      return;
    }

    setShowNovelNameModal(true);
  };

  const createNewNovel = async (novelName: string) => {
    if (!isElectronAPIAvailable()) return;

    // Validate novel name
    const validation = validateNovelName(novelName);
    if (!validation.isValid) {
      addNotification({
        type: 'error',
        title: 'Invalid Novel Name',
        message: validation.errors.join('. ')
      });
      return;
    }

    const result = await handleAsyncOperation(
      async () => {
        console.log('Creating novel with name:', novelName);
        const createResult = await window.electronAPI.createNovel(novelName);
        console.log('Create novel result:', createResult);
        
        if (createResult.success && createResult.path) {
          const metadata = await window.electronAPI.loadNovelMetadata(createResult.path);
          console.log('Load metadata result:', metadata);
          
          if (metadata.success && metadata.metadata) {
            const newProject: NovelProject = {
              name: novelName,
              path: createResult.path,
              metadata: metadata.metadata
            };
            
            setCurrentProject(newProject);
            addToRecentNovels(novelName, createResult.path);
            
            // Create initial chapter
            const initialChapter: Chapter = {
              id: '1',
              number: 1,
              title: 'Chapter 1',
              content: '',
              wordCount: 0,
              isActive: true,
              lastModified: new Date()
            };
            
            setChapters([initialChapter]);
            setCurrentChapterId('1');
            
            addNotification({
              type: 'success',
              title: 'Novel Created',
              message: `Successfully created "${novelName}"`
            });
            
            console.log('Novel created successfully, project set');
          } else {
            throw new Error(metadata.error || 'Failed to load novel metadata');
          }
        } else if (createResult.canceled) {
          console.log('Novel creation canceled by user');
          return;
        } else {
          throw new Error(createResult.error || 'Failed to create novel');
        }
      },
      'Error creating novel'
    );

    if (!result.success && result.error) {
      addNotification({
        type: 'error',
        title: 'Failed to Create Novel',
        message: result.error
      });
    }
  };

  const openExistingNovel = async () => {
    if (!window.electronAPI) return;

    try {
      const result = await window.electronAPI.selectNovelFolder();
      if (result.success && result.path) {
        const metadata = await window.electronAPI.loadNovelMetadata(result.path);
        if (metadata.success && metadata.metadata) {
          const project: NovelProject = {
            name: metadata.metadata.title,
            path: result.path,
            metadata: metadata.metadata
          };
          
          setCurrentProject(project);
          addToRecentNovels(metadata.metadata.title, result.path);
          
          // Load chapters from metadata
          const loadedChapters = metadata.metadata.chapters.map((chapterMeta, index) => ({
            id: chapterMeta.number.toString(),
            number: chapterMeta.number,
            title: chapterMeta.title,
            content: '', // Will be loaded when selected
            wordCount: 0, // Will be calculated when content loads
            isActive: index === 0,
            lastModified: new Date(chapterMeta.lastModified)
          }));
          
          if (loadedChapters.length === 0) {
            // No chapters exist, create first one
            const initialChapter: Chapter = {
              id: '1',
              number: 1,
              title: 'Chapter 1',
              content: '',
              wordCount: 0,
              isActive: true,
              lastModified: new Date()
            };
            setChapters([initialChapter]);
            setCurrentChapterId('1');
          } else {
            setChapters(loadedChapters);
            setCurrentChapterId(loadedChapters[0].id);
            // Load first chapter content
            const firstChapterContent = await loadChapterContent(loadedChapters[0].number);
            setChapters(prev => prev.map(ch => 
              ch.id === loadedChapters[0].id 
                ? { ...ch, content: firstChapterContent, wordCount: calculateWordCount(firstChapterContent) }
                : ch
            ));
          }
        }
      }
    } catch (error) {
      console.error('Error opening novel:', error);
    }
  };

  const totalWordCount = useMemo(() => 
    chapters.reduce((sum, ch) => sum + calculateWordCount(ch.content || ''), 0),
    [chapters]
  );

  // Show project selection screen if no project is loaded
  if (!currentProject) {
    return (
      <div className="app">
        <div className="project-selection">
          <div className="project-selection-content">
            <h1 className="app-title">GhostWriter 2 👻</h1>
            <p className="app-subtitle">AI-Assisted Novel Writing Platform</p>
            
            <div className="project-actions">
              <button 
                className="project-button primary"
                onClick={handleCreateNovelClick}
              >
                📝 Create New Novel
              </button>
              
              <button 
                className="project-button secondary"
                onClick={openExistingNovel}
              >
                📂 Open Existing Novel
              </button>
            </div>

            {recentNovels.length > 0 && (
              <div className="recent-novels">
                <h3 className="recent-novels-title">Recent Novels</h3>
                <div className="recent-novels-list">
                  {recentNovels.map((novel, index) => (
                    <button
                      key={`${novel.path}-${index}`}
                      className="recent-novel-item"
                      onClick={() => openRecentNovel(novel.path, novel.name)}
                      title={`Open ${novel.name}\nLast opened: ${new Date(novel.lastOpened).toLocaleDateString()}`}
                    >
                      <div className="recent-novel-info">
                        <span className="recent-novel-name">{novel.name}</span>
                        <span className="recent-novel-date">
                          {new Date(novel.lastOpened).toLocaleDateString()}
                        </span>
                      </div>
                      <span className="recent-novel-icon">📖</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            <div className="project-info">
              <p>Your novels will be saved to:</p>
              <code>Documents/GhostWriter Novels/</code>
            </div>
          </div>
        </div>
        
        <NovelNameModal
          isOpen={showNovelNameModal}
          onClose={() => setShowNovelNameModal(false)}
          onConfirm={createNewNovel}
        />
        
        <SettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
        />
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1 className="app-title">
            GhostWriter 2 👻
            <span className="project-name">— {currentProject.name}</span>
          </h1>
          <div className="header-stats">
            <span className="word-count">{totalWordCount.toLocaleString()} words</span>
            <span className="chapter-count">{chapters.length} chapters</span>
            <span className="save-status">
              {autoSaveEnabled ? '💾 Auto-save enabled' : '💾 Auto-save disabled'}
            </span>
            <button 
              className="header-button"
              onClick={() => setCurrentProject(null)}
              title="Switch Project"
            >
              📁
            </button>
            <button 
              className="header-button"
              onClick={() => setShowSettingsModal(true)}
              title="Settings"
            >
              ⚙️
            </button>
          </div>
        </div>
      </header>
      
      <main className="writing-workspace">
        {/* Chapter List Panel */}
        <aside className="chapter-panel">
          <ChapterList
            chapters={chapters}
            onChapterSelect={handleChapterSelect}
            onChapterCreate={handleChapterCreate}
            onChapterDelete={handleChapterDelete}
            onChapterRename={handleChapterRename}
          />
        </aside>

        {/* Main Editor */}
        <section className="editor-section">
          <div className="editor-container">
            <div className="chapter-header">
              <span className="chapter-word-count">
                {wordCount.toLocaleString()} words
              </span>
              <h2 className="current-chapter-title">
                <span className="chapter-number">{currentChapter?.number || 1}</span>
                {isEditingTitle ? (
                  <input
                    type="text"
                    value={editingTitleValue}
                    onChange={(e) => setEditingTitleValue(e.target.value)}
                    onBlur={handleTitleSave}
                    onKeyDown={handleTitleKeyDown}
                    className="chapter-title-input"
                    autoFocus
                  />
                ) : (
                  <span 
                    className="chapter-title-text"
                    onClick={handleTitleClick}
                    title="Click to edit chapter title"
                  >
                    {currentChapter?.title || 'Untitled Chapter'}
                  </span>
                )}
              </h2>
              <div className="chapter-spacer"></div>
            </div>
            
            <RichTextEditor
              content={content}
              onChange={handleContentChange}
              placeholder="Begin your story..."
            />
          </div>
        </section>

        {/* GhostWriter Panel */}
        <aside className="ghostwriter-panel">
          <GhostWriterAgent
            isActive={isGhostWriterActive}
            currentText={content}
            onTextInsert={handleGhostTextInsert}
            onTextReplace={handleGhostTextReplace}
            onActivate={() => setIsGhostWriterActive(true)}
            onDeactivate={() => setIsGhostWriterActive(false)}
          />
        </aside>
      </main>
      
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <NotificationProvider>
        <AppContent />
      </NotificationProvider>
    </ErrorBoundary>
  );
}

export default App;
