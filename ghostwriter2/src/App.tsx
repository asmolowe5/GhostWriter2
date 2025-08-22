import React, { useState, useEffect, useCallback } from 'react';
import RichTextEditor from './components/RichTextEditor';
import ChapterList from './components/ChapterList';
import GhostWriterAgent from './components/GhostWriterAgent';
import NovelNameModal from './components/NovelNameModal';
import './App.css';
import { NovelMetadata, ChapterMetadata } from './types/electron';

interface Chapter {
  id: string;
  number: number;
  title: string;
  content: string;
  wordCount: number;
  isActive: boolean;
  lastModified: Date;
}

interface NovelProject {
  name: string;
  path: string;
  metadata: NovelMetadata;
}

function App() {
  const [currentProject, setCurrentProject] = useState<NovelProject | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [currentChapterId, setCurrentChapterId] = useState('1');
  const [isGhostWriterActive, setIsGhostWriterActive] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [showNovelNameModal, setShowNovelNameModal] = useState(false);

  const currentChapter = chapters.find(ch => ch.id === currentChapterId);
  const content = currentChapter?.content || '';
  const wordCount = currentChapter?.wordCount || 0;

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

  // Auto-save when content changes
  useEffect(() => {
    if (autoSaveEnabled && currentChapter && currentProject) {
      const timer = setTimeout(() => {
        saveCurrentChapter();
      }, 2000); // Auto-save after 2 seconds of inactivity

      return () => clearTimeout(timer);
    }
  }, [content, autoSaveEnabled, saveCurrentChapter]);

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

  const handleContentChange = async (htmlContent: string, newWordCount: number) => {
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
  };

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

  const handleChapterRename = (chapterId: string, newTitle: string) => {
    setChapters(prev => prev.map(ch => 
      ch.id === chapterId ? { ...ch, title: newTitle } : ch
    ));
  };

  const handleGhostTextInsert = (text: string) => {
    const newContent = content + text;
    const newWordCount = newContent.replace(/<[^>]*>/g, '').split(/\s+/).filter(w => w.length > 0).length;
    handleContentChange(newContent, newWordCount);
  };

  const handleGhostTextReplace = (oldText: string, newText: string) => {
    const newContent = content.replace(oldText, newText);
    const newWordCount = newContent.replace(/<[^>]*>/g, '').split(/\s+/).filter(w => w.length > 0).length;
    handleContentChange(newContent, newWordCount);
  };

  // Project management functions
  const handleCreateNovelClick = () => {
    console.log('Create novel clicked, electronAPI available:', !!window.electronAPI);
    
    if (!window.electronAPI) {
      alert('Electron API not available. Please restart the app.');
      return;
    }

    setShowNovelNameModal(true);
  };

  const createNewNovel = async (novelName: string) => {
    if (!window.electronAPI) return;

    try {
      console.log('Creating novel with name:', novelName);
      const result = await window.electronAPI.createNovel(novelName);
      console.log('Create novel result:', result);
      
      if (result.success && result.path) {
        const metadata = await window.electronAPI.loadNovelMetadata(result.path);
        console.log('Load metadata result:', metadata);
        
        if (metadata.success && metadata.metadata) {
          const newProject: NovelProject = {
            name: novelName,
            path: result.path,
            metadata: metadata.metadata
          };
          
          setCurrentProject(newProject);
          
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
          
          console.log('Novel created successfully, project set');
        } else {
          alert('Failed to load novel metadata: ' + (metadata.error || 'Unknown error'));
        }
      } else if (result.canceled) {
        console.log('Novel creation canceled by user');
      } else {
        alert('Failed to create novel: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error creating novel:', error);
      alert('Error creating novel: ' + error);
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
                ? { ...ch, content: firstChapterContent, wordCount: firstChapterContent.replace(/<[^>]*>/g, '').split(/\s+/).filter(w => w.length > 0).length }
                : ch
            ));
          }
        }
      }
    } catch (error) {
      console.error('Error opening novel:', error);
    }
  };

  const totalWordCount = chapters.reduce((sum, ch) => sum + ch.wordCount, 0);

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
            <button 
              className="header-button"
              onClick={() => setCurrentProject(null)}
              title="Switch Project"
            >
              📁
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
              <h2 className="current-chapter-title">
                {currentChapter?.title || 'Untitled Chapter'}
              </h2>
              <div className="chapter-meta">
                <span className="chapter-word-count">
                  {wordCount.toLocaleString()} words
                </span>
                <span className="save-status">
                  {autoSaveEnabled ? '💾 Auto-save enabled' : '💾 Auto-save disabled'}
                </span>
              </div>
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
    </div>
  );
}

export default App;
